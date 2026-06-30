import * as pdfjsLib from 'pdfjs-dist';

// Setting worker path to local
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export async function loadPdf(file: File): Promise<pdfjsLib.PDFDocumentProxy> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument(new Uint8Array(arrayBuffer));
  return loadingTask.promise;
}

export async function renderPageToCanvas(
  page: pdfjsLib.PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<void> {
  const viewport = page.getViewport({ scale });
  const context = canvas.getContext('2d');
  
  if (!context) throw new Error('Could not get canvas context');

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };
  
  await page.render(renderContext).promise;
}

export async function pdfFileToImage(file: File): Promise<string> {
  const pdf = await loadPdf(file);
  const page = await pdf.getPage(1);
  const canvas = document.createElement('canvas');
  await renderPageToCanvas(page, canvas, 2); // High res for template
  return canvas.toDataURL('image/png');
}

export function imageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
