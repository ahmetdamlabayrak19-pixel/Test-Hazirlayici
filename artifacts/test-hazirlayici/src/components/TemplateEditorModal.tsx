import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { db } from '@/lib/db';
import type { Template, TemplateLayout } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { X, Square, Minus, Save, Trash2 } from 'lucide-react';

interface Props {
  template: Template;
  onClose: () => void;
}

type Tool = 'topic' | 'line' | null;

const CANVAS_W = 800;
const CANVAS_H = 1131;

export default function TemplateEditorModal({ template, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<Tool>(null);
  const [layout, setLayout] = useState<TemplateLayout>(template.layout ?? {});
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragCurrent, setDragCurrent] = useState({ x: 0, y: 0 });
  const wasDraggingRef = useRef(false);
  const { toast } = useToast();

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    if (img) {
      ctx.drawImage(img, 0, 0, W, H);
    } else {
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, W, H);
    }

    // Topic rect (saved)
    if (layout.topicRect) {
      const { x, y, w, h } = layout.topicRect;
      ctx.save();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 3;
      ctx.strokeRect(x * W, y * H, w * W, h * H);
      ctx.fillStyle = 'rgba(37,99,235,0.18)';
      ctx.fillRect(x * W, y * H, w * W, h * H);
      ctx.fillStyle = '#1d4ed8';
      ctx.font = `bold ${Math.round(H * 0.022)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('KONU ALANI', (x + w / 2) * W, (y + h / 2) * H);
      ctx.restore();
    }

    // Question start line (saved)
    if (layout.questionStartY !== undefined) {
      const ly = layout.questionStartY * H;
      ctx.save();
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.moveTo(0, ly);
      ctx.lineTo(W, ly);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#dc2626';
      ctx.font = `bold ${Math.round(H * 0.018)}px Arial`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('▶ Soru başlangıç çizgisi', 6, ly - 2);
      ctx.restore();
    }

    // Drag preview rect
    if (dragging && tool === 'topic') {
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const w = Math.abs(dragCurrent.x - dragStart.x);
      const h = Math.abs(dragCurrent.y - dragStart.y);
      ctx.save();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x * W, y * H, w * W, h * H);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }, [layout, dragging, dragStart, dragCurrent, tool]);

  // Load image once
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      redraw();
    };
    img.src = template.imageDataUrl;
  }, [template.imageDataUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    redraw();
  }, [redraw]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'topic') return;
    wasDraggingRef.current = false;
    const coords = getCoords(e);
    setDragStart(coords);
    setDragCurrent(coords);
    setDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging || tool !== 'topic') return;
    wasDraggingRef.current = true;
    setDragCurrent(getCoords(e));
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging || tool !== 'topic') return;
    const coords = getCoords(e);
    const x = Math.min(dragStart.x, coords.x);
    const y = Math.min(dragStart.y, coords.y);
    const w = Math.abs(coords.x - dragStart.x);
    const h = Math.abs(coords.y - dragStart.y);
    if (w > 0.01 && h > 0.005) {
      setLayout(prev => ({ ...prev, topicRect: { x, y, w, h } }));
    }
    setDragging(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'line') {
      const coords = getCoords(e);
      setLayout(prev => ({ ...prev, questionStartY: coords.y }));
    }
  };

  const handleSave = async () => {
    try {
      await db.templates.update(template.id!, { layout });
      toast({ title: 'Kaydedildi', description: 'Şablon düzeni kaydedildi.' });
      onClose();
    } catch {
      toast({ title: 'Hata', description: 'Kaydedilemedi.', variant: 'destructive' });
    }
  };

  const toolHint = tool === 'topic'
    ? '🖱️ Konu başlığının yazılacağı alanı sürükleyerek seçin'
    : tool === 'line'
      ? '🖱️ Soruların başlayacağı yatay çizgiyi tıklayarak belirleyin'
      : 'Yukarıdan bir araç seçin, ardından şablon üzerinde işaretleme yapın';

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl flex flex-col w-full max-w-2xl" style={{ maxHeight: '95vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
          <h2 className="text-base font-bold text-slate-800 truncate">
            Şablon Düzenleyici — <span className="text-primary">{template.name}</span>
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>

        {/* Toolbar */}
        <div className="flex gap-2 px-5 py-2 border-b bg-slate-50 shrink-0 flex-wrap">
          <Button
            size="sm"
            variant={tool === 'topic' ? 'default' : 'outline'}
            onClick={() => setTool(t => t === 'topic' ? null : 'topic')}
          >
            <Square className="w-4 h-4 mr-1.5" />
            Konu Alanı Seç
          </Button>
          <Button
            size="sm"
            variant={tool === 'line' ? 'default' : 'outline'}
            onClick={() => setTool(t => t === 'line' ? null : 'line')}
          >
            <Minus className="w-4 h-4 mr-1.5" />
            Başlangıç Çizgisi Seç
          </Button>
          {layout.topicRect && (
            <Button
              size="sm" variant="ghost"
              className="text-rose-500 hover:text-rose-700"
              onClick={() => setLayout(p => ({ ...p, topicRect: undefined }))}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Konu Alanını Sil
            </Button>
          )}
          {layout.questionStartY !== undefined && (
            <Button
              size="sm" variant="ghost"
              className="text-rose-500 hover:text-rose-700"
              onClick={() => setLayout(p => ({ ...p, questionStartY: undefined }))}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Çizgiyi Sil
            </Button>
          )}
        </div>

        {/* Hint */}
        <div className="text-xs text-slate-500 px-5 py-1.5 bg-slate-50 border-b shrink-0">
          {toolHint}
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-4 flex justify-center items-start bg-slate-100">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="border border-slate-300 shadow-md bg-white"
            style={{
              width: '100%',
              maxWidth: 460,
              height: 'auto',
              cursor: tool === 'topic' ? 'crosshair' : tool === 'line' ? 'row-resize' : 'default',
              userSelect: 'none',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleClick}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-5 py-3 border-t shrink-0">
          <div className="text-xs text-slate-400 space-y-0.5">
            {layout.topicRect
              ? <p className="text-emerald-600">✓ Konu alanı tanımlı</p>
              : <p>Konu alanı tanımlanmadı</p>
            }
            {layout.questionStartY !== undefined
              ? <p className="text-emerald-600">✓ Başlangıç çizgisi tanımlı</p>
              : <p>Başlangıç çizgisi tanımlanmadı</p>
            }
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>İptal</Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Kaydet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
