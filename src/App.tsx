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
import { getPrompts, savePrompts, getSettings, saveSettings, getCompiledPrompt, saveCompiledPrompt, getCustomCategories, saveCustomCategories, getSavedCompositions, saveSavedCompositions, getCustomAppList, saveCustomAppList } from './services/storageService';
import { PromptItem, AppSettings, FilterState, CompiledPrompt, CategoryMap, SavedComposition, LibrarySuggestion, AreaType } from './types';
import { v4 as uuidv4 } from 'uuid';
import { AREAS, AREA_CONFIG } from './constants';

type RightPanelTab = 'REFERENCES' | 'COMPILER';

function App() {
  // State: Data
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [compositions, setCompositions] = useState<SavedComposition[]>([]);
  const [categories, setCategories] = useState<CategoryMap>({});
  const [appList, setAppList] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // State: Context / Super Category
  const [currentArea, setCurrentArea] = useState<AreaType>('IMAGE');

  // State: Compiler
  const [compiledPrompt, setCompiledPrompt] = useState<CompiledPrompt>(getCompiledPrompt());
  // Track if we are editing an existing saved composition
  const [activeCompositionId, setActiveCompositionId] = useState<string | null>(null);

  // State: Settings & Layout
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [rightTab, setRightTab] = useState<RightPanelTab>('COMPILER');

  // State: UI Filters
  const [filter, setFilter] = useState<FilterState>({ search: '', category: 'All', subcategory: 'All', app: 'All' });

  // State: Modals
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isAppManagerOpen, setIsAppManagerOpen] = useState(false);
  const [analyzeImageTarget, setAnalyzeImageTarget] = useState<string | undefined>(undefined);

  // Initialize Data
  useEffect(() => {
    setPrompts(getPrompts());
    setCategories(getCustomCategories());
    setCompositions(getSavedCompositions());
    setAppList(getCustomAppList());
  }, []);

  // Persistence
  useEffect(() => {
    if (prompts.length > 0) savePrompts(prompts);
  }, [prompts]);

  useEffect(() => {
    if (Object.keys(categories).length > 0) saveCustomCategories(categories);
  }, [categories]);

  useEffect(() => {
    saveSavedCompositions(compositions);
  }, [compositions]);

  useEffect(() => {
    saveCustomAppList(appList);
  }, [appList]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveCompiledPrompt(compiledPrompt);
  }, [compiledPrompt]);

  // Handlers: Category Management
  const handleUpdateCategories = (newCategories: CategoryMap) => {
    setCategories(newCategories);
  };

  const handleUpdateApps = (newApps: string[]) => {
    setAppList(newApps);
  };

  // Handlers: Prompt Management
  const handleSelect = (id: string) => {
    setSelectedId(id);
    setAnalyzeImageTarget(undefined);
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrompts(prompts.map(p =>
      p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
    ));
  };

  const handleAdd = () => {
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
    setPrompts([newPrompt, ...prompts]);
    setSelectedId(newPrompt.id);
  };

  const handleSave = (updated: PromptItem) => {
    setPrompts(prompts.map(p => p.id === updated.id ? updated : p));
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este prompt?')) {
      setPrompts(prompts.filter(p => p.id !== id));
      if (selectedId === id) setSelectedId(null);
    }
  };

  const handleDuplicate = (prompt: PromptItem) => {
    const newPrompt = {
      ...prompt,
      id: uuidv4(),
      title: `${prompt.title} (Copia)`,
      lastModified: Date.now()
    };
    setPrompts([newPrompt, ...prompts]);
    setSelectedId(newPrompt.id);
  }

  const handleUpdateImages = (images: string[]) => {
    if (selectedId) {
      const updated = prompts.find(p => p.id === selectedId);
      if (updated) {
        handleSave({ ...updated, images, lastModified: Date.now() });
      }
    }
  };

  const handleImportSuccess = (newPrompts: PromptItem[], newCategories: CategoryMap, newCompositions: SavedComposition[]) => {
    setPrompts(newPrompts);
    setCategories(newCategories);
    setCompositions(newCompositions);

    savePrompts(newPrompts);
    saveCustomCategories(newCategories);
    saveSavedCompositions(newCompositions);
    setIsDataModalOpen(false);
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
    setFilter(prev => ({ ...prev, search: '', category: 'All', subcategory: 'All' }));
    setSelectedId(null);
  };

  // Use either custom app list (if heavily modified) OR the area-specific default
  const areaSpecificApps = AREA_CONFIG[currentArea].apps;

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
            <div className="relative">
              <select
                value={currentArea}
                onChange={handleAreaChange}
                className="appearance-none bg-arch-900 border border-arch-700 text-xs text-white font-bold uppercase rounded-md py-1 pl-2 pr-6 focus:outline-none focus:border-accent-500 cursor-pointer hover:bg-arch-800 transition-colors"
              >
                {AREAS.map(area => (
                  <option key={area.id} value={area.id}>{area.label}</option>
                ))}
              </select>
              <Icons.ChevronDown size={12} className="absolute right-2 top-2 pointer-events-none text-arch-400" />
            </div>
          }
        >
          <PromptList
            prompts={prompts}
            compositions={compositions}
            categories={categories}
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
          showResizeHandle={false}
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
        onUpdate={handleUpdateCategories}
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
      />

    </div>
  );
}

export default App;