import { Category, PromptItem, AreaType } from './types';

export const INITIAL_PANEL_WIDTHS = {
  left: 25,
  center: 50,
  right: 25,
};

// Area Definitions (Defaults)
export const DEFAULT_AREAS: { id: string, label: string, iconName: string }[] = [
  { id: 'GLOBAL', label: 'Global / Todo', iconName: 'Globe' },
  { id: 'IMAGE', label: 'Imágenes / Renders', iconName: 'Image' },
  { id: 'TEXT', label: 'Textos / Copywriting', iconName: 'FileText' },
  { id: 'CODE', label: 'Código / Scripts', iconName: 'Code' }
];

export const AREAS = DEFAULT_AREAS; // For backward compatibility if needed temporarily

// DYNAMIC CONFIGURATION PER AREA
const APP_CONFIG_BASE = {
  IMAGE: {
    apps: [
      'Midjourney v6', 'Stable Diffusion XL', 'DALL-E 3', 'Krea AI',
      'Magnific AI', 'ControlNet', 'V-Ray', 'Corona Renderer'
    ],
    compiler: {
      system: { label: "System Instruction", placeholder: "Ej: Actúa como un fotógrafo de arquitectura experto..." },
      role: { label: "Rol / Estilo Visual", placeholder: "Estilo fotográfico, render 8k, photorealistic..." },
      subject: { label: "Sujeto / Arquitectura", placeholder: "Descripción del edificio, espacio o volumen..." },
      context: { label: "Contexto / Luz / Clima", placeholder: "Hora del día, iluminación, entorno, vegetación..." },
      details: { label: "Detalles / Materiales", placeholder: "Texturas específicas, mobiliario, personas..." },
      negative: { label: "Negativo / Exclusiones", placeholder: "Lo que NO quieres ver (blur, watermark...)" },
      params: { label: "Parámetros Técnicos", placeholder: "--ar 16:9 --v 6.0" }
    },
    defaultTemplate: {
      role: "Professional architectural photography, 8k resolution, highly detailed, photorealistic masterpiece, archdaily style",
      negative: "low quality, blur, watermark, text, bad anatomy, deformed, ugly, pixelated, cartoon, 3d render looking",
      params: "--ar 16:9 --v 6.0"
    }
  },
  TEXT: {
    apps: [
      'ChatGPT 4o', 'Claude 3.5 Sonnet', 'Gemini 1.5 Pro', 'NotebookLM',
      'Jasper', 'Copy.ai', 'DeepL'
    ],
    compiler: {
      system: { label: "System Persona", placeholder: "Ej: Actúa como un Copywriter Senior especializado en Real Estate..." },
      role: { label: "Formato / Tipo de Texto", placeholder: "Email de ventas, Memoria descriptiva, Post de Instagram..." },
      subject: { label: "Tema Principal / Objetivo", placeholder: "Venta de villa de lujo, descripción de materiales sostenibles..." },
      context: { label: "Audiencia / Tono de Voz", placeholder: "Cliente inversor, tono formal pero cercano, persuasivo..." },
      details: { label: "Puntos Clave / Estructura", placeholder: "Incluir m2, precio, destacar vistas al mar, usar bullet points..." },
      negative: { label: "Restricciones / A evitar", placeholder: "No usar jerga técnica compleja, evitar frases pasivas..." },
      params: { label: "Formato de Salida", placeholder: "Markdown, JSON, Tabla comparativa, Max 200 palabras" }
    },
    defaultTemplate: {
      role: "Professional Real Estate Description, Persuasive Copywriting",
      negative: "jargon, passive voice, repetitive words, negative sentiment",
      params: "Format: Markdown"
    }
  },
  CODE: {
    apps: [
      'GitHub Copilot', 'Claude 3.5 Sonnet', 'ChatGPT 4o', 'Cursor',
      'v0.dev', 'Gemini Code Assist', 'Python'
    ],
    compiler: {
      system: { label: "System / Tech Stack", placeholder: "Ej: Actúa como un Ingeniero de Software Senior en React y Python..." },
      role: { label: "Lenguaje / Framework", placeholder: "Python script, React Component, Blender Addon..." },
      subject: { label: "Funcionalidad / Tarea", placeholder: "Crear un script para automatizar layers en Blender..." },
      context: { label: "Entorno / Runtime", placeholder: "Blender 4.0 API, Node.js v18, Browser environment..." },
      details: { label: "Lógica / Requisitos", placeholder: "Usar programación funcional, manejar errores try-catch, comentar código..." },
      negative: { label: "Restricciones / Anti-patterns", placeholder: "No usar librerías depreciadas, evitar loops nidados..." },
      params: { label: "Formato de Entrega", placeholder: "Single file, Modular structure, Include Unit Tests" }
    },
    defaultTemplate: {
      role: "Production Ready Code, Clean Architecture, SOLID Principles",
      negative: "deprecated methods, memory leaks, magic numbers, spaghetti code",
      params: "Language: TypeScript"
    }
  }
};

export const AREA_CONFIG: Record<AreaType, any> = {
  GLOBAL: {
    apps: ['Midjourney', 'DALL-E', 'ChatGPT', 'Claude'],
    compiler: APP_CONFIG_BASE.IMAGE.compiler,
    defaultTemplate: APP_CONFIG_BASE.IMAGE.defaultTemplate
  },
  IMAGE: APP_CONFIG_BASE.IMAGE,
  TEXT: APP_CONFIG_BASE.TEXT,
  CODE: APP_CONFIG_BASE.CODE,
  MARKETING_PRODUCTIVIDAD: {
    apps: [
      'ChatGPT 4o', 'Claude 3.5 Sonnet', 'Gemini 1.5 Pro',
      'Perplexity', 'Copy.ai', 'Jasper', 'Canva AI'
    ],
    compiler: {
      system: { label: "System / Rol de Experto", placeholder: "Ej: Actúa como un Director de Marketing especializado en Real Estate..." },
      role: { label: "Tipo de Contenido", placeholder: "Email de ventas, Post de Instagram, Análisis de competencia..." },
      subject: { label: "Producto / Proyecto", placeholder: "Promoción de viviendas de lujo en Marbella, lanzamiento de nueva fase..." },
      context: { label: "Audiencia / Mercado", placeholder: "Inversores institucionales, compradores finales, agentes inmobiliarios..." },
      details: { label: "Detalles del Mensaje", placeholder: "USPs del proyecto, llamada a la acción, propuesta de valor..." },
      negative: { label: "Restricciones / A evitar", placeholder: "No usar promesas de rentabilidad, evitar lenguaje alarmista..." },
      params: { label: "Formato de Salida", placeholder: "Markdown, JSON, máximo 280 caracteres, tono formal" }
    },
    defaultTemplate: {
      role: "Professional Real Estate Marketing, Data-driven Strategy",
      negative: "misleading claims, aggressive tone, jargon, passive voice",
      params: "Format: Markdown, Language: Spanish"
    }
  }
};

export const DEFAULT_APPS = AREA_CONFIG.IMAGE.apps; // Fallback

// Hierarchical Mapping: Area -> Categories
export const AREA_CATEGORIES: Record<AreaType, Category[]> = {
  GLOBAL: [], // Shows everything
  IMAGE: [
    Category.CAMERA,
    Category.LIGHTING,
    Category.MATERIALS,
    Category.ARCH_STYLE,
    Category.VEGETATION,
    Category.PEOPLE,
    Category.DETAILS,
    Category.RENDER,
    Category.NEGATIVE
  ],
  TEXT: [
    Category.MARKETING,
    Category.DOCS,
    Category.DETAILS
  ],
  CODE: [
    Category.CODE_TOOL,
    Category.DETAILS
  ]
};

// Expanded and structured subcategories for better filtering (Title Case)
export const SUBCATEGORIES_MAP: Record<string, string[]> = {
  [Category.VEGETATION]: [
    'Árboles (Olivos y Pinos)',
    'Palmeras y Clima Tropical',
    'Arbustos y Setos',
    'Césped y Praderas',
    'Plantas Ornamentales y Flores',
    'Jardines Verticales y Trepadoras'
  ],
  [Category.PEOPLE]: [
    'Expresiones Faciales y Primer Plano',
    'Lifestyle y Ocio',
    'Caminando y en Movimiento',
    'Niños y Familias',
    'Siluetas y Distancia',
    'Entorno Business y Formal'
  ],
  [Category.MATERIALS]: [
    'Estuco y Cal para Fachadas',
    'Hormigón Visto',
    'Piedra Natural',
    'Madera (Deck y Pérgolas)',
    'Cerámica y Azulejo Andaluz',
    'Vidrio y Acero',
    'Agua (Piscinas y Fuentes)'
  ],
  [Category.LIGHTING]: [
    'Golden Hour (Atardecer y Amanecer)',
    'Luz Dura de Mediodía',
    'Hora Azul y Crepúsculo',
    'Cielo Nublado y Luz Difusa',
    'Iluminación Artificial y Nocturna',
    'Sombras Proyectadas'
  ],
  [Category.ARCH_STYLE]: [
    'Exteriores Residenciales',
    'Interiores (Salón y Cocina)',
    'Vistas Aéreas con Dron',
    'Patios Andaluces',
    'Porches y Terrazas'
  ],
  [Category.DETAILS]: [
    'Mobiliario Exterior',
    'Texturas Macro',
    'Coches de Lujo',
    'Decoración y Props',
    'Imperfecciones y Desgaste'
  ],
  [Category.CAMERA]: [
    'Ángulos y Perspectiva',
    'Lentes y Distancia Focal',
    'Profundidad de Campo (Bokeh)',
    'Tomas Aéreas y Dron'
  ],
  [Category.NEGATIVE]: [
    'General y Calidad',
    'Defectos Geométricos',
    'Elementos Indeseados',
    'Texto y Marcas de Agua'
  ],
  [Category.RENDER]: [
    'Ajustes de Motor (V-Ray y Corona)',
    'Post-Producción y Look Final',
    'Image-to-Image y Refinamiento',
    'Upscaling y Micro Detalles'
  ],
  [Category.MARKETING]: [
    'Posts para Instagram y LinkedIn',
    'Anuncios y Copywriting Persuasivo',
    'Artículos de Blog y SEO',
    'Newsletters y Campañas de Email'
  ],
  [Category.DOCS]: [
    'Memorias de Proyecto',
    'Fichas Técnicas de Venta',
    'Descripción de Viviendas',
    'Informes y Reportes'
  ],
  [Category.CODE_TOOL]: [
    'Scripts para Blender y 3D',
    'Automatización de Archivos',
    'Hooks y Componentes de React',
    'Integraciones con IA y API'
  ]
};

export const CATEGORIES_LIST = Object.values(Category);

// Professional Seed Data - Full Collection
export const SEED_PROMPTS: PromptItem[] = [
  // =================================================================================================
  // CATEGORY: CAMERA / POV (EXPANDED)
  // =================================================================================================
  {
    id: 'cam-1',
    title: 'Vista a Nivel de Ojos (Eye-Level)',
    category: Category.CAMERA,
    subcategory: 'Ángulos y Perspectiva',
    contentEs: 'Fotografía arquitectónica a la altura de los ojos humanos (1.70m). Perspectiva de 1 punto frontal, líneas verticales perfectamente rectas (shift lens). Composición simétrica y equilibrada.',
    contentEn: 'Eye-level architectural photography shot at 1.70m height. Frontal 1-point perspective, perfectly straight vertical lines (shift lens correction). Symmetrical and balanced composition.',
    tags: ['perspectiva', 'frontal', 'simetria', 'humano'],
    tagsEn: ['perspective', 'frontal', 'symmetry', 'eye-level'],
    images: ['https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=800&auto=format&fit=crop'],
    apps: ['Midjourney v6', 'Stable Diffusion XL'],
    area: 'IMAGE',
    isFavorite: true,
    lastModified: Date.now(),
  },
  {
    id: 'cam-9',
    title: 'Vista Semi-Aérea (Elevated Context)',
    category: Category.CAMERA,
    subcategory: 'Aéreas y Dron',
    contentEs: 'Cámara elevada estratégicamente (3 a 5 metros de altura), ligeramente por debajo de la línea de cubierta del edificio. Muestra la fachada en conexión con el jardín y la piscina, sin ser un plano cenital. Ideal para mostrar la parcela manteniendo la escala.',
    contentEn: 'Strategically elevated camera view (3 to 5 meters high), positioned slightly below the building roofline. Showcases the connection between facade, garden, and pool without being a top-down shot. Ideal for plot context while maintaining scale.',
    tags: ['semi-aerea', 'elevada', 'contexto', '3-metros'],
    tagsEn: ['semi-aerial', 'elevated', 'context', 'mid-height'],
    images: ['https://images.unsplash.com/photo-1613977257363-707ba9348227?q=80&w=800&auto=format&fit=crop'],
    apps: ['Midjourney v6'],
    area: 'IMAGE',
    isFavorite: true,
    lastModified: Date.now(),
  },
  {
    id: 'cam-10',
    title: 'Perspectiva 2 Puntos (Shift Lens)',
    category: Category.CAMERA,
    subcategory: 'Ángulos y Perspectiva',
    contentEs: 'Perspectiva arquitectónica rigurosa de 2 puntos desde una esquina. Uso de lente descentrable (Tilt-Shift) para asegurar que todas las líneas verticales sean perfectamente paralelas y perpendiculares al suelo. Look profesional de revista.',
    contentEn: 'Rigorous 2-point architectural perspective from a corner angle. Use of Tilt-Shift lens to ensure all vertical lines are perfectly parallel and perpendicular to the ground. Professional architectural magazine look.',
    tags: ['2-puntos', 'esquina', 'verticales', 'tilt-shift'],
    tagsEn: ['2-point', 'corner', 'verticals', 'tilt-shift'],
    images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800&auto=format&fit=crop'],
    apps: ['Midjourney v6', 'V-Ray'],
    area: 'IMAGE',
    isFavorite: false,
    lastModified: Date.now(),
  },
  {
    id: 'mat-1',
    title: 'Estuco Blanco Andaluz (Enfoscado)',
    category: Category.MATERIALS,
    subcategory: 'Estuco / Cal (Fachadas)',
    contentEs: 'Textura detallada de fachada de estuco a la cal blanco puro, acabado mate con ligeras imperfecciones manuales y rugosidad sutil. Iluminación rasante para resaltar el grano fino. Sin moho, aspecto limpio pero realista recién pintado.',
    contentEn: 'Close-up architectural texture of pristine white lime stucco facade, matte finish with subtle hand-troweled imperfections and fine grain roughness. Raking light to accentuate surface texture, pure white color, clean but realistic look, 8k resolution, pbr material reference.',
    tags: ['blanco', 'estuco', 'fachada', 'textura', 'cal'],
    tagsEn: ['white', 'stucco', 'facade', 'texture', 'lime'],
    images: ['https://images.unsplash.com/photo-1594380666014-998845c8515c?q=80&w=800&auto=format&fit=crop'],
    apps: ['Stable Diffusion XL', 'Magnific AI'],
    area: 'IMAGE',
    isFavorite: true,
    lastModified: Date.now(),
  },
  {
    id: 'veg-1',
    title: 'Olivo Centenario Escultórico',
    category: Category.VEGETATION,
    subcategory: 'Árboles (Olivo/Pino)',
    contentEs: 'Olivo centenario solitario como punto focal. Tronco muy grueso, retorcido y escultural con corteza gris texturizada. Hojas verde plateado. Iluminación suave.',
    contentEn: 'Single ancient olive tree as architectural focal point. Thick, twisted, sculptural trunk with highly textured grey bark. Silvery-green foliage, realistic leaves. Soft lighting, depth of field blurring background.',
    tags: ['olivo', 'árbol', 'jardín', 'escultura'],
    tagsEn: ['olive-tree', 'tree', 'garden', 'sculpture'],
    images: ['https://images.unsplash.com/photo-1445264618000-d1e67015402f?q=80&w=800&auto=format&fit=crop'],
    apps: ['Midjourney v6', 'Krea AI'],
    area: 'IMAGE',
    isFavorite: true,
    lastModified: Date.now(),
  },

  // =================================================================================================
  // CATEGORY: NEGATIVE (RESTORED & PERSISTENT)
  // =================================================================================================
  {
    id: 'neg-1',
    title: 'Negativo Universal (Calidad/Limpieza)',
    category: Category.NEGATIVE,
    subcategory: 'General / Calidad',
    contentEs: 'Elimina baja calidad, marcas de agua, desenfoque involuntario y elementos "cartoon" o 3D falsos. Esencial para fotorrealismo.',
    contentEn: 'low quality, worst quality, sketch, cartoon, drawing, anime, 3d render looking, plastic, watermark, text, signature, logo, blur, depth of field, out of focus, jpeg artifacts, pixelated, noise, grain, bad anatomy, deformed.',
    tags: ['universal', 'limpieza', 'calidad', 'standard'],
    tagsEn: ['low-quality', 'watermark', 'blur', 'cartoon'],
    images: [],
    apps: ['Stable Diffusion XL', 'Gemini / Nano'],
    area: 'IMAGE',
    isFavorite: true,
    lastModified: Date.now(),
  },
  {
    id: 'neg-2',
    title: 'Anti-Defectos Arquitectónicos',
    category: Category.NEGATIVE,
    subcategory: 'Defectos Geométricos',
    contentEs: 'Previene líneas torcidas, geometrías imposibles, ventanas flotantes y estructuras sin sentido (Escher-like). Mantiene la integridad estructural.',
    contentEn: 'curved lines, crooked walls, tilted horizon, bad perspective, impossible geometry, floating structures, distorted windows, messy architecture, escher-like, asymmetrical, collapsing, broken lines.',
    tags: ['geometria', 'lineas-rectas', 'perspectiva', 'fallos'],
    tagsEn: ['geometry', 'crooked', 'perspective', 'distortion'],
    images: [],
    apps: ['Midjourney v6', 'ControlNet'],
    area: 'IMAGE',
    isFavorite: true,
    lastModified: Date.now(),
  },

  // =================================================================================================
  // CATEGORY: RENDER / EDITING (RESTORED & PERSISTENT)
  // =================================================================================================
  {
    id: 'ren-1',
    title: 'Look Fotográfico V-Ray / Corona',
    category: Category.RENDER,
    subcategory: 'Ajustes de Motor (V-Ray/Corona)',
    contentEs: 'Simula el acabado técnico de un render profesional de V-Ray. Iluminación global (GI) precisa, antialiasing perfecto y rango dinámico alto.',
    contentEn: 'V-Ray render style, Corona Renderer aesthetic, Global Illumination, Path Tracing, Brute Force GI, high dynamic range, 32-bit float, linear workflow, photorealistic rendering engine, physically based rendering, architectural visualization contest winner.',
    tags: ['v-ray', 'corona', 'motor', 'fotorealismo'],
    tagsEn: ['v-ray', 'corona', 'gi', 'rendering'],
    images: [],
    apps: ['Midjourney v6', 'Stable Diffusion XL'],
    area: 'IMAGE',
    isFavorite: false,
    lastModified: Date.now(),
  },
  {
    id: 'ren-2',
    title: 'Refinado y Upscaling (Img2Img)',
    category: Category.RENDER,
    subcategory: 'Upscaling / Detalles',
    contentEs: 'Prompt para procesos de Image-to-Image o Upscaling (Krea/Magnific). Enfocado en añadir micro-detalles sin alucinar nuevas estructuras.',
    contentEn: 'Enhance details, sharpen texture, increase resolution, micro-details, 8k upscale, denoising, crisp edges, preserve original structure, high frequency textures, add realism to materials.',
    tags: ['upscale', 'detalles', 'magnific', 'refinar'],
    tagsEn: ['upscale', 'sharpen', 'details', 'denoise'],
    images: [],
    apps: ['Krea AI', 'Magnific AI', 'Gemini / Nano'],
    area: 'IMAGE',
    isFavorite: true,
    lastModified: Date.now(),
  }
];