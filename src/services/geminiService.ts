import { PromptItem, CompiledPrompt, LibrarySuggestion } from "../types";

// MOCK GEMINI SERVICE
// The original package @google/genai had version issues.
// This mock allows the build to pass. You must install the correct SDK version to use AI features.

export const enhancePrompt = async (input: string, _context: string = 'General'): Promise<{ es: string, en: string }> => {
    console.warn("AI Feature not available: enhancePrompt");
    return { es: input, en: input };
};

export const generateTranslationAndTags = async (text: string, _sourceLang: 'es' | 'en'): Promise<{ translation: string, tagsEs: string[], tagsEn: string[] }> => {
    console.warn("AI Feature not available: generateTranslationAndTags");
    return { translation: text, tagsEs: [], tagsEn: [] };
};

export const analyzeImage = async (_base64Image: string, _promptText: string): Promise<string> => {
    console.warn("AI Feature not available: analyzeImage");
    return "Image analysis unavailable without valid API client.";
};

export const suggestPrompts = async (_taskDescription: string): Promise<Array<{ title: string, prompt: string }>> => {
    console.warn("AI Feature not available: suggestPrompts");
    return [];
};

export const classifyPrompt = async (promptText: string, _availableCategories: string[]): Promise<string[]> => {
    console.warn("AI Feature not available: classifyPrompt");
    if (!promptText) return [];
    return [];
};

export const generateFullCompilation = async (_userInput: string, _librarySummary: Partial<PromptItem>[], _base64Image?: string): Promise<CompiledPrompt> => {
    console.warn("AI Feature not available: generateFullCompilation");
    throw new Error("AI Service unavailable");
};

export const analyzeCompilerAgainstLibrary = async (
    _compiler: CompiledPrompt,
    _library: PromptItem[],
    _availableCategories: string[]
): Promise<LibrarySuggestion[]> => {
    console.warn("AI Feature not available: analyzeCompilerAgainstLibrary");
    return [];
};