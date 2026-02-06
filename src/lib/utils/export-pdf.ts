/**
 * Exports an HTML element as a PDF file using html-to-image + jsPDF.
 *
 * If the element contains children with `data-pdf-page` attributes, each
 * child is captured as its own PDF page (one page per section). Otherwise
 * the entire element is captured as a single image and sliced into pages.
 *
 * html-to-image uses SVG foreignObject which delegates rendering to the
 * browser itself, so all modern CSS color functions (oklab, oklch, lab, lch)
 * used by Tailwind v4 are supported natively.
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

  // Check for page-based layout
  const pageElements = element.querySelectorAll<HTMLElement>("[data-pdf-page]");

  if (pageElements.length > 0) {
    try {
      await exportPageBased(element, pageElements, toPng, jsPDF, filename);
    } finally {
      for (const el of hidden) el.style.display = "";
    }
    return;
  }

  // Fallback: single-image slicing (legacy behavior)
  const origWidth = element.style.width;
  const origMaxWidth = element.style.maxWidth;
  const origMinWidth = element.style.minWidth;
  const origPadding = element.style.padding;
  const origBoxSizing = element.style.boxSizing;

  element.style.width = `${A4_WIDTH_PX}px`;
  element.style.maxWidth = "none";
  element.style.minWidth = `${A4_WIDTH_PX}px`;
  element.style.boxSizing = "border-box";
  element.offsetHeight;

  try {
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });

    element.style.width = origWidth;
    element.style.maxWidth = origMaxWidth;
    element.style.minWidth = origMinWidth;
    element.style.padding = origPadding;
    element.style.boxSizing = origBoxSizing;

    for (const el of hidden) el.style.display = "";

    const img = await loadImage(dataUrl);
    const imgHeight = (img.height * CONTENT_WIDTH_MM) / img.width;
    const pdf = new jsPDF("p", "mm", "a4");
    const totalPages = Math.ceil(imgHeight / USABLE_HEIGHT_MM);
    let heightLeft = imgHeight;
    let pageNum = 1;

    pdf.addImage(dataUrl, "PNG", PAGE_MARGIN_MM, PAGE_MARGIN_MM, CONTENT_WIDTH_MM, imgHeight);
    heightLeft -= USABLE_HEIGHT_MM;
    addPageFooter(pdf, pageNum, totalPages);

    while (heightLeft > 0) {
      pdf.addPage();
      pageNum++;
      const yOffset = PAGE_MARGIN_MM - (imgHeight - heightLeft);
      pdf.addImage(dataUrl, "PNG", PAGE_MARGIN_MM, yOffset, CONTENT_WIDTH_MM, imgHeight);
      heightLeft -= USABLE_HEIGHT_MM;
      addPageFooter(pdf, pageNum, totalPages);
    }

    pdf.save(filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
  } catch (err) {
    element.style.width = origWidth;
    element.style.maxWidth = origMaxWidth;
    element.style.minWidth = origMinWidth;
    element.style.padding = origPadding;
    element.style.boxSizing = origBoxSizing;
    for (const el of hidden) el.style.display = "";
    throw err;
  }
}

/**
 * Captures each [data-pdf-page] child as its own PDF page.
 * Each page is captured independently so content never splits mid-section.
 */
async function exportPageBased(
  container: HTMLElement,
  pages: NodeListOf<HTMLElement>,
  toPng: typeof import("html-to-image").toPng,
  JsPDF: typeof import("jspdf").jsPDF,
  filename: string,
): Promise<void> {
  // Save container styles
  const origWidth = container.style.width;
  const origMaxWidth = container.style.maxWidth;
  const origMinWidth = container.style.minWidth;
  const origBoxSizing = container.style.boxSizing;
  const origPadding = container.style.padding;
  const origBg = container.style.backgroundColor;

  // Set container to A4 width, remove gap/padding for capture
  container.style.width = `${A4_WIDTH_PX}px`;
  container.style.maxWidth = "none";
  container.style.minWidth = `${A4_WIDTH_PX}px`;
  container.style.boxSizing = "border-box";
  container.style.padding = "0";
  container.style.backgroundColor = "transparent";

  // Remove visual spacing/shadow from page elements during capture
  const savedPageStyles: { mt: string; mb: string; bs: string; br: string }[] = [];
  pages.forEach((page) => {
    savedPageStyles.push({
      mt: page.style.marginTop,
      mb: page.style.marginBottom,
      bs: page.style.boxShadow,
      br: page.style.borderRadius,
    });
    page.style.marginTop = "0";
    page.style.marginBottom = "0";
    page.style.boxShadow = "none";
    page.style.borderRadius = "0";
  });

  container.offsetHeight; // reflow

  try {
    const totalPages = pages.length;
    const pdf = new JsPDF("p", "mm", "a4");

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();

      const dataUrl = await toPng(pages[i], {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      const img = await loadImage(dataUrl);
      const imgWidthMM = CONTENT_WIDTH_MM;
      const imgHeightMM = (img.height * imgWidthMM) / img.width;

      // If page content fits, center vertically; otherwise place at top
      const yPos = PAGE_MARGIN_MM;
      pdf.addImage(dataUrl, "PNG", PAGE_MARGIN_MM, yPos, imgWidthMM, imgHeightMM);
      addPageFooter(pdf, i + 1, totalPages);
    }

    pdf.save(filename.replace(/[^a-zA-Z0-9._-]/g, "_"));
  } finally {
    // Restore all styles
    container.style.width = origWidth;
    container.style.maxWidth = origMaxWidth;
    container.style.minWidth = origMinWidth;
    container.style.boxSizing = origBoxSizing;
    container.style.padding = origPadding;
    container.style.backgroundColor = origBg;

    pages.forEach((page, i) => {
      page.style.marginTop = savedPageStyles[i].mt;
      page.style.marginBottom = savedPageStyles[i].mb;
      page.style.boxShadow = savedPageStyles[i].bs;
      page.style.borderRadius = savedPageStyles[i].br;
    });
  }
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load captured image."));
    img.src = dataUrl;
  });
}

function addPageFooter(
  pdf: import("jspdf").jsPDF,
  pageNum: number,
  totalPages: number,
): void {
  const footerY = A4_HEIGHT_MM - PAGE_MARGIN_MM;

  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184); // slate-400
  pdf.text("Confidential", PAGE_MARGIN_MM, footerY);

  const pageText = `Page ${pageNum} of ${totalPages}`;
  const textWidth = pdf.getTextWidth(pageText);
  pdf.text(pageText, A4_WIDTH_MM - PAGE_MARGIN_MM - textWidth, footerY);
}
