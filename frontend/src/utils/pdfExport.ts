// Lazily load html2pdf.js so it isn't pulled into the initial bundle.
/** Added to the html2canvas document clone only (see App.css); never on the live DOM. */
const PDF_EXPORT_CAPTURE_CLASS = 'pdf-export-capture';

export async function exportElementToPDF(elementId: string, reportType: 'sample' | 'full') {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('Report not found. Please generate the report first.');
    return;
  }

  const originalMaxHeight = element.style.maxHeight;
  const originalOverflow = element.style.overflow;
  element.style.maxHeight = 'none';
  element.style.overflow = 'visible';

  const actions = element.querySelector<HTMLElement>('.report-actions');
  const originalDisplay = actions ? actions.style.display : '';
  if (actions) actions.style.display = 'none';

  const loadingMsg = document.createElement('div');
  loadingMsg.setAttribute('role', 'status');
  loadingMsg.setAttribute('aria-live', 'polite');
  loadingMsg.innerHTML =
    '<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#000;color:#fff;padding:20px;border-radius:8px;z-index:10000;">Generating PDF...</div>';
  document.body.appendChild(loadingMsg);

  const opt = {
    margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
    filename: `nyc-collision-${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`,
    // JPEG at high quality keeps text + chart edges crisp while
    // producing PDFs ~10× smaller than the equivalent PNG embed.
    image: { type: 'jpeg' as const, quality: 0.95 },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    html2canvas: {
      // 2× is HiDPI-sharp; higher just inflates file size without visible gain
      // once jsPDF compresses the embedded JPEG.
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      letterRendering: true,
      imageTimeout: 0,
      onclone: (clonedDoc: Document) => {
        // Force light theme in the clone so every var(--…) resolves to
        // a print-friendly value, regardless of the user's live theme.
        clonedDoc.documentElement.setAttribute('data-theme', 'light');

        const target = clonedDoc.getElementById(elementId);
        if (target) target.classList.add(PDF_EXPORT_CAPTURE_CLASS);

        // Strip the atmospheric / glass effects so html2canvas paints
        // crisp text on a flat white surface instead of a hazy one.
        const sanitizer = clonedDoc.createElement('style');
        sanitizer.textContent = `
          html, body { background: #ffffff !important; }
          .app::before, .app::after { display: none !important; }
          #${elementId} {
            outline: none !important;
            image-rendering: -webkit-optimize-contrast;
          }
          #${elementId},
          #${elementId} *:not(.recharts-wrapper):not(.recharts-wrapper *) {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            box-shadow: none !important;
            text-shadow: none !important;
            filter: none !important;
            transition: none !important;
            animation: none !important;
            text-rendering: geometricPrecision !important;
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
          }
        `;
        clonedDoc.head.appendChild(sanitizer);
      },
    },
    jsPDF: {
      unit: 'in' as const,
      format: 'a4' as const,
      orientation: 'landscape' as const,
      compress: true,
      precision: 16,
    },
  };

  try {
    await new Promise((r) => setTimeout(r, 800));
    const { default: html2pdf } = await import('html2pdf.js');
    await html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.error('Error generating PDF:', err);
    alert('Error generating PDF. Please try again.');
  } finally {
    if (loadingMsg.parentNode) loadingMsg.parentNode.removeChild(loadingMsg);
    element.style.maxHeight = originalMaxHeight;
    element.style.overflow = originalOverflow;
    if (actions) actions.style.display = originalDisplay;
  }
}
