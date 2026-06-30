import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db, Question, HeaderConfig, TestProject } from '@/lib/db';
import PdfViewer from '@/components/PdfViewer';
import QuestionPool from '@/components/QuestionPool';
import TestBuilder from '@/components/TestBuilder';
import HeaderConfigPanel from '@/components/HeaderConfig';

export default function TestWorkspacePage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [projectName, setProjectName] = useState('İsimsiz Test');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>({
    enabled: true,
    showName: true,
    showClass: true,
    showNumber: true,
    showDate: true,
    testTitle: '',
  });
  const [templateId, setTemplateId] = useState<number | undefined>();
  const [templateUsage, setTemplateUsage] = useState<'first' | 'all' | 'none'>('none');

  useEffect(() => {
    if (id && id !== 'new') {
      db.testProjects.get(parseInt(id)).then(project => {
        if (project) {
          setProjectName(project.name);
          setQuestions(project.questions || []);
          if (project.headerConfig) setHeaderConfig(project.headerConfig);
          setTemplateId(project.templateId);
          setTemplateUsage(project.templateUsage || 'none');
        }
      });
    }
  }, [id]);

  const handleSave = async () => {
    try {
      const project: TestProject = {
        name: projectName,
        questions,
        headerConfig,
        templateId,
        templateUsage,
        updatedAt: new Date(),
        createdAt: new Date(), // Will be overwritten if updating
      };

      if (id && id !== 'new') {
        await db.testProjects.update(parseInt(id), project);
        toast({ title: 'Başarılı', description: 'Test kaydedildi.' });
      } else {
        const newId = await db.testProjects.add(project);
        toast({ title: 'Başarılı', description: 'Yeni test oluşturuldu.' });
        setLocation(`/tests/${newId}`);
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Hata', description: 'Test kaydedilemedi.', variant: 'destructive' });
    }
  };

  const handleQuestionCropped = (imageDataUrl: string, width: number, height: number) => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      imageDataUrl,
      width,
      height,
      order: questions.length,
    };
    setQuestions([...questions, newQuestion]);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Input 
            value={projectName} 
            onChange={(e) => setProjectName(e.target.value)}
            className="w-64 font-semibold text-lg border-transparent hover:border-slate-200 focus-visible:ring-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 mr-4">{questions.length} Soru</span>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Kaydet
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex">
        <Tabs defaultValue="viewer" className="w-full flex flex-col">
          <div className="px-4 pt-2 bg-white border-b">
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent gap-4">
              <TabsTrigger 
                value="viewer" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-2"
              >
                PDF Görüntüleyici
              </TabsTrigger>
              <TabsTrigger 
                value="pool"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-2"
              >
                Soru Havuzu ({questions.length})
              </TabsTrigger>
              <TabsTrigger 
                value="builder"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-2"
              >
                Test Oluşturucu
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <TabsContent value="viewer" className="m-0 h-full p-4">
              <PdfViewer onQuestionCropped={handleQuestionCropped} />
            </TabsContent>
            
            <TabsContent value="pool" className="m-0 h-full">
              <QuestionPool questions={questions} setQuestions={setQuestions} />
            </TabsContent>
            
            <TabsContent value="builder" className="m-0 h-full flex flex-col md:flex-row p-4 gap-4">
              <div className="w-full md:w-80 shrink-0 flex flex-col gap-4 overflow-y-auto">
                <HeaderConfigPanel config={headerConfig} onChange={setHeaderConfig} />
              </div>
              <div className="flex-1 overflow-hidden border rounded-md shadow-sm">
                <TestBuilder 
                  questions={questions} 
                  headerConfig={headerConfig} 
                  templateId={templateId}
                  templateUsage={templateUsage}
                  onTemplateChange={(id, usage) => {
                    setTemplateId(id);
                    if (usage) setTemplateUsage(usage);
                  }}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
