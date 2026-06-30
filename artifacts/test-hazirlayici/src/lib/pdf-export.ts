import type { Question, HeaderConfig } from './db';

export interface ExportConfig {
  questions: Question[];
  headerConfig: HeaderConfig;
  templateDataUrl?: string;
  templateUsage: 'first' | 'all' | 'none';
}

const DPI = 150;
const MM = DPI / 25.4;
const PAGE_W = Math.round(210 * MM);
const PAGE_H = Math.round(297 * MM);
const MARGIN = Math.round(10 * MM);
const GAP = Math.round(5 * MM);
const COL_W = Math.round((PAGE_W - 2 * MARGIN - GAP) / 2);
const ROW_GAP = Math.round(3 * MM);

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

async function buildPages(config: ExportConfig): Promise<HTMLCanvasElement[]> {
  const { questions, headerConfig, templateDataUrl, templateUsage } = config;
  const pages: HTMLCanvasElement[] = [];
  let ctx!: CanvasRenderingContext2D;
  let col1Y = MARGIN, col2Y = MARGIN;
  let pageIdx = 0;

  let templateImg: HTMLImageElement | null = null;
  if (templateDataUrl) {
    try { templateImg = await loadImg(templateDataUrl); } catch { /* ignore */ }
  }

  async function newPage() {
    const cv = document.createElement('canvas');
    cv.width = PAGE_W; cv.height = PAGE_H;
    const c = cv.getContext('2d')!;
    c.fillStyle = '#fff';
    c.fillRect(0, 0, PAGE_W, PAGE_H);
    if (templateImg) {
      const draw = templateUsage === 'all' || (templateUsage === 'first' && pageIdx === 0);
      if (draw) c.drawImage(templateImg, 0, 0, PAGE_W, PAGE_H);
    }
    pages.push(cv);
    pageIdx++;
    col1Y = MARGIN; col2Y = MARGIN;
    ctx = c;
    return c;
  }

  await newPage();

  if (headerConfig.enabled) {
    let hy = MARGIN;
    if (headerConfig.testTitle) {
      ctx.font = `bold ${Math.round(14 * MM / 4)}px Arial, sans-serif`;
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.fillText(headerConfig.testTitle, PAGE_W / 2, hy + Math.round(6 * MM / 4));
      hy += Math.round(10 * MM / 4);
    }
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(MARGIN, hy + 2); ctx.lineTo(PAGE_W - MARGIN, hy + 2);
    ctx.stroke();
    hy += Math.round(4 * MM / 4);

    const fields: string[] = [];
    if (headerConfig.showName) fields.push('Ad Soyad: _____________________');
    if (headerConfig.showClass) fields.push('Sınıf: _______');
    if (headerConfig.showNumber) fields.push('No: _______');
    if (headerConfig.showDate) fields.push('Tarih: __ / __ / ______');

    if (fields.length > 0) {
      ctx.font = `${Math.round(10 * MM / 4)}px Arial, sans-serif`;
      ctx.textAlign = 'left';
      const colSize = (PAGE_W - 2 * MARGIN) / fields.length;
      for (let f = 0; f < fields.length; f++) {
        ctx.fillStyle = '#000';
        ctx.fillText(fields[f], MARGIN + f * colSize, hy + Math.round(5 * MM / 4));
      }
      hy += Math.round(10 * MM / 4);
    }
    ctx.strokeStyle = '#aaa';
    ctx.beginPath();
    ctx.moveTo(MARGIN, hy); ctx.lineTo(PAGE_W - MARGIN, hy);
    ctx.stroke();
    hy += Math.round(4 * MM / 4);
    col1Y = hy; col2Y = hy;
  }

  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];
    const img = await loadImg(q.imageDataUrl);
    const rH = Math.round(COL_W * (q.height / q.width));

    let col = col1Y <= col2Y ? 0 : 1;
    let cY = col === 0 ? col1Y : col2Y;

    if (cY + rH > PAGE_H - MARGIN) {
      const otherY = col === 0 ? col2Y : col1Y;
      if (otherY + rH > PAGE_H - MARGIN) {
        await newPage();
        col = 0; cY = MARGIN;
      } else {
        col = 1 - col;
        cY = col === 0 ? col1Y : col2Y;
      }
    }

    const x = MARGIN + col * (COL_W + GAP);
    const numStr = `${qi + 1}.`;
    ctx.font = `bold ${Math.round(8 * MM / 4)}px Arial, sans-serif`;
    ctx.fillStyle = '#000';
    ctx.textAlign = 'left';
    const numW = ctx.measureText(numStr).width + 4;
    ctx.fillText(numStr, x, cY + Math.round(5 * MM / 4));
    ctx.drawImage(img, x + numW, cY, COL_W - numW, rH);

    if (col === 0) col1Y = cY + rH + ROW_GAP;
    else col2Y = cY + rH + ROW_GAP;
  }

  return pages;
}

function canvasToJpeg(canvas: HTMLCanvasElement): Uint8Array {
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const b64 = dataUrl.split(',')[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function buildRawPdf(jpegs: Uint8Array[]): Uint8Array {
  const enc = new TextEncoder();
  const n = jpegs.length;
  const pdfW = 595, pdfH = 842;

  const s = (str: string) => enc.encode(str);

  type ObjEntry = { id: number; bytes: Uint8Array };
  const objects: ObjEntry[] = [];

  const catalogId = 1;
  const pagesId = 2;

  function makeStream(dict: string, data: Uint8Array): Uint8Array {
    return concatBytes(s(`${dict}\nstream\n`), data, s('\nendstream'));
  }

  objects.push({ id: catalogId, bytes: s(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`) });

  const kidsList = Array.from({ length: n }, (_, i) => `${3 + 3 * i} 0 R`).join(' ');
  objects.push({ id: pagesId, bytes: s(`<< /Type /Pages /Kids [${kidsList}] /Count ${n} >>`) });

  for (let i = 0; i < n; i++) {
    const pageId = 3 + 3 * i;
    const contentId = 4 + 3 * i;
    const imageId = 5 + 3 * i;
    const jpeg = jpegs[i];

    objects.push({
      id: pageId,
      bytes: s(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pdfW} ${pdfH}] ` +
        `/Contents ${contentId} 0 R ` +
        `/Resources << /XObject << /Im1 ${imageId} 0 R >> >> >>`
      )
    });

    const contentData = s(`q ${pdfW} 0 0 ${pdfH} 0 0 cm /Im1 Do Q\n`);
    objects.push({
      id: contentId,
      bytes: makeStream(`<< /Length ${contentData.length} >>`, contentData)
    });

    const imgDict =
      `<< /Type /XObject /Subtype /Image /Width ${PAGE_W} /Height ${PAGE_H} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`;
    objects.push({ id: imageId, bytes: makeStream(imgDict, jpeg) });
  }

  objects.sort((a, b) => a.id - b.id);

  const header = s('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
  let offset = header.length;
  const offsets: number[] = [];
  const wrappedObjs: Uint8Array[] = [];

  for (const obj of objects) {
    offsets.push(offset);
    const wrapped = concatBytes(s(`${obj.id} 0 obj\n`), obj.bytes, s('\nendobj\n'));
    wrappedObjs.push(wrapped);
    offset += wrapped.length;
  }

  const xrefOffset = offset;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += '0000000000 65535 f \n';
  for (const off of offsets) {
    xref += off.toString().padStart(10, '0') + ' 00000 n \n';
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return concatBytes(header, ...wrappedObjs, s(xref));
}

export async function generateTestPdf(
  config: ExportConfig,
  action: 'download' | 'preview' | 'print' = 'download'
): Promise<void> {
  const pages = await buildPages(config);
  const jpegs = pages.map(canvasToJpeg);
  const pdfBytes = buildRawPdf(jpegs);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  if (action === 'download') {
    const a = document.createElement('a');
    a.href = url;
    a.download = (config.headerConfig.testTitle || 'test') + '.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } else {
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}
