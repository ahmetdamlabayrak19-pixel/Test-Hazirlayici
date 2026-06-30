import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Template } from '@/lib/db';
import { Link } from 'wouter';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Upload, Settings2, CheckCircle2 } from 'lucide-react';
import { pdfFileToImage, imageFileToDataUrl } from '@/lib/pdf-utils';
import { useToast } from '@/hooks/use-toast';
import TemplateEditorModal from '@/components/TemplateEditorModal';

export default function TemplatesPage() {
  const templates = useLiveQuery(() => db.templates.orderBy('createdAt').reverse().toArray());
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let dataUrl = '';
      if (file.type === 'application/pdf') {
        dataUrl = await pdfFileToImage(file);
      } else if (file.type.startsWith('image/')) {
        dataUrl = await imageFileToDataUrl(file);
      } else {
        throw new Error('Geçersiz dosya formatı');
      }

      await db.templates.add({
        name: file.name.replace(/\.[^/.]+$/, ''),
        imageDataUrl: dataUrl,
        createdAt: new Date(),
      });

      toast({ title: 'Başarılı', description: 'Şablon eklendi. Şimdi "Düzenle" ile konu alanı ve çizgiyi tanımlayın.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Hata', description: 'Şablon eklenemedi.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Bu şablonu silmek istediğinize emin misiniz?')) {
      await db.templates.delete(id);
    }
  };

  const hasLayout = (t: Template) =>
    t.layout?.topicRect !== undefined || t.layout?.questionStartY !== undefined;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-primary">Şablonlar</h1>
          </div>

          <div>
            <Button
              onClick={() => document.getElementById('template-upload')?.click()}
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? 'Yükleniyor...' : 'Şablon Ekle (PDF/Resim)'}
            </Button>
            <input
              id="template-upload"
              type="file"
              accept=".pdf,image/png,image/jpeg"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        </div>

        {/* Info banner */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
          <strong>Şablon Düzenleyici:</strong> Her şablonda "Düzenle" butonuna tıklayarak <em>konu alanı</em> (metnin yazılacağı dikdörtgen) ve <em>soru başlangıç çizgisi</em> (soruların nerede başlayacağı) tanımlayabilirsiniz.
        </div>

        {!templates ? (
          <div className="text-center p-12 text-slate-500">Yükleniyor...</div>
        ) : templates.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-lg border border-dashed border-slate-300">
            <p className="text-lg text-slate-500 mb-2">Henüz şablon eklenmemiş.</p>
            <p className="text-sm text-slate-400">
              A4 boyutunda bir PDF veya resim yükleyerek başlayın.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {templates.map(template => (
              <Card key={template.id} className="flex flex-col overflow-hidden">
                <div className="relative h-48 bg-slate-100 flex items-center justify-center p-2 border-b">
                  <img
                    src={template.imageDataUrl}
                    alt={template.name}
                    className="max-h-full max-w-full object-contain shadow-sm border bg-white"
                  />
                  {hasLayout(template) && (
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-0.5" title="Düzen tanımlı">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <CardHeader className="py-3">
                  <CardTitle className="text-sm line-clamp-1" title={template.name}>
                    {template.name}
                  </CardTitle>
                  <div className="text-xs text-slate-400 space-y-0.5 mt-1">
                    {template.layout?.topicRect
                      ? <p className="text-emerald-600">✓ Konu alanı tanımlı</p>
                      : <p>Konu alanı tanımlanmadı</p>
                    }
                    {template.layout?.questionStartY !== undefined
                      ? <p className="text-emerald-600">✓ Başlangıç çizgisi tanımlı</p>
                      : <p>Başlangıç çizgisi tanımlanmadı</p>
                    }
                  </div>
                </CardHeader>

                <CardFooter className="py-3 bg-slate-50/50 border-t flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditingTemplate(template)}
                  >
                    <Settings2 className="w-3.5 h-3.5 mr-1" />
                    Düzenle
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => template.id && handleDelete(template.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {editingTemplate && (
        <TemplateEditorModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}
    </div>
  );
}
