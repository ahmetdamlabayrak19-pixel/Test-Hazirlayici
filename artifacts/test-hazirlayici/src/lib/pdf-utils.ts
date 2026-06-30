import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export async function loadPdf(file: File): Promise<pdfjsLib.PDFDocumentProxy> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  return loadingTask.promise;
}

export async function renderPageToCanvas(
  page: pdfjsLib.PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<void> {
  const viewport = page.getViewport({ scale });
  const context = canvas.getContext('2d');

  if (!context) throw new Error('Canvas context alınamadı');

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({ canvasContext: context, viewport }).promise;
}

export async function pdfFileToImage(file: File): Promise<string> {
  const pdf = await loadPdf(file);
  const page = await pdf.getPage(1);
  const canvas = document.createElement('canvas');
  await renderPageToCanvas(page, canvas, 2);
  return canvas.toDataURL('image/png');
}

export function imageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('Dosya okunamadı'));
    };
    reader.onerror = () => reject(new Error('Dosya okuma hatası'));
    reader.readAsDataURL(file);
  });
}
