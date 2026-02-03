/**
 * Exports an HTML element as a PDF file using html-to-image + jsPDF.
 *
 * html-to-image uses SVG foreignObject which delegates rendering to the
 * browser itself, so all modern CSS color functions (oklab, oklch, lab, lch)
 * used by Tailwind v4 are supported natively.
 */
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

  try {
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      backgroundColor: "#18181b",
    });

    // Restore hidden elements before creating PDF
    for (const el of hidden) {
      el.style.display = "";
    }

    // Get image dimensions to calculate aspect ratio
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load captured image."));
      img.src = dataUrl;
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (img.height * imgWidth) / img.width;

    const pdf = new jsPDF("p", "mm", "a4");
    let position = 0;
    let heightLeft = imgHeight;

    pdf.addImage(dataUrl, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = -(imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(dataUrl, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    pdf.save(safeName);
  } catch (err) {
    // Restore hidden elements even on error
    for (const el of hidden) {
      el.style.display = "";
    }
    throw err;
  }
}
