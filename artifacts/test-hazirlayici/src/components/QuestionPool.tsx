import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { GripVertical, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Question } from '@/lib/db';

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
      
      // Update order
      setQuestions(newQuestions.map((q, i) => ({ ...q, order: i })));
    }
  }

  const handleDelete = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id).map((q, i) => ({ ...q, order: i })));
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
}

function SortableQuestionCard({ question, index, onDelete }: SortableQuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={onDelete}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      <div className="p-2 flex-1 flex items-center justify-center bg-slate-100 min-h-[100px]">
        <img 
          src={question.imageDataUrl} 
          alt={`Soru ${index + 1}`} 
          className="max-w-full max-h-[200px] object-contain border bg-white" 
        />
      </div>
    </div>
  );
}
