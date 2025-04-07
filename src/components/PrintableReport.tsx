import React from 'react';

interface PrintableReportProps {
  studentId: string;
  baseData: {
    overallCredits: string | number;
    overallPoints: string | number;
    overallGPA: string | number;
    majorCredits: string | number;
    majorPoints: string | number;
    majorGPA: string | number;
  };
  semesterGPAInfo: any;
  projectedGPAInfo: any;
  targetOverallGPAInput: string;
  targetMajorGPAInput: string;
  requiredSemesterInfo: any;
  plannerCourses: any[];
  disclaimerText: string;
}

const PrintableReport: React.FC<PrintableReportProps> = ({
  studentId,
  baseData,
  semesterGPAInfo,
  projectedGPAInfo,
  targetOverallGPAInput,
  targetMajorGPAInput,
  requiredSemesterInfo,
  plannerCourses,
  disclaimerText
}) => {
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = currentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Helper function to extract semester credits from display strings
  const extractSemesterCredits = (displayString: string): string => {
    const matches = displayString?.match(/Based on (\d+) (?:Major )?GPA credits/);
    return matches ? matches[1] : "0";
  };

  const semesterOverallCredits = extractSemesterCredits(requiredSemesterInfo?.overallDisplay || '');
  const semesterMajorCredits = extractSemesterCredits(requiredSemesterInfo?.majorDisplay || '');

  // Safely format GPA values to 3 decimal places
  const formatGPA = (value: any): string => {
    if (value === 'N/A' || value === undefined || value === null) return 'N/A';
    return parseFloat(value).toFixed(3);
  };

  return (
    <div className="print-page">
      {/* Header with logo and title */}
      <div className="print-header">
        <div className="print-date">{formattedDate}, {formattedTime}</div>
        <div className="print-title">Bethlehem University GPA Calculator</div>
      </div>

      {/* Student info */}
      <div className="print-student-info">
        <div className="print-university-logo">
          <img src="/BU-logo-small.png" alt="Bethlehem University Logo" />
          <div className="print-logo-text">
            <div>Bethlehem University</div>
            <div>Registrar Office</div>
            <div className="print-arabic">مكتب التسجيل</div>
          </div>
        </div>
        <div className="print-student-id">
          <strong>Student ID: {studentId || 'N/A'}</strong>
        </div>
      </div>

      <hr className="print-hr" />

      {/* Three-column layout */}
      <div className="print-columns">
        {/* Base data */}
        <div className="print-column">
          <h3 className="print-column-header">Base Cumulative Data</h3>
          <div className="print-data-row">
            <div className="print-label">Overall Credits:</div>
            <div className="print-value">{Math.round(Number(baseData.overallCredits) || 0)}</div>
          </div>
          <div className="print-data-row">
            <div className="print-label">Overall Points:</div>
            <div className="print-value">{baseData.overallPoints}</div>
          </div>
          <div className="print-data-row">
            <div className="print-label">Overall GPA:</div>
            <div className="print-value">{formatGPA(baseData.overallGPA)}</div>
          </div>
          <div className="print-data-row">
            <div className="print-label">Major Credits:</div>
            <div className="print-value">{Math.round(Number(baseData.majorCredits) || 0)}</div>
          </div>
          <div className="print-data-row">
            <div className="print-label">Major Points:</div>
            <div className="print-value">{baseData.majorPoints}</div>
          </div>
          <div className="print-data-row">
            <div className="print-label">Major GPA:</div>
            <div className="print-value">{formatGPA(baseData.majorGPA)}</div>
          </div>
        </div>

        {/* Projected results */}
        <div className="print-column">
          <h3 className="print-column-header">Projected Results</h3>
          <div className="print-data-row">
            <div className="print-label">Semester Overall GPA:</div>
            <div className="print-value">{formatGPA(semesterGPAInfo.overallGPA)}</div>
          </div>
          <div className="print-data-row">
            <div className="print-label">Semester Credits:</div>
            <div className="print-value">{Math.round(Number(semesterGPAInfo.overallCredits) || 0)}</div>
          </div>
          <div className="print-data-row">
            <div className="print-label">Semester Major GPA:</div>
            <div className="print-value">{formatGPA(semesterGPAInfo.majorGPA)}</div>
          </div>
          <div className="print-data-row">
            <div className="print-label">Semester Major Credits:</div>
            <div className="print-value">{Math.round(Number(semesterGPAInfo.majorCredits) || 0)}</div>
          </div>
          <div className="print-data-row">
            <div className="print-label">Projected Overall GPA:</div>
            <div className="print-value">{formatGPA(projectedGPAInfo.overallGPA)} ({Math.round(Number(projectedGPAInfo.finalOverallCredits) || 0)} credits)</div>
          </div>
          <div className="print-data-row">
            <div className="print-label">Projected Major GPA:</div>
            <div className="print-value">{formatGPA(projectedGPAInfo.majorGPA)} ({Math.round(Number(projectedGPAInfo.finalMajorCredits) || 0)} credits)</div>
          </div>
        </div>

        {/* Target GPAs */}
        <div className="print-column">
          <h3 className="print-column-header">Target GPAs</h3>
          <div className="print-data-row">
            <div className="print-label">Target Overall GPA:</div>
            <div className="print-value">{Number(targetOverallGPAInput || 2.0).toFixed(1)}</div>
          </div>
          <div className="print-data-row">
            <div className="print-label">Target Major GPA:</div>
            <div className="print-value">{Number(targetMajorGPAInput || 2.0).toFixed(1)}</div>
          </div>
          
          <h4 className="print-subheader">Required Semester GPA</h4>
          
          <div className="print-data-row">
            <div className="print-label">Overall:</div>
            <div className="print-value">
              {requiredSemesterInfo.overallDisplay?.includes('points needed') 
                ? requiredSemesterInfo.overallDisplay 
                : `${formatGPA(requiredSemesterInfo.overallDisplay)} (Based on ${semesterOverallCredits} GPA credits)`
              }
            </div>
          </div>
          <div className="print-data-row">
            <div className="print-label">Major:</div>
            <div className="print-value">
              {requiredSemesterInfo.majorDisplay?.includes('points needed') 
                ? requiredSemesterInfo.majorDisplay 
                : `${formatGPA(requiredSemesterInfo.majorDisplay)} (Based on ${semesterMajorCredits} Major GPA credits)`
              }
            </div>
          </div>
          
          <div className="print-data-row print-small-text">
            <div className="print-info">(Based on {Number(requiredSemesterInfo.finalCumulativeOverallCredits).toFixed(1) || 0} final overall credits and {Number(requiredSemesterInfo.finalCumulativeMajorCredits).toFixed(1) || 0} final major credits)</div>
          </div>
        </div>
      </div>

      {/* Course planner */}
      <h3 className="print-table-header">Course Planner</h3>
      <table className="print-table">
        <thead>
          <tr>
            <th>COURSE</th>
            <th>CREDITS</th>
            <th>GRADE</th>
            <th>MAJOR?</th>
            <th>REPEAT?</th>
            <th>PREV.GRADE</th>
          </tr>
        </thead>
        <tbody>
          {plannerCourses.map((course, index) => (
            <tr key={index}>
              <td>{course.catalogKey || course.id}</td>
              <td>{course.credits}</td>
              <td>{course.selectedGrade || '-'}</td>
              <td>{course.isMajor ? 'Yes' : 'No'}</td>
              <td>{course.isRepeat ? 'Yes' : 'No'}</td>
              <td>{course.isRepeat ? (course.previousGrade || '-') : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Compact disclaimer */}
      <div className="print-disclaimer">
        Disclaimer: This GPA calculator is an unofficial tool provided for planning and estimation purposes only. Students are strongly encouraged to consult their academic advisor and refer to the official University Catalog for definitive degree requirements.
      </div>
      
      <div className="print-page-info">
        <span>Printed on: {formattedDate}, {formattedTime}</span>
        <span className="print-page-number">1/1</span>
      </div>
    </div>
  );
};

export default PrintableReport; 