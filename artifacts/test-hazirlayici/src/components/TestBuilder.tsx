import { useState } from 'react';
import { Button } from './ui/button';
import { generateTestPdf } from '@/lib/pdf-export';
import type { Question, HeaderConfig } from '@/lib/db';
import { FileDown, Eye, Printer } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useToast } from '@/hooks/use-toast';

interface TestBuilderProps {
  questions: Question[];
  headerConfig: HeaderConfig;
  templateId?: number;
  templateUsage: 'first' | 'all' | 'none';
  onTemplateChange: (id?: number, usage?: 'first' | 'all' | 'none') => void;
}

export default function TestBuilder({ questions, headerConfig, templateId, templateUsage, onTemplateChange }: TestBuilderProps) {
  const templates = useLiveQuery(() => db.templates.toArray());
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const run = async (action: 'download' | 'preview' | 'print') => {
    if (questions.length === 0) {
      toast({ title: 'Uyarı', description: 'Önce soru ekleyin.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    try {
      const template = templates?.find(t => t.id === templateId);
      await generateTestPdf({
        questions,
        headerConfig,
        templateDataUrl: template?.imageDataUrl,
        templateUsage,
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
      <div className="p-4 border-b bg-white flex flex-col gap-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="mb-2 block text-sm font-medium">Şablon Seçimi</Label>
            <Select
              value={templateId ? templateId.toString() : 'none'}
              onValueChange={(val) => onTemplateChange(val === 'none' ? undefined : parseInt(val), templateUsage)}
            >
              <SelectTrigger data-testid="select-template">
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

          {templateId && (
            <div className="min-w-[220px]">
              <Label className="mb-2 block text-sm font-medium">Şablon Kullanımı</Label>
              <RadioGroup
                value={templateUsage}
                onValueChange={(val) => onTemplateChange(templateId, val as 'first' | 'all')}
                className="flex items-center gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="first" id="u-first" />
                  <Label htmlFor="u-first">İlk sayfada</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="u-all" />
                  <Label htmlFor="u-all">Tüm sayfalarda</Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            onClick={() => run('preview')}
            disabled={questions.length === 0 || isGenerating}
            variant="outline"
            className="flex-1"
            data-testid="button-preview"
          >
            <Eye className="w-4 h-4 mr-2" />
            Önizle
          </Button>
          <Button
            onClick={() => run('download')}
            disabled={questions.length === 0 || isGenerating}
            className="flex-1"
            data-testid="button-download"
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
            data-testid="button-print"
          >
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col items-center gap-4 bg-slate-200">
        {questions.length === 0 ? (
          <div className="bg-white border rounded-lg p-12 text-center text-slate-500 shadow-sm w-full max-w-2xl">
            <p className="text-base font-medium">Önizleme için soru ekleyin</p>
            <p className="text-sm mt-1 text-slate-400">PDF Görüntüleyici sekmesinden soru kırpın</p>
          </div>
        ) : (
          <div className="bg-white border rounded-lg shadow-sm w-full max-w-2xl" style={{ aspectRatio: '1/1.414' }}>
            <div className="p-6 h-full flex flex-col">
              {headerConfig.enabled && (
                <div className="border-b pb-3 mb-4">
                  {headerConfig.testTitle && (
                    <h2 className="text-center font-bold text-lg mb-2">{headerConfig.testTitle}</h2>
                  )}
                  <div className="flex gap-4 text-sm text-slate-600 flex-wrap">
                    {headerConfig.showName && <span>Ad Soyad: ___________________</span>}
                    {headerConfig.showClass && <span>Sınıf: _______</span>}
                    {headerConfig.showNumber && <span>No: _______</span>}
                    {headerConfig.showDate && <span>Tarih: __ / __ / ______</span>}
                  </div>
                </div>
              )}
              <div className="columns-2 gap-4 flex-1">
                {questions.map((q, i) => (
                  <div key={q.id} className="break-inside-avoid mb-3">
                    <div className="flex items-start gap-1">
                      <span className="text-xs font-bold shrink-0 mt-1">{i + 1}.</span>
                      <img
                        src={q.imageDataUrl}
                        alt={`Soru ${i + 1}`}
                        className="w-full h-auto block"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <p className="text-xs text-slate-400">
          {questions.length} soru — PDF oluşturmak için "PDF İndir" butonuna tıklayın
        </p>
      </div>
    </div>
  );
}
