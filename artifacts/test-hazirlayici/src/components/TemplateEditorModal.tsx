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
  const toolRef = useRef<Tool>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragCurrentRef = useRef({ x: 0, y: 0 });
  const layoutRef = useRef<TemplateLayout>(template.layout ?? {});

  const [tool, setToolState] = useState<Tool>(null);
  const [layout, setLayout] = useState<TemplateLayout>(template.layout ?? {});
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const { toast } = useToast();

  // Keep refs in sync with state
  const setTool = (t: Tool | ((prev: Tool) => Tool)) => {
    const next = typeof t === 'function' ? t(toolRef.current) : t;
    toolRef.current = next;
    setToolState(next);
  };

  const updateLayout = useCallback((next: TemplateLayout) => {
    layoutRef.current = next;
    setLayout(next);
  }, []);

  // Canvas coordinate helper – uses getBoundingClientRect (display size → 0-1 ratio)
  const getCoords = (e: MouseEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  // Draw everything on the canvas
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

    const current = layoutRef.current;

    // Saved topic rect
    if (current.topicRect) {
      const { x, y, w, h } = current.topicRect;
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

    // Saved question start line
    if (current.questionStartY !== undefined) {
      const ly = current.questionStartY * H;
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
      ctx.fillText('▶ Soru başlangıç çizgisi', 8, ly - 4);
      ctx.restore();
    }
  }, []);

  // Draw drag preview separately on top (called via requestAnimationFrame)
  const drawPreview = useCallback((preview: { x: number; y: number; w: number; h: number } | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;

    redraw();

    if (preview) {
      ctx.save();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(preview.x * W, preview.y * H, preview.w * W, preview.h * H);
      ctx.fillStyle = 'rgba(37,99,235,0.08)';
      ctx.fillRect(preview.x * W, preview.y * H, preview.w * W, preview.h * H);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }, [redraw]);

  // Load image once
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      redraw();
    };
    img.src = template.imageDataUrl;
  }, [template.imageDataUrl, redraw]);

  // Re-draw when saved layout changes
  useEffect(() => {
    redraw();
  }, [layout, redraw]);

  // Native event listeners on the canvas (avoid stale closure issues)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => {
      if (toolRef.current !== 'topic') return;
      e.preventDefault();
      const coords = getCoords(e);
      dragStartRef.current = coords;
      dragCurrentRef.current = coords;
      isDraggingRef.current = true;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || toolRef.current !== 'topic') return;
      e.preventDefault();
      const coords = getCoords(e);
      dragCurrentRef.current = coords;

      const x = Math.min(dragStartRef.current.x, coords.x);
      const y = Math.min(dragStartRef.current.y, coords.y);
      const w = Math.abs(coords.x - dragStartRef.current.x);
      const h = Math.abs(coords.y - dragStartRef.current.y);

      const preview = { x, y, w, h };
      setDragPreview(preview);
      drawPreview(preview);
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!isDraggingRef.current || toolRef.current !== 'topic') return;
      isDraggingRef.current = false;
      const coords = getCoords(e);

      const x = Math.min(dragStartRef.current.x, coords.x);
      const y = Math.min(dragStartRef.current.y, coords.y);
      const w = Math.abs(coords.x - dragStartRef.current.x);
      const h = Math.abs(coords.y - dragStartRef.current.y);

      setDragPreview(null);

      if (w > 0.01 && h > 0.005) {
        const next = { ...layoutRef.current, topicRect: { x, y, w, h } };
        updateLayout(next);
      } else {
        redraw();
      }
    };

    const onClick = (e: MouseEvent) => {
      if (toolRef.current !== 'line') return;
      const coords = getCoords(e);
      const next = { ...layoutRef.current, questionStartY: coords.y };
      updateLayout(next);
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('click', onClick);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('click', onClick);
    };
  }, [drawPreview, redraw, updateLayout]);

  const handleSave = async () => {
    try {
      await db.templates.update(template.id!, { layout });
      toast({ title: 'Kaydedildi', description: 'Şablon düzeni kaydedildi.' });
      onClose();
    } catch {
      toast({ title: 'Hata', description: 'Kaydedilemedi.', variant: 'destructive' });
    }
  };

  const toolHint =
    tool === 'topic'
      ? '🖱️ Konu başlığının yazılacağı alanı sürükleyerek seçin'
      : tool === 'line'
        ? '🖱️ Soruların başlayacağı yatay çizgiyi tıklayarak belirleyin'
        : 'Yukarıdan bir araç seçin, ardından şablon üzerinde işaretleme yapın';

  const cursor =
    tool === 'topic'
      ? isDraggingRef.current || dragPreview ? 'crosshair' : 'crosshair'
      : tool === 'line'
        ? 'row-resize'
        : 'default';

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
              onClick={() => {
                const next = { ...layoutRef.current };
                delete next.topicRect;
                updateLayout(next);
              }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Konu Alanını Sil
            </Button>
          )}
          {layout.questionStartY !== undefined && (
            <Button
              size="sm" variant="ghost"
              className="text-rose-500 hover:text-rose-700"
              onClick={() => {
                const next = { ...layoutRef.current };
                delete next.questionStartY;
                updateLayout(next);
              }}
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
            className="border border-slate-300 shadow-md bg-white select-none"
            style={{
              width: '100%',
              maxWidth: 460,
              height: 'auto',
              cursor,
              touchAction: 'none',
            }}
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
