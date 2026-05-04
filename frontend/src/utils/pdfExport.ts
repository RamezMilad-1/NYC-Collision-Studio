// Lazily load html2pdf.js so it isn't pulled into the initial bundle.
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
    image: { type: 'jpeg' as const, quality: 0.98 },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
    },
    jsPDF: {
      unit: 'in' as const,
      format: 'a4' as const,
      orientation: 'landscape' as const,
      compress: true,
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
