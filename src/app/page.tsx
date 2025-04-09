'use client';

import ClientWrapper from '@/components/ClientWrapper';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
// ... other imports
import { useSession, signIn, signOut } from "next-auth/react";
import React, { useState, useEffect, useMemo, useRef } from "react"; // <-- UPDATED import line to include React and useRef
import GradeSelector from '../components/GradeSelector'; // Import the new component
import PrevGradeSelector from '../components/PrevGradeSelector'; // Import the new component
import GpaDisplay from '../components/GpaDisplay'; // Import the new component
import SignOutButton from '@/components/SignOutButton';
import GpaResultsCard from '@/components/GpaResultsCard';
import { usePDFGenerator, generatePDF } from '../components/PDFGenerator';
import { FaFilePdf } from 'react-icons/fa';
// Remove the duplicate line if it exists

// Define the expected structure for a grade scale row
interface GradeScaleRow {
    Grade: string;
    Point: number;
    Note: string;
    AffectsGPA: boolean;
}

// --- Define Interfaces for Student Data (Matches API Response) ---
interface StudentRecord {
    DegStudentNo: string;
    Email: string;
    DegCumActualCredits: number;
    DegCumPoints: number; // Raw points
    DegCumMajorCredits: number;
    DegCumMajorPoints: number; // Raw points
    Note?: string | null; // <<< Add Note field
}

interface RegistrationRecord {
    DegStudentNo: string;
    CatalogKey: string;
    Credits: number;
    RegGrade: string | null;
    MajorCourse: string;
    Rpeat: string;
    PrevGrade: string | null;
}

// Define structure for advisee list item (matching API)
interface AdviseeInfo {
    studentId: string;
    name: string;
    email: string;
    department?: string;
    faculty?: string;
}

// <<< Updated Response Interface (matching API) >>>
interface StudentDataResponse {
    accessType: 'direct' | 'advisor' | 'none';
    student?: StudentRecord | null;
    registrations?: RegistrationRecord[] | null;
    advisees?: AdviseeInfo[] | null;
    isOverride?: boolean;
    overrideTargetEmail?: string;
}
// Add this interface near the other interfaces
interface PlannerCourse {
    id: string; // Unique ID for React key, can be CatalogKey + index or UUID
    catalogKey: string;
    credits: number;
    selectedGrade: string | null; // Grade chosen in the planner
    isMajor: boolean;
    isRepeat: boolean;
    previousGrade: string | null; // Grade selected if isRepeat is true
    // Add flags for requirement handling (P-Repeat case)
    originalCourseWasMajor?: boolean | null; // Needed only if current grade is P and isRepeat is true
  }
// --- End Interfaces ---

// Add the print-related CSS to the page
// Add these functions below other utility functions and above the main component
function formatDate(date: Date): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

function HomePageContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isShareLink = !!searchParams.get('data'); // Check if it's a share link

    // Debug component render
    const renderRef = useRef(0);
    renderRef.current += 1;
    console.log(`🖥️ COMPONENT RENDERING #${renderRef.current}`);

    // Add a function to handle printing
    const handlePrint = () => {
        window.print();
    };
    
    // Add PDF generation function
    const handleGeneratePDF = () => {
        // Call the non-hook version of the PDF generator
        generatePDF({
            studentId: displayedStudentId || '',
            baseData: {
                overallCredits: editableBaseOverallCredits,
                overallPoints: editableBaseOverallPoints,
                overallGPA: calculateGPA(parseFloat(editableBaseOverallPoints) || 0, parseInt(editableBaseOverallCredits, 10) || 0),
                majorCredits: editableBaseMajorCredits,
                majorPoints: editableBaseMajorPoints,
                majorGPA: calculateGPA(parseFloat(editableBaseMajorPoints) || 0, parseInt(editableBaseMajorCredits, 10) || 0)
            },
            semesterGPA: semesterGPAInfo,
            projectedGPA: projectedGPAInfo,
            targetGPA: {
                overall: targetOverallGPAInput,
                major: targetMajorGPAInput
            },
            requiredSemesterInfo,
            courses: plannerCourses,
            disclaimer: disclaimerText
        });
    };

    // --- State for Gradescale ---
    const [gradeScale, setGradeScale] = useState<GradeScaleRow[]>([]);
    const [gradeScaleStatus, setGradeScaleStatus] = useState< "idle" | "loading" | "success" | "error" >("idle");
    const [gradeScaleError, setGradeScaleError] = useState<string | null>(null);
    // --- End State for Gradescale ---

    // --- State for Data & Access Control ---
    const [studentDataSource, setStudentDataSource] = useState<StudentDataResponse | null>(null); // Store the raw response
    const [studentDataStatus, setStudentDataStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [studentDataError, setStudentDataError] = useState<string | null>(null);
    const [isOverrideActive, setIsOverrideActive] = useState(false);
    const [accessType, setAccessType] = useState<StudentDataResponse['accessType'] | 'loading'>('loading'); // <<< Add accessType state
    const [advisees, setAdvisees] = useState<AdviseeInfo[] | null>(null); // <<< Add advisees state
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null); // <<< Add state for selected student
    const [isFromAdvisorMode, setIsFromAdvisorMode] = useState(false); // Track if user came from advisor selection
    // --- End State for Data & Access Control ---

     // --- State for Editable Base Data ---
     const [editableBaseOverallCredits, setEditableBaseOverallCredits] = useState<string>(''); // Use string for input
     const [editableBaseOverallPoints, setEditableBaseOverallPoints] = useState<string>('');   // Use string for input (representing points * 10 from sheet)
     const [editableBaseMajorCredits, setEditableBaseMajorCredits] = useState<string>('');
     const [editableBaseMajorPoints, setEditableBaseMajorPoints] = useState<string>('');
     // Store the original fetched data to allow reset
     const [originalBaseData, setOriginalBaseData] = useState<{ overallCredits: number, overallPoints: number, majorCredits: number, majorPoints: number } | null>(null);
     // --- End State for Editable Base Data ---
    
      // **** DECLARE plannerCourses STATE HERE ****
      const [plannerCourses, setPlannerCourses] = useState<PlannerCourse[]>([]);
      const [initialPlannerState, setInitialPlannerState] = useState<PlannerCourse[] | null>(null); // Keep for reset
      const [isPlannerInitialized, setIsPlannerInitialized] = useState(false); // <<< Add Initialization Flag
      const [nextCustomCourseNumber, setNextCustomCourseNumber] = useState<number>(1); // <<< Add counter for new courses
      const [isLoadedFromShareLink, setIsLoadedFromShareLink] = useState(false); // <<< Flag for shared link state

  
      // --- State for Target GPA ---
      const [targetOverallGPAInput, setTargetOverallGPAInput] = useState<string>('2.0'); // Default to 2.0
    const [targetMajorGPAInput, setTargetMajorGPAInput] = useState<string>('2.0');   // Default to 2.0
      const [requiredSemesterGPA, setRequiredSemesterGPA] = useState<{ overall: string | number, major: string | number }>({ overall: 'N/A', major: 'N/A' });
      const [targetCalcStatus, setTargetCalcStatus] = useState<'idle' | 'calculated' | 'error' | 'impossible'>('idle');
      // --- End State for Target GPA ---
    // --- State for Disclaimer ---
    const [disclaimerText, setDisclaimerText] = useState<string>("Loading disclaimer...");
    // --- End State for Disclaimer ---

    // --- State for Base Cumulative Data expansion ---
    const [isBaseDataExpanded, setIsBaseDataExpanded] = useState<boolean>(true);
    const [isTargetGPAExpanded, setIsTargetGPAExpanded] = useState<boolean>(true);
    const [isMobileView, setIsMobileView] = useState<boolean>(false);
    // --- End State for Base Cumulative Data expansion ---

    // --- State for Base URL (for Sharing) ---
    const [baseUrl, setBaseUrl] = useState<string | null>(null);
    const [baseUrlStatus, setBaseUrlStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [baseUrlError, setBaseUrlError] = useState<string | null>(null);
    // --- End State for Base URL ---

    // State for student ID display
    const [displayedStudentId, setDisplayedStudentId] = useState<string | null>(null);
    // Add state for base data note
    const [baseDataNote, setBaseDataNote] = useState<string | null>(null);

    // State for copy feedback
    const [linkCopied, setLinkCopied] = useState(false);

    // --- Debug Variables ---
    const renderCount = useRef(0);
    const plannerInitAttempts = useRef(0);
    const initTimestamp = useRef(Date.now());
    // --- End Debug Variables ---

    // Add state for student ID suggestions and filtered suggestions
    const [studentIdInput, setStudentIdInput] = useState<string>('');
    const [filteredAdvisees, setFilteredAdvisees] = useState<AdviseeInfo[]>([]);
    const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
    const [selectedValidStudentId, setSelectedValidStudentId] = useState<boolean>(false);

    // Add a loading state for student data loading
    const [isLoadingStudent, setIsLoadingStudent] = useState<boolean>(false);

    // --- Effect to handle responsive behavior for Base Cumulative Data expansion ---
    useEffect(() => {
        // Function to check if we're in mobile view (less than 768px)
        const checkMobileView = () => {
            const isMobile = window.innerWidth < 768;
            setIsMobileView(isMobile);
            // Only auto-collapse on mobile view if it hasn't been manually toggled
            if (!isLoadedFromShareLink) {
                setIsBaseDataExpanded(!isMobile);
                setIsTargetGPAExpanded(!isMobile);
            }
        };

        // Initial check
        checkMobileView();

        // Add event listener for window resize
        window.addEventListener('resize', checkMobileView);

        // Cleanup
        return () => window.removeEventListener('resize', checkMobileView);
    }, [isLoadedFromShareLink]);
    // --- End effect for responsive behavior ---

    // --- Effect for fetching data AND initializing editable base (AND Loading from Share Link) ---
    useEffect(() => {
        // --- Attempt to Load State from Share Link FIRST ---
        const sharedDataParam = searchParams.get('data');
        if (sharedDataParam && !isLoadedFromShareLink) {
            console.log("Found shared data in URL, attempting to load...");
            try {
                const decodedData = decodeURIComponent(sharedDataParam);
                const sharedState = JSON.parse(decodedData);

                // Validate basic structure (add more checks as needed)
                if (sharedState && sharedState.planner && sharedState.bOC !== undefined) {
                    // Set states from shared data
                    setEditableBaseOverallCredits(sharedState.bOC || '0');
                    setEditableBaseOverallPoints(sharedState.bOP || '0');
                    setEditableBaseMajorCredits(sharedState.bMC || '0');
                    setEditableBaseMajorPoints(sharedState.bMP || '0');
                    setPlannerCourses(sharedState.planner || []);
                    setInitialPlannerState(sharedState.planner || []); // Also set initial state for reset
                    setTargetOverallGPAInput(sharedState.tO || '2.0');
                    setTargetMajorGPAInput(sharedState.tM || '2.0');
                    setNextCustomCourseNumber( (sharedState.planner?.filter((c: PlannerCourse) => c.catalogKey.startsWith('Course '))?.length || 0) + 1);
                    setDisplayedStudentId(sharedState.sId || null); 
                    setBaseDataNote(sharedState.bDN || null); // <<< Load Note from share link (using bDN)
                    
                    // Consider mobile view when setting expansion state
                    const isMobile = window.innerWidth < 768;
                    if (sharedState.bDE !== undefined) {
                        setIsBaseDataExpanded(sharedState.bDE);
                    } else {
                        setIsBaseDataExpanded(!isMobile);
                    }
                    
                    // Handle Target GPAs expansion state
                    if (sharedState.tGE !== undefined) {
                        setIsTargetGPAExpanded(sharedState.tGE);
                    } else {
                        setIsTargetGPAExpanded(!isMobile);
                    }
                    
                    setIsMobileView(isMobile);

                    setIsPlannerInitialized(true); // Mark planner as initialized
                    setIsLoadedFromShareLink(true); // Mark that we loaded from link
                    setAccessType('direct'); // Set access type to direct for shared links
                    console.log("Successfully loaded state from share link.");

                    // IMPORTANT: Return early to prevent auth-based fetching/resetting
                    return;
                } else {
                    console.error("Parsed shared data has unexpected structure:", sharedState);
                }
            } catch (error) {
                console.error("Error parsing shared data from URL:", error);
                // Optional: Show an error message to the user
            }
            // Proceed with normal flow if parsing failed but DON'T set the flag
        }
        // --- End Loading State from Share Link ---

        // --- Proceed with Auth-Based Logic ONLY if not loaded from share link ---
        // (Existing logic for status === "authenticated" and status === "unauthenticated")

        // Fetch Gradescale (Only if Authenticated OR Share Link)
        if (gradeScaleStatus === "idle" && (status === "authenticated" || isShareLink)) {
            setGradeScaleStatus("loading");
            setGradeScaleError(null);
            const fetchGradeScale = async () => {
                try {
                    const res = await fetch('/api/gradescale');
                    if (!res.ok) {
                         const errorData = await res.json().catch(() => ({}));
                         throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
                    }
                    const data: GradeScaleRow[] = await res.json();
                    setGradeScale(data);
                    setGradeScaleStatus("success");
                    console.log("Gradescale loaded successfully.");
                } catch (error: any) {
                     console.error("Error fetching grade scale:", error);
                     setGradeScaleError(error.message || "Failed to load grade scale.");
                     setGradeScaleStatus("error");
                 }
            };
            fetchGradeScale();
        }

        // Fetch Student Data & Initialize Editable Base (Only if Authenticated AND Not Loaded from Share Link)
        if (status === "authenticated" && studentDataStatus === "idle" && !isLoadedFromShareLink) {
            setStudentDataStatus("loading");
            setAccessType("loading"); // <<< Set access type to loading
            setStudentDataError(null);
            setAdvisees(null); // Clear previous advisee list
            setSelectedStudentId(null); // Clear selected student
            // Clear editable fields while loading new data
            setEditableBaseOverallCredits(''); setEditableBaseOverallPoints('');
            setEditableBaseMajorCredits(''); setEditableBaseMajorPoints('');
            setOriginalBaseData(null);
            setDisplayedStudentId(null);
            setBaseDataNote(null);

            const fetchStudentAccessData = async () => {
                try {
                    const res = await fetch('/api/studentdata');
                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({})); // Try get error details
                        if (res.status === 401) {
                            throw new Error("Session expired or invalid. Please sign in again.");
                        }
                        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
                    }
                    const data: StudentDataResponse = await res.json();

                    console.log("Received student access data:", data);

                    // Store the raw response and set access type/advisee list
                    setStudentDataSource(data); // Store raw response
                    setAccessType(data.accessType);
                    setIsOverrideActive(data.isOverride ?? false);
                    setAdvisees(data.advisees || null);

                    // --- START Integrated Planner Initialization ---
                    console.log(`Planner Init Trigger: accessType=${data.accessType}, isPlannerInitialized=${isPlannerInitialized}, gradeScaleStatus=${gradeScaleStatus}, isLoadedFromShareLink=${isLoadedFromShareLink}`);
                    if (gradeScaleStatus === 'success' && gradeScale.length > 0) {
                        // Case 1: Direct access, not from share link, not initialized yet
                        if (data.accessType === 'direct' && !isPlannerInitialized && !isLoadedFromShareLink) {
                            console.log("Planner Init: Populating from direct access registrations...");
                            let initialCourses: PlannerCourse[] = [];
                            if (data.registrations && data.registrations.length > 0) {
                                initialCourses = data.registrations.map((reg, index): PlannerCourse => {
                                    const isRepeatValue = reg.Rpeat === 'Yes';
                                    const isValidRegGrade = gradeScale.some(gs => gs.Grade === reg.RegGrade);
                                    const initialSelectedGrade = isValidRegGrade ? reg.RegGrade : null;
                                    const isValidPrevGrade = gradeScale.some(gs => gs.Grade === reg.PrevGrade);
                                    const initialPreviousGrade = isRepeatValue && isValidPrevGrade ? reg.PrevGrade : null;
                                    return {
                                        id: `${reg.CatalogKey}-${index}-${Date.now()}`,
                                        catalogKey: reg.CatalogKey,
                                        credits: reg.Credits,
                                        selectedGrade: initialSelectedGrade,
                                        isMajor: reg.MajorCourse === 'Yes',
                                        isRepeat: isRepeatValue,
                                        previousGrade: initialPreviousGrade,
                                        originalCourseWasMajor: null,
                                    };
                               });
                            } else {
                                console.log("Planner Init: No registrations found for direct access user.");
                                // Keep initialCourses as empty array []
                            }
                            setPlannerCourses(initialCourses);
                            setInitialPlannerState(initialCourses); // Save the initial state
                            setIsPlannerInitialized(true);
                            console.log("Planner initialized from fetched data.");
                        }
                        // Case 2: Loaded from share link (accessType forced to 'direct'), not initialized yet
                        // Note: accessType is determined *before* this block in share link logic
                        else if (accessType === 'direct' && isLoadedFromShareLink && !isPlannerInitialized) {
                             console.log("Planner Init: Using pre-loaded courses from share link.");
                             // Assume plannerCourses state was already populated by share link logic in the initial useState
                             // We just need to save this state as the initial state and mark as initialized
                             setInitialPlannerState(plannerCourses); // Save the current state (from share link)
                             setIsPlannerInitialized(true);
                             console.log("Planner initialized from share link data.");
                        }
                        // Case 3: Advisor or No Access - Reset planner
                        else if (data.accessType === 'advisor' || data.accessType === 'none') {
                            console.log(`Planner Init: Resetting planner for accessType=${data.accessType}.`);
                            setPlannerCourses([]);
                            setInitialPlannerState([]);
                            setIsPlannerInitialized(false); // Allow re-initialization if access changes
                        }
                        // Case 4: Already initialized - Do nothing here for init
                        else if (isPlannerInitialized) {
                            console.log("Planner Init: Already initialized, skipping population.");
                        }
                    } else {
                          console.log("Planner Init: Grade scale not ready, skipping initialization.");
                    }
                    // --- END Integrated Planner Initialization ---

                    // --- Initialize Editable State ONLY if direct access ---
                    if (data.accessType === 'direct' && data.student) {
                        const baseData = {
                        overallCredits: data.student.DegCumActualCredits,
                        // *** READ DIRECTLY (No /10) ***
                        overallPoints: data.student.DegCumPoints,
                        majorCredits: data.student.DegCumMajorCredits,
                        // *** READ DIRECTLY (No /10) ***
                        majorPoints: data.student.DegCumMajorPoints
                        };
                    // Set editable state - ensure points are treated as numbers then stringified
                    setEditableBaseOverallCredits(baseData.overallCredits.toString());
                    setEditableBaseOverallPoints((baseData.overallPoints ?? 0).toString()); // Handle potential null/undefined from sheet if needed
                    setEditableBaseMajorCredits(baseData.majorCredits.toString());
                    setEditableBaseMajorPoints((baseData.majorPoints ?? 0).toString());   // Handle potential null/undefined
                    setOriginalBaseData(baseData);
                    setDisplayedStudentId(data.student.DegStudentNo);
                    setBaseDataNote(data.student.Note ?? null); // <<< Set Note from fetched data
                    console.log("Direct access granted. Initialized editable state.");
                    } else if (data.accessType === 'advisor') {
                        console.log("Advisor access granted. Waiting for student selection.");
                        // Clear base data for advisor view initially
                        setEditableBaseOverallCredits('0'); setEditableBaseOverallPoints('0');
                        setEditableBaseMajorCredits('0'); setEditableBaseMajorPoints('0');
                        setOriginalBaseData({ overallCredits: 0, overallPoints: 0, majorCredits: 0, majorPoints: 0 });
                        setDisplayedStudentId(null); // No specific student loaded yet
                        setBaseDataNote('Select a student to load data'); // Add placeholder note
                    } else { // accessType === 'none'
                        console.log("No access granted.");
                        // Set empty/default base data
                         setEditableBaseOverallCredits('0'); setEditableBaseOverallPoints('0');
                         setEditableBaseMajorCredits('0'); setEditableBaseMajorPoints('0');
                         setOriginalBaseData({ overallCredits: 0, overallPoints: 0, majorCredits: 0, majorPoints: 0 });
                         setDisplayedStudentId(null);
                         setBaseDataNote('Student data not found or no access.');
                    }
                    // --- End Initialize Editable State ---

                    setStudentDataStatus("success");
                } catch (error: any) {
                     console.error("Error fetching student data:", error);
                     setStudentDataError(error.message || "Failed to load student data.");
                     setStudentDataStatus("error");
                     setAccessType('none'); 
                 }
            };
            fetchStudentAccessData();
        }

        // Fetch Disclaimer (Only if Authenticated OR Share Link)
        if (disclaimerText === "Loading disclaimer..." && (status === "authenticated" || isShareLink)) { 
                    console.log("Fetching disclaimer text...");
                    const fetchDisclaimer = async () => {
                        try {
                            const res = await fetch('/api/disclaimer');
                            if (!res.ok) {
                                const errorData = await res.json().catch(() => ({}));
                                throw new Error(errorData.error || `HTTP error! Status: ${res.status}`);
                            }
                            const data = await res.json();
                            setDisclaimerText(data.disclaimer || "Disclaimer could not be loaded.");
                            console.log("Disclaimer loaded.");
                        } catch (error: any) {
                            console.error("Error fetching disclaimer:", error);
                            setDisclaimerText("Disclaimer could not be loaded due to an error.");
                        }
                    };
                    fetchDisclaimer();
        }

    // Dependencies: trigger fetches/reset based on auth status,
    // but also ensure fetches only run once using their own status flags.
        }, [status, searchParams, isLoadedFromShareLink, gradeScaleStatus, studentDataStatus, disclaimerText, gradeScale, isPlannerInitialized]); // Added gradeScale, isPlannerInitialized
    // --- End Data Fetch & Base Init Effect ---

// --- START Dedicated Reset Effect ---
     useEffect(() => {
    // Reset state only when status becomes unauthenticated (and not from share link)
    if (status === "unauthenticated" && !isLoadedFromShareLink) {
        console.log("[Reset Effect] User unauthenticated, resetting state conditionally...");

        // Reset ALL relevant states, conditionally
        if (gradeScale.length > 0) setGradeScale([]);
        if (gradeScaleStatus !== "idle") setGradeScaleStatus("idle");
        if (gradeScaleError !== null) setGradeScaleError(null);

        if (studentDataSource !== null) setStudentDataSource(null);
        if (studentDataStatus !== "idle") setStudentDataStatus("idle");
        if (studentDataError !== null) setStudentDataError(null);

        if (editableBaseOverallCredits !== '') setEditableBaseOverallCredits('');
        if (editableBaseOverallPoints !== '') setEditableBaseOverallPoints('');
        if (editableBaseMajorCredits !== '') setEditableBaseMajorCredits('');
        if (editableBaseMajorPoints !== '') setEditableBaseMajorPoints('');
        if (originalBaseData !== null) setOriginalBaseData(null);

        if (plannerCourses.length > 0) setPlannerCourses([]);
        if (initialPlannerState !== null) setInitialPlannerState(null);
        if (isPlannerInitialized !== false) setIsPlannerInitialized(false);
        if (nextCustomCourseNumber !== 1) setNextCustomCourseNumber(1);

        if (displayedStudentId !== null) setDisplayedStudentId(null);
        if (baseDataNote !== null) setBaseDataNote(null);

        if (targetOverallGPAInput !== '2.0') setTargetOverallGPAInput('2.0');
        if (targetMajorGPAInput !== '2.0') setTargetMajorGPAInput('2.0');

        if (isOverrideActive !== false) setIsOverrideActive(false);
        if (accessType !== 'none') setAccessType('none');
        if (advisees !== null) setAdvisees(null);
        if (selectedStudentId !== null) setSelectedStudentId(null);
    }
}, [status, isLoadedFromShareLink]); // Only depends on status and share link flag
// --- END Dedicated Reset Effect ---

    // --- Effect for fetching Base URL (runs once on mount) ---
    useEffect(() => {
        if (baseUrlStatus === "idle") {
            setBaseUrlStatus("loading");
            setBaseUrlError(null);
            console.log("Fetching base URL...");
            const fetchBaseUrl = async () => {
                try {
                    // Set a fallback URL based on the current window location
                    const fallbackUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                    
                    const res = await fetch('/api/config');
                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({}));
                        console.error("Using fallback URL due to API error:", fallbackUrl);
                        setBaseUrl(fallbackUrl);
                        setBaseUrlStatus("success");
                        throw new Error(errorData.error || `HTTP error! Status: ${res.status}`);
                    }
                    
                    const data = await res.json();
                    if (!data.baseUrl) {
                        console.error("Base URL not found in API response, using fallback:", fallbackUrl);
                        setBaseUrl(fallbackUrl);
                        setBaseUrlStatus("success");
                        throw new Error("Base URL not found in API response.");
                    }
                    
                    setBaseUrl(data.baseUrl);
                    setBaseUrlStatus("success");
                    console.log("Base URL loaded:", data.baseUrl);
                } catch (error: any) {
                    console.error("Error fetching base URL:", error);
                    setBaseUrlError(error.message || "Failed to load base URL.");
                    // Don't set error status if we've already set a fallback URL and status
                    if (baseUrl === null) {
                        setBaseUrlStatus("error");
                    }
                }
            };
            fetchBaseUrl();
        }
    }, [baseUrlStatus]); // Dependency ensures it runs only once when status is idle
    // --- End Base URL Fetch Effect ---

    // --- Planner Initialization Effect (Updated Dependencies & Conditions) ---
     /* useEffect(() => {
        console.log(`Planner Init Check: accessType=${accessType}, isPlannerInitialized=${isPlannerInitialized}, gradeScaleStatus=${gradeScaleStatus}`);

        // Initialize/Reset planner based on access type and loaded data
        if (gradeScaleStatus === 'success' && gradeScale.length > 0) {
            let initialCourses: PlannerCourse[] = [];

            // Only populate from registrations if direct access and data exists
            if (accessType === 'direct' && !isPlannerInitialized && studentDataSource?.registrations) {
                 console.log("Planner Init: Populating from direct access registrations...");
                 initialCourses = studentDataSource.registrations.map((reg, index): PlannerCourse => {
                 const isRepeatValue = reg.Rpeat === 'Yes';
                 const isValidRegGrade = gradeScale.some(gs => gs.Grade === reg.RegGrade);
                 const initialSelectedGrade = isValidRegGrade ? reg.RegGrade : null;
                 const isValidPrevGrade = gradeScale.some(gs => gs.Grade === reg.PrevGrade);
                 const initialPreviousGrade = isRepeatValue && isValidPrevGrade ? reg.PrevGrade : null;
                 return {
                     id: `${reg.CatalogKey}-${index}-${Date.now()}`,
                     catalogKey: reg.CatalogKey,
                     credits: reg.Credits,
                     selectedGrade: initialSelectedGrade,
                     isMajor: reg.MajorCourse === 'Yes',
                     isRepeat: isRepeatValue,
                     previousGrade: initialPreviousGrade,
                     originalCourseWasMajor: null,
                 };
            });
                 setPlannerCourses(initialCourses);
                 setInitialPlannerState(initialCourses);
                 setIsPlannerInitialized(true);
            }
            // If advisor access OR no access OR switching selected student, reset the planner
            // Also reset if planner was previously initialized but access type changes away from direct
            else if (accessType === 'advisor' || accessType === 'none' || (isPlannerInitialized && accessType !== 'direct')) {
                console.log(`Planner Init: Resetting planner for accessType=${accessType} or state change.`);
                setPlannerCourses([]);
                setInitialPlannerState([]);
                setIsPlannerInitialized(false); // Allow re-initialization if access becomes 'direct' later
            }
            // Handle case where shared link data was loaded (accessType forced to 'direct' earlier)
            else if (accessType === 'direct' && isLoadedFromShareLink && !isPlannerInitialized && plannerCourses.length > 0) {
                 console.log("Planner Init: Using pre-loaded courses from share link.");
                 setInitialPlannerState(plannerCourses);
                 setIsPlannerInitialized(true);
            }

        }
     }, [accessType, studentDataSource, gradeScaleStatus, gradeScale, isPlannerInitialized, isLoadedFromShareLink]); */ // <<< COMMENTED OUT/REMOVED
     // --- End Planner Initialization Effect ---

    // --- Helper Function to Calculate GPA ---
    const calculateGPA = (points: number, credits: number): string => {
        // Check for NaN inputs or invalid credits
        if (isNaN(points) || isNaN(credits) || credits <= 0) {
            return "N/A";
        }
        // const adjustedPoints = points / 10; // <-- REMOVED THIS LINE
        const gpa = points / credits; // <-- USE DIRECT POINTS
        // Check for NaN result before formatting
        return isNaN(gpa) ? "N/A" : gpa.toFixed(3);
    };
    // --- End Helper ---
       // --- Planner Input Handler ---
       const handlePlannerChange = (id: string, field: keyof PlannerCourse, value: any) => {
        console.log(`handlePlannerChange: id=${id}, field=${field}, value=${value}`); // Log input

        setPlannerCourses(prevCourses => {
            // Create a new array - DO NOT MUTATE PREVIOUS STATE
            const updatedCourses = prevCourses.map(course => {
                // Find the course to update
                if (course.id === id) {
                    // Create a new object for the changed course
                    // Use a temporary variable to hold the intermediate state
                    let updatedCourse = { ...course, [field]: value };

                    // --- Add Logic for Dependent Fields ---

                    // 1. If "Repeat?" is unchecked, clear "Previous Grade" and P-Repeat flags
                    if (field === 'isRepeat' && value === false) {
                        console.log(`Clearing previousGrade for course ${id} because isRepeat is false`); // Add log
                        updatedCourse.previousGrade = null;
                        updatedCourse.originalCourseWasMajor = null; // Clear P-repeat specific field too
                    }

                    // 2. If the current grade is changed *away* from 'P' while repeat is true, clear P-Repeat flag
                    // Ensure we check the potentially *updated* isRepeat status
                    if (field === 'selectedGrade' && updatedCourse.isRepeat && value !== 'P') {
                        console.log(`Clearing originalCourseWasMajor for course ${id} because grade changed from P`); // Add log
                        updatedCourse.originalCourseWasMajor = null;
                    }

                     // 3. If "Previous Grade" selection is cleared (user selects the placeholder "-- Select Prev --")
                    if (field === 'previousGrade' && value === '') {
                        console.log(`Setting previousGrade to null for course ${id} due to empty selection`); // Add log
                        updatedCourse.previousGrade = null; // Store null explicitly
                    }
                    // Check also necessary in onChange: `e.target.value || null`

                     // 4. If "Selected Grade" selection is cleared (user selects the placeholder "-- Select --")
                     if (field === 'selectedGrade' && value === '') {
                          console.log(`Setting selectedGrade to null for course ${id} due to empty selection`); // Add log
                          updatedCourse.selectedGrade = null; // Store null explicitly
                     }
                    // Check also necessary in onChange: `e.target.value || null`


                    // --- End Dependent Field Logic ---
                     console.log("Updated course object:", updatedCourse); // Log the final state of the updated course
                    return updatedCourse; // Return the modified course object
                }
                // If it's not the course we're looking for, return it unchanged
                return course;
            });

    // ... after handlePlannerChange ...



            // Return the new array with the updated course (or the original array if no match - though id should match)
            return updatedCourses;
        });
    };
    // --- End Planner Input Handler ---

    // --- Add Course Handler ---
    const handleAddCourse = () => {
        setPlannerCourses(prevCourses => {
            // Generate a truly unique ID
            const uniqueId = `new-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            // *** USE STATE COUNTER INSTEAD OF FILTERING ***
            const courseName = `Course ${nextCustomCourseNumber}`;

            const newCourse: PlannerCourse = {
                id: uniqueId,
                catalogKey: courseName, // Use the generated name
                credits: 3,     // Default credits
                selectedGrade: null,
                isMajor: false,
                isRepeat: false,
                previousGrade: null,
                originalCourseWasMajor: null,
            };
            // Return a new array with the new course appended
            return [...prevCourses, newCourse];
        });
        // *** INCREMENT THE STATE COUNTER AFTER ADDING ***
        setNextCustomCourseNumber(prevNum => prevNum + 1);
    };
    // --- End Add Course Handler ---


    // --- Remove Course Handler ---
    const handleRemoveCourse = (idToRemove: string) => {
        setPlannerCourses(prevCourses => {
            // Filter out the course with the matching ID
            const updatedCourses = prevCourses.filter(course => course.id !== idToRemove);
            // Return the new filtered array
            return updatedCourses;
        });
    };

    // ... after handleRemoveCourse ...

    // --- Reset Planner Handler ---
    // Stores the initially loaded planner state to revert back to
    const handleResetPlanner = () => {
        if (initialPlannerState) {
            console.log("Resetting planner to initial state...");
            setPlannerCourses(initialPlannerState); // Revert to the saved initial state
            setNextCustomCourseNumber(1); // <<< Reset counter on successful reset
        } else {
            // Fallback: If initial state wasn't saved somehow, re-run the population logic
            // (This might happen if reset is clicked before data fully loads)
             console.log("Initial state not found, attempting re-population logic...");
             // Re-populate logic - Requires studentDataSource and gradeScale
             if (studentDataStatus === "success" && 
                 studentDataSource?.registrations && // <<< Add check here
                 gradeScaleStatus === "success" && 
                 gradeScale.length > 0) 
             {
                  const repopulatedCourses = studentDataSource.registrations.map((reg, index): PlannerCourse => {
                     // <<< Restore mapping logic >>>
                      const isRepeatValue = reg.Rpeat === 'Yes';
                      const isValidRegGrade = gradeScale.some(gs => gs.Grade === reg.RegGrade);
                      const initialSelectedGrade = isValidRegGrade ? reg.RegGrade : null;
                      const isValidPrevGrade = gradeScale.some(gs => gs.Grade === reg.PrevGrade);
                      const initialPreviousGrade = isRepeatValue && isValidPrevGrade ? reg.PrevGrade : null;
                      return {
                          id: `${reg.CatalogKey}-${index}-${Date.now()}`,
                          catalogKey: reg.CatalogKey,
                          credits: reg.Credits,
                          selectedGrade: initialSelectedGrade,
                          isMajor: reg.MajorCourse === 'Yes',
                          isRepeat: isRepeatValue,
                          previousGrade: initialPreviousGrade,
                          originalCourseWasMajor: null,
                      };
                     // <<< End restore >>>
                  });
                  setPlannerCourses(repopulatedCourses);
                  setInitialPlannerState(repopulatedCourses);
                  setNextCustomCourseNumber(1); 
             } else {
                 console.log("Cannot repopulate, resetting to empty.") // Log if repopulation isn't possible
                 setPlannerCourses([]); 
                 setInitialPlannerState([]); // Ensure initial state is also reset
                 setNextCustomCourseNumber(1); 
             }
        }
    };
    // --- End Reset Planner Handler ---

    // --- Reset Base Data Handler ---
    const handleResetBaseData = () => {
        // For shared links, we need special handling to preserve base data from the URL
        if (isLoadedFromShareLink && searchParams) {
            const sharedDataParam = searchParams.get('data');
            if (sharedDataParam) {
                try {
                    const decodedData = decodeURIComponent(sharedDataParam);
                    const sharedState = JSON.parse(decodedData);
                    
                    // Restore base data from the shared link
                    setEditableBaseOverallCredits(sharedState.bOC || '0');
                    setEditableBaseOverallPoints(sharedState.bOP || '0');
                    setEditableBaseMajorCredits(sharedState.bMC || '0');
                    setEditableBaseMajorPoints(sharedState.bMP || '0');
                    
                    // Restore original Target GPAs from the shared link
                    setTargetOverallGPAInput(sharedState.tO || '2.0');
                    setTargetMajorGPAInput(sharedState.tM || '2.0');
                    
                    console.log("Reset calculator: Restored base data and target GPAs from shared link");
                } catch (error) {
                    console.error("Error restoring data from shared link:", error);
                    // Fallback to standard reset logic if parsing fails
                    resetToOriginalOrZero();
                    resetTargetGPAs();
                }
            } else {
                resetToOriginalOrZero();
                resetTargetGPAs();
            }
        } else {
            // Standard reset logic for non-shared links
            resetToOriginalOrZero();
            resetTargetGPAs();
        }

        // Reset Planner Courses to initial state
        handleResetPlanner();
        
        console.log("Full calculator reset completed");
    };
    
    // Helper function for reset logic
    const resetToOriginalOrZero = () => {
        // Reset Base Cumulative Data
        if (originalBaseData) {
            console.log("Resetting editable base data to original:", originalBaseData);
            setEditableBaseOverallCredits(originalBaseData.overallCredits.toString());
            setEditableBaseOverallPoints((originalBaseData.overallPoints ?? 0).toString());
            setEditableBaseMajorCredits(originalBaseData.majorCredits.toString());
            setEditableBaseMajorPoints((originalBaseData.majorPoints ?? 0).toString());
        } else {
            console.log("Original base data not available, resetting to 0");
            setEditableBaseOverallCredits('0');
            setEditableBaseOverallPoints('0');
            setEditableBaseMajorCredits('0');
            setEditableBaseMajorPoints('0');
        }
    };
    
    // Helper function to reset target GPAs to default values
    const resetTargetGPAs = () => {
        // Reset Target GPAs to default values
        setTargetOverallGPAInput('2.0');
        setTargetMajorGPAInput('2.0');
    };
    // --- End Reset Base Data Handler ---


     // --- Effect specifically for initializing the planner ONCE (using flag) ---
     useEffect(() => {
        // Only proceed if we have the necessary data and haven't initialized yet
        if (studentDataStatus === "success" && 
            gradeScaleStatus === "success" && 
            !isPlannerInitialized && 
            studentDataSource && 
            gradeScale.length > 0) {
            
            console.log("Initializing planner with data...");
            
            const registrations = studentDataSource.registrations || [];
            let initialCourses: PlannerCourse[] = [];

            if (registrations.length > 0) {
                initialCourses = registrations.map((reg, index): PlannerCourse => {
                const isRepeatValue = reg.Rpeat === 'Yes';
                const isValidRegGrade = gradeScale.some(gs => gs.Grade === reg.RegGrade);
                const initialSelectedGrade = isValidRegGrade ? reg.RegGrade : null;
                const isValidPrevGrade = gradeScale.some(gs => gs.Grade === reg.PrevGrade);
                const initialPreviousGrade = isRepeatValue && isValidPrevGrade ? reg.PrevGrade : null;
                 return {
                     id: `${reg.CatalogKey}-${index}-${Date.now()}`,
                     catalogKey: reg.CatalogKey,
                     credits: reg.Credits,
                     selectedGrade: initialSelectedGrade,
                     isMajor: reg.MajorCourse === 'Yes',
                     isRepeat: isRepeatValue,
                     previousGrade: initialPreviousGrade,
                     originalCourseWasMajor: null,
                 };
            });
            }

            // Set both states in a single batch to minimize re-renders
            setPlannerCourses(initialCourses);
            setInitialPlannerState(initialCourses);
            setIsPlannerInitialized(true);
        }
     }, [studentDataStatus, gradeScaleStatus, isPlannerInitialized]); // Only depend on status flags and initialization flag

    // Add this debugging effect to watch for changes in other state variables
    useEffect(() => {
        console.log(`🔄 PLANNER COURSES CHANGED: ${plannerCourses.length} courses`);
    }, [plannerCourses]);

    useEffect(() => {
        console.log(`🔄 INITIAL PLANNER STATE CHANGED: ${initialPlannerState?.length || 0} courses`);
    }, [initialPlannerState]);

     const semesterGPAInfo = useMemo(() => {
        // Ensure gradescale is loaded before calculating
        if (!gradeScale || gradeScale.length === 0) {
            return { overallGPA: 'N/A', majorGPA: 'N/A', overallCredits: 0, majorCredits: 0, status: 'loading' };
        }

        let overallPoints = 0;
        let overallCredits = 0; // GPA Denominator Credits
        let majorPoints = 0;
        let majorCredits = 0; // GPA Denominator Credits (Major)

        plannerCourses.forEach(course => {
            // Find the grade object from the scale
            const gradeInfo = gradeScale.find(gs => gs.Grade === course.selectedGrade);

            // Include in calculation ONLY if a valid grade is selected AND it affects GPA
            if (gradeInfo && gradeInfo.AffectsGPA) {
                const coursePoints = gradeInfo.Point * course.credits;

                overallPoints += coursePoints;
                overallCredits += course.credits;

                if (course.isMajor) {
                    majorPoints += coursePoints;
                    majorCredits += course.credits;
                }
            }
            // Note: Repeat status does NOT affect the SEMESTER calculation directly, only the projected CUMULATIVE
        });

        const overallGPA = overallCredits > 0 ? (overallPoints / overallCredits).toFixed(3) : 'N/A';
        const majorGPA = majorCredits > 0 ? (majorPoints / majorCredits).toFixed(3) : 'N/A';

        return { overallGPA, majorGPA, overallCredits, majorCredits, status: 'calculated' };

    }, [plannerCourses, gradeScale]); // Recalculate when planner or gradescale changes
    // --- End Semester Planner GPA Calculation ---

        // ... after semesterGPAInfo useMemo block ...

     // --- Calculate Projected Cumulative GPA using useMemo (v36 - Reads Editable Base) ---
     const projectedGPAInfo = useMemo(() => {
        // --- Base values from EDITABLE state ---
        const baseOverallCreds = parseInt(editableBaseOverallCredits, 10) || 0;
        const baseOverallPts = parseFloat(editableBaseOverallPoints) || 0;
        const baseMajorCreds = parseInt(editableBaseMajorCredits, 10) || 0;
        const baseMajorPts = parseFloat(editableBaseMajorPoints) || 0;

        // Need planner courses and gradescale to calculate projected changes
        if (gradeScaleStatus !== 'success' || gradeScale.length === 0) {
             return { overallGPA: 'N/A', majorGPA: 'N/A', finalOverallCredits: baseOverallCreds, finalMajorCredits: baseMajorCreds, status: 'waiting' };
        }

        // --- Calculate Net Changes & Removals from Planner ---
        let netOverallPointChange = 0;
        let netOverallCreditChange = 0;
        let netMajorPointChange = 0;
        let netMajorCreditChange = 0;
        let pointsToRemove = 0;
        let creditsToRemove = 0;
        let majorPointsToRemove = 0;
        let majorCreditsToRemove = 0;

        plannerCourses.forEach(course => {
            const credits = (typeof course.credits === 'number' && course.credits >= 0) ? course.credits : 0;
            const isMajor = course.isMajor;
            const gradeInfo = gradeScale.find(gs => gs.Grade === course.selectedGrade);
            const affectsGPANew = gradeInfo ? gradeInfo.AffectsGPA : false;

            if (course.isRepeat) {
                const prevGradeInfo = gradeScale.find(gs => gs.Grade === course.previousGrade);
                if (prevGradeInfo?.AffectsGPA) {
                    const oldPoints = prevGradeInfo.Point;
                    const newPoints = affectsGPANew && gradeInfo ? gradeInfo.Point : 0;
                    const pointDifference = (newPoints - oldPoints) * credits;
                    
                    netOverallPointChange += pointDifference;
                    const wasOriginalMajor = course.selectedGrade === 'P' ? (course.originalCourseWasMajor ?? false) : isMajor;
                    if (wasOriginalMajor) {
                         netMajorPointChange += pointDifference;
                    }

                    if (course.selectedGrade === 'P') {
                        pointsToRemove += prevGradeInfo.Point * credits;
                        creditsToRemove += credits;
                        if (wasOriginalMajor) {
                             majorPointsToRemove += prevGradeInfo.Point * credits;
                             majorCreditsToRemove += credits;
                        }
                         netOverallPointChange -= pointDifference;
                         if(wasOriginalMajor) netMajorPointChange -= pointDifference;
                    }
                }
                else if (affectsGPANew && gradeInfo) {
                     netOverallPointChange += gradeInfo.Point * credits;
                     netOverallCreditChange += credits;
                     if (isMajor) {
                         netMajorPointChange += gradeInfo.Point * credits;
                         netMajorCreditChange += credits;
                     }
                 }
            }
            else {
                if (affectsGPANew && gradeInfo) {
                     netOverallPointChange += gradeInfo.Point * credits;
                     netOverallCreditChange += credits;
                     if (isMajor) {
                         netMajorPointChange += gradeInfo.Point * credits;
                         netMajorCreditChange += credits;
                     }
                 }
            }
        });

        // --- Calculate Final Projected GPAs ---
        const finalOverallPts = baseOverallPts + netOverallPointChange;
        const finalOverallCreds = baseOverallCreds + netOverallCreditChange - creditsToRemove;
        const finalMajorPts = baseMajorPts + netMajorPointChange;
        const finalMajorCreds = baseMajorCreds + netMajorCreditChange - majorCreditsToRemove;

        const projectedOverallGPA = finalOverallCreds > 0 ? (finalOverallPts / finalOverallCreds).toFixed(3) : 'N/A';
        const projectedMajorGPA = finalMajorCreds > 0 ? (finalMajorPts / finalMajorCreds).toFixed(3) : 'N/A';

        return {
            overallGPA: projectedOverallGPA,
            majorGPA: projectedMajorGPA,
            finalOverallCredits: finalOverallCreds,
            finalMajorCredits: finalMajorCreds,
            status: 'calculated'
        };
    }, [editableBaseOverallCredits, editableBaseOverallPoints, editableBaseMajorCredits, editableBaseMajorPoints, gradeScaleStatus, gradeScale, plannerCourses]);
    // --- End Projected Cumulative GPA Calculation ---


    // ... after projectedGPAInfo useMemo block ...

              // ... after projectedGPAInfo useMemo block ...


          // --- Calculate Required Semester Info using useMemo (v34 - Final Logic Based on Use Cases) ---
          const requiredSemesterInfo = useMemo(() => {
            // Validate Target Inputs first
            const targetOverall = parseFloat(targetOverallGPAInput);
            const targetMajor = parseFloat(targetMajorGPAInput);
            const hasOverallTarget = !isNaN(targetOverall) && targetOverall >= 0;
            const hasMajorTarget = !isNaN(targetMajor) && targetMajor >= 0;

            // Check if data is ready (ONLY check gradeScale)
            if ((!hasOverallTarget && !hasMajorTarget) ||
                gradeScaleStatus !== 'success' || gradeScale.length === 0)
            {
                 return { 
                    overallDisplay: 'N/A', 
                    majorDisplay: 'N/A', 
                    status: 'waiting',
                    isOverallImpossible: false,
                    isMajorImpossible: false,
                    finalCumulativeOverallCredits: 0,
                    finalCumulativeMajorCredits: 0
                 };
            }

// --- Start Calculation Logic ---

     // *** USE parseFloat, REMOVE / 10 ***
            const baseOverallPts = parseFloat(editableBaseOverallPoints) || 0;
            const baseOverallCreds = parseInt(editableBaseOverallCredits, 10) || 0;
            // *** USE parseFloat, REMOVE / 10 ***
            const baseMajorPts = parseFloat(editableBaseMajorPoints) || 0;
            const baseMajorCreds = parseInt(editableBaseMajorCredits, 10) || 0;
    // --- End Start ---

             // *********************************************

            // Initialize calculation variables
            let pointsToRemove = 0;
            let creditsToRemove = 0;
            let majorPointsToRemove = 0;
            let majorCreditsToRemove = 0;
            let netOverallCreditChange = 0;
            let netMajorCreditChange = 0;
            let relevantPlannerCourses: PlannerCourse[] = []; // Store courses not ignored

            // --- First Pass: Identify Relevant Courses & Calculate Removals/Net Changes ---
            plannerCourses.forEach(course => {
                 const credits = (typeof course.credits === 'number' && course.credits >= 0) ? course.credits : 0;
                 const isMajor = course.isMajor;
                 const gradeInfo = gradeScale.find(gs => gs.Grade === course.selectedGrade);
                 const affectsGPANew = gradeInfo ? gradeInfo.AffectsGPA : false;

                 // --- Determine if course is relevant for target calculation ---
                 let isRelevant = true;
                 if (['W', 'E', 'I', 'IP'].includes(course.selectedGrade ?? '')) {
                     isRelevant = false;
                 } else if (course.selectedGrade === 'P' && !course.isRepeat) {
                     isRelevant = false;
                 }
                 // --------------------------------------------------------------

                 if (isRelevant) {
                     relevantPlannerCourses.push(course); // Add to list for divisor calc later

                     // --- Handle Repeats among relevant courses ---
                     if (course.isRepeat) {
                         const prevGradeInfo = gradeScale.find(gs => gs.Grade === course.previousGrade);
                         if (prevGradeInfo?.AffectsGPA) {
                             // Remove previous grade's points
                             pointsToRemove += prevGradeInfo.Point * credits;
                             const wasOriginalMajor = course.selectedGrade === 'P' ? (course.originalCourseWasMajor ?? false) : isMajor;
                             if (wasOriginalMajor) { majorPointsToRemove += prevGradeInfo.Point * credits; }

                             // ONLY remove credits if CURRENT grade is 'P'
                             if (course.selectedGrade === 'P') {
                                 creditsToRemove += credits;
                                 if (wasOriginalMajor) { majorCreditsToRemove += credits; }
                             }
                         }
                         // Repeats add 0 net credits change
                     }
                     // --- Handle Non-Repeats among relevant courses ---
                     else {
                         // Non-repeats add to net credit change
                         netOverallCreditChange += credits;
                         if (isMajor) { netMajorCreditChange += credits; }
                     }
                 } // end if(isRelevant)
             }); // End First Pass

            // --- Calculate Adjusted Base & Final Credits ---
            const adjustedBaseOverallPts = baseOverallPts - pointsToRemove;
            const adjustedBaseOverallCreds = baseOverallCreds - creditsToRemove;
            const adjustedBaseMajorPts = baseMajorPts - majorPointsToRemove;
            const adjustedBaseMajorCreds = baseMajorCreds - majorCreditsToRemove;

            const finalCumulativeOverallCredits = adjustedBaseOverallCreds + netOverallCreditChange;
            const finalCumulativeMajorCredits = adjustedBaseMajorCreds + netMajorCreditChange;
            // --- End Adjusted Base/Final Credits ---


            // --- Calculate Semester Divisor Credits (From RELEVANT Courses: GPA-Affecting OR Blank Grades) ---
            let targetDivisorCreditsOverall = 0;
            let targetDivisorCreditsMajor = 0;
            relevantPlannerCourses.forEach(course => { // Iterate only over relevant courses
                 const credits = (typeof course.credits === 'number' && course.credits >= 0) ? course.credits : 0;
                 const gradeInfo = gradeScale.find(gs => gs.Grade === course.selectedGrade);
                 const affectsGPANew = gradeInfo ? gradeInfo.AffectsGPA : false;

                 // Include credits if grade is blank OR if grade affects GPA
                 if (course.selectedGrade === null || affectsGPANew) {
                     targetDivisorCreditsOverall += credits;
                     if (course.isMajor) {
                         targetDivisorCreditsMajor += credits;
                     }
                 }
                 // Exclude credits if grade is explicitly non-GPA ('P', which would only be relevant if P-Repeat)
                 // Note: W, E, I, IP were already excluded by the 'isRelevant' check earlier
            });
            // --- End Semester Divisor Credits ---


            // --- Logging ---
            console.log("Target Calc Debug (v34 - Final Logic):");
            console.log("  Adjusted Base Points (Overall/Major):", adjustedBaseOverallPts, adjustedBaseMajorPts);
            console.log("  Final Cumulative Credits (Overall/Major):", finalCumulativeOverallCredits, finalCumulativeMajorCredits);
            console.log("  Target Divisor Credits (Relevant Blank/GPA) (Overall/Major):", targetDivisorCreditsOverall, targetDivisorCreditsMajor);
            // --- End Logging ---
    

            // --- Calculate Required Points & GPA ---
            let reqOverallGpaValue: number | null = null;
            let reqMajorGpaValue: number | null = null;
            let isOverallImpossible = false;
            let isMajorImpossible = false;

   // Define placeholders for logging before they are calculated
   let requiredTotalOverallPoints = NaN;
   let requiredSemesterPointsOverall = NaN;
   let requiredTotalMajorPoints = NaN;
   let requiredSemesterPointsMajor = NaN;

            // Overall Calculation
            if (hasOverallTarget) {
                  requiredTotalOverallPoints = targetOverall * finalCumulativeOverallCredits;
                  requiredSemesterPointsOverall = requiredTotalOverallPoints - adjustedBaseOverallPts;

                 if (targetDivisorCreditsOverall > 0) {
                     const gpa = requiredSemesterPointsOverall / targetDivisorCreditsOverall;
                     reqOverallGpaValue = gpa; // Store numerical value
                     if (gpa > 4.0) { isOverallImpossible = true; } // Check only > 4.0
                 }
                 // No specific handling needed here for points needed over 0 credits based on new requirement
            }

             // Major Calculation
             if (hasMajorTarget) {
                  requiredTotalMajorPoints = targetMajor * finalCumulativeMajorCredits;
                  requiredSemesterPointsMajor = requiredTotalMajorPoints - adjustedBaseMajorPts;

                 if (targetDivisorCreditsMajor > 0) {
                     const gpa = requiredSemesterPointsMajor / targetDivisorCreditsMajor;
                     reqMajorGpaValue = gpa; // Store numerical value
                     if (gpa > 4.0) { isMajorImpossible = true; } // Check only > 4.0
                 }
                 // No specific handling needed here for points needed over 0 credits
             }
            
            // --- Format results for display (remain largely the same, use numerical values) ---
             const finalOverallDisplay = reqOverallGpaValue !== null
                 ? `${reqOverallGpaValue.toFixed(3)} (Based on ${targetDivisorCreditsOverall} GPA credits)`
                 : !isNaN(requiredSemesterPointsOverall)
                     ? `${requiredSemesterPointsOverall.toFixed(2)} points needed (over 0 GPA credits)`
                     : 'N/A'; // Fallback if target not set or calculation failed

             const finalMajorDisplay = reqMajorGpaValue !== null
                  ? `${reqMajorGpaValue.toFixed(3)} (Based on ${targetDivisorCreditsMajor} Major GPA credits)`
                  : !isNaN(requiredSemesterPointsMajor)
                      ? `${requiredSemesterPointsMajor.toFixed(2)} points needed (over 0 Major GPA credits)`
                      : 'N/A'; // Fallback

            // Return results object including impossibility flags and final credits
            return {
                overallDisplay: finalOverallDisplay,
                majorDisplay: finalMajorDisplay,
                status: 'calculated',
                isOverallImpossible: isOverallImpossible,
                isMajorImpossible: isMajorImpossible,
                finalCumulativeOverallCredits: finalCumulativeOverallCredits,
                finalCumulativeMajorCredits: finalCumulativeMajorCredits,
            };
            // --- End Calculation Logic ---


                // Define dependencies for the useMemo hook
            }, [
                targetOverallGPAInput,
                targetMajorGPAInput,
                gradeScaleStatus,  // Keep - used for ready check
                gradeScale,        // Keep - used for grade lookups
                plannerCourses,    // Keep - used extensively in calculations
                editableBaseOverallCredits,
                editableBaseOverallPoints,
                editableBaseMajorCredits,
                editableBaseMajorPoints
            ]);
            // --- End Required Semester Info useMemo ---

    // --- Function to Generate Shareable Link ---
    const handleShare = () => {
        // 1. Check if base URL is ready
        if (baseUrlStatus !== 'success' || !baseUrl) {
            alert('Error: Base URL for sharing is not available.');
            return;
        }

        // 2. Gather the state to share
        const stateToShare = {
            bOC: editableBaseOverallCredits,
            bOP: editableBaseOverallPoints,
            bMC: editableBaseMajorCredits,
            bMP: editableBaseMajorPoints,
            planner: plannerCourses,
            tO: targetOverallGPAInput,
            tM: targetMajorGPAInput,
            sId: studentDataSource?.student?.DegStudentNo ?? null,
            bDN: studentDataSource?.student?.Note ?? null, // <<< Add Note to share data (using bDN)
            bDE: isBaseDataExpanded, // Add Base Data Expanded state
            tGE: isTargetGPAExpanded // Add Target GPAs Expanded state
        };

        try {
            // 3. Stringify and encode the state
            const dataString = JSON.stringify(stateToShare);
            const encodedData = encodeURIComponent(dataString);

            // 4. Construct the full URL
            // Determine if we're in production or development
            const currentUrl = window.location.origin;
            const isProduction = !currentUrl.includes('localhost') && !currentUrl.includes('127.0.0.1');
            
            // Use the current URL in production, or the configured baseUrl in development
            const effectiveBaseUrl = isProduction ? currentUrl : baseUrl;
            
            // Ensure baseUrl doesn't already end with a slash or question mark
            const urlSeparator = effectiveBaseUrl.includes('?') ? '&' : '?';
            const shareableLink = `${effectiveBaseUrl}${urlSeparator}data=${encodedData}`;

            // 5. Copy link to clipboard and provide feedback
            navigator.clipboard.writeText(shareableLink)
                .then(() => {
                    console.log('Link copied to clipboard:', shareableLink);
                    setLinkCopied(true); // Set state to true for feedback
                    // Reset feedback after a few seconds
                    setTimeout(() => {
                        setLinkCopied(false);
                    }, 2500); // Reset after 2.5 seconds
                })
                .catch(err => {
                    console.error('Failed to copy link: ', err);
                    // Fallback: Show alert if copy fails
                    alert(`Failed to copy link. You can copy it manually:\n\n${shareableLink}`);
                });

        } catch (error) {
            console.error("Error generating shareable link:", error);
            alert('An error occurred while generating the share link.');
        }
    };
    // --- End Function to Generate Shareable Link ---

    // --- Handler for Loading Selected Student Data (for Advisors) ---
    const handleLoadSelectedStudent = async () => {
        if (!selectedStudentId || !selectedValidStudentId) {
            console.log("No valid student selected. Cannot fetch data.");
            return;
        }

        // Set loading state to true
        setIsLoadingStudent(true);

        // Reset states and set loading state
        setPlannerCourses([]);
        setInitialPlannerState([]);
        setIsPlannerInitialized(false);
        setNextCustomCourseNumber(1);
        setDisplayedStudentId(null);
        setBaseDataNote("Loading selected student data...");
        setEditableBaseOverallCredits('');
        setEditableBaseOverallPoints('');
        setEditableBaseMajorCredits('');
        setEditableBaseMajorPoints('');
        setOriginalBaseData(null);

        try {
            console.log(`Fetching data for student: ${selectedStudentId}`);
            
            // Call the API with the studentId parameter and include override flag if active
            const res = await fetch(`/api/studentdata?studentId=${selectedStudentId}${isOverrideActive ? '&override=true' : ''}`);
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
            }
            
            const data: StudentDataResponse = await res.json();
            console.log("Received selected student data:", data);

            // Update state with the fetched data
            setStudentDataSource(data);
            setAccessType('direct'); // API returns direct access type for selected students
            setIsFromAdvisorMode(true); // Mark that this student was loaded via advisor mode
            setIsOverrideActive(data.isOverride ?? false); // Set override state from API response
            
            // Initialize editable state if student data exists
            if (data.student) {
                const baseData = {
                    overallCredits: data.student.DegCumActualCredits,
                    overallPoints: data.student.DegCumPoints,
                    majorCredits: data.student.DegCumMajorCredits,
                    majorPoints: data.student.DegCumMajorPoints
                };
                
                setEditableBaseOverallCredits(baseData.overallCredits.toString());
                setEditableBaseOverallPoints((baseData.overallPoints ?? 0).toString());
                setEditableBaseMajorCredits(baseData.majorCredits.toString());
                setEditableBaseMajorPoints((baseData.majorPoints ?? 0).toString());
                setOriginalBaseData(baseData);
                setDisplayedStudentId(data.student.DegStudentNo);
                setBaseDataNote(data.student.Note ?? null);
                console.log("Student data initialized for", data.student.DegStudentNo);
            }

            // Initialize planner with the student's registrations
            if (gradeScaleStatus === 'success' && gradeScale.length > 0 && data.registrations) {
                console.log("Initializing planner for selected student with", data.registrations.length, "registrations");
                
                const initialCourses = data.registrations.map((reg, index): PlannerCourse => {
                    const isRepeatValue = reg.Rpeat === 'Yes';
                    const isValidRegGrade = gradeScale.some(gs => gs.Grade === reg.RegGrade);
                    const initialSelectedGrade = isValidRegGrade ? reg.RegGrade : null;
                    const isValidPrevGrade = gradeScale.some(gs => gs.Grade === reg.PrevGrade);
                    const initialPreviousGrade = isRepeatValue && isValidPrevGrade ? reg.PrevGrade : null;
                    
                    return {
                        id: `${reg.CatalogKey}-${index}-${Date.now()}`,
                        catalogKey: reg.CatalogKey,
                        credits: reg.Credits,
                        selectedGrade: initialSelectedGrade,
                        isMajor: reg.MajorCourse === 'Yes',
                        isRepeat: isRepeatValue,
                        previousGrade: initialPreviousGrade,
                        originalCourseWasMajor: null,
                    };
                });
                
                setPlannerCourses(initialCourses);
                setInitialPlannerState(initialCourses);
                setIsPlannerInitialized(true);
                console.log("Planner initialized for selected student");
                             } else {
                console.log("Could not initialize planner: grade scale not ready or no registrations");
                setPlannerCourses([]);
                setInitialPlannerState([]);
                setIsPlannerInitialized(true); // Still mark as initialized to prevent infinite loops
            }
            
            // Reset target GPA values to 2.0 when a student is selected
            setTargetOverallGPAInput('2.0');
            setTargetMajorGPAInput('2.0');
        } catch (error: any) {
            console.error("Error fetching selected student data:", error);
            setBaseDataNote(`Error: ${error.message || "Failed to load student data"}`);
            
            // Reset to empty state on error
            setPlannerCourses([]);
            setInitialPlannerState([]);
            setIsPlannerInitialized(true);
                                  setEditableBaseOverallCredits('0');
                                  setEditableBaseOverallPoints('0');
                                  setEditableBaseMajorCredits('0');
                                  setEditableBaseMajorPoints('0');
            setOriginalBaseData({ overallCredits: 0, overallPoints: 0, majorCredits: 0, majorPoints: 0 });
        } finally {
            // Always set loading state to false when done
            setIsLoadingStudent(false);
        }
    };
    // --- End Handler for Loading Selected Student Data ---

    // Enhance the handleStudentIdChange function to better handle potentially large advisee lists
    const handleStudentIdChange = (input: string) => {
        setStudentIdInput(input);
        setSelectedValidStudentId(false);
        
        if (!input) {
            setFilteredAdvisees([]);
            setShowSuggestions(false);
            setSelectedStudentId(null);
            return;
        }
        
        // Show suggestions only if we have advisees and input is not empty
        if (advisees && advisees.length > 0) {
            // Filter by student ID only
            const filtered = advisees.filter(advisee => 
                advisee.studentId.toLowerCase().includes(input.toLowerCase())
            );
            
            // Sort results: exact matches first, then starts with, then contains
            filtered.sort((a, b) => {
                const aIdMatch = a.studentId.toLowerCase() === input.toLowerCase() ? 0 :
                              a.studentId.toLowerCase().startsWith(input.toLowerCase()) ? 1 : 2;
                const bIdMatch = b.studentId.toLowerCase() === input.toLowerCase() ? 0 :
                              b.studentId.toLowerCase().startsWith(input.toLowerCase()) ? 1 : 2;
                
                return aIdMatch - bIdMatch;
            });
            
            // Limit to first 10 matches for better performance
            const limitedResults = filtered.slice(0, 10);
            setFilteredAdvisees(limitedResults);
            setShowSuggestions(limitedResults.length > 0);
        } else {
            setFilteredAdvisees([]);
            setShowSuggestions(false);
        }
    };
    
    // Handle student selection from suggestions
    const handleSelectStudent = (studentId: string) => {
        setSelectedStudentId(studentId);
        setStudentIdInput(studentId);
        setShowSuggestions(false);
        setSelectedValidStudentId(true);
    };

    // --- Conditional Rendering based on Auth Status ---
    if (status === "loading") {
        return <div className="flex justify-center items-center min-h-screen text-gray-700">Loading...</div>;
    }

    // Redirect to sign in ONLY if no session AND it's NOT a share link
    if (!session && !isShareLink) {
                 return (
            <div className="flex flex-col justify-center items-center min-h-screen p-4 bg-gray-100">
                 <img 
                    src="/registrarbanner.png" 
                    alt="Bethlehem University Logo" 
                    className="h-16 md:h-20 object-contain mb-8"
                />
                <h1 className="text-2xl md:text-3xl font-bold mb-4 text-bu-blue text-center">Bethlehem University GPA Calculator</h1>
                <p className="mb-8 text-gray-700 text-center">Please sign in with your @bethlehem.edu account.</p>
                <button
                    onClick={() => signIn("google")}
                    className="px-8 py-3 text-white rounded hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-bu-blue focus:ring-offset-2 text-lg font-medium"
                    style={{ backgroundColor: '#003366' }}
                >
                    Sign In with Google
                         </button>
                    </div>
        );
    }

    // Add this function for sign out
    const handleSignOut = async () => {
        await signOut({ callbackUrl: "/" });
        router.push('/');
    };

    // Add a new function to handle starting a blank calculator
    const handleStartBlankCalculator = () => {
        console.log("Starting blank calculator");
        
        // Mark loading state
        setIsLoadingStudent(true);
        
        try {
            // Reset all editable fields
            setEditableBaseOverallCredits('0');
            setEditableBaseOverallPoints('0');
            setEditableBaseMajorCredits('0');
            setEditableBaseMajorPoints('0');
            
            // Initialize base data
            const baseData = {
                overallCredits: 0,
                overallPoints: 0,
                majorCredits: 0,
                majorPoints: 0
            };
            
            setOriginalBaseData(baseData);
            
            // Set student info
            setDisplayedStudentId('Blank Calculator');
            setBaseDataNote('Using blank calculator with no pre-loaded student data.');
            
            // Create a default student record
            const defaultStudentRecord: StudentRecord = {
                DegStudentNo: 'Blank Calculator',
                Email: session?.user?.email || 'Unknown',
                DegCumActualCredits: 0,
                DegCumPoints: 0,
                DegCumMajorCredits: 0,
                DegCumMajorPoints: 0,
                Note: "Using blank calculator with no pre-loaded student data."
            };
            
            // Create default data source with minimal properties
            setStudentDataSource({
                accessType: 'direct',
                student: defaultStudentRecord,
                registrations: [],
                isOverride: false
            });
            
            // Update app state
            setAccessType('direct');
            setIsFromAdvisorMode(true);
            
            // Initialize empty planner
            setPlannerCourses([]);
            setInitialPlannerState([]);
            setIsPlannerInitialized(true);
            
            // Reset target GPA values to 2.0 for blank calculator
            setTargetOverallGPAInput('2.0');
            setTargetMajorGPAInput('2.0');
            
            console.log("Blank calculator initialized successfully");
        } catch (error) {
            console.error("Error initializing blank calculator:", error);
        } finally {
            // Always end loading state
            setIsLoadingStudent(false);
        }
    };

    // --- Main Authenticated View: Layout Fix for Footer ---
    return (
        // Flex column, min screen height
        <div className="flex flex-col min-h-screen text-base">
            {/* Add print styles */}
            <style jsx global>{`
                /* Print-specific styles */
                @media print {
                    /* Hide screen-only elements */
                    .screen-only {
                        display: none !important;
                    }
                    
                    /* Show print-only elements */
                    .print-only {
                        display: block !important;
                    }
                    
                    /* Basic page setup */
                    body {
                        font-family: sans-serif;
                        font-size: 9pt;
                        line-height: 1.3;
                        color: black;
                        background: white;
                        margin: 0; /* Remove default body margin */
                    }
                    
                    @page {
                        size: A4;
                        margin: 1cm;
                    }
                    
                    /* Print Header */
                    .print-header {
                        display: flex !important;
                        align-items: center !important;
                        justify-content: space-between !important;
                        margin-bottom: 0.5cm !important;
                        padding-bottom: 0.2cm !important;
                        border-bottom: 1px solid #ccc !important;
                    }
                    
                    .print-logo {
                        height: 1.5cm !important; /* Adjust height as needed */
                        width: auto !important;
                        flex-shrink: 0;
                    }
                    
                    .print-title-container {
                        flex-grow: 1 !important;
                        text-align: center !important;
                    }
                    
                    .print-main-title {
                        font-size: 12pt !important;
                        font-weight: bold !important;
                    }
                    
                    .print-student-id {
                        font-size: 10pt !important;
                        font-weight: bold !important;
                        margin-top: 0.1cm !important;
                    }
                    
                    .print-logo-placeholder {
                        width: 1.5cm; /* Match logo width or adjust for balance */
                        height: 1.5cm;
                        flex-shrink: 0;
                    }
                    
                    /* Three-column layout */
                    .print-columns {
                        display: flex !important;
                        justify-content: space-between !important;
                        width: 100% !important;
                        margin-bottom: 0.5cm !important;
                        border-bottom: 1px solid #ccc !important;
                        padding-bottom: 0.3cm !important;
                    }
                    
                    .print-column {
                        width: 31% !important; /* Adjust spacing if needed */
                    }
                    
                    .print-section-heading {
                        font-size: 10pt !important;
                        font-weight: bold !important;
                        margin-bottom: 0.2cm !important;
                        padding-bottom: 0.1cm !important;
                        border-bottom: 1px solid black !important;
                    }
                    
                    .print-row {
                        display: flex !important;
                        justify-content: space-between !important;
                        margin-bottom: 0.1cm !important;
                    }
                    
                    .print-label {
                        padding-right: 0.5cm !important;
                    }
                    
                    .print-value {
                        font-weight: bold !important;
                        text-align: right !important;
                    }
                    
                    .print-based-on {
                        font-size: 7pt !important;
                        font-style: italic !important;
                        justify-content: flex-start !important; /* Align left */
                        margin-top: 0.1cm !important;
                    }
                    
                    /* Course list styling (Placeholder) */
                    .print-courses {
                        margin-top: 0.5cm !important;
                    }
                    
                    .print-courses-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        font-size: 8pt !important;
                    }
                    
                    .print-courses-th {
                        background-color: #f0f0f0 !important;
                        border: 1px solid #ddd !important;
                        padding: 0.1cm 0.15cm !important;
                        text-align: left !important;
                        font-weight: bold !important;
                    }
                    
                    .print-courses-td {
                        border: 1px solid #ddd !important;
                        padding: 0.1cm 0.15cm !important;
                        text-align: left !important;
                    }
                    
                    .print-courses-td.text-center {
                        text-align: center !important;
                    }
                    
                    .print-courses-td.italic {
                        font-style: italic !important;
                        color: #666 !important;
                    }
                    
                    /* Footer */
                    .print-footer {
                        margin-top: 0.5cm !important;
                        border-top: 1px solid #ccc !important;
                        padding-top: 0.2cm !important;
                    }
                }
            `}</style>

            {/* Print-specific layout that only shows when printing */}
            <div className="hidden print-only">
                {/* Print Header */}
                <div className="print-header">
                    <img src="/registrarbanner.png" alt="Bethlehem University Logo" className="print-logo" />
                    <div className="print-title-container">
                        <div className="print-main-title">Bethlehem University GPA Calculator</div>
                        {displayedStudentId && <div className="print-student-id">Student ID: {displayedStudentId}</div>}
                    </div>
                    {/* Add a placeholder div to balance the flex layout if needed, or adjust justify-content */}
                    <div className="print-logo-placeholder"></div> 
                </div>

                {/* Three-column layout for the main data sections */}
                <div className="print-columns">
                    {/* Column 1: Base Cumulative Data */}
                    <div className="print-column">
                        <div className="print-section-heading">Base Cumulative Data</div>
                        <div className="print-row">
                            <span className="print-label">Overall Credits:</span>
                            <span className="print-value">{editableBaseOverallCredits}</span>
                        </div>
                        <div className="print-row">
                            <span className="print-label">Overall Points:</span>
                            <span className="print-value">{editableBaseOverallPoints}</span>
                        </div>
                        <div className="print-row">
                            <span className="print-label">Overall GPA:</span>
                            <span className="print-value">{/* Apply Points/10 logic */}
                                {calculateGPA(parseFloat(editableBaseOverallPoints) || 0, parseInt(editableBaseOverallCredits, 10) || 0)}
                            </span>
                        </div>
                        <div className="print-row">
                            <span className="print-label">Major Credits:</span>
                            <span className="print-value">{editableBaseMajorCredits}</span>
                        </div>
                        <div className="print-row">
                            <span className="print-label">Major Points:</span>
                            <span className="print-value">{editableBaseMajorPoints}</span>
                        </div>
                        <div className="print-row">
                            <span className="print-label">Major GPA:</span>
                            <span className="print-value">{/* Apply Points/10 logic */}
                                {calculateGPA(parseFloat(editableBaseMajorPoints) || 0, parseInt(editableBaseMajorCredits, 10) || 0)}
                            </span>
                        </div>
                    </div>
                    
                    {/* Column 2: Projected Results */}
                    <div className="print-column">
                        <div className="print-section-heading">Projected Results</div>
                        <div className="print-row">
                            <span className="print-label">Semester Overall GPA:</span>
                            <span className="print-value">{semesterGPAInfo.status === 'calculated' ? semesterGPAInfo.overallGPA : 'N/A'}</span>
                        </div>
                        <div className="print-row">
                            <span className="print-label">Semester Credits:</span>
                            <span className="print-value">{semesterGPAInfo.status === 'calculated' ? semesterGPAInfo.overallCredits : '0'}</span>
                        </div>
                        <div className="print-row">
                            <span className="print-label">Semester Major GPA:</span>
                            <span className="print-value">{semesterGPAInfo.status === 'calculated' ? semesterGPAInfo.majorGPA : 'N/A'}</span>
                        </div>
                        <div className="print-row">
                            <span className="print-label">Semester Major Credits:</span>
                            <span className="print-value">{semesterGPAInfo.status === 'calculated' ? semesterGPAInfo.majorCredits : '0'}</span>
                        </div>
                        <div className="print-row">
                            <span className="print-label">Projected Overall GPA:</span>
                            <span className="print-value">{/* Add Credits */}
                                {projectedGPAInfo.status === 'calculated' 
                                    ? `${projectedGPAInfo.overallGPA} (${projectedGPAInfo.finalOverallCredits} credits)` 
                                    : 'N/A'}
                            </span>
                        </div>
                        <div className="print-row">
                            <span className="print-label">Projected Major GPA:</span>
                            <span className="print-value">{/* Add Credits */}
                                 {projectedGPAInfo.status === 'calculated' 
                                    ? `${projectedGPAInfo.majorGPA} (${projectedGPAInfo.finalMajorCredits} credits)` 
                                    : 'N/A'}
                            </span>
                        </div>
                    </div>
                    
                    {/* Column 3: Target GPAs */}
                    <div className="print-column">
                        <div className="print-section-heading">Target GPAs</div>
                        <div className="print-row">
                            <span className="print-label">Target Overall GPA:</span>
                            <span className="print-value">{targetOverallGPAInput}</span>
                        </div>
                        <div className="print-row">
                            <span className="print-label">Target Major GPA:</span>
                            <span className="print-value">{targetMajorGPAInput}</span>
                        </div>
                        
                        {/* Required Semester GPA Sub-section */}
                        <div style={{ marginTop: "0.5cm" }}> 
                            <div className="print-section-heading">Required Semester GPA</div>
                            <div className="print-row">
                                <span className="print-label">Overall:</span>
                                {/* Use requiredSemesterInfo for display */}
                                <span className="print-value">{requiredSemesterInfo.overallDisplay}</span> 
                            </div>
                            <div className="print-row">
                                <span className="print-label">Major:</span>
                                 {/* Use requiredSemesterInfo for display */}
                                <span className="print-value">{requiredSemesterInfo.majorDisplay}</span>
                            </div>
                            {projectedGPAInfo.status === 'calculated' && (
                                <div className="print-row print-based-on">
                                    {/* Note: This 'Based on' refers to the credits used for *target* calculation, which are already included in the overall/major display strings from requiredSemesterInfo */}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Course list placeholder (to be added later) */}
                <div className="hidden print-courses print-only">
                    <div className="print-section-heading">Course Planner</div>
                    <table className="print-courses-table">
                         <thead>
                             <tr>
                                <th className="print-courses-th">COURSE</th>
                                <th className="print-courses-th">CREDITS</th>
                                <th className="print-courses-th">GRADE</th>
                                <th className="print-courses-th">MAJOR?</th>
                                <th className="print-courses-th">REPEAT?</th>
                                <th className="print-courses-th">PREV.GRADE</th>
                             </tr>
                         </thead>
                         <tbody>
                            {plannerCourses.map(course => (
                                <tr key={`print-course-${course.id}`}>
                                    <td className="print-courses-td">{course.catalogKey}</td>
                                    <td className="print-courses-td">{course.credits}</td>
                                    <td className="print-courses-td">{course.selectedGrade || '-'}</td>
                                    <td className="print-courses-td">{course.isMajor ? 'Yes' : 'No'}</td>
                                    <td className="print-courses-td">{course.isRepeat ? 'Yes' : 'No'}</td>
                                    <td className="print-courses-td">{course.isRepeat ? (course.previousGrade || '-') : '-'}</td>
                                     </tr>
                            ))}
                            {plannerCourses.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="print-courses-td text-center italic">No courses in planner.</td>
                                </tr>
                            )}
                         </tbody>
                     </table>
                </div>

                {/* Footer with disclaimer and timestamp */}
                <div className="hidden print-footer print-only">
                    <div className="print-disclaimer">{disclaimerText}</div>
                    <div className="print-timestamp">Printed on: {formatDate(new Date())}</div>
                </div>
            </div>

            {/* Regular Page Content (Remains unchanged) */}
            <div className="screen-only">
                {/* Header: Add padding */}
                <header className="flex justify-between items-center mb-6 pb-4 border-b p-4">
                    <div className="flex items-center space-x-3">
                        <img 
                            src="/registrarbanner.png" 
                            alt="Bethlehem University Logo" 
                            className="h-10 md:h-12 object-contain"
                        />
                        <h1 className="text-xl md:text-2xl font-semibold text-bu-blue">
                            GPA Calculator 
                            {/* Conditionally add student ID ONLY if it's not 'Not Found' */}
                            {(displayedStudentId && displayedStudentId !== 'Not Found') ? `for ${displayedStudentId}` : ''}
                        </h1> 
                 </div>
                    {/* --- Update Top Right Display Logic --- */}
                    <div className="flex items-center space-x-4">
                      {/* Display the override target email when override mode is active */}
                      {isOverrideActive && studentDataSource?.overrideTargetEmail && (
                        <span className="text-sm text-red-600 font-medium hidden md:block">
                          {studentDataSource.overrideTargetEmail} (Override)
                        </span>
                      )}
                      {/* Display Session Email if session exists AND override is NOT active */}
                      {!isOverrideActive && session?.user?.email && (
                          <span className="text-sm text-gray-600 hidden md:block">{session.user.email}</span>
                      )}
                      {/* Display Sign Out Button if session exists (regardless of override) */}
                      {session && (
                          <SignOutButton />
                     )}
                 </div>
                    {/* --- End Update --- */}
                </header>

                {/* Main Content Area */}
                <main className="flex flex-col flex-grow p-4">
                    {accessType === 'loading' && (
                        <div className="flex justify-center items-center h-full text-gray-600">Loading access data...</div>
                    )}

                    {accessType === 'none' && (
                        <div className="flex flex-col justify-center items-center h-full text-center">
                            <h2 className="text-xl font-semibold text-red-600 mb-4">Access Denied</h2>
                            <p className="text-gray-700">Student data not found for the current user, or access is not permitted.</p>
                            {/* Optionally add more info or contact details here */}
                </div>
            )}

                    {accessType === 'advisor' && (
                        <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow-md bg-white">
                            <h2 className="text-xl font-medium text-bu-blue mb-4">Select Student</h2>
                            <p className="text-sm text-gray-600 mb-4">Start typing a student ID to see matching students.</p>
                            <div className="space-y-3">
                                <div className="relative">
                                    <label htmlFor="advisee-input" className="block text-sm font-medium text-gray-700 mb-1">Search:</label>
                     <input
                                        id="advisee-input"
                                        type="text"
                                        value={studentIdInput}
                                        onChange={(e) => handleStudentIdChange(e.target.value)}
                                        placeholder="Enter student ID"
                                        className="w-full p-2 border rounded focus:ring-bu-blue focus:border-bu-blue"
                                        onClick={() => setShowSuggestions(studentIdInput.length > 0 && filteredAdvisees.length > 0)}
                                    />
                                    
                                    {showSuggestions && (
                                        <ul className="absolute z-10 w-full bg-white border rounded-b mt-1 max-h-60 overflow-auto shadow-md">
                                            {filteredAdvisees.map((advisee, index) => (
                                                <li 
                                                    key={`${advisee.studentId}-${index}`}
                                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                                    onClick={() => handleSelectStudent(advisee.studentId)}
                                                >
                                                    {advisee.studentId}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
             </div>
                                <button
                                    onClick={handleLoadSelectedStudent}
                                    disabled={!selectedValidStudentId || isLoadingStudent}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoadingStudent ? (
                                        <div className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Loading Student Data...
             </div>
                                    ) : (
                                        "Load Student Data"
                                    )}
                                </button>
                                
                                {/* Add a divider */}
                                <div className="flex items-center my-2">
                                    <div className="flex-grow border-t border-gray-300"></div>
                                    <span className="mx-2 text-xs text-gray-500">OR</span>
                                    <div className="flex-grow border-t border-gray-300"></div>
                                </div>
                                
                                {/* Add the "Start with Blank Calculator" button */}
                                <button
                                    onClick={handleStartBlankCalculator}
                                    disabled={isLoadingStudent}
                                    className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Start with Blank Calculator
                                </button>
                                
                                {advisees && advisees.length > 0 && (
                                    <p className="text-xs text-gray-500 text-center">
                                        {advisees.length} students available. Search to find the one you need.
                                    </p>
                                )}
                            </div>
                 </div>
             )}
                    
                    {accessType === 'direct' && (
                        // Calculator content - two-column layout 
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Left Column */}
                            <section className="lg:w-1/3 space-y-6">
                                {/* Select Another Student Link */}
                                {isFromAdvisorMode && (
                                    <div className="mb-2">
                                        <button 
                                            onClick={() => {
                                                setAccessType('advisor');
                                                setIsFromAdvisorMode(false);
                                            }}
                                            className="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                            </svg>
                                            Select Another Student
                                        </button>
                                    </div>
                                )}
                            
                                {/* Base Data Section */}
                                <div className="p-3 rounded-lg border bg-gray-100 shadow-sm space-y-2 text-xs">
                                    {/* Update Header to include Note */}
                                    <h2 
                                        className="text-md font-medium text-bu-blue border-b pb-1 mb-2 flex justify-between items-center cursor-pointer" 
                                        onClick={() => setIsBaseDataExpanded(!isBaseDataExpanded)}
                                        title={`Click to ${isBaseDataExpanded ? 'collapse' : 'expand'} Base Cumulative Data (${isMobileView ? 'Mobile view' : 'Desktop view'})`}
                                    >
                                        <span>Base Cumulative Data {baseDataNote ? `(${baseDataNote})` : ''}</span>
                                        <span className="text-gray-500">{isBaseDataExpanded ? '▲' : '▼'}</span>
                                    </h2>
                                    
                                    {isBaseDataExpanded && (
                                    <>
                                     {/* Current GPA Display */}
                                    <div className="flex justify-between items-center text-gray-700 font-medium">
                                         <span>Current Overall GPA:</span>
                                         <span>{calculateGPA(parseFloat(editableBaseOverallPoints) || 0, parseInt(editableBaseOverallCredits, 10) || 0)}</span>
                                    </div>
                                     <div className="flex justify-between items-center text-gray-700 font-medium mb-2">
                                         <span>Current Major GPA:</span>
                                         <span>{calculateGPA(parseFloat(editableBaseMajorPoints) || 0, parseInt(editableBaseMajorCredits, 10) || 0)}</span>
                                    </div>
                                     {/* Inputs */}
                                      <div className="flex justify-between items-center text-gray-900">
                                      <label htmlFor="base-overall-credits">Overall Credits:</label>
                                      <input 
                                        type="number" 
                                        id="base-overall-credits"
                                        name="base-overall-credits"
                                        value={editableBaseOverallCredits} 
                                        onChange={e => setEditableBaseOverallCredits(e.target.value)} 
                                        className="p-1 border rounded w-24 focus:ring-bu-blue focus:border-bu-blue" 
                                      />
                                    </div>
                                     <div className="flex justify-between items-center text-gray-900">
                                      <label htmlFor="base-overall-points">Overall Points:</label>
                                      <input 
                                        type="number" 
                                        id="base-overall-points"
                                        name="base-overall-points"
                                        value={editableBaseOverallPoints} 
                                        onChange={e => setEditableBaseOverallPoints(e.target.value)} 
                                        className="p-1 border rounded w-24 focus:ring-bu-blue focus:border-bu-blue" 
                                      />
                                    </div>
                                     <div className="flex justify-between items-center text-gray-900">
                                       <label htmlFor="base-major-credits">Major Credits:</label>
                                       <input 
                                        type="number" 
                                        id="base-major-credits"
                                        name="base-major-credits"
                                        value={editableBaseMajorCredits} 
                                        onChange={e => setEditableBaseMajorCredits(e.target.value)} 
                                        className="p-1 border rounded w-24 focus:ring-bu-blue focus:border-bu-blue" 
                                       />
                                    </div>
                                     <div className="flex justify-between items-center text-gray-900">
                                      <label htmlFor="base-major-points">Major Points:</label>
                                      <input 
                                        type="number" 
                                        id="base-major-points"
                                        name="base-major-points"
                                        value={editableBaseMajorPoints} 
                                        onChange={e => setEditableBaseMajorPoints(e.target.value)} 
                                        className="p-1 border rounded w-24 focus:ring-bu-blue focus:border-bu-blue" 
                                      />
                                    </div>
                                     {/* Reset Button and Note - Aligned Horizontally */}
                                     <div className="flex pt-2">
                                        <p className="text-xs text-gray-500">Edit only if official data seems incorrect.</p>
                                    </div>
                                    </>
                                    )}
                                </div>

                                {/* Target Inputs Section - Use GpaDisplay for required */}
                                <div className="p-3 rounded-lg border bg-gray-100 shadow-sm space-y-2 text-xs">
                                    <h2 
                                        className="text-md font-medium text-bu-blue border-b pb-1 mb-2 flex justify-between items-center cursor-pointer"
                                        onClick={() => setIsTargetGPAExpanded(!isTargetGPAExpanded)}
                                        title={`Click to ${isTargetGPAExpanded ? 'collapse' : 'expand'} Target GPAs (${isMobileView ? 'Mobile view' : 'Desktop view'})`}
                                    >
                                        <span>
                                            Set Target GPAs
                                            {!isTargetGPAExpanded && (
                                                <span className="text-xs font-normal ml-1 text-gray-600">
                                                    (CUM: {(parseFloat(targetOverallGPAInput) || 0).toFixed(2)}, Major: {(parseFloat(targetMajorGPAInput) || 0).toFixed(2)})
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-gray-500">{isTargetGPAExpanded ? '▲' : '▼'}</span>
                                    </h2>
                                    
                                    {isTargetGPAExpanded && (
                                    <>
                                    <div className="flex justify-between items-center text-gray-900">
                                        <label htmlFor="targetOverall">Target Overall Cumulative GPA:</label>
                                        <input
                                            type="number"
                                            id="targetOverall"
                                            value={targetOverallGPAInput}
                                            onChange={(e) => setTargetOverallGPAInput(e.target.value)}
                                            className="p-1 border rounded w-24 focus:ring-bu-blue focus:border-bu-blue"
                                            step="0.01" min="0" max="4"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-gray-900">
                                        <label htmlFor="targetMajor">Target Major Cumulative GPA:</label>
                                        <input
                                            type="number"
                                            id="targetMajor"
                                            value={targetMajorGPAInput}
                                            onChange={(e) => setTargetMajorGPAInput(e.target.value)}
                                            className="p-1 border rounded w-24 focus:ring-bu-blue focus:border-bu-blue"
                                            step="0.01" min="0" max="4"
                                        />
                                    </div>
                                    <div className="pt-3 mt-3 border-t">
                                         <h3 className="text-md font-medium text-bu-blue mb-1">Required Semester GPA</h3>
                                         <GpaDisplay 
                                           label="Overall"
                                           value={requiredSemesterInfo.overallDisplay}
                                           containerClassName={requiredSemesterInfo.isOverallImpossible ? 'text-red-600' : 'text-gray-900'}
                                           valueClassName={requiredSemesterInfo.isOverallImpossible ? 'font-bold' : 'font-medium'}
                                          />
                                          <GpaDisplay 
                                           label="Major"
                                           value={requiredSemesterInfo.majorDisplay}
                                           containerClassName={requiredSemesterInfo.isMajorImpossible ? 'text-red-600' : 'text-gray-900'}
                                           valueClassName={requiredSemesterInfo.isMajorImpossible ? 'font-bold' : 'font-medium'}
                                          />
                                          <p className="text-xs text-gray-600 mt-2">
                                            (Based on {requiredSemesterInfo.finalCumulativeOverallCredits?.toFixed(1) ?? 0} final overall credits
                                            and {requiredSemesterInfo.finalCumulativeMajorCredits?.toFixed(1) ?? 0} final major credits)
                                          </p>
                                    </div>
                                    </>
                                    )}
                                </div>
                            </section>

                            {/* Right Column */}
                            <section className="lg:w-2/3 space-y-3">
                                 {/* Planner Controls Section */}
                                <div className="flex justify-between items-center mb-2">
                                    <div>
                                        <button
                                            onClick={handleAddCourse}
                                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold"
                                        >
                                            Add Course
                                        </button>
                                    </div>
                                    <div className="flex space-x-1">
                                        <button
                                            onClick={handleResetBaseData}
                                            className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs font-semibold"
                                        >Reset</button>
                                        {/* Print Button */}
                                        <button
                                            onClick={handlePrint}
                                            className="px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs font-semibold flex items-center"
                                        >
                                            <span className="mr-1">🖨️</span> Print
                                        </button>
                                        {/* PDF Button */}
                                        <button
                                            onClick={handleGeneratePDF}
                                            className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-semibold flex items-center"
                                        >
                                            <FaFilePdf className="mr-1" /> PDF
                                        </button>
                                        {/* Share Button */}
                                        <button
                                            onClick={handleShare}
                                            disabled={baseUrlStatus !== 'success' || !baseUrl}
                                            className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed relative min-w-[70px] text-center"
                                        >
                                            {/* Show "Copied!" temporarily */}
                                            <span className={`transition-opacity duration-300 ${linkCopied ? 'opacity-0' : 'opacity-100'}`}>Share</span>
                                            <span className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${linkCopied ? 'opacity-100' : 'opacity-0'}`}>Copied!</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Course Planner List/Table: Minimal styling */}
                                <div className="p-2 rounded-lg border bg-white shadow-sm">
                                    {/* Mobile: Card List - HIDDEN in favor of our new compact version */}
                                    <div className="hidden">
                                       {plannerCourses.length > 0 ? plannerCourses.map(course => (
                                           <div key={course.id} className="border rounded p-2 space-y-1">
                                               <div className="flex justify-between items-center">
                                                 {/* Mobile CatalogKey Input */}
                                                 <input type="text" value={course.catalogKey} onChange={e => handlePlannerChange(course.id, 'catalogKey', e.target.value)} placeholder="Course ID" className="p-1 border rounded w-32 mr-2 focus:ring-bu-blue focus:border-bu-blue text-xs font-medium" maxLength={10} />
                                                 <button 
                                                    onClick={() => handleRemoveCourse(course.id)} 
                                                    className="p-1 bg-red-50 border border-red-200 rounded-full text-red-500 hover:text-red-700 hover:bg-red-100 flex-shrink-0 transition-all duration-200 hover:scale-110" 
                                                    title="Remove course"
                                                 >
                                                    🗑️
                                                 </button>
                                               </div>
                                                <div className="flex items-center space-x-2">
                                                   <label className="text-xs w-14">Credits:</label>
                                                   <input 
                                                    type="number" 
                                                    name={`course-credits-${course.id}`}
                                                    id={`course-credits-${course.id}`}
                                                    value={course.credits} 
                                                    onChange={e => handlePlannerChange(course.id, 'credits', parseInt(e.target.value) || 0)} 
                                                    className="p-2 border rounded w-12 focus:ring-bu-blue focus:border-bu-blue text-sm" 
                                                    min="0"
                                                    max="99"
                                                />
                                                <GradeSelector
                                                    id={`grade-select-mobile-${course.id}`}
                                                    value={course.selectedGrade}
                                                    onChange={(newGrade) => handlePlannerChange(course.id, 'selectedGrade', newGrade)}
                                                    gradeScale={gradeScale}
                                                    className="w-20 text-sm"
                                                />
                                               </div>
                                                <div className="flex items-center space-x-4 text-xs">
                                                   <label className="flex items-center">
                                                     <input type="checkbox" checked={course.isMajor} onChange={e => handlePlannerChange(course.id, 'isMajor', e.target.checked)} className="h-3 w-3 text-bu-blue border-gray-300 rounded focus:ring-bu-blue mr-1" />
                                                     Major?
                                                   </label>
                                                    <label className="flex items-center">
                                                     <input type="checkbox" checked={course.isRepeat} onChange={e => handlePlannerChange(course.id, 'isRepeat', e.target.checked)} className="h-3 w-3 text-bu-blue border-gray-300 rounded focus:ring-bu-blue mr-1" />
                                                     Repeat?
                                                   </label>
                                                </div>
                                                
                                                {/* Conditionally render Previous Grade Selector */}
                                                {course.isRepeat && (
                                                    <div className="flex items-center mt-2">
                                                        <span className="text-sm mr-2">Prev:</span>
                                                        <PrevGradeSelector 
                                                            id={`prev-grade-select-mobile-${course.id}`}
                                                            value={course.previousGrade}
                                                            onChange={(newPrevGrade) => handlePlannerChange(course.id, 'previousGrade', newPrevGrade)}
                                                            gradeScale={gradeScale}
                                                            className="w-24 text-sm"
                                                        />
                                                    </div>
                                                )}
                                               </div>
                                            )) : <p className="text-gray-500 text-center py-2 text-xs">No courses loaded or added yet.</p>}
                                    </div>

                                    {/* Desktop: Table */}
                                     <div className="hidden md:block overflow-x-auto">
                                        <table className="min-w-full divide-y">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-2 py-1 text-left text-xs font-medium uppercase tracking-wider">
                                                        <label htmlFor="desk-course-id-header">Course</label>
                                                    </th>
                                                    <th className="px-2 py-1 text-left text-xs font-medium uppercase tracking-wider">
                                                        <label htmlFor="desk-course-credits-header">Credits</label>
                                                    </th>
                                                    <th className="px-2 py-1 text-left text-xs font-medium uppercase tracking-wider">
                                                        <label htmlFor="desk-grade-header">Grade</label>
                                                    </th>
                                                     <th className="px-2 py-1 text-center text-xs font-medium uppercase tracking-wider">
                                                        <label htmlFor="desk-major-header">Major?</label>
                                                     </th>
                                                     <th className="px-2 py-1 text-center text-xs font-medium uppercase tracking-wider">
                                                        <label htmlFor="desk-repeat-header">Repeat?</label>
                                                     </th>
                                                     <th className="px-2 py-1 text-left text-xs font-medium uppercase tracking-wider">
                                                        <label htmlFor="desk-prev-header">Prev</label>
                                                     </th>
                                                    <th className="px-2 py-1 text-left text-xs font-medium uppercase tracking-wider"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y text-xs">
                                                {plannerCourses.length > 0 ? plannerCourses.map(course => (
                                                    <tr key={course.id}>
                                                        <td className="px-2 py-1 whitespace-nowrap">
                                                            {/* Desktop CatalogKey Input */}
                                                            <input 
                                                                type="text" 
                                                                name={`desk-course-id-${course.id}`}
                                                                id={`desk-course-id-${course.id}`}
                                                                value={course.catalogKey} 
                                                                onChange={e => handlePlannerChange(course.id, 'catalogKey', e.target.value)} 
                                                                placeholder="Course ID" 
                                                                className="p-1 border rounded w-24 focus:ring-bu-blue focus:border-bu-blue text-xs" 
                                                                maxLength={10} 
                                                            />
                                                        </td>
                                                        <td className="px-2 py-1 whitespace-nowrap">
                                                            <input 
                                                                type="number" 
                                                                name={`desk-course-credits-${course.id}`}
                                                                id={`desk-course-credits-${course.id}`}
                                                                value={course.credits} 
                                                                onChange={e => handlePlannerChange(course.id, 'credits', parseInt(e.target.value) || 0)} 
                                                                className="p-1 border rounded w-12 focus:ring-bu-blue focus:border-bu-blue text-xs" 
                                                                min="0" 
                                                                max="99" 
                                                            />
                                                        </td>
                                                        <td className="px-2 py-1 whitespace-nowrap">
                                                             <GradeSelector
                                                                 id={`desk-grade-select-${course.id}`}
                                                                 value={course.selectedGrade}
                                                                 onChange={(newGrade) => handlePlannerChange(course.id, 'selectedGrade', newGrade)}
                                                                 gradeScale={gradeScale}
                                                                 className="w-16 text-xs"
                                                             />
                                                        </td>
                                                        <td className="px-2 py-1 whitespace-nowrap text-center">
                                                            <input 
                                                                type="checkbox" 
                                                                name={`desk-course-major-${course.id}`}
                                                                id={`desk-course-major-${course.id}`}
                                                                checked={course.isMajor} 
                                                                onChange={e => handlePlannerChange(course.id, 'isMajor', e.target.checked)} 
                                                                className="h-3 w-3 text-bu-blue border-gray-300 rounded focus:ring-bu-blue" 
                                                            />
                                                        </td>
                                                        <td className="px-2 py-1 whitespace-nowrap text-center">
                                                            <input 
                                                                type="checkbox" 
                                                                name={`desk-course-repeat-${course.id}`}
                                                                id={`desk-course-repeat-${course.id}`}
                                                                checked={course.isRepeat} 
                                                                onChange={e => handlePlannerChange(course.id, 'isRepeat', e.target.checked)} 
                                                                className="h-3 w-3 text-bu-blue border-gray-300 rounded focus:ring-bu-blue" 
                                                            />
                                                        </td>
                                                         {/* Previous Grade Column */}
                                                         <td className="px-2 py-1 whitespace-nowrap">
                                                            {/* Conditionally render Previous Grade Selector */}
                                                            {course.isRepeat && (
                                                                <PrevGradeSelector 
                                                                    id={`desk-prev-grade-select-${course.id}`}
                                                                    value={course.previousGrade}
                                                                    onChange={(newPrevGrade) => handlePlannerChange(course.id, 'previousGrade', newPrevGrade)}
                                                                    gradeScale={gradeScale}
                                                                    className="w-16 text-xs"
                                                                />
                                                            )}
                                                        </td>
                                                        {/* Actions td */}
                                                        <td className="px-2 py-1 whitespace-nowrap">
                                                            <button 
                                                                onClick={() => handleRemoveCourse(course.id)} 
                                                                className="p-1 bg-red-50 border border-red-200 rounded-full text-red-500 hover:text-red-700 hover:bg-red-100 transition-all duration-200 hover:scale-110 text-xs" 
                                                                title="Remove course"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </td>
                                                    </tr>
                                                 )) : (
                                                    <tr><td colSpan={7} className="text-center py-2 text-gray-500 text-xs">No courses loaded or added yet.</td></tr>
                                                 )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                
                                {/* Desktop GPA Results Card */}
                                <div className="hidden md:block">
                                  <GpaResultsCard 
                                    semesterGPAInfo={semesterGPAInfo}
                                    projectedGPAInfo={projectedGPAInfo}
                                    requiredSemesterInfo={requiredSemesterInfo}
                                    baseGPAInfo={{
                                      overallGPA: calculateGPA(parseFloat(editableBaseOverallPoints) || 0, parseInt(editableBaseOverallCredits, 10) || 0),
                                      majorGPA: calculateGPA(parseFloat(editableBaseMajorPoints) || 0, parseInt(editableBaseMajorCredits, 10) || 0)
                                    }}
                                    shareParams={{
                                      bOC: parseInt(editableBaseOverallCredits, 10) || 0,
                                      bOP: parseFloat(editableBaseOverallPoints) || 0,
                                      bMC: parseInt(editableBaseMajorCredits, 10) || 0,
                                      bMP: parseFloat(editableBaseMajorPoints) || 0,
                                      planner: encodeURIComponent(JSON.stringify(plannerCourses)),
                                      scale: encodeURIComponent(JSON.stringify(gradeScale)),
                                      tO: parseFloat(targetOverallGPAInput) || 0,
                                      tM: parseFloat(targetMajorGPAInput) || 0,
                                      cOGPA: encodeURIComponent(calculateGPA(parseFloat(editableBaseOverallPoints) || 0, parseInt(editableBaseOverallCredits, 10) || 0)),
                                      cMGPA: encodeURIComponent(calculateGPA(parseFloat(editableBaseMajorPoints) || 0, parseInt(editableBaseMajorCredits, 10) || 0)),
                                      sOGPA: encodeURIComponent(semesterGPAInfo.status === 'calculated' ? semesterGPAInfo.overallGPA : 'N/A'),
                                      sMGPA: encodeURIComponent(semesterGPAInfo.status === 'calculated' ? semesterGPAInfo.majorGPA : 'N/A'),
                                      pOGPA: encodeURIComponent(projectedGPAInfo.status === 'calculated' ? projectedGPAInfo.overallGPA : 'N/A'),
                                      pMGPA: encodeURIComponent(projectedGPAInfo.status === 'calculated' ? projectedGPAInfo.majorGPA : 'N/A'),
                                      rODisplay: encodeURIComponent(requiredSemesterInfo.overallDisplay),
                                      rMDisplay: encodeURIComponent(requiredSemesterInfo.majorDisplay),
                                      sId: studentDataSource?.student?.DegStudentNo ?? null,
                                      bDN: studentDataSource?.student?.Note ?? null
                                    }}
                                  />
                                </div>

                                {/* Mobile Course List with compact design */}
                                <div className="md:hidden mt-4">
                                    {plannerCourses.length > 0 ? plannerCourses.map(course => (
                                        <div key={course.id} className="border rounded p-3 mb-2 bg-white">
                                            <div className="flex items-center gap-2 w-full">
                                                <input 
                                                    type="text" 
                                                    name={`mobile-course-id-${course.id}`}
                                                    id={`mobile-course-id-${course.id}`}
                                                    value={course.catalogKey} 
                                                    onChange={e => handlePlannerChange(course.id, 'catalogKey', e.target.value)} 
                                                    placeholder="Course ID" 
                                                    className="p-2 border rounded focus:ring-bu-blue focus:border-bu-blue text-sm flex-grow min-w-0" 
                                                    maxLength={10} 
                                                />
                                                <input 
                                                    type="number" 
                                                    name={`mobile-course-credits-${course.id}`}
                                                    id={`mobile-course-credits-${course.id}`}
                                                    value={course.credits} 
                                                    onChange={e => handlePlannerChange(course.id, 'credits', parseInt(e.target.value) || 0)} 
                                                    className="p-2 border rounded w-12 focus:ring-bu-blue focus:border-bu-blue text-sm" 
                                                    min="0"
                                                    max="99"
                                                />
                                                <GradeSelector
                                                    id={`mobile-grade-select-${course.id}`}
                                                    value={course.selectedGrade}
                                                    onChange={(newGrade) => handlePlannerChange(course.id, 'selectedGrade', newGrade)}
                                                    gradeScale={gradeScale}
                                                    className="w-20 text-sm"
                                                />
                                                <button 
                                                    onClick={() => handleRemoveCourse(course.id)} 
                                                    className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 border text-gray-500"
                                                    title="Remove course"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="flex items-center mt-2">
                                                <div className="flex items-center gap-4">
                                                    <label className="flex items-center cursor-pointer" htmlFor={`mobile-course-major-${course.id}`}>
                                                        <input 
                                                            type="checkbox" 
                                                            name={`mobile-course-major-${course.id}`}
                                                            id={`mobile-course-major-${course.id}`}
                                                            checked={course.isMajor} 
                                                            onChange={e => handlePlannerChange(course.id, 'isMajor', e.target.checked)} 
                                                            className="h-4 w-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500 mr-1" 
                                                        />
                                                        <span className="text-sm">Major</span>
                                                    </label>
                                                    <label className="flex items-center cursor-pointer" htmlFor={`mobile-course-repeat-${course.id}`}>
                                                        <input 
                                                            type="checkbox" 
                                                            name={`mobile-course-repeat-${course.id}`}
                                                            id={`mobile-course-repeat-${course.id}`}
                                                            checked={course.isRepeat} 
                                                            onChange={e => handlePlannerChange(course.id, 'isRepeat', e.target.checked)} 
                                                            className="h-4 w-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500 mr-1" 
                                                        />
                                                        <span className="text-sm">Repeat</span>
                                                    </label>
                                                </div>
                                            </div>
                                            {course.isRepeat && (
                                                <div className="flex items-center mt-2">
                                                    <label htmlFor={`mobile-prev-grade-select-${course.id}`} className="text-sm mr-2">Prev:</label>
                                                    <PrevGradeSelector 
                                                        id={`mobile-prev-grade-select-${course.id}`}
                                                        value={course.previousGrade}
                                                        onChange={(newPrevGrade) => handlePlannerChange(course.id, 'previousGrade', newPrevGrade)}
                                                        gradeScale={gradeScale}
                                                        className="w-24 text-sm"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )) : (
                                        <p className="text-gray-500 text-center py-2 text-xs">No courses loaded or added yet.</p>
                                    )}
                                </div>
                                
                                {/* Mobile GPA Results Card */}
                                <div className="mt-4 md:hidden">
                                  <GpaResultsCard 
                                    semesterGPAInfo={semesterGPAInfo}
                                    projectedGPAInfo={projectedGPAInfo}
                                    requiredSemesterInfo={requiredSemesterInfo}
                                    baseGPAInfo={{
                                      overallGPA: calculateGPA(parseFloat(editableBaseOverallPoints) || 0, parseInt(editableBaseOverallCredits, 10) || 0),
                                      majorGPA: calculateGPA(parseFloat(editableBaseMajorPoints) || 0, parseInt(editableBaseMajorCredits, 10) || 0)
                                    }}
                                    shareParams={{
                                      bOC: parseInt(editableBaseOverallCredits, 10) || 0,
                                      bOP: parseFloat(editableBaseOverallPoints) || 0,
                                      bMC: parseInt(editableBaseMajorCredits, 10) || 0,
                                      bMP: parseFloat(editableBaseMajorPoints) || 0,
                                      planner: encodeURIComponent(JSON.stringify(plannerCourses)),
                                      scale: encodeURIComponent(JSON.stringify(gradeScale)),
                                      tO: parseFloat(targetOverallGPAInput) || 0,
                                      tM: parseFloat(targetMajorGPAInput) || 0,
                                      cOGPA: encodeURIComponent(calculateGPA(parseFloat(editableBaseOverallPoints) || 0, parseInt(editableBaseOverallCredits, 10) || 0)),
                                      cMGPA: encodeURIComponent(calculateGPA(parseFloat(editableBaseMajorPoints) || 0, parseInt(editableBaseMajorCredits, 10) || 0)),
                                      sOGPA: encodeURIComponent(semesterGPAInfo.status === 'calculated' ? semesterGPAInfo.overallGPA : 'N/A'),
                                      sMGPA: encodeURIComponent(semesterGPAInfo.status === 'calculated' ? semesterGPAInfo.majorGPA : 'N/A'),
                                      pOGPA: encodeURIComponent(projectedGPAInfo.status === 'calculated' ? projectedGPAInfo.overallGPA : 'N/A'),
                                      pMGPA: encodeURIComponent(projectedGPAInfo.status === 'calculated' ? projectedGPAInfo.majorGPA : 'N/A'),
                                      rODisplay: encodeURIComponent(requiredSemesterInfo.overallDisplay),
                                      rMDisplay: encodeURIComponent(requiredSemesterInfo.majorDisplay),
                                      sId: studentDataSource?.student?.DegStudentNo ?? null,
                                      bDN: studentDataSource?.student?.Note ?? null
                                    }}
                                  />
                                </div>
                            </section>
                        </div>
                    )}
                </main>

                {/* Footer */}
                <footer className="p-4 border-t text-center mt-8 space-y-2">
                    <p className="text-xs text-gray-600">{disclaimerText}</p>
                </footer>
            </div>
        </div>
    );
}

function HomePage() {
    return (
        <HomePageContent />
    );
}

export default function Page() {
    return (
        <ClientWrapper>
            <Suspense fallback={<div>Loading...</div>}>
                <HomePage />
            </Suspense>
        </ClientWrapper>
    );
}