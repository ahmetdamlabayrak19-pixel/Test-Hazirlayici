// PDF başlık fontları — sistemde/tarayıcıda yaygın bulunan, çevrimdışı çalışan
// (harici indirme gerektirmeyen) font aileleri. value = canvas/CSS font-family zinciri.
export interface FontOption {
  label: string;
  value: string;
}

export const TITLE_FONT_OPTIONS: FontOption[] = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Arial Black', value: '"Arial Black", Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Impact', value: 'Impact, sans-serif' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
  { label: 'Palatino', value: 'Palatino, "Palatino Linotype", serif' },
  { label: 'Garamond', value: 'Garamond, serif' },
  { label: 'Book Antiqua', value: '"Book Antiqua", Palatino, serif' },
  { label: 'Lucida Console', value: '"Lucida Console", Monaco, monospace' },
  { label: 'Lucida Sans Unicode', value: '"Lucida Sans Unicode", "Lucida Sans", sans-serif' },
  { label: 'Segoe UI', value: '"Segoe UI", sans-serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Cambria', value: 'Cambria, serif' },
  { label: 'Candara', value: 'Candara, sans-serif' },
  { label: 'Consolas', value: 'Consolas, monospace' },
  { label: 'Constantia', value: 'Constantia, serif' },
  { label: 'Corbel', value: 'Corbel, sans-serif' },
  { label: 'Franklin Gothic Medium', value: '"Franklin Gothic Medium", sans-serif' },
  { label: 'Century Gothic', value: '"Century Gothic", sans-serif' },
  { label: 'Rockwell', value: 'Rockwell, serif' },
  { label: 'Futura', value: 'Futura, sans-serif' },
  { label: 'Optima', value: 'Optima, sans-serif' },
];

export const DEFAULT_TITLE_FONT = 'Arial, sans-serif';
