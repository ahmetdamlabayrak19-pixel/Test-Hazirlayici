import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Link } from 'wouter';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, FileText, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function SavedTestsPage() {
  const tests = useLiveQuery(() => db.testProjects.orderBy('updatedAt').reverse().toArray());

  const handleDelete = async (id: number) => {
    if (confirm('Bu testi silmek istediğinize emin misiniz?')) {
      await db.testProjects.delete(id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-primary">Kayıtlı Testler</h1>
        </div>

        {!tests ? (
          <div className="text-center p-12 text-slate-500">Yükleniyor...</div>
        ) : tests.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-lg border border-dashed border-slate-300">
            <p className="text-lg text-slate-500 mb-4">Henüz kayıtlı test yok.</p>
            <Link href="/tests/new">
              <Button>Yeni Test Oluştur</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map(test => (
              <Card key={test.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="line-clamp-1" title={test.name}>{test.name || 'İsimsiz Test'}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex items-center text-sm text-slate-500 mb-2">
                    <FileText className="w-4 h-4 mr-2" />
                    {test.questions?.length || 0} Soru
                  </div>
                  <div className="flex items-center text-sm text-slate-500">
                    <Clock className="w-4 h-4 mr-2" />
                    {format(test.updatedAt || new Date(), 'dd MMM yyyy HH:mm', { locale: tr })}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t bg-slate-50/50 p-4">
                  <Button variant="destructive" size="icon" onClick={() => test.id && handleDelete(test.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Link href={`/tests/${test.id}`}>
                    <Button>Aç</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
