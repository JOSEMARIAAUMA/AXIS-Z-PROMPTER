import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not set in Edge Function environment')
    }

    const { modelName, requestData } = await req.json()
    
    if (!modelName || !requestData) {
        throw new Error('Missing modelName or requestData in payload')
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: modelName })

    // Support both raw parts arrays (for vision/multimodal) and structured {contents} objects
    let result
    if (Array.isArray(requestData)) {
      // Vision mode: requestData is an array of parts (text + inlineData)
      result = await model.generateContent(requestData)
    } else {
      // Standard mode: requestData is a GenerateContentRequest object
      result = await model.generateContent(requestData)
    }

    const response = await result.response
    const text = response.text()

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    )
  }
})
