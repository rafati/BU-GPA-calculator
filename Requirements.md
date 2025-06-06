# Bethlehem University GPA Calculator Requirements (v34 Logic)
> Version 0.1.17

This consolidated document reflects all logic discussions and decisions, particularly the final refined logic for the Target GPA calculation.

## 1. Purpose & Goal

### Primary Goal
To provide Bethlehem University students (identified via Google Login) with a tool to:
- View their current official cumulative GPA (Overall and Major) based on administrative records.
- Load their recent/current course registrations into an interactive calculator/planner interface.
- Modify this planner data (edit courses, add hypothetical courses, remove courses) for planning and "what-if" analysis according to Bethlehem University's grading policies.
- Calculate the GPA for the courses currently in the planner interface based on selected grades.
- Calculate the projected Cumulative Overall and Major GPAs based on their official cumulative data plus the state of the planner.
- **Automatically** calculate the required average Semester GPA needed across relevant courses listed in the planner (those expected to receive a GPA-affecting grade) to achieve user-defined target Cumulative GPAs (defaulting to 2.0).

### Secondary Goals
- Provide a flexible planning tool starting from actual registration data.
- Help students understand the potential impact of grade changes or adding/dropping courses.

**--- Consolidated Requirements: Bethlehem University GPA Calculator (v34 Logic) ---**

**2. Target Audience**

*   **Primary Users:** Enrolled students at Bethlehem University whose email addresses are listed in the master Google Sheet (`Students` tab) and who use the corresponding `@bethlehem.edu` Google account to log in.

**3. Scope**

*   **In Scope:**
    *   User Authentication via Google OAuth, restricted to the `@bethlehem.edu` domain.
    *   Data Retrieval (Read-Only) from Google Sheets: `Students` (cumulative), `registration` (courses), `Gradescale` (rules).
    *   Displaying official Cumulative Data and calculated GPAs (applying Points/10 rule from `Students` sheet).
    *   Pre-populating an editable course planner list using data from `registration`. Saving initial state for reset.
    *   Allowing users to modify (Course ID, Credits, Grade, Major?, Repeat?), add (default 3 credits), and remove courses within the planner list (changes are temporary for the session).
    *   Handling data lookup failures (Student Not Found = start with 0 cumulative, disable repeats).
    *   Dynamically configuring grade point values and GPA inclusion rules based on the `Gradescale` sheet (using "Not Calcualted in GPA" note).
    *   Handling WF grade as equivalent to F (based on `Gradescale` data).
    *   Calculating "Semester Planner GPA" based only on planner courses with valid, GPA-affecting grades *currently selected*.
    *   Calculating "Projected Cumulative GPA" applying BU repeat rules (Grade Replacement: removing previous points for all repeats replacing GPA-grades; removing previous credits only for P-repeats).
    *   Input fields for Target Cumulative Overall/Major GPA (defaulting to 2.0).
    *   **Automatic calculation** (updating as inputs change) of "Required Semester GPA" needed across planner courses (excluding those with explicitly non-GPA grades like W,E,I,IP, non-repeat P) to reach the target cumulative GPA. Displaying points needed if relevant divisor credits are zero. Highlighting impossible required GPAs (>4.0/<0.0).
    *   Resetting the planner to its initial state.
    *   Displaying a configurable disclaimer message (text provided externally).
    *   User Logout.
    *   Modern, clean, responsive UI prioritizing mobile-first experience (English language only), with branding inspired by BU website/logo.
    *   **Space-efficient UI layout** that minimizes vertical scrolling, particularly on mobile devices, featuring:
        * Combined GPA Results section that displays both Semester Planner and Projected Cumulative GPAs in a single view
        * Compact mobile course entry display that fits all controls for a course in a minimal amount of vertical space
*   **Out of Scope:**
    *   Writing any data back to Google Sheets.
    *   Persistently saving user modifications made to the planner list between sessions.
    *   Automatically suggesting grades to achieve targets.
    *   Complex rule automation beyond specified repeat logic.
    *   User account management separate from Google.
    *   Localization (Interface is English only).
    *   Official academic record keeping or advising.

**4. Functional Requirements**

*   **Authentication & Authorization:** FR_AUTH1-FR_AUTH5 (As defined: Google Login @bethlehem.edu, Data Lookup, Failure Handling, Student Not Found Handling, Logout).
    *   **FR_AUTH1: Google Login:** Allow users to log in via Google OAuth, restricted to the `@bethlehem.edu` domain.
    *   **FR_AUTH2: Data Lookup:** Upon successful login, retrieve the user's email and look up their corresponding `DegStudentNo` in the `Students` sheet.
    *   **FR_AUTH3: Failure Handling:** Gracefully handle API errors during login or data fetch (e.g., network issues, invalid credentials).
    *   **FR_AUTH4: Student Not Found Handling:** If the logged-in user's email is not found in the `Students` sheet, initialize the calculator with 0 cumulative data and potentially disable repeat-specific features.
    *   **FR_AUTH5: Logout:** Provide a mechanism for the user to sign out, clearing their session and resetting the calculator state.
    *   **FR_AUTH7: Account Selection:** Configure Google authentication to always display the account selection screen, allowing users to choose from all available logged-in Google accounts.
*   **FR_AUTH6: Access Control & Student Selection:**
    *   The system will determine user access rights based on multiple sources, with permissions being cumulative across all roles:
        1.  **Advisor-based Access:** 
            *   If the authenticated user's email (or the override email, if active) is found in the `Advisor` column of the `Students` sheet, the user is authorized to access all students for whom they are listed as the advisor.
        2.  **Class Access Sheet-based Access:**
            *   The system will check a new `Class Access` sheet which contains the following columns:
                *   `FacEmail`: Faculty/staff email address
                *   `Department`: Department the faculty/staff belongs to (may be empty)
                *   `Faculty`: Faculty the user belongs to (may be empty)
                *   `AccessAllStudents`: If "Yes", grants access to all students in the system
                *   `Student`: Contains specific student IDs the user should have access to (may be empty)
            *   Access determination logic (permissions are cumulative across all applicable rules):
                *   If `AccessAllStudents` is "Yes", the user has access to all student records in the system
                *   If specific `Student` IDs are listed, the user has access to those specific students
                *   If `Department` is specified, the user has access to all students who belong to that department
                *   If `Faculty` is specified, the user has access to all students who belong to that faculty
    *   Once access rights are determined:
        *   The system will create a unified list of all students the user has access to from all roles
        *   If the user has access to multiple students, the application must present an interface for searching and selecting a specific student to load in the calculator
        *   The search interface should allow typing a partial student ID and suggest matching students as they type
        *   Once a valid student is selected, the calculator will load that student's cumulative data and course registrations
    *   If the user has no access to any student records through any of these roles, the "Student Not Found" handling (FR_AUTH4) applies.
*   **Data Handling & Configuration:** FR_DATASRC1, FR_CONFIG1, FR_DATA_FRESHNESS, FR_DATA_MISMATCH (As defined: Secure read-only Sheets access, Load/Cache `Gradescale`, Frequent student data reads, Ignore `RegGrade` not in `Gradescale`).
*   **Display:** FR_DISPLAY1-FR_DISPLAY7 (As defined: Base Cum Data+GPA(Points/10), Planner Table, Semester GPA+Credits, Projected Cum GPA+Credits, Target GPA inputs & Auto-Calculated Required GPA/Points, Configurable Disclaimer).
*   **FR_DISPLAY8: Optimized UI Layout:** 
    *   **FR_DISPLAY8.1: Combined GPA Results:** Display both Semester Planner GPA and Projected Cumulative GPA in a single, unified section to minimize vertical space usage while maintaining all relevant information.
    *   **FR_DISPLAY8.2: Compact Mobile Course Display:** Provide a space-efficient mobile layout for course entries that uses a grid layout to organize all course controls (ID, credits, grade, major/repeat checkboxes) in minimal vertical space.
*   **FR_DISPLAY9: GPA Results Card:**
    *   **FR_DISPLAY9.1: Tab Navigation:** Implement a tab-based interface with three tabs: Semester, Projected, and Target.
    *   **FR_DISPLAY9.2: Consistent Formatting:** Format all GPA values to display exactly three decimal places.
    *   **FR_DISPLAY9.3: Credit Display:** Display all credit values as whole numbers without decimal places.
    *   **FR_DISPLAY9.4: Tab-Specific Footers:**
        * **Semester Tab Footer:** Display "Projected: CUM/Major" and "Target: CUM/Major" values.
        * **Projected Tab Footer:** Display "Semester: CUM/Major" and "Target: CUM/Major" values.
        * **Target Tab Footer:** Display "Semester: CUM/Major" and "Projected: CUM/Major" values.
    *   **FR_DISPLAY9.5: Negative Value Handling:** Display negative GPA or points values in red text.
    *   **FR_DISPLAY9.6: Target Tab Cards:** Display dedicated cards showing "Required Semester GPA" and "Required Semester Major GPA" with credits information.
        * Include "Based on X semester credits and Y total credits" under each GPA value.
        * Show "points" suffix when displaying point values instead of GPA.
    *   **FR_DISPLAY9.7: Warning Messages:** Display appropriate warning messages when:
        * Overall or Major GPA is above 4.0 (impossible to achieve)
        * Semester credits are 0 (no courses with grades that affect GPA)
        * Do not show warnings for negative GPA/points values
*   **Planner Functionality:** FR_POPULATE1, FR_INTERACT1-FR_INTERACT7 (As defined: Populate from sheet & save initial state, Editable fields, Conditional Previous Grade/Original Major inputs, State updates via handlers, Add/Remove/Reset buttons).
*   **Calculations:**
    *   **FR_CALC_SEMESTER:** Calculates Semester GPA based only on planner courses with currently selected GPA-affecting grades. Divisor = Credits of courses with selected GPA-affecting grades.
    *   **FR_CALC_PROJECTED:** Calculates Projected Cum GPA. Uses base data adjusted by removals (points for all repeats, credits for P-repeats) plus net changes (points based on grade difference for repeats, credits only for non-repeats).
    *   **FR_CALC_TARGET (v34 Logic):** Automatically calculates Required Semester GPA based on Target Cum GPA inputs and planner state. Logic Summary:
        1.  Identify relevant planner courses (exclude W,E,I,IP and non-repeat P).
        2.  Calculate `AdjustedBasePoints/Credits` (Base - P-repeat credits/points - *all* relevant repeat points).
        3.  Calculate `NetCreditsAddedByPlanner` (only non-repeats from relevant courses).
        4.  Calculate `FinalCumulativeCredits` (`AdjustedBaseCredits` + `NetCreditsAddedByPlanner`).
        5.  Calculate `TotalPointsNeeded` (`TargetCumulativeGPA` * `FinalCumulativeCredits`).
        6.  Calculate `RequiredSemesterPoints` (`TotalPointsNeeded` - `AdjustedBasePoints`).
        7.  Calculate `SemesterDivisorCredits` (from relevant courses: sum credits if grade is blank OR grade `AffectsGPA`).
        8.  If `SemesterDivisorCredits` > 0, `RequiredSemesterGPA` = `RequiredSemesterPoints` / `SemesterDivisorCredits`.
        9.  Else, output `RequiredSemesterPoints` needed over 0 GPA credits.
        10. Format output string including divisor credits. Handle Overall/Major separately.
*   **FR_TARGET_DISPLAY: Target GPA Analysis Display Format:**
    *   **FR_TARGET_DISPLAY1: Layout Structure:**
        * Use a dedicated section with the heading "Target GPA Analysis" separated by a horizontal line in reports.
        * Display Overall and Major GPA targets and requirements side-by-side in two equal columns.
        * Include detailed credit information beneath each required GPA value.
    
    *   **FR_TARGET_DISPLAY2: Content Requirements:**
        * **Target Values:** Display target GPAs with exactly three decimal places (e.g., "2.000").
        * **Required Values:** Show required semester GPAs in purple text with three decimal places.
        * **Credit Information:** 
            * Both print and PDF formats must display identical information showing "Based on X semester credits and Y total credits" where X represents applicable semester credits and Y represents final cumulative credits after adjustments.
            * For Major GPA: Include the word "major" before "semester credits" and "total credits" (e.g., "Based on 13 major semester credits and 19 total major credits").
            * The exact same format and wording must be used consistently across all output formats.
        * **Points Display:** When divisor credits are zero, display "X.XX points needed" instead of a GPA value.
        * **Impossible Values:** Use red text and "> 4.000" for impossible GPA targets (requiring semester GPA above 4.0).
        * **Warning Text:** Include a red asterisk note: "* Major target GPA calculation requires major courses with grades that affect GPA."
    
    *   **FR_TARGET_DISPLAY3: Numerical Formatting:**
        * All GPA values must display exactly three decimal places.
        * Credit values must be displayed as whole numbers without decimal places.
        * Required GPA values use purple text (#800080) when possible, red text (#cc0000) when impossible.
        * The format must be identical across all generated outputs (screen, print, PDF).
*   **Sharing Functionality:**
    *   **FR_SHARE1: Generate Shareable Link:** Add a button or mechanism to generate a unique URL that encodes the current state of the calculator. This includes:
        *   Editable Base Cumulative Overall Credits
        *   Editable Base Cumulative Overall Points
        *   Editable Base Cumulative Major Credits
        *   Editable Base Cumulative Major Points
        *   The current list of `plannerCourses` (including course ID, credits, selected grade, major status, repeat status, previous grade, and original major status if applicable).
        *   Target Overall GPA Input
        *   Target Major GPA Input
        *   Student ID (DegStudentNo) if available (`sId`)
        *   Base Data Note from Students sheet (`bDN`)
    *   **FR_SHARE2: Load State from Link:** The application must be able to parse the data encoded in a shared link URL (when visited directly) and pre-populate the calculator with the corresponding values.
    *   **FR_SHARE3: No Authentication for Shared Link:** Accessing a shared link and interacting with the pre-populated calculator state should **not** require Google authentication. The user accessing the link operates independently of any logged-in session.
    *   **FR_SHARE4: Configurable Base URL:** The base URL used for generating the shareable link (e.g., `https://myapp.com/calculator?data=...`) must be read dynamically from a configuration source, specifically cell `B2` of the Google Sheet used for general configuration (likely the same sheet as the `Gradescale` or a dedicated `Config` sheet - *Clarify which sheet if necessary*).

*   **Printing Functionality:**
    *   **FR_PRINT1: Print Calculator:** The application must provide a "Print" button that allows users to print the current state of the calculator in a well-formatted layout.
    *   **FR_PRINT2: Print Layout:** The print layout must be optimized for A4 paper size and designed to fit on a single page.
    *   **FR_PRINT3: Print Content:** The printed output must include:
        *   Student information (ID, name if available)
        *   Base cumulative data (Overall and Major credits/points/GPA)
        *   Planner courses table with all relevant information (Course ID, Credits, Grade, Major status, etc.)
        *   Calculated results (Semester GPA, Projected Cumulative GPAs, Required Semester GPA)
        *   Timestamp indicating when the print was generated
    *   **FR_PRINT4: Print Styling:** The print layout must be clean, professional, and use appropriate font sizes and spacing to ensure readability while maintaining the single-page constraint.
    *   **FR_PRINT5: Print Preview:** When possible, provide a print preview dialog using the browser's native functionality.
    *   **FR_PRINT6: Responsive Print Layout:** The print layout must adjust appropriately to fit all required information on a single page regardless of the number of courses in the planner.
    *   **FR_PRINT7: Logo Integration:** The printed output must include the Bethlehem University logo in the header section of the document:
        *   The logo must be appropriately sized to maintain the single-page layout constraint
        *   The logo should be positioned in the top-left or top-center of the document
        *   The logo must maintain its aspect ratio and proper rendering quality
        *   Logo placement should not interfere with essential content visibility or readability
        *   If space constraints become an issue with many courses, the system should dynamically reduce the logo size rather than allowing content to flow to a second page
    *   **FR_PRINT8: Format Consistency with PDF:** The print output must exactly match the format and layout of the PDF output:
        *   The header layout must include the logo on the left with the "GPA Calculator Report" title and student ID to the right
        *   A horizontal line must separate the header from content, with Student ID and generation timestamp displayed above it
        *   Layout structure must follow the exact PDF format:
            * Top row with two equal columns: "Base Cumulative Data" and "Current Semester" (with "Projected Cumulative" below it)
            * Single row for "Target GPA Analysis" with side-by-side display of Overall and Major targets and requirements
            * "Course Planner" with course count displayed in parentheses
        *   The "Base Cumulative Data" section must display credits as whole numbers and GPA values with exactly three decimal places
        *   The "Current Semester" section must display GPA values in green with three decimal places
        *   The "Projected Cumulative" section must display GPA values in blue with three decimal places 
        *   The "Target GPA Analysis" section must display required GPA values in purple with three decimal places
        *   The disclaimer at the bottom must be identical to the PDF version, including:
            * A standard disclaimer about the calculator providing estimates
            * The special disclaimer text from cell C1 of the configuration sheet
            * "Page 1 of 1" displayed at the bottom right
        *   The entire output must fit on a single page regardless of the number of courses

*   **User Feedback Collection:**
    *   **FR_FEEDBACK1: Feedback Trigger:** Provide a clearly visible button or link (e.g., "Send Feedback") allowing users to initiate the feedback submission process.
    *   **FR_FEEDBACK2: Feedback Form:** Present a simple modal or form with a text area for the user to type their feedback.
    *   **FR_FEEDBACK3: Automatic Data Inclusion:** When submitting feedback:
        *   Automatically capture and include the authenticated user's email address.
        *   Automatically capture and include the currently selected Student ID (`DegStudentNo`), if one is loaded.
        *   *(Optional/Stretch Goal)* Attempt to capture a screenshot of the current calculator interface state and include it with the feedback. Investigate feasibility using client-side libraries (e.g., html2canvas).
    *   **FR_FEEDBACK4: Feedback Submission:**
        *   Package the user's text feedback along with the automatically captured data (email, student ID, optional screenshot).
        *   Send this package as an email *from* the application's Google Service Account address.
        *   **Requires:** The Service Account must have Domain-Wide Delegation enabled in Google Workspace Admin with the `https://www.googleapis.com/auth/gmail.send` scope authorized.
    *   **FR_FEEDBACK5: Configurable Recipient:** Read the target email address for receiving feedback from cell `B4` of the designated configuration Google Sheet.
    *   **FR_FEEDBACK6: User Confirmation:** Provide visual confirmation to the user that their feedback has been sent successfully (e.g., a success message or toast notification). Handle potential sending errors gracefully.
    *   **FR_FEEDBACK7: Fallback Email Configuration:** 
        *   Implement a fallback mechanism for feedback recipient email via environment variables.
        *   If the email address retrieved from the Google Sheet is invalid (not a proper email format), use the `FEEDBACK_RECIPIENT_EMAIL` environment variable as a fallback.
        *   Log appropriate error messages when falling back to the environment variable.
    *   **FR_FEEDBACK8: Modal Screenshot Exclusion:** 
        *   When capturing a screenshot for feedback, exclude the feedback modal itself from the screenshot to prevent visual recursion.
        *   Temporarily hide the feedback modal during screenshot capture, then restore it.
    *   **FR_FEEDBACK9: Submission State Management:** 
        *   Hide or disable form buttons (Submit and Cancel) after successful submission until the modal closes.
        *   Display a success message to indicate successful submission.
        *   Close the feedback modal automatically after a short delay (2 seconds) following successful submission.

**5. Non-Functional Requirements**

*   **NFR1: Accuracy:** Calculations must precisely implement BU rules.
*   **NFR2: Usability:** Intuitive, modern, clean aesthetic. Clear feedback.
*   **NFR3: Performance:** Responsive feel.
*   **NFR4: Platform & Responsiveness:** Web Browser, Responsive, Mobile-First priority.
*   **NFR5: Accessibility:** Basic adherence (WCAG AA where feasible).
*   **NFR6: Clarity:** Clear labels, explanations, disclaimers.
*   **NFR7: Security:** Secure OAuth (domain restricted), secure credentials, read-only access, standard web protections.
*   **NFR8: Privacy:** No persistent storage of user edits.
*   **NFR9: Data Dependency:** Reliant on Sheets API and sheet structure/accuracy. Error handling crucial.
*   **NFR10: Reliability:** Dependent on Google Cloud Services.
*   **NFR11: Branding:** UI inspired by BU website/logo. Professional look.
*   **NFR12: Localization:** English language ONLY.
*   **NFR13: Space Efficiency:** UI design must maximize information density while maintaining readability, with special focus on reducing vertical scrolling on mobile devices.
*   **NFR14: Data Format Consistency:** All GPA values must be displayed with exactly three decimal places, and all credit values must be displayed as whole numbers.

**6. Data Requirements**

*   **Input Source (Google Sheets):** Document ID, Service Account Credentials. Sheet Names (`Students`, `registration`, `Gradescale`) and specified Columns.
*   **Configuration Data:** Dynamically loaded from `Gradescale`. External text for Disclaimer.
*   **User Input (Session):** Edits within planner table, Target GPA values (default 2.0).
*   **Calculated Outputs:** Current Cum GPA, Semester Planner GPA, Projected Cum GPA, Required Semester GPA/Points Needed.

**7. Key Assumptions**

*   Google Sheets are accurate, maintained, and reflect BU policy.
*   `Students` sheet data reflects past repeats correctly up to its last update.
*   `Gradescale.Note` field reliably identifies non-GPA grades via "Not Calcualted in GPA".
*   WF grade configured as F in `Gradescale`.
*   Points/10 rule applies ONLY to base cumulative points from `Students` sheet.
*   Users provide correct inputs where required (Previous Grade, Original Major for P-Repeat).
*   **Target GPA Logic (v34):** Divisor includes credits for Blank grades or GPA-Affecting grades from relevant planner courses; Base points adjusted for points from ALL replaced GPA-affecting grades; Base credits adjusted ONLY for credits from P-repeat replaced grades; Net credits added only by non-repeats.
*   Student Not Found handling (0 base, no repeats) is acceptable.
*   Ignoring `RegGrade` not in `Gradescale` (leave planner grade blank) is acceptable.
*   `Gradescale` changes infrequently (refresh on app start/infrequently is okay).
*   Mobile users value compact, space-efficient layouts to minimize scrolling while accessing all functionality.

**8. UI/UX Implementation Details**

*   **Combined GPA Results Display:**
    *   A single card/box that contains both Semester and Projected GPA information
    *   Side-by-side layout on larger screens, stacked on very small screens
    *   Consistent color coding: green for Semester GPAs, blue for Projected GPAs
    *   Compact typography with appropriately sized headings and clear hierarchy
    *   Includes succinct explanatory text for each section

*   **Mobile Course Entry Layout:**
    *   Grid-based layout that organizes course information horizontally where possible
    *   Top row: Course ID, Credits, Grade selector in a space-efficient grid
    *   Second row: Major/Repeat checkboxes and remove button
    *   Previous Grade selector appears conditionally only when Repeat is checked
    *   Reduced padding and spacing between elements while maintaining touch targets
    *   Smaller but readable font sizes for labels and values

*   **GPA Results Card Implementation:**
    *   Tab-based interface with three sections (Semester, Projected, Target) for efficient space usage
    *   Consistent formatting for all GPA values (3 decimal places) and credit values (whole numbers)
    *   Dynamic footers for each tab that cross-reference relevant GPA information:
        * Semester tab shows Projected and Target GPAs in footer
        * Projected tab shows Semester and Target GPAs in footer
        * Target tab shows Semester and Projected GPAs in footer
    *   Visual indicators for negative values (red text) and values above 4.0 (warning message)
    *   Target tab includes detailed credit information under each required GPA: "Based on X semester credits and Y total credits"
    *   Context-appropriate warning messages that prioritize impossible GPA notifications over credits issues

---

This document should now be a stable reference point capturing the full requirements and logic as discussed, including the latest UI optimization changes and GPA display formatting requirements.

## 9. Build Versioning System

### FR_BUILD1: Automatic Version Incrementing
- The application uses semantic versioning (MAJOR.MINOR.PATCH) for tracking changes
- The system automatically increments the PATCH version number (x.y.Z) when:
  * The application is built for production via the `prebuild` npm script (when SKIP_VERSION_INCREMENT is not set to 'true')
  * A developer manually runs the version update script
  * A developer uses the provided `prepush` script before pushing to the repository
- Version numbers are managed in multiple locations to ensure consistency:
  * `package.json` file (primary source of version)
  * `Requirements.md` file (updated automatically to match package.json)
  * Environment variables for client and server access

### FR_BUILD2: Build Information Tracking
- The following information is captured with each build:
  * Build version number (e.g., 0.1.2)
  * Build date (YYYY-MM-DD format)
  * Commit hash from Git (short form)
- This information is stored in environment variables:
  * Server-side: `BUILD_NUMBER`, `BUILD_DATE`, `COMMIT_HASH`
  * Client-side: `NEXT_PUBLIC_BUILD_NUMBER`, `NEXT_PUBLIC_BUILD_DATE`, `NEXT_PUBLIC_COMMIT_HASH`

### FR_BUILD3: Version Display
- The application displays the current version number and build date in the footer of every page
- The version display includes:
  * Version number from package.json
  * Build date in YYYY-MM-DD format
- The version information is displayed in small, unobtrusive text that doesn't interfere with the primary functionality

### FR_BUILD4: Development Tooling
- Automated scripts to support version management:
  * `update-build-number.js`: Increments the patch version and updates all relevant files
  * `prepare-version-commit.js`: Stages changed files and prepares them for Git commit
- NPM scripts to streamline the process:
  * `npm run update-version`: Manually update version numbers
  * `npm run prepush`: Update version and prepare for Git push
  * `prebuild` (automatic): Update version before production builds

### FR_BUILD5: Build Data Access
- Build information is accessible throughout the application via:
  * Environment variables in server-side code
  * `NEXT_PUBLIC_` prefixed environment variables in client-side code
  * A dedicated `buildInfo.ts` module that handles environment differences
- The system handles hydration differences between server and client environments to prevent React errors

### FR_BUILD6: Version Consistency Between Environments
- The application maintains version consistency between development and production environments:
  * In development: Version increments only when developers explicitly run version update scripts
  * In Vercel deployments: Version remains unchanged during builds via the SKIP_VERSION_INCREMENT=true flag
- Regular git commits do NOT automatically change the version number
- The commit hash is always updated regardless of version increment status
- Specific commands for version management:
  * `npm run update-version`: Updates version number without committing changes
  * `npm run prepush`: Updates version number AND creates a commit with message "Bump version to X.Y.Z"
  * Regular `git commit` and `git push` commands: Do NOT affect version numbers

### FR_BUILD7: Version Management Process
- **For routine code changes:**
  1. Make code changes
  2. Use standard `git commit` and `git push` commands
  3. Version number remains unchanged
  4. Commit hash updates in environment variables on next build
- **For version increments:**
  1. Make code changes
  2. Run `npm run prepush` to increment version and create a commit
  3. Run `git push` to push changes to remote repository
  4. Vercel builds with the new version number
- **For manual version control:**
  1. Make code changes and commit them
  2. Run `npm run update-version` to increment version without committing
  3. Manually commit the version changes
  4. Push all changes to the remote repository

**10. Future Development Options**

*   **Database Migration:**
    *   **Current Implementation:** The application currently uses Google Sheets as its data source, which provides a familiar interface for administrators but has limitations in terms of scalability, query performance, and data validation.
    *   **Migration Path:** For future development, the application could benefit from transitioning to a more robust database solution while maintaining the current functionality and user experience.
    
    *   **Recommended Database Options for Vercel Deployment:**
        1.  **Vercel Storage Solutions:**
            *   Vercel Postgres: SQL database with 256MB free tier storage
            *   Vercel KV (Redis): Key-value store for caching and simple data
            *   Vercel Blob: For storing larger objects and files
            
        2.  **PlanetScale:** MySQL-compatible serverless database
            *   5GB free storage tier
            *   Seamless Vercel integration
            *   Branching workflow for development
            *   Familiar SQL syntax
            
        3.  **MongoDB Atlas:** Document database
            *   512MB free storage
            *   Flexible schema similar to JSON
            *   Good fit for migrating spreadsheet-like data
            
        4.  **Supabase:** Open-source Firebase alternative
            *   PostgreSQL database with 500MB free storage
            *   Built-in authentication that could replace Google Auth
            *   Row-level security for complex access patterns
            
        5.  **Neon:** Serverless PostgreSQL
            *   3GB free storage
            *   Autoscaling capabilities
            *   Branching for development environments
    
    *   **Development Strategy:**
        1.  Start with locally installed MySQL/PostgreSQL during development
        2.  Use environment variables to switch database connections based on environment
        3.  Design database schema to match current data structure in Google Sheets
        4.  Implement proper connection pooling for serverless environments
        5.  Create data migration scripts to transfer data from Google Sheets
        6.  Migrate to production database (e.g., PlanetScale) for deployment
    
    *   **Benefits of Database Migration:**
        *   Improved performance for data queries
        *   Better data validation and integrity enforcement
        *   Enhanced security features and access control
        *   Greater scalability for growing user base
        *   Reduced dependency on Google services
        *   Potential for more complex features requiring relational data
        *   Support for transaction processing
        
    *   **Considerations:**
        *   Maintain administrative interface that is user-friendly for non-technical staff
        *   Ensure robust data backup and recovery procedures
        *   Handle connection management appropriately for serverless architecture
        *   Address authentication and authorization within the new database system

*   **Usage Analytics & Tracking:**
    *   **Implementation Strategy:**
        *   During development: Use locally installed MySQL database for tracking
        *   In production: Migrate to PlanetScale (MySQL-compatible) on Vercel
        *   Use environment variables to switch connection strings based on environment
        
    *   **FR_TRACKING1: Key Events to Track:**
        *   **Login Events:** Record each successful login to the application
        *   **Student Data Loading:** Record when a student's data is loaded into the calculator
        *   **Share Link Generation:** Track when users generate shareable links
        *   **PDF Download Events:** Record when users download PDF reports
        
    *   **FR_TRACKING2: Analytics Data Schema:**
        *   **Events Table:**
            *   `id`: Unique identifier for the event record (auto-increment)
            *   `session_id`: Unique identifier for the user session
            *   `event_type`: Type of event (LOGIN, STUDENT_LOAD, SHARE, PDF_DOWNLOAD)
            *   `user_email`: Email address of the authenticated user (if available)
            *   `student_id`: Student ID being accessed (if applicable)
            *   `timestamp`: Date and time when the event occurred (AUTO-POPULATED)
            *   `browser`: Browser information (name, version)
            *   `device_type`: Device category (desktop, tablet, mobile)
            *   `os`: Operating system information
            *   `ip_address`: Client IP address (stored in full form)
            *   `referrer`: Source of traffic URL (if available)
            *   `additional_data`: JSON field for event-specific details (optional)
            
    *   **FR_TRACKING3: Data Collection Policy:**
        *   **Privacy-First Approach:** Collect only necessary information for usage analysis
        *   **Data Minimization:** Limit collection to essential fields
        *   **IP Tracking:** Store actual IP addresses for security and geographic analysis
        *   **Retention Policy:** Establish clear timeframes for data retention
        *   **Disclosure:** Inform users about data collection in privacy policy
        
    *   **FR_TRACKING4: Implementation Requirements:**
        *   **Middleware-Based Approach:** Use Next.js middleware for login tracking
        *   **API-Based Tracking:** Use API routes for client-side events to avoid Edge runtime limitations
        *   **Session Consistency:** Maintain consistent session IDs across all related events
        *   **Non-Blocking Design:** Ensure tracking code does not impact application performance
        *   **Connection Pooling:** Use proper connection pooling for database operations
        *   **Error Handling:** Gracefully handle tracking failures without disrupting user experience
        *   **Validation:** Validate event types before inserting into database to prevent SQL errors
        
    *   **FR_TRACKING5: Administrative Interface:**
        *   **Access Control:** Restricted to authorized administrators
        *   **Dashboard:** Visual representation of usage statistics
        *   **Filtering:** Ability to filter data by date range, event type, and other parameters
        *   **Export:** Option to export analytics data in CSV format
        *   **Summary Reports:** Automated periodic reports on usage patterns
        
    *   **FR_TRACKING6: Login Event Handling:**
        *   **Authentication Integration:** Track logins through NextAuth signIn events
        *   **Two-Phase Login Tracking:** 
            *   Phase 1: Record initial login with device information via middleware
            *   Phase 2: Update login record with user email after authentication via signIn event
        *   **Login-Specific Fields:** Ensure browser, device type, OS, and IP data are accurately captured

## 11. Development Environment

### Development Setup Requirements
- **Node.js Version:** 18.x or higher
- **npm Version:** 11.2.0 or higher
- **Next.js Version:** 14.1.0
- **Environment Variables:** Complete set of environment variables in `.env.local`
- **Editor Configuration:** Appropriate TypeScript and ESLint configuration

### Common Development Issues

#### Duplicate Page Detection
- The Next.js router may warn about duplicate pages that resolve to the same route
- Example: Both `pages/not-found.tsx` and `pages/not-found.js` both resolve to `/not-found`
- Resolution: Remove or rename one of the conflicting files

#### Module Build Failures
- Node.js built-in modules using the `node:` prefix (e.g., `node:process`) may cause build errors in the browser environment
- These typically appear in dependency packages used by Google API libraries
- Resolution: May require custom webpack configuration or alternative import strategies

#### Fast Refresh Errors
- Runtime errors during development can cause full page reloads instead of fast refresh
- Check component rendering logic, especially in lifecycle methods or React hooks
- Resolution: Fix the underlying component errors causing the refresh failures

#### Webpack Cache Errors
- Errors like `ENOENT: no such file or directory, rename... .next/cache/webpack/...`
- Resolution: Clear the `.next` cache directory and restart the development server
  ```bash
  rm -rf .next
  npm run dev
  ```

#### API Request Handling
- Ensure API routes properly handle CORS and authentication
- Test API endpoints separately from the UI to isolate issues
- Use browser developer tools to inspect network requests and responses

### Testing Requirements
- Test on different browsers (Chrome, Firefox, Safari)
- Test on mobile devices or using browser device emulation
- Verify PDF generation and printing functionality
- Test with different screen sizes to ensure responsive design

---


