import React, { useState } from 'react';
import { CategoryMap, AreaMapping, AreaInfo } from '../types';
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
  onDeleteArea: (id: string) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen, onClose, categories, areaMapping, onUpdate, onRenameCategory, onRenameSubcategory,
  areas, onAddArea, onRenameArea, onDeleteArea
}) => {
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
    if (window.confirm(`¿Eliminar área "${areaId}" ? Las categorías mapeadas se moverán a TEXT.`)) {
      onDeleteArea(areaId);
      if (selectedArea === areaId) setSelectedArea(areas.find(a => a.id !== areaId)?.id || '');
    }
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
    if (window.confirm(`¿Eliminar categoría "${catName}" ? `)) {
      const newCats = { ...categories };
      delete newCats[catName];
      const newMapping = { ...areaMapping };
      delete newMapping[catName];
      onUpdate(newCats, newMapping);
      if (selectedCategory === catName) setSelectedCategory(null);
    }
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
    const updatedSubs = categories[selectedCategory].filter(s => s !== subName);
    onUpdate({ ...categories, [selectedCategory]: updatedSubs }, areaMapping);
  };

  return (
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
  );
};