import React, { useState, useEffect } from 'react';
import { PromptItem, CategoryMap, AreaInfo, AreaMapping } from '../types';
import { Icons } from './Icon';
import { generateTranslationAndTags, improvePrompt, analyzeImage } from '../services/geminiService';
import { PromptHistory } from './PromptHistory';
import { toast } from 'react-hot-toast';

interface PromptEditorProps {
  prompt: PromptItem | null;
  categories: CategoryMap;
  areas: AreaInfo[];
  areaMapping: AreaMapping;
  availableApps: string[];
  onSave: (prompt: PromptItem) => void;
  onDelete: (id: string) => void;
  onDuplicate: (prompt: PromptItem) => void;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
  prompt, categories, areas, areaMapping, availableApps, onSave, onDelete, onDuplicate
}) => {
  const [edited, setEdited] = useState<PromptItem | null>(null);
  const [copied, setCopied] = useState<'es' | 'en' | null>(null);
  const [isTranslating, setIsTranslating] = useState<'es' | 'en' | null>(null);
  const [isImproving, setIsImproving] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');

  // Vision-to-Prompt state
  const [visionPreview, setVisionPreview] = useState<string | null>(null);
  const [isAnalyzingVision, setIsAnalyzingVision] = useState(false);
  const visionInputRef = React.useRef<HTMLInputElement>(null);

  const translateAbortController = React.useRef<AbortController | null>(null);
  const improveAbortController = React.useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      translateAbortController.current?.abort();
      improveAbortController.current?.abort();
    };
  }, []);

  useEffect(() => {
    setEdited(prompt);
    setActiveTab('editor'); // Reset to editor when switching prompts
  }, [prompt]);

  if (!edited) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-arch-500 p-8 text-center bg-arch-900">
        <Icons.ArchStyle size={48} className="mb-4 opacity-20" />
        <p className="text-lg font-medium">Selecciona un prompt para editar</p>
        <p className="text-sm mt-2">O crea uno nuevo desde el panel izquierdo.</p>
        <p className="text-xs mt-4 text-arch-600">Tip: Usa el Asistente IA en el encabezado para generar ideas.</p>
      </div>
    );
  }

  const handleChange = (field: keyof PromptItem, value: any) => {
    setEdited(prev => prev ? ({ ...prev, [field]: value, lastModified: Date.now() }) : null);
  };

  const handleCopy = (text: string, lang: 'es' | 'en') => {
    navigator.clipboard.writeText(text);
    setCopied(lang);
    setTimeout(() => setCopied(null), 2000);
  };

  const saveChanges = () => {
    if (edited) onSave(edited);
  };

  const toggleApp = (app: string) => {
    if (!edited) return;
    const current = edited.apps || [];
    const updated = current.includes(app)
      ? current.filter(a => a !== app)
      : [...current, app];
    handleChange('apps', updated);
  };

  const handleSmartTranslate = async (source: 'es' | 'en') => {
    if (!edited) return;

    const sourceText = source === 'es' ? edited.contentEs : edited.contentEn;
    if (!sourceText.trim()) return;

    if (isTranslating === source) {
      // Si ya está traduciendo y se presiona (o el nuevo botón), cancelamos.
      translateAbortController.current?.abort();
      return;
    }

    setIsTranslating(source);
    translateAbortController.current = new AbortController();
    const toastId = toast.loading("Traduciendo y generando etiquetas...");

    try {
      const result = await generateTranslationAndTags(sourceText, source, translateAbortController.current.signal);

      setEdited(prev => {
        if (!prev) return null;
        return {
          ...prev,
          contentEs: source === 'en' ? result.translation : prev.contentEs,
          contentEn: source === 'es' ? result.translation : prev.contentEn,
          tags: result.tagsEs,
          tagsEn: result.tagsEn,
          lastModified: Date.now()
        };
      });
      toast.success("Traducción completada con éxito", { id: toastId });
    } catch (error: any) {
      if (error.message === 'AbortError') {
        toast.error("Traducción cancelada por el usuario", { id: toastId });
      } else {
        console.error("Translation failed", error);
        toast.error("Error al procesar con IA. Verifica tu API Key o conexión.", { id: toastId });
      }
    } finally {
      setIsTranslating(null);
      translateAbortController.current = null;
    }
  };

  const handleImprove = async () => {
    if (!edited || !edited.contentEn) {
      toast.error("Necesitas contenido en inglés para mejorar.");
      return;
    }

    if (isImproving) {
      improveAbortController.current?.abort();
      return;
    }

    setIsImproving(true);
    improveAbortController.current = new AbortController();
    const toastId = toast.loading("Mejorando prompt con IA...");

    try {
      const improved = await improvePrompt(edited.contentEn, improveAbortController.current.signal);
      setEdited(prev => prev ? ({ ...prev, contentEn: improved, lastModified: Date.now() }) : null);
      toast.success("Prompt mejorado", { id: toastId });
    } catch (error: any) {
      if (error.message === 'AbortError') {
        toast.error("Mejora cancelada por el usuario", { id: toastId });
      } else {
        console.error("Improvement failed", error);
        toast.error("Error al mejorar el prompt", { id: toastId });
      }
    } finally {
      setIsImproving(false);
      improveAbortController.current = null;
    }
  };

  const handleRestoreVersion = (content: string) => {
    // Is content JSON?
    try {
      const data = JSON.parse(content);
      setEdited(prev => {
        if (!prev) return null;
        return {
          ...prev,
          contentEs: data.es || prev.contentEs,
          contentEn: data.en || prev.contentEn,
          tags: data.tags || prev.tags,
          tagsEn: data.tags_en || prev.tagsEn,
          lastModified: Date.now()
        };
      });
      setActiveTab('editor');
    } catch (e) {
      // Legacy or plain text fallback (assume ES)
      setEdited(prev => prev ? ({ ...prev, contentEs: content, lastModified: Date.now() }) : null);
      setActiveTab('editor');
    }
  };

  // ── VISION-TO-PROMPT ─────────────────────────────────────────────────────────
  const handleVisionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setVisionPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    // Reset so same file can be picked again
    e.target.value = '';
  };

  const handleVisionAnalyze = async () => {
    if (!edited || !visionPreview) return;
    setIsAnalyzingVision(true);
    const toastId = toast.loading('Analizando imagen con IA...');
    try {
      const result = await analyzeImage(
        visionPreview,
        'Describe in detail: materials, lighting, atmosphere, camera angle, vegetation, and any unique stylistic features for an architectural AI prompt.'
      );
      // Append description to the English prompt
      setEdited(prev => prev ? ({
        ...prev,
        contentEn: prev.contentEn ? `${prev.contentEn}\n\n[Vision Analysis]\n${result}` : result,
        lastModified: Date.now()
      }) : null);
      toast.success('Análisis de imagen completado', { id: toastId });
    } catch (err: any) {
      console.error('Vision analysis failed', err);
      toast.error('Error al analizar la imagen: ' + (err.message || 'desconocido'), { id: toastId });
    } finally {
      setIsAnalyzingVision(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-arch-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-arch-800 bg-arch-950">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'editor' ? 'bg-arch-800 text-white' : 'text-arch-500 hover:text-arch-300'}`}
          >
            Editor
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'history' ? 'bg-arch-800 text-white' : 'text-arch-500 hover:text-arch-300'}`}
          >
            <Icons.Clock size={12} />
            <span>Historial</span>
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onDuplicate(edited)}
            className="p-2 text-arch-400 hover:text-white hover:bg-arch-800 rounded-md transition-colors"
            title="Duplicar"
          >
            <Icons.Copy size={18} />
          </button>
          <button
            onClick={() => onDelete(edited.id)}
            className="p-2 text-arch-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
            title="Eliminar"
          >
            <Icons.Trash size={18} />
          </button>
          <button
            onClick={saveChanges}
            className="flex items-center space-x-2 px-4 py-2 bg-accent-600 hover:bg-accent-500 text-white rounded-md font-medium text-sm transition-colors"
          >
            <Icons.Save size={16} />
            <span>Guardar</span>
          </button>
        </div>
      </div>

      {activeTab === 'history' ? (
        <div className="flex-1 overflow-y-auto bg-arch-900">
          <PromptHistory promptId={edited.id} onRestore={handleRestoreVersion} />
        </div>
      ) : (
        /* Content Form */
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Title & Category & Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-arch-500 mb-1 uppercase tracking-wider">Título</label>
              <input
                type="text"
                value={edited.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full bg-arch-950 border border-arch-700 rounded-md p-2.5 text-white focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none text-lg font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-arch-500 mb-1 uppercase tracking-wider">Área</label>
              <select
                value={edited.area || 'GLOBAL'}
                onChange={(e) => {
                  const newArea = e.target.value;
                  const nextCats = (newArea && newArea !== 'GLOBAL')
                    ? Object.keys(categories).filter(cat => areaMapping[cat]?.includes(newArea))
                    : Object.keys(categories);

                  let newCat = edited.category;
                  let newSub = edited.subcategory || '';

                  if (!nextCats.includes(newCat) && nextCats.length > 0) {
                    newCat = nextCats[0];
                    newSub = categories[newCat]?.[0] || '';
                  } else if (nextCats.includes(newCat) && (!categories[newCat] || !categories[newCat].includes(newSub))) {
                    newSub = categories[newCat]?.[0] || '';
                  }

                  setEdited(prev => prev ? {
                    ...prev,
                    area: newArea,
                    category: newCat,
                    subcategory: newSub,
                    lastModified: Date.now()
                  } : null);
                }}
                className="w-full bg-arch-950 border border-arch-700 rounded-md p-2 text-arch-200 outline-none focus:border-accent-500"
              >
                <option value="GLOBAL">Global (Todas)</option>
                {areas.map(area => <option key={area.id} value={area.id}>{area.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-arch-500 mb-1 uppercase tracking-wider">Categoría</label>
              <select
                value={edited.category}
                onChange={(e) => {
                  const newCat = e.target.value;
                  handleChange('category', newCat);
                  if (categories[newCat] && !categories[newCat].includes(edited.subcategory || '')) {
                    handleChange('subcategory', categories[newCat][0] || '');
                  }
                }}
                className="w-full bg-arch-950 border border-arch-700 rounded-md p-2 text-arch-200 outline-none focus:border-accent-500"
              >
                {((edited.area && edited.area !== 'GLOBAL')
                  ? Object.keys(categories).filter(cat => areaMapping[cat]?.includes(edited.area as string))
                  : Object.keys(categories)).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-arch-500 mb-1 uppercase tracking-wider">Subcategoría</label>
              <select
                value={edited.subcategory || ''}
                onChange={(e) => handleChange('subcategory', e.target.value)}
                className="w-full bg-arch-950 border border-arch-700 rounded-md p-2 text-arch-200 outline-none focus:border-accent-500"
              >
                {categories[edited.category]?.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                )) || <option value="">General</option>}
              </select>
            </div>
          </div>

          {/* Origin & Rating */}
          <div className="flex items-start space-x-6 bg-arch-950/30 p-3 rounded-lg border border-arch-800/50">
            {/* Origen: tipo de fuente (WEB o USER) — se puede cambiar con click */}
            <div>
              <label className="block text-[10px] font-medium text-arch-500 mb-1 uppercase tracking-wider">Origen</label>
              <button
                onClick={() => {
                  const nextOrigin = edited.origin === 'user' ? 'internet' : 'user';
                  handleChange('origin', nextOrigin);
                }}
                className={`flex items-center space-x-1.5 px-2 py-1 rounded border transition-colors ${edited.origin === 'internet'
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
              >
                {edited.origin === 'internet' ? <Icons.Globe size={12} /> : <Icons.User size={12} />}
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {edited.origin === 'internet' ? 'Web' : 'User'}
                </span>
              </button>
            </div>

            {/* Autoría: quién lo creó y quién lo editó — independiente del tipo de origen */}
            <div className="flex flex-col space-y-1 min-w-0">
              <label className="block text-[10px] font-medium text-arch-500 uppercase tracking-wider">Autoría</label>
              {edited.creatorName ? (
                <div className="flex flex-col space-y-0.5">
                  <div className="flex items-center space-x-1">
                    <Icons.User size={9} className="text-arch-500 shrink-0" />
                    <span className="text-[9px] text-arch-400 uppercase tracking-tight">Creado:</span>
                    <span className="text-[10px] font-semibold text-arch-200 truncate">{edited.creatorName}</span>
                  </div>
                  {edited.editorName && edited.editorName !== edited.creatorName && (
                    <div className="flex items-center space-x-1">
                      <Icons.Edit size={9} className="text-accent-500 shrink-0" />
                      <span className="text-[9px] text-arch-400 uppercase tracking-tight">Editado:</span>
                      <span className="text-[10px] font-semibold text-accent-400 truncate">{edited.editorName}</span>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-[9px] text-arch-600 italic">Sin registro</span>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-medium text-arch-500 mb-1 uppercase tracking-wider">Valoración</label>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleChange('rating', star)}
                    className="focus:outline-none transform hover:scale-110 transition-transform"
                  >
                    <Icons.Star
                      size={16}
                      className={star <= (edited.rating || 0) ? "text-yellow-500 fill-current" : "text-arch-700 hover:text-yellow-500/50"}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* APP TAGGING */}
          <div>
            <label className="block text-xs font-medium text-arch-500 mb-1 uppercase tracking-wider">Software Compatible</label>
            <div className="flex flex-wrap gap-2">
              {availableApps.map(app => (
                <button
                  key={app}
                  onClick={() => toggleApp(app)}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${(edited.apps || []).includes(app)
                    ? 'bg-blue-900 border-blue-500 text-white'
                    : 'bg-arch-950 border-arch-700 text-arch-500 hover:border-arch-500'
                    }`}
                >
                  {app}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Spanish */}
          <div className="bg-arch-950/50 p-4 rounded-lg border border-arch-800">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2">
                  <span className="w-6 h-4 rounded bg-red-800 block opacity-80"></span>
                  <span className="text-sm font-medium text-arch-300">Descripción en Español</span>
                </label>
                <button
                  onClick={() => handleSmartTranslate('es')}
                  disabled={isTranslating !== null && isTranslating !== 'es' || (!edited.contentEs && isTranslating !== 'es')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50 ${isTranslating === 'es' ? 'bg-red-900/50 text-red-400 hover:bg-red-800/80 hover:text-white' : 'bg-arch-800 hover:bg-indigo-900 text-indigo-300'}`}
                  title={isTranslating === 'es' ? "Cancelar traducción" : "Traduce al inglés y genera etiquetas automáticamente"}
                >
                  {isTranslating === 'es' ? <Icons.X size={12} className="text-red-400" /> : <Icons.Languages size={12} />}
                  <span>{isTranslating === 'es' ? 'Cancelar' : 'Traducir + Tags'}</span>
                </button>
              </div>

              <button
                onClick={() => handleCopy(edited.contentEs, 'es')}
                className="text-xs flex items-center space-x-1 text-accent-500 hover:text-accent-400"
              >
                {copied === 'es' ? <span>¡Copiado!</span> : <><Icons.Copy size={12} /> <span>Copiar</span></>}
              </button>
            </div>
            <textarea
              value={edited.contentEs}
              onChange={(e) => handleChange('contentEs', e.target.value)}
              rows={4}
              className="w-full bg-transparent border-0 text-arch-100 placeholder-arch-600 focus:ring-0 resize-none leading-relaxed"
              placeholder="Describe la escena con detalle..."
            />
          </div>

          {/* Prompt English */}
          <div className="bg-arch-950/50 p-4 rounded-lg border border-arch-800">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2">
                  <span className="w-6 h-4 rounded bg-blue-900 block opacity-80"></span>
                  <span className="text-sm font-medium text-arch-300">Prompt en Inglés (Output)</span>
                </label>
                <button
                  onClick={() => handleSmartTranslate('en')}
                  disabled={isTranslating !== null && isTranslating !== 'en' || (!edited.contentEn && isTranslating !== 'en')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50 ${isTranslating === 'en' ? 'bg-red-900/50 text-red-400 hover:bg-red-800/80 hover:text-white' : 'bg-arch-800 hover:bg-indigo-900 text-indigo-300'}`}
                  title={isTranslating === 'en' ? "Cancelar traducción" : "Traduce al español y genera etiquetas automáticamente"}
                >
                  {isTranslating === 'en' ? <Icons.X size={12} className="text-red-400" /> : <Icons.Languages size={12} />}
                  <span>{isTranslating === 'en' ? 'Cancelar' : 'Traducir + Tags'}</span>
                </button>

                <button
                  onClick={handleImprove}
                  disabled={isTranslating !== null || (!edited.contentEn && !isImproving)}
                  className={`flex items-center space-x-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50 ${isImproving ? 'bg-red-900/50 text-red-400 hover:bg-red-800/80 hover:text-white' : 'bg-arch-800 hover:bg-purple-900 text-purple-300'}`}
                  title={isImproving ? "Cancelar mejora" : "Mejora el prompt usando IA avanzada"}
                >
                  {isImproving ? <Icons.X size={12} className="text-red-400" /> : <Icons.Sparkles size={12} />}
                  <span>{isImproving ? 'Cancelar M.' : 'Mejorar Prompt'}</span>
                </button>
              </div>

              <button
                onClick={() => handleCopy(edited.contentEn, 'en')}
                className="text-xs flex items-center space-x-1 text-accent-500 hover:text-accent-400"
              >
                {copied === 'en' ? <span>¡Copiado!</span> : <><Icons.Copy size={12} /> <span>Copiar</span></>}
              </button>
            </div>
            <textarea
              value={edited.contentEn}
              onChange={(e) => handleChange('contentEn', e.target.value)}
              rows={6}
              className="w-full bg-transparent border-0 text-arch-100 font-mono text-sm placeholder-arch-600 focus:ring-0 resize-none leading-relaxed"
              placeholder="Technical prompt for AI..."
            />
          </div>

          {/* ── VISION-TO-PROMPT SECTION ─────────────────────────────── */}
          <div className="bg-arch-950/50 p-4 rounded-lg border border-purple-900/40">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Icons.Image size={14} className="text-purple-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Vision-to-Prompt</span>
                <span className="text-[10px] text-arch-500">· Analiza una imagen y genera contexto</span>
              </div>
              {visionPreview && (
                <button
                  onClick={() => setVisionPreview(null)}
                  className="text-[10px] text-arch-500 hover:text-red-400 transition-colors"
                  title="Quitar imagen"
                >
                  <Icons.X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-start gap-3">
              {/* Thumbnail preview */}
              {visionPreview ? (
                <img
                  src={visionPreview}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded-md border border-purple-800/60 shrink-0"
                />
              ) : (
                <button
                  onClick={() => visionInputRef.current?.click()}
                  className="w-20 h-20 flex flex-col items-center justify-center gap-1 border border-dashed border-purple-800/60 rounded-md text-purple-600 hover:border-purple-500 hover:text-purple-400 transition-colors shrink-0"
                >
                  <Icons.Plus size={20} />
                  <span className="text-[9px] uppercase">Imagen</span>
                </button>
              )}

              <div className="flex flex-col gap-2 flex-1">
                <input
                  ref={visionInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleVisionFileChange}
                />
                {visionPreview ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => visionInputRef.current?.click()}
                      className="text-[10px] text-arch-500 hover:text-arch-300 text-left transition-colors"
                    >
                      ↩ Cambiar imagen
                    </button>
                    <button
                      onClick={handleVisionAnalyze}
                      disabled={isAnalyzingVision}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-60 ${isAnalyzingVision
                          ? 'bg-purple-900/60 text-purple-300 animate-pulse'
                          : 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg shadow-purple-900/30'
                        }`}
                    >
                      <Icons.Brain size={12} />
                      <span>{isAnalyzingVision ? 'Analizando...' : 'Analizar con IA'}</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-arch-600 leading-relaxed">
                    Sube una imagen de referencia y la IA generará automáticamente una descripción detallada del estilo, materiales, luz y composición para enriquecer tu prompt en inglés.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tags Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-arch-500 mb-2 uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center">Etiquetas <span className="text-[10px] ml-1 opacity-50">(Español)</span></div>
              </label>
              <input
                type="text"
                value={edited.tags.join(', ')}
                onChange={(e) => handleChange('tags', e.target.value.split(',').map(t => t.trim()))}
                className="w-full bg-arch-950 border border-arch-700 rounded-md p-2 text-arch-300 text-sm focus:border-accent-500 outline-none placeholder-arch-700"
                placeholder="lujo, exterior, día..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-arch-500 mb-2 uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center">Tags <span className="text-[10px] ml-1 opacity-50">(English)</span></div>
              </label>
              <input
                type="text"
                value={edited.tagsEn ? edited.tagsEn.join(', ') : ''}
                onChange={(e) => handleChange('tagsEn', e.target.value.split(',').map(t => t.trim()))}
                className="w-full bg-arch-950 border border-arch-700 rounded-md p-2 text-arch-300 text-sm focus:border-accent-500 outline-none placeholder-arch-700"
                placeholder="luxury, outdoor, day..."
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
};