import json
import os
import time
import uuid
import google.generativeai as genai
from supabase import create_client, Client

# CONFIGURATION - Load from .env.local if exists
def load_env_local():
    env_path = ".env.local"
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    key, value = line.strip().split("=", 1)
                    os.environ[key] = value.strip('"')

load_env_local()

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or not GEMINI_API_KEY:
    print(f"Error: Missing environment variables. Found URL: {bool(SUPABASE_URL)}, Key: {bool(SUPABASE_KEY)}, Gemini: {bool(GEMINI_API_KEY)}")
    exit(1)

# Debug key format (first 4 chars)
print(f"Subabase URL: {SUPABASE_URL[:10]}...")
print(f"Gemini Key starts with: {GEMINI_API_KEY[:4]}...")

# Initialize Clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel('gemini-1.5-flash')

# Manual Category Mapping Fallback
CATEGORY_MAP = {
    "Vegetaci\u00f3n": "Vegetaci\u00f3n y Paisajismo",
    "Vegetacion": "Vegetaci\u00f3n y Paisajismo",
    "Personas": "Personas y Lifestyle",
    "Materiales": "Materiales y Texturas",
    "Iluminaci\u00f3n": "Iluminaci\u00f3n y Clima",
    "Estilo": "Estilo Arquitect\u00f3nico",
    "Detalles": "Detalles y Mobiliario",
    "C\u00e1mara": "C\u00e1mara y Punto de Vista",
    "Negativos": "Negativos y Restricciones",
    "Render": "Render y Edici\u00f3n de Imagen",
    "Marketing": "Marketing y Redes Sociales",
    "Estrategia de marketing": "Marketing y Redes Sociales",
    "Documentaci\u00f3n": "Memorias y Documentaci\u00f3n",
    "C\u00f3digo": "Automatizaci\u00f3n y C\u00f3digo",
    "Automatizaci\u00f3n": "Automatizaci\u00f3n y C\u00f3digo"
}

def process_prompt(prompt_data):
    """
    Takes a raw prompt object { category, subcategory, content }
    Returns enriched object with { content_es, content_en, tags, tags_en, category, subcategory, origin, rating, area }
    """
    content_es = prompt_data['content']
    original_category = prompt_data['category']
    original_subcategory = prompt_data.get('subcategory', '')
    
    # Defaults in case AI fails
    final_cat = CATEGORY_MAP.get(original_category, original_category)
    result = {
        "translation": content_es, 
        "tags_es": [],
        "tags_en": [],
        "category": final_cat,
        "subcategory": original_subcategory
    }

    try:
        # Construct AI Prompts
        system_instruction = f"""
        You are an AI assistant processing prompts for an architectural visualization app.
        Input: A prompt in Spanish: "{content_es}"
        Context Category: "{original_category}"
        
        Task:
        1. Translate the prompt to English (for 'content_en').
        2. Provide 3-5 tags in Spanish (tags_es) and English (tags_en).
        3. Suggest a Category from: ['Vegetaci\u00f3n y Paisajismo', 'Personas y Lifestyle', 'Materiales y Texturas', 'Iluminaci\u00f3n y Clima', 'Estilo Arquitect\u00f3nico', 'Detalles y Mobiliario', 'C\u00e1mara y Punto de Vista', 'Negativos y Restricciones', 'Render y Edici\u00f3n de Imagen', 'Marketing y Redes Sociales', 'Memorias y Documentaci\u00f3n', 'Automatizaci\u00f3n y C\u00f3digo'].
        
        Return ONLY JSON:
        {{
            "translation": "...",
            "tags_es": ["..."],
            "tags_en": ["..."],
            "category": "...",
            "subcategory": "..."
        }}
        """

        response = model.generate_content(system_instruction, generation_config={"response_mime_type": "application/json"})
        try:
            result = json.loads(response.text)
        except:
            # Fallback if JSON is weird
            import re
            json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
            # otherwise stay with default
    except Exception as e:
        if "401" in str(e):
            # Silent fallback for auth errors to allow import to proceed
            pass
        else:
            print(f"AI Error: {e}")
    
    cat = result.get("category", final_cat)
    # Ensure cat is mapped if AI returned a variant
    cat = CATEGORY_MAP.get(cat, cat)

    # Determine Area
    image_cats = ["Vegetaci\u00f3n y Paisajismo", "Personas y Lifestyle", "Materiales y Texturas", "Iluminaci\u00f3n y Clima", "Estilo Arquitect\u00f3nico", "C\u00e1mara y Punto de Vista", "Negativos y Restricciones", "Render y Edici\u00f3n de Imagen"]
    text_cats = ["Marketing y Redes Sociales", "Memorias y Documentaci\u00f3n", "Detalles y Mobiliario"]
    
    area = "IMAGE"
    if cat in text_cats: area = "TEXT"
    elif cat == "Automatizaci\u00f3n y C\u00f3digo": area = "CODE"

    return {
        "id": str(uuid.uuid4()),
        "title": content_es[:50] + "..." if len(content_es) > 50 else content_es,
        "content_es": content_es,
        "content_en": result.get("translation", content_es),
        "tags": result.get("tags_es", []),
        "tags_en": result.get("tags_en", []),
        "category": cat,
        "subcategory": result.get("subcategory", original_subcategory),
        "origin": "internet",
        "rating": 0,
        "apps": [],
        "area": area,
        "last_modified": int(time.time() * 1000)
    }

def main():
    if not os.path.exists("scripts/raw_prompts.json"):
        print("Error: scripts/raw_prompts.json not found.")
        return

    with open("scripts/raw_prompts.json", "r", encoding="utf-8") as f:
        raw_prompts = json.load(f)
        
    print(f"Loaded {len(raw_prompts)} raw prompts. Starting processing...", flush=True)
    
    batch_size = 20 # Reduced batch size for safety
    processed_batch = []
    
    for i, raw_prompt in enumerate(raw_prompts):
        # SKIP ALREADY PROCESSED if we want, but for now we restart or trust batches
        # We'll just run it.
        
        print(f"Processing {i+1}/{len(raw_prompts)}: {raw_prompt['content'][:30]}...", flush=True)
        
        enriched = process_prompt(raw_prompt)
        if enriched:
            processed_batch.append(enriched)
            
        # Batch Insert
        if len(processed_batch) >= batch_size or i == len(raw_prompts) - 1:
            if not processed_batch:
                continue
            try:
                # Ensure we don't send individual 'id' if it's not set
                res = supabase.table("prompts").insert(processed_batch).execute()
                print(f"Inserted batch of {len(processed_batch)} prompts.", flush=True)
                processed_batch = []
            except Exception as e:
                print(f"Error inserting batch at index {i}: {e}", flush=True)
                # Keep going? Or fail? 
                processed_batch = []
                
        # Rate Limiting / Sleep
        time.sleep(0.5) 

if __name__ == "__main__":
    main()
