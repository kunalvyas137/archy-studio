import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

function getFlowContainer(): HTMLElement | null {
  return document.querySelector('.react-flow') as HTMLElement | null;
}

// ── PNG Export ────────────────────────────────────────────────────────────
export async function exportToPNG(filename = 'callflow.png'): Promise<void> {
  const el = getFlowContainer();
  if (!el) throw new Error('Flow container not found');

  const canvas = await html2canvas(el, {
    scale: 4,
    useCORS: true,
    backgroundColor: '#f9fafb',
    logging: false,
  });
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ── PDF Export ─────────────────────────────────────────────────────────────
// Strategy: Capture at 6× scale (432 DPI), then fit into an A2 landscape page.
// A2 (594×420mm) is large enough that flow diagrams render at a comfortable
// physical size. Text stays crisp because the embedded image is 6× resolution.
export async function exportToPDF(filename = 'callflow.pdf'): Promise<void> {
  const el = getFlowContainer();
  if (!el) throw new Error('Flow container not found');

  const canvas = await html2canvas(el, {
    scale: 6,           // 6× pixel density → 432 DPI equivalent
    useCORS: true,
    backgroundColor: '#f9fafb',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');

  // A2 landscape: 594mm × 420mm
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a2' });
  const pageW = pdf.internal.pageSize.getWidth();   // 594 mm
  const pageH = pdf.internal.pageSize.getHeight();  // 420 mm
  const margin = 8; // mm

  const availW = pageW - margin * 2;
  const availH = pageH - margin * 2;

  const imgAspect  = canvas.width / canvas.height;
  const pageAspect = availW / availH;

  let drawW: number, drawH: number;
  if (imgAspect > pageAspect) {
    drawW = availW;
    drawH = availW / imgAspect;
  } else {
    drawH = availH;
    drawW = availH * imgAspect;
  }

  const x = margin + (availW - drawW) / 2;
  const y = margin + (availH - drawH) / 2;

  pdf.addImage(imgData, 'PNG', x, y, drawW, drawH, undefined, 'FAST');
  pdf.save(filename);
}

// ── Print (vector PDF via browser print dialog) ───────────────────────────
// This produces 100% vector text — infinitely sharp at any zoom level.
// User selects "Print to PDF" / "Save as PDF" in the system print dialog.
export function printDiagram(): void {
  const styleId = 'callflow-print-style';

  // Inject print-specific CSS
  let style = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }

  style.textContent = `
    @media print {
      @page { size: A2 landscape; margin: 8mm; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

      /* Hide everything except the flow canvas */
      body > * { display: none !important; }
      #root     { display: block !important; height: 100vh; }
      #root > * { display: none !important; }
      #root > div { display: flex !important; flex-direction: column; height: 100vh; }
      header    { display: none !important; }
      aside     { display: none !important; }

      /* Make the flow fill the page */
      .react-flow                      { display: block !important; flex: 1; width: 100% !important; height: 100% !important; }
      .react-flow__panel               { display: none !important; }
      .react-flow__controls            { display: none !important; }
      .react-flow__minimap             { display: none !important; }
      .react-flow__attribution         { display: none !important; }
    }
  `;

  window.print();

  // Clean up the style after print dialog closes
  setTimeout(() => {
    style?.parentNode?.removeChild(style!);
  }, 2000);
}
