import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { loadPdf, renderPageToCanvas } from '@/lib/pdf-utils';
import { Upload, ZoomIn, ZoomOut, MousePointer2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PdfViewerProps {
  onQuestionCropped: (imageDataUrl: string, width: number, height: number, type: 'question' | 'note') => void;
}

export default function PdfViewer({ onQuestionCropped }: PdfViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const doc = await loadPdf(file);
      setPdfDoc(doc);
      setNumPages(doc.numPages);
    } catch (err) {
      console.error(err);
      toast({ title: 'Hata', description: 'PDF yüklenemedi.', variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border rounded-md overflow-hidden">
      <div className="p-2 border-b bg-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => document.getElementById('pdf-upload')?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            PDF Yükle
          </Button>
          <input
            id="pdf-upload"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.25))} disabled={!pdfDoc}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.min(3, s + 0.25))} disabled={!pdfDoc}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 bg-slate-100 relative" ref={containerRef}>
        {!pdfDoc ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <MousePointer2 className="w-12 h-12 mb-4 opacity-50" />
            <p>Soru kırpmak için bir PDF yükleyin</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {Array.from({ length: numPages }, (_, i) => (
              <PdfPage
                key={i + 1}
                pageNumber={i + 1}
                pdfDoc={pdfDoc}
                scale={scale}
                onCrop={onQuestionCropped}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Kırpma her zaman bu sabit yüksek çözünürlük ölçeğinden yapılır; ekran zoom
// seviyesinden (scale) tamamen bağımsızdır, böylece düşük zoomda bile net kalite elde edilir.
const CROP_RENDER_SCALE = 3;

function PdfPage({ pageNumber, pdfDoc, scale, onCrop }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const hiResCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [pendingCrop, setPendingCrop] = useState<{ dataUrl: string; w: number; h: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    const renderPage = async () => {
      if (!canvasRef.current || !pdfDoc) return;
      const page = await pdfDoc.getPage(pageNumber);
      if (!active) return;
      await renderPageToCanvas(page, canvasRef.current, scale);
    };
    renderPage();
    return () => { active = false; };
  }, [pageNumber, pdfDoc, scale]);

  // Sayfa veya belge değişirse önbelleğe alınmış yüksek çözünürlüklü canvas geçersiz olur
  useEffect(() => {
    hiResCanvasRef.current = null;
  }, [pageNumber, pdfDoc]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPos({ x, y });
    setCurrentPos({ x, y });
    setIsDrawing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    setCurrentPos({ x, y });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const w = Math.abs(currentPos.x - startPos.x);
    const h = Math.abs(currentPos.y - startPos.y);

    if (w > 20 && h > 20) {
      cropSelection(x, y, w, h);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawing) {
        setIsDrawing(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing]);

  const cropSelection = async (x: number, y: number, w: number, h: number) => {
    if (!canvasRef.current || !pdfDoc) return;

    // Ekranda seçilen alanı, görüntülenen (zoom'a bağlı) canvas'a göre 0-1
    // aralığında oransal koordinatlara çevir. Bu oranlar zoom seviyesinden bağımsızdır.
    const displayW = canvasRef.current.width;
    const displayH = canvasRef.current.height;
    const rx = x / displayW;
    const ry = y / displayH;
    const rw = w / displayW;
    const rh = h / displayH;

    // PDF sayfasını sabit yüksek çözünürlükte bir kere render edip önbelleğe al;
    // kırpma her zaman bu yüksek çözünürlüklü kaynaktan yapılır (ekran zoom'undan bağımsız).
    let hiResCanvas = hiResCanvasRef.current;
    if (!hiResCanvas) {
      const page = await pdfDoc.getPage(pageNumber);
      hiResCanvas = document.createElement('canvas');
      await renderPageToCanvas(page, hiResCanvas, CROP_RENDER_SCALE);
      hiResCanvasRef.current = hiResCanvas;
    }

    const cropX = rx * hiResCanvas.width;
    const cropY = ry * hiResCanvas.height;
    const cropW = rw * hiResCanvas.width;
    const cropH = rh * hiResCanvas.height;

    const offscreen = document.createElement('canvas');
    offscreen.width = cropW;
    offscreen.height = cropH;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(hiResCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    const dataUrl = offscreen.toDataURL('image/png');

    // Kaydetmeden önce kullanıcıya içerik tipini sor
    setPendingCrop({ dataUrl, w: cropW, h: cropH });
  };

  const confirmPendingCrop = (type: 'question' | 'note') => {
    if (!pendingCrop) return;
    onCrop(pendingCrop.dataUrl, pendingCrop.w, pendingCrop.h, type);
    toast({
      title: 'Başarılı',
      description: type === 'note' ? 'Hap bilgi eklendi.' : 'Soru eklendi.',
      duration: 2000,
    });
    setPendingCrop(null);
  };

  const drawLeft = Math.min(startPos.x, currentPos.x);
  const drawTop = Math.min(startPos.y, currentPos.y);
  const drawWidth = Math.abs(currentPos.x - startPos.x);
  const drawHeight = Math.abs(currentPos.y - startPos.y);

  return (
    <div className="relative shadow-md" style={{ display: 'inline-block' }}>
      <canvas ref={canvasRef} className="block pointer-events-none" />
      <div 
        ref={overlayRef}
        className="absolute inset-0 cursor-crosshair touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {isDrawing && (
          <div 
            className="absolute border-2 border-primary border-dashed bg-primary/10"
            style={{
              left: drawLeft,
              top: drawTop,
              width: drawWidth,
              height: drawHeight,
            }}
          />
        )}
      </div>

      {pendingCrop && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-4 w-72 flex flex-col gap-3">
            <p className="text-sm font-medium text-slate-700 text-center">Bu içerik nedir?</p>
            <img
              src={pendingCrop.dataUrl}
              alt="Seçilen alan"
              className="max-h-40 w-full object-contain border rounded bg-slate-50"
            />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => confirmPendingCrop('question')}>
                Soru
              </Button>
              <Button className="flex-1" variant="secondary" onClick={() => confirmPendingCrop('note')}>
                Hap Bilgi
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPendingCrop(null)}>
              Vazgeç
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
