export enum Category {
  VEGETATION = 'Vegetación',
  PEOPLE = 'Personas',
  MATERIALS = 'Materiales',
  LIGHTING = 'Iluminación/Clima',
  ARCH_STYLE = 'Estilo Arquitectónico',
  DETAILS = 'Detalles',
  CAMERA = 'Cámara/Punto de Vista',
  NEGATIVE = 'Negativos / Restricciones', // New persistent category
  RENDER = 'Render / Edición Imagen',     // New persistent category
}

// New Super-Category Definition
export type AreaType = 'IMAGE' | 'TEXT' | 'CODE';

// Dynamic structure for categories
export interface CategoryMap {
    [categoryName: string]: string[]; // Key: Category Name, Value: Array of Subcategories
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