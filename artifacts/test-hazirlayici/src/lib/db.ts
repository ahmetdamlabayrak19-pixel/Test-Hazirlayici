import Dexie, { type Table } from 'dexie';

export interface TemplateLayout {
  topicRect?: { x: number; y: number; w: number; h: number };
  questionStartY?: number;
}

export interface Question {
  id: string;
  imageDataUrl: string;
  width: number;
  height: number;
  order: number;
  type?: 'question' | 'note'; // eski kayıtlarda yok — okurken 'question' varsayılır
  scale?: number;             // 0.5–1.5 arası; varsayılan 1.0 (yani %100)
}

export interface HeaderConfig {
  enabled: boolean;
  showName: boolean;
  showClass: boolean;
  showNumber: boolean;
  showDate: boolean;
  testTitle: string;
}

export interface TestProject {
  id?: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  questions: Question[];
  headerConfig: HeaderConfig;
  templateId?: number;
  topicText?: string;
  accentColor?: string;
  titleFont?: string;
}

export interface Template {
  id?: number;
  name: string;
  imageDataUrl: string;
  layout?: TemplateLayout;
  createdAt: Date;
}

export class AppDatabase extends Dexie {
  testProjects!: Table<TestProject, number>;
  templates!: Table<Template, number>;

  constructor() {
    super('TestHazirlayiciDB');
    this.version(1).stores({
      testProjects: '++id, name, updatedAt, createdAt',
      templates: '++id, name, createdAt',
    });
    this.version(2).stores({
      testProjects: '++id, name, updatedAt, createdAt',
      templates: '++id, name, createdAt',
    });
  }
}

export const db = new AppDatabase();
