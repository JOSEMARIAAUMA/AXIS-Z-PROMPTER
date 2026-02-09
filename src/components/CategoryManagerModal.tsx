import React, { useState } from 'react';
import { CategoryMap } from '../types';
import { Icons } from './Icon';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryMap;
  onUpdate: (newCategories: CategoryMap) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ isOpen, onClose, categories, onUpdate }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(Object.keys(categories)[0] || null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  
  if (!isOpen) return null;

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (trimmed && !categories[trimmed]) {
      onUpdate({ ...categories, [trimmed]: [] });
      setNewCategoryName('');
      setSelectedCategory(trimmed);
    }
  };

  const handleDeleteCategory = (catName: string) => {
    if (window.confirm(`¿Eliminar categoría "${catName}" y todas sus subcategorías?`)) {
      const newCats = { ...categories };
      delete newCats[catName];
      onUpdate(newCats);
      if (selectedCategory === catName) {
        setSelectedCategory(null);
      }
    }
  };

  const handleAddSubcategory = () => {
    if (!selectedCategory) return;
    const trimmed = newSubcategoryName.trim();
    if (trimmed && !categories[selectedCategory].includes(trimmed)) {
      const updatedSubs = [...categories[selectedCategory], trimmed];
      onUpdate({ ...categories, [selectedCategory]: updatedSubs });
      setNewSubcategoryName('');
    }
  };

  const handleDeleteSubcategory = (subName: string) => {
    if (!selectedCategory) return;
    const updatedSubs = categories[selectedCategory].filter(s => s !== subName);
    onUpdate({ ...categories, [selectedCategory]: updatedSubs });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-arch-900 border border-arch-700 w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-arch-800 bg-arch-950 rounded-t-xl">
          <div className="flex items-center space-x-2 text-arch-200">
            <Icons.Settings size={20} />
            <h2 className="font-bold text-lg">Gestor de Categorías</h2>
          </div>
          <button onClick={onClose} className="text-arch-400 hover:text-white"><Icons.Close size={24} /></button>
        </div>

        {/* Content - Two Columns */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left: Categories */}
          <div className="w-1/2 border-r border-arch-800 flex flex-col p-4 bg-arch-900/50">
            <h3 className="text-xs font-bold uppercase text-arch-500 tracking-wider mb-4">Categorías Principales</h3>
            
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
                className="p-2 bg-accent-600 text-white rounded-md hover:bg-accent-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icons.Plus size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {Object.keys(categories).map(cat => (
                <div 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex justify-between items-center p-3 rounded-md cursor-pointer transition-colors ${
                    selectedCategory === cat 
                      ? 'bg-arch-800 border border-accent-500/50 text-white' 
                      : 'bg-arch-950 border border-arch-800 text-arch-400 hover:border-arch-600'
                  }`}
                >
                  <span className="font-medium">{cat}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                    className="p-1.5 text-arch-500 hover:text-red-400 hover:bg-red-900/20 rounded"
                  >
                    <Icons.Trash size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Subcategories */}
          <div className="w-1/2 flex flex-col p-4">
             <h3 className="text-xs font-bold uppercase text-arch-500 tracking-wider mb-4">
                Subcategorías de: <span className="text-accent-500">{selectedCategory || '...'}</span>
             </h3>

             {selectedCategory ? (
               <>
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

                  <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {categories[selectedCategory]?.map(sub => (
                      <div key={sub} className="flex justify-between items-center p-2 border-b border-arch-800 text-sm text-arch-300">
                        <span>{sub}</span>
                        <button 
                          onClick={() => handleDeleteSubcategory(sub)}
                          className="p-1 text-arch-600 hover:text-red-400"
                        >
                          <Icons.Trash size={14} />
                        </button>
                      </div>
                    ))}
                    {categories[selectedCategory]?.length === 0 && (
                      <div className="text-center text-arch-600 py-10 italic">
                        Sin subcategorías
                      </div>
                    )}
                  </div>
               </>
             ) : (
               <div className="flex-1 flex items-center justify-center text-arch-600">
                 Selecciona una categoría para editar
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};