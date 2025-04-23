# BU GPA Calculator Codebase Guide

## Application Overview

The BU GPA Calculator is a Next.js-based web application designed to help Bethlehem University students calculate their GPA based on current and planned courses. It allows students to view their official cumulative GPA, load recent course registrations, modify courses for planning purposes, and calculate various GPA metrics, including semester GPA, projected cumulative GPA, and required semester GPA to achieve target scores.

## Technologies and Libraries

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.1.0 (App Router) | React framework for server and client components |
| React | 18+ | UI library |
| TypeScript | 5.0+ | Static type checking |
| Tailwind CSS | 3.3+ | Utility-first CSS framework for styling |
| NextAuth.js | 4.x | Authentication solution with Google provider |
| Google API | Various | Accessing Google Sheets data |
| Vercel | N/A | Deployment platform |
| Node.js | 18+ | JavaScript runtime |
| npm | 11.2.0+ | Package manager |

### Key Libraries

| Library | Purpose | Usage Location |
|---------|---------|----------------|
| jsPDF | PDF generation | `/src/components/PDFGenerator.tsx` |
| jspdf-autotable | Table generation in PDFs | `/src/components/PDFGenerator.tsx` |
| date-fns | Date formatting | Various files |
| react-icons | Icon components | Various UI components |
| mysql2 | MySQL database connection | `/src/lib/db.ts` |
| next-auth | Authentication | `/src/app/api/auth/[...nextauth]/route.ts` |
| googleapis | Google Sheets API | API route files |
| react-select | Enhanced dropdown components | Some form elements |
| @vercel/analytics | Analytics integration | `/src/app/layout.tsx` |

### Environment Configuration

The application expects the following environment variables:

```
# Authentication
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_URL=...
NEXTAUTH_SECRET=...

# Google Sheets Access
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY=...
GOOGLE_SHEET_ID=...

# Analytics Database
DATABASE_URL=...
DATABASE_USER=...
DATABASE_PASSWORD=...

# Feature Flags
ENABLE_ANALYTICS=...
ENABLE_FEEDBACK=...

# Build Information
NEXT_PUBLIC_BUILD_NUMBER=...
NEXT_PUBLIC_BUILD_DATE=...
NEXT_PUBLIC_COMMIT_HASH=...
```

## Codebase Structure

The application follows a modern Next.js project structure:

```
/src
  /app                 - Next.js app directory (routes, layouts, pages)
    /api               - API endpoints (server-side)
    page.tsx           - Main calculator page
    layout.tsx         - Root layout component
    globals.css        - Global styles
  /components          - Reusable UI components
  /hooks               - Custom React hooks
  /lib                 - Utility functions and services
  /providers           - Context providers
  /types               - TypeScript type definitions
```

## Data Models and Types

### Key TypeScript Interfaces

| Interface | File Location | Purpose |
|-----------|---------------|---------|
| `GradeScaleRow` | `src/app/page.tsx` | Represents a row in the grade scale table |
| `StudentRecord` | `src/app/page.tsx` | Student data structure from Sheets |
| `RegistrationRecord` | `src/app/page.tsx` | Course registration structure |
| `PlannerCourse` | `src/app/page.tsx` | Structure for interactive planner courses |
| `GpaResultsCardProps` | `src/components/GpaResultsCard.tsx` | Props for GPA display component |
| `PDFGeneratorProps` | `src/components/PDFGenerator.tsx` | Props for PDF generator |

### Data Flow

1. **Authentication**: User logs in via Google OAuth
2. **Data Retrieval**: 
   - `fetchStudentAccessData` retrieves student record from Google Sheets
   - `fetchGradeScale` retrieves grade definitions
3. **State Management**: 
   - Student data and registrations loaded into state
   - User can modify planner courses and target GPA values
4. **Calculation**:
   - `semesterGPAInfo` calculates current semester GPA
   - `projectedGPAInfo` calculates projected cumulative GPA
   - `requiredSemesterInfo` calculates required GPA to reach targets
5. **Rendering**:
   - `GpaResultsCard` displays calculation results
   - Course planner shows editable courses
6. **Export Options**:
   - `PDFGenerator` generates PDF reports
   - `handleShare` creates shareable links

## Key Components and Their Responsibilities

### Core Pages

| File Path | Description | When to Modify |
|-----------|-------------|----------------|
| `/src/app/page.tsx` | Main calculator page containing all logic for GPA calculations, course management, and UI | For changes to core calculation logic, adding new features, or modifying the main UI flow |
| `/src/app/layout.tsx` | Root layout with providers and global elements | For changes to global structure, metadata, or app-wide providers |

### GPA Components

| Component | File Path | Purpose | When to Modify |
|-----------|-----------|---------|----------------|
| `GpaResultsCard` | `/src/components/GpaResultsCard.tsx` | Displays GPA results in a tabbed card with semester, projected, and target views | For modifying GPA display format, adding GPA-related features, changing tab content |
| `PDFGenerator` | `/src/components/PDFGenerator.tsx` | Handles PDF report generation with all GPA data | For modifying PDF report layout, content, or formatting |
| `GpaDisplay` | `/src/components/GpaDisplay.tsx` | Simple component to consistently display GPA values | For changing how individual GPA values are rendered |

### Course-Related Components

| Component | File Path | Purpose | When to Modify |
|-----------|-----------|---------|----------------|
| `GradeSelector` | `/src/components/GradeSelector.tsx` | Dropdown for selecting course grades | For modifying grade selection UI or behavior |
| `PrevGradeSelector` | `/src/components/PrevGradeSelector.tsx` | Dropdown for selecting previous grades (for repeat courses) | For changing previous grade selection |

### Authentication Components

| Component | File Path | Purpose | When to Modify |
|-----------|-----------|---------|----------------|
| `SignOutButton` | `/src/components/SignOutButton.tsx` | Button to sign out | For modifying sign-out behavior |
| `SessionProvider` | `/src/providers/SessionProvider.tsx` | Provides auth session context | For auth-related changes |

### Utility Hooks

| Hook | File Path | Purpose | When to Modify |
|------|-----------|---------|----------------|
| `useAnalytics` | `/src/hooks/useAnalytics.ts` | Hook for tracking user analytics | For changing analytics tracking behavior |

### API Routes

| Route | File Path | Purpose | When to Modify |
|-------|-----------|---------|----------------|
| `/api/studentdata` | `/src/app/api/studentdata/route.ts` | Fetches student data from Google Sheets | For changing how student data is retrieved |
| `/api/gradescale` | `/src/app/api/gradescale/route.ts` | Fetches grade scale definition | For modifying grade scale information |
| `/api/disclaimer` | `/src/app/api/disclaimer/route.ts` | Fetches disclaimer text | For updating disclaimer content |
| `/api/feedback` | `/src/app/api/feedback/route.ts` | Processes user feedback | For changing feedback submission logic |
| `/api/pdf-disclaimer` | `/src/app/api/pdf-disclaimer/route.ts` | Fetches PDF-specific disclaimer | For updating PDF disclaimer text |

## Key Functions and Logic Blocks

### `page.tsx` (Main Calculator Page)

The main page contains several critical calculation blocks:

| Function/Block | Line Range (approx) | Purpose | When to Modify |
|----------------|---------------------|---------|----------------|
| `semesterGPAInfo` (useMemo) | ~1000-1040 | Calculates semester GPA from current planner courses | For changes to semester GPA calculation logic |
| `projectedGPAInfo` (useMemo) | ~1042-1140 | Calculates projected cumulative GPA | For changes to projected GPA calculation logic |
| `requiredSemesterInfo` (useMemo) | ~1141-1270 | Calculates required semester GPA to reach target | For changes to target GPA calculation logic |
| `handlePlannerChange` | ~690-750 | Manages course planner changes | For modifying course edit behavior |
| `handleAddCourse` | ~751-777 | Adds new courses to planner | For changing course addition logic |
| `handleRemoveCourse` | ~778-790 | Removes courses from planner | For modifying course removal behavior |
| `handleResetPlanner` | ~791-838 | Resets planner to initial state | For changing reset behavior |
| `fetchStudentAccessData` | ~373-500 | Fetches student data from API | For modifying student data retrieval |
| `handleShare` | ~1305-1371 | Generates shareable link | For modifying share functionality |

### `GpaResultsCard.tsx` Component

| Function/Block | Line Range (approx) | Purpose | When to Modify |
|----------------|---------------------|---------|----------------|
| `GpaResultsCardProps` interface | ~8-36 | Defines props structure | When changing data passed to component |
| `formatGPA` | ~65-70 | Formats GPA to three decimal places | For changing GPA number formatting |
| `extractGpaNumber` | ~71-95 | Extracts GPA from display strings | For modifying GPA text parsing |
| `extractSemesterCredits` | ~113-138 | Extracts credit info from display strings | For changing credit display parsing |
| `isGpaOverFour` | ~139-153 | Checks if GPA exceeds 4.0 | For modifying GPA warning threshold |
| Tab Content JSX | ~206-350 | Tab content rendering | For changing tab content display |

### `PDFGenerator.tsx` Component

| Function/Block | Line Range (approx) | Purpose | When to Modify |
|----------------|---------------------|---------|----------------|
| `PDFGeneratorProps` interface | ~13-52 | Defines props structure | When changing data passed to component |
| `usePDFGenerator` hook | ~59-520 | React hook version for PDF generation | For modifying PDF generation within React components |
| `generatePDF` function | ~521-993 | Standalone PDF generation function | For modifying PDF generation outside React |
| `extractGpaNumber` | ~78-98 | Extracts GPA values from text | For changing GPA parsing in PDFs |

## Common Tasks Reference

### Modifying GPA Display Format

1. Locate the relevant tab in `GpaResultsCard.tsx` (Semester, Projected, or Target)
2. Modify the JSX structure in the corresponding section
3. If changing number formatting, check `formatGPA` function

### Changing Calculation Logic

1. Find the appropriate calculation block in `page.tsx`:
   - `semesterGPAInfo` useMemo for Semester GPA
   - `projectedGPAInfo` useMemo for Projected Cumulative GPA
   - `requiredSemesterInfo` useMemo for Target/Required GPA
2. Modify the calculation logic within the block
3. Test thoroughly with various scenarios

### Modifying PDF Reports

1. Open `PDFGenerator.tsx`
2. Locate `continueWithPdfGeneration` function (~156)
3. Modify the PDF layout and content as needed

### Adding New Analytics Events

1. Find `useAnalytics.ts` in the hooks directory
2. Add new event tracking function if needed
3. Call the tracking function where the event occurs

### Adding or Modifying Feature Text

For UI elements visible to users:
1. Find the relevant component in `/src/components` or section in `page.tsx`
2. Update the text in JSX elements

For disclaimers or configurable text:
1. Check if the text comes from an API endpoint (look for API calls)
2. If so, modify the corresponding route in `/src/app/api/`

## Important Calculation Rules

### Semester GPA Calculation
- Only includes courses with GPA-affecting grades
- Calculated as: (sum of grade points × credits) / (sum of credits)

### Projected Cumulative GPA Calculation
- Adjusts base data (from Students sheet) by:
  - Removing previous points for all repeats
  - Removing previous credits only for P-repeats
  - Adding net points/credits from planner courses

### Target GPA (Required Semester GPA) Calculation
1. Identifies relevant planner courses (excludes W, E, I, IP, and non-repeat P)
2. Calculates adjusted base points/credits
3. Calculates final cumulative credits
4. Determines required semester points
5. Calculates semester divisor credits
6. Calculates required semester GPA
7. Handles special cases (zero credits, impossible GPAs)

## External Data Sources

### Google Sheets Structure

The application relies on Google Sheets with the following structure:

| Sheet Name | Purpose | Key Columns |
|------------|---------|-------------|
| `Students` | Student records | `DegStudentNo`, `Email`, `DegCumActualCredits`, `DegCumPoints`, `DegCumMajorCredits`, `DegCumMajorPoints`, `Note` |
| `registration` | Course registrations | `DegStudentNo`, `CatalogKey`, `Credits`, `RegGrade`, `MajorCourse`, `Rpeat`, `PrevGrade` |
| `Gradescale` | Grade definitions | `Grade`, `Point`, `Note`, `AffectsGPA` |
| `Class Access` | Access control | `FacEmail`, `Department`, `Faculty`, `AccessAllStudents`, `Student` |
| `Config` | Configuration values | Various configuration settings |

### API Implementation Details

The application implements server-side API routes in `/src/app/api/` to:
1. Authenticate users with NextAuth and Google OAuth
2. Fetch data from Google Sheets using Google API
3. Process feedback submissions
4. Track analytics in a database
5. Provide text content for disclaimers

## Deployment and Environment

### Vercel Deployment

The application is designed for deployment on Vercel with these configuration aspects:

1. **Environment Variables**: Required variables must be set in Vercel project settings
2. **Build Settings**: Uses default Next.js build settings
3. **Serverless Functions**: API routes are deployed as serverless functions
4. **Edge Configuration**: Not currently used, but available for future enhancements

### Local Development Setup

To set up a local development environment:

1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env.local` with required environment variables
4. Run the development server: `npm run dev`

### Build and Version System

The application uses a custom versioning system:

1. **Version Format**: Semantic versioning (MAJOR.MINOR.PATCH)
2. **Auto-incrementing**: PATCH version auto-increments on production builds
3. **Build Information**: Version number, build date, and commit hash are tracked
4. **Environment Access**: Build info is accessible via environment variables
5. **Version Management**: 
   - `npm run update-version`: Updates version number without committing changes
   - `npm run prepush`: Updates version number AND creates a commit with message "Bump version to X.Y.Z"
   - Regular `git commit` and `git push` commands: Do NOT affect version numbers

### Git Workflow

When working with the repository:

1. Make code changes locally
2. Review changes before committing
3. Use descriptive commit messages that explain changes
4. For version increments, use the provided npm scripts
5. Test thoroughly before pushing to the repository
6. Consider creating feature branches for significant changes

## Troubleshooting Guide

### Common Issues and Solutions

| Issue | Potential Causes | Troubleshooting Steps |
|-------|------------------|----------------------|
| Authentication failure | Invalid credentials, misconfigured OAuth | Check Google client ID/secret, verify Google API console settings |
| "Student not found" error | Email not in Students sheet, network issue | Verify email in sheet, check network requests, examine API response |
| Grade scale not loading | API error, sheet access issue | Check Gradescale sheet permissions, examine network requests |
| PDF generation error | UI state incomplete, jsPDF issues | Ensure all required data is available, check for null/undefined values |
| Analytics tracking failure | Database connection issues | Check DATABASE_URL, verify connection in analytics.ts |
| Advisor selection not working | Class Access sheet issues | Verify Class Access sheet format and permissions |
| Shareable link issues | Base URL configuration | Check Config sheet for baseUrl setting |
| Duplicate page detection | Multiple files resolving to same route | Look for duplicate files (e.g., pages/not-found.tsx and pages/not-found.js both resolving to /not-found) |
| Module build failures | Incompatible Node.js imports | Check for "node:" scheme imports that may need to be modified for browser compatibility |
| Fast Refresh errors | Runtime errors in React components | Check component lifecycle methods and effect dependencies for errors |

### Runtime Error Handling

The application implements error handling at several levels:

1. **API Routes**: Try/catch blocks with appropriate status codes
2. **React Components**: Error states for async operations
3. **Data Fetching**: Status tracking (`idle`, `loading`, `success`, `error`)
4. **Form Validation**: Input validation to prevent calculation errors
5. **Next.js Build Issues**: Watch for webpack caching errors in development that may require clearing the .next cache

### Performance Considerations

Key performance optimization strategies:

1. **Memoization**: React `useMemo` for expensive calculations
2. **Conditional Rendering**: Components render only when data is ready
3. **GPA Calculations**: Optimized to avoid redundant operations
4. **Data Fetching**: Sheets API calls minimized and cached where possible
5. **Development Mode**: Be aware that development mode may show different performance characteristics than production builds

## Extension Points

Areas where the application is designed for extension:

### Database Migration Path

The application has a planned migration path from Google Sheets to databases:

1. **Current State**: Uses Google Sheets for all data
2. **Target Architecture**: Will use relational database (MySQL/PostgreSQL)
3. **Implementation Strategy**: Environment variables to switch data sources
4. **Database Schema**: Matches current sheet structure

### Analytics System

The analytics system can be extended by:

1. Adding new event types to `useAnalytics.ts`
2. Ensuring proper database schema updates
3. Implementing administrative dashboard features

### Feature Flags

The application uses environment variables as basic feature flags:

1. `ENABLE_ANALYTICS`: Controls analytics tracking
2. `ENABLE_FEEDBACK`: Controls feedback submission feature

## Development Workflow Tips

1. For UI changes, start with the component in `/src/components` or the section in `page.tsx`
2. For calculation logic changes, focus on the useMemo blocks in `page.tsx`
3. For data retrieval changes, look at the API routes in `/src/app/api/`
4. Always test changes with various scenarios, particularly edge cases
5. Check the Requirements document for detailed specification references

## Common Feature Locations

- **Authentication Logic**: `/src/app/api/auth/` and auth-related code in `page.tsx`
- **GPA Display Formatting**: `GpaResultsCard.tsx` and formatting functions
- **PDF Report Generation**: `PDFGenerator.tsx`
- **Data Fetching**: API calls in `page.tsx` and API routes in `/src/app/api/`
- **Course Management**: Course-related handlers in `page.tsx`
- **Target GPA Logic**: `requiredSemesterInfo` useMemo block in `page.tsx`

This guide should help quickly identify the relevant parts of the code for specific changes without having to search through the entire codebase line by line. 