import { supabase } from '../supabaseClient';
import { PromptItem, AppSettings, CompiledPrompt, CategoryMap, SavedComposition, AreaMapping, AreaInfo } from '../types';
import { INITIAL_PANEL_WIDTHS, SUBCATEGORIES_MAP, DEFAULT_APPS } from '../constants';

// --- USER AUTH INITALS ---
export const getCurrentUserInitials = async (): Promise<string | undefined> => {
    try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
            const meta = data.session.user.user_metadata;
            let sourceStr = meta?.full_name || data.session.user.email?.split('@')[0];
            if (!sourceStr) return undefined;
            const parts = sourceStr.split(/[\s._-]+/);
            return parts.slice(0, 2).map((p: string) => p[0].toUpperCase()).join('');
        }
    } catch (e) {
        console.error('Error fetching user initials:', e);
    }
    return undefined;
};

// --- PROMPTS ---

export const getPrompts = async (): Promise<PromptItem[]> => {
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('prompts')
            .select('*')
            .order('last_modified', { ascending: false })
            .range(from, from + step - 1);

        if (error) {
            console.error('Error fetching prompts:', error);
            break; // return what we have so far
        }

        if (data && data.length > 0) {
            allData = allData.concat(data);
            from += step;
            if (data.length < step) {
                hasMore = false; // Last page
            }
        } else {
            hasMore = false;
        }
    }

    return allData.map((p: any) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        subcategory: p.subcategory,
        contentEs: p.content_es,
        contentEn: p.content_en,
        tags: p.tags || [],
        tagsEn: p.tags_en || [],
        images: p.images || [],
        apps: p.apps || [],
        area: p.area || 'IMAGE',
        isFavorite: p.is_favorite,
        lastModified: parseInt(p.last_modified),
        origin: p.origin as 'user' | 'internet' | undefined,
        rating: p.rating ? Number(p.rating) : undefined,
        creatorName: p.creator_name,
        editorName: p.editor_name,
    }));
};

// export const savePrompts = async (prompts: PromptItem[]) => { ... } is deprecated for Supabase. 
// Use savePrompt(item) for individual updates.

export const savePrompt = async (prompt: PromptItem) => {
    const row = {
        id: prompt.id,
        title: prompt.title,
        category: prompt.category,
        subcategory: prompt.subcategory,
        content_es: prompt.contentEs,
        content_en: prompt.contentEn,
        tags: prompt.tags,
        tags_en: prompt.tagsEn,
        images: prompt.images,
        apps: prompt.apps,
        area: prompt.area,
        is_favorite: prompt.isFavorite,
        last_modified: prompt.lastModified,
        creator_name: prompt.creatorName,
        editor_name: prompt.editorName,
    };

    const { error } = await supabase.from('prompts').upsert(row);

    if (error) {
        console.error('Error saving prompt:', error);
        throw error; // Throw so migration loop catches it
    }
};

export const deletePrompt = async (id: string) => {
    const { error } = await supabase.from('prompts').delete().eq('id', id);
    if (error) console.error('Error deleting prompt:', error);
};


// --- SETTINGS ---

export const getSettings = async (): Promise<AppSettings> => {
    const { data, error } = await supabase.from('settings').select('*').limit(1).single();

    if (error || !data) {
        return { panelWidths: INITIAL_PANEL_WIDTHS, theme: 'dark' };
    }

    return {
        panelWidths: data.panel_widths || INITIAL_PANEL_WIDTHS,
        theme: data.theme === 'light' ? 'light' : 'dark'
    };
};

export const saveSettings = async (settings: AppSettings) => {
    // We assume a single settings row for now (or per user later)
    // We'll delete old ones and insert new, or update if we had a fixed ID.
    // Better: Upsert with a fixed fake ID or fetch existing first.

    const { data } = await supabase.from('settings').select('id').limit(1);
    const existingId = data?.[0]?.id;

    const row = {
        panel_widths: settings.panelWidths,
        theme: settings.theme,
        updated_at: new Date().toISOString()
    };

    if (existingId) {
        await supabase.from('settings').update(row).eq('id', existingId);
    } else {
        await supabase.from('settings').insert(row);
    }
};


// --- COMPILER (Not strictly persisted in DB in original design, usually LocalStorage) ---
// We can keep Compiler state in LocalStorage for performance, as it's a "draft" state.
// But checking the requirement "data persistence", maybe user wants draft saved too?
// Let's stick to LocalStorage for the "Draft" (Compiler) to allow fast offline-like typing,
// but Compositions (Saved) go to DB.

export const getCompiledPrompt = (): CompiledPrompt => {
    // Keep local for speed/draft
    const stored = localStorage.getItem('aap_compiler_v1');
    if (!stored) return {
        system: "", role: "", subject: "", context: "", details: "", negative: "", params: "", comments: "", apps: []
    };
    return JSON.parse(stored);
};

export const saveCompiledPrompt = (compiler: CompiledPrompt) => {
    localStorage.setItem('aap_compiler_v1', JSON.stringify(compiler));
};


// --- CATEGORIES ---

export const getCustomCategories = async (): Promise<{ map: CategoryMap, areaMapping: AreaMapping, areas: AreaInfo[] }> => {
    const { data, error } = await supabase.from('categories').select('*').limit(1).single();

    if (error || !data) return {
        map: SUBCATEGORIES_MAP as unknown as CategoryMap,
        areaMapping: {},
        areas: []
    };

    return {
        map: data.map,
        areaMapping: data.area_mapping || {},
        areas: data.areas || []
    };
};

export const saveCustomCategories = async (categories: CategoryMap, areaMapping: AreaMapping, areas: AreaInfo[]) => {
    const { data } = await supabase.from('categories').select('id').limit(1);
    const existingId = data?.[0]?.id;

    const row = {
        map: categories,
        area_mapping: areaMapping,
        areas: areas,
        updated_at: new Date().toISOString()
    };

    if (existingId) {
        await supabase.from('categories').update(row).eq('id', existingId);
    } else {
        await supabase.from('categories').insert(row);
    }
};


// --- SAVED COMPOSITIONS ---

export const getSavedCompositions = async (): Promise<SavedComposition[]> => {
    const { data, error } = await supabase.from('compositions').select('*').order('last_modified', { ascending: false });
    if (error) return [];

    return data.map((c: any) => ({
        id: c.id,
        title: c.title,
        data: c.data,
        categories: c.categories || [],
        apps: c.apps || [],
        area: c.area || 'IMAGE',
        lastModified: parseInt(c.last_modified),
        creatorName: c.creator_name,
        editorName: c.editor_name,
    }));
};

export const saveComposition = async (comp: SavedComposition) => {
    const row = {
        id: comp.id,
        title: comp.title,
        data: comp.data,
        categories: comp.categories,
        apps: comp.apps,
        area: comp.area,
        last_modified: comp.lastModified,
        creator_name: comp.creatorName,
        editor_name: comp.editorName,
    };

    const { error } = await supabase.from('compositions').upsert(row);
    if (error) console.error('Error saving composition:', error);
};

export const deleteComposition = async (id: string) => {
    await supabase.from('compositions').delete().eq('id', id);
};


// --- APP LIST ---

export const getAppLists = async (): Promise<string[]> => {
    const { data, error } = await supabase.from('app_lists').select('apps').limit(1).single();
    if (error || !data) return DEFAULT_APPS;
    return data.apps;
};

export const saveAppLists = async (apps: string[]) => {
    const { data } = await supabase.from('app_lists').select('id').limit(1);
    const existingId = data?.[0]?.id;

    if (existingId) {
        await supabase.from('app_lists').update({ apps }).eq('id', existingId);
    } else {
        await supabase.from('app_lists').insert({ apps });
    }
};
