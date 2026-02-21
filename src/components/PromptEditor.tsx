import React, { useState, useEffect } from 'react';
import { PromptItem, CategoryMap } from '../types';
import { Icons } from './Icon';
import { generateTranslationAndTags, improvePrompt } from '../services/geminiService';
import { PromptHistory } from './PromptHistory';

interface PromptEditorProps {
  prompt: PromptItem | null;
  categories: CategoryMap;
  availableApps: string[];
  onSave: (prompt: PromptItem) => void;
  onDelete: (id: string) => void;
  onDuplicate: (prompt: PromptItem) => void;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
  prompt, categories, availableApps, onSave, onDelete, onDuplicate
}) => {
  const [edited, setEdited] = useState<PromptItem | null>(null);
  const [copied, setCopied] = useState<'es' | 'en' | null>(null);
  const [isTranslating, setIsTranslating] = useState<'es' | 'en' | null>(null);
  const [isImproving, setIsImproving] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');

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

    setIsTranslating(source);

    try {
      const result = await generateTranslationAndTags(sourceText, source);

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
    } catch (error) {
      console.error("Translation failed", error);
      alert("Error al procesar con IA. Verifica tu API Key.");
    } finally {
      setIsTranslating(null);
    }
  };

  const handleImprove = async () => {
    if (!edited || !edited.contentEn) {
      alert("Necesitas contenido en inglés para mejorar.");
      return;
    }

    setIsImproving(true);
    try {
      const improved = await improvePrompt(edited.contentEn);
      setEdited(prev => prev ? ({ ...prev, contentEn: improved, lastModified: Date.now() }) : null);
    } catch (error) {
      console.error("Improvement failed", error);
    } finally {
      setIsImproving(false);
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-arch-500 mb-1 uppercase tracking-wider">Título</label>
              <input
                type="text"
                value={edited.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full bg-arch-950 border border-arch-700 rounded-md p-2.5 text-white focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none text-lg font-semibold"
              />
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
                {Object.keys(categories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
          <div className="flex items-center space-x-6 bg-arch-950/30 p-3 rounded-lg border border-arch-800/50">
            <div>
              <label className="block text-[10px] font-medium text-arch-500 mb-1 uppercase tracking-wider">Origen</label>
              <div className="flex items-center space-x-2 text-sm text-arch-300">
                {edited.origin === 'internet' ? <Icons.Globe size={14} className="text-indigo-400" /> : <Icons.User size={14} className="text-emerald-400" />}
                <span className="capitalize">{edited.origin || 'User'}</span>
              </div>
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
                  disabled={isTranslating === 'es' || !edited.contentEs}
                  className="flex items-center space-x-1 px-2 py-1 bg-arch-800 hover:bg-indigo-900 text-indigo-300 rounded text-[10px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
                  title="Traduce al inglés y genera etiquetas automáticamente"
                >
                  {isTranslating === 'es' ? <Icons.Refresh size={12} className="animate-spin" /> : <Icons.Languages size={12} />}
                  <span>Traducir + Tags</span>
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
                  disabled={isTranslating === 'en' || !edited.contentEn}
                  className="flex items-center space-x-1 px-2 py-1 bg-arch-800 hover:bg-indigo-900 text-indigo-300 rounded text-[10px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
                  title="Traduce al español y genera etiquetas automáticamente"
                >
                  {isTranslating === 'en' ? <Icons.Refresh size={12} className="animate-spin" /> : <Icons.Languages size={12} />}
                  <span>Traducir + Tags</span>
                </button>

                <button
                  onClick={handleImprove}
                  disabled={isImproving || !edited.contentEn}
                  className="flex items-center space-x-1 px-2 py-1 bg-arch-800 hover:bg-purple-900 text-purple-300 rounded text-[10px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
                  title="Mejora el prompt usando IA avanzada"
                >
                  {isImproving ? <Icons.Refresh size={12} className="animate-spin" /> : <Icons.Sparkles size={12} />}
                  <span>Mejorar Prompt</span>
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