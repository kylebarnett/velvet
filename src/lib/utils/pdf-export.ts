/**
 * PDF export utility — captures a DOM element as a PDF using html2canvas + jsPDF.
 * Prefer client-side usage only (uses document/window).
 */

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

type PdfExportOptions = {
  /** The DOM element to capture */
  element: HTMLElement;
  /** Output filename (without .pdf extension) */
  filename: string;
  /** Optional title to print at the top of the PDF */
  title?: string;
  /** Page orientation */
  orientation?: "portrait" | "landscape";
};

export async function exportToPdf({
  element,
  filename,
  title,
  orientation = "landscape",
}: PdfExportOptions): Promise<void> {
  // Capture the element as a canvas image
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableWidth = pageWidth - margin * 2;

  let yOffset = margin;

  // Add title if provided
  if (title) {
    pdf.setFontSize(14);
    pdf.setTextColor(30, 30, 30);
    pdf.text(title, margin, yOffset + 5);
    yOffset += 12;

    // Add date
    pdf.setFontSize(9);
    pdf.setTextColor(120, 120, 120);
    pdf.text(`Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, margin, yOffset + 3);
    yOffset += 10;
  }

  // Scale image to fit page width
  const imgWidth = usableWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const availableHeight = pageHeight - yOffset - margin;

  if (imgHeight <= availableHeight) {
    // Fits on one page
    pdf.addImage(imgData, "PNG", margin, yOffset, imgWidth, imgHeight);
  } else {
    // Multi-page: split the canvas across pages
    let remainingHeight = imgHeight;
    let sourceY = 0;
    const sourceWidth = canvas.width;
    const sourcePageHeight = (availableHeight / imgWidth) * sourceWidth;

    // First page
    pdf.addImage(imgData, "PNG", margin, yOffset, imgWidth, imgHeight, undefined, "FAST");

    // For simplicity with multi-page, re-add cropped sections
    // jsPDF handles overflow by clipping, so this approach works for most dashboards
    if (remainingHeight > availableHeight) {
      // Clip first page
      // Note: jsPDF clips to page boundaries automatically
      remainingHeight -= availableHeight;
      sourceY += sourcePageHeight;

      while (remainingHeight > 0) {
        pdf.addPage();
        const drawHeight = Math.min(remainingHeight, pageHeight - margin * 2);
        const srcH = (drawHeight / imgWidth) * sourceWidth;

        // Draw the remaining portion offset upward
        pdf.addImage(
          imgData, "PNG",
          margin,
          margin - (sourceY / sourceWidth) * imgWidth,
          imgWidth,
          imgHeight,
          undefined, "FAST"
        );

        remainingHeight -= (pageHeight - margin * 2);
        sourceY += srcH;
      }
    }
  }

  pdf.save(`${filename}.pdf`);
}
