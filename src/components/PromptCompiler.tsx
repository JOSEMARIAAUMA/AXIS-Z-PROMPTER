import React, { useState, useEffect } from 'react';
import { CompiledPrompt, CategoryMap, PromptItem, LibrarySuggestion, AreaType, SavedComposition } from '../types';
import { Icons } from './Icon';
import { classifyPrompt, analyzeCompilerAgainstLibrary } from '../services/geminiService';
import { TechParamsModal } from './TechParamsModal';
import { getAreaConfig } from '../constants';

interface PromptCompilerProps {
    compiler: CompiledPrompt;
    activeCompositionId: string | null;
    activeComposition: SavedComposition | null;
    onChange: (newCompiler: CompiledPrompt) => void;
    onClear: () => void;
    onSaveToLibrary: (title: string, categories: string[], apps: string[]) => void;
    onUpdateComposition: (data: CompiledPrompt, title?: string, cats?: string[]) => void;
    availableCategories: CategoryMap;
    availableApps: string[];
    // Props for Smart Sync
    library: PromptItem[];
    onSaveSuggestion: (suggestion: LibrarySuggestion) => void;
    currentArea: AreaType; // Context for labels
}

export const PromptCompiler: React.FC<PromptCompilerProps> = ({
    compiler, activeCompositionId, activeComposition, onChange, onClear, onSaveToLibrary, onUpdateComposition, availableCategories, availableApps,
    library, onSaveSuggestion, currentArea
}) => {
    const [copied, setCopied] = useState(false);
    const [systemCopied, setSystemCopied] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [updatedFeedback, setUpdatedFeedback] = useState(false);
    const [saveTitle, setSaveTitle] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
    // State for Active Composition editing
    const [editModeTitle, setEditModeTitle] = useState('');
    const [editModeCategory, setEditModeCategory] = useState('');
    const [editModeSubcategory, setEditModeSubcategory] = useState('');
    const [selectedApps, setSelectedApps] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isParamsModalOpen, setIsParamsModalOpen] = useState(false);

    // Smart Sync State
    const [isSyncing, setIsSyncing] = useState(false);
    const [suggestions, setSuggestions] = useState<LibrarySuggestion[]>([]);

    // New Compilation Flow State
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [clearAfterSave, setClearAfterSave] = useState(false);

    // State for collapsible sections
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
        system: true,
        comments: true,
        suggestions: false // Default open if suggestions exist
    });

    const toggleSection = (section: string) => {
        setCollapsedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const fullPrompt = [
        compiler.role,
        compiler.subject,
        compiler.context,
        compiler.details,
        compiler.params,
        compiler.negative ? (currentArea === 'IMAGE' ? `--no ${compiler.negative}` : `[Constraints: ${compiler.negative}]`) : ''
    ].filter(Boolean).join(currentArea === 'IMAGE' ? ', ' : '\n\n');

    const handleCopy = () => {
        navigator.clipboard.writeText(fullPrompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopySystem = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (compiler.system) {
            navigator.clipboard.writeText(compiler.system);
            setSystemCopied(true);
            setTimeout(() => setSystemCopied(false), 2000);
        }
    };

    // Update edit state when active composition changes
    useEffect(() => {
        if (activeComposition) {
            setEditModeTitle(activeComposition.title || '');
            const cats = activeComposition.categories || [];
            setEditModeCategory(cats[0] || '');
            setEditModeSubcategory(cats[1] || '');
        } else {
            setEditModeTitle('');
            setEditModeCategory('');
            setEditModeSubcategory('');
        }
    }, [activeComposition]);

    const updateField = (field: keyof CompiledPrompt, value: any) => {
        onChange({ ...compiler, [field]: value });
    };

    const toggleApp = (app: string) => {
        setSelectedApps(prev =>
            prev.includes(app) ? prev.filter(a => a !== app) : [...prev, app]
        );
    };

    // --- SMART SYNC LOGIC ---
    const handleSmartSync = async () => {
        if (!fullPrompt.trim() || fullPrompt.length < 20) return;

        setIsSyncing(true);
        setSuggestions([]);

        try {
            const results = await analyzeCompilerAgainstLibrary(compiler, library, Object.keys(availableCategories));
            setSuggestions(results);
            if (results.length > 0) {
                setCollapsedSections(prev => ({ ...prev, suggestions: false })); // Auto open
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleAcceptSuggestion = (suggestion: LibrarySuggestion) => {
        onSaveSuggestion(suggestion);
        // Remove from list
        setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    };

    const handleDismissSuggestion = (id: string) => {
        setSuggestions(prev => prev.filter(s => s.id !== id));
    };

    // --- SAVING LOGIC ---

    const handleNewCompilationClick = () => {
        // Logic for showing confirm dialog vs direct clear
        const hasContent = fullPrompt.trim().length > 10 ||
            (compiler.system && compiler.system.length > 5);

        if (!hasContent) {
            onClear(); // Just clear if empty
            return;
        }
        setShowClearConfirm(true);
    };

    const handleConfirmDiscard = () => {
        onClear();
        setShowClearConfirm(false);
        setClearAfterSave(false);
        setSuggestions([]); // Clear suggestions too
    };

    const handleConfirmSaveAndNew = () => {
        setClearAfterSave(true);
        setShowClearConfirm(false);
        handleStartSaving();
    };

    const handleSaveSubmit = () => {
        if (!saveTitle.trim()) return;
        const categoriesToSave = [selectedCategory, selectedSubcategory].filter(Boolean);
        onSaveToLibrary(saveTitle, categoriesToSave, selectedApps);

        setSaveTitle('');
        setSelectedCategory('');
        setSelectedSubcategory('');
        setSelectedApps([]);
        setIsSaving(false);

        if (clearAfterSave) {
            onClear();
            setClearAfterSave(false);
            setSuggestions([]);
        }
    };

    const handleUpdateClick = () => {
        if (activeCompositionId) {
            const categoriesToUpdate = [editModeCategory, editModeSubcategory].filter(Boolean);
            onUpdateComposition(compiler, editModeTitle, categoriesToUpdate);
            setUpdatedFeedback(true);
            setTimeout(() => setUpdatedFeedback(false), 2000);
        }
    };

    const handleStartSaving = () => {
        setIsSaving(true);
        if (compiler.apps && compiler.apps.length > 0) {
            setSelectedApps(compiler.apps);
        }

        const catKeys = Object.keys(availableCategories);
        if (fullPrompt.trim().length > 10 && catKeys.length > 0) {
            setIsAnalyzing(true);
            classifyPrompt(fullPrompt, catKeys)
                .then(suggested => {
                    if (suggested && suggested.length > 0) {
                        const firstCat = suggested[0];
                        setSelectedCategory(firstCat);
                        if (availableCategories[firstCat] && availableCategories[firstCat].length > 0) {
                            setSelectedSubcategory(availableCategories[firstCat][0]);
                        }
                    }
                })
                .catch(err => console.error(err))
                .finally(() => setIsAnalyzing(false));
        }
    };

    const handleCancelSaving = () => {
        setIsSaving(false);
        setClearAfterSave(false);
    };

    const SectionInput = ({
        label,
        field,
        placeholder,
        rows = 2,
        colorClass = "border-arch-700",
        extraAction = null
    }: {
        label: string,
        field: keyof CompiledPrompt,
        placeholder: string,
        rows?: number,
        colorClass?: string,
        extraAction?: React.ReactNode
    }) => {
        const isCollapsed = collapsedSections[field];

        return (
            <div className={`mb-3 rounded-md border transition-all duration-200 ${isCollapsed ? 'bg-arch-950 border-arch-800' : 'bg-arch-900/40 border-arch-700'}`}>
                <div
                    className="flex justify-between items-center p-2 cursor-pointer select-none hover:bg-arch-800/50 rounded-t-md"
                    onClick={() => toggleSection(field)}
                >
                    <div className="flex items-center space-x-2 text-arch-400">
                        <div className={`transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}>
                            <Icons.ChevronRight size={12} />
                        </div>
                        <label className="text-[10px] font-bold uppercase tracking-wider cursor-pointer">{label}</label>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                        {extraAction}
                    </div>
                </div>

                {!isCollapsed && (
                    <div className="p-2 pt-0 animate-fade-in">
                        <textarea
                            value={compiler[field] as string || ''}
                            onChange={(e) => updateField(field, e.target.value)}
                            rows={rows}
                            className={`w-full bg-arch-950/50 border ${colorClass} rounded-md p-2 text-xs text-arch-200 placeholder-arch-700 focus:outline-none focus:border-accent-500 focus:bg-arch-950 transition-colors resize-y`}
                            placeholder={placeholder}
                        />
                    </div>
                )}
            </div>
        );
    };

    // Retrieve Dynamic Labels based on currentArea
    const config = getAreaConfig(currentArea).compiler;

    // --- SAVE MODE UI ---
    if (isSaving) {
        return (
            <div className="h-full flex flex-col bg-arch-900 p-4">
                <div className="flex items-center mb-6">
                    <button onClick={handleCancelSaving} className="mr-2 text-arch-400 hover:text-white">
                        <Icons.ChevronRight className="rotate-180" size={20} />
                    </button>
                    <h3 className="text-sm font-semibold text-white">
                        {clearAfterSave ? 'Guardar y Limpiar' : 'Guardar Como (Nuevo)'}
                    </h3>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto px-1">
                    <div>
                        <label className="block text-xs font-medium text-arch-400 mb-1">Nombre del Prompt</label>
                        <input
                            type="text"
                            value={saveTitle}
                            onChange={(e) => setSaveTitle(e.target.value)}
                            placeholder="Ej: Villa moderna al atardecer..."
                            className="w-full bg-arch-950 border border-arch-700 rounded-md p-2 text-white outline-none focus:border-accent-500"
                            autoFocus
                        />
                    </div>

                    {/* APP SELECTION IN SAVE MODE */}
                    <div>
                        <label className="block text-xs font-medium text-arch-400 mb-2">Software / Apps Compatibles</label>
                        <div className="flex flex-wrap gap-2">
                            {availableApps.map(app => (
                                <button
                                    key={app}
                                    onClick={() => toggleApp(app)}
                                    className={`px-2 py-1 rounded text-xs border transition-colors ${selectedApps.includes(app)
                                        ? 'bg-blue-900 border-blue-500 text-white'
                                        : 'bg-arch-950 border-arch-700 text-arch-500 hover:border-arch-500'
                                        }`}
                                >
                                    {app}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-arch-400 mb-2 flex items-center justify-between">
                            <span>Etiquetas de Categoría (Auto-Selección IA)</span>
                            {isAnalyzing && (
                                <span className="flex items-center text-indigo-400 text-[10px] animate-pulse">
                                    <Icons.Brain size={12} className="mr-1" /> Analizando...
                                </span>
                            )}
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-medium text-arch-500 mb-1 uppercase tracking-wider">Categoría</label>
                                <select
                                    value={selectedCategory}
                                    onChange={e => {
                                        const newCat = e.target.value;
                                        setSelectedCategory(newCat);
                                        if (availableCategories[newCat] && availableCategories[newCat].length > 0) {
                                            setSelectedSubcategory(availableCategories[newCat][0]);
                                        } else {
                                            setSelectedSubcategory('');
                                        }
                                    }}
                                    className="w-full bg-arch-950/50 border border-arch-700 rounded-md p-2 text-xs text-arch-200 outline-none focus:border-accent-500"
                                >
                                    <option value="" disabled>Selecciona categoría...</option>
                                    {Object.keys(availableCategories).map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-arch-500 mb-1 uppercase tracking-wider">Subcategoría</label>
                                <select
                                    value={selectedSubcategory}
                                    onChange={e => setSelectedSubcategory(e.target.value)}
                                    className="w-full bg-arch-950/50 border border-arch-700 rounded-md p-2 text-xs text-arch-200 outline-none focus:border-accent-500"
                                    disabled={!selectedCategory || !availableCategories[selectedCategory]}
                                >
                                    <option value="" disabled>-- Sin asignar --</option>
                                    {availableCategories[selectedCategory]?.map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSaveSubmit}
                        disabled={!saveTitle.trim()}
                        className="w-full py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-md font-medium text-sm mt-4 shadow-lg shadow-green-900/20"
                    >
                        {clearAfterSave ? 'Guardar y Crear Nuevo' : 'Guardar Nueva Copia'}
                    </button>
                </div>
            </div>
        );
    }

    // --- MAIN UI ---
    return (
        <div className="h-full flex flex-col bg-arch-900 relative">

            {/* CONFIRMATION MODAL OVERLAY */}
            {showClearConfirm && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-arch-900 border border-arch-600 w-full max-w-sm rounded-lg shadow-2xl p-4">
                        <div className="flex items-center space-x-2 text-yellow-500 mb-3">
                            <Icons.AlertTriangle size={20} />
                            <h3 className="font-bold text-sm text-white">¿Guardar cambios?</h3>
                        </div>
                        <p className="text-xs text-arch-300 mb-4 leading-relaxed">
                            Tienes una compilación en curso. ¿Deseas guardarla antes de iniciar una nueva? Si descartas, se perderán los datos actuales.
                        </p>

                        <div className="space-y-2">
                            <button
                                onClick={handleConfirmSaveAndNew}
                                className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold"
                            >
                                Guardar y Nuevo
                            </button>
                            <button
                                onClick={handleConfirmDiscard}
                                className="w-full py-2 bg-red-900/40 hover:bg-red-600 border border-red-900 hover:border-red-500 text-red-200 hover:text-white rounded text-xs transition-colors"
                            >
                                Descartar (Borrar todo)
                            </button>
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                className="w-full py-2 bg-transparent hover:bg-arch-800 text-arch-400 hover:text-white rounded text-xs"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Actions */}
            <div className="p-3 border-b border-arch-800 flex justify-between items-center bg-arch-950">
                <h3 className="text-xs font-semibold text-arch-300 flex items-center">
                    {activeCompositionId && <span className="w-2 h-2 rounded-full bg-accent-500 mr-2 animate-pulse" title="Editando composición existente"></span>}
                    Constructor ({currentArea})
                </h3>
                <div className="flex space-x-2">

                    {/* Smart Sync Button */}
                    <button
                        onClick={handleSmartSync}
                        disabled={isSyncing}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-900/30 border border-indigo-700 text-indigo-300 hover:bg-indigo-900/50 hover:text-white rounded text-xs font-medium transition-colors"
                        title="Analizar y Guardar Mejoras en Biblioteca"
                    >
                        <Icons.Refresh size={14} className={isSyncing ? "animate-spin" : ""} />
                        <span className="hidden sm:inline">{isSyncing ? 'Analizando...' : 'Smart Sync'}</span>
                    </button>

                    {/* New Compilation Button */}
                    <button
                        onClick={handleNewCompilationClick}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-arch-800 hover:bg-white hover:text-arch-900 text-arch-300 rounded text-xs font-medium transition-colors"
                        title="Nueva Compilación (Limpiar)"
                    >
                        <Icons.Plus size={14} />
                    </button>

                    <div className="w-px h-6 bg-arch-800 mx-1"></div>

                    {/* Update Button (Only visible if editing existing) */}
                    {activeCompositionId && (
                        <button
                            onClick={handleUpdateClick}
                            className={`p-1.5 rounded transition-all flex items-center space-x-1 ${updatedFeedback ? 'bg-green-600 text-white' : 'text-accent-500 hover:bg-arch-800 hover:text-accent-400'}`}
                            title="Actualizar composición existente (Sobrescribir)"
                        >
                            {updatedFeedback ? <Icons.Check size={14} /> : <Icons.Refresh size={14} />}
                        </button>
                    )}

                    <button
                        onClick={handleStartSaving}
                        className="p-1.5 text-arch-400 hover:bg-arch-800 hover:text-white rounded transition-colors"
                        title="Guardar como Nueva Copia"
                    >
                        <Icons.Save size={14} />
                    </button>
                    <button
                        onClick={handleCopy}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-accent-600 hover:bg-accent-500 text-white'
                            }`}
                    >
                        {copied ? <Icons.Check size={14} /> : <Icons.Copy size={14} />}
                        <span>{copied ? 'Copiado' : 'Copiar'}</span>
                    </button>
                </div>
            </div>

            {/* Form Sections */}
            <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-2">

                {/* EDIT METADATA (Only if active composition exists) */}
                {activeComposition && (
                    <div className="mb-4 bg-arch-950/40 p-3 rounded-lg border border-arch-800 shadow-sm">
                        <div className="mb-3">
                            <label className="block text-[10px] font-medium text-arch-500 mb-1 uppercase tracking-wider">Título de la Composición</label>
                            <input
                                type="text"
                                value={editModeTitle}
                                onChange={(e) => setEditModeTitle(e.target.value)}
                                className="w-full bg-arch-950/50 border border-arch-700 rounded-md p-2 text-sm text-white outline-none focus:border-accent-500 transition-colors"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-medium text-arch-500 mb-1 uppercase tracking-wider">Categoría</label>
                                <select
                                    value={editModeCategory}
                                    onChange={e => {
                                        const newCat = e.target.value;
                                        setEditModeCategory(newCat);
                                        if (availableCategories[newCat] && availableCategories[newCat].length > 0) {
                                            setEditModeSubcategory(availableCategories[newCat][0]);
                                        } else {
                                            setEditModeSubcategory('');
                                        }
                                    }}
                                    className="w-full bg-arch-950/50 border border-arch-700 rounded-md p-2 text-xs text-arch-200 outline-none focus:border-accent-500"
                                >
                                    <option value="" disabled>Selecciona categoría...</option>
                                    {Object.keys(availableCategories).map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-arch-500 mb-1 uppercase tracking-wider">Subcategoría</label>
                                <select
                                    value={editModeSubcategory}
                                    onChange={e => setEditModeSubcategory(e.target.value)}
                                    className="w-full bg-arch-950/50 border border-arch-700 rounded-md p-2 text-xs text-arch-200 outline-none focus:border-accent-500"
                                    disabled={!editModeCategory || !availableCategories[editModeCategory]}
                                >
                                    <option value="" disabled>-- Sin asignar --</option>
                                    {availableCategories[editModeCategory]?.map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* SMART SYNC SUGGESTIONS AREA */}
                {suggestions.length > 0 && (
                    <div className={`mb-4 rounded-lg border border-indigo-700/50 bg-indigo-950/20 overflow-hidden`}>
                        <div
                            className="flex justify-between items-center p-3 cursor-pointer bg-indigo-900/20 hover:bg-indigo-900/30"
                            onClick={() => toggleSection('suggestions')}
                        >
                            <div className="flex items-center space-x-2 text-indigo-300">
                                <Icons.Sparkles size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">
                                    Sugerencias de Biblioteca ({suggestions.length})
                                </span>
                            </div>
                            <div className={`text-indigo-400 transition-transform ${!collapsedSections['suggestions'] ? 'rotate-180' : ''}`}>
                                <Icons.ChevronDown size={14} />
                            </div>
                        </div>

                        {!collapsedSections['suggestions'] && (
                            <div className="p-3 space-y-3 animate-fade-in max-h-60 overflow-y-auto">
                                {suggestions.map(sugg => (
                                    <div key={sugg.id} className="bg-arch-950 border border-indigo-900/50 p-3 rounded-md shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col">
                                                <div className="flex items-center space-x-2">
                                                    {sugg.type === 'NEW' ? (
                                                        <span className="text-[10px] bg-green-900/50 text-green-300 px-1.5 py-0.5 rounded border border-green-800 uppercase font-bold">Nuevo</span>
                                                    ) : (
                                                        <span className="text-[10px] bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800 uppercase font-bold">Actualizar</span>
                                                    )}
                                                    <span className="text-xs font-bold text-white">{sugg.title}</span>
                                                </div>
                                                <span className="text-[10px] text-arch-500 mt-1">{sugg.targetCategory}</span>
                                            </div>
                                            <button onClick={() => handleDismissSuggestion(sugg.id)} className="text-arch-600 hover:text-arch-400">
                                                <Icons.Close size={14} />
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-indigo-200/80 mb-2 italic">"{sugg.reason}"</p>
                                        <div className="bg-black/30 p-2 rounded text-[10px] font-mono text-arch-400 mb-2 line-clamp-2">
                                            {sugg.contentEn}
                                        </div>
                                        <button
                                            onClick={() => handleAcceptSuggestion(sugg)}
                                            className="w-full py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded text-xs font-medium flex items-center justify-center space-x-2 transition-colors"
                                        >
                                            <Icons.Save size={12} />
                                            <span>{sugg.type === 'NEW' ? 'Guardar Snippet' : 'Actualizar Snippet'}</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* SYSTEM PROMPT SECTION (Collapsible) */}
                <div className={`mb-3 rounded-lg border transition-all duration-200 ${collapsedSections['system'] ? 'bg-cyan-950/10 border-cyan-900/20' : 'bg-cyan-950/10 border-cyan-900/30'}`}>
                    <div
                        className="flex justify-between items-center p-2 cursor-pointer hover:bg-cyan-900/20 rounded-t-lg"
                        onClick={() => toggleSection('system')}
                    >
                        <div className="flex items-center space-x-2 text-cyan-500">
                            <div className={`transition-transform duration-200 ${collapsedSections['system'] ? '' : 'rotate-90'}`}>
                                <Icons.ChevronRight size={12} />
                            </div>
                            <label className="text-[10px] font-bold uppercase tracking-wider flex items-center cursor-pointer">
                                <Icons.Software size={12} className="mr-1.5" /> {config.system.label}
                            </label>
                        </div>
                        <button
                            onClick={handleCopySystem}
                            disabled={!compiler.system}
                            className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors border ${systemCopied
                                ? 'bg-green-600 border-green-600 text-white'
                                : 'bg-cyan-900/40 border-cyan-800 text-cyan-300 hover:bg-cyan-800 hover:text-white'
                                }`}
                        >
                            {systemCopied ? <Icons.Check size={10} /> : <Icons.Copy size={10} />}
                            <span>{systemCopied ? 'Copiado' : 'Copiar'}</span>
                        </button>
                    </div>

                    {!collapsedSections['system'] && (
                        <div className="p-2 pt-0 animate-fade-in">
                            <textarea
                                value={compiler.system || ''}
                                onChange={(e) => updateField('system', e.target.value)}
                                rows={2}
                                className="w-full bg-cyan-950/20 border border-cyan-900/40 rounded-md p-2 text-xs text-cyan-100 placeholder-cyan-800/50 focus:outline-none focus:border-cyan-500 focus:bg-cyan-950/40 transition-colors resize-y"
                                placeholder={config.system.placeholder}
                            />
                        </div>
                    )}
                </div>

                <SectionInput
                    label={config.role.label}
                    field="role"
                    placeholder={config.role.placeholder}
                    colorClass="border-indigo-900/50 focus:border-indigo-500"
                />

                <SectionInput
                    label={config.subject.label}
                    field="subject"
                    placeholder={config.subject.placeholder}
                    rows={3}
                    colorClass="border-accent-900/50 focus:border-accent-500"
                />

                <SectionInput
                    label={config.context.label}
                    field="context"
                    placeholder={config.context.placeholder}
                    rows={3}
                    colorClass="border-green-900/50 focus:border-green-500"
                />

                <SectionInput
                    label={config.details.label}
                    field="details"
                    placeholder={config.details.placeholder}
                    rows={3}
                    colorClass="border-yellow-900/50 focus:border-yellow-500"
                />

                <SectionInput
                    label={config.negative.label}
                    field="negative"
                    placeholder={config.negative.placeholder}
                    colorClass="border-red-900/50 focus:border-red-500"
                />

                <SectionInput
                    label={config.params.label}
                    field="params"
                    placeholder={config.params.placeholder}
                    rows={1}
                    colorClass="border-arch-700"
                    extraAction={
                        currentArea === 'IMAGE' && (
                            <button
                                onClick={() => setIsParamsModalOpen(true)}
                                className="flex items-center space-x-1 text-[9px] text-accent-500 hover:text-accent-400 bg-arch-950 px-2 py-0.5 rounded border border-arch-800 hover:border-accent-500 transition-colors"
                            >
                                <Icons.Help size={10} />
                                <span>Ayuda / Glosario</span>
                            </button>
                        )
                    }
                />

                {/* COMMENTS SECTION (Collapsible) */}
                <div className={`mb-3 rounded-md border transition-all duration-200 ${collapsedSections['comments'] ? 'bg-blue-950/10 border-blue-900/20' : 'bg-blue-950/10 border-blue-900/30'}`}>
                    <div
                        className="flex items-center p-2 cursor-pointer hover:bg-blue-900/20 rounded-t-md"
                        onClick={() => toggleSection('comments')}
                    >
                        <div className={`mr-2 text-blue-400 transition-transform duration-200 ${collapsedSections['comments'] ? '' : 'rotate-90'}`}>
                            <Icons.ChevronRight size={12} />
                        </div>
                        <label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center cursor-pointer">
                            <Icons.Note size={12} className="mr-1" /> Comentarios (Interno)
                        </label>
                    </div>

                    {!collapsedSections['comments'] && (
                        <div className="p-2 pt-0 animate-fade-in">
                            <textarea
                                value={compiler.comments || ''}
                                onChange={(e) => updateField('comments', e.target.value)}
                                rows={2}
                                className="w-full bg-blue-950/20 border border-blue-900/30 rounded-md p-2 text-xs text-blue-200 placeholder-blue-800 focus:outline-none focus:border-blue-500 transition-colors resize-y"
                                placeholder="Notas de uso: Usar con ControlNet Depth, Attach image X..."
                            />
                        </div>
                    )}
                </div>

                {/* App Tags in Compiler View */}
                <div className="mb-2">
                    <label className="block text-[10px] font-bold text-arch-500 uppercase tracking-wider mb-1">
                        Apps Tagged for this session
                    </label>
                    <div className="flex flex-wrap gap-1">
                        {availableApps.map(app => (
                            <button
                                key={app}
                                onClick={() => {
                                    const current = compiler.apps || [];
                                    const updated = current.includes(app)
                                        ? current.filter(a => a !== app)
                                        : [...current, app];
                                    updateField('apps', updated);
                                }}
                                className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${(compiler.apps || []).includes(app)
                                    ? 'bg-arch-700 border-arch-500 text-white'
                                    : 'bg-transparent border-arch-800 text-arch-600 hover:border-arch-600'
                                    }`}
                            >
                                {app}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Live Preview */}
                <div className="mt-4 pt-4 border-t border-arch-800">
                    <label className="block text-[10px] font-bold text-arch-500 uppercase tracking-wider mb-2">Previsualización Final</label>
                    <div className="p-3 bg-black/40 rounded border border-arch-800 text-xs text-arch-300 font-mono break-words leading-relaxed">
                        {fullPrompt}
                    </div>
                </div>

            </div>

            <TechParamsModal isOpen={isParamsModalOpen} onClose={() => setIsParamsModalOpen(false)} />
        </div>
    );
};