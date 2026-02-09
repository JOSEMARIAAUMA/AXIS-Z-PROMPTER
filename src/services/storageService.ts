import { PromptItem, AppSettings, CompiledPrompt, CategoryMap, SavedComposition } from '../types';
import { SEED_PROMPTS, INITIAL_PANEL_WIDTHS, SUBCATEGORIES_MAP, DEFAULT_APPS } from '../constants';

// CRITICAL: DO NOT CHANGE THESE KEYS.
// Changing these keys (e.g. from v4 to v5) will cause the user to lose all their local data
// because the browser will look for a new, empty storage key.
// KEEP THESE STABLE.
const KEYS = {
  PROMPTS: 'aap_prompts_v4',
  SETTINGS: 'aap_settings_v4',
  COMPILER: 'aap_compiler_v1',
  CATEGORIES: 'aap_categories_v1',
  COMPOSITIONS: 'aap_compositions_v1',
  APP_LIST: 'aap_applist_v1', 
};

export const getPrompts = (): PromptItem[] => {
  const stored = localStorage.getItem(KEYS.PROMPTS);
  if (!stored) return SEED_PROMPTS;
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED_PROMPTS;
    return parsed.map((p: any) => ({
        ...p,
        tagsEn: p.tagsEn || [],
        apps: p.apps || [],
        area: p.area || 'IMAGE' // Migration: Default to IMAGE for existing data
    }));
  } catch {
    return SEED_PROMPTS;
  }
};

export const savePrompts = (prompts: PromptItem[]) => {
  if (!prompts) return;
  localStorage.setItem(KEYS.PROMPTS, JSON.stringify(prompts));
};

export const getSettings = (): AppSettings => {
  const stored = localStorage.getItem(KEYS.SETTINGS);
  if (!stored) return { panelWidths: INITIAL_PANEL_WIDTHS, theme: 'dark' };
  try {
    return JSON.parse(stored);
  } catch {
    return { panelWidths: INITIAL_PANEL_WIDTHS, theme: 'dark' };
  }
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
};

// Compiler Persistence
export const getCompiledPrompt = (): CompiledPrompt => {
    const stored = localStorage.getItem(KEYS.COMPILER);
    const defaultCompiler: CompiledPrompt = {
        system: "Act as a professional architectural photographer and 3D artist. Use technical terminology related to V-Ray, Corona Renderer and photography.",
        role: "Professional architectural photography, 8k resolution, highly detailed, photorealistic masterpiece, archdaily style",
        subject: "",
        context: "",
        details: "",
        negative: "low quality, blur, watermark, text, bad anatomy, deformed, ugly, pixelated, cartoon, 3d render looking",
        params: "--ar 16:9 --v 6.0",
        comments: "",
        apps: []
    };
    
    if (!stored) return defaultCompiler;
    try {
        const parsed = JSON.parse(stored);
        return {
            ...defaultCompiler,
            ...parsed
        };
    } catch {
        return defaultCompiler;
    }
};

export const saveCompiledPrompt = (compiler: CompiledPrompt) => {
    localStorage.setItem(KEYS.COMPILER, JSON.stringify(compiler));
};

// Categories Persistence
export const getCustomCategories = (): CategoryMap => {
    const stored = localStorage.getItem(KEYS.CATEGORIES);
    if (!stored) {
        return SUBCATEGORIES_MAP as unknown as CategoryMap;
    }
    try {
        const parsed = JSON.parse(stored);
        // Fallback: If empty object for some reason, return default
        if (Object.keys(parsed).length === 0) return SUBCATEGORIES_MAP as unknown as CategoryMap;
        return parsed;
    } catch {
        return SUBCATEGORIES_MAP as unknown as CategoryMap;
    }
};

export const saveCustomCategories = (categories: CategoryMap) => {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
};

// Saved Compositions Persistence
export const getSavedCompositions = (): SavedComposition[] => {
    const stored = localStorage.getItem(KEYS.COMPOSITIONS);
    if (!stored) return [];
    try {
        const parsed = JSON.parse(stored);
        return parsed.map((c: any) => ({
            ...c,
            apps: c.apps || [],
            area: c.area || 'IMAGE', // Migration: Default to IMAGE
            data: {
                ...c.data,
                system: c.data.system || "" // Ensure backward compatibility for old saves
            }
        }));
    } catch {
        return [];
    }
};

export const saveSavedCompositions = (compositions: SavedComposition[]) => {
    localStorage.setItem(KEYS.COMPOSITIONS, JSON.stringify(compositions));
};

// Custom App List Persistence
export const getCustomAppList = (): string[] => {
    const stored = localStorage.getItem(KEYS.APP_LIST);
    if (!stored) return DEFAULT_APPS;
    try {
        return JSON.parse(stored);
    } catch {
        return DEFAULT_APPS;
    }
};

export const saveCustomAppList = (apps: string[]) => {
    localStorage.setItem(KEYS.APP_LIST, JSON.stringify(apps));
};