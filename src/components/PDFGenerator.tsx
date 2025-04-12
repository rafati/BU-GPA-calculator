import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// Add university logo as a base64 string to avoid dependencies on external files
// Simple placeholder logo - small PNG with "BU" text
const BU_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAADUElEQVR4nO2ZW4hNURjHf3Mww3AbjBgul4gyl0dE8qDGAw9EKbfUA1HiQe4JJVFKHlAeiDQPGiMPRjOUcn/iAbmFS24xl+E8+Fbs2p199j7HOntPZ+avb529vrXW/u/vXd+31trbUaKSbNSl8n6gK1AF7AHGAPuATNQdE/HnEuAoMDLiXVcDrZlEoq49sAhoKXwvAG4BjUHfRZkFoBWwMjDt8eijMDybjzJRdx9oE/PeK+CXlRQR+BXoFdPmOzDAShIRJ4HxMW3qgIlWkogEKgAXgZ4xbTYDJ9JWEhERAUYBzwXt3gCrE9m0NwohYTjAVGCIoE0Pdae0nYQWhZToJSSlXJO2E29AkpLYpmKwQwQnO4D3gvsuAV2A79J7LCUyKfHbgBARWAw8FfTzFlgeWZOCSdPiKQeOlYCQNcAdQR+1sSk5DUPRy4EhZWgsCXfNB94J7n0RUc4wJV7VwHHQHcT9wCvBfaeBdsVWQrOBlAu0B9YBNwXXK2NrVJ6ZlApYFBt2Aa8F1y4BT4L36sA10+ZiSlGlGjhpZHOBSQ5qXa1OYes6cMbEgSshJZ4RlNI3ZmLAJeBZJLt1gEnAdpXGhJl4LgL9BXbPAduAtTH9uBH9lLxGsX2AlcB0Qd9vgOFRg2qNGTLhS8CkcBFZGnKpfA5wHbiDTDU1s/C5XwXMTKhHJvCnB5iJKnw8bFJvFfBdoEdtTD9VJoXXg25Zio5qIitVSpS+Q+aG9LsY2BljY5zJlOoDOz5HSCXEiww0RQykm+pDcN/zwEvhIAfLWklY6hSLkMrAjG9Kb5jR34H2wb3dwmTzQkmSPgOPBHavVVODtVMDawkMBcYBg1Sar2ImPkXmBKLO6uPQZEY5H5+VD2eBGqCx6GRKrNQfYqtNqlVpzL0JV/0Ezgv6qFGRvqhkSmJEhUhTBfa6GjvLTGa0xERr1Spc6nUW+yEZ5RJm1L9LizPhgB8y5B1JTUbFbG+p1yZQRj21+tGD711pkpxw+C3yBkTFdlNgbvg1eaDnAO9UEFVBuI/0PYVoSHhS7UGk7i1MJdor2+eFcm2q4uYpj4xvZL1ybaqqwTTlBWHbNfP2w+fA+wuCRb+NNOzRFQAAAABJRU5ErkJggg==";

// Define types for props
interface PDFGeneratorProps {
  studentId?: string;
  baseData: {
    overallCredits: string | number;
    overallPoints: string | number;
    overallGPA: string | number;
    majorCredits: string | number;
    majorPoints: string | number;
    majorGPA: string | number;
  };
  semesterGPA: {
    overallGPA: string | number;
    overallCredits: number;
    majorGPA: string | number;
    majorCredits: number;
  };
  projectedGPA: {
    overallGPA: string | number;
    finalOverallCredits: number;
    majorGPA: string | number;
    finalMajorCredits: number;
  };
  targetGPA: {
    overall: string | number;
    major: string | number;
  };
  requiredSemesterInfo: any;
  courses: Array<{
    id?: string;
    catalogKey?: string;
    credits: number;
    selectedGrade: string | null;
    isMajor: boolean;
    isRepeat: boolean;
    previousGrade?: string | null;
  }>;
  disclaimer: string;
}

// Helper functions
const parseFloatOrDefault = (value: string | number | undefined | null, defaultValue = 0): number => {
  if (value === undefined || value === null) return defaultValue;
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(parsed) ? defaultValue : parsed;
};

export const usePDFGenerator = ({
  studentId,
  baseData,
  semesterGPA,
  projectedGPA,
  targetGPA,
  requiredSemesterInfo,
  courses,
  disclaimer
}: PDFGeneratorProps) => {
  
  // Extract semester credits from display strings
  const extractSemesterCredits = (displayString?: string): string => {
    if (!displayString) return "0";
    const matches = displayString.match(/Based on (\d+) (?:Major )?GPA credits/);
    return matches ? matches[1] : "0";
  };
  
  // Extract GPA values from display strings
  const extractGpaNumber = (displayString?: string): { value: string, isNegative: boolean } => {
    if (!displayString) return { value: "N/A", isNegative: false };
    
    if (displayString.includes('points needed')) {
      const pointsMatch = displayString.match(/([-]?\d+\.\d+) points needed/);
      if (pointsMatch) {
        const value = `${pointsMatch[1]} points`;
        return { value, isNegative: parseFloat(pointsMatch[1]) < 0 };
      }
    }
    
    const matches = displayString.match(/([-]?\d+\.\d+)/);
    if (!matches) return { value: "N/A", isNegative: false };
    
    const numericValue = parseFloat(matches[0]);
    return { 
      value: isNaN(numericValue) ? "N/A" : numericValue.toFixed(3),
      isNegative: numericValue < 0
    };
  };
  
  const generatePDF = (): void => {
    // Create new PDF document (A4 size)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    // Set document metadata
    doc.setProperties({
      title: `Bethlehem University GPA Calculator - ${studentId || 'Report'}`,
      subject: 'GPA Calculation Report',
      author: 'Bethlehem University',
      keywords: 'GPA, calculator, academic, record',
      creator: 'BU GPA Calculator'
    });
    
    // Define colors
    const colors = {
      primary: [0, 51, 102],      // Dark blue
      secondary: [153, 0, 0],     // Maroon
      accent: [0, 102, 51],       // Green
      lightGray: [240, 240, 240], // Background color
      mediumGray: [150, 150, 150],// For secondary text
      warning: [204, 0, 0],       // Red for warnings/errors
      semesterGPA: [0, 120, 0],   // Green for semester GPA
      projectedGPA: [0, 0, 150],  // Blue for projected GPA
      targetGPA: [128, 0, 128]    // Purple for target GPA
    };
    
    // HEADER SECTION
    // Add university logo (would be replaced with actual logo in implementation)
    try {
      doc.addImage(BU_LOGO, 'PNG', 15, 10, 25, 25);
    } catch (error) {
      console.error('Failed to load logo:', error);
      // Continue without logo
    }
    
    // Add university name and report title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('Bethlehem University', 45, 20);
    doc.setFontSize(14);
    doc.text('GPA Calculator Report', 45, 28);
    
    // Add student info and date
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Student ID: ${studentId || 'N/A'}`, 15, 45);
    const currentDate = new Date();
    doc.text(`Generated: ${format(currentDate, 'dd MMM yyyy, HH:mm')}`, 130, 45);
    
    // Add horizontal divider
    doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.setLineWidth(0.5);
    doc.line(15, 48, 195, 48);
    
    // BASE DATA SECTION - Left column
    doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
    doc.rect(15, 55, 85, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('Base Cumulative Data', 17, 60);
    
    // Base data content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    // Create a table-like structure for base data
    const baseDataY = 65;
    doc.text('Overall Credits:', 17, baseDataY + 5);
    doc.text(`${Math.round(parseFloatOrDefault(baseData.overallCredits))}`, 60, baseDataY + 5);
    
    doc.text('Overall Points:', 17, baseDataY + 10);
    doc.text(`${parseFloatOrDefault(baseData.overallPoints).toFixed(1)}`, 60, baseDataY + 10);
    
    doc.text('Overall GPA:', 17, baseDataY + 15);
    doc.setFont('helvetica', 'bold');
    doc.text(`${parseFloatOrDefault(baseData.overallGPA).toFixed(3)}`, 60, baseDataY + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Major Credits:', 17, baseDataY + 25);
    doc.text(`${Math.round(parseFloatOrDefault(baseData.majorCredits))}`, 60, baseDataY + 25);
    
    doc.text('Major Points:', 17, baseDataY + 30);
    doc.text(`${parseFloatOrDefault(baseData.majorPoints).toFixed(1)}`, 60, baseDataY + 30);
    
    doc.text('Major GPA:', 17, baseDataY + 35);
    doc.setFont('helvetica', 'bold');
    doc.text(`${parseFloatOrDefault(baseData.majorGPA).toFixed(3)}`, 60, baseDataY + 35);
    
    // CURRENT SEMESTER & PROJECTED GPA - Right column
    // Current Semester Section
    doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
    doc.rect(105, 55, 85, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('Current Semester', 107, 60);
    
    // Current semester content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    const semesterY = 65;
    doc.text('Overall GPA:', 107, semesterY + 5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.semesterGPA[0], colors.semesterGPA[1], colors.semesterGPA[2]);
    
    const semesterOverallGPA = parseFloatOrDefault(semesterGPA.overallGPA);
    const semesterOverallDisplay = isNaN(semesterOverallGPA) ? 'N/A' : semesterOverallGPA.toFixed(3);
    doc.text(semesterOverallDisplay, 150, semesterY + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Credits:', 107, semesterY + 10);
    doc.text(`${Math.round(semesterGPA.overallCredits || 0)}`, 150, semesterY + 10);
    
    doc.text('Major GPA:', 107, semesterY + 20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.semesterGPA[0], colors.semesterGPA[1], colors.semesterGPA[2]);
    
    const semesterMajorGPA = parseFloatOrDefault(semesterGPA.majorGPA);
    const semesterMajorDisplay = isNaN(semesterMajorGPA) ? 'N/A' : semesterMajorGPA.toFixed(3);
    doc.text(semesterMajorDisplay, 150, semesterY + 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Credits:', 107, semesterY + 25);
    doc.text(`${Math.round(semesterGPA.majorCredits || 0)}`, 150, semesterY + 25);
    
    // Projected GPA Section
    doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
    doc.rect(105, semesterY + 35, 85, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('Projected Cumulative', 107, semesterY + 40);
    
    // Projected content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    const projectedY = semesterY + 40;
    doc.text('Overall GPA:', 107, projectedY + 7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.projectedGPA[0], colors.projectedGPA[1], colors.projectedGPA[2]);
    
    const projectedOverallGPA = parseFloatOrDefault(projectedGPA.overallGPA);
    const projectedOverallDisplay = isNaN(projectedOverallGPA) ? 'N/A' : projectedOverallGPA.toFixed(3);
    doc.text(projectedOverallDisplay, 150, projectedY + 7);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Credits:', 107, projectedY + 12);
    doc.text(`${Math.round(projectedGPA.finalOverallCredits || 0)}`, 150, projectedY + 12);
    
    doc.text('Major GPA:', 107, projectedY + 22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.projectedGPA[0], colors.projectedGPA[1], colors.projectedGPA[2]);
    
    const projectedMajorGPA = parseFloatOrDefault(projectedGPA.majorGPA);
    const projectedMajorDisplay = isNaN(projectedMajorGPA) ? 'N/A' : projectedMajorGPA.toFixed(3);
    doc.text(projectedMajorDisplay, 150, projectedY + 22);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Credits:', 107, projectedY + 27);
    doc.text(`${Math.round(projectedGPA.finalMajorCredits || 0)}`, 150, projectedY + 27);
    
    // Increase space between Projected and Target sections
    // Calculate the end position of the Projected section
    const projectedEndY = projectedY + 35; // Increased from 27 to ensure more space
    
    // TARGET GPA ANALYSIS - Position it after the projected section with more spacing
    const targetY = projectedEndY + 5; // Adjusted to create proper spacing between sections
    doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
    doc.rect(15, targetY, 175, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('Target GPA Analysis', 17, targetY + 5);
    
    // Extract semester credits for display
    const semesterOverallCredits = extractSemesterCredits(requiredSemesterInfo.overallDisplay);
    const semesterMajorCredits = extractSemesterCredits(requiredSemesterInfo.majorDisplay);
    
    // Extract required GPA values
    const requiredOverallGPAInfo = extractGpaNumber(requiredSemesterInfo.overallDisplay);
    const requiredMajorGPAInfo = extractGpaNumber(requiredSemesterInfo.majorDisplay);
    
    // Target data in two columns
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    // Left column - Overall
    doc.text('Target Overall GPA:', 17, targetY + 15);
    doc.setFont('helvetica', 'bold');
    doc.text(`${parseFloatOrDefault(targetGPA.overall, 2.0).toFixed(3)}`, 65, targetY + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Required Semester GPA:', 17, targetY + 22);
    doc.setFont('helvetica', 'bold');
    
    // Set color based on value
    if (requiredSemesterInfo.isOverallImpossible) {
      doc.setTextColor(colors.warning[0], colors.warning[1], colors.warning[2]);
    } else if (requiredOverallGPAInfo.isNegative) {
      doc.setTextColor(colors.warning[0], colors.warning[1], colors.warning[2]);
    } else {
      doc.setTextColor(colors.targetGPA[0], colors.targetGPA[1], colors.targetGPA[2]);
    }
    
    doc.text(`${requiredOverallGPAInfo.value}`, 65, targetY + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
    doc.text(`Based on ${semesterOverallCredits} semester credits and ${Math.round(requiredSemesterInfo.finalCumulativeOverallCredits || 0)} total credits`, 17, targetY + 27);
    
    // Right column - Major (with better alignment and formatting)
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    // Adjust the X position of the labels to create better alignment
    doc.text('Target Major GPA:', 107, targetY + 15);
    doc.setFont('helvetica', 'bold');
    // Move the value position to align better
    doc.text(`${parseFloatOrDefault(targetGPA.major, 2.0).toFixed(3)}`, 155, targetY + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Required Semester GPA:', 107, targetY + 22);
    doc.setFont('helvetica', 'bold');
    
    // Set color based on value
    if (requiredSemesterInfo.isMajorImpossible) {
      doc.setTextColor(colors.warning[0], colors.warning[1], colors.warning[2]);
    } else if (requiredMajorGPAInfo.isNegative) {
      doc.setTextColor(colors.warning[0], colors.warning[1], colors.warning[2]);
    } else {
      doc.setTextColor(colors.targetGPA[0], colors.targetGPA[1], colors.targetGPA[2]);
    }
    
    doc.text(`${requiredMajorGPAInfo.value}`, 155, targetY + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
    doc.text(`Based on ${semesterMajorCredits} major semester credits and ${Math.round(requiredSemesterInfo.finalCumulativeMajorCredits || 0)} total major credits`, 107, targetY + 27);
    
    // Show warnings if applicable
    let warningY = targetY + 35;
    if (requiredSemesterInfo.isOverallImpossible || requiredSemesterInfo.isMajorImpossible || 
        semesterOverallCredits === "0" || semesterMajorCredits === "0") {
      doc.setFontSize(8);
      doc.setTextColor(colors.warning[0], colors.warning[1], colors.warning[2]);
      
      if (requiredSemesterInfo.isOverallImpossible) {
        doc.text("• Overall target GPA requires a semester GPA above 4.0, which is impossible.", 17, warningY);
        warningY += 4;
      }
      if (requiredSemesterInfo.isMajorImpossible) {
        doc.text("• Major target GPA requires a semester GPA above 4.0, which is impossible.", 17, warningY);
        warningY += 4;
      }
      if (semesterOverallCredits === "0") {
        doc.text("• Overall target GPA calculation requires courses with grades that affect GPA.", 17, warningY);
        warningY += 4;
      }
      if (semesterMajorCredits === "0") {
        doc.text("• Major target GPA calculation requires major courses with grades that affect GPA.", 17, warningY);
        warningY += 4;
      }
    }
    
    // COURSE PLANNER TABLE - Add extra spacing after the Target GPA section
    // Increase this value to add more space between Target section and Course Planner
    const courseY = Math.max(warningY + 15, 165); // Use at least 165 or warningY + 15, whichever is greater
    
    doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
    doc.rect(15, courseY, 175, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text(`Course Planner (${courses.length} courses)`, 17, courseY + 5);
    
    // Format courses for table
    const courseData = courses.map(course => [
      course.catalogKey || course.id || '',
      course.credits.toString() || '',
      course.selectedGrade || '--',
      course.isMajor ? 'Yes' : 'No',
      course.isRepeat ? 'Yes' : 'No',
      course.isRepeat ? (course.previousGrade || '--') : 'N/A'
    ]);
    
    // If no courses, add message
    if (courseData.length === 0) {
      courseData.push(['No courses in planner', '', '', '', '', '']);
    }
    
    // Add courses table using jspdf-autotable
    try {
      autoTable(doc, {
        startY: courseY + 10,
        head: [['COURSE', 'CREDITS', 'GRADE', 'MAJOR?', 'REPEAT?', 'PREV.GRADE']],
        body: courseData,
        theme: 'grid',
        headStyles: {
          fillColor: [220, 220, 220],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 9,
          cellPadding: 2,
        },
        columnStyles: {
          0: {cellWidth: 30},
          1: {cellWidth: 20, halign: 'center'},
          2: {cellWidth: 20, halign: 'center'},
          3: {cellWidth: 20, halign: 'center'},
          4: {cellWidth: 20, halign: 'center'},
          5: {cellWidth: 25, halign: 'center'}
        },
        margin: {left: 15, right: 15}
      });
    } catch (error) {
      console.error('Error generating table:', error);
      // Add fallback if autotable fails
      doc.text('Error generating course table.', 17, courseY + 15);
    }
    
    // Fix the lastAutoTable property access issue
    const finalY = (doc as any).lastAutoTable?.finalY || courseY + 50;
    
    // Add disclaimer text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('Disclaimer:', 15, finalY + 10);
    
    // Format and add the disclaimer text with wrapping
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    
    // Split disclaimer text into multiple lines if it's too long
    const disclaimerLines = doc.splitTextToSize(disclaimer, 175);
    doc.text(disclaimerLines, 15, finalY + 15);
    
    // Add page number at the bottom
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 25, doc.internal.pageSize.getHeight() - 10);
    }
    
    // Save the PDF
    const filename = `BU-GPA-Report-${studentId || 'Student'}-${format(currentDate, 'yyyyMMdd')}.pdf`;
    
    console.log("Attempting to save PDF with filename:", filename);
    try {
      // Create a blob and trigger automatic download
      console.log("Creating PDF blob...");
      const pdfBlob = doc.output('blob');
      console.log("Blob created successfully, creating URL...");
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      // Create a hidden link and trigger click
      console.log("Creating download link with URL:", blobUrl);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = filename; // Set suggested filename
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      
      // Trigger click to start download
      console.log("Triggering download link click...");
      downloadLink.click();
      
      // Clean up
      console.log("Download triggered, cleaning up resources...");
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        document.body.removeChild(downloadLink);
        console.log("Resources cleaned up successfully");
      }, 100);
    } catch (error) {
      console.error('Error saving PDF:', error);
      // Fallback to the original method if the auto-download fails
      console.log("Attempting fallback save method...");
      doc.save(filename);
    }
  };
  
  return { generatePDF };
};

// Export a non-hook version that can be called from anywhere
export const generatePDF = (props: PDFGeneratorProps) => {
  console.log("generatePDF function called with props:", JSON.stringify(props, null, 2));
  
  const {
    studentId,
    baseData,
    semesterGPA,
    projectedGPA,
    targetGPA,
    requiredSemesterInfo,
    courses,
    disclaimer
  } = props;
  
  // Helper function to parse float values
  const parseFloatOrDefault = (value: string | number | undefined | null, defaultValue = 0): number => {
    if (value === undefined || value === null) return defaultValue;
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(parsed) ? defaultValue : parsed;
  };
  
  // Extract semester credits from display strings
  const extractSemesterCredits = (displayString?: string): string => {
    if (!displayString) return "0";
    const matches = displayString.match(/Based on (\d+) (?:Major )?GPA credits/);
    return matches ? matches[1] : "0";
  };
  
  // Extract GPA values from display strings
  const extractGpaNumber = (displayString?: string): { value: string, isNegative: boolean } => {
    if (!displayString) return { value: "N/A", isNegative: false };
    
    if (displayString.includes('points needed')) {
      const pointsMatch = displayString.match(/([-]?\d+\.\d+) points needed/);
      if (pointsMatch) {
        const value = `${pointsMatch[1]} points`;
        return { value, isNegative: parseFloat(pointsMatch[1]) < 0 };
      }
    }
    
    const matches = displayString.match(/([-]?\d+\.\d+)/);
    if (!matches) return { value: "N/A", isNegative: false };
    
    const numericValue = parseFloat(matches[0]);
    return { 
      value: isNaN(numericValue) ? "N/A" : numericValue.toFixed(3),
      isNegative: numericValue < 0
    };
  };
  
  console.log("Creating PDF document...");
  // Create new PDF document (A4 size)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  // Set document metadata
  doc.setProperties({
    title: `Bethlehem University GPA Calculator - ${studentId || 'Report'}`,
    subject: 'GPA Calculation Report',
    author: 'Bethlehem University',
    keywords: 'GPA, calculator, academic, record',
    creator: 'BU GPA Calculator'
  });
  
  // Define colors
  const colors = {
    primary: [0, 51, 102],      // Dark blue
    secondary: [153, 0, 0],     // Maroon
    accent: [0, 102, 51],       // Green
    lightGray: [240, 240, 240], // Background color
    mediumGray: [150, 150, 150],// For secondary text
    warning: [204, 0, 0],       // Red for warnings/errors
    semesterGPA: [0, 120, 0],   // Green for semester GPA
    projectedGPA: [0, 0, 150],  // Blue for projected GPA
    targetGPA: [128, 0, 128]    // Purple for target GPA
  };
  
  try {
    console.log("Adding header and logo...");
    // HEADER SECTION
    // Add university logo (would be replaced with actual logo in implementation)
    try {
      doc.addImage(BU_LOGO, 'PNG', 15, 10, 25, 25);
    } catch (error) {
      console.error('Failed to load logo:', error);
      // Continue without logo
    }
    
    // Add university name and report title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('Bethlehem University', 45, 20);
    doc.setFontSize(14);
    doc.text('GPA Calculator Report', 45, 28);
    
    // Add student info and date
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Student ID: ${studentId || 'N/A'}`, 15, 45);
    const currentDate = new Date();
    doc.text(`Generated: ${format(currentDate, 'dd MMM yyyy, HH:mm')}`, 130, 45);
    
    // Add horizontal divider
    doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.setLineWidth(0.5);
    doc.line(15, 48, 195, 48);
    
    // BASE DATA SECTION - Left column
    doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
    doc.rect(15, 55, 85, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('Base Cumulative Data', 17, 60);
    
    // Base data content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    // Create a table-like structure for base data
    const baseDataY = 65;
    doc.text('Overall Credits:', 17, baseDataY + 5);
    doc.text(`${Math.round(parseFloatOrDefault(baseData.overallCredits))}`, 60, baseDataY + 5);
    
    doc.text('Overall Points:', 17, baseDataY + 10);
    doc.text(`${parseFloatOrDefault(baseData.overallPoints).toFixed(1)}`, 60, baseDataY + 10);
    
    doc.text('Overall GPA:', 17, baseDataY + 15);
    doc.setFont('helvetica', 'bold');
    doc.text(`${parseFloatOrDefault(baseData.overallGPA).toFixed(3)}`, 60, baseDataY + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Major Credits:', 17, baseDataY + 25);
    doc.text(`${Math.round(parseFloatOrDefault(baseData.majorCredits))}`, 60, baseDataY + 25);
    
    doc.text('Major Points:', 17, baseDataY + 30);
    doc.text(`${parseFloatOrDefault(baseData.majorPoints).toFixed(1)}`, 60, baseDataY + 30);
    
    doc.text('Major GPA:', 17, baseDataY + 35);
    doc.setFont('helvetica', 'bold');
    doc.text(`${parseFloatOrDefault(baseData.majorGPA).toFixed(3)}`, 60, baseDataY + 35);
    
    // CURRENT SEMESTER & PROJECTED GPA - Right column
    // Current Semester Section
    doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
    doc.rect(105, 55, 85, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('Current Semester', 107, 60);
    
    // Current semester content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    const semesterY = 65;
    doc.text('Overall GPA:', 107, semesterY + 5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.semesterGPA[0], colors.semesterGPA[1], colors.semesterGPA[2]);
    
    const semesterOverallGPA = parseFloatOrDefault(semesterGPA.overallGPA);
    const semesterOverallDisplay = isNaN(semesterOverallGPA) ? 'N/A' : semesterOverallGPA.toFixed(3);
    doc.text(semesterOverallDisplay, 150, semesterY + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Credits:', 107, semesterY + 10);
    doc.text(`${Math.round(semesterGPA.overallCredits || 0)}`, 150, semesterY + 10);
    
    doc.text('Major GPA:', 107, semesterY + 20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.semesterGPA[0], colors.semesterGPA[1], colors.semesterGPA[2]);
    
    const semesterMajorGPA = parseFloatOrDefault(semesterGPA.majorGPA);
    const semesterMajorDisplay = isNaN(semesterMajorGPA) ? 'N/A' : semesterMajorGPA.toFixed(3);
    doc.text(semesterMajorDisplay, 150, semesterY + 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Credits:', 107, semesterY + 25);
    doc.text(`${Math.round(semesterGPA.majorCredits || 0)}`, 150, semesterY + 25);
    
    // Projected GPA Section
    doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
    doc.rect(105, semesterY + 35, 85, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('Projected Cumulative', 107, semesterY + 40);
    
    // Projected content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    const projectedY = semesterY + 40;
    doc.text('Overall GPA:', 107, projectedY + 7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.projectedGPA[0], colors.projectedGPA[1], colors.projectedGPA[2]);
    
    const projectedOverallGPA = parseFloatOrDefault(projectedGPA.overallGPA);
    const projectedOverallDisplay = isNaN(projectedOverallGPA) ? 'N/A' : projectedOverallGPA.toFixed(3);
    doc.text(projectedOverallDisplay, 150, projectedY + 7);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Credits:', 107, projectedY + 12);
    doc.text(`${Math.round(projectedGPA.finalOverallCredits || 0)}`, 150, projectedY + 12);
    
    doc.text('Major GPA:', 107, projectedY + 22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.projectedGPA[0], colors.projectedGPA[1], colors.projectedGPA[2]);
    
    const projectedMajorGPA = parseFloatOrDefault(projectedGPA.majorGPA);
    const projectedMajorDisplay = isNaN(projectedMajorGPA) ? 'N/A' : projectedMajorGPA.toFixed(3);
    doc.text(projectedMajorDisplay, 150, projectedY + 22);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Credits:', 107, projectedY + 27);
    doc.text(`${Math.round(projectedGPA.finalMajorCredits || 0)}`, 150, projectedY + 27);
    
    // Increase space between Projected and Target sections
    // Calculate the end position of the Projected section
    const projectedEndY = projectedY + 35; // Increased from 27 to ensure more space
    
    // TARGET GPA ANALYSIS - Position it after the projected section with more spacing
    const targetY = projectedEndY + 5; // Adjusted to create proper spacing between sections
    doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
    doc.rect(15, targetY, 175, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('Target GPA Analysis', 17, targetY + 5);
    
    // Extract semester credits for display
    const semesterOverallCredits = extractSemesterCredits(requiredSemesterInfo.overallDisplay);
    const semesterMajorCredits = extractSemesterCredits(requiredSemesterInfo.majorDisplay);
    
    // Extract required GPA values
    const requiredOverallGPAInfo = extractGpaNumber(requiredSemesterInfo.overallDisplay);
    const requiredMajorGPAInfo = extractGpaNumber(requiredSemesterInfo.majorDisplay);
    
    // Target data in two columns
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    // Left column - Overall
    doc.text('Target Overall GPA:', 17, targetY + 15);
    doc.setFont('helvetica', 'bold');
    doc.text(`${parseFloatOrDefault(targetGPA.overall, 2.0).toFixed(3)}`, 65, targetY + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Required Semester GPA:', 17, targetY + 22);
    doc.setFont('helvetica', 'bold');
    
    // Set color based on value
    if (requiredSemesterInfo.isOverallImpossible) {
      doc.setTextColor(colors.warning[0], colors.warning[1], colors.warning[2]);
    } else if (requiredOverallGPAInfo.isNegative) {
      doc.setTextColor(colors.warning[0], colors.warning[1], colors.warning[2]);
    } else {
      doc.setTextColor(colors.targetGPA[0], colors.targetGPA[1], colors.targetGPA[2]);
    }
    
    doc.text(`${requiredOverallGPAInfo.value}`, 65, targetY + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
    doc.text(`Based on ${semesterOverallCredits} semester credits and ${Math.round(requiredSemesterInfo.finalCumulativeOverallCredits || 0)} total credits`, 17, targetY + 27);
    
    // Right column - Major (with better alignment and formatting)
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    // Adjust the X position of the labels to create better alignment
    doc.text('Target Major GPA:', 107, targetY + 15);
    doc.setFont('helvetica', 'bold');
    // Move the value position to align better
    doc.text(`${parseFloatOrDefault(targetGPA.major, 2.0).toFixed(3)}`, 155, targetY + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Required Semester GPA:', 107, targetY + 22);
    doc.setFont('helvetica', 'bold');
    
    // Set color based on value
    if (requiredSemesterInfo.isMajorImpossible) {
      doc.setTextColor(colors.warning[0], colors.warning[1], colors.warning[2]);
    } else if (requiredMajorGPAInfo.isNegative) {
      doc.setTextColor(colors.warning[0], colors.warning[1], colors.warning[2]);
    } else {
      doc.setTextColor(colors.targetGPA[0], colors.targetGPA[1], colors.targetGPA[2]);
    }
    
    doc.text(`${requiredMajorGPAInfo.value}`, 155, targetY + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(colors.mediumGray[0], colors.mediumGray[1], colors.mediumGray[2]);
    doc.text(`Based on ${semesterMajorCredits} major semester credits and ${Math.round(requiredSemesterInfo.finalCumulativeMajorCredits || 0)} total major credits`, 107, targetY + 27);
    
    // Show warnings if applicable
    let warningY = targetY + 35;
    if (requiredSemesterInfo.isOverallImpossible || requiredSemesterInfo.isMajorImpossible || 
        semesterOverallCredits === "0" || semesterMajorCredits === "0") {
      doc.setFontSize(8);
      doc.setTextColor(colors.warning[0], colors.warning[1], colors.warning[2]);
      
      if (requiredSemesterInfo.isOverallImpossible) {
        doc.text("• Overall target GPA requires a semester GPA above 4.0, which is impossible.", 17, warningY);
        warningY += 4;
      }
      if (requiredSemesterInfo.isMajorImpossible) {
        doc.text("• Major target GPA requires a semester GPA above 4.0, which is impossible.", 17, warningY);
        warningY += 4;
      }
      if (semesterOverallCredits === "0") {
        doc.text("• Overall target GPA calculation requires courses with grades that affect GPA.", 17, warningY);
        warningY += 4;
      }
      if (semesterMajorCredits === "0") {
        doc.text("• Major target GPA calculation requires major courses with grades that affect GPA.", 17, warningY);
        warningY += 4;
      }
    }
    
    // COURSE PLANNER TABLE - Add extra spacing after the Target GPA section
    // Increase this value to add more space between Target section and Course Planner
    const courseY = Math.max(warningY + 15, 165); // Use at least 165 or warningY + 15, whichever is greater
    
    doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
    doc.rect(15, courseY, 175, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text(`Course Planner (${courses.length} courses)`, 17, courseY + 5);
    
    // Format courses for table
    const courseData = courses.map(course => [
      course.catalogKey || course.id || '',
      course.credits.toString() || '',
      course.selectedGrade || '--',
      course.isMajor ? 'Yes' : 'No',
      course.isRepeat ? 'Yes' : 'No',
      course.isRepeat ? (course.previousGrade || '--') : 'N/A'
    ]);
    
    // If no courses, add message
    if (courseData.length === 0) {
      courseData.push(['No courses in planner', '', '', '', '', '']);
    }
    
    // Add courses table using jspdf-autotable
    try {
      autoTable(doc, {
        startY: courseY + 10,
        head: [['COURSE', 'CREDITS', 'GRADE', 'MAJOR?', 'REPEAT?', 'PREV.GRADE']],
        body: courseData,
        theme: 'grid',
        headStyles: {
          fillColor: [220, 220, 220],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 9,
          cellPadding: 2,
        },
        columnStyles: {
          0: {cellWidth: 30},
          1: {cellWidth: 20, halign: 'center'},
          2: {cellWidth: 20, halign: 'center'},
          3: {cellWidth: 20, halign: 'center'},
          4: {cellWidth: 20, halign: 'center'},
          5: {cellWidth: 25, halign: 'center'}
        },
        margin: {left: 15, right: 15}
      });
    } catch (error) {
      console.error('Error generating table:', error);
      // Add fallback if autotable fails
      doc.text('Error generating course table.', 17, courseY + 15);
    }
    
    // Fix the lastAutoTable property access issue
    const finalY = (doc as any).lastAutoTable?.finalY || courseY + 50;
    
    // Add disclaimer text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('Disclaimer:', 15, finalY + 10);
    
    // Format and add the disclaimer text with wrapping
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    
    // Split disclaimer text into multiple lines if it's too long
    const disclaimerLines = doc.splitTextToSize(disclaimer, 175);
    doc.text(disclaimerLines, 15, finalY + 15);
    
    // Add page number at the bottom
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 25, doc.internal.pageSize.getHeight() - 10);
    }
    
    // Save the PDF
    const filename = `BU-GPA-Report-${studentId || 'Student'}-${format(currentDate, 'yyyyMMdd')}.pdf`;
    
    console.log("Attempting to save PDF with filename:", filename);
    try {
      // Create a blob and trigger automatic download
      console.log("Creating PDF blob...");
      const pdfBlob = doc.output('blob');
      console.log("Blob created successfully, creating URL...");
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      // Create a hidden link and trigger click
      console.log("Creating download link with URL:", blobUrl);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = filename; // Set suggested filename
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      
      // Trigger click to start download
      console.log("Triggering download link click...");
      downloadLink.click();
      
      // Clean up
      console.log("Download triggered, cleaning up resources...");
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        document.body.removeChild(downloadLink);
        console.log("Resources cleaned up successfully");
      }, 100);
    } catch (error) {
      console.error('Error saving PDF:', error);
      // Fallback to the original method if the auto-download fails
      console.log("Attempting fallback save method...");
      doc.save(filename);
    }
  } catch (error) {
    console.error("Error in PDF generation process:", error);
  }
};

export default usePDFGenerator; 