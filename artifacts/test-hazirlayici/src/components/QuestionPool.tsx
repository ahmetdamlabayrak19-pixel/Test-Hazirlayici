import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { GripVertical, Trash2, ZoomIn } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Question } from '@/lib/db';

function TypeBadge({
  type,
  onToggle,
}: {
  type: 'question' | 'note';
  onToggle: () => void;
}) {
  const isNote = type === 'note';
  return (
    <button
      type="button"
      onClick={onToggle}
      title="Tipini değiştirmek için tıklayın"
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
        isNote
          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
          : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
      }`}
    >
      {isNote ? 'HAP BİLGİ' : 'SORU'}
    </button>
  );
}

interface QuestionPoolProps {
  questions: Question[];
  setQuestions: (questions: Question[]) => void;
}

export default function QuestionPool({ questions, setQuestions }: QuestionPoolProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex(q => q.id === active.id);
      const newIndex = questions.findIndex(q => q.id === over.id);
      
      const newQuestions = [...questions];
      const [moved] = newQuestions.splice(oldIndex, 1);
      newQuestions.splice(newIndex, 0, moved);
      
      setQuestions(newQuestions.map((q, i) => ({ ...q, order: i })));
    }
  }

  const handleDelete = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id).map((q, i) => ({ ...q, order: i })));
  };

  const handleToggleType = (id: string) => {
    setQuestions(questions.map(q =>
      q.id === id ? { ...q, type: (q.type ?? 'question') === 'note' ? 'question' : 'note' } : q
    ));
  };

  const handleScaleChange = (id: string, scale: number) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, scale } : q));
  };

  if (questions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
        <p>PDF'den soru kırpmak için PDF Görüntüleyici sekmesini kullanın.</p>
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-auto bg-slate-50">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={questions.map(q => q.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {questions.map((q, i) => (
              <SortableQuestionCard 
                key={q.id} 
                question={q} 
                index={i} 
                onDelete={() => handleDelete(q.id)} 
                onToggleType={() => handleToggleType(q.id)}
                onScaleChange={(scale) => handleScaleChange(q.id, scale)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

interface SortableQuestionCardProps {
  question: Question;
  index: number;
  onDelete: () => void;
  onToggleType: () => void;
  onScaleChange: (scale: number) => void;
}

function SortableQuestionCard({ question, index, onDelete, onToggleType, onScaleChange }: SortableQuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: question.id });

  const [open, setOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const type: 'question' | 'note' = question.type ?? 'question';
  const scale = question.scale ?? 1.0;
  const scalePct = Math.round(scale * 100);

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="bg-white rounded-md border shadow-sm overflow-hidden flex flex-col group relative"
    >
      <div className="flex items-center justify-between p-2 border-b bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div 
            {...attributes} 
            {...listeners} 
            className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm bg-primary text-white w-6 h-6 flex items-center justify-center rounded-full">
            {index + 1}
          </span>
          <TypeBadge type={type} onToggle={onToggleType} />
        </div>
        <div className="flex items-center gap-1">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-slate-500 hover:text-slate-700 gap-1"
                title="Ölçekle"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{scalePct}%</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4" side="bottom" align="end">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Ölçek</span>
                  <span className="text-sm font-bold text-primary tabular-nums">{scalePct}%</span>
                </div>
                <Slider
                  min={50}
                  max={150}
                  step={5}
                  value={[scalePct]}
                  onValueChange={([v]) => onScaleChange(v / 100)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>50% (küçük)</span>
                  <span>150% (büyük)</span>
                </div>
                <div className="mt-1 rounded border bg-slate-50 flex items-center justify-center overflow-hidden" style={{ minHeight: 80 }}>
                  <img
                    src={question.imageDataUrl}
                    alt="Önizleme"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 160,
                      width: `${scale * 100}%`,
                      objectFit: 'contain',
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 text-center">PDF'de bu ölçekte yerleştirilir</p>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="p-2 flex-1 flex items-center justify-center bg-slate-100 min-h-[100px] overflow-hidden">
        <img 
          src={question.imageDataUrl} 
          alt={`Soru ${index + 1}`} 
          className="max-h-[200px] object-contain border bg-white"
          style={{ width: `${scale * 100}%` }}
        />
      </div>
    </div>
  );
      }
                  
