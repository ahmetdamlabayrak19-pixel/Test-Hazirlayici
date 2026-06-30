import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Info } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-primary">Ayarlar</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Uygulama Bilgisi</CardTitle>
            <CardDescription>Test Hazırlayıcı Pro hakkında</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-600">
            <div className="flex gap-3 bg-blue-50 text-blue-800 p-4 rounded-md border border-blue-200">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">100% Çevrimdışı Çalışır</p>
                <p className="text-sm">
                  Tüm verileriniz tarayıcınızın yerel depolamasında (IndexedDB) tutulur. 
                  Hiçbir PDF veya soru sunucuya yüklenmez, internet bağlantısı olmadan da kullanabilirsiniz.
                </p>
              </div>
            </div>
            
            <div>
              <p className="font-semibold text-slate-900 mt-6 mb-2">Veri Temizliği</p>
              <p className="text-sm mb-4">
                Tarayıcı geçmişini temizlerken "Site verilerini" silerseniz kayıtlı testleriniz ve şablonlarınız kaybolabilir.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
