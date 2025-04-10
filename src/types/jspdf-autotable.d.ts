declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  interface AutoTableOptions {
    startY?: number;
    head?: any[][];
    body?: any[][];
    foot?: any[][];
    margin?: { left: number; right: number; top?: number; bottom?: number };
    theme?: string;
    styles?: {
      fontSize?: number;
      cellPadding?: number;
      font?: string;
      fontStyle?: string;
      lineColor?: number[];
      lineWidth?: number;
      cellWidth?: number | 'auto' | 'wrap';
      overflow?: 'linebreak' | 'ellipsize' | 'visible' | 'hidden';
      halign?: 'left' | 'center' | 'right';
      valign?: 'top' | 'middle' | 'bottom';
      fillColor?: number[];
      textColor?: number[];
    };
    headStyles?: {
      fillColor?: number[];
      textColor?: number[];
      fontStyle?: string;
      halign?: 'left' | 'center' | 'right';
    };
    bodyStyles?: object;
    footStyles?: object;
    columnStyles?: {
      [key: number]: {
        cellWidth?: number;
        halign?: 'left' | 'center' | 'right';
      };
    };
    didDrawPage?: (data: any) => void;
  }

  function autoTable(doc: jsPDF, options: AutoTableOptions): void;
  
  export default autoTable;
} 