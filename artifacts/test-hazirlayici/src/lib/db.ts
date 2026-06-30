import Dexie, { type Table } from 'dexie';

export interface Question {
  id: string; // uuid
  imageDataUrl: string; // base64 PNG
  width: number;
  height: number;
  order: number;
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
  templateUsage: 'first' | 'all' | 'none';
}

export interface Template {
  id?: number;
  name: string;
  imageDataUrl: string;
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
  }
}

export const db = new AppDatabase();
