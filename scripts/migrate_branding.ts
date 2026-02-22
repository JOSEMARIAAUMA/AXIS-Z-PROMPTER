import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Migrando prompts a Branding...');

    // 1. Añadir la categoría "Branding" en categories (si no existe) y mapearla a MARKETING_PRODUCTIVIDAD
    const { data: catData, error: catError } = await supabase.from('categories').select('*').limit(1).single();
    if (catError || !catData) {
        console.error('Error fetched categories', catError);
        return;
    }

    const map = catData.map;
    const areaMapping = catData.area_mapping || {};

    if (!map['Branding']) {
        map['Branding'] = ['Identidad Visual', 'Estrategia de Marca', 'Logos y Naming', 'Tono y Voz'];
        areaMapping['Branding'] = ['MARKETING_PRODUCTIVIDAD']; // O el ID real del área

        await supabase.from('categories').update({ map, area_mapping: areaMapping }).eq('id', catData.id);
        console.log('Categoría Branding creada con subcategorías.');
    }

    // 2. Obtener todos los prompts de Marketing
    const { data: prompts, error } = await supabase.from('prompts').select('*').eq('category', 'Marketing Digital');
    if (error) {
        console.error('Error fetching prompts', error);
        return;
    }

    console.log(`Encontrados ${prompts.length} prompts en Marketing Digital.`);

    // Revisar y mover los que hablen de marca, logo, branding, etc.
    let moved = 0;
    for (const prompt of prompts) {
        const isBranding =
            /marca|branding|logo|identidad|naming|voz de marca|arquetipo/i.test(prompt.title) ||
            /marca|branding|logo|identidad|naming|voz de marca|arquetipo/i.test(prompt.content_es) ||
            /brand|logo|identity|naming|brand voice/i.test(prompt.content_en);

        if (isBranding) {
            console.log(`Moviendo: ${prompt.title}`);

            let newSub = 'Estrategia de Marca';
            if (/logo|visual/i.test(prompt.title) || /logo|visual/i.test(prompt.content_es)) {
                newSub = 'Identidad Visual';
            } else if (/naming/i.test(prompt.title)) {
                newSub = 'Logos y Naming';
            }

            await supabase.from('prompts').update({ category: 'Branding', subcategory: newSub }).eq('id', prompt.id);
            moved++;
        }
    }

    // Revisar otras categorías? maybe 'Estrategia' or 'General'
    const { data: morePrompts } = await supabase.from('prompts').select('*').eq('category', 'Estrategia de Marca');
    if (morePrompts && morePrompts.length > 0) {
        for (const p of morePrompts) {
            await supabase.from('prompts').update({ category: 'Branding', subcategory: 'Estrategia de Marca' }).eq('id', p.id);
            moved++;
        }
    }

    console.log(`Migración completada. Movidos ${moved} prompts a Branding.`);
}

main().catch(console.error);
