import React, { useState, useEffect, useCallback } from 'react';
import { Panel } from './components/Panel';
import { PromptList } from './components/PromptList';
import { PromptEditor } from './components/PromptEditor';
import { ReferenceGallery } from './components/ReferenceGallery';
import { PromptCompiler } from './components/PromptCompiler';
import { AIAgentModal } from './components/AIAgentModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { DataManagementModal } from './components/DataManagementModal';
import { AppManagerModal } from './components/AppManagerModal';
import { Icons } from './components/Icon';
// Migration: Switch to Supabase Service
import * as storage from './services/supabaseStorageService';
// Also import local service temporarily for migration capability
import * as localStorageFromService from './services/storageService';
import { PromptItem, AppSettings, FilterState, CompiledPrompt, CategoryMap, SavedComposition, LibrarySuggestion, AreaType, AreaMapping } from './types';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_AREAS, AREA_CONFIG, INITIAL_PANEL_WIDTHS, AREA_CATEGORIES } from './constants';
import { AreaInfo } from './types';

type RightPanelTab = 'REFERENCES' | 'COMPILER';

function App() {
  // State: Data
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [compositions, setCompositions] = useState<SavedComposition[]>([]);
  const [categories, setCategories] = useState<CategoryMap>({});
  const [areaMapping, setAreaMapping] = useState<AreaMapping>({});
  const [appList, setAppList] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // State: Context / Super Category
  const [areas, setAreas] = useState<AreaInfo[]>(DEFAULT_AREAS);
  const [currentArea, setCurrentArea] = useState<AreaType>('MARKETING_PRODUCTIVIDAD');
  const [isAreaDropdownHovered, setIsAreaDropdownHovered] = useState(false);

  useEffect(() => {
    setFilter(prev => ({ ...prev, category: 'All', subcategory: 'All', origin: 'All' }));
  }, [currentArea]);

  // State: Compiler (Keep Local for Draft Performance)
  const [compiledPrompt, setCompiledPrompt] = useState<CompiledPrompt>({
    system: "", role: "", subject: "", context: "", details: "", negative: "", params: "", comments: "", apps: []
  });
  // Track if we are editing an existing saved composition
  const [activeCompositionId, setActiveCompositionId] = useState<string | null>(null);

  // State: Settings & Layout
  const [settings, setSettings] = useState<AppSettings>({ panelWidths: INITIAL_PANEL_WIDTHS, theme: 'dark' });
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [rightTab, setRightTab] = useState<RightPanelTab>('COMPILER');

  // State: UI Filters
  const [filter, setFilter] = useState<FilterState>({ search: '', category: 'All', subcategory: 'All', app: 'All', rating: 0, origin: 'All' });

  // State: Modals
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isAppManagerOpen, setIsAppManagerOpen] = useState(false);
  const [analyzeImageTarget, setAnalyzeImageTarget] = useState<string | undefined>(undefined);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);


  // 1. Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedPrompts, catsData, loadedSettings, loadedApps, loadedComps] = await Promise.all([
          storage.getPrompts(),
          storage.getCustomCategories(),
          storage.getSettings(),
          storage.getAppLists(),
          storage.getSavedCompositions()
        ]);

        const loadedCats = catsData.map;
        const loadedAreaMapping = catsData.areaMapping;
        const loadedAreas = catsData.areas.length > 0 ? catsData.areas : DEFAULT_AREAS;

        setPrompts(loadedPrompts);
        setSettings(loadedSettings);
        setCategories(loadedCats);
        setAreaMapping(loadedAreaMapping);
        setAreas(loadedAreas);
        setAppList(loadedApps);
        setCompositions(loadedComps);

        // Category Reconciliation: Ensure all categories found in prompts are in the manager
        const foundCategories = new Set<string>();
        loadedPrompts.forEach(p => {
          if (p.category) foundCategories.add(p.category);
        });

        const mergedCats = { ...loadedCats };
        const mergedAreaMapping = { ...loadedAreaMapping };
        let hasChanges = false;

        foundCategories.forEach(cat => {
          if (!mergedCats[cat]) {
            mergedCats[cat] = [];
            // Try to figure out area from existing AREA_CATEGORIES constant if possible
            let areaIds: AreaType[] = ['TEXT']; // Default
            for (const [a, cats] of Object.entries(AREA_CATEGORIES)) {
              if ((cats as string[]).includes(cat)) {
                areaIds = [a as AreaType];
                break;
              }
            }
            mergedAreaMapping[cat] = areaIds;
            hasChanges = true;
          }
        });

        if (hasChanges) {
          setCategories(mergedCats);
          setAreaMapping(mergedAreaMapping);
          storage.saveCustomCategories(mergedCats, mergedAreaMapping, loadedAreas);
        }

      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Persistence: Settings & Compiler Draft (local)
  useEffect(() => {
    storage.saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    storage.saveCompiledPrompt(compiledPrompt);
  }, [compiledPrompt]);


  // --- HANDLERS ---

  // Handlers: Category Management
  const handleUpdateCategories = useCallback(async (newCats: CategoryMap, newAreaMapping: AreaMapping) => {
    setCategories(newCats);
    setAreaMapping(newAreaMapping);
    await storage.saveCustomCategories(newCats, newAreaMapping, areas);
  }, [areas]);

  const handleRenameCategory = useCallback(async (oldName: string, newName: string) => {
    // 1. Calculate local copies to avoid stale closure state
    const nextCats = { ...categories };
    nextCats[newName] = nextCats[oldName];
    delete nextCats[oldName];

    const nextMapping = { ...areaMapping };
    nextMapping[newName] = nextMapping[oldName] || ['TEXT'];
    delete nextMapping[oldName];

    // 2. Update state functionally
    setCategories(nextCats);
    setAreaMapping(nextMapping);

    // 3. Update prompts state functionally
    setPrompts(prev => prev.map(p =>
      p.category === oldName ? { ...p, category: newName, lastModified: Date.now() } : p
    ));

    // 4. Persist categories
    await storage.saveCustomCategories(nextCats, nextMapping, areas);

    // 5. Update prompts in DB
    const affectedPrompts = prompts.filter(p => p.category === oldName);
    for (const p of affectedPrompts) {
      await storage.savePrompt({ ...p, category: newName, lastModified: Date.now() });
    }
  }, [categories, areaMapping, prompts, areas]);

  const handleRenameSubcategory = useCallback(async (category: string, oldSub: string, newSub: string) => {
    // 1. Calculate local copies
    const nextCats = { ...categories };
    if (nextCats[category]) {
      nextCats[category] = nextCats[category].map(s => s === oldSub ? newSub : s);
    }

    // 2. Update state
    setCategories(nextCats);

    // 3. Update prompts state
    setPrompts(prev => prev.map(p =>
      (p.category === category && p.subcategory === oldSub)
        ? { ...p, subcategory: newSub, lastModified: Date.now() }
        : p
    ));

    // 4. Persist
    await storage.saveCustomCategories(nextCats, areaMapping, areas);

    // 5. Update prompts in DB
    const affectedPrompts = prompts.filter(p => p.category === category && p.subcategory === oldSub);
    for (const p of affectedPrompts) {
      await storage.savePrompt({ ...p, subcategory: newSub, lastModified: Date.now() });
    }
  }, [categories, areaMapping, prompts, areas]);

  // Handlers: Area Management
  const handleAddArea = useCallback(async (newArea: AreaInfo) => {
    const nextAreas = [...areas, newArea];
    setAreas(nextAreas);
    await storage.saveCustomCategories(categories, areaMapping, nextAreas);
  }, [areas, categories, areaMapping]);

  const handleDeleteArea = useCallback(async (areaId: string) => {
    const nextAreas = areas.filter(a => a.id !== areaId);
    setAreas(nextAreas);
    // Note: Categories mapped to this area will stay but areaMapping will be orphan
    // We optionally move them to 'GLOBAL' or 'TEXT'
    const nextMapping = { ...areaMapping };
    Object.keys(nextMapping).forEach(cat => {
      if (nextMapping[cat]?.includes(areaId)) {
        nextMapping[cat] = nextMapping[cat].filter(id => id !== areaId);
        if (nextMapping[cat].length === 0) nextMapping[cat] = ['TEXT'];
      }
    });
    setAreaMapping(nextMapping);
    await storage.saveCustomCategories(categories, nextMapping, nextAreas);
  }, [areas, categories, areaMapping]);

  const handleUpdateArea = useCallback(async (updatedArea: AreaInfo) => {
    const nextAreas = areas.map(a => a.id === updatedArea.id ? updatedArea : a);
    setAreas(nextAreas);
    await storage.saveCustomCategories(categories, areaMapping, nextAreas);
  }, [areas, categories, areaMapping]);

  const handleUpdateApps = async (newApps: string[]) => {
    setAppList(newApps);
    await storage.saveAppLists(newApps);
  };

  // Handlers: Prompt Management
  const handleSelect = (id: string) => {
    setSelectedId(id);
    setAnalyzeImageTarget(undefined);
  };

  const handleToggleFavorite = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updatedItem: PromptItem | undefined;

    setPrompts(prev => {
      const newList = prev.map(p => {
        if (p.id === id) {
          updatedItem = { ...p, isFavorite: !p.isFavorite };
          return updatedItem;
        }
        return p;
      });
      return newList;
    });

    // We need to wait for the item to be "captured" or find it in the current list
    // To be safer and avoid waiting for state, we find it in the current prompts closure
    // but the functional update is better for the UI.
    const item = prompts.find(p => p.id === id);
    if (item) {
      await storage.savePrompt({ ...item, isFavorite: !item.isFavorite });
    }
  }, [prompts]);

  const handleAdd = async () => {
    const defaultCat = Object.keys(categories)[0] || 'General';
    const newPrompt: PromptItem = {
      id: uuidv4(),
      title: 'Nuevo Prompt',
      category: defaultCat,
      contentEs: '',
      contentEn: '',
      tags: [],
      tagsEn: [],
      images: [],
      apps: [],
      area: currentArea, // Assign current area
      isFavorite: false,
      lastModified: Date.now(),
    };

    // Optimistic UI Update
    setPrompts([newPrompt, ...prompts]);
    setSelectedId(newPrompt.id);

    // Async Save
    await storage.savePrompt(newPrompt);
  };

  const handleSave = async (updated: PromptItem) => {
    // Optimistic UI Update using functional update to ensure we have latest version
    setPrompts(prev => prev.map(p => p.id === updated.id ? updated : p));

    // Async Save
    try {
      await storage.savePrompt(updated);
    } catch (err) {
      console.error("Save failed, reverting UI:", err);
      // Optional: Revert UI or show error
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este prompt?')) {
      setPrompts(prev => prev.filter(p => p.id !== id));
      if (selectedId === id) setSelectedId(null);
      await storage.deletePrompt(id);
    }
  }, [selectedId]);

  const handleDuplicate = useCallback(async (prompt: PromptItem) => {
    const newPrompt = {
      ...prompt,
      id: uuidv4(),
      title: `${prompt.title} (Copia)`,
      lastModified: Date.now()
    };

    setPrompts(prev => [newPrompt, ...prev]);
    setSelectedId(newPrompt.id);
    await storage.savePrompt(newPrompt);
  }, []);

  const handleUpdateImages = async (images: string[]) => {
    if (selectedId) {
      const updated = prompts.find(p => p.id === selectedId);
      if (updated) {
        const newItem = { ...updated, images, lastModified: Date.now() };
        handleSave(newItem);
      }
    }
  };

  const handleImportSuccess = async (newPrompts: PromptItem[], newCategories: CategoryMap, newCompositions: SavedComposition[]) => {
    try {
      setPrompts(newPrompts);
      setCategories(newCategories);
      setCompositions(newCompositions);

      // Re-map areas for categories from the imported data if possible, or default to TEXT
      const newAreaMapping = { ...areaMapping };
      Object.keys(newCategories).forEach(cat => {
        if (!newAreaMapping[cat]) newAreaMapping[cat] = ['TEXT'];
      });
      setAreaMapping(newAreaMapping);

      console.log("Saving imported data to Supabase...");
      for (const p of newPrompts) await storage.savePrompt(p);
      await storage.saveCustomCategories(newCategories, newAreaMapping, areas);
      for (const c of newCompositions) await storage.saveComposition(c);

      setIsDataModalOpen(false);
      alert("✅ Importación completada y sincronizada con la nube.");
    } catch (err) {
      console.error("Import sync error:", err);
      alert("❌ Error al sincronizar los datos con la nube.");
    }
  };

  // --- MIGRATION LOGIC ---
  const handleMigrateData = async () => {
    if (!window.confirm("¿Migrar datos locales a la nube (Supabase)? Esto subirá tus datos actuales.")) return;

    setIsMigrating(true);
    try {
      // 1. Read Local Data (Synchronously from localStorage service)
      const localPrompts = localStorageFromService.getPrompts();
      const localCats = localStorageFromService.getCustomCategories();
      const localComps = localStorageFromService.getSavedCompositions();
      const localApps = localStorageFromService.getCustomAppList();
      const localSettings = localStorageFromService.getSettings();

      // 2. Upload to Supabase
      console.log(`Starting migration of ${localPrompts.length} prompts...`);

      // Prompts
      let successCount = 0;
      let failCount = 0;

      for (const p of localPrompts) {
        try {
          await storage.savePrompt(p);
          successCount++;
        } catch (err) {
          console.error("Failed to save prompt:", p.title, err);
          failCount++;
        }
      }
      console.log(`Migration finished. Success: ${successCount}, Failed: ${failCount}`);

      // Categories (Assuming local doesn't have area mapping, so we initialize)
      const newAreaMapping = { ...areaMapping };
      Object.keys(localCats).forEach(cat => {
        if (!newAreaMapping[cat]) newAreaMapping[cat] = ['TEXT'];
      });
      await storage.saveCustomCategories(localCats, newAreaMapping, areas);

      // Compositions
      for (const c of localComps) {
        await storage.saveComposition(c);
      }

      // Apps
      await storage.saveAppLists(localApps);

      // Settings
      await storage.saveSettings(localSettings);

      alert(`¡Migración completada!\n\nPrompts subidos: ${successCount}\nFallidos: ${failCount}\n\nLa página se recargará ahora.`);
      window.location.reload();

    } catch (e) {
      console.error("Migration Error:", e);
      alert("Hubo un error CRÍTICO durante la migración. Abre la consola (F12) para ver detalles.");
    } finally {
      setIsMigrating(false);
    }
  };

  // --- COMPOSITION LOGIC ---
  const handleSaveComposition = (title: string, cats: string[], taggedApps: string[]) => {
    const newId = uuidv4();
    const newComp: SavedComposition = {
      id: newId,
      title,
      data: { ...compiledPrompt, apps: taggedApps }, // Include tagged apps in data too
      categories: cats,
      apps: taggedApps,
      area: currentArea, // Save with current area
      lastModified: Date.now()
    };
    setCompositions([newComp, ...compositions]);
    // After saving as new, we are now editing this new one
    setActiveCompositionId(newId);
  };

  const handleUpdateComposition = (data: CompiledPrompt) => {
    if (!activeCompositionId) return;

    setCompositions(prev => prev.map(c => {
      if (c.id === activeCompositionId) {
        return {
          ...c,
          data: { ...data },
          apps: data.apps || c.apps, // Update top level apps if changed
          lastModified: Date.now()
        };
      }
      return c;
    }));
  };

  const handleSelectComposition = (comp: SavedComposition) => {
    // Load into compiler
    setCompiledPrompt(comp.data);
    setActiveCompositionId(comp.id);
    setRightTab('COMPILER');
  };

  const handleDeleteComposition = (id: string) => {
    if (window.confirm("¿Eliminar composición guardada?")) {
      setCompositions(prev => prev.filter(c => c.id !== id));
      if (activeCompositionId === id) {
        setActiveCompositionId(null);
      }
    }
  };

  // Fixed: handleClearCompiler now properly resets fields to area-specific defaults
  const handleClearCompiler = () => {
    const defaults = AREA_CONFIG[currentArea].defaultTemplate;
    setCompiledPrompt({
      system: "",
      role: defaults.role,
      subject: "",
      context: "",
      details: "",
      negative: defaults.negative,
      params: defaults.params,
      comments: "",
      apps: []
    });
    setActiveCompositionId(null); // Reset active ID so next save is new
  };


  // --- SMART ADD LOGIC ---
  const handleAddToCompiler = (prompt: PromptItem) => {
    setRightTab('COMPILER');

    const textToAdd = prompt.contentEn.trim();
    if (!textToAdd) return;

    setCompiledPrompt(prev => {
      const newCompiler = { ...prev };
      let targetSection: keyof CompiledPrompt | null = null;

      const catLower = prompt.category.toLowerCase();

      if (catLower.includes('estilo') || catLower.includes('style') || catLower.includes('arq')) {
        targetSection = 'subject';
      } else if (catLower.includes('luz') || catLower.includes('light') || catLower.includes('clima') || catLower.includes('veg')) {
        targetSection = 'context';
      } else {
        targetSection = 'details';
      }

      if (prompt.title.toLowerCase().includes('prohibido') || prompt.title.toLowerCase().includes('evitar')) {
        targetSection = 'negative';
      }

      if (targetSection) {
        const currentText = newCompiler[targetSection];
        // Type assertion needed as comments/apps are not strings
        if (typeof currentText === 'string') {
          if (!currentText.includes(textToAdd)) {
            (newCompiler as any)[targetSection] = currentText ? `${currentText}, ${textToAdd}` : textToAdd;
          }
        }
      }

      return newCompiler;
    });
  };

  const handleAutoCompile = (data: CompiledPrompt) => {
    // If we are auto-compiling, it's treated as a fresh compilation (or editing the current one)
    // We do NOT clear the activeCompositionId here, assuming the user might want to Update the current one with AI help.
    // Or if it was null, it stays null (so save = new).
    setCompiledPrompt(data);
    setRightTab('COMPILER');
  };

  const handleSaveSuggestion = (suggestion: LibrarySuggestion) => {
    if (suggestion.type === 'NEW') {
      // Create new snippet
      const newPrompt: PromptItem = {
        id: uuidv4(),
        title: suggestion.title,
        category: suggestion.targetCategory,
        subcategory: '', // Default empty subcategory
        contentEs: suggestion.contentEs,
        contentEn: suggestion.contentEn,
        tags: ['smart-sync'],
        tagsEn: [],
        images: [],
        apps: [],
        area: currentArea, // Smart sync saves to current area
        isFavorite: false,
        lastModified: Date.now()
      };
      setPrompts([newPrompt, ...prompts]);
      setSelectedId(newPrompt.id); // Highlight it
    } else if (suggestion.type === 'UPDATE' && suggestion.originalSnippetId) {
      // Update existing snippet
      setPrompts(prev => prev.map(p => {
        if (p.id === suggestion.originalSnippetId) {
          return {
            ...p,
            contentEn: suggestion.contentEn,
            contentEs: suggestion.contentEs, // Optionally update Spanish too
            lastModified: Date.now()
          };
        }
        return p;
      }));
      setSelectedId(suggestion.originalSnippetId); // Highlight it
    }
  };

  // Handlers: AI
  const handleApplyAIPrompt = (es: string, en: string) => {
    if (selectedId) {
      const updated = prompts.find(p => p.id === selectedId);
      if (updated) {
        handleSave({ ...updated, contentEs: es, contentEn: en, lastModified: Date.now() });
      }
    } else {
      const defaultCat = Object.keys(categories)[0] || 'General';
      const newPrompt: PromptItem = {
        id: uuidv4(),
        title: 'Prompt Generado por IA',
        category: defaultCat,
        contentEs: es,
        contentEn: en,
        tags: ['ia-generated'],
        tagsEn: ['ia-generated'],
        images: [],
        apps: [],
        area: currentArea,
        isFavorite: false,
        lastModified: Date.now()
      };
      setPrompts([newPrompt, ...prompts]);
      setSelectedId(newPrompt.id);
    }
  };

  const handleOpenAnalyze = (img: string) => {
    setAnalyzeImageTarget(img);
    setIsAIModalOpen(true);
  };

  // Handlers: Layout Resizing
  const startResize = (direction: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(direction);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const totalWidth = window.innerWidth;
    const x = e.clientX;
    const percentage = (x / totalWidth) * 100;

    setSettings(prev => {
      const current = prev.panelWidths;
      if (isResizing === 'left') {
        if (percentage < 15 || percentage > 40) return prev;
        return {
          ...prev,
          panelWidths: {
            left: percentage,
            center: 100 - percentage - current.right,
            right: current.right
          }
        };
      } else {
        const rightPercentage = 100 - percentage;
        if (rightPercentage < 15 || rightPercentage > 50) return prev;
        return {
          ...prev,
          panelWidths: {
            left: current.left,
            center: 100 - current.left - rightPercentage,
            right: rightPercentage
          }
        };
      }
    });

  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(null);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const selectedPrompt = prompts.find(p => p.id === selectedId) || null;

  // Area Selection Logic
  const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentArea(e.target.value as AreaType);
    // Reset filter when changing area
    setFilter(prev => ({ ...prev, search: '', category: 'All', subcategory: 'All', origin: 'All' }));
    setSelectedId(null);
  };

  // --- COMPUTED DATA ---
  const validCategoriesForArea = currentArea === 'GLOBAL'
    ? Object.keys(categories)
    : Object.keys(categories).filter(cat => areaMapping[cat]?.includes(currentArea));

  const areaSpecificApps = currentArea === 'GLOBAL'
    ? appList
    : appList; // For now apps are global or follow area if we filter later

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-arch-950 text-arch-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-accent-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-arch-400 font-medium animate-pulse">Cargando AXIS-Z...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-arch-950 font-sans text-arch-100">

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Filter & List */}
        <Panel
          width={settings.panelWidths.left}
          title="Repositorio"
          onResizeStart={startResize('left')}
          className="z-30"
          headerActions={
            <div className="flex items-center space-x-2">
              <a
                href="https://portal.axiszgpi.com"
                className="p-1.5 text-arch-400 hover:text-white hover:bg-arch-800 rounded-md transition-colors"
                title="Volver al Portal"
              >
                <Icons.LayoutGrid size={16} />
              </a>
              <div
                className="relative"
                onMouseEnter={() => setIsAreaDropdownHovered(true)}
                onMouseLeave={() => setIsAreaDropdownHovered(false)}
              >
                <button className="flex items-center justify-between gap-1.5 bg-arch-900 border border-arch-700 text-xs text-white font-bold uppercase rounded-md py-1.5 pl-3 pr-2 focus:outline-none hover:bg-arch-800 transition-colors">
                  <span>{areas.find(a => a.id === currentArea)?.label || currentArea}</span>
                  <Icons.ChevronDown size={14} className="flex-shrink-0 text-arch-400" />
                </button>

                {isAreaDropdownHovered && (
                  <div className="absolute top-full right-0 z-50 bg-arch-800 border border-arch-600 rounded-md shadow-2xl py-1 min-w-[200px] overflow-hidden">
                    {areas.map((area: AreaInfo) => (
                      <button
                        key={area.id}
                        onMouseDown={() => {
                          handleAreaChange({ target: { value: area.id } } as any);
                          setIsAreaDropdownHovered(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold uppercase transition-colors flex items-center gap-2 ${currentArea === area.id ? 'text-accent-300 bg-accent-500/20' : 'text-arch-300 hover:bg-arch-700 hover:text-white'
                          }`}
                      >
                        {area.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          }
        >
          <PromptList
            prompts={prompts}
            compositions={compositions}
            categories={categories}
            validCategories={validCategoriesForArea} // New prop to handle filtering
            selectedId={selectedId}
            onSelect={handleSelect}
            onSelectComposition={handleSelectComposition}
            onDeleteComposition={handleDeleteComposition}
            onAdd={handleAdd}
            onToggleFavorite={handleToggleFavorite}
            onAddToCompiler={handleAddToCompiler}
            onManageCategories={() => setIsCategoryManagerOpen(true)}
            onOpenBackup={() => setIsDataModalOpen(true)}
            onManageApps={() => setIsAppManagerOpen(true)}
            availableApps={areaSpecificApps} // Pass area-aware apps
            filter={filter}
            setFilter={setFilter}
            currentArea={currentArea} // Pass current area
          />
        </Panel>

        {/* Center Panel: Editor */}
        <Panel
          width={settings.panelWidths.center}
          title={selectedPrompt ? selectedPrompt.title : 'Editor'}
          className="border-r border-arch-800 z-20"
          headerActions={
            <button
              onClick={() => { setAnalyzeImageTarget(undefined); setIsAIModalOpen(true); }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-md text-[10px] font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/20"
            >
              <Icons.Magic size={14} />
              <span className="hidden sm:inline">Asistente IA</span>
            </button>
          }
        >
          <PromptEditor
            prompt={selectedPrompt}
            categories={categories}
            availableApps={areaSpecificApps}
            onSave={handleSave}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        </Panel>

        {/* Right Panel: Tabs (Gallery / Compiler) */}
        <Panel
          width={settings.panelWidths.right}
          className="border-l border-arch-800 flex flex-col z-10"
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-1 hover:w-2 bg-transparent hover:bg-accent-500 cursor-col-resize z-50 flex items-center justify-center group"
            onMouseDown={startResize('right')}
          >
            <div className="w-0.5 h-8 bg-arch-700 group-hover:bg-white rounded-full transition-colors" />
          </div>

          <div className="flex border-b border-arch-800 bg-arch-950 shrink-0">
            <button
              onClick={() => setRightTab('COMPILER')}
              className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition-colors flex items-center justify-center space-x-2 ${rightTab === 'COMPILER'
                ? 'bg-arch-900 text-white border-b-2 border-accent-500'
                : 'text-arch-500 hover:text-arch-300 hover:bg-arch-900/50'
                }`}
            >
              <Icons.FileText size={14} />
              <span>Compilador</span>
            </button>
            <button
              onClick={() => setRightTab('REFERENCES')}
              className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition-colors flex items-center justify-center space-x-2 ${rightTab === 'REFERENCES'
                ? 'bg-arch-900 text-white border-b-2 border-accent-500'
                : 'text-arch-500 hover:text-arch-300 hover:bg-arch-900/50'
                }`}
            >
              <Icons.Image size={14} />
              <span>Referencias</span>
            </button>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {rightTab === 'COMPILER' ? (
              <PromptCompiler
                compiler={compiledPrompt}
                activeCompositionId={activeCompositionId}
                onChange={setCompiledPrompt}
                onClear={handleClearCompiler}
                onSaveToLibrary={handleSaveComposition}
                onUpdateComposition={handleUpdateComposition}
                availableCategories={categories}
                availableApps={areaSpecificApps}
                library={prompts} // Pass full library for smart sync
                onSaveSuggestion={handleSaveSuggestion}
                currentArea={currentArea} // Pass Area context
              />
            ) : (
              <ReferenceGallery
                prompt={selectedPrompt}
                onUpdateImages={handleUpdateImages}
                onAnalyzeImage={handleOpenAnalyze}
              />
            )}
          </div>
        </Panel>
      </div>

      <AIAgentModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onApplyPrompt={handleApplyAIPrompt}
        onAutoCompile={handleAutoCompile}
        initialImage={analyzeImageTarget}
        libraryContext={prompts} // Pass library context
      />

      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        areaMapping={areaMapping}
        onUpdate={handleUpdateCategories}
        onRenameCategory={handleRenameCategory}
        onRenameSubcategory={handleRenameSubcategory}
        areas={areas}
        onAddArea={handleAddArea}
        onRenameArea={handleUpdateArea}
        onDeleteArea={handleDeleteArea}
      />

      <AppManagerModal
        isOpen={isAppManagerOpen}
        onClose={() => setIsAppManagerOpen(false)}
        appList={appList}
        onUpdate={handleUpdateApps}
      />

      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        currentPrompts={prompts}
        currentCategories={categories}
        currentCompositions={compositions}
        onImportSuccess={handleImportSuccess}
        onMigrateLocal={handleMigrateData}
        isMigrating={isMigrating}
      />

    </div>
  );
}

export default App;