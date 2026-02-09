import React, { useState } from 'react';
import { Icons } from './Icon';
import { enhancePrompt, analyzeImage, suggestPrompts, generateFullCompilation } from '../services/geminiService';
import { PromptItem, CompiledPrompt } from '../types';

interface AIAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPrompt: (es: string, en: string) => void;
  onAutoCompile?: (data: CompiledPrompt) => void; // New callback
  initialImage?: string;
  libraryContext?: PromptItem[]; // New prop for context
}

type Mode = 'IMPROVE' | 'ANALYZE' | 'SUGGEST' | 'AUTO_COMPILE';

export const AIAgentModal: React.FC<AIAgentModalProps> = ({ isOpen, onClose, onApplyPrompt, onAutoCompile, initialImage, libraryContext = [] }) => {
  const [mode, setMode] = useState<Mode>(initialImage ? 'AUTO_COMPILE' : 'AUTO_COMPILE'); // Default to Auto Compile if image present too
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAction = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      if (mode === 'IMPROVE') {
        const data = await enhancePrompt(input);
        setResult(data);
      } else if (mode === 'SUGGEST') {
        const data = await suggestPrompts(input);
        setResult(data);
      } else if (mode === 'ANALYZE' && initialImage) {
        const text = await analyzeImage(initialImage, input);
        setResult(text);
      } else if (mode === 'AUTO_COMPILE') {
        // Pass a summary of the library to save token bandwidth
        const summary = libraryContext.map(p => ({ title: p.title, category: p.category, tags: p.tags }));
        // Pass initialImage if available
        const data = await generateFullCompilation(input, summary, initialImage);
        setResult(data);
      }
    } catch (err) {
      setError("Error al conectar con Gemini AI. Verifica tu API Key o conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-arch-900 border border-arch-700 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-arch-800 bg-arch-950 rounded-t-xl">
          <div className="flex items-center space-x-2 text-indigo-400">
            <Icons.Brain size={20} />
            <h2 className="font-bold text-lg">Agente Inteligente AXIS-Z</h2>
          </div>
          <button onClick={onClose} className="text-arch-400 hover:text-white"><Icons.Close size={24} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-arch-800 overflow-x-auto no-scrollbar">
           <button 
            onClick={() => setMode('AUTO_COMPILE')}
            className={`flex-1 min-w-[120px] py-3 text-sm font-bold uppercase tracking-wider transition-colors ${mode === 'AUTO_COMPILE' ? 'bg-arch-800 text-white border-b-2 border-indigo-500' : 'text-arch-400 hover:bg-arch-800/50'}`}
          >
            <div className="flex items-center justify-center space-x-1">
                <Icons.Sparkles size={14} />
                <span>Compilador Auto</span>
            </div>
          </button>
          <button 
            onClick={() => setMode('IMPROVE')}
            className={`flex-1 min-w-[100px] py-3 text-sm font-medium transition-colors ${mode === 'IMPROVE' ? 'bg-arch-800 text-white border-b-2 border-indigo-500' : 'text-arch-400 hover:bg-arch-800/50'}`}
          >
            Mejorar Texto
          </button>
          <button 
             onClick={() => setMode('SUGGEST')}
             className={`flex-1 min-w-[100px] py-3 text-sm font-medium transition-colors ${mode === 'SUGGEST' ? 'bg-arch-800 text-white border-b-2 border-indigo-500' : 'text-arch-400 hover:bg-arch-800/50'}`}
          >
            Sugerir Ideas
          </button>
          {initialImage && (
            <button 
                onClick={() => setMode('ANALYZE')}
                className={`flex-1 min-w-[100px] py-3 text-sm font-medium transition-colors ${mode === 'ANALYZE' ? 'bg-arch-800 text-white border-b-2 border-indigo-500' : 'text-arch-400 hover:bg-arch-800/50'}`}
            >
                Analizar Imagen
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {initialImage && (
             <div className="mb-4 flex justify-center bg-black/20 p-2 rounded border border-arch-800">
                 <img src={initialImage} alt="Analysis Target" className="max-h-32 rounded-md object-contain" />
                 {mode === 'AUTO_COMPILE' && (
                     <div className="ml-4 flex flex-col justify-center text-xs text-arch-400 max-w-[200px]">
                         <span className="text-indigo-400 font-bold mb-1 flex items-center"><Icons.Check size={12} className="mr-1"/> Imagen Vinculada</span>
                         La IA usará esta imagen para detectar materiales, luz y composición al compilar.
                     </div>
                 )}
             </div>
          )}

          <label className="block text-sm font-medium text-arch-300 mb-2">
            {mode === 'AUTO_COMPILE' ? 'Describe tu proyecto completo y la IA estructurará todo el prompt:' :
             mode === 'IMPROVE' ? 'Describe tu idea coloquialmente:' : 
             mode === 'SUGGEST' ? '¿Qué tipo de proyecto estás realizando?' :
             'Instrucciones adicionales para el análisis (opcional):'}
          </label>
          
          <div className="relative">
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-arch-950 border border-arch-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none h-24 resize-none"
                placeholder={mode === 'AUTO_COMPILE' ? "Ej: Quiero un render interior de un salón en Marbella, estilo minimalista con muebles italianos, luz de atardecer entrando por ventanales y vistas al mar. Usa V-Ray style." : 
                             mode === 'IMPROVE' ? "Ej: Una casa moderna blanca con piscina y olivos..." : "Ej: Villa de lujo en Sotogrande..."}
            />
            <button
                onClick={handleAction}
                disabled={loading || (mode !== 'ANALYZE' && !input.trim())}
                className="absolute right-2 bottom-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-arch-700 text-white rounded-md transition-colors shadow-lg"
            >
                {loading ? <Icons.Refresh className="animate-spin" size={20}/> : <Icons.ChevronRight size={20}/>}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-800 text-red-300 rounded-md text-sm">
                {error}
            </div>
          )}

          {/* Results Area */}
          {result && (
            <div className="mt-6 space-y-4 animate-fade-in">
                <div className="flex items-center space-x-2 text-green-400 mb-2">
                    <Icons.Magic size={16} />
                    <span className="text-sm font-bold uppercase tracking-wider">Resultado IA</span>
                </div>

                {mode === 'AUTO_COMPILE' && (
                    <div className="space-y-3">
                         <div className="bg-arch-950 p-4 rounded border border-arch-800 space-y-2">
                             <div className="text-xs text-indigo-400 font-bold uppercase mb-2">Previsualización de Estructura</div>
                             <div className="grid grid-cols-1 gap-2 text-xs">
                                 <div><span className="text-arch-500 font-bold">Role:</span> <span className="text-arch-300">{result.role.substring(0, 60)}...</span></div>
                                 <div><span className="text-arch-500 font-bold">Sujeto:</span> <span className="text-arch-300">{result.subject.substring(0, 60)}...</span></div>
                                 <div><span className="text-arch-500 font-bold">Contexto:</span> <span className="text-arch-300">{result.context.substring(0, 60)}...</span></div>
                                 <div><span className="text-arch-500 font-bold">Negativo:</span> <span className="text-red-300">{result.negative.substring(0, 40)}...</span></div>
                             </div>
                             {result.comments && (
                                 <div className="mt-2 p-2 bg-blue-900/20 border border-blue-900/40 rounded text-blue-200 text-xs italic">
                                     "{result.comments}"
                                 </div>
                             )}
                         </div>
                         <button 
                            onClick={() => { if (onAutoCompile) onAutoCompile(result); onClose(); }}
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-md font-bold text-sm shadow-lg shadow-indigo-500/20 flex items-center justify-center space-x-2"
                        >
                            <Icons.LayoutTemplate size={16} />
                            <span>Aplicar al Compilador</span>
                        </button>
                    </div>
                )}

                {mode === 'IMPROVE' && (
                    <div className="space-y-4">
                        <div className="bg-arch-950 p-3 rounded border border-arch-800">
                            <p className="text-xs text-arch-500 uppercase mb-1">Español</p>
                            <p className="text-sm text-arch-200">{result.es}</p>
                        </div>
                        <div className="bg-arch-950 p-3 rounded border border-arch-800">
                             <p className="text-xs text-arch-500 uppercase mb-1">Inglés (Prompt)</p>
                             <p className="text-sm font-mono text-indigo-200">{result.en}</p>
                        </div>
                        <button 
                            onClick={() => { onApplyPrompt(result.es, result.en); onClose(); }}
                            className="w-full py-2 bg-accent-600 hover:bg-accent-500 text-white rounded-md font-medium"
                        >
                            Usar este Prompt
                        </button>
                    </div>
                )}

                {mode === 'SUGGEST' && Array.isArray(result) && (
                    <div className="space-y-3">
                        {result.map((item: any, idx: number) => (
                             <div key={idx} className="bg-arch-950 p-3 rounded border border-arch-800 hover:border-indigo-500 transition-colors cursor-pointer"
                                  onClick={() => { onApplyPrompt(item.prompt, item.prompt); onClose(); }} // Simplifying for suggestion to just put text in
                             >
                                <h4 className="text-indigo-400 font-bold text-sm mb-1">{item.title}</h4>
                                <p className="text-xs text-arch-300 line-clamp-2">{item.prompt}</p>
                             </div>
                        ))}
                    </div>
                )}

                {mode === 'ANALYZE' && (
                    <div className="bg-arch-950 p-3 rounded border border-arch-800 h-40 overflow-y-auto">
                        <p className="text-sm text-arch-200 whitespace-pre-wrap">{result}</p>
                    </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};