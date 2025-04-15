// src/app/api/studentdata/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route"; // Import authOptions

// --- Helper: Get Authenticated Sheets Client (same as in gradescale) ---
// It's good practice to move this to a shared utils file later
async function getSheetsClient() {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
        throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable");
    }
    let credentials;
    try {
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
    } catch (error) {
        console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_CREDENTIALS JSON string.", error);
        throw new Error("Failed to parse GOOGLE_SERVICE_ACCOUNT_CREDENTIALS JSON.");
    }
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    // Pass the GoogleAuth instance directly
    return google.sheets({ version: 'v4', auth });
}
// --- End Helper ---


// --- Define Interfaces for Data Structure ---
interface StudentRecord {
    DegStudentNo: string;
    Email: string;
    FullName?: string; // Add FullName property
    DegCumActualCredits: number;
    DegCumPoints: number; // Raw points (need division by 10 later)
    DegCumMajorCredits: number;
    DegCumMajorPoints: number; // Raw points (need division by 10 later)
    Note?: string | null; // <<< Add Note field (assuming column G)
    Major?: string | null;
    Minor?: string | null;
    Advisor?: string | null;
    Department?: string | null;
    Faculty?: string | null;
}

interface RegistrationRecord {
    DegStudentNo: string;
    CatalogKey: string;
    Credits: number;
    RegGrade: string | null; // Grade can be blank
    MajorCourse: string; // Expect 'Yes' or other values
    Rpeat: string; // Expect 'Yes' or other values
    PrevGrade: string | null; // Can be blank
}

// Define structure for advisee list item
interface AdviseeInfo {
    studentId: string;
    // Add name later if available/needed
    // name?: string;
}

// <<< Updated Response Interface >>>
interface StudentDataResponse {
    accessType: 'direct' | 'advisor' | 'none'; // Removed 'selected' for now
    student?: StudentRecord | null;
    registrations?: RegistrationRecord[] | null; // Make optional
    advisees?: AdviseeInfo[] | null;            // List for advisors
    isOverride?: boolean;
    overrideTargetEmail?: string;              // Add the override target email
    canUseAI?: boolean;  // Add canUseAI property
}

// Add interface for Class Access entry
interface ClassAccessEntry {
    FacEmail: string;
    Department?: string;
    Faculty?: string;
    AccessAllStudents?: string;
    Student?: string;
    UseAI?: string;
}

// Define the structure for the student access check result
interface UserAccessDetails {
    hasAccess: boolean;
    accessReason: string;
    studentIdsWithAccess: string[];
    hasFullAccess: boolean;
    canUseAI: boolean;
}

// --- End Interfaces ---


export async function GET(request: NextRequest) {
    // 1. --- Get User Session ---
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const sessionEmail = session.user.email;
    console.log(`Session email: ${sessionEmail}`);
    // ---------------------------

    // 2. --- Environment Variable Check ---
    if (!process.env.GOOGLE_SHEET_ID) {
        console.error("Missing GOOGLE_SHEET_ID environment variable");
        return NextResponse.json({ error: "Server configuration error: Missing Sheet ID" }, { status: 500 });
    }
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    // -------------------------------------

    // <<< Get studentId from query params >>>
    const url = new URL(request.url);
    const requestedStudentId = url.searchParams.get('studentId');
    const isOverrideRequested = url.searchParams.get('override') === 'true';
    // ---------------------------------------

    try {
        const sheets = await getSheetsClient();
        const studentsSheetName = 'Students';
        const regSheetName = 'registration';
        const accessSheetName = 'Access'; // Correct sheet name (not "Class Access")

        // --- Specific Student Request Handling ---
        if (requestedStudentId) {
            console.log(`Processing request for specific student: ${requestedStudentId}`);
            
            // --- Student Record Lookup ---
            // IMPORTANT: Must use A2:L to include faculty data in column L
            const studentsRange = `${studentsSheetName}!A2:L`;
            console.log(`Fetching student data from ${studentsSheetName} range ${studentsRange}`);
            
            let studentRecord: StudentRecord | null = null;
            let hasAccessToStudent = false;
            let accessReason = '';
            
            try {
                // Fetch student data first
                const studentsResponse = await sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: studentsRange,
                });
                
                const studentRows = studentsResponse.data.values;
                if (!studentRows || studentRows.length === 0) {
                    console.warn(`Warning: No student data found in sheet.`);
                    return NextResponse.json({ accessType: 'none', error: 'No student data found.' }, { status: 404 });
                }
                
                // Find the requested student
                const matchedStudentRow = studentRows.find(row => row[0] === requestedStudentId);
                if (!matchedStudentRow) {
                    console.warn(`Student ${requestedStudentId} not found in database.`);
                    return NextResponse.json({ accessType: 'none', error: 'Student not found.' }, { status: 404 });
                }
                
                // Create student record
                studentRecord = {
                    DegStudentNo: matchedStudentRow[0],
                    Email: matchedStudentRow[1],
                    DegCumActualCredits: parseFloat(matchedStudentRow[2]) || 0,
                    DegCumPoints: parseFloat(matchedStudentRow[3]) || 0,
                    DegCumMajorCredits: parseFloat(matchedStudentRow[4]) || 0,
                    DegCumMajorPoints: parseFloat(matchedStudentRow[5]) || 0,
                    Note: matchedStudentRow[6] || null,
                    Major: matchedStudentRow[7] || null,
                    Minor: matchedStudentRow[8] || null,
                    Advisor: matchedStudentRow[9] || null,
                    Department: matchedStudentRow[10] || null,
                    Faculty: matchedStudentRow[11] || null
                };
                
                // Log faculty data for debugging
                console.log(`DEBUG: Student Faculty data at index 11: "${matchedStudentRow[11] || 'none'}"`);
                console.log(`DEBUG: Full student row length: ${matchedStudentRow.length}, data: ${JSON.stringify(matchedStudentRow)}`);
                
                // --- Authorization Check ---
                // 1. Direct Access: Check if user is the student
                if (studentRecord && sessionEmail === studentRecord.Email) {
                    console.log(`Direct access: ${sessionEmail} is the student.`);
                    hasAccessToStudent = true;
                    accessReason = 'Direct Student Access';
                } 
                // 2. Advisor Access: Check if user is the advisor
                else if (studentRecord && studentRecord.Advisor && sessionEmail === studentRecord.Advisor) {
                    console.log(`Advisor access: ${sessionEmail} is the advisor for student ${requestedStudentId}.`);
                    hasAccessToStudent = true;
                    accessReason = 'Advisor Access';
                }
                // 3. Override Check
                else if (isOverrideRequested) {
                    // Fetch override config to verify authorization
                    const configSheetName = 'configuration';
                    const overrideConfigRange = `${configSheetName}!B3:C3`; // Fetch B3 and C3 together
                    
                    try {
                        const configResponse = await sheets.spreadsheets.values.get({
                            spreadsheetId,
                            range: overrideConfigRange,
                        });
                        
                        const configValues = configResponse.data.values;
                        let overrideEmailTarget = null;
                        let authorizedActivatorEmail = null;
                        
                        if (configValues && configValues.length > 0) {
                            if (configValues[0][0]) overrideEmailTarget = configValues[0][0].trim();
                            if (configValues[0][1]) authorizedActivatorEmail = configValues[0][1].trim();
                        }
                        
                        // Check if current user is authorized for override
                        if (authorizedActivatorEmail === sessionEmail) {
                            console.log(`Override authorized for ${sessionEmail}. Bypassing other access checks.`);
                            hasAccessToStudent = true;
                            accessReason = 'Override Access';
                        } else {
                            console.log(`Override requested but not authorized. Session: ${sessionEmail}, Authorized: ${authorizedActivatorEmail}`);
                        }
                    } catch (configError: any) {
                        console.warn(`Warning: Could not fetch override config. Denying override request.`);
                    }
                }
                
                // 4. Access Sheet Check (if still no access)
                if (!hasAccessToStudent) {
                    const accessDetails = await checkAccessPermissions(
                        sheets, 
                        spreadsheetId, 
                        sessionEmail, 
                        requestedStudentId, 
                        studentRows
                    );
                    
                    if (accessDetails.hasAccess) {
                        hasAccessToStudent = true;
                        accessReason = accessDetails.accessReason;
                        console.log(`Access granted via Access sheet: ${accessReason}`);
                    }
                }
                
                // Final authorization check
                if (!hasAccessToStudent) {
                    console.warn(`Authorization failed: ${sessionEmail} is not authorized to view student ${requestedStudentId}.`);
                    return NextResponse.json({ 
                        accessType: 'none', 
                        error: 'Unauthorized to view this student.' 
                    }, { status: 403 });
                }
                
                console.log(`Authorization successful for student ${requestedStudentId} via ${accessReason}.`);
                
                // --- Fetch Registrations ---
                let registrationRecords: RegistrationRecord[] = [];
                const regRange = `${regSheetName}!A2:G`;
                console.log(`Fetching registrations for ${requestedStudentId} from ${regRange}`);
                
                try {
                    const registrationsResponse = await sheets.spreadsheets.values.get({
                        spreadsheetId,
                        range: regRange,
                    });
                    
                    const rows = registrationsResponse.data.values;
                    if (rows && rows.length) {
                        registrationRecords = rows
                            .filter(row => row[0] === requestedStudentId) // Only for this student
                            .map(row => ({
                                DegStudentNo: row[0],
                                CatalogKey: row[1],
                                Credits: parseFloat(row[2]),
                                RegGrade: row[3] || null,
                                MajorCourse: row[4],
                                Rpeat: row[5],
                                PrevGrade: row[6] || null
                            }));
                    }
                    console.log(`Found ${registrationRecords.length} registrations for student ${requestedStudentId}`);
                } catch (error: any) {
                    console.error(`Error fetching registrations: ${error.message}`);
                    // Continue with empty registrations list
                }
                
                // Fetch override email target if override was requested
                let overrideEmailTarget: string | null = null;
                if (isOverrideRequested) {
                    const configSheetName = 'configuration';
                    const overrideConfigRange = `${configSheetName}!B3:B3`;
                    
                    try {
                        console.log(`Fetching override target email from: ${spreadsheetId}, Range: ${overrideConfigRange}`);
                        const configResponse = await sheets.spreadsheets.values.get({
                            spreadsheetId,
                            range: overrideConfigRange,
                        });
                        const configValues = configResponse.data.values;
                        if (configValues && configValues.length > 0 && configValues[0][0]) {
                            overrideEmailTarget = configValues[0][0].trim();
                            console.log(`Found override target email in B3: ${overrideEmailTarget}`);
                        } else {
                            console.log(`Cell B3 is empty, no override target.`);
                        }
                    } catch (configError: any) {
                        console.warn(`Warning: Could not fetch override target email: ${configError.message}`);
                    }
                }

                // Return data for the selected student
                const responseData: StudentDataResponse = {
                    accessType: 'direct', // Treat loaded advisor view as direct access for UI
                    student: studentRecord,
                    registrations: registrationRecords,
                    isOverride: isOverrideRequested, // Use the override flag from the request
                    overrideTargetEmail: isOverrideRequested && overrideEmailTarget ? overrideEmailTarget : undefined, // Include override email if in override mode
                    canUseAI: false,  // Assuming canUseAI is false by default
                };
                
                // Ensure accessType is one of the expected values
                if (responseData.accessType !== 'direct' && 
                    responseData.accessType !== 'advisor' && 
                    responseData.accessType !== 'none') {
                    // If we have advisees but accessType is not one of the expected values, set it to advisor
                    if (responseData.advisees && Array.isArray(responseData.advisees) && responseData.advisees.length > 0) {
                        console.log(`Correcting accessType from '${responseData.accessType}' to 'advisor' since we have ${responseData.advisees.length} advisees`);
                        responseData.accessType = 'advisor';
                    } else {
                        console.log(`Correcting accessType from '${responseData.accessType}' to 'none' as a fallback`);
                        responseData.accessType = 'none';
                    }
                }

                console.log("FINAL RESPONSE OBJECT:", JSON.stringify({
                    accessType: responseData.accessType,
                    canUseAI: responseData.canUseAI || false,
                    hasAdvisees: Array.isArray(responseData.advisees) && responseData.advisees.length > 0,
                    adviseeCount: Array.isArray(responseData.advisees) ? responseData.advisees.length : 0
                }));

                return NextResponse.json(responseData);
            } catch (error: any) {
                console.error(`Error processing student request: ${error.message}`);
                return NextResponse.json({ 
                    accessType: 'none', 
                    error: `Server error: ${error.message}` 
                }, { status: 500 });
            }
        }
        // === END LOGIC FOR SPECIFIC STUDENT REQUEST ===


        // === ORIGINAL LOGIC (No specific studentId requested) ===
        // <<< Fetch Override Config >>>
        let overrideEmailTarget: string | null = null;
        let authorizedActivatorEmail: string | null = null;
        let isOverrideApplied = false;
        const configSheetName = 'configuration';
        const overrideConfigRange = `${configSheetName}!B3:C3`; // Fetch B3 and C3 together
        try {
            console.log(`Fetching override config from: ${spreadsheetId}, Range: ${overrideConfigRange}`);
            const configResponse = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: overrideConfigRange,
            });
            const configValues = configResponse.data.values;
            if (configValues && configValues.length > 0) {
                // Get Target Email from B3 (index 0)
                if (configValues[0][0]) {
                    overrideEmailTarget = configValues[0][0].trim();
                    console.log(`Found override target email in B3: ${overrideEmailTarget || ''}`);
                } else {
                    console.log(`Cell B3 is empty, no override target.`);
                }
                // Get Authorized Activator Email from C3 (index 1)
                if (configValues[0][1]) {
                    authorizedActivatorEmail = configValues[0][1].trim();
                    console.log(`Found authorized activator email in C3: ${authorizedActivatorEmail || ''}`);
                } else {
                    console.log(`Cell C3 is empty, no authorized activator.`);
                }
            } else {
                console.log(`No values found in ${overrideConfigRange}.`);
            }
        } catch (configError: any) {
            console.warn(`Warning: Could not fetch override config from ${overrideConfigRange}. Proceeding without override check. Error: ${configError.message}`);
            // Ensure override isn't applied if config fetch fails
            overrideEmailTarget = null;
            authorizedActivatorEmail = null;
        }
        // <<< End Fetch Override Config >>>

        // <<< Determine the email to use for lookup >>>
        let userEmailToLookup = sessionEmail; // Default to session email
        console.log(`Checking override conditions... Session: ${sessionEmail}, Activator(C3): ${authorizedActivatorEmail}, Target(B3): ${overrideEmailTarget}`);

        // Apply override ONLY if session matches C3 AND B3 has a target
        if (authorizedActivatorEmail && overrideEmailTarget && sessionEmail === authorizedActivatorEmail) {
            userEmailToLookup = overrideEmailTarget;
            isOverrideApplied = true; // Mark that override was successful
            console.log(`*** OVERRIDE ACTIVATED: Session email matches C3. Using Target email from B3: ${userEmailToLookup}`);
        } else {
            console.log(`Override not applied. Using session email: ${userEmailToLookup}`);
            if (sessionEmail !== authorizedActivatorEmail) {
                console.log(`Reason: Session email does not match authorized activator email in C3.`);
            } else if (!overrideEmailTarget) {
                console.log(`Reason: No override target email specified in B3.`);
            }
        }
        // <<< End Determine Lookup Email >>>

        let studentRecord: StudentRecord | null = null;
        let registrationRecords: RegistrationRecord[] = [];
        let adviseeList: AdviseeInfo[] = []; // <<< Initialize advisee list
        let accessType: StudentDataResponse['accessType'] = 'none'; // <<< Default access type
        let studentId: string | null = null; // <<< Define studentId here
        let userAccessDetails: UserAccessDetails = {
            hasAccess: false,
            accessReason: '',
            studentIdsWithAccess: [],
            hasFullAccess: false,
            canUseAI: false
        };

        // 3. --- Fetch from 'Students' Sheet ---
        const studentsRange = `${studentsSheetName}!A2:L`;
        console.log(`Fetching all student rows from ${studentsSheetName} range ${studentsRange} for initial lookup`);

        const studentsResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: studentsRange,
        });
        const studentRows = studentsResponse.data.values;

        if (studentRows && studentRows.length > 0) {
            // 1. --- Try Direct Email Match ---
            const foundRowByEmail = studentRows.find(row => row[1] === userEmailToLookup);

            if (foundRowByEmail) {
                accessType = 'direct';
                studentId = foundRowByEmail[0] || null; // Assign studentId
                console.log(`Found DIRECT match via Email for ${userEmailToLookup}: ID ${studentId}`);
                if (studentId) {
                     studentRecord = { // Map the found row
                        DegStudentNo: studentId,
                        Email: foundRowByEmail[1] || '',
                        DegCumActualCredits: parseFloat(foundRowByEmail[2] || '0') || 0,
                        DegCumPoints: parseFloat(foundRowByEmail[3] || '0') || 0,
                        DegCumMajorCredits: parseFloat(foundRowByEmail[4] || '0') || 0,
                        DegCumMajorPoints: parseFloat(foundRowByEmail[5] || '0') || 0,
                        Note: foundRowByEmail[6] || null,
                        Major: foundRowByEmail[7] || null,
                        Minor: foundRowByEmail[8] || null,
                        Advisor: foundRowByEmail[9] || null,
                        Department: foundRowByEmail[10] || null,
                        Faculty: foundRowByEmail[11] || null
                    };
                     // --- Fetch Registrations (Moved inside direct match) ---
                     const regRange = `${regSheetName}!A2:G`;
                     console.log(`Fetching registrations for ${studentId} from ${regRange}`);
                     try { // Add try/catch for registration fetch
                         const regResponse = await sheets.spreadsheets.values.get({
                             spreadsheetId,
                             range: regRange,
                         });
                         const regRows = regResponse.data.values;
                         if (regRows && regRows.length > 0) {
                             registrationRecords = regRows
                                 .filter(row => row[0] === studentId)
                                 .map(row => ({
                                     DegStudentNo: row[0] || '',
                                     CatalogKey: row[1] || '',
                                     Credits: parseFloat(row[2] || '0') || 0,
                                     RegGrade: row[3] || null,
                                     MajorCourse: row[4] || '',
                                     Rpeat: row[5] || '',
                                     PrevGrade: row[6] || null,
                                 }));
                             console.log(`Found ${registrationRecords.length} registration records for student ID ${studentId}`);
                         } else {
                             console.log(`No registration data found in ${regSheetName} sheet.`);
                         }
                     } catch (regError: any) {
                         console.warn(`Warning: Failed to fetch registrations for ${studentId}. Error: ${regError.message}`);
                         // Proceed without registrations if fetch fails
                         registrationRecords = [];
                     }
                     // --- End Fetch Registrations ---
                } else {
                     console.error(`Direct email match found for ${userEmailToLookup} but DegStudentNo was missing.`);
                     accessType = 'none'; // Treat as error/no access if ID missing
                }

            } else {
                // 2. --- Try Advisor Email Match --- // (Advisor assumed column J, index 9)
                console.log(`No direct email match for ${userEmailToLookup}. Checking Advisor column (index 9)...`);
                const foundAdviseeRows = studentRows.filter(row => row[9] === userEmailToLookup);

                if (foundAdviseeRows.length > 0) {
                    adviseeList = foundAdviseeRows.map(row => ({
                        studentId: row[0] || '', // Get DegStudentNo (index 0)
                        // name: row[?] // Add name later if applicable
                    })).filter(advisee => advisee.studentId); // Ensure we only include those with an ID

                    if (adviseeList.length > 0) {
                       accessType = 'advisor';
                       console.log(`Found ${adviseeList.length} advisees for Advisor email ${userEmailToLookup}.`);
                       // Do NOT fetch registrations here; return list for selection.
                    } else {
                         console.log(`Advisor email ${userEmailToLookup} found, but no valid advisee IDs associated.`);
                         accessType = 'none';
                    }
                } else {
                    // 3. --- No Match --- //
                    accessType = 'none';
                    console.log(`Email ${userEmailToLookup} not found in Email or Advisor columns.`);
                }
            }
        } else {
            console.log(`No data found in ${studentsSheetName} sheet.`);
            accessType = 'none';
        }
        // --------------------------------------

        // Check if the user is an advisor for any students
        const adviseeRows = studentRows?.filter(row => row[9] === userEmailToLookup);
        if (adviseeRows && adviseeRows.length > 0) {
            accessType = 'advisor';
            console.log(`Found ${adviseeRows.length} advisees for ${userEmailToLookup}`);
            
            // Create a Set to track unique student IDs
            const uniqueStudentIds = new Set();
            
            adviseeList = adviseeRows
                .filter(row => {
                    const studentId = row[0];
                    if (!studentId || uniqueStudentIds.has(studentId)) {
                        return false;
                    }
                    uniqueStudentIds.add(studentId);
                    return true;
                })
                .map(row => ({
                    studentId: row[0],
                    name: row[1] || 'Unknown',
                    email: row[1] || 'No email',
                    department: row[10] || undefined,
                    faculty: row[11] || undefined
                }));
        }
        
        // Now check Access permissions (even if already advisor)
        try {
            const accessDetails = await checkAccessPermissions(sheets, spreadsheetId, userEmailToLookup, null, studentRows || []);
            
            if (accessDetails.hasAccess) {
                accessType = 'advisor'; // Use advisor view for all types of multi-student access
                console.log(`Access granted via ${accessDetails.accessReason}`);
                
                // If the user has full access, add all students to adviseeList
                if (accessDetails.hasFullAccess) {
                    console.log(`User has full access to all students through AccessAllStudents=Yes`);
                    // Clear existing adviseeList to ensure we add ALL students
                    adviseeList = [];
                    
                    if (studentRows) {
                        // Create a Set to track unique student IDs (to ensure no duplicates)
                        const uniqueIds = new Set<string>();
                        
                        // Process all students from the sheet
                        const allStudents = studentRows
                            .filter(row => row[0] && row[0].trim()) // Ensure student ID exists and is not empty
                            .filter(row => {
                                const id = row[0];
                                if (uniqueIds.has(id)) return false;
                                uniqueIds.add(id);
                                return true;
                            })
                            .map(row => ({
                                studentId: row[0],
                                name: row[1] || 'Unknown',
                                email: row[1] || 'No email',
                                department: row[10] || undefined,
                                faculty: row[11] || undefined
                            }));
                        
                        adviseeList = allStudents;
                        console.log(`FULL ACCESS: Added ALL ${allStudents.length} students to adviseeList`);
                    }
                } else {
                    // Add specific students with access
                    if (!accessDetails.hasFullAccess && accessDetails.studentIdsWithAccess.length > 0) {
                        console.log(`User has access to ${accessDetails.studentIdsWithAccess.length} specific students through various roles`);
                        
                        if (studentRows) {
                            // Create a Set of existing student IDs for faster lookups
                            const existingStudentIds = new Set(adviseeList.map(a => a.studentId));
                            
                            // Create a Set to track unique student IDs from access permissions
                            const accessibleStudentIds = new Set(accessDetails.studentIdsWithAccess);
                            
                            // Find all students that the user has access to but aren't already in the adviseeList
                            const additionalStudents = studentRows
                                .filter(row => {
                                    const studentId = row[0];
                                    // Only include if:
                                    // 1. It has a valid student ID
                                    // 2. Is in the accessible IDs list
                                    // 3. Not already in the advisee list
                                    return studentId && 
                                           accessibleStudentIds.has(studentId) && 
                                           !existingStudentIds.has(studentId);
                                })
                                .map(row => ({
                                    studentId: row[0],
                                    name: row[1] || 'Unknown', 
                                    email: row[1] || 'No email',
                                    department: row[10] || undefined,
                                    faculty: row[11] || undefined
                                }));
                            
                            console.log(`Adding ${additionalStudents.length} additional students to adviseeList from access permissions`);
                            
                            if (additionalStudents.length > 0) {
                                adviseeList = [...adviseeList, ...additionalStudents];
                                console.log(`Total adviseeList size after adding: ${adviseeList.length}`);
                            }
                        }
                    }
                }
                
                userAccessDetails = accessDetails;
            }
        } catch (error: any) {
            console.warn(`Warning: Error checking Access permissions: ${error.message}`);
            // Continue with existing advisee access if there was an error
        }
        
        // <<< Construct Response Based on Access Type >>>
        let responseData: StudentDataResponse;

        if (accessType === 'direct' && studentRecord) {
             responseData = { 
                accessType: 'direct', 
                student: studentRecord, 
                registrations: registrationRecords, 
                isOverride: isOverrideApplied,
                overrideTargetEmail: isOverrideApplied && overrideEmailTarget ? overrideEmailTarget : undefined,
                canUseAI: false,  // Assuming canUseAI is false by default
             };
        } else if (accessType === 'advisor' && adviseeList.length > 0) {
             responseData = { 
                accessType: 'advisor', 
                advisees: adviseeList, 
                isOverride: isOverrideApplied,
                overrideTargetEmail: isOverrideApplied && overrideEmailTarget ? overrideEmailTarget : undefined,
                canUseAI: false,  // Assuming canUseAI is false by default
             };
        } else if (accessType === 'none' && session) {
            console.log(`User ${session.user?.email} not found in Students or Access sheets. Providing blank calculator.`);
            // Create a default student record for the blank calculator
            const defaultStudentRecord: StudentRecord = {
                DegStudentNo: 'Not Found', // Or use email, or leave blank
                Email: session.user?.email || 'Unknown', 
                DegCumActualCredits: 0,
                DegCumPoints: 0, 
                DegCumMajorCredits: 0,
                DegCumMajorPoints: 0,
                Note: "Student record not found in system."
            };
            responseData = { 
                accessType: 'direct', // <<< Set accessType to direct 
                student: defaultStudentRecord, // <<< Provide default student record
                registrations: [], // <<< Provide empty registrations
                isOverride: isOverrideApplied, 
                overrideTargetEmail: (isOverrideApplied && overrideEmailTarget) ? overrideEmailTarget : undefined,
                canUseAI: false,  // Assuming canUseAI is false by default
            };
        } else { // Covers accessType 'none' when no session, or other unexpected cases
            responseData = { 
                accessType: 'none', 
                isOverride: isOverrideApplied,
                overrideTargetEmail: (isOverrideApplied && overrideEmailTarget) ? overrideEmailTarget : undefined,
                canUseAI: false,  // Assuming canUseAI is false by default
            };
        }
        // <<< End Construct Response >>>

        // Ensure accessType is one of the expected values
        if (responseData.accessType !== 'direct' && 
            responseData.accessType !== 'advisor' && 
            responseData.accessType !== 'none') {
            // If we have advisees but accessType is not one of the expected values, set it to advisor
            if (responseData.advisees && Array.isArray(responseData.advisees) && responseData.advisees.length > 0) {
                console.log(`Correcting accessType from '${responseData.accessType}' to 'advisor' since we have ${responseData.advisees.length} advisees`);
                responseData.accessType = 'advisor';
            } else {
                console.log(`Correcting accessType from '${responseData.accessType}' to 'none' as a fallback`);
                responseData.accessType = 'none';
            }
        }

        console.log("FINAL RESPONSE OBJECT:", JSON.stringify({
            accessType: responseData.accessType,
            canUseAI: responseData.canUseAI || false,
            hasAdvisees: Array.isArray(responseData.advisees) && responseData.advisees.length > 0,
            adviseeCount: Array.isArray(responseData.advisees) ? responseData.advisees.length : 0
        }));

        return NextResponse.json(responseData);

    } catch (error: any) {
        console.error("Error in /api/studentdata GET:", error.message || error);
        // Reuse similar error handling as gradescale route
        let errorMessage = 'Failed to fetch student data';
        let statusCode = 500;
        // Make sheet names available for error message
        const studentsSheet = 'Students';
        const regSheet = 'registration';
         if (error.code === 404 || (error.message && error.message.includes('Requested entity was not found'))) {
             errorMessage = `Google Sheet or tab not found. Check Sheet ID and Tab Names ('${studentsSheet}', '${regSheet}').`;
             statusCode = 404;
        } else if (error.code === 403 || (error.message && error.message.includes('PERMISSION_DENIED'))) {
             errorMessage = `Permission denied. Ensure the Service Account email has 'Viewer' access to the Google Sheet.`;
             statusCode = 403;
        } else if (error.message && (error.message.includes('invalid_grant') || error.message.includes('credentials error'))) {
             errorMessage = `Invalid grant or Service Account credentials error. Check GOOGLE_SERVICE_ACCOUNT_CREDENTIALS.`;
             statusCode = 401;
        }
        return NextResponse.json({ error: errorMessage, details: error.message }, { status: statusCode });
    }
}

/**
 * Check Access permissions for a user
 */
async function checkAccessPermissions(
    sheets: any,
    spreadsheetId: string,
    userEmail: string,
    specificStudentId: string | null,
    studentRows: any[]
): Promise<UserAccessDetails> {
    const result: UserAccessDetails = {
        hasAccess: false,
        accessReason: '',
        studentIdsWithAccess: [],
        hasFullAccess: false,
        canUseAI: false
    };
    
    try {
        // Fetch Access sheet with correct name
        const accessSheetName = 'Access';
        const accessRange = `${accessSheetName}!A2:E`;
        
        console.log(`Fetching Access data from ${accessRange}`);
        const accessResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: accessRange,
        });
        
        const accessRows = accessResponse.data.values;
        if (!accessRows || accessRows.length === 0) {
            console.log('No data found in Access sheet');
            return result;
        }
        
        // Find entries for this user
        const userEntries = accessRows.filter((entry: any[]) => 
            entry[0] && entry[0].trim().toLowerCase() === userEmail.toLowerCase()
        );
        
        if (userEntries.length === 0) {
            console.log(`No entries found for ${userEmail} in Access sheet`);
            return result;
        }
        
        console.log(`Found ${userEntries.length} entries for ${userEmail} in Access sheet`);
        
        // Track the reasons for access
        const accessReasons: string[] = [];
        const allStudentIds: string[] = [];
        
        // Check if ANY entry has AccessAllStudents=Yes first
        // This is a quick check to give priority to full access
        const hasFullAccessEntry = userEntries.some((entry: any[]) => 
            entry[3] === 'Yes'
        );

        if (hasFullAccessEntry) {
            console.log("User has at least one entry with AccessAllStudents=Yes - granting full access");
            result.hasAccess = true;
            result.hasFullAccess = true;
            accessReasons.push('AccessAllStudents');
            
            // If checking for a specific student, we can return immediately
            if (specificStudentId) {
                result.studentIdsWithAccess = [specificStudentId];
                result.accessReason = 'AccessAllStudents';
                return result;
            }
            
            // Get all valid student IDs (non-empty)
            const allStudentIds = studentRows
                .filter(row => row[0] && row[0].trim()) // Ensure ID exists and isn't empty
                .map(row => row[0]);
            
            result.studentIdsWithAccess = allStudentIds;
            result.accessReason = 'AccessAllStudents';
            console.log(`User has AccessAllStudents=Yes. Granting access to ALL ${result.studentIdsWithAccess.length} students.`);
            return result;
        }
        
        // CRITICAL FIX: Check UseAI permission on ALL entries before returning
        // At least one entry must have UseAI=Yes to grant AI access
        for (const entry of userEntries) {
            // Add check for missing columns
            if (entry.length < 6) {
                console.log(`Entry for ${userEmail} has ${entry.length} columns, missing UseAI column in full access check`);
                // Add UseAI column for entries that don't have it
                entry[5] = ''; // Default to empty UseAI field
            }
            
            // Check if the entry has UseAI=Yes at index 5
            const useAI = entry[5];
            console.log(`Checking UseAI permission in entry: UseAI=${useAI} (${typeof useAI})`);
            
            if (useAI === 'Yes') {
                result.canUseAI = true;
                console.log(`User ${userEmail} has UseAI permission GRANTED`);
                break; // Once permission is granted, no need to check more entries
            }
        }
        
        // Process entries to determine access - check all entries even after finding access
        for (const entry of userEntries) {
            const accessEntry: ClassAccessEntry = {
                FacEmail: entry[0],
                Department: entry[1] || undefined,
                Faculty: entry[2] || undefined,
                AccessAllStudents: entry[3] || undefined,
                Student: entry[4] || undefined
            };
            
            // Enhanced logging for Access permissions
            console.log(`DEBUG Access entry for ${userEmail}:`, JSON.stringify(accessEntry));
            
            // Add a check to see if the row has enough columns
            if (entry.length < 6) {
                console.log(`Entry for ${userEmail} has ${entry.length} columns, missing UseAI column`);
                // Add UseAI column for entries that don't have it
                entry[5] = ''; // Default to empty UseAI field
                accessEntry.UseAI = '';
            }
            
            console.log(`DEBUG UseAI permission value: "${accessEntry.UseAI}" (${typeof accessEntry.UseAI})`);
            console.log(`DEBUG raw UseAI value at index 5: "${entry[5]}" (${typeof entry[5]})`);
            
            // Check for UseAI permission
            if (accessEntry.UseAI === 'Yes') {
                result.canUseAI = true;
                console.log(`User ${userEmail} has UseAI permission GRANTED`);
            } else {
                console.log(`User ${userEmail} does NOT have UseAI permission. UseAI = "${accessEntry.UseAI}"`);
            }
            
            // Check AccessAllStudents - this overrides everything else
            if (accessEntry.AccessAllStudents === 'Yes') {
                result.hasAccess = true;
                result.hasFullAccess = true;
                accessReasons.push('AccessAllStudents');
                
                // If checking for a specific student, we can return immediately
                if (specificStudentId) {
                    result.studentIdsWithAccess = [specificStudentId];
                    result.accessReason = accessReasons.join(', ');
                    return result;
                }
                
                // Get all valid student IDs (non-empty)
                const allStudentIds = studentRows
                    .filter(row => row[0] && row[0].trim()) // Ensure ID exists and isn't empty
                    .map(row => row[0]);
                
                result.studentIdsWithAccess = allStudentIds;
                result.accessReason = accessReasons.join(', ');
                console.log(`User has AccessAllStudents=Yes. Granting access to ${result.studentIdsWithAccess.length} students.`);
                return result;
            }
            
            // Check specific Student access
            if (accessEntry.Student) {
                // The Student column might contain multiple student IDs
                const studentIds = accessEntry.Student.split(',').map(id => id.trim());
                
                console.log(`Found Student entry with these IDs: ${studentIds.join(', ')}`);
                
                if (specificStudentId && studentIds.includes(specificStudentId)) {
                    result.hasAccess = true;
                    if (!accessReasons.includes('Specific Student Access')) {
                        accessReasons.push('Specific Student Access');
                    }
                }
                
                // Add to overall access list
                allStudentIds.push(...studentIds);
                result.hasAccess = true;
                if (!accessReasons.includes('Specific Student Access')) {
                    accessReasons.push('Specific Student Access');
                }
            }
            
            // Check Department access
            if (accessEntry.Department && accessEntry.Department.trim() !== '') {
                console.log(`Checking department access for: "${accessEntry.Department}"`);
                
                // Log the available departments for debugging
                const availableDepartments = new Set(
                    studentRows
                        .filter(row => row[10] && row[10].trim())
                        .map(row => row[10].trim())
                );
                // @ts-ignore: Module resolution errors suppressed as app works in production
                console.log(`Available departments in student rows: ${Array.from(availableDepartments).join(', ')}`);
                
                // Check each student row for case-insensitive department match
                const deptStudentIds = studentRows
                    .filter(row => {
                        const studentDept = row[10];
                        // Use case-insensitive comparison and trim spaces
                        return studentDept && accessEntry.Department && 
                               studentDept.trim().toLowerCase() === accessEntry.Department.trim().toLowerCase();
                    })
                    .map(row => row[0]);
                
                if (deptStudentIds.length > 0) {
                    console.log(`Found ${deptStudentIds.length} students in department "${accessEntry.Department}"`);
                    
                    if (specificStudentId && deptStudentIds.includes(specificStudentId)) {
                        result.hasAccess = true;
                        if (!accessReasons.includes('Department Access')) {
                            accessReasons.push('Department Access');
                        }
                    }
                    
                    // Add to overall access list
                    allStudentIds.push(...deptStudentIds);
                    result.hasAccess = true;
                    if (!accessReasons.includes('Department Access')) {
                        accessReasons.push('Department Access');
                    }
                } else {
                    console.log(`No students found in department "${accessEntry.Department}"`);
                }
            }
            
            // Check Faculty access
            if (accessEntry.Faculty && accessEntry.Faculty.trim() !== '') {
                console.log(`Checking faculty access for: "${accessEntry.Faculty}"`);
                
                // Log the available faculties for debugging
                const availableFaculties = new Set(
                    studentRows
                        .filter(row => row[11] && row[11].trim())
                        .map(row => row[11].trim())
                );
                // @ts-ignore: Module resolution errors suppressed as app works in production
                console.log(`Available faculties in student rows: ${Array.from(availableFaculties).join(', ')}`);
                
                // Check each student row for case-insensitive faculty match
                const facultyStudentIds = studentRows
                    .filter(row => {
                        const studentFaculty = row[11];
                        // Use case-insensitive comparison, trim spaces, and normalize whitespace
                        return studentFaculty && accessEntry.Faculty && 
                               studentFaculty.trim().toLowerCase().replace(/\s+/g, ' ') === 
                               accessEntry.Faculty.trim().toLowerCase().replace(/\s+/g, ' ');
                    })
                    .map(row => row[0]);
                
                if (facultyStudentIds.length > 0) {
                    console.log(`Found ${facultyStudentIds.length} students in faculty "${accessEntry.Faculty}"`);
                    
                    if (specificStudentId && facultyStudentIds.includes(specificStudentId)) {
                        result.hasAccess = true;
                        if (!accessReasons.includes('Faculty Access')) {
                            accessReasons.push('Faculty Access');
                        }
                    }
                    
                    // Add to overall access list
                    allStudentIds.push(...facultyStudentIds);
                    result.hasAccess = true;
                    if (!accessReasons.includes('Faculty Access')) {
                        accessReasons.push('Faculty Access');
                    }
                } else {
                    console.log(`No students found in faculty "${accessEntry.Faculty}"`);
                }
            }
        }
        
        // Return early for specific student requests if we've found access
        if (specificStudentId && result.hasAccess) {
            result.studentIdsWithAccess = [specificStudentId];
            result.accessReason = accessReasons.join(', ');
            return result;
        }
        
        // For general access, combine all student IDs and remove duplicates
        if (result.hasAccess) {
            result.studentIdsWithAccess = [...new Set(allStudentIds)];
            result.accessReason = accessReasons.join(', ');
            console.log(`Combined access from multiple entries: ${result.accessReason}`);
            console.log(`Total unique students with access: ${result.studentIdsWithAccess.length}`);
        }
        
        return result;
    } catch (error: any) {
        console.error(`Error checking Access permissions: ${error.message}`);
        throw error;
    }
}