export enum Category {
  VEGETATION = 'Vegetación y Paisajismo',
  PEOPLE = 'Personas y Lifestyle',
  MATERIALS = 'Materiales y Texturas',
  LIGHTING = 'Iluminación y Clima',
  ARCH_STYLE = 'Estilo Arquitectónico',
  DETAILS = 'Detalles y Mobiliario',
  CAMERA = 'Cámara y Punto de Vista',
  NEGATIVE = 'Negativos y Restricciones',
  RENDER = 'Render y Edición de Imagen',
  MARKETING = 'Marketing y Redes Sociales',
  DOCS = 'Memorias y Documentación',
  CODE_TOOL = 'Automatización y Código',
}

// New Super-Category Definition
export type AreaType = string; // Transitioned from enum-like union to dynamic string

export interface AreaInfo {
  id: string;      // e.g. "IMAGE", "PRODUCTIVIDAD"
  label: string;   // e.g. "Imágenes", "Productividad"
  iconName: string; // e.g. "Image", "TrendingUp"
}

// Dynamic structure for categories
export interface CategoryMap {
  [categoryName: string]: string[]; // Key: Category Name, Value: Array of Subcategories
}

export interface AreaMapping {
  [categoryName: string]: AreaType[]; // Support multiple areas per category
}

export interface PromptItem {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  contentEs: string;
  contentEn: string;
  tags: string[];
  tagsEn: string[];
  images: string[];
  apps?: string[]; // New: List of compatible apps (e.g., "Midjourney", "SDXL")
  area?: AreaType; // New: Super Category
  isFavorite: boolean;
  lastModified: number;
  origin?: 'user' | 'internet'; // New: Data origin
  rating?: number; // New: 0-5 stars
}

export interface PromptVersion {
  id: string;
  promptId: string;
  content: string;
  userId: string;
  changeSummary?: string;
  createdAt: string; // ISO String
}

export interface AppSettings {
  panelWidths: {
    left: number;
    center: number;
    right: number;
  };
  theme: 'dark' | 'light';
}

export interface FilterState {
  search: string;
  category: string | 'All';
  subcategory: string | 'All';
  app: string | 'All'; // New: App Filter
  rating?: number; // New: Min Rating Filter (0-5)
}

export type DragItemType = 'IMAGE' | 'TEXT';

// New Interface for the Prompt Compiler
export interface CompiledPrompt {
  system?: string;   // New: System Instruction (Persona/Rules)
  role: string;
  subject: string;
  context: string;
  details: string;
  negative: string;
  params: string;
  comments?: string; // User notes (not copied to clipboard)
  apps?: string[];   // Tagged apps
}

// Interface for Saved Compositions (Compiled Prompts)
export interface SavedComposition {
  id: string;
  title: string;
  data: CompiledPrompt;
  categories: string[];
  apps?: string[]; // New: Tagged apps for filtering
  area?: AreaType; // New: Super Category
  lastModified: number;
}

// Smart Sync Suggestions
export interface LibrarySuggestion {
  id: string; // Unique ID for the suggestion
  type: 'NEW' | 'UPDATE';
  targetCategory: string; // e.g., 'Materials'
  originalSnippetId?: string; // If UPDATE, which ID to update
  title: string; // Proposed title
  reason: string; // Why AI thinks this should be saved/updated
  contentEn: string; // The content extracted from compiler
  contentEs: string; // Generated Spanish translation/description
}

// Backup Structure
export interface BackupData {
  version: number;
  timestamp: number;
  appName: string;
  prompts: PromptItem[];
  categories: CategoryMap;
  compositions: SavedComposition[];
  appList: string[]; // New: List of user-defined apps
}