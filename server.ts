import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Lazy GoogleGenAI client
let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

interface FallbackOptions {
  contents: unknown;
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
}

async function generateContentWithFallback(options: FallbackOptions): Promise<{ text: string; modelUsed: string }> {
  const ai = getGenAI();
  let lastError: unknown = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents as any,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature ?? 0.7,
          responseMimeType: options.responseMimeType,
        },
      });

      const text = response.text || '';
      return { text, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || err?.response?.status;
      const msg = err?.message || String(err);
      console.warn(`[Gemini Fallback] Model ${model} failed with status: ${status}, error: ${msg}. Trying next fallback...`);

      // Check if error is recoverable (503, 429, 404, 500, or general network/API issue)
      const isRecoverable =
        !status ||
        [404, 429, 500, 502, 503, 504].includes(Number(status)) ||
        msg.includes('resource') ||
        msg.includes('quota') ||
        msg.includes('not found') ||
        msg.includes('unavailable');

      if (!isRecoverable && status === 401) {
        // Bad API key - fail fast
        throw new Error('Invalid Gemini API Key provided.');
      }
    }
  }

  throw lastError || new Error('All fallback models failed to generate a response');
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Config status endpoint
app.get('/api/config/status', (_req: Request, res: Response) => {
  res.json({
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    models: MODEL_FALLBACK_LADDER,
  });
});

function formatGeminiError(error: any): { message: string; statusCode: number } {
  const rawMsg = error?.message || String(error || '');
  console.error('[Gemini Error Handler]', rawMsg);

  if (rawMsg.includes('prepayment credits') || rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('429')) {
    return {
      message: 'Gemini API prepayment credits or quota depleted. Please add credits at https://ai.studio/projects or switch to a new API key in Google AI Studio Settings.',
      statusCode: 429,
    };
  }

  if (rawMsg.includes('API_KEY') || rawMsg.includes('401') || rawMsg.includes('API key not valid')) {
    return {
      message: 'Invalid or missing GEMINI_API_KEY. Please verify your API key in Google AI Studio.',
      statusCode: 401,
    };
  }

  return {
    message: rawMsg || 'Failed to communicate with Gemini API.',
    statusCode: 500,
  };
}

// Multi-turn Conversation & Reflection Endpoint
app.post('/api/gemini/converse', async (req: Request, res: Response): Promise<void> => {
  try {
    // Defensive Payload Ingestion (Null-Safe Destructuring)
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const userPrompt = typeof body.userPrompt === 'string' ? body.userPrompt.trim() : '';
    const mode = typeof body.mode === 'string' ? body.mode : 'reflect';
    const title = typeof body.title === 'string' ? body.title : undefined;
    const mood = body.userContext?.mood || '';

    if (!userPrompt && messages.length === 0) {
      res.status(400).json({ error: 'A user prompt or message history is required.' });
      return;
    }

    const systemInstruction = `You are ReflectAI, an empathetic, intellectually rigorous, and structured journaling and reflection partner powered by Gemini.
Your purpose is to help the user unpack their thoughts, identify cognitive patterns, explore underlying motivations, brainstorm creative solutions, and extract meaningful insights.

Current Reflection Mode: ${mode.toUpperCase()}
${mood ? `User's reported emotional tone / mood: ${mood}` : ''}

Mode Guidelines:
- "REFLECT": Deep, gentle inquiry. Validate feelings, ask 1-2 poignant questions to provoke deeper self-awareness, and highlight recurring themes.
- "SUMMARIZE": Clear synthesis. Provide a cohesive 2-3 sentence overview, bullet points of key lessons, and high-impact takeaways.
- "BRAINSTORM": Generate actionable ideas, innovative perspectives, lateral thinking angles, and structured options.
- "ACTION_PLAN": Convert reflections into concrete SMART steps, prioritize next actions, and suggest accountability checks.
- "GRATITUDE": Help savor positives, reframe hurdles into growth opportunities, and reinforce mindful appreciation.

Formatting:
Use markdown with clean formatting (bullet points, bold highlights, elegant headings where appropriate).
At the end of your response, if appropriate, include a structured JSON block delimited by \`\`\`json_meta ... \`\`\` containing:
{
  "suggestedTitle": "Short 3-5 word evocative title for this journal entry",
  "keyInsights": ["Insight 1", "Insight 2"],
  "actionItems": ["Action 1 (optional)"]
}
Keep the main conversational response warm, engaging, and directly addressed to the user.`;

    // Construct Gemini chat contents array
    const contents: any[] = [];

    // Append prior dialogue turns
    for (const msg of messages) {
      if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }],
        });
      }
    }

    // Append latest prompt if provided
    if (userPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: userPrompt }],
      });
    }

    const result = await generateContentWithFallback({
      contents,
      systemInstruction,
      temperature: 0.7,
    });

    let mainReply = result.text;
    let suggestedTitle = title;
    let keyInsights: string[] = [];
    let actionItems: string[] = [];

    // Parse metadata JSON block if returned
    const metaMatch = result.text.match(/```json_meta\s*([\s\S]*?)\s*```/);
    if (metaMatch && metaMatch[1]) {
      try {
        const parsed = JSON.parse(metaMatch[1]);
        if (parsed.suggestedTitle && !title) {
          suggestedTitle = parsed.suggestedTitle;
        }
        if (Array.isArray(parsed.keyInsights)) {
          keyInsights = parsed.keyInsights;
        }
        if (Array.isArray(parsed.actionItems)) {
          actionItems = parsed.actionItems;
        }
        // Remove the json_meta block from visible text for clean rendering
        mainReply = result.text.replace(/```json_meta\s*[\s\S]*?\s*```/, '').trim();
      } catch (parseErr) {
        console.warn('Failed to parse json_meta from Gemini output', parseErr);
      }
    }

    res.json({
      reply: mainReply,
      suggestedTitle,
      keyInsights: keyInsights.length > 0 ? keyInsights : undefined,
      actionItems: actionItems.length > 0 ? actionItems : undefined,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    const formatted = formatGeminiError(error);
    res.status(formatted.statusCode).json({
      error: formatted.message,
    });
  }
});

// Periodic Journal Synthesizer / Trends Endpoint
app.post('/api/gemini/summarize', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const entries = Array.isArray(body.entries) ? body.entries : [];

    if (entries.length === 0) {
      res.status(400).json({ error: 'At least one journal entry is required to summarize.' });
      return;
    }

    const compiledText = entries
      .map(
        (entry, idx) =>
          `Entry #${idx + 1} (${entry.createdAt || 'Recent'}): Title: "${entry.title}"\nContent:\n${entry.content}\n`
      )
      .join('\n---\n');

    const prompt = `Analyze these ${entries.length} journal reflections and synthesize high-level patterns:
${compiledText}

Provide an insightful summary with:
1. Executive synthesis of mental state and focal themes.
2. Dominant recurring themes.
3. Observed emotional & productivity trends.
4. 2-3 recommended growth areas or constructive questions for future reflections.`;

    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: 'You are a professional life coach and mindfulness summarizer. Be concise, constructive, and empowering.',
      temperature: 0.5,
    });

    res.json({
      summary: result.text,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    const formatted = formatGeminiError(error);
    res.status(formatted.statusCode).json({
      error: formatted.message,
    });
  }
});

// Vite Development & Production Static Server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ReflectAI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start ReflectAI server:', err);
  process.exit(1);
});
