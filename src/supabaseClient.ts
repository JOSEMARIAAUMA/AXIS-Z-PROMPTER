import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase URL or Anon Key. Please restart the development server.');
    // Alert the user so they know why the app is broken (white screen)
    alert('ERROR CRÍTICO: Faltan las variables de entorno de Supabase.\n\nPor favor, DETÉN y REINICIA tu servidor de desarrollo (npm run dev) para que cargue el archivo .env.local.');
}

// Fallback to avoid crash, requests will simply fail
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);
