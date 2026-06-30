import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Link } from 'wouter';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Trash2, Upload } from 'lucide-react';
import { pdfFileToImage, imageFileToDataUrl } from '@/lib/pdf-utils';
import { useToast } from '@/hooks/use-toast';

export default function TemplatesPage() {
  const templates = useLiveQuery(() => db.templates.orderBy('createdAt').reverse().toArray());
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

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
        name: file.name.replace(/\.[^/.]+$/, ""),
        imageDataUrl: dataUrl,
        createdAt: new Date(),
      });

      toast({ title: 'Başarılı', description: 'Şablon eklendi.' });
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

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-primary">Şablonlar</h1>
          </div>
          
          <div>
            <Button onClick={() => document.getElementById('template-upload')?.click()} disabled={isUploading}>
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

        {!templates ? (
          <div className="text-center p-12 text-slate-500">Yükleniyor...</div>
        ) : templates.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-lg border border-dashed border-slate-300">
            <p className="text-lg text-slate-500 mb-2">Henüz şablon eklenmemiş.</p>
            <p className="text-sm text-slate-400">Arkaplan olarak kullanmak üzere PDF veya resim (A4 boyutunda) yükleyebilirsiniz.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {templates.map(template => (
              <Card key={template.id} className="flex flex-col overflow-hidden">
                <div className="h-48 bg-slate-100 flex items-center justify-center p-2 border-b">
                  <img 
                    src={template.imageDataUrl} 
                    alt={template.name} 
                    className="max-h-full max-w-full object-contain shadow-sm border bg-white"
                  />
                </div>
                <CardHeader className="py-3">
                  <CardTitle className="text-base line-clamp-1" title={template.name}>
                    {template.name}
                  </CardTitle>
                </CardHeader>
                <CardFooter className="py-3 bg-slate-50/50 border-t justify-end">
                  <Button variant="destructive" size="sm" onClick={() => template.id && handleDelete(template.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Sil
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
