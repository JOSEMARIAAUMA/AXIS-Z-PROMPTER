import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

console.log("Loading environment variables...");
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

console.log("Supabase URL:", SUPABASE_URL.substring(0, 10) + "...");
console.log("Supabase Key Length:", SUPABASE_KEY.length);
console.log("Gemini Key:", GEMINI_KEY.substring(0, 5) + "...");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface RawPrompt {
    category: string;
    content: string;
    index: number;
}

interface EnrichedPrompt extends RawPrompt {
    content_en: string;
    tags_es: string[];
    tags_en: string[];
    subcategory: string;
}

async function processBatch(prompts: RawPrompt[]): Promise<EnrichedPrompt[]> {
    const promptText = prompts.map((p, i) => `PROMPT ${i + 1} [${p.category}]: ${p.content}`).join('\n\n');

    const systemInstruction = `
    Analyze the following marketing and productivity prompts (in Spanish).
    For each prompt, return a JSON object with:
    - content_en: A professional English translation.
    - tags_es: 5-8 relevant tags in Spanish (lowercase).
    - tags_en: The same tags translated to English.
    - subcategory: A more specific subcategory based on the content (e.g., if category is "SEO", subcategory might be "Keywords", "On-page", "Technical").
    
    Return ONLY a JSON array of these objects in the same order.
    `;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
        const body = {
            contents: [{ parts: [{ text: `${systemInstruction}\n\nPrompts to analyze:\n${promptText}` }] }],
            generationConfig: { responseMimeType: "application/json" }
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`HTTP Error ${res.status}:`, errorText);
            throw new Error(`Gemini API error: ${res.status}`);
        }

        const data = await res.json() as any;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            console.error("No text in response:", JSON.stringify(data));
            return [];
        }

        // Extract JSON from response (clean any markdown blocks)
        const jsonStr = text.replace(/```json|```/g, '').trim();
        const enrichedData = JSON.parse(jsonStr);

        return prompts.map((p, i) => ({
            ...p,
            ...enrichedData[i]
        }));
    } catch (error) {
        console.error("Error processing batch:", error);
        return [];
    }
}

async function main() {
    const rawData: RawPrompt[] = JSON.parse(fs.readFileSync('scripts/raw_prompts.json', 'utf-8'));
    const batchSize = 10; // Small batches for accuracy and rate limits
    const total = rawData.length;

    console.log(`Starting processing of ${total} prompts...`);

    for (let i = 0; i < total; i += batchSize) {
        const batch = rawData.slice(i, i + batchSize);
        console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(total / batchSize)}...`);

        const enriched = await processBatch(batch);

        if (enriched.length > 0) {
            // Save to Supabase
            const toInsert = enriched.map(p => ({
                id: `hb_${p.category.toLowerCase().replace(/[^\w]/g, '_')}_${p.index}`,
                title: `${p.category} #${p.index}`,
                content_es: p.content,
                content_en: p.content_en,
                category: p.category,
                subcategory: p.subcategory || 'General',
                tags: p.tags_es,
                tags_en: p.tags_en,
                area: 'MARKETING_PRODUCTIVIDAD', // Target Area
                origin: 'internet',
                rating: 0,
                is_favorite: false,
                last_modified: Date.now()
            }));

            const { error } = await supabase.from('prompts').upsert(toInsert);
            if (error) {
                console.error("Supabase Error:", error);
            } else {
                console.log(`Successfully imported ${toInsert.length} prompts.`);
            }
        }

        // Small delay to respect rate limits (3 seconds for security)
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
}

main().catch(console.error);
