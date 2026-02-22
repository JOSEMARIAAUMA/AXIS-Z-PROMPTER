import { supabase } from '../supabaseClient';
import { PromptItem, CompiledPrompt, LibrarySuggestion } from "../types";

const withAbort = <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(new Error("AbortError"));

    return new Promise<T>((resolve, reject) => {
        const abortHandler = () => reject(new Error("AbortError"));
        signal.addEventListener('abort', abortHandler);
        promise.then(
            (val) => { signal.removeEventListener('abort', abortHandler); resolve(val); },
            (err) => { signal.removeEventListener('abort', abortHandler); reject(err); }
        );
    });
};

const invokeGemini = async (modelName: string, requestData: any, signal?: AbortSignal): Promise<any> => {
    const invokePromise = supabase.functions.invoke('gemini-proxy', {
        body: { modelName, requestData }
    });
    
    const { data, error } = await withAbort(invokePromise, signal);
    
    if (error) {
        throw new Error(error.message || "Error invoking gemini-proxy");
    }
    
    if (!data || !data.text) {
        throw new Error("Invalid response from gemini-proxy");
    }
    
    return data.text;
};

// MODELS CONFIGURATION
// Text & Multimodal (Vision -> Text)
const MODEL_FAST = 'gemini-2.0-flash';
const MODEL_REASONING = 'gemini-2.5-flash';

// Image Generation (Text -> Image) - Not used for analysis
// const MODEL_IMAGE_GEN = 'gemini-pro-vision'; // Example if needed later

export const enhancePrompt = async (input: string, context: string = 'General'): Promise<{ es: string, en: string }> => {
    const systemInstruction = `
    Act as a world-class architectural visualizer and prompt engineer (Midjourney/Stable Diffusion expert).
    Your goal is to convert colloquial descriptions into professional, structured prompts for photorealistic architectural renderings.
    Focus on:
    1. Andalusian/Mediterranean context (lighting, vegetation, materials).
    2. Photorealism (8k, high detail, correct textures).
    3. Preventing common AI errors (bad anatomy in people, flying objects).
    
    Return the result in JSON format with 'es' (Spanish) and 'en' (English) versions.
    The English version should use keywords optimized for image generators.
  `;

    try {
        const text = await invokeGemini(MODEL_FAST, {
            contents: [{ role: 'user', parts: [{ text: `System: ${systemInstruction}\nContext: ${context}. User Input: ${input}` }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
        
        return JSON.parse(text);

    } catch (error) {
        console.error("Gemini Enhance Error:", error);
        throw error;
    }
};

export const generateTranslationAndTags = async (text: string, sourceLang: 'es' | 'en', signal?: AbortSignal): Promise<{ translation: string, tagsEs: string[], tagsEn: string[] }> => {
    const targetLang = sourceLang === 'es' ? 'English' : 'Spanish';
    const sourceLangFull = sourceLang === 'es' ? 'Spanish' : 'English';

    const systemInstruction = `
        You are an expert bilingual text analyzer and taxonomy specialist.
        1. Translate the input text from ${sourceLangFull} to ${targetLang} accurately, maintaining its professional context and specific terminology (e.g. architecture, coding, marketing, sales, general).
        2. Extract 5 to 8 relevant single-word or short-phrase tags from the content that describe the core concepts, subjects, style, or intent.
        3. Provide these tags in BOTH Spanish and English.
        Return ONLY valid JSON in this exact structure:
        {
          "translation": "(the translated text)",
          "tagsEs": ["etiqueta1", "etiqueta2"],
          "tagsEn": ["tag1", "tag2"]
        }
    `;

    try {
        const jsonText = await invokeGemini(MODEL_FAST, {
            contents: [{ role: 'user', parts: [{ text: `System: ${systemInstruction}\nText to process: "${text}"` }] }],
            generationConfig: { responseMimeType: "application/json" }
        }, signal);

        // Clean markdown JSON blocks if present
        const cleanedText = jsonText.replace(/```json\n?|```/g, '').trim();
        return JSON.parse(cleanedText);

    } catch (error) {
        console.error("Gemini Translation Error", error);
        throw error;
    }
};

export const analyzeImage = async (base64Image: string, promptText: string): Promise<string> => {
    // Remove data URL prefix if present for the API call
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    try {
        return await invokeGemini(MODEL_FAST, [
            { inlineData: { mimeType: 'image/png', data: cleanBase64 } },
            { text: promptText || "Describe this image in detail for an architectural prompt. Focus on materials, lighting, vegetation, and style." }
        ]);
    } catch (error) {
        console.error("Gemini Image Analysis Error:", error);
        throw error;
    }
};

export const suggestPrompts = async (taskDescription: string): Promise<Array<{ title: string, prompt: string }>> => {
    const systemInstruction = `
        You are an assistant for an architectural studio in Andalusia.
        Suggest 3 distinct rendering prompts based on the user's task.
        Return JSON array of objects with 'title' and 'prompt'.
    `;

    try {
        const text = await invokeGemini(MODEL_FAST, {
            contents: [{ role: 'user', parts: [{ text: `System: ${systemInstruction}\nTask: ${taskDescription}` }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        if (!text) return [];
        return JSON.parse(text);

    } catch (error) {
        console.error("Gemini Suggestion Error", error);
        throw error;
    }
};

export const classifyPrompt = async (promptText: string, availableCategories: string[]): Promise<string[]> => {
    if (!promptText.trim()) return [];

    const systemInstruction = `
        You are an AI categorizer for architectural prompts.
        1. Analyze the input prompt text.
        2. Compare it against the provided list of Available Categories.
        3. Return ONLY the names of the categories that are strictly relevant to the content of the prompt as a JSON string array.
        4. Be precise. For example, only select 'Vegetation' if plants/trees are mentioned.
        
        Available Categories: ${JSON.stringify(availableCategories)}
    `;

    try {
        const text = await invokeGemini(MODEL_FAST, {
            contents: [{ role: 'user', parts: [{ text: `System: ${systemInstruction}\nPrompt to analyze: "${promptText}"` }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        if (!text) return [];

        const rawResult = JSON.parse(text) as string[];
        return rawResult.filter(cat => availableCategories.includes(cat));

    } catch (error) {
        console.error("Gemini Classification Error", error);
        return [];
    }
};

/**
 * Generates a FULL PromptCompiler object based on a colloquial description AND optional image.
 */
export const generateFullCompilation = async (userInput: string, librarySummary: Partial<PromptItem>[], base64Image?: string): Promise<CompiledPrompt> => {
    const libraryContext = librarySummary.map(p =>
        `Title: ${p.title} | Cat: ${p.category} | Tags: ${p.tags?.join(', ')}`
    ).join('\n');

    const systemInstruction = `
        You are an expert Architectural Prompt Orchestrator. 
        Your task is to take a user's natural language request (and potentially an image reference) and construct a COMPLETE, PROFESSIONAL Prompt Compilation.
        
        Rules:
        1. If an image is provided: Analyze it for materials, lighting, style, and composition. Use it as the PRIMARY source of truth for visual details unless the user explicitly overrides it.
        2. If no image: rely on user text and architectural best practices.
        3. Use the 'Library Context' to align with the user's existing style if relevant.
        4. Return structured JSON.
        5. 'apps' field should be a list of relevant software (Midjourney, V-Ray, etc).
        6. 'comments': Explain your choices in Spanish.
        
        Library Context:
        ${libraryContext.substring(0, 5000)}
    `;

    try {
        // Use Pro model when images are involved for better reasoning, otherwise Flash
        // Note: gemini-1.5-flash is multimodal too and often sufficient/faster
        let modelName = base64Image ? MODEL_REASONING : MODEL_FAST;

        let parts: any[] = [];
        if (base64Image) {
            const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
            parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64 } });
        }
        parts.push({ text: `System: ${systemInstruction}\nUser Request: "${userInput}". Create a full compilation based on this request.` });

        const text = await invokeGemini(modelName, {
            contents: [{ role: 'user', parts: parts }],
            generationConfig: { responseMimeType: "application/json" }
        });

        if (!text) throw new Error("No response from AI");
        return JSON.parse(text) as CompiledPrompt;

    } catch (error) {
        console.error("Gemini Auto-Compile Error:", error);
        throw error;
    }
};

/**
 * Analyzes the current compiled prompt against the library to find improvements or new snippets.
 */
export const analyzeCompilerAgainstLibrary = async (
    compiler: CompiledPrompt,
    library: PromptItem[],
    availableCategories: string[],
    signal?: AbortSignal
): Promise<LibrarySuggestion[]> => {

    // Simplify library to save tokens
    const libraryContext = library.map(p => ({
        id: p.id,
        title: p.title,
        category: p.category,
        contentExcerpt: p.contentEn.substring(0, 100)
    }));

    // CRITICAL: Include Negative Prompt in the analysis content
    const compilerContent = `
        Subject: ${compiler.subject}
        Context: ${compiler.context}
        Details: ${compiler.details}
        Negative Prompt (Restrictions): ${compiler.negative}
    `;

    const systemInstruction = `
        You are a Library Manager for an Architecture Prompt App.
        Your job is to analyze the 'Current Compiled Prompt' and compare it with the 'Existing Library'.
        
        Goal: Identify if parts of the current prompt are HIGH QUALITY and worth saving back to the library.
        
        Logic:
        1. NEW: If a specific part of the prompt (e.g., a specific description of 'Travertine Stone' or a specific 'Negative Prompt' sequence) is detailed and does NOT exist in the library, suggest creating a NEW snippet.
        2. UPDATE: If a part of the prompt looks like an enhanced version of an existing snippet (based on title/content match), suggest UPDATING that snippet.
        3. IGNORE: Generic or short descriptions.
        
        Special Attention:
        - If the 'Negative Prompt' section contains a robust list of exclusions not found in the 'Negative / Restrictions' category of the library, suggest saving it as a new 'Negative' snippet.
        
        Return a JSON array of suggestions.
        Target Categories must be one of: ${JSON.stringify(availableCategories)}.
    `;

    try {
        const text = await invokeGemini(MODEL_FAST, {
            contents: [{ role: 'user', parts: [{ text: `System: ${systemInstruction}\n\nCurrent Compiled Prompt: ${compilerContent}\n\nExisting Library Summary: ${JSON.stringify(libraryContext)}` }] }],
            generationConfig: { responseMimeType: "application/json" }
        }, signal);

        if (!text) return [];

        // Add unique IDs to suggestions locally
        const suggestions = JSON.parse(text);
        return suggestions.map((s: any, idx: number) => ({ ...s, id: `sugg-${Date.now()}-${idx}` }));

    } catch (error) {
        console.error("Library Analysis Error:", error);
        throw error;
    }
};

export const improvePrompt = async (promptText: string, signal?: AbortSignal): Promise<string> => {
    const systemInstruction = `
        You are an expert prompt engineer for architectural visualization.
        Your goal is to improve the given prompt to make it more effective for AI image generation (Midjourney/Stable Diffusion).
        - Enhance descriptive details (lighting, materials, atmosphere, camera angle).
        - Clarify the subject and composition.
        - Ensure professional architectural terminology.
        - Return ONLY the improved prompt text in English.
    `;

    try {
        console.log("improvePrompt executing with input:", promptText);
        let improvedText = await invokeGemini(MODEL_FAST, {
            contents: [{ role: 'user', parts: [{ text: `System: ${systemInstruction}\nPrompt to improve: "${promptText}"` }] }]
        }, signal);
        
        if (!improvedText) improvedText = promptText;
        // Clean markdown backticks if Gemini surrounds the response
        improvedText = improvedText.replace(/```/g, '').trim();
        console.log("improvePrompt success, output:", improvedText);
        return improvedText;
    } catch (error) {
        console.error("Prompt Improvement Error", error);
        throw error;
    }
};