import React, { useState } from 'react';
import { CategoryMap, AreaMapping, AreaInfo, PromptItem } from '../types';
import { Icons } from './Icon';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryMap;
  areaMapping: AreaMapping;
  onUpdate: (newCategories: CategoryMap, newAreaMapping: AreaMapping) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
  onRenameSubcategory: (category: string, oldSub: string, newSub: string) => void;
  areas: AreaInfo[];
  onAddArea: (area: AreaInfo) => void;
  onRenameArea: (area: AreaInfo) => void;
  prompts: PromptItem[];
  onHierarchyDelete: (
    target: { type: 'AREA' | 'CATEGORY' | 'SUBCATEGORY'; id: string; parentId?: string },
    action: 'MOVE' | 'DELETE',
    newTarget?: { area?: string; category?: string; subcategory?: string }
  ) => void;
}

type DeleteTarget = {
  type: 'AREA' | 'CATEGORY' | 'SUBCATEGORY';
  id: string;
  label: string;
  parentId?: string;
};

const DeleteConfirmationModal = ({
  target,
  prompts,
  categories,
  areaMapping,
  areas,
  onConfirm,
  onCancel
}: {
  target: DeleteTarget;
  prompts: PromptItem[];
  categories: CategoryMap;
  areaMapping: AreaMapping;
  areas: AreaInfo[];
  onConfirm: (action: 'MOVE' | 'DELETE', newTarget?: { area?: string, category?: string, subcategory?: string }) => void;
  onCancel: () => void;
}) => {
  const [action, setAction] = useState<'MOVE' | 'DELETE'>('MOVE');

  // calculate affected
  let affectedPrompts = 0;
  let affectedCategories = 0;

  if (target.type === 'AREA') {
    affectedPrompts = prompts.filter(p => p.area === target.id).length;
    affectedCategories = Object.keys(areaMapping).filter(cat => areaMapping[cat].length === 1 && areaMapping[cat][0] === target.id).length;
  } else if (target.type === 'CATEGORY') {
    affectedPrompts = prompts.filter(p => p.category === target.id).length;
  } else {
    affectedPrompts = prompts.filter(p => p.category === target.parentId && p.subcategory === target.id).length;
  }

  const hasContent = affectedPrompts > 0 || affectedCategories > 0;

  // Defaults for MOVE
  const availableAreas = areas.filter(a => a.id !== target.id);
  const [newArea, setNewArea] = useState<string>(availableAreas[0]?.id || '');

  const availableCats = Object.keys(categories).filter(c => c !== target.id);
  const [newCategory, setNewCategory] = useState<string>(availableCats[0] || '');

  const availableSubs = categories[newCategory] || [];
  const [newSub, setNewSub] = useState<string>(availableSubs[0] || '');

  React.useEffect(() => {
    const subs = categories[newCategory] || [];
    if (!subs.includes(newSub)) {
      setNewSub(subs[0] || '');
    }
  }, [newCategory, categories, newSub]);

  const handleConfirm = () => {
    if (action === 'DELETE' || !hasContent) {
      onConfirm('DELETE');
    } else {
      if (target.type === 'AREA') {
        // Si el usuario seleccionó una categoría que está en varias áreas o no, preferimos asignarla al `newArea`
        onConfirm('MOVE', { area: newArea, category: newCategory, subcategory: newSub });
      } else if (target.type === 'CATEGORY') {
        onConfirm('MOVE', { category: newCategory, subcategory: newSub });
      } else {
        onConfirm('MOVE', { subcategory: newSub });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-arch-900 border border-arch-700 w-full max-w-md rounded-xl shadow-2xl p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-2">Eliminar {target.type === 'AREA' ? 'Área' : target.type === 'CATEGORY' ? 'Categoría' : 'Subcategoría'}</h3>
          <p className="text-arch-300 text-sm border-l-2 border-red-500 pl-3">
            Estás a punto de eliminar <strong>{target.label}</strong>.
          </p>
        </div>

        {hasContent ? (
          <div className="space-y-4">
            <div className="bg-orange-500/10 border border-orange-500/50 p-3 rounded-md">
              <p className="text-orange-400 text-sm font-semibold mb-1">El elemento contiene datos:</p>
              <ul className="text-xs text-orange-300 list-disc pl-4 space-y-1">
                {affectedPrompts > 0 && <li><strong>{affectedPrompts}</strong> prompts afectados.</li>}
                {affectedCategories > 0 && <li><strong>{affectedCategories}</strong> categorías huérfanas.</li>}
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-arch-500">¿Qué deseas hacer con el contenido?</label>
              <div className="flex flex-col space-y-2">
                <label className={`flex items-center space-x-2 p-3 border rounded-md cursor-pointer transition-colors ${action === 'MOVE' ? 'border-accent-500 bg-accent-500/10' : 'border-arch-700 hover:border-arch-600'}`}>
                  <input type="radio" checked={action === 'MOVE'} onChange={() => setAction('MOVE')} className="text-accent-500 focus:ring-accent-500" />
                  <span className="text-sm text-arch-200">Mover contenido a otro nivel</span>
                </label>
                <label className={`flex items-center space-x-2 p-3 border rounded-md cursor-pointer transition-colors ${action === 'DELETE' ? 'border-red-500 bg-red-500/10' : 'border-arch-700 hover:border-arch-600'}`}>
                  <input type="radio" checked={action === 'DELETE'} onChange={() => setAction('DELETE')} className="text-red-500 focus:ring-red-500" />
                  <span className="text-sm text-arch-200">Eliminar contenido permanentemente</span>
                </label>
              </div>
            </div>

            {action === 'MOVE' && (
              <div className="bg-arch-950 p-4 rounded-md border border-arch-800 space-y-3">
                {target.type === 'AREA' && (
                  <div className="space-y-1">
                    <label className="text-xs text-arch-400">Nueva Área Destino</label>
                    <select value={newArea} onChange={e => setNewArea(e.target.value)} className="w-full bg-arch-900 border border-arch-700 rounded p-2 text-sm text-white">
                      {availableAreas.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  </div>
                )}

                {(target.type === 'AREA' || target.type === 'CATEGORY') && (
                  <div className="space-y-1">
                    <label className="text-xs text-arch-400">Nueva Categoría Destino</label>
                    <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full bg-arch-900 border border-arch-700 rounded p-2 text-sm text-white">
                      {availableCats.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs text-arch-400">Nueva Subcategoría Destino</label>
                  <select value={newSub} onChange={e => setNewSub(e.target.value)} className="w-full bg-arch-900 border border-arch-700 rounded p-2 text-sm text-white disabled:opacity-50" disabled={!newCategory}>
                    {availableSubs.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-arch-400 text-sm">Este elemento está vacío. Puedes eliminarlo sin afectar a ningún prompt.</p>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-arch-800">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-arch-400 hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleConfirm} className="px-4 py-2 text-sm font-bold bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors flex items-center space-x-2">
            <Icons.Trash size={16} />
            <span>{action === 'DELETE' || !hasContent ? 'Eliminar Definitivamente' : 'Mover y Eliminar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}


export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen, onClose, categories, areaMapping, prompts, onUpdate, onRenameCategory, onRenameSubcategory,
  areas, onAddArea, onRenameArea, onHierarchyDelete
}) => {
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [selectedArea, setSelectedArea] = useState<string>(areas[0]?.id || 'IMAGE');
  const catKeys = Object.keys(categories).filter(cat => areaMapping[cat]?.includes(selectedArea)).sort();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(catKeys[0] || null);

  const [newAreaName, setNewAreaName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');

  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  if (!isOpen) return null;

  // Ensure selectedCategory is still valid if categories changed externally
  if (selectedCategory && !categories[selectedCategory]) {
    setSelectedCategory(catKeys[0] || null);
  }

  const handleAddArea = () => {
    const trimmed = newAreaName.trim();
    if (trimmed && !areas.find(a => a.id === trimmed.toUpperCase())) {
      onAddArea({ id: trimmed.toUpperCase().replace(/\s+/g, '_'), label: trimmed, iconName: 'Package' });
      setNewAreaName('');
    }
  };

  const handleRenameArea = (area: AreaInfo) => {
    const trimmed = editingValue.trim();
    if (trimmed && trimmed !== area.label) {
      onRenameArea({ ...area, label: trimmed });
    }
    setEditingArea(null);
  };

  const handleDeleteArea = (areaId: string) => {
    if (areas.length <= 1) return alert("Debe haber al menos un área.");
    setDeleteTarget({ type: 'AREA', id: areaId, label: areas.find(a => a.id === areaId)?.label || areaId });
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (trimmed && !categories[trimmed]) {
      onUpdate({ ...categories, [trimmed]: [] }, { ...areaMapping, [trimmed]: [selectedArea] });
      setNewCategoryName('');
      setSelectedCategory(trimmed);
    }
  };

  const handleRenameCategory = (oldName: string) => {
    const trimmed = editingValue.trim();
    if (trimmed && trimmed !== oldName) {
      onRenameCategory(oldName, trimmed);
      if (selectedCategory === oldName) setSelectedCategory(trimmed);
    }
    setEditingCat(null);
  };

  const handleRenameSubcategory = (oldName: string) => {
    if (!selectedCategory) return;
    const trimmed = editingValue.trim();
    if (trimmed && trimmed !== oldName) {
      onRenameSubcategory(selectedCategory, oldName, trimmed);
    }
    setEditingSub(null);
  };

  const handleDeleteCategory = (catName: string) => {
    setDeleteTarget({ type: 'CATEGORY', id: catName, label: catName });
  };

  const handleAddSubcategory = () => {
    if (!selectedCategory) return;
    const trimmed = newSubcategoryName.trim();
    if (trimmed && !categories[selectedCategory].includes(trimmed)) {
      const updatedSubs = [...categories[selectedCategory], trimmed];
      onUpdate({ ...categories, [selectedCategory]: updatedSubs }, areaMapping);
      setNewSubcategoryName('');
    }
  };

  const handleDeleteSubcategory = (subName: string) => {
    if (!selectedCategory) return;
    setDeleteTarget({ type: 'SUBCATEGORY', id: subName, label: subName, parentId: selectedCategory });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-arch-900 border border-arch-700 w-full max-w-6xl h-[85vh] rounded-xl shadow-2xl flex flex-col">

          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-arch-800 bg-arch-950 rounded-t-xl">
            <div className="flex items-center space-x-2 text-arch-200">
              <Icons.Settings size={20} />
              <h2 className="font-bold text-lg">Jerarquía de Biblioteca</h2>
            </div>
            <button onClick={onClose} className="text-arch-400 hover:text-white"><Icons.Close size={24} /></button>
          </div>

          {/* Content - Three Columns */}
          <div className="flex-1 flex overflow-hidden min-h-0">

            {/* Column 1: Areas */}
            <div className="w-[280px] border-r border-arch-800 flex flex-col p-4 bg-arch-950/20">
              <h3 className="text-xs font-bold uppercase text-arch-500 tracking-wider mb-4">1. Áreas Principales</h3>

              <div className="flex space-x-2 mb-4">
                <input
                  type="text"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  placeholder="Nueva Área..."
                  className="flex-1 bg-arch-950 border border-arch-700 rounded-md px-3 py-2 text-sm text-white focus:border-accent-500 outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddArea()}
                />
                <button
                  onClick={handleAddArea}
                  disabled={!newAreaName.trim()}
                  className="p-2 bg-arch-800 text-white rounded-md hover:bg-arch-700 disabled:opacity-50"
                >
                  <Icons.Plus size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {areas.map(area => (
                  <div
                    key={area.id}
                    onClick={() => setSelectedArea(area.id)}
                    className={`group flex justify - between items - center p - 3 rounded - md cursor - pointer transition - colors ${selectedArea === area.id
                      ? 'bg-arch-800 border border-accent-500/50 text-white'
                      : 'bg-arch-950/50 border border-arch-800 text-arch-400 hover:border-arch-600'
                      } `}
                  >
                    <div className="flex items-center flex-1 mr-2 overflow-hidden">
                      {editingArea === area.id ? (
                        <input
                          autoFocus
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleRenameArea(area)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRenameArea(area)}
                          className="bg-arch-950 border border-accent-500 text-white px-2 py-0.5 rounded text-sm w-full outline-none"
                        />
                      ) : (
                        <div className="flex items-center space-x-2 truncate">
                          <Icons.Package size={14} className="text-arch-500" />
                          <span className="font-medium">{area.label}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingArea(area.id); setEditingValue(area.label); }}
                        className="p-1.5 text-arch-500 hover:text-white hover:bg-arch-700 rounded"
                        title="Renombrar"
                      >
                        <Icons.Edit size={14} />
                      </button>
                      {/* Don't allow deleting base areas if possible, or handle carefully */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteArea(area.id); }}
                        className="p-1.5 text-arch-500 hover:text-red-400 hover:bg-red-900/40 rounded"
                        title="Eliminar"
                      >
                        <Icons.Trash size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Categories */}
            <div className="w-[340px] border-r border-arch-800 flex flex-col p-4 bg-arch-900/30">
              <h3 className="text-xs font-bold uppercase text-arch-500 tracking-wider mb-4">
                2. Categorías en <span className="text-accent-500">{areas.find(a => a.id === selectedArea)?.label}</span>
              </h3>

              <div className="flex space-x-2 mb-4">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nueva Categoría..."
                  className="flex-1 bg-arch-950 border border-arch-700 rounded-md px-3 py-2 text-sm text-white focus:border-accent-500 outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  className="p-2 bg-accent-600 text-white rounded-md hover:bg-accent-500 disabled:opacity-50"
                >
                  <Icons.Plus size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {catKeys.map(cat => (
                  <div
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`group flex justify - between items - center p - 3 rounded - md cursor - pointer transition - colors ${selectedCategory === cat
                      ? 'bg-arch-800 border-l-4 border-l-accent-500 text-white'
                      : 'bg-arch-950 border border-arch-800 text-arch-400 hover:border-arch-600'
                      } `}
                  >
                    <div className="flex items-center flex-1 mr-2 overflow-hidden">
                      {editingCat === cat ? (
                        <input
                          autoFocus
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleRenameCategory(cat)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRenameCategory(cat)}
                          className="bg-arch-950 border border-accent-500 text-white px-2 py-0.5 rounded text-sm w-full outline-none"
                        />
                      ) : (
                        <span className="font-medium truncate">{cat}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingCat(cat); setEditingValue(cat); }}
                        className="p-1.5 text-arch-500 hover:text-white hover:bg-arch-700 rounded"
                      >
                        <Icons.Edit size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                        className="p-1.5 text-arch-500 hover:text-red-400 hover:bg-red-900/40 rounded"
                      >
                        <Icons.Trash size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {catKeys.length === 0 && (
                  <div className="text-center py-20 text-arch-600 text-xs italic">
                    Sin categorías en esta área
                  </div>
                )}
              </div>
            </div>

            {/* Column 3: Subcategories */}
            <div className="flex-1 flex flex-col p-4 bg-arch-900/10">
              <h3 className="text-xs font-bold uppercase text-arch-500 tracking-wider mb-4">
                3. Gestión de <span className="text-accent-500">{selectedCategory || '...'}</span>
              </h3>

              {selectedCategory ? (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Area Assignment Section */}
                  <div className="mb-6 p-3 bg-arch-950/40 rounded-lg border border-arch-800">
                    <h4 className="text-[10px] font-bold uppercase text-arch-500 mb-2 flex items-center">
                      <Icons.Globe size={12} className="mr-1" /> Áreas asignadas
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {areas.map(area => {
                        const isAssigned = areaMapping[selectedCategory]?.includes(area.id);
                        return (
                          <button
                            key={area.id}
                            onClick={() => {
                              const currentAreas = areaMapping[selectedCategory] || [];
                              const nextAreas = isAssigned
                                ? currentAreas.filter(id => id !== area.id)
                                : [...currentAreas, area.id];

                              // Prevent orphan categories (must have at least one area)
                              if (nextAreas.length === 0) {
                                alert("La categoría debe pertenecer al menos a un área.");
                                return;
                              }

                              onUpdate(categories, { ...areaMapping, [selectedCategory]: nextAreas });
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition-all flex items-center space-x-1 ${isAssigned
                              ? 'bg-accent-600/20 border-accent-500 text-accent-400'
                              : 'bg-arch-900 border-arch-700 text-arch-500 hover:border-arch-500'
                              }`}
                          >
                            {isAssigned ? <Icons.Check size={10} /> : <Icons.Plus size={10} />}
                            <span>{area.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="h-px bg-arch-800 mb-6" />

                  <h4 className="text-[10px] font-bold uppercase text-arch-500 mb-2">Subcategorías</h4>
                  <div className="flex space-x-2 mb-4">
                    <input
                      type="text"
                      value={newSubcategoryName}
                      onChange={(e) => setNewSubcategoryName(e.target.value)}
                      placeholder="Nueva Subcategoría..."
                      className="flex-1 bg-arch-950 border border-arch-700 rounded-md px-3 py-2 text-sm text-white focus:border-accent-500 outline-none"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSubcategory()}
                    />
                    <button
                      onClick={handleAddSubcategory}
                      disabled={!newSubcategoryName.trim()}
                      className="p-2 bg-arch-700 text-white rounded-md hover:bg-arch-600 disabled:opacity-50"
                    >
                      <Icons.Plus size={18} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1 pr-2">
                    {categories[selectedCategory]?.map(sub => (
                      <div key={sub} className="group flex justify-between items-center p-2.5 border-b border-arch-800 text-sm text-arch-300 hover:bg-arch-800/30">
                        <div className="flex-1 mr-2 overflow-hidden">
                          {editingSub === sub ? (
                            <input
                              autoFocus
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleRenameSubcategory(sub)}
                              onKeyDown={(e) => e.key === 'Enter' && handleRenameSubcategory(sub)}
                              className="bg-arch-950 border border-accent-500 text-white px-2 py-0.5 rounded text-xs w-full outline-none"
                            />
                          ) : (
                            <span className="truncate">{sub}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingSub(sub); setEditingValue(sub); }}
                            className="p-1.5 text-arch-600 hover:text-white"
                          >
                            <Icons.Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteSubcategory(sub)}
                            className="p-1.5 text-arch-600 hover:text-red-400"
                          >
                            <Icons.Trash size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {categories[selectedCategory]?.length === 0 && (
                      <div className="text-center text-arch-600 py-10 italic text-xs">
                        Sin subcategorías
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-arch-600 text-sm">
                  Selecciona una categoría para gestionar sus subcategorías
                </div>
              )}
            </div>

          </div>

          {/* Footer Info */}
          <div className="p-3 border-t border-arch-800 bg-arch-950/50 text-[10px] text-arch-500 flex justify-between italic">
            <span>* Los cambios se guardan automáticamente en la nube.</span>
            <span>Jerarquía: Área &gt; Categoría &gt; Subcategoría</span>
          </div>
        </div>
      </div>

      {deleteTarget && (
        <DeleteConfirmationModal
          target={deleteTarget}
          prompts={prompts}
          categories={categories}
          areaMapping={areaMapping}
          areas={areas}
          onConfirm={(action, newTarget) => {
            onHierarchyDelete(deleteTarget, action, newTarget);
            setDeleteTarget(null);
            if (deleteTarget.type === 'AREA' && selectedArea === deleteTarget.id) setSelectedArea(areas.find(a => a.id !== deleteTarget.id)?.id || '');
            if (deleteTarget.type === 'CATEGORY' && selectedCategory === deleteTarget.id) setSelectedCategory(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
};