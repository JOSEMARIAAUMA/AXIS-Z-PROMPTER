import React, { useRef, useState } from 'react';
import { Icons } from './Icon';
import { PromptItem, CategoryMap, SavedComposition } from '../types';
import { exportBackup, validateAndParseBackup } from '../services/dataService';

interface DataManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPrompts: PromptItem[];
    currentCategories: CategoryMap;
    currentCompositions: SavedComposition[];
    onImportSuccess: (prompts: PromptItem[], categories: CategoryMap, compositions: SavedComposition[]) => void;
    onMigrateLocal: () => void;
    isMigrating: boolean;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
    isOpen, onClose, currentPrompts, currentCategories, currentCompositions, onImportSuccess, onMigrateLocal, isMigrating
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [importMode, setImportMode] = useState<'MERGE' | 'REPLACE'>('MERGE');

    if (!isOpen) return null;

    const handleExport = () => {
        exportBackup(currentPrompts, currentCategories, currentCompositions);
        setSuccessMsg("Copia de seguridad descargada correctamente.");
        setTimeout(() => setSuccessMsg(null), 3000);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        setSuccessMsg(null);

        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                const data = await validateAndParseBackup(file);

                let finalPrompts = [...data.prompts];
                let finalCategories = { ...data.categories };
                let finalCompositions = [...data.compositions];

                if (importMode === 'MERGE') {
                    // Merge Categories
                    finalCategories = { ...currentCategories, ...(data.categories || {}) };

                    // Merge Prompts (Avoid duplicates by ID)
                    const existingIds = new Set(currentPrompts.map(p => p.id));
                    const newPrompts = data.prompts.filter(p => !existingIds.has(p.id));
                    finalPrompts = [...currentPrompts, ...newPrompts];

                    // Merge Compositions
                    const existingCompIds = new Set(currentCompositions.map(c => c.id));
                    const newComps = data.compositions.filter(c => !existingCompIds.has(c.id));
                    finalCompositions = [...currentCompositions, ...newComps];
                }
                // If REPLACE, use data directly

                onImportSuccess(finalPrompts, finalCategories, finalCompositions);
                setSuccessMsg(`Restauración completada. ${data.prompts.length} prompts, ${data.compositions.length} composiciones.`);

                if (fileInputRef.current) fileInputRef.current.value = '';

            } catch (err: any) {
                setError(err.message || "Error al procesar el archivo.");
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-arch-900 border border-arch-700 w-full max-w-lg rounded-xl shadow-2xl flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-arch-800 bg-arch-950 rounded-t-xl">
                    <div className="flex items-center space-x-2 text-arch-200">
                        <Icons.Database size={20} className="text-accent-500" />
                        <h2 className="font-bold text-lg">Copia de Seguridad y Datos</h2>
                    </div>
                    <button onClick={onClose} className="text-arch-400 hover:text-white"><Icons.Close size={24} /></button>
                </div>

                <div className="p-6 space-y-8">

                    {/* Migration Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold uppercase text-arch-500 tracking-wider flex items-center">
                            <Icons.Cloud size={16} className="mr-2" /> Migración a la Nube (Supabase)
                        </h3>
                        <p className="text-xs text-arch-400">
                            Si tienes datos antiguos guardados en este navegador, puedes subirlos a la nube ahora.
                        </p>
                        <button
                            onClick={onMigrateLocal}
                            disabled={isMigrating}
                            className="w-full flex items-center justify-center space-x-2 p-3 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/50 rounded-lg text-white transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                        >
                            {isMigrating ? (
                                <Icons.Refresh size={20} className="animate-spin" />
                            ) : (
                                <Icons.Rocket size={20} />
                            )}
                            <span className="font-medium">{isMigrating ? 'Migrando...' : 'Migrar Datos Locales a Nube'}</span>
                        </button>
                    </div>

                    <div className="border-t border-arch-800 my-4"></div>

                    {/* Export Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold uppercase text-arch-500 tracking-wider flex items-center">
                            <Icons.Download size={16} className="mr-2" /> Exportar Datos
                        </h3>
                        <p className="text-xs text-arch-400">
                            Descarga un archivo JSON con todos tus prompts, categorías y configuraciones.
                        </p>
                        <button
                            onClick={handleExport}
                            className="w-full flex items-center justify-center space-x-2 p-3 bg-arch-800 hover:bg-arch-700 border border-arch-600 rounded-lg text-white transition-all group"
                        >
                            <Icons.FileJson size={20} className="text-green-500 group-hover:scale-110 transition-transform" />
                            <span className="font-medium">Descargar Copia de Seguridad</span>
                        </button>
                    </div>

                    <div className="border-t border-arch-800 my-4"></div>

                    {/* Import Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase text-arch-500 tracking-wider flex items-center">
                            <Icons.Upload size={16} className="mr-2" /> Importar / Restaurar
                        </h3>

                        <div className="bg-arch-950/50 p-3 rounded-lg border border-arch-800 flex space-x-4">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="importMode"
                                    checked={importMode === 'MERGE'}
                                    onChange={() => setImportMode('MERGE')}
                                    className="text-accent-500 focus:ring-accent-500"
                                />
                                <span className="text-sm text-arch-300">Fusionar</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="importMode"
                                    checked={importMode === 'REPLACE'}
                                    onChange={() => setImportMode('REPLACE')}
                                    className="text-red-500 focus:ring-red-500"
                                />
                                <span className="text-sm text-arch-300">Reemplazar Todo</span>
                            </label>
                        </div>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center justify-center space-x-2 p-3 bg-accent-600 hover:bg-accent-500 text-white rounded-lg transition-all shadow-lg shadow-accent-500/10"
                        >
                            <Icons.Upload size={20} />
                            <span className="font-medium">Seleccionar Archivo .JSON</span>
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".json,application/json"
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Feedback Messages */}
                    {error && (
                        <div className="p-3 bg-red-900/20 border border-red-800 text-red-300 rounded-md text-sm text-center animate-pulse">
                            {error}
                        </div>
                    )}
                    {successMsg && (
                        <div className="p-3 bg-green-900/20 border border-green-800 text-green-300 rounded-md text-sm text-center">
                            {successMsg}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};