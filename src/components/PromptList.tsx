import React, { useState, useMemo } from 'react';
import { PromptItem, CategoryMap, FilterState, SavedComposition, AreaType } from '../types';
import { Icons } from './Icon';
import { AREA_CATEGORIES } from '../constants';

interface PromptListProps {
  prompts: PromptItem[];
  compositions: SavedComposition[];
  categories: CategoryMap;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSelectComposition: (comp: SavedComposition) => void;
  onDeleteComposition: (id: string) => void;
  onAdd: () => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onAddToCompiler: (prompt: PromptItem) => void;
  onManageCategories: () => void;
  onOpenBackup: () => void;
  onManageApps: () => void;
  availableApps: string[];
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  currentArea: AreaType; // New Prop
  validCategories?: string[]; // Optional prop for filtering
}

type ViewMode = 'LIBRARY' | 'FAVORITES' | 'HISTORY';
type RepoMode = 'SNIPPETS' | 'COMPOSITIONS';

export const PromptList: React.FC<PromptListProps> = ({
  prompts, compositions, categories, selectedId, onSelect, onSelectComposition, onDeleteComposition, onAdd, onToggleFavorite, onAddToCompiler, onManageCategories, onOpenBackup, onManageApps, availableApps, filter, setFilter, currentArea, validCategories
}) => {

  const [viewMode, setViewMode] = useState<ViewMode>('LIBRARY');
  const [repoMode, setRepoMode] = useState<RepoMode>('SNIPPETS');
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);
  const [hoveredDropdown, setHoveredDropdown] = useState<'category' | 'subcategory' | null>(null);

  // 1. First, filter EVERYTHING by the Current Area
  const areaPrompts = useMemo(() => {
    if (currentArea === 'GLOBAL') return prompts;
    // Use the categories allowed for this area to filter prompts
    if (validCategories && validCategories.length > 0) {
      return prompts.filter(p => validCategories.includes(p.category));
    }
    // Fallback for edge cases where validCategories might be empty/null
    return prompts.filter(p => p.area === currentArea);
  }, [prompts, currentArea, validCategories]);

  const areaCompositions = useMemo(() =>
    currentArea === 'GLOBAL' ? compositions : compositions.filter(c => c.area === currentArea),
    [compositions, currentArea]);

  // 2. Derive categories to show in the filter UI
  const categoriesToShow = useMemo(() => {
    if (validCategories) return validCategories.sort();

    // Fallback logic
    const areaCats = AREA_CATEGORIES[currentArea] || [];
    const activeCats = new Set<string>(areaCats);
    areaPrompts.forEach(p => activeCats.add(p.category));
    return Array.from(activeCats).sort();
  }, [validCategories, currentArea, areaPrompts]);

  // 3. Calculate prompt counts per category (scoped to current area and other filters)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let list = areaPrompts;

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(searchLower) ||
        p.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }
    if (filter.app !== 'All') {
      list = list.filter(p => p.apps && p.apps.includes(filter.app));
    }
    if (filter.rating && filter.rating > 0) {
      list = list.filter(p => (p.rating || 0) >= (filter.rating || 0));
    }
    if (filter.origin !== 'All') {
      list = list.filter(p => p.origin === filter.origin);
    }

    list.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [areaPrompts, filter.search, filter.app, filter.rating, filter.origin]);

  const getFilteredItems = () => {
    // Mode: SNIPPETS
    if (repoMode === 'SNIPPETS') {
      let list = areaPrompts; // Use area-scoped list

      // Search Filter
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        list = list.filter(p =>
          p.title.toLowerCase().includes(searchLower) ||
          p.tags.some(t => t.toLowerCase().includes(searchLower))
        );
      }

      // App Filter
      if (filter.app !== 'All') {
        list = list.filter(p => p.apps && p.apps.includes(filter.app));
      }

      if (filter.rating && filter.rating > 0) {
        list = list.filter(p => (p.rating || 0) >= (filter.rating || 0));
      }

      // Origin Filter
      if (filter.origin !== 'All') {
        list = list.filter(p => p.origin === filter.origin);
      }

      if (viewMode === 'FAVORITES') return list.filter(p => p.isFavorite);
      if (viewMode === 'HISTORY') return [...list].sort((a, b) => b.lastModified - a.lastModified);

      let libraryList = list;
      if (filter.category !== 'All') {
        libraryList = libraryList.filter(p => p.category === filter.category);
      }
      if (filter.subcategory !== 'All') {
        libraryList = libraryList.filter(p => p.subcategory === filter.subcategory);
      }
      return libraryList;
    }
    // Mode: COMPOSITIONS
    else {
      let list = areaCompositions; // Use area-scoped list

      // Search Filter
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        list = list.filter(c => c.title.toLowerCase().includes(searchLower));
      }

      // App Filter
      if (filter.app !== 'All') {
        list = list.filter(c => c.apps && c.apps.includes(filter.app));
      }

      if (viewMode === 'HISTORY') return [...list].sort((a, b) => b.lastModified - a.lastModified);

      if (filter.category !== 'All') {
        list = list.filter(c => c.categories && c.categories.includes(filter.category));
      }

      return list;
    }
  };

  const displayedItems = getFilteredItems();

  // Subcategory options for the selected category
  const subcategoryOptions = useMemo(() => {
    if (filter.category === 'All') return [];
    return categories[filter.category] || [];
  }, [categories, filter.category]);

  const clearFilters = () => {
    setFilter({ search: '', category: 'All', subcategory: 'All', app: 'All', rating: 0, origin: 'All' });
  };

  const handleAddClick = (e: React.MouseEvent, prompt: PromptItem) => {
    e.stopPropagation();
    onAddToCompiler(prompt);
    setAddedFeedback(prompt.id);
    setTimeout(() => setAddedFeedback(null), 1000);
  };




  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  // Determine which categories to show in the filter bar (already defined via useMemo)

  return (
    <div className="flex flex-col h-full bg-arch-900">

      {/* Mode Switcher */}
      <div className="flex p-2 bg-arch-950 border-b border-arch-800 space-x-2">
        <button
          onClick={() => { setRepoMode('SNIPPETS'); clearFilters(); }}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded text-xs font-bold uppercase tracking-wide transition-colors ${repoMode === 'SNIPPETS' ? 'bg-arch-800 text-white shadow-sm' : 'text-arch-500 hover:text-arch-300'
            }`}
        >
          <Icons.LayoutGrid size={14} />
          <span>Snippets</span>
        </button>
        <button
          onClick={() => { setRepoMode('COMPOSITIONS'); clearFilters(); }}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded text-xs font-bold uppercase tracking-wide transition-colors ${repoMode === 'COMPOSITIONS' ? 'bg-arch-800 text-white shadow-sm' : 'text-arch-500 hover:text-arch-300'
            }`}
        >
          <Icons.Package size={14} />
          <span>Composiciones</span>
        </button>
      </div>

      {/* Search Bar + Filters — compact 2-row layout */}
      <div className="px-3 py-2 border-b border-arch-800 bg-arch-900 space-y-1.5">
        {/* Row 1: Search */}
        <div className="relative">
          <input
            type="text"
            placeholder={repoMode === 'SNIPPETS' ? "Buscar prompts..." : "Buscar composiciones..."}
            value={filter.search}
            onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
            className="w-full bg-arch-950 border border-arch-700 text-arch-100 text-xs rounded-md py-1.5 pl-8 pr-3 focus:outline-none focus:border-accent-500 placeholder-arch-500"
          />
          <Icons.Search className="absolute left-2.5 top-2 text-arch-500" size={14} />
        </div>

        {/* Row 2: App + Rating + Origin */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <select
              value={filter.app}
              onChange={(e) => setFilter(prev => ({ ...prev, app: e.target.value }))}
              className="w-full appearance-none bg-arch-950 border border-arch-700 text-arch-300 text-xs rounded py-1 pl-2 pr-6 focus:outline-none focus:border-accent-500"
            >
              <option value="All">Todas las Apps</option>
              {availableApps.map(app => (
                <option key={app} value={app}>{app}</option>
              ))}
            </select>
            <Icons.App className="absolute right-1.5 top-1.5 text-arch-500 pointer-events-none" size={12} />
          </div>

          {/* Rating compact */}
          <div className="flex items-center gap-0.5 bg-arch-950 border border-arch-700 rounded px-1 py-0.5">
            {[0, 1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => setFilter(prev => ({ ...prev, rating: star }))}
                className={`text-[10px] font-medium px-1 py-0.5 rounded transition-colors ${(filter.rating || 0) === star ? 'bg-yellow-500/20 text-yellow-500' : 'text-arch-600 hover:text-arch-400'
                  }`}
              >
                {star === 0 ? '★' : star}
              </button>
            ))}
          </div>

          {/* Origin */}
          <div className="flex items-center gap-0.5 bg-arch-950 border border-arch-700 rounded px-0.5 py-0.5">
            <button
              onClick={() => setFilter(prev => ({ ...prev, origin: prev.origin === 'user' ? 'All' : 'user' }))}
              className={`p-1 rounded transition-colors ${filter.origin === 'user' ? 'bg-emerald-500/20 text-emerald-500' : 'text-arch-600 hover:text-arch-400'}`}
              title="Origen: Usuario"
            ><Icons.User size={12} /></button>
            <button
              onClick={() => setFilter(prev => ({ ...prev, origin: prev.origin === 'internet' ? 'All' : 'internet' }))}
              className={`p-1 rounded transition-colors ${filter.origin === 'internet' ? 'bg-indigo-500/20 text-indigo-500' : 'text-arch-600 hover:text-arch-400'}`}
              title="Origen: Web"
            ><Icons.Globe size={12} /></button>
          </div>

          <button onClick={onManageApps} className="p-1.5 bg-arch-800 border border-arch-700 rounded text-arch-400 hover:text-white" title="Gestionar Apps">
            <Icons.Settings size={12} />
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-arch-800 bg-arch-950">
        <button
          onClick={() => setViewMode('LIBRARY')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 text-xs font-medium border-b-2 transition-colors ${viewMode === 'LIBRARY' ? 'border-accent-500 text-white' : 'border-transparent text-arch-500 hover:text-arch-300'
            }`}
        >
          <Icons.Library size={14} />
          <span>Biblioteca</span>
        </button>
        {repoMode === 'SNIPPETS' && (
          <button
            onClick={() => setViewMode('FAVORITES')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 text-xs font-medium border-b-2 transition-colors ${viewMode === 'FAVORITES' ? 'border-accent-500 text-white' : 'border-transparent text-arch-500 hover:text-arch-300'
              }`}
          >
            <Icons.Star size={14} />
            <span>Favoritos</span>
          </button>
        )}
        <button
          onClick={() => setViewMode('HISTORY')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 text-xs font-medium border-b-2 transition-colors ${viewMode === 'HISTORY' ? 'border-accent-500 text-white' : 'border-transparent text-arch-500 hover:text-arch-300'
            }`}
        >
          <Icons.Clock size={14} />
          <span>Historial</span>
        </button>
      </div>

      {/* Category + Subcategory Dropdowns — hover-activated */}
      {viewMode === 'LIBRARY' && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-arch-800 bg-arch-950/60">

          {/* Category hover dropdown */}
          <div
            className="relative flex-1"
            onMouseEnter={() => setHoveredDropdown('category')}
            onMouseLeave={() => setHoveredDropdown(null)}
          >
            <button className={`w-full flex items-center justify-between gap-1 px-2 py-1 rounded border text-xs transition-colors ${filter.category !== 'All'
                ? 'bg-accent-600/20 border-accent-500 text-accent-300'
                : 'bg-arch-900 border-arch-700 text-arch-300 hover:border-arch-500'
              }`}>
              <span className="truncate">
                {filter.category === 'All'
                  ? `Categoría (${Object.values(categoryCounts).reduce((a, b) => a + b, 0)})`
                  : `${filter.category} (${categoryCounts[filter.category] || 0})`
                }
              </span>
              <Icons.ChevronDown size={11} className="flex-shrink-0 text-arch-500" />
            </button>

            {hoveredDropdown === 'category' && (
              <div className="absolute top-full left-0 right-0 mt-0.5 z-50 bg-arch-800 border border-arch-600 rounded-md shadow-xl py-1 max-h-64 overflow-y-auto no-scrollbar">
                <button
                  onMouseDown={() => { setFilter(prev => ({ ...prev, category: 'All', subcategory: 'All' })); setHoveredDropdown(null); }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${filter.category === 'All' ? 'text-accent-400 bg-accent-500/10' : 'text-arch-400 hover:bg-arch-700 hover:text-white'
                    }`}
                >
                  — Todas las categorías
                </button>
                {categoriesToShow.map(cat => (
                  <button
                    key={cat}
                    onMouseDown={() => { setFilter(prev => ({ ...prev, category: cat, subcategory: 'All' })); setHoveredDropdown(null); }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between gap-2 ${filter.category === cat ? 'text-accent-300 bg-accent-500/20' : 'text-arch-200 hover:bg-arch-700 hover:text-white'
                      }`}
                  >
                    <span className="truncate">{cat}</span>
                    <span className="text-[10px] text-arch-500 flex-shrink-0">{categoryCounts[cat] || 0}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subcategory hover dropdown — only when category is selected and has subcategories */}
          {filter.category !== 'All' && subcategoryOptions.length > 0 && (
            <div
              className="relative flex-1"
              onMouseEnter={() => setHoveredDropdown('subcategory')}
              onMouseLeave={() => setHoveredDropdown(null)}
            >
              <button className={`w-full flex items-center justify-between gap-1 px-2 py-1 rounded border text-xs transition-colors ${filter.subcategory !== 'All'
                  ? 'bg-accent-600/20 border-accent-500 text-accent-300'
                  : 'bg-arch-900 border-arch-700 text-arch-300 hover:border-arch-500'
                }`}>
                <span className="truncate">
                  {filter.subcategory === 'All' ? 'Subcategoría' : filter.subcategory}
                </span>
                <Icons.ChevronDown size={11} className="flex-shrink-0 text-arch-500" />
              </button>

              {hoveredDropdown === 'subcategory' && (
                <div className="absolute top-full left-0 right-0 mt-0.5 z-50 bg-arch-800 border border-arch-600 rounded-md shadow-xl py-1 max-h-64 overflow-y-auto no-scrollbar">
                  <button
                    onMouseDown={() => { setFilter(prev => ({ ...prev, subcategory: 'All' })); setHoveredDropdown(null); }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${filter.subcategory === 'All' ? 'text-accent-400 bg-accent-500/10' : 'text-arch-400 hover:bg-arch-700 hover:text-white'
                      }`}
                  >
                    — Todas las subcategorías
                  </button>
                  {subcategoryOptions.map(sub => (
                    <button
                      key={sub}
                      onMouseDown={() => { setFilter(prev => ({ ...prev, subcategory: sub })); setHoveredDropdown(null); }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${filter.subcategory === sub ? 'text-accent-300 bg-accent-500/20' : 'text-arch-200 hover:bg-arch-700 hover:text-white'
                        }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {(filter.category !== 'All' || filter.subcategory !== 'All') && (
              <button
                onClick={clearFilters}
                className="p-1.5 text-arch-400 hover:text-white transition-colors"
                title="Limpiar filtros"
              >
                <Icons.Refresh size={12} />
              </button>
            )}
            <button onClick={onManageCategories} className="p-1.5 bg-arch-800 border border-arch-700 rounded text-arch-400 hover:text-white hover:border-accent-500 transition-colors" title="Gestionar Categorías">
              <Icons.Settings size={12} />
            </button>
            <button onClick={onOpenBackup} className="p-1.5 bg-arch-800 border border-arch-700 rounded text-arch-400 hover:text-accent-500 hover:border-accent-500 transition-colors" title="Datos / Backup">
              <Icons.Database size={12} />
            </button>
          </div>
        </div>
      )}

      {/* List Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2">

        {/* SNIPPETS MODE RENDER */}
        {repoMode === 'SNIPPETS' && (
          <>
            {viewMode === 'LIBRARY' && (
              <button
                onClick={onAdd}
                className="w-full flex items-center justify-center space-x-2 p-3 rounded-lg border border-dashed border-arch-700 text-arch-400 hover:border-accent-500 hover:text-accent-500 hover:bg-arch-800/50 transition-all group"
              >
                <Icons.Plus size={18} />
                <span className="text-sm font-medium">Nuevo Prompt ({currentArea})</span>
              </button>
            )}

            {(displayedItems as PromptItem[]).map(prompt => (
              <div
                key={prompt.id}
                onClick={() => onSelect(prompt.id)}
                className={`group relative p-3 rounded-lg border cursor-pointer transition-all ${selectedId === prompt.id
                  ? 'bg-arch-800 border-accent-500 shadow-md'
                  : 'bg-arch-900 border-arch-800 hover:border-arch-600'
                  }`}
              >
                <div className="flex justify-between items-start mb-1 pr-14">
                  <h3 className={`text-sm font-semibold line-clamp-1 ${selectedId === prompt.id ? 'text-white' : 'text-arch-200'}`}>
                    {prompt.title}
                  </h3>
                </div>

                <div className="absolute top-3 right-3 flex space-x-1">
                  <button
                    onClick={(e) => handleAddClick(e, prompt)}
                    className={`p-1 rounded-full transition-all ${addedFeedback === prompt.id
                      ? 'text-green-500 bg-green-500/10'
                      : 'text-arch-400 hover:text-accent-400 hover:bg-arch-700'
                      }`}
                    title="Añadir a Compilador"
                  >
                    {addedFeedback === prompt.id ? <Icons.Check size={14} /> : <Icons.PlusCircle size={14} />}
                  </button>
                  <button
                    onClick={(e) => onToggleFavorite(prompt.id, e)}
                    className={`p-1 rounded-full transition-all ${prompt.isFavorite
                      ? 'text-yellow-500 hover:text-yellow-400'
                      : 'text-arch-600 hover:text-yellow-500 opacity-0 group-hover:opacity-100'
                      }`}
                  >
                    <Icons.Star size={14} fill={prompt.isFavorite ? "currentColor" : "none"} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1 items-center mb-2">
                  <span className="text-[10px] bg-arch-950 px-1.5 py-0.5 rounded border border-arch-800 text-arch-400">{prompt.category}</span>
                  {prompt.apps && prompt.apps.map(app => (
                    <span key={app} className="text-[9px] bg-blue-950/40 border border-blue-900/50 text-blue-300 px-1 rounded">
                      {app}
                    </span>
                  ))}
                  {viewMode === 'HISTORY' && (
                    <span className="text-arch-600 flex items-center space-x-1 ml-auto text-xs">
                      <Icons.Clock size={10} />
                      <span>{formatDate(prompt.lastModified)}</span>
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Icons.Star
                        key={star}
                        size={10}
                        className={star <= (prompt.rating || 0) ? "text-yellow-500 fill-current" : "text-arch-700"}
                      />
                    ))}
                  </div>
                  {prompt.origin === 'internet' && (
                    <span className="text-[9px] flex items-center bg-indigo-950/50 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-900/50">
                      <Icons.Globe size={9} className="mr-1" /> WEB
                    </span>
                  )}
                  {prompt.origin === 'user' && (
                    <span className="text-[9px] flex items-center bg-emerald-950/50 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-900/50">
                      <Icons.User size={9} className="mr-1" /> USER
                    </span>
                  )}
                </div>

                <p className="text-xs text-arch-400 line-clamp-2 italic">
                  {prompt.contentEs || "Sin descripción..."}
                </p>
              </div>
            ))}
          </>
        )}

        {/* COMPOSITIONS MODE RENDER */}
        {repoMode === 'COMPOSITIONS' && (
          <>
            {(displayedItems as SavedComposition[]).map(comp => (
              <div
                key={comp.id}
                onClick={() => onSelectComposition(comp)}
                className="group relative p-3 rounded-lg border bg-arch-900 border-arch-800 hover:border-accent-500/50 cursor-pointer transition-all hover:bg-arch-800"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <Icons.Template size={16} className="text-indigo-500" />
                    <h3 className="text-sm font-semibold text-arch-200 group-hover:text-white">{comp.title}</h3>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteComposition(comp.id); }}
                    className="text-arch-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icons.Trash size={14} />
                  </button>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {comp.categories && comp.categories.map(c => (
                    <span key={c} className="text-[10px] bg-arch-950 px-1.5 py-0.5 rounded border border-arch-700 text-arch-400">
                      {c}
                    </span>
                  ))}
                </div>
                {/* App Tags */}
                {comp.apps && comp.apps.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {comp.apps.map(app => (
                      <span key={app} className="text-[9px] bg-blue-950/40 border border-blue-900/50 text-blue-300 px-1 rounded flex items-center">
                        <Icons.Software size={8} className="mr-1" /> {app}
                      </span>
                    ))}
                  </div>
                )}

                {/* Comments Indicator */}
                {comp.data.comments && (
                  <div className="mb-2 text-[10px] text-blue-400 flex items-center">
                    <Icons.Comments size={10} className="mr-1" />
                    <span className="truncate max-w-[200px]">{comp.data.comments}</span>
                  </div>
                )}

                <div className="flex items-center space-x-2 text-[10px] text-arch-500">
                  <Icons.Clock size={10} />
                  <span>{formatDate(comp.lastModified)}</span>
                </div>
              </div>
            ))}
            {displayedItems.length === 0 && (
              <div className="text-center py-10 text-arch-500 text-sm">
                Sin composiciones guardadas para {currentArea}. <br />
                <span className="text-xs">Crea una en el Compilador y guárdala.</span>
              </div>
            )}
          </>
        )}

        {repoMode === 'SNIPPETS' && displayedItems.length === 0 && (
          <div className="text-center py-10 text-arch-500 text-sm">
            No hay resultados en el área {currentArea}.
          </div>
        )}
      </div>
    </div>
  );
};