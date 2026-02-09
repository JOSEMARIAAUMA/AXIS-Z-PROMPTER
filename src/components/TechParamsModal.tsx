import React, { useState } from 'react';
import { Icons } from './Icon';

interface TechParamsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ParamCategory = 'GEMINI' | 'GENERAL_AI' | 'MIDJOURNEY' | 'STABLE_DIFFUSION';

interface TechParam {
  code: string;
  name: string;
  description: string;
  example: string;
  category: ParamCategory;
}

const PARAMS_DATA: TechParam[] = [
  // --- GEMINI / NANO BANANA ---
  {
    code: 'aspectRatio: "16:9"',
    name: 'Aspect Ratio (Nativo)',
    description: 'Proporción de imagen soportada nativamente por Gemini. Opciones: "16:9" (Panorámico), "4:3", "1:1" (Cuadrado).',
    example: 'aspectRatio: "16:9"',
    category: 'GEMINI'
  },
  {
    code: 'safetySettings: BLOCK_NONE',
    name: 'Safety Filters (Bloqueo)',
    description: 'Para arquitectura es vital desactivar o reducir los filtros de seguridad para evitar que la IA bloquee texturas complejas o personas por error.',
    example: 'BLOCK_NONE',
    category: 'GEMINI'
  },
  {
    code: 'imageSize: "2048x2048"',
    name: 'Image Size (Resolución)',
    description: 'Para Nano Banana Pro, fuerza la resolución máxima disponible si el entorno lo permite.',
    example: 'imageSize: "2048x2048"',
    category: 'GEMINI'
  },
  {
    code: 'negativePrompt',
    name: 'Negative Prompt (Gemini)',
    description: 'A diferencia de MJ, en Gemini suele funcionar mejor pedirlo en lenguaje natural: "Do not include cars, avoid blur..."',
    example: 'Ensure no people are visible, avoid blurry textures.',
    category: 'GEMINI'
  },
  
  // --- GENERAL AI CONTROLS ---
  {
    code: 'Temperature: 0.2',
    name: 'Temperatura (Baja / Precisión)',
    description: 'Valores bajos (0.0 - 0.4). Útil para planos técnicos, fachadas ortogonales y respetar estrictamente el prompt. Menos creatividad.',
    example: 'Temperature: 0.1',
    category: 'GENERAL_AI'
  },
  {
    code: 'Temperature: 0.9',
    name: 'Temperatura (Alta / Creatividad)',
    description: 'Valores altos (0.7 - 1.2). Útil para brainstorming, conceptualización inicial y paisajismo orgánico. La IA "alucina" más detalles.',
    example: 'Temperature: 0.85',
    category: 'GENERAL_AI'
  },
  {
    code: 'Top K: 40',
    name: 'Top K (Selección de Tokens)',
    description: 'Limita la "piscina" de palabras posibles. Un K bajo hace que la IA sea muy conservadora y repetitiva. Un K alto da más vocabulario visual.',
    example: 'TopK: 40',
    category: 'GENERAL_AI'
  },
  {
    code: 'Top P: 0.95',
    name: 'Top P (Nucleus Sampling)',
    description: 'Corta las probabilidades más bajas. Bajarlo a 0.8 puede hacer la imagen más enfocada y coherente si sientes que hay demasiado "ruido".',
    example: 'TopP: 0.95',
    category: 'GENERAL_AI'
  },
  {
    code: 'Max Output Tokens: 2048',
    name: 'Longitud de Respuesta',
    description: 'Asegura que la IA no corte la generación a la mitad. Importante para descripciones muy largas o análisis detallados.',
    example: 'maxOutputTokens: 2048',
    category: 'GENERAL_AI'
  },

  // --- MIDJOURNEY ---
  {
    code: '--ar 16:9',
    name: 'Aspect Ratio (Proporción)',
    description: '16:9 cine, 9:16 móvil, 4:3 clásico, 1:1 cuadrado.',
    example: '--ar 16:9',
    category: 'MIDJOURNEY'
  },
  {
    code: '--v 6.0',
    name: 'Versión del Modelo',
    description: 'Fuerza versión 6.0 (Realismo actual).',
    example: '--v 6.0',
    category: 'MIDJOURNEY'
  },
  {
    code: '--stylize 250',
    name: 'Stylize (Estilización)',
    description: 'Libertad artística (0-1000). 50 es literal, 750 es muy artístico.',
    example: '--stylize 250',
    category: 'MIDJOURNEY'
  },
  {
    code: '--tile',
    name: 'Tile (Texturas)',
    description: 'Genera patrones repetibles (seamless) para materiales.',
    example: '--tile',
    category: 'MIDJOURNEY'
  },
  {
    code: '--no',
    name: 'Parámetro Negativo',
    description: 'Excluir elementos (Negative Prompt).',
    example: '--no people watermark',
    category: 'MIDJOURNEY'
  },

  // --- STABLE DIFFUSION ---
  {
    code: 'Steps: 30',
    name: 'Sampling Steps',
    description: 'Pasos de eliminación de ruido. 30-40 es estándar para calidad.',
    example: 'Steps: 40',
    category: 'STABLE_DIFFUSION'
  },
  {
    code: 'CFG Scale: 7',
    name: 'CFG Scale (Fidelidad)',
    description: 'Obediencia al prompt. 7 es equilibrado. >12 satura.',
    example: 'CFG Scale: 7',
    category: 'STABLE_DIFFUSION'
  },
  {
    code: 'Sampler: DPM++ 2M Karras',
    name: 'Sampler',
    description: 'Algoritmo recomendado para fotorrealismo rápido.',
    example: 'Sampler: DPM++ 2M Karras',
    category: 'STABLE_DIFFUSION'
  }
];

export const TechParamsModal: React.FC<TechParamsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<ParamCategory>('GEMINI');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const filteredParams = PARAMS_DATA.filter(p => p.category === activeTab);

  const TabButton = ({ id, label, icon: Icon }: { id: ParamCategory, label: string, icon: any }) => (
      <button 
        onClick={() => setActiveTab(id)}
        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center space-x-2 border-b-2 ${
            activeTab === id 
            ? 'bg-arch-800 text-white border-accent-500' 
            : 'bg-arch-900 text-arch-500 border-transparent hover:text-arch-300 hover:bg-arch-800/50'
        }`}
    >
        <Icon size={14} />
        <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-arch-900 border border-arch-700 w-full max-w-4xl rounded-xl shadow-2xl flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-arch-800 bg-arch-950 rounded-t-xl">
          <div className="flex items-center space-x-2 text-arch-200">
            <Icons.Settings size={20} className="text-accent-500" />
            <h2 className="font-bold text-lg">Guía de Parámetros Técnicos</h2>
          </div>
          <button onClick={onClose} className="text-arch-400 hover:text-white"><Icons.Close size={24} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-arch-800 bg-arch-900">
            <TabButton id="GEMINI" label="Gemini / Nano" icon={Icons.Sparkles} />
            <TabButton id="GENERAL_AI" label="Control General IA" icon={Icons.Settings} />
            <TabButton id="MIDJOURNEY" label="Midjourney v6" icon={Icons.Image} />
            <TabButton id="STABLE_DIFFUSION" label="Stable Diffusion" icon={Icons.Laptop} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-arch-900">
            
            {/* Context Header */}
            <div className="mb-6 p-4 bg-arch-950 border border-arch-800 rounded-lg flex items-start space-x-3">
                 <Icons.Info className="text-accent-500 shrink-0 mt-0.5" size={18} />
                 <div className="text-sm text-arch-300">
                     {activeTab === 'GEMINI' && "Parámetros específicos para modelos de la familia Gemini (Nano, Flash, Pro). Estos suelen ir en la configuración de la API o del entorno (AI Studio), no siempre en el texto del prompt."}
                     {activeTab === 'GENERAL_AI' && "Variables universales que condicionan cómo 'piensa' la IA. Úsalas para ajustar la creatividad vs. la precisión técnica en tus renders."}
                     {activeTab === 'MIDJOURNEY' && "Parámetros de sufijo (--flag) que se añaden AL FINAL del prompt de texto en Discord o la web alpha."}
                     {activeTab === 'STABLE_DIFFUSION' && "Configuraciones típicas de la interfaz (Automatic1111/ComfyUI). Anótalas junto a tu prompt para reproducibilidad."}
                 </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {filteredParams.map((param, index) => (
                    <div key={index} className="bg-arch-950/50 border border-arch-800 rounded-lg p-3 hover:border-arch-600 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-white flex items-center mb-1">
                                {param.name}
                            </h3>
                            <p className="text-xs text-arch-400 leading-relaxed">
                                {param.description}
                            </p>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 bg-black/20 p-1.5 rounded border border-arch-800/50 min-w-[200px] justify-between">
                             <code className="text-[10px] font-mono text-indigo-300 truncate max-w-[150px]" title={param.example}>
                                {param.example}
                            </code>
                            <button 
                                onClick={() => handleCopy(param.example)}
                                className={`p-1.5 rounded transition-colors ${
                                    copiedCode === param.example 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-arch-800 hover:bg-arch-700 text-arch-400 hover:text-white'
                                }`}
                                title="Copiar parámetro"
                            >
                                {copiedCode === param.example ? <Icons.Check size={14}/> : <Icons.Copy size={14}/>}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};