import type { Question, TemplateLayout } from './db';

export interface ExportConfig {
  questions: Question[];
  topicText: string;
  accentColor: string;
  templateDataUrl?: string;
  templateLayout?: TemplateLayout;
  questionGapMm?: number; // varsayılan 3mm
}

// A4 @ 200 DPI — iyi baskı kalitesi
const DPI = 200;
const MM = DPI / 25.4;
const PAGE_W = Math.round(210 * MM);   // 1654 px
const PAGE_H = Math.round(297 * MM);   // 2339 px
const MARGIN = Math.round(10 * MM);
const COL_GAP = Math.round(5 * MM);
const COL_W = Math.round((PAGE_W - 2 * MARGIN - COL_GAP) / 2);
const TOPIC_BOX_H = Math.round(12 * MM);
const TOPIC_FONT = Math.round(8 * MM / (25.4 / 72)); // ~8pt in px
const PAGE_NUM_FONT = Math.round(3 * MM / (25.4 / 72));
const Q_NUM_FONT = Math.round(7 * MM / (25.4 / 72));
const PAGE_BOTTOM_RESERVE = Math.round(10 * MM); // sayfa numarası için

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

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Görseli en-boy oranını bozmadan canvas içine sığdır (object-fit: contain) */
function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cw: number,
  ch: number
) {
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = cw / ch;
  let dw: number, dh: number, dx: number, dy: number;
  if (ir > cr) {
    dw = cw; dh = cw / ir;
    dx = 0; dy = (ch - dh) / 2;
  } else {
    dh = ch; dw = ch * ir;
    dx = (cw - dw) / 2; dy = 0;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawPageNumber(ctx: CanvasRenderingContext2D, num: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${PAGE_NUM_FONT}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${num}`, PAGE_W / 2, PAGE_H - Math.round(4 * MM));
  ctx.restore();
}

async function buildPages(config: ExportConfig): Promise<HTMLCanvasElement[]> {
  const { questions, topicText, accentColor, templateDataUrl, templateLayout } = config;
  const rowGap = Math.round((config.questionGapMm ?? 3) * MM);
  const bottomLimit = PAGE_H - MARGIN - PAGE_BOTTOM_RESERVE;
  const pages: HTMLCanvasElement[] = [];

  let templateImg: HTMLImageElement | null = null;
  if (templateDataUrl) {
    try { templateImg = await loadImg(templateDataUrl); } catch { /* yoksay */ }
  }

  const qImgs = await Promise.all(questions.map(q => loadImg(q.imageDataUrl)));

  // ── SAYFA 1 ────────────────────────────────────────────────────────────
  const cv1 = document.createElement('canvas');
  cv1.width = PAGE_W; cv1.height = PAGE_H;
  const ctx1 = cv1.getContext('2d')!;

  ctx1.fillStyle = '#fff';
  ctx1.fillRect(0, 0, PAGE_W, PAGE_H);

  // Şablon arka planı — EN-BOY ORANI KORUNUR (contain)
  if (templateImg) {
    drawContain(ctx1, templateImg, PAGE_W, PAGE_H);
  }

  // Konu metni — tanımlanan dikdörtgene yatay+dikey ortalı
  if (templateLayout?.topicRect && topicText) {
    const { x, y, w, h } = templateLayout.topicRect;
    const rx = x * PAGE_W, ry = y * PAGE_H, rw = w * PAGE_W, rh = h * PAGE_H;
    ctx1.save();
    const fs = Math.max(Math.round(rh * 0.38), Math.round(5 * MM));
    ctx1.font = `bold ${fs}px Arial, sans-serif`;
    ctx1.fillStyle = accentColor;
    ctx1.textAlign = 'center';
    ctx1.textBaseline = 'middle';
    ctx1.fillText(topicText, rx + rw / 2, ry + rh / 2, rw * 0.92);
    ctx1.restore();
  }

  // Soru başlangıç Y'si
  const startY = templateLayout?.questionStartY !== undefined
    ? Math.round(templateLayout.questionStartY * PAGE_H)
    : MARGIN;

  // Orta dikey çizgi (başlangıç çizgisinden aşağı)
  const dvX = Math.round(PAGE_W / 2);
  ctx1.save();
  ctx1.strokeStyle = accentColor;
  ctx1.lineWidth = 1.5;
  ctx1.beginPath();
  ctx1.moveTo(dvX, startY);
  ctx1.lineTo(dvX, bottomLimit);
  ctx1.stroke();
  ctx1.restore();

  let col1Y = startY, col2Y = startY;
  let qi = 0;

  outer1: while (qi < questions.length) {
    const q = questions[qi];
    const img = qImgs[qi];
    const rH = Math.round(COL_W * (q.height / q.width));

    let col = col1Y <= col2Y ? 0 : 1;
    let cY = col === 0 ? col1Y : col2Y;

    if (cY + rH > bottomLimit) {
      const other = 1 - col;
      const otherY = other === 0 ? col1Y : col2Y;
      if (otherY + rH <= bottomLimit) { col = other; cY = otherY; }
      else break outer1;
    }

    placeQuestion(ctx1, img, q, qi, col, cY, rowGap);
    if (col === 0) col1Y = cY + rH + rowGap;
    else col2Y = cY + rH + rowGap;
    qi++;
  }

  drawPageNumber(ctx1, 1, accentColor);
  pages.push(cv1);

  // ── SONRAKI SAYFALAR ─────────────────────────────────────────────────────
  let pageNum = 2;
  while (qi < questions.length) {
    const cv = document.createElement('canvas');
    cv.width = PAGE_W; cv.height = PAGE_H;
    const ctx = cv.getContext('2d')!;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    // Konu kutusu
    const boxY = MARGIN;
    const r = Math.round(3 * MM);
    ctx.save();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    roundedRect(ctx, MARGIN, boxY, PAGE_W - 2 * MARGIN, TOPIC_BOX_H, r);
    ctx.stroke();
    if (topicText) {
      ctx.fillStyle = accentColor;
      ctx.font = `bold ${TOPIC_FONT}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(topicText, PAGE_W / 2, boxY + TOPIC_BOX_H / 2, PAGE_W - 2 * MARGIN - Math.round(6 * MM));
    }
    ctx.restore();

    const contentY = boxY + TOPIC_BOX_H + Math.round(4 * MM);

    // Orta çizgi
    ctx.save();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(dvX, contentY);
    ctx.lineTo(dvX, bottomLimit);
    ctx.stroke();
    ctx.restore();

    col1Y = contentY; col2Y = contentY;

    outerN: while (qi < questions.length) {
      const q = questions[qi];
      const img = qImgs[qi];
      const rH = Math.round(COL_W * (q.height / q.width));

      let col = col1Y <= col2Y ? 0 : 1;
      let cY = col === 0 ? col1Y : col2Y;

      if (cY + rH > bottomLimit) {
        const other = 1 - col;
        const otherY = other === 0 ? col1Y : col2Y;
        if (otherY + rH <= bottomLimit) { col = other; cY = otherY; }
        else break outerN;
      }

      placeQuestion(ctx, img, q, qi, col, cY, rowGap);
      if (col === 0) col1Y = cY + rH + rowGap;
      else col2Y = cY + rH + rowGap;
      qi++;
    }

    drawPageNumber(ctx, pageNum, accentColor);
    pages.push(cv);
    pageNum++;
  }

  return pages;
}

function placeQuestion(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  q: Question,
  qi: number,
  col: number,
  cY: number,
  _rowGap: number
) {
  const rH = Math.round(COL_W * (q.height / q.width));
  const x = MARGIN + col * (COL_W + COL_GAP);
  const numStr = `${qi + 1}.`;
  ctx.save();
  ctx.font = `bold ${Q_NUM_FONT}px Arial, sans-serif`;
  ctx.fillStyle = '#000';
  ctx.textAlign = 'left';
  const numW = ctx.measureText(numStr).width + Math.round(2 * MM);
  ctx.fillText(numStr, x, cY + Math.round(4.5 * MM));
  ctx.drawImage(img, x + numW, cY, COL_W - numW, rH);
  ctx.restore();
}

function canvasToJpeg(canvas: HTMLCanvasElement): Uint8Array {
  const dataUrl = canvas.toDataURL('image/jpeg', 0.93);
  const b64 = dataUrl.split(',')[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// A4 nokta boyutları (PDF standardı): 595.28 x 841.89 pt  ≈ 595 x 842
const PDF_W = 595;
const PDF_H = 842;

function buildRawPdf(jpegs: Uint8Array[]): Uint8Array {
  const enc = new TextEncoder();
  const n = jpegs.length;
  const s = (str: string) => enc.encode(str);

  type ObjEntry = { id: number; bytes: Uint8Array };
  const objects: ObjEntry[] = [];
  const catalogId = 1, pagesId = 2;

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
        `<< /Type /Page /Parent ${pagesId} 0 R ` +
        `/MediaBox [0 0 ${PDF_W} ${PDF_H}] ` +
        `/Contents ${contentId} 0 R ` +
        `/Resources << /XObject << /Im1 ${imageId} 0 R >> >> >>`
      )
    });

    const contentData = s(`q ${PDF_W} 0 0 ${PDF_H} 0 0 cm /Im1 Do Q\n`);
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
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) xref += off.toString().padStart(10, '0') + ' 00000 n \n';
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
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  if (action === 'download') {
    const a = document.createElement('a');
    a.href = url;
    a.download = (config.topicText || 'calisma-kagidi') + '.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } else {
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}
