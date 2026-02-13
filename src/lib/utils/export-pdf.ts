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

type ExportOptions = {
  /** Optional title to render above the captured content on the first page */
  title?: string;
  /** Force light theme during capture (default: true) */
  forceLight?: boolean;
};

/**
 * Temporarily forces the document into light mode so the PDF renders with
 * white backgrounds and dark text (paper-friendly). Returns a restore fn.
 */
function forceLightMode(): () => void {
  const html = document.documentElement;
  const hadDark = html.classList.contains("dark");
  const prevColorScheme = html.style.colorScheme;

  if (hadDark) {
    html.classList.remove("dark");
    html.classList.add("light");
    html.style.colorScheme = "light";
  }

  // Force reflow so computed styles update before capture
  html.offsetHeight;

  return () => {
    if (hadDark) {
      html.classList.remove("light");
      html.classList.add("dark");
      html.style.colorScheme = prevColorScheme;
    }
  };
}

export async function exportElementAsPdf(
  element: HTMLElement,
  filename: string,
  options?: ExportOptions,
): Promise<void> {
  const { toPng } = await import("html-to-image");
  const { jsPDF } = await import("jspdf");

  const forceLight = options?.forceLight !== false; // default true

  // Force light mode for paper-friendly output
  let restoreTheme: (() => void) | null = null;
  if (forceLight) {
    restoreTheme = forceLightMode();
  }

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
      await exportPageBased(element, pageElements, toPng, jsPDF, filename, options?.title);
    } finally {
      for (const el of hidden) el.style.display = "";
      restoreTheme?.();
    }
    return;
  }

  // Fallback: single-image capture and page slicing
  const origStyles = saveStyles(element, [
    "width", "maxWidth", "minWidth", "padding", "boxSizing", "backgroundColor",
  ]);

  element.style.width = `${A4_WIDTH_PX}px`;
  element.style.maxWidth = "none";
  element.style.minWidth = `${A4_WIDTH_PX}px`;
  element.style.boxSizing = "border-box";
  element.style.backgroundColor = "#ffffff";
  element.offsetHeight; // reflow

  try {
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      width: A4_WIDTH_PX,
      backgroundColor: "#ffffff",
      style: {
        // Ensure the element is captured at proper width
        width: `${A4_WIDTH_PX}px`,
        maxWidth: "none",
      },
    });

    restoreStyles(element, origStyles);
    for (const el of hidden) el.style.display = "";
    restoreTheme?.();

    const img = await loadImage(dataUrl);
    const imgHeightMM = (img.height * CONTENT_WIDTH_MM) / img.width;
    const pdf = new jsPDF("p", "mm", "a4");

    let yStart = PAGE_MARGIN_MM;

    // Add title to first page if provided
    if (options?.title) {
      pdf.setFontSize(14);
      pdf.setTextColor(30, 30, 30);
      pdf.text(options.title, PAGE_MARGIN_MM, yStart + 5);
      yStart += 10;

      pdf.setFontSize(9);
      pdf.setTextColor(120, 120, 120);
      pdf.text(
        `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
        PAGE_MARGIN_MM,
        yStart + 3,
      );
      yStart += 10;
    }

    const firstPageUsable = A4_HEIGHT_MM - yStart - PAGE_MARGIN_MM - FOOTER_HEIGHT_MM;
    const totalPages = imgHeightMM <= firstPageUsable
      ? 1
      : 1 + Math.ceil((imgHeightMM - firstPageUsable) / USABLE_HEIGHT_MM);

    let heightLeft = imgHeightMM;
    let pageNum = 1;

    // First page
    pdf.addImage(dataUrl, "PNG", PAGE_MARGIN_MM, yStart, CONTENT_WIDTH_MM, imgHeightMM);
    heightLeft -= firstPageUsable;
    addPageFooter(pdf, pageNum, totalPages);

    // Subsequent pages
    while (heightLeft > 0) {
      pdf.addPage();
      pageNum++;
      const yOffset = PAGE_MARGIN_MM - (imgHeightMM - heightLeft);
      pdf.addImage(dataUrl, "PNG", PAGE_MARGIN_MM, yOffset, CONTENT_WIDTH_MM, imgHeightMM);
      heightLeft -= USABLE_HEIGHT_MM;
      addPageFooter(pdf, pageNum, totalPages);
    }

    pdf.save(sanitizeFilename(filename));
  } catch (err: unknown) {
    restoreStyles(element, origStyles);
    for (const el of hidden) el.style.display = "";
    restoreTheme?.();
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
  title?: string,
): Promise<void> {
  const origStyles = saveStyles(container, [
    "width", "maxWidth", "minWidth", "boxSizing", "padding", "backgroundColor",
  ]);

  container.style.width = `${A4_WIDTH_PX}px`;
  container.style.maxWidth = "none";
  container.style.minWidth = `${A4_WIDTH_PX}px`;
  container.style.boxSizing = "border-box";
  container.style.padding = "0";
  container.style.backgroundColor = "transparent";

  // Remove visual spacing/shadow from page elements during capture
  const savedPageStyles: Record<string, string>[] = [];
  pages.forEach((page) => {
    savedPageStyles.push(saveStyles(page, [
      "marginTop", "marginBottom", "boxShadow", "borderRadius",
    ]));
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

      let yPos = PAGE_MARGIN_MM;

      // Add title on first page
      if (i === 0 && title) {
        pdf.setFontSize(14);
        pdf.setTextColor(30, 30, 30);
        pdf.text(title, PAGE_MARGIN_MM, yPos + 5);
        yPos += 10;

        pdf.setFontSize(9);
        pdf.setTextColor(120, 120, 120);
        pdf.text(
          `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
          PAGE_MARGIN_MM,
          yPos + 3,
        );
        yPos += 10;
      }

      const dataUrl = await toPng(pages[i], {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      const img = await loadImage(dataUrl);
      const imgWidthMM = CONTENT_WIDTH_MM;
      const imgHeightMM = (img.height * imgWidthMM) / img.width;

      pdf.addImage(dataUrl, "PNG", PAGE_MARGIN_MM, yPos, imgWidthMM, imgHeightMM);
      addPageFooter(pdf, i + 1, totalPages);
    }

    pdf.save(sanitizeFilename(filename));
  } finally {
    restoreStyles(container, origStyles);
    pages.forEach((page, i) => {
      restoreStyles(page, savedPageStyles[i]);
    });
  }
}

/* ---------- Helpers ---------- */

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

function sanitizeFilename(filename: string): string {
  const clean = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return clean.endsWith(".pdf") ? clean : `${clean}.pdf`;
}

/** Save inline style properties for later restoration. */
function saveStyles(el: HTMLElement, props: string[]): Record<string, string> {
  const saved: Record<string, string> = {};
  for (const prop of props) {
    saved[prop] = (el.style as unknown as Record<string, string>)[prop] ?? "";
  }
  return saved;
}

/** Restore inline style properties from a saved record. */
function restoreStyles(el: HTMLElement, saved: Record<string, string>): void {
  for (const [prop, value] of Object.entries(saved)) {
    (el.style as unknown as Record<string, string>)[prop] = value;
  }
}
