import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { generateTestPdf } from '@/lib/pdf-export';
import type { Question } from '@/lib/db';
import { FileDown, Eye, Printer, Settings2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useToast } from '@/hooks/use-toast';
import TemplateEditorModal from './TemplateEditorModal';

interface TestBuilderProps {
  questions: Question[];
  topicText: string;
  accentColor: string;
  questionGapMm: number;
  templateId?: number;
  onTopicTextChange: (v: string) => void;
  onAccentColorChange: (v: string) => void;
  onQuestionGapChange: (v: number) => void;
  onTemplateChange: (id?: number) => void;
}

export default function TestBuilder({
  questions,
  topicText,
  accentColor,
  questionGapMm,
  templateId,
  onTopicTextChange,
  onAccentColorChange,
  onQuestionGapChange,
  onTemplateChange,
}: TestBuilderProps) {
  const templates = useLiveQuery(() => db.templates.toArray());
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const { toast } = useToast();

  const selectedTemplate = templates?.find(t => t.id === templateId);

  const run = async (action: 'download' | 'preview' | 'print') => {
    if (questions.length === 0) {
      toast({ title: 'Uyarı', description: 'Önce soru ekleyin.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    try {
      await generateTestPdf({
        questions,
        topicText,
        accentColor,
        questionGapMm,
        templateDataUrl: selectedTemplate?.imageDataUrl,
        templateLayout: selectedTemplate?.layout,
      }, action);
    } catch (err) {
      console.error(err);
      toast({ title: 'Hata', description: 'PDF oluşturulamadı.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Controls */}
      <div className="p-4 border-b bg-white flex flex-col gap-4 shrink-0 overflow-y-auto">

        {/* Konu + Renk */}
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <Label className="mb-1.5 block text-sm font-medium">Konu Başlığı</Label>
            <Input
              value={topicText}
              onChange={e => onTopicTextChange(e.target.value)}
              placeholder="ör. KESİRLERDE TOPLAMA"
              className="font-medium"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-sm font-medium">Renk</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={e => onAccentColorChange(e.target.value)}
                className="w-9 h-9 rounded cursor-pointer border border-slate-200 p-0.5"
                title="Konu kutusu ve çizgi rengi"
              />
              <span className="text-xs text-slate-400 font-mono">{accentColor}</span>
            </div>
          </div>
        </div>

        {/* Soru arası boşluk */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">Sorular Arası Boşluk</Label>
            <span className="text-sm font-semibold text-primary">{questionGapMm} mm</span>
          </div>
          <Slider
            min={0}
            max={80}
            step={1}
            value={[questionGapMm]}
            onValueChange={([v]) => onQuestionGapChange(v)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0 mm (sıkışık)</span>
            <span>80 mm (geniş)</span>
          </div>
        </div>

        {/* Şablon */}
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <Label className="mb-1.5 block text-sm font-medium">İlk Sayfa Şablonu</Label>
            <Select
              value={templateId ? templateId.toString() : 'none'}
              onValueChange={val => onTemplateChange(val === 'none' ? undefined : parseInt(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Şablon seçin..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Şablon Yok</SelectItem>
                {templates?.map(t => (
                  <SelectItem key={t.id} value={t.id!.toString()}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditingTemplate(true)}
              className="h-9"
            >
              <Settings2 className="w-4 h-4 mr-1.5" />
              Şablonu Düzenle
            </Button>
          )}
        </div>

        {/* Şablon bilgi */}
        {selectedTemplate && (
          <div className="text-xs rounded-md bg-blue-50 border border-blue-100 px-3 py-2 text-blue-700 space-y-0.5">
            {selectedTemplate.layout?.topicRect
              ? <p>✓ Konu alanı tanımlı — başlık şablona yazılacak</p>
              : <p>⚠ Konu alanı tanımlanmadı — "Şablonu Düzenle" ile tanımlayın</p>
            }
            {selectedTemplate.layout?.questionStartY !== undefined
              ? <p>✓ Soru başlangıç çizgisi tanımlı</p>
              : <p>⚠ Başlangıç çizgisi tanımlanmadı — sorular sayfa başından başlar</p>
            }
          </div>
        )}

        {/* PDF Butonları */}
        <div className="flex items-center gap-2 pt-1 border-t">
          <Button
            onClick={() => run('preview')}
            disabled={questions.length === 0 || isGenerating}
            variant="outline"
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            Önizle
          </Button>
          <Button
            onClick={() => run('download')}
            disabled={questions.length === 0 || isGenerating}
            className="flex-1"
          >
            <FileDown className="w-4 h-4 mr-2" />
            {isGenerating ? 'Oluşturuluyor...' : 'PDF İndir'}
          </Button>
          <Button
            onClick={() => run('print')}
            disabled={questions.length === 0 || isGenerating}
            variant="secondary"
            size="icon"
            title="Yazdır"
          >
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Önizleme */}
      <div className="flex-1 overflow-auto p-6 flex flex-col items-center gap-4 bg-slate-200">
        {questions.length === 0 ? (
          <div className="bg-white border rounded-lg p-12 text-center text-slate-500 shadow-sm w-full max-w-xl">
            <p className="text-base font-medium">Önizleme için soru ekleyin</p>
            <p className="text-sm mt-1 text-slate-400">PDF Görüntüleyici sekmesinden soru kırpın</p>
          </div>
        ) : (
          <div
            className="bg-white border rounded-lg shadow-sm w-full max-w-xl overflow-hidden"
            style={{ aspectRatio: '210/297' }}
          >
            <div className="p-4 h-full flex flex-col text-[10px]">
              {/* Konu kutusu */}
              <div
                className="border-2 rounded text-center py-1.5 mb-3 font-bold tracking-wide shrink-0"
                style={{ borderColor: accentColor, color: accentColor }}
              >
                {topicText || 'KONU BAŞLIĞI'}
              </div>
              {/* 2 sütun */}
              <div className="flex flex-1 gap-3 overflow-hidden relative min-h-0">
                <div
                  className="absolute left-1/2 top-0 bottom-0 w-px"
                  style={{ backgroundColor: accentColor }}
                />
                <div className="flex-1 overflow-hidden flex flex-col" style={{ gap: `${questionGapMm * 0.4}px` }}>
                  {questions.filter((_, i) => i % 2 === 0).map((q, i) => (
                    <div key={q.id} className="flex items-start gap-0.5 shrink-0">
                      <span className="font-bold shrink-0">{i * 2 + 1}.</span>
                      <img src={q.imageDataUrl} alt="" className="w-full h-auto" />
                    </div>
                  ))}
                </div>
                <div className="flex-1 overflow-hidden flex flex-col" style={{ gap: `${questionGapMm * 0.4}px` }}>
                  {questions.filter((_, i) => i % 2 === 1).map((q, i) => (
                    <div key={q.id} className="flex items-start gap-0.5 shrink-0">
                      <span className="font-bold shrink-0">{i * 2 + 2}.</span>
                      <img src={q.imageDataUrl} alt="" className="w-full h-auto" />
                    </div>
                  ))}
                </div>
              </div>
              {/* Sayfa no */}
              <div className="text-center mt-1 shrink-0" style={{ color: accentColor, fontSize: '0.55rem' }}>1</div>
            </div>
          </div>
        )}
        <p className="text-xs text-slate-400">
          {questions.length} soru · boşluk {questionGapMm}mm · PDF için "Önizle" veya "PDF İndir"
        </p>
      </div>

      {editingTemplate && selectedTemplate && (
        <TemplateEditorModal
          template={selectedTemplate}
          onClose={() => setEditingTemplate(false)}
        />
      )}
    </div>
  );
}
