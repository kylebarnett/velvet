/**
 * Exports an HTML element as a PDF file using html-to-image + jsPDF.
 *
 * html-to-image uses SVG foreignObject which delegates rendering to the
 * browser itself, so all modern CSS color functions (oklab, oklch, lab, lch)
 * used by Tailwind v4 are supported natively.
 *
 * The element is temporarily resized to A4 width (794px at 96dpi) with a
 * white background before capture, then restored to its original styles.
 */

const A4_WIDTH_PX = 794; // A4 at 96dpi
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PAGE_MARGIN_MM = 10;
const CONTENT_WIDTH_MM = A4_WIDTH_MM - PAGE_MARGIN_MM * 2; // 190mm
const FOOTER_HEIGHT_MM = 8;
const USABLE_HEIGHT_MM = A4_HEIGHT_MM - PAGE_MARGIN_MM * 2 - FOOTER_HEIGHT_MM;

export async function exportElementAsPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const { toPng } = await import("html-to-image");
  const { jsPDF } = await import("jspdf");

  // Hide elements marked with data-no-print
  const hidden: HTMLElement[] = [];
  element.querySelectorAll("[data-no-print]").forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.style.display !== "none") {
      hidden.push(htmlEl);
      htmlEl.style.display = "none";
    }
  });

  // Save original styles so we can restore them
  const origWidth = element.style.width;
  const origMaxWidth = element.style.maxWidth;
  const origMinWidth = element.style.minWidth;
  const origPadding = element.style.padding;
  const origBoxSizing = element.style.boxSizing;

  // Temporarily set element to A4 width for capture
  element.style.width = `${A4_WIDTH_PX}px`;
  element.style.maxWidth = "none";
  element.style.minWidth = `${A4_WIDTH_PX}px`;
  element.style.boxSizing = "border-box";

  // Force a reflow so the browser lays out at the new width
  element.offsetHeight;

  try {
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });

    // Restore styles before creating PDF
    element.style.width = origWidth;
    element.style.maxWidth = origMaxWidth;
    element.style.minWidth = origMinWidth;
    element.style.padding = origPadding;
    element.style.boxSizing = origBoxSizing;

    for (const el of hidden) {
      el.style.display = "";
    }

    // Load image to get dimensions
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load captured image."));
      img.src = dataUrl;
    });

    // Calculate content dimensions with margins
    const imgHeight = (img.height * CONTENT_WIDTH_MM) / img.width;

    const pdf = new jsPDF("p", "mm", "a4");
    let position = PAGE_MARGIN_MM;
    let heightLeft = imgHeight;
    let pageNum = 1;

    // Calculate total pages
    const totalPages = Math.ceil(imgHeight / USABLE_HEIGHT_MM);

    // First page
    pdf.addImage(
      dataUrl,
      "PNG",
      PAGE_MARGIN_MM,
      position,
      CONTENT_WIDTH_MM,
      imgHeight,
    );
    heightLeft -= USABLE_HEIGHT_MM;
    addPageFooter(pdf, pageNum, totalPages);

    // Additional pages
    while (heightLeft > 0) {
      pdf.addPage();
      pageNum++;
      // Offset the image upward to show the next portion
      const yOffset = PAGE_MARGIN_MM - (imgHeight - heightLeft);
      pdf.addImage(
        dataUrl,
        "PNG",
        PAGE_MARGIN_MM,
        yOffset,
        CONTENT_WIDTH_MM,
        imgHeight,
      );
      heightLeft -= USABLE_HEIGHT_MM;
      addPageFooter(pdf, pageNum, totalPages);
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    pdf.save(safeName);
  } catch (err) {
    // Restore all styles on error
    element.style.width = origWidth;
    element.style.maxWidth = origMaxWidth;
    element.style.minWidth = origMinWidth;
    element.style.padding = origPadding;
    element.style.boxSizing = origBoxSizing;

    for (const el of hidden) {
      el.style.display = "";
    }
    throw err;
  }
}

function addPageFooter(
  pdf: import("jspdf").jsPDF,
  pageNum: number,
  totalPages: number,
): void {
  const footerY = A4_HEIGHT_MM - PAGE_MARGIN_MM;

  // "Confidential" on the left
  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184); // slate-400
  pdf.text("Confidential", PAGE_MARGIN_MM, footerY);

  // Page number on the right
  const pageText = `Page ${pageNum} of ${totalPages}`;
  const textWidth = pdf.getTextWidth(pageText);
  pdf.text(pageText, A4_WIDTH_MM - PAGE_MARGIN_MM - textWidth, footerY);
}
