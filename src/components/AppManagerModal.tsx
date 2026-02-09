import React, { useState } from 'react';
import { Icons } from './Icon';

interface AppManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  appList: string[];
  onUpdate: (newAppList: string[]) => void;
}

export const AppManagerModal: React.FC<AppManagerModalProps> = ({ isOpen, onClose, appList, onUpdate }) => {
  const [newAppName, setNewAppName] = useState('');

  if (!isOpen) return null;

  const handleAdd = () => {
    const trimmed = newAppName.trim();
    if (trimmed && !appList.includes(trimmed)) {
      onUpdate([...appList, trimmed]);
      setNewAppName('');
    }
  };

  const handleDelete = (appToDelete: string) => {
    if (window.confirm(`¿Eliminar "${appToDelete}" de la lista de aplicaciones?`)) {
      onUpdate(appList.filter(app => app !== appToDelete));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-arch-900 border border-arch-700 w-full max-w-md rounded-xl shadow-2xl flex flex-col">
        
        <div className="flex justify-between items-center p-4 border-b border-arch-800 bg-arch-950 rounded-t-xl">
          <div className="flex items-center space-x-2 text-arch-200">
            <Icons.App size={20} className="text-accent-500" />
            <h2 className="font-bold text-lg">Gestor de Apps / Software</h2>
          </div>
          <button onClick={onClose} className="text-arch-400 hover:text-white"><Icons.Close size={24} /></button>
        </div>

        <div className="p-4 bg-arch-900 flex flex-col h-[60vh]">
            <p className="text-xs text-arch-400 mb-4">Define qué aplicaciones de IA utilizas para etiquetar tus prompts y facilitar el filtrado.</p>
            
            <div className="flex space-x-2 mb-4">
              <input 
                type="text" 
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                placeholder="Ej: Midjourney v7..."
                className="flex-1 bg-arch-950 border border-arch-700 rounded-md px-3 py-2 text-sm text-white focus:border-accent-500 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <button 
                onClick={handleAdd}
                disabled={!newAppName.trim()}
                className="p-2 bg-accent-600 text-white rounded-md hover:bg-accent-500 disabled:opacity-50"
              >
                <Icons.Plus size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {appList.map(app => (
                <div 
                  key={app}
                  className="flex justify-between items-center p-3 rounded-md bg-arch-950 border border-arch-800 group hover:border-arch-600 transition-colors"
                >
                  <div className="flex items-center space-x-2 text-arch-200">
                      <Icons.Software size={14} />
                      <span className="font-medium text-sm">{app}</span>
                  </div>
                  <button 
                    onClick={() => handleDelete(app)}
                    className="p-1.5 text-arch-500 hover:text-red-400 hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icons.Trash size={14} />
                  </button>
                </div>
              ))}
              {appList.length === 0 && (
                  <div className="text-center text-arch-600 py-10 italic">
                      Lista vacía
                  </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};