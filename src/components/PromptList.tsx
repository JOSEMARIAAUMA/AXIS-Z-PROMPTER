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
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);

  // 1. First, filter EVERYTHING by the Current Area
  const areaPrompts = useMemo(() => prompts.filter(p => p.area === currentArea), [prompts, currentArea]);
  const areaCompositions = useMemo(() => compositions.filter(c => c.area === currentArea), [compositions, currentArea]);

  // 2. Derive valid categories for the current area. 
  // Priority: Use the one passed from parent (state-driven), otherwise fallback to logic.
  const categoriesToShow = useMemo(() => {
    if (validCategories) return validCategories;

    const areaCats = AREA_CATEGORIES[currentArea] || [];
    const activeCats = new Set<string>(areaCats);
    areaPrompts.forEach(p => activeCats.add(p.category));

    return Array.from(activeCats).sort();
  }, [validCategories, currentArea, areaPrompts]);

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

      // Rating Filter
      if (filter.rating && filter.rating > 0) {
        list = list.filter(p => (p.rating || 0) >= (filter.rating || 0));
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

  const handleCategoryHover = (cat: string) => {
    if (repoMode === 'SNIPPETS') setExpandedCat(cat);
  };

  const clearFilters = () => {
    setFilter({ search: '', category: 'All', subcategory: 'All', app: 'All', rating: 0 });
  };

  const handleAddClick = (e: React.MouseEvent, prompt: PromptItem) => {
    e.stopPropagation();
    onAddToCompiler(prompt);
    setAddedFeedback(prompt.id);
    setTimeout(() => setAddedFeedback(null), 1000);
  };

  // Helper to try and match icon, fallback to box
  const getIconForCategory = (cat: string) => {
    const lower = cat.toLowerCase();
    if (lower.includes('vegeta')) return <Icons.Vegetation size={16} />;
    if (lower.includes('persona')) return <Icons.People size={16} />;
    if (lower.includes('mater')) return <Icons.Materials size={16} />;
    if (lower.includes('ilumina')) return <Icons.Lighting size={16} />;
    if (lower.includes('arquitect')) return <Icons.ArchStyle size={16} />;
    if (lower.includes('detall')) return <Icons.Details size={16} />;
    if (lower.includes('cámara')) return <Icons.Image size={16} />;
    if (lower.includes('negativ')) return <Icons.Trash size={16} />;
    if (lower.includes('render')) return <Icons.Materials size={16} />;
    if (lower.includes('market')) return <Icons.Globe size={16} />;
    if (lower.includes('memor')) return <Icons.FileText size={16} />;
    if (lower.includes('autom')) return <Icons.Code size={16} />;
    return <Icons.Box size={16} />;
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

      {/* Search Bar & App Filter */}
      <div className="p-4 border-b border-arch-800 bg-arch-900 space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder={repoMode === 'SNIPPETS' ? "Buscar prompts..." : "Buscar composiciones..."}
            value={filter.search}
            onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
            className="w-full bg-arch-950 border border-arch-700 text-arch-100 text-sm rounded-md py-2 pl-9 pr-3 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 placeholder-arch-500"
          />
          <Icons.Search className="absolute left-3 top-2.5 text-arch-500" size={16} />
        </div>

        <div className="flex space-x-2">
          <div className="relative flex-1">
            <select
              value={filter.app}
              onChange={(e) => setFilter(prev => ({ ...prev, app: e.target.value }))}
              className="w-full appearance-none bg-arch-950 border border-arch-700 text-arch-300 text-xs rounded-md py-1.5 pl-3 pr-8 focus:outline-none focus:border-accent-500"
            >
              <option value="All">Todas las Apps</option>
              {availableApps.map(app => (
                <option key={app} value={app}>{app}</option>
              ))}
            </select>
            <Icons.App className="absolute right-2 top-1.5 text-arch-500 pointer-events-none" size={14} />
          </div>
          <button
            onClick={onManageApps}
            className="px-2 py-1.5 bg-arch-800 border border-arch-700 rounded-md text-arch-400 hover:text-white"
            title="Gestionar Apps"
          >
            <Icons.Settings size={14} />
          </button>
        </div>

        {/* Rating Filter */}
        <div className="flex items-center space-x-2 bg-arch-950 border border-arch-700 rounded-md px-2 py-1">
          <span className="text-[10px] text-arch-500 font-bold uppercase">Min Stars:</span>
          <div className="flex space-x-1">
            {[0, 1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => setFilter(prev => ({ ...prev, rating: star }))}
                className={`text-xs font-medium px-1.5 py-0.5 rounded transition-colors ${(filter.rating || 0) === star
                  ? 'bg-yellow-500/20 text-yellow-500'
                  : 'text-arch-600 hover:text-arch-400'
                  }`}
              >
                {star === 0 ? 'All' : star}
              </button>
            ))}
          </div>
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

      {/* Category Filters (Only in Library Mode) */}
      {viewMode === 'LIBRARY' && (
        <div className="border-b border-arch-800 bg-arch-900">
          <div className="flex flex-wrap gap-1 p-2">

            {/* Dynamic Categories */}
            {categoriesToShow.map((cat) => (
              <div
                key={cat}
                className="relative group"
                onMouseEnter={() => handleCategoryHover(cat)}
                onMouseLeave={() => setExpandedCat(null)}
              >
                <button
                  onClick={() => setFilter(prev => ({ ...prev, category: cat === prev.category ? 'All' : cat, subcategory: 'All' }))}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter.category === cat
                    ? 'bg-accent-600 border-accent-600 text-white'
                    : 'bg-arch-800 border-arch-700 text-arch-300 hover:border-arch-500'
                    }`}
                >
                  {getIconForCategory(cat)}
                  <span>{cat}</span>
                </button>

                {/* Subcategories only available in SNIPPET mode */}
                {repoMode === 'SNIPPETS' && expandedCat === cat && categories[cat] && categories[cat].length > 0 && (
                  <div className="absolute top-full left-0 pt-2 w-56 z-50">
                    <div className="bg-arch-800 border border-arch-600 rounded-md shadow-xl py-1">
                      <div className="px-3 py-1 text-[10px] uppercase text-arch-500 tracking-wider font-bold">Explorar</div>
                      {categories[cat].map(sub => (
                        <button
                          key={sub}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFilter({ ...filter, category: cat, subcategory: sub });
                            setExpandedCat(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-arch-200 hover:bg-arch-700 hover:text-white"
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="flex items-center space-x-1 ml-auto">
              <button
                onClick={onManageCategories}
                className="px-2 py-1.5 rounded-full bg-arch-800 border border-arch-700 text-arch-400 hover:text-white hover:border-accent-500"
                title="Gestionar Categorías"
              >
                <Icons.Settings size={14} />
              </button>
              <button
                onClick={onOpenBackup}
                className="px-2 py-1.5 rounded-full bg-arch-800 border border-arch-700 text-arch-400 hover:text-accent-500 hover:border-accent-500"
                title="Copia de Seguridad / Datos"
              >
                <Icons.Database size={14} />
              </button>
            </div>

            {(filter.category !== 'All' || filter.subcategory !== 'All' || filter.app !== 'All') && (
              <button onClick={clearFilters} className="px-2 py-1 text-xs text-arch-400 hover:text-white">
                <Icons.Refresh size={12} />
              </button>
            )}
          </div>
          {repoMode === 'SNIPPETS' && filter.subcategory !== 'All' && (
            <div className="px-4 pb-2 text-xs text-accent-500 font-medium truncate">
              {filter.category} <span className="text-arch-500 mx-1">/</span> {filter.subcategory}
            </div>
          )}
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