import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FilePlus2, Library, LayoutTemplate, Settings } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-4 tracking-tight">Test Hazırlayıcı Pro</h1>
          <p className="text-lg text-slate-600">Profesyonel A4 test kağıtları oluşturun.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/tests/new">
            <Card className="hover-elevate cursor-pointer border-transparent hover:border-primary/20 transition-all h-full">
              <CardHeader className="text-center py-10">
                <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-primary">
                  <FilePlus2 className="w-8 h-8" />
                </div>
                <CardTitle className="text-2xl">Yeni Test Oluştur</CardTitle>
                <CardDescription className="text-base mt-2">
                  PDF'den soru kırpıp testinizi hazırlamaya başlayın.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/tests">
            <Card className="hover-elevate cursor-pointer border-transparent hover:border-primary/20 transition-all h-full">
              <CardHeader className="text-center py-10">
                <div className="mx-auto bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-slate-600">
                  <Library className="w-8 h-8" />
                </div>
                <CardTitle className="text-2xl">Kayıtlı Testler</CardTitle>
                <CardDescription className="text-base mt-2">
                  Daha önce oluşturduğunuz testleri düzenleyin.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/templates">
            <Card className="hover-elevate cursor-pointer border-transparent hover:border-primary/20 transition-all h-full">
              <CardHeader className="text-center py-10">
                <div className="mx-auto bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-slate-600">
                  <LayoutTemplate className="w-8 h-8" />
                </div>
                <CardTitle className="text-2xl">Şablonlar</CardTitle>
                <CardDescription className="text-base mt-2">
                  Arkaplan şablonları ekleyin ve yönetin.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/settings">
            <Card className="hover-elevate cursor-pointer border-transparent hover:border-primary/20 transition-all h-full">
              <CardHeader className="text-center py-10">
                <div className="mx-auto bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-slate-600">
                  <Settings className="w-8 h-8" />
                </div>
                <CardTitle className="text-2xl">Ayarlar</CardTitle>
                <CardDescription className="text-base mt-2">
                  Uygulama tercihlerini yapılandırın.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
