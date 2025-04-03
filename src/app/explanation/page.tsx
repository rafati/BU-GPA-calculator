// src/app/explanation/page.tsx
'use client'; // This page needs client-side hooks for search params

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react'; // Ensure useMemo is imported

// --- Re-define Interfaces needed for type safety ---
// (Ideally, move these to a shared types file, e.g., src/types/index.ts)
interface GradeScaleRow { Grade: string; Point: number; Note: string; AffectsGPA: boolean; }
interface PlannerCourse { id: string; catalogKey: string; credits: number; selectedGrade: string | null; isMajor: boolean; isRepeat: boolean; previousGrade: string | null; originalCourseWasMajor?: boolean | null; } // Keep originalCourseWasMajor for data consistency if passed
// --- End Interfaces ---

export default function ExplanationPage() {
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(true);

    // State to hold the data passed from the main page
    const [calcData, setCalcData] = useState<{
        baseOverallCredits: number;
        baseOverallPoints: number; // Direct points (no /10)
        baseMajorCredits: number;
        baseMajorPoints: number;   // Direct points (no /10)
        plannerCourses: PlannerCourse[];
        gradeScale: GradeScaleRow[];
        targetOverall: number;
        targetMajor: number;
        // Include final results for verification
        currentOverallGPA: string;
        currentMajorGPA: string;
        semesterOverallGPA: string;
        semesterMajorGPA: string;
        projectedOverallGPA: string;
        projectedMajorGPA: string;
        requiredOverallDisplay: string;
        requiredMajorDisplay: string;

    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsLoading(true);
        setError(null);
        console.log("Explanation Page: useEffect triggered"); // Log effect trigger
        try {
            // --- Extract data from URL Search Parameters ---
             const baseOC = searchParams.get('bOC');
             const baseOP = searchParams.get('bOP');
             const baseMC = searchParams.get('bMC');
             const baseMP = searchParams.get('bMP');
             const planner = searchParams.get('planner');
             const scale = searchParams.get('scale');
             const targetO = searchParams.get('tO');
             const targetM = searchParams.get('tM');
             const currentOGPA = searchParams.get('cOGPA');
             const currentMGPA = searchParams.get('cMGPA');
             const semesterOGPA = searchParams.get('sOGPA');
             const semesterMGPA = searchParams.get('sMGPA');
             const projectedOGPA = searchParams.get('pOGPA');
             const projectedMGPA = searchParams.get('pMGPA');
             const requiredODisplay = searchParams.get('rODisplay');
             const requiredMDisplay = searchParams.get('rMDisplay');

             console.log("Raw URL Params:", { baseOC, baseOP, baseMC, baseMP, planner, scale, targetO, targetM }); // Log raw params

            // Validate and Parse
            if (!planner || !scale || !baseOC || !baseOP || !baseMC || !baseMP || !targetO || !targetM || !currentOGPA || !currentMGPA || !semesterOGPA || !semesterMGPA || !projectedOGPA || !projectedMGPA || !requiredODisplay || !requiredMDisplay) {
                 console.error("Missing one or more calculation data parameters in URL.");
                 throw new Error('Missing calculation data in URL.');
             }

            const parsedPlanner: PlannerCourse[] = JSON.parse(decodeURIComponent(planner));
            const parsedScale: GradeScaleRow[] = JSON.parse(decodeURIComponent(scale));
            console.log("Parsed Planner:", parsedPlanner); // Log parsed data
            console.log("Parsed Scale:", parsedScale); // Log parsed data

            const loadedData = {
                baseOverallCredits: parseInt(baseOC, 10) || 0,
                baseOverallPoints: parseFloat(baseOP) || 0,
                baseMajorCredits: parseInt(baseMC, 10) || 0,
                baseMajorPoints: parseFloat(baseMP) || 0,
                plannerCourses: parsedPlanner,
                gradeScale: parsedScale,
                targetOverall: parseFloat(targetO) || 0,
                targetMajor: parseFloat(targetM) || 0,
                currentOverallGPA: decodeURIComponent(currentOGPA),
                currentMajorGPA: decodeURIComponent(currentMGPA),
                semesterOverallGPA: decodeURIComponent(semesterOGPA),
                semesterMajorGPA: decodeURIComponent(semesterMGPA),
                projectedOverallGPA: decodeURIComponent(projectedOGPA),
                projectedMajorGPA: decodeURIComponent(projectedMGPA),
                requiredOverallDisplay: decodeURIComponent(requiredODisplay),
                requiredMajorDisplay: decodeURIComponent(requiredMDisplay),
            };
            setCalcData(loadedData);
            console.log("Explanation Page Data Parsed and Set:", loadedData);

        } catch (e: any) {
            console.error("Error parsing explanation data:", e);
            setError(`Failed to load or parse calculation details: ${e.message}`);
            setCalcData(null);
        } finally {
            setIsLoading(false);
        }
    }, [searchParams]);


    // --- Calculation Logic (Replicated Here for Display) ---
    const intermediateResults = useMemo(() => {
        if (!calcData) return null;

        const {
            baseOverallCredits, baseOverallPoints, baseMajorCredits, baseMajorPoints,
            plannerCourses, gradeScale, targetOverall, targetMajor
        } = calcData;

        // --- 1. Current GPA ---
        const calcCurrentGPA = (points: number, credits: number): string => {
            if (isNaN(points) || isNaN(credits) || credits <= 0) return "N/A";
            const gpa = points / credits; 
            return isNaN(gpa) ? "N/A" : gpa.toFixed(3);
        };
        const currentGPA_O = calcCurrentGPA(baseOverallPoints, baseOverallCredits);
        const currentGPA_M = calcCurrentGPA(baseMajorPoints, baseMajorCredits);

        // --- 2. Semester Planner GPA ---
        let semesterPts_O = 0, semesterCreds_O = 0, semesterPts_M = 0, semesterCreds_M = 0;
        plannerCourses.forEach(course => {
            const credits = course.credits || 0;
            const gradeInfo = gradeScale.find(gs => gs.Grade === course.selectedGrade);
            if (gradeInfo?.AffectsGPA) {
                const coursePoints = gradeInfo.Point * credits;
                semesterPts_O += coursePoints;
                semesterCreds_O += credits;
                if (course.isMajor) { semesterPts_M += coursePoints; semesterCreds_M += credits; }
            }
        });
        const semesterGPA_O = semesterCreds_O > 0 ? (semesterPts_O / semesterCreds_O).toFixed(3) : 'N/A';
        const semesterGPA_M = semesterCreds_M > 0 ? (semesterPts_M / semesterCreds_M).toFixed(3) : 'N/A';

        // --- 3. Projected Cumulative GPA Calculation (Breakdown for explanation) ---
        let projPointsRemoved_O = 0, projCreditsRemoved_O = 0;
        let projMajorPointsRemoved_M = 0, projMajorCreditsRemoved_M = 0;
        let projNetPtChange_O_NonP = 0, projNetPtChange_M_NonP = 0; // Points from non-P repeats
        let projNetPtChange_O_NonRepeat = 0, projNetPtChange_M_NonRepeat = 0; // Points from non-repeats
        let projNetCredAdd_O = 0, projNetCredAdd_M = 0; // Credits from non-repeats or non-GPA affecting repeats

        plannerCourses.forEach(course => {
             const credits = course.credits || 0;
             const isMajor = course.isMajor;
             const gradeInfo = gradeScale.find(gs => gs.Grade === course.selectedGrade);
             const affectsGPANew = gradeInfo?.AffectsGPA ?? false;

             if (course.isRepeat) {
                 const prevGradeInfo = gradeScale.find(gs => gs.Grade === course.previousGrade);
                 if (prevGradeInfo?.AffectsGPA) {
                      const wasOriginalMajor = course.originalCourseWasMajor ?? isMajor;
                      // P-Repeat Case
                      if (course.selectedGrade === 'P') {
                          projPointsRemoved_O += prevGradeInfo.Point * credits;
                          projCreditsRemoved_O += credits;
                          if (wasOriginalMajor) { projMajorPointsRemoved_M += prevGradeInfo.Point * credits; projMajorCreditsRemoved_M += credits; }
                      }
                      // Non-P Repeat Case
                      else {
                           const oldPoints = prevGradeInfo.Point;
                           const newPoints = (affectsGPANew && gradeInfo) ? gradeInfo.Point : 0;
                           const pointDifference = (newPoints - oldPoints) * credits;
                           projNetPtChange_O_NonP += pointDifference;
                           if (wasOriginalMajor) { projNetPtChange_M_NonP += pointDifference; }
                      }
                 } else if (affectsGPANew && gradeInfo) { // Previous didn't count, new does
                      projNetPtChange_O_NonRepeat += gradeInfo.Point * credits; // Treat as non-repeat for point change
                      projNetCredAdd_O += credits; // Adds credits
                      if (isMajor) { projNetPtChange_M_NonRepeat += gradeInfo.Point * credits; projNetCredAdd_M += credits; }
                  }
             } else { // Non-Repeats
                  if (affectsGPANew && gradeInfo) {
                      projNetPtChange_O_NonRepeat += gradeInfo.Point * credits;
                      projNetCredAdd_O += credits;
                      if (isMajor) { projNetPtChange_M_NonRepeat += gradeInfo.Point * credits; projNetCredAdd_M += credits; }
                  }
             }
        });
        // Final Projected Values
        const projFinalPts_O = baseOverallPoints + projNetPtChange_O_NonP + projNetPtChange_O_NonRepeat; // Removed points handled implicitly by difference or 0 pts for P
        const projFinalCreds_O = baseOverallCredits + projNetCredAdd_O - projCreditsRemoved_O;
        const projFinalPts_M = baseMajorPoints + projNetPtChange_M_NonP + projNetPtChange_M_NonRepeat;
        const projFinalCreds_M = baseMajorCredits + projNetCredAdd_M - projMajorCreditsRemoved_M;
        const projectedGPA_O = projFinalCreds_O > 0 ? (projFinalPts_O / projFinalCreds_O).toFixed(3) : 'N/A';
        const projectedGPA_M = projFinalCreds_M > 0 ? (projFinalPts_M / projFinalCreds_M).toFixed(3) : 'N/A';

         // --- 4. Required GPA Intermediate Steps ---
         let targetPointsToRemove = 0, targetCreditsToRemove = 0;
         let targetMajorPointsToRemove = 0, targetMajorCreditsToRemove = 0;
         let targetNetOverallCreditChange = 0, targetNetMajorCreditChange = 0;
         let targetRelevantPlannerCourses: PlannerCourse[] = [];

          plannerCourses.forEach(course => {
               const credits = course.credits || 0;
               const isMajor = course.isMajor;
               const gradeInfo = gradeScale.find(gs => gs.Grade === course.selectedGrade);
               const affectsGPANew = gradeInfo?.AffectsGPA ?? false;
               let isRelevant = true;
               if (['W', 'E', 'I', 'IP'].includes(course.selectedGrade ?? '')) { isRelevant = false; }
               else if (course.selectedGrade === 'P' && !course.isRepeat) { isRelevant = false; }

               if (isRelevant) {
                   targetRelevantPlannerCourses.push(course);
                   if (course.isRepeat) {
                       const prevGradeInfo = gradeScale.find(gs => gs.Grade === course.previousGrade);
                       if (prevGradeInfo?.AffectsGPA) {
                           targetPointsToRemove += prevGradeInfo.Point * credits;
                           const wasOriginalMajor = course.originalCourseWasMajor ?? isMajor;
                           if (wasOriginalMajor) { targetMajorPointsToRemove += prevGradeInfo.Point * credits; }
                           if (course.selectedGrade === 'P') { 
                               targetCreditsToRemove += credits;
                               if (wasOriginalMajor) { targetMajorCreditsToRemove += credits; }
                           }
                       }
                   } else { 
                       targetNetOverallCreditChange += credits;
                       if (isMajor) { targetNetMajorCreditChange += credits; }
                   }
               }
          });
            const targetAdjustedBaseOverallPts = baseOverallPoints - targetPointsToRemove;
            const targetAdjustedBaseOverallCreds = baseOverallCredits - targetCreditsToRemove;
            const targetAdjustedBaseMajorPts = baseMajorPoints - targetMajorPointsToRemove;
            const targetAdjustedBaseMajorCreds = baseMajorCredits - targetMajorCreditsToRemove;
            const targetFinalCumulativeOverallCredits = targetAdjustedBaseOverallCreds + targetNetOverallCreditChange;
            const targetFinalCumulativeMajorCredits = targetAdjustedBaseMajorCreds + targetNetMajorCreditChange;
            let targetDivisorCreditsOverall = 0, targetDivisorCreditsMajor = 0;
            targetRelevantPlannerCourses.forEach(course => {
                 const credits = course.credits || 0;
                 const gradeInfo = gradeScale.find(gs => gs.Grade === course.selectedGrade);
                 const affectsGPANew = gradeInfo?.AffectsGPA ?? false;
                 if (course.selectedGrade === null || affectsGPANew) {
                     targetDivisorCreditsOverall += credits;
                     if (course.isMajor) { targetDivisorCreditsMajor += credits; }
                 }
            });
            const targetRequiredTotalOverallPoints = targetOverall * targetFinalCumulativeOverallCredits;
            const targetRequiredSemesterPointsOverall = targetRequiredTotalOverallPoints - targetAdjustedBaseOverallPts;
            const targetRequiredTotalMajorPoints = targetMajor * targetFinalCumulativeMajorCredits;
            const targetRequiredSemesterPointsMajor = targetRequiredTotalMajorPoints - targetAdjustedBaseMajorPts;
            let requiredOverallResultDisplay = "N/A", requiredMajorResultDisplay = "N/A";
            if (targetDivisorCreditsOverall > 0) {
                 const gpa = targetRequiredSemesterPointsOverall / targetDivisorCreditsOverall;
                 requiredOverallResultDisplay = `${gpa.toFixed(3)} (Based on ${targetDivisorCreditsOverall} GPA credits)`;
             } else if (!isNaN(targetRequiredSemesterPointsOverall)) {
                 requiredOverallResultDisplay = `${targetRequiredSemesterPointsOverall.toFixed(2)} points needed (over 0 GPA credits)`;
             }
             if (targetDivisorCreditsMajor > 0) {
                 const gpa = targetRequiredSemesterPointsMajor / targetDivisorCreditsMajor;
                 requiredMajorResultDisplay = `${gpa.toFixed(3)} (Based on ${targetDivisorCreditsMajor} Major GPA credits)`;
             } else if (!isNaN(targetRequiredSemesterPointsMajor)) {
                 requiredMajorResultDisplay = `${targetRequiredSemesterPointsMajor.toFixed(2)} points needed (over 0 Major GPA credits)`;
             }

        return {
            // Current
            currentGPA_O, currentGPA_M,
            // Semester
            semesterPts_O, semesterCreds_O, semesterPts_M, semesterCreds_M, semesterGPA_O, semesterGPA_M,
            // Projected Breakdown
            projPointsRemoved_O, projCreditsRemoved_O, projMajorPointsRemoved_M, projMajorCreditsRemoved_M,
            projNetPtChange_O_NonP, projNetPtChange_M_NonP, projNetPtChange_O_NonRepeat, projNetPtChange_M_NonRepeat,
            projNetCredAdd_O, projNetCredAdd_M,
            projFinalPts_O, projFinalCreds_O, projFinalPts_M, projFinalCreds_M, projectedGPA_O, projectedGPA_M,
            // Required Breakdown
            targetPointsToRemove, targetCreditsToRemove, targetMajorPointsToRemove, targetMajorCreditsToRemove,
            targetNetOverallCreditChange, targetNetMajorCreditChange,
            targetAdjustedBaseOverallPts, targetAdjustedBaseMajorPts,
            targetFinalCumulativeOverallCredits, targetFinalCumulativeMajorCredits,
            targetDivisorCreditsOverall, targetDivisorCreditsMajor,
            targetRequiredTotalOverallPoints, targetRequiredSemesterPointsOverall,
            targetRequiredTotalMajorPoints, targetRequiredSemesterPointsMajor,
            requiredOverallResultDisplay, requiredMajorResultDisplay
        };

    }, [calcData]); // Depend ONLY on calcData, which includes everything (base, planner, scale, targets)


    // --- Render Logic ---
    if (isLoading) {
        return <div className="min-h-screen p-8 text-center">Loading calculation details...</div>;
    }

    if (error) {
        return (
            <div className="min-h-screen p-8">
                 <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Details</h1>
                 <p className="text-red-700 mb-6">{error}</p>
                 <a href="/" className="text-bu-blue hover:underline">Go back to Calculator</a>
             </div>
        );
    }

    if (!calcData || !intermediateResults) {
        return <div className="min-h-screen p-8 text-center">Could not load calculation data.</div>;
    }

    // --- Main Display: Apply Tailwind and BU Theme ---
    return (
        // Use similar base styling as main page
        <div className="min-h-screen p-4 md:p-8 bg-gray-100 text-gray-900">
            {/* Header */}
            <header className="mb-8 pb-4 border-b border-gray-300">
                <h1 className="text-2xl md:text-3xl font-bold text-bu-blue">Calculation Details</h1>
            </header>

             {/* Main Content Area */}
             <div className="space-y-8">
                
                {/* Section 1: Base Data Used */}
                 <section className="p-4 border bg-white rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold text-bu-blue mb-3 pb-2 border-b">1. Base Cumulative Data Used</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><span className="font-medium">Overall Credits:</span> {calcData.baseOverallCredits}</div>
                        <div><span className="font-medium">Overall Points:</span> {calcData.baseOverallPoints.toFixed(2)}</div>
                        <div><span className="font-medium">Major Credits:</span> {calcData.baseMajorCredits}</div>
                        <div><span className="font-medium">Major Points:</span> {calcData.baseMajorPoints.toFixed(2)}</div>
                    </div>
                     <p className="text-xs text-gray-600 mt-3"><em>(Calculated Current Overall GPA: {intermediateResults.currentGPA_O}, Major GPA: {intermediateResults.currentGPA_M} - Verification: {calcData.currentOverallGPA} / {calcData.currentMajorGPA})</em></p>
                 </section>

                {/* Section 2: Planner State */}
                 <section className="p-4 border bg-white rounded-lg shadow-sm">
                     <h2 className="text-xl font-semibold text-bu-blue mb-3 pb-2 border-b">2. Planner State Used</h2>
                     {calcData.plannerCourses.length > 0 ? (
                         <table className="min-w-full divide-y divide-gray-200 text-sm">
                             <thead className="bg-gray-50">
                                 <tr>
                                     <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Course</th>
                                     <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Credits</th>
                                     <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Grade</th>
                                     <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">Major?</th>
                                     <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">Repeat?</th>
                                     <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Prev.Grade</th>
                                 </tr>
                             </thead>
                             <tbody className="bg-white divide-y divide-gray-200">
                                 {calcData.plannerCourses.map(course => (
                                     <tr key={`exp-${course.id}`}>
                                         <td className="px-3 py-2 whitespace-nowrap">{course.catalogKey}</td>
                                         <td className="px-3 py-2 whitespace-nowrap">{course.credits}</td>
                                         <td className="px-3 py-2 whitespace-nowrap">{course.selectedGrade ?? '-'}</td>
                                         <td className="px-3 py-2 text-center">{course.isMajor ? 'Yes' : 'No'}</td>
                                         <td className="px-3 py-2 text-center">{course.isRepeat ? 'Yes' : 'No'}</td>
                                         <td className="px-3 py-2 whitespace-nowrap">{course.previousGrade ?? '-'}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     ) : (
                         <p className="text-gray-600">No courses in planner.</p>
                     )}
                     <p className="text-xs text-gray-600 mt-3"><em>(Calculated Semester Overall GPA: {intermediateResults.semesterGPA_O} [{intermediateResults.semesterCreds_O} credits], Major GPA: {intermediateResults.semesterGPA_M} [{intermediateResults.semesterCreds_M} credits] - Verification: {calcData.semesterOverallGPA} / {calcData.semesterMajorGPA})</em></p>
                 </section>

                 {/* Section 3: Projected GPA Calculation Steps */}
                 <section className="p-4 border bg-white rounded-lg shadow-sm">
                     <h2 className="text-xl font-semibold text-bu-blue mb-3 pb-2 border-b">3. Projected Cumulative GPA Calculation</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                         {/* Overall */}
                         <div className="border-b pb-2 mb-2 md:border-b-0 md:pb-0 md:mb-0">
                             <h3 className="font-medium mb-1">Overall Projection:</h3>
                             <p>Base Points: {calcData.baseOverallPoints.toFixed(2)}</p>
                             <p>+ Net Points (Non-P Repeats): {intermediateResults.projNetPtChange_O_NonP.toFixed(2)}</p>
                             <p>+ Net Points (Non-Repeats): {intermediateResults.projNetPtChange_O_NonRepeat.toFixed(2)}</p>
                             <p className="font-semibold">= Final Projected Points: {intermediateResults.projFinalPts_O.toFixed(2)}</p>
                             <hr className="my-1"/>
                             <p>Base Credits: {calcData.baseOverallCredits}</p>
                             <p>+ Net Credits Added: {intermediateResults.projNetCredAdd_O.toFixed(2)}</p>
                             <p>- Credits Removed (P-Repeats): {intermediateResults.projCreditsRemoved_O.toFixed(2)}</p>
                             <p className="font-semibold">= Final Projected Credits: {intermediateResults.projFinalCreds_O.toFixed(2)}</p>
                             <p className="font-bold mt-1">Projected Overall GPA: {intermediateResults.projectedGPA_O} (Verification: {calcData.projectedOverallGPA})</p>
                         </div>
                          {/* Major */}
                          <div>
                             <h3 className="font-medium mb-1">Major Projection:</h3>
                             <p>Base Points: {calcData.baseMajorPoints.toFixed(2)}</p>
                             <p>+ Net Points (Non-P Repeats): {intermediateResults.projNetPtChange_M_NonP.toFixed(2)}</p>
                             <p>+ Net Points (Non-Repeats): {intermediateResults.projNetPtChange_M_NonRepeat.toFixed(2)}</p>
                             <p className="font-semibold">= Final Projected Points: {intermediateResults.projFinalPts_M.toFixed(2)}</p>
                             <hr className="my-1"/>
                             <p>Base Credits: {calcData.baseMajorCredits}</p>
                             <p>+ Net Credits Added: {intermediateResults.projNetCredAdd_M.toFixed(2)}</p>
                             <p>- Credits Removed (P-Repeats): {intermediateResults.projMajorCreditsRemoved_M.toFixed(2)}</p>
                              <p className="font-semibold">= Final Projected Credits: {intermediateResults.projFinalCreds_M.toFixed(2)}</p>
                              <p className="font-bold mt-1">Projected Major GPA: {intermediateResults.projectedGPA_M} (Verification: {calcData.projectedMajorGPA})</p>
                         </div>
                     </div>
                 </section>

                 {/* Section 4: Required GPA Calculation Steps */}
                 <section className="p-4 border bg-white rounded-lg shadow-sm">
                     <h2 className="text-xl font-semibold text-bu-blue mb-3 pb-2 border-b">4. Required Semester GPA Calculation (Target {calcData.targetOverall.toFixed(2)} / {calcData.targetMajor.toFixed(2)})</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                         {/* Overall */}
                          <div className="border-b pb-2 mb-2 md:border-b-0 md:pb-0 md:mb-0">
                              <h3 className="font-medium mb-1">Overall Requirement:</h3>
                             <p>Base Points: {calcData.baseOverallPoints.toFixed(2)}</p>
                             <p>- Points Removed (All Repeats): {intermediateResults.targetPointsToRemove.toFixed(2)}</p>
                             <p className="font-semibold">= Adjusted Base Points: {intermediateResults.targetAdjustedBaseOverallPts.toFixed(2)}</p>
                              <hr className="my-1"/>
                             <p>Base Credits: {calcData.baseOverallCredits}</p>
                              <p>- Credits Removed (P-Repeats): {intermediateResults.targetCreditsToRemove.toFixed(2)}</p>
                              <p>+ Net Credits Added (Non-Repeats): {intermediateResults.targetNetOverallCreditChange.toFixed(2)}</p>
                              <p className="font-semibold">= Final Cumulative Credits: {intermediateResults.targetFinalCumulativeOverallCredits.toFixed(2)}</p>
                              <hr className="my-1"/>
                              <p>Total Points Needed (Target {calcData.targetOverall.toFixed(2)} x Final Credits): {intermediateResults.targetRequiredTotalOverallPoints.toFixed(2)}</p>
                              <p>= Required Semester Points: {intermediateResults.targetRequiredSemesterPointsOverall.toFixed(2)}</p>
                              <p>/ Semester Divisor Credits: {intermediateResults.targetDivisorCreditsOverall}</p>
                              <p className="font-bold mt-1">= Required Semester GPA: {intermediateResults.requiredOverallResultDisplay} (Verification: {calcData.requiredOverallDisplay})</p>
                          </div>
                         {/* Major */}
                          <div>
                              <h3 className="font-medium mb-1">Major Requirement:</h3>
                              <p>Base Points: {calcData.baseMajorPoints.toFixed(2)}</p>
                              <p>- Points Removed (All Repeats): {intermediateResults.targetMajorPointsToRemove.toFixed(2)}</p>
                              <p className="font-semibold">= Adjusted Base Points: {intermediateResults.targetAdjustedBaseMajorPts.toFixed(2)}</p>
                              <hr className="my-1"/>
                              <p>Base Credits: {calcData.baseMajorCredits}</p>
                               <p>- Credits Removed (P-Repeats): {intermediateResults.targetMajorCreditsToRemove.toFixed(2)}</p>
                               <p>+ Net Credits Added (Non-Repeats): {intermediateResults.targetNetMajorCreditChange.toFixed(2)}</p>
                               <p className="font-semibold">= Final Cumulative Credits: {intermediateResults.targetFinalCumulativeMajorCredits.toFixed(2)}</p>
                               <hr className="my-1"/>
                               <p>Total Points Needed (Target {calcData.targetMajor.toFixed(2)} x Final Credits): {intermediateResults.targetRequiredTotalMajorPoints.toFixed(2)}</p>
                               <p>= Required Semester Points: {intermediateResults.targetRequiredSemesterPointsMajor.toFixed(2)}</p>
                               <p>/ Semester Divisor Credits: {intermediateResults.targetDivisorCreditsMajor}</p>
                               <p className="font-bold mt-1">= Required Semester GPA: {intermediateResults.requiredMajorResultDisplay} (Verification: {calcData.requiredMajorDisplay})</p>
                          </div>
                     </div>
                 </section>
             </div>
        </div>
    );
}