import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_FALLBACK_CHAIN = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
] as const;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildSourceParts(
  sourceType: 'text' | 'pdf',
  notesText?: string,
  pdfBase64?: string,
  promptText?: string
) {
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (sourceType === 'pdf' && pdfBase64) {
    const cleanBase64 = pdfBase64.replace(/^data:[^;]+;base64,/i, '').replace(/\s+/g, '');
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: cleanBase64,
      },
    });
  }

  if (notesText && notesText.trim().length > 0) {
    parts.push({
      text: `SOURCE LECTURE NOTES:\n${notesText.trim()}`,
    });
  }

  if (promptText) {
    parts.push({ text: promptText });
  }

  return parts;
}

function extractErrorDetails(err: unknown): { code?: number; message: string } {
  if (err && typeof err === 'object') {
    const anyErr = err as Record<string, any>;
    let numericCode: number | undefined =
      typeof anyErr.status === 'number'
        ? anyErr.status
        : typeof anyErr.code === 'number'
          ? anyErr.code
          : typeof anyErr.error?.code === 'number'
            ? anyErr.error.code
            : undefined;
    let message: string =
      typeof anyErr.error?.message === 'string'
        ? anyErr.error.message
        : typeof anyErr.message === 'string'
          ? anyErr.message
          : String(err);

    // Unwrap JSON-encoded ApiError messages if the SDK serialized { error: { code, message } }
    if (message.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(message);
        if (typeof parsed?.error?.code === 'number' && !numericCode) {
          numericCode = parsed.error.code;
        }
        if (typeof parsed?.error?.message === 'string') {
          message = parsed.error.message;
        } else if (typeof parsed?.message === 'string') {
          message = parsed.message;
        }
      } catch {
        // Keep original message string if not valid JSON
      }
    }

    return { code: numericCode, message };
  }
  return { message: String(err ?? 'Unknown error') };
}

function isServiceUnavailable503(err: unknown): boolean {
  const { code, message } = extractErrorDetails(err);
  const lower = message.toLowerCase();
  return (
    code === 503 ||
    lower.includes('503') ||
    lower.includes('unavailable') ||
    lower.includes('overloaded') ||
    lower.includes('high demand')
  );
}

function isRetryableCapacityError(err: unknown): boolean {
  const { code, message } = extractErrorDetails(err);
  const lower = message.toLowerCase();
  return (
    isServiceUnavailable503(err) ||
    code === 429 ||
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit')
  );
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const { code, message } = extractErrorDetails(err);
  const status =
    code && code >= 400 && code < 600
      ? code
      : isServiceUnavailable503(err)
        ? 503
        : isRetryableCapacityError(err)
          ? 429
          : 500;

  return {
    status,
    message: `HTTP ${status}: ${message}`,
  };
}

function escapeControlCharsInJsonStrings(input: string): string {
  let out = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        out += ch;
        inString = false;
        continue;
      }
      if (ch === '\n') {
        out += '\\n';
        continue;
      }
      if (ch === '\r') {
        out += '\\r';
        continue;
      }
      if (ch === '\t') {
        out += '\\t';
        continue;
      }
      const code = ch.charCodeAt(0);
      if (code < 0x20) {
        out += ' ';
        continue;
      }
      out += ch;
    } else {
      if (ch === '"') {
        inString = true;
      }
      out += ch;
    }
  }

  return out;
}

function repairTruncatedJson(input: string): string | null {
  const start = input.indexOf('{');
  if (start === -1) return null;
  const slice = input.slice(start);

  const stack: Array<'{' | '['> = [];
  const commaCheckpoints: Array<{ index: number; stack: Array<'{' | '['> }> = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < slice.length; i++) {
    const ch = slice[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === '{' || ch === '[') {
      stack.push(ch);
    } else if (ch === '}' || ch === ']') {
      stack.pop();
    } else if (ch === ',' && stack.length > 0) {
      commaCheckpoints.push({ index: i, stack: [...stack] });
    }
  }

  // First try simple closure if truncation occurred inside a string value
  if (inString) {
    const suffix = (escaped ? '\\' : '') + '"' + stack.slice().reverse().map((c) => (c === '{' ? '}' : ']')).join('');
    try {
      const candidate = slice + suffix;
      JSON.parse(candidate);
      return candidate;
    } catch {
      // Fall through to comma checkpoint rollback
    }
  }

  // Otherwise roll back to the latest safe comma boundary and close remaining containers
  for (let i = commaCheckpoints.length - 1; i >= 0; i--) {
    const cp = commaCheckpoints[i];
    const candidate =
      slice.slice(0, cp.index) +
      cp.stack
        .slice()
        .reverse()
        .map((c) => (c === '{' ? '}' : ']'))
        .join('');
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // Try earlier checkpoint
    }
  }

  return null;
}

function safeParseJson<T>(rawText: string | undefined): T {
  const trimmed = (rawText ?? '{}').trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const firstBrace = unfenced.indexOf('{');
  const lastBrace = unfenced.lastIndexOf('}');
  const cleaned =
    firstBrace !== -1 && lastBrace > firstBrace
      ? unfenced.slice(firstBrace, lastBrace + 1)
      : firstBrace !== -1
        ? unfenced.slice(firstBrace)
        : unfenced;

  try {
    return JSON.parse(cleaned) as T;
  } catch (firstErr) {
    const sanitized = escapeControlCharsInJsonStrings(cleaned);
    try {
      return JSON.parse(sanitized) as T;
    } catch {
      const repaired = repairTruncatedJson(sanitized);
      if (repaired) {
        return JSON.parse(repaired) as T;
      }
      throw firstErr;
    }
  }
}

async function generateJsonWithFallback<T>(params: {
  ai: GoogleGenAI;
  contents: { parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> };
  config: Record<string, any>;
}): Promise<T> {
  const { ai, contents, config } = params;
  let lastError: unknown;
  let bestPartialResult: T | undefined;

  for (let i = 0; i < MODEL_FALLBACK_CHAIN.length; i++) {
    const model = MODEL_FALLBACK_CHAIN[i];
    const hasFallback = Boolean(MODEL_FALLBACK_CHAIN[i + 1]);

    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });

      const finishReason = response.candidates?.[0]?.finishReason ?? 'UNKNOWN';
      const rawText = response.text?.trim();
      if (!rawText) {
        console.error(
          `[Gemini] ${model} returned empty text. candidates[0].finishReason=${finishReason}`,
          JSON.stringify(response.candidates?.[0] ?? null)
        );
        const emptyErr = new Error(
          `Model ${model} returned empty text (finishReason: ${finishReason}).`
        ) as Error & { status?: number };
        emptyErr.status = 502;
        lastError = emptyErr;
        if (hasFallback) {
          continue;
        }
        throw emptyErr;
      }

      try {
        const parsed = safeParseJson<T>(rawText);
        if (finishReason === 'MAX_TOKENS' && hasFallback) {
          console.warn(
            `[Gemini] ${model} hit MAX_TOKENS (finishReason=${finishReason}). Falling back to ${MODEL_FALLBACK_CHAIN[i + 1]}.`
          );
          bestPartialResult = parsed;
          continue;
        }
        return parsed;
      } catch (parseErr) {
        console.error(
          `[Gemini] ${model} returned invalid JSON (finishReason=${finishReason}):`,
          parseErr instanceof Error ? parseErr.message : parseErr
        );
        lastError = parseErr;
        if (hasFallback) {
          continue;
        }
        throw parseErr;
      }
    } catch (err) {
      lastError = err;
      const nextModel = MODEL_FALLBACK_CHAIN[i + 1];
      if (nextModel && isRetryableCapacityError(err)) {
        console.warn(
          `[Gemini] ${model} returned 503/429. Falling back immediately to ${nextModel}.`
        );
        continue;
      }
      if (bestPartialResult !== undefined) {
        return bestPartialResult;
      }
      throw err;
    }
  }

  if (bestPartialResult !== undefined) {
    return bestPartialResult;
  }

  throw lastError;
}

async function handleJsonRoute<T>(
  res: Response,
  work: () => Promise<T>
) {
  try {
    const data = await work();
    res.json(data);
  } catch (err) {
    const { status, message } = formatGeminiError(err);
    res.status(status).json({ error: message });
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.post('/api/exam/generate', async (req: Request, res: Response) => {
    const {
      sourceType,
      notesText,
      pdfBase64,
      difficulty = 'Standard Mock Exam',
      previousQuestions = [],
    } = req.body as {
      sourceType: 'text' | 'pdf';
      notesText?: string;
      pdfBase64?: string;
      difficulty?: string;
      previousQuestions?: string[];
    };

    if (sourceType === 'pdf' && !pdfBase64) {
      res.status(400).json({ error: 'Please upload a PDF file before generating an exam.' });
      return;
    }
    if (sourceType === 'text' && (!notesText || notesText.trim().length < 30)) {
      res.status(400).json({ error: 'Please paste at least a short paragraph of lecture notes (30+ characters).' });
      return;
    }

    await handleJsonRoute(res, async () => {
      const ai = getGeminiClient();
      const isQuickRevision = difficulty.toLowerCase().includes('quick revision');

      const avoidClause =
        Array.isArray(previousQuestions) && previousQuestions.length > 0
          ? `\nAvoid repeating these prior questions:\n${previousQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}`
          : '';

      if (isQuickRevision) {
        const quickPrompt = `Create a Quick Revision flash-quiz deck strictly from the lecture material focusing on core definitions and key facts.${avoidClause}
Return compact valid JSON matching the schema:
- topicTitle: 3-6 word topic title
- sourceSummary: 1 concise overview sentence
- mcqs: exactly 15 distinct multiple-choice cue-card questions covering core definitions and high-yield key facts; 4 concise option strings each (no A/B/C/D prefixes); correctIndex (0-3); explanation (1 crisp sentence, max 18 words); concept (2-4 words); hint (1 brief study clue under 12 words without giving away the answer)`;

        const parsed = await generateJsonWithFallback<any>({
          ai,
          contents: {
            parts: buildSourceParts(sourceType, notesText, pdfBase64, quickPrompt),
          },
          config: {
            systemInstruction:
              'You are a concise university lecturer. Output compact, valid JSON grounded strictly in the provided material.',
            maxOutputTokens: 16384,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              required: ['topicTitle', 'sourceSummary', 'mcqs'],
              properties: {
                topicTitle: { type: Type.STRING },
                sourceSummary: { type: Type.STRING },
                mcqs: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    required: ['question', 'options', 'correctIndex', 'explanation', 'concept', 'hint'],
                    properties: {
                      question: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      correctIndex: { type: Type.INTEGER },
                      explanation: { type: Type.STRING },
                      concept: { type: Type.STRING },
                      hint: { type: Type.STRING },
                    },
                  },
                },
              },
            },
          },
        });

        const mcqs = (parsed.mcqs ?? []).slice(0, 15).map((q: any, i: number) => ({
          id: `mcq-${i + 1}`,
          question: String(q.question ?? ''),
          options: Array.isArray(q.options) ? q.options.slice(0, 4).map(String) : [],
          correctIndex: Math.min(3, Math.max(0, Number(q.correctIndex ?? 0))),
          explanation: String(q.explanation ?? ''),
          concept: String(q.concept ?? 'Core Concept'),
          hint: String(q.hint ?? '').trim(),
        }));

        return {
          topicTitle: String(parsed.topicTitle ?? 'Quick Revision Cue Cards'),
          sourceSummary: String(parsed.sourceSummary ?? ''),
          difficulty,
          mcqs,
          fillInBlanks: [],
          wordBank: [],
          structured: [],
        };
      }

      const prompt = `Create a comprehensive 3-section mock exam strictly from the lecture material (Standard Mock Exam: balanced recall, conceptual clarity, and applied scenarios).${avoidClause}
Return compact valid JSON matching the schema:
- topicTitle: 3-6 word topic title
- sourceSummary: 1 concise overview sentence
- mcqs (Section A): exactly 20 distinct objective multiple-choice questions covering all key topics; 4 concise option strings each (no A/B/C/D prefixes); correctIndex (0-3); explanation (1 crisp sentence, max 18 words); concept (2-4 words); hint (1 brief clue under 12 words without revealing the answer)
- fillInBlanks (Section B): exactly 10 distinct fill-in-the-blank sentences; each "sentence" must contain exactly one "___" placeholder for the missing key term; "answer" is the exact missing 1-3 word key term; "concept" (2-4 words); "hint" (1 brief clue under 12 words without naming the missing term)
- structured (Section C): exactly 3 short-answer/scenario questions (5 marks each); contextTag (2-3 words e.g. Applied Scenario); concept (2-4 words); hint (1 brief clue under 12 words pointing to the key mechanism or principle)`;

      const parsed = await generateJsonWithFallback<any>({
        ai,
        contents: {
          parts: buildSourceParts(sourceType, notesText, pdfBase64, prompt),
        },
        config: {
          systemInstruction:
            'You are a concise university lecturer. Output compact, valid JSON grounded strictly in the provided material.',
          maxOutputTokens: 16384,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            required: ['topicTitle', 'sourceSummary', 'mcqs', 'fillInBlanks', 'structured'],
            properties: {
              topicTitle: { type: Type.STRING },
              sourceSummary: { type: Type.STRING },
              mcqs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ['question', 'options', 'correctIndex', 'explanation', 'concept', 'hint'],
                  properties: {
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                    concept: { type: Type.STRING },
                    hint: { type: Type.STRING },
                  },
                },
              },
              fillInBlanks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ['sentence', 'answer', 'concept', 'hint'],
                  properties: {
                    sentence: { type: Type.STRING },
                    answer: { type: Type.STRING },
                    concept: { type: Type.STRING },
                    hint: { type: Type.STRING },
                  },
                },
              },
              structured: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ['question', 'contextTag', 'concept', 'hint'],
                  properties: {
                    question: { type: Type.STRING },
                    contextTag: { type: Type.STRING },
                    concept: { type: Type.STRING },
                    hint: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const mcqs = (parsed.mcqs ?? []).slice(0, 20).map((q: any, i: number) => ({
        id: `mcq-${i + 1}`,
        question: String(q.question ?? ''),
        options: Array.isArray(q.options) ? q.options.slice(0, 4).map(String) : [],
        correctIndex: Math.min(3, Math.max(0, Number(q.correctIndex ?? 0))),
        explanation: String(q.explanation ?? ''),
        concept: String(q.concept ?? 'Core Concept'),
        hint: String(q.hint ?? '').trim(),
      }));

      const fillInBlanks = (parsed.fillInBlanks ?? []).slice(0, 10).map((q: any, i: number) => {
        let sentence = String(q.sentence ?? '').replace(/_{2,}|\[blank\]/gi, '___');
        if (!sentence.includes('___')) {
          sentence = `${sentence.replace(/[.!?]+$/, '')} ___.`;
        }
        return {
          id: `fib-${i + 1}`,
          sentence,
          answer: String(q.answer ?? '').trim(),
          concept: String(q.concept ?? 'Key Term'),
          hint: String(q.hint ?? '').trim(),
        };
      });

      const wordBank = fillInBlanks.map((q: { answer: string }) => q.answer);
      for (let i = wordBank.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wordBank[i], wordBank[j]] = [wordBank[j], wordBank[i]];
      }

      const structured = (parsed.structured ?? []).slice(0, 3).map((q: any, i: number) => ({
        id: `str-${i + 1}`,
        question: String(q.question ?? ''),
        contextTag: String(q.contextTag ?? 'Short Answer'),
        maxMarks: 5,
        concept: String(q.concept ?? 'Key Concept'),
        hint: String(q.hint ?? '').trim(),
      }));

      return {
        topicTitle: String(parsed.topicTitle ?? 'Practice Mock Exam'),
        sourceSummary: String(parsed.sourceSummary ?? ''),
        difficulty,
        mcqs,
        fillInBlanks,
        wordBank,
        structured,
      };
    });
  });

  app.post('/api/exam/grade', async (req: Request, res: Response) => {
    const {
      sourceType,
      notesText,
      pdfBase64,
      difficulty = 'Standard Mock Exam',
      questions,
    } = req.body as {
      sourceType: 'text' | 'pdf';
      notesText?: string;
      pdfBase64?: string;
      difficulty?: string;
      questions: Array<{
        id: string;
        question: string;
        concept: string;
        studentAnswer: string;
        maxMarks: number;
      }>;
    };

    if (!Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ error: 'No structured questions provided for grading.' });
      return;
    }

    await handleJsonRoute(res, async () => {
      const ai = getGeminiClient();

      const qaBlock = questions
        .map(
          (q, idx) =>
            `Q${idx + 1} [id=${q.id}]: ${q.question}\nStudent: ${q.studentAnswer?.trim() || '[BLANK]'}`
        )
        .join('\n\n');

      const prompt = `Grade each Section C structured answer (0-5 integer marks, ${difficulty} standard) using the lecture material.
${qaBlock}
Return JSON:
- results: per question { id, score (0-5), feedback (1-2 crisp sentences), missingKeyTerms (exact omitted terms; [] if 5/5), modelAnswer (2-4 crisp sentences) }
- overallFeedback: 1 concise summary sentence`;

      const parsed = await generateJsonWithFallback<any>({
        ai,
        contents: {
          parts: buildSourceParts(sourceType, notesText, pdfBase64, prompt),
        },
        config: {
          systemInstruction:
            'You are a concise academic lecturer grading short answers against the provided lecture material.',
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            required: ['results', 'overallFeedback'],
            properties: {
              results: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: [
                    'id',
                    'score',
                    'feedback',
                    'missingKeyTerms',
                    'modelAnswer',
                  ],
                  properties: {
                    id: { type: Type.STRING },
                    score: { type: Type.INTEGER },
                    feedback: { type: Type.STRING },
                    missingKeyTerms: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    modelAnswer: { type: Type.STRING },
                  },
                },
              },
              overallFeedback: { type: Type.STRING },
            },
          },
        },
      });
      const results = questions.map((orig, idx) => {
        const match =
          (parsed.results ?? []).find((r: any) => r.id === orig.id) ??
          (parsed.results ?? [])[idx] ??
          {};
        const score = Math.min(orig.maxMarks, Math.max(0, Math.round(Number(match.score ?? 0))));
        return {
          id: orig.id,
          score,
          maxMarks: orig.maxMarks,
          feedback: String(match.feedback ?? 'Graded against lecture rubric.'),
          missingKeyTerms: Array.isArray(match.missingKeyTerms)
            ? match.missingKeyTerms.map(String)
            : [],
          modelAnswer: String(match.modelAnswer ?? ''),
          concept: orig.concept,
        };
      });

      return {
        results,
        overallFeedback: String(parsed.overallFeedback ?? ''),
      };
    });
  });

  app.post('/api/exam/eli12', async (req: Request, res: Response) => {
    const {
      question,
      concept,
      correctOrModelAnswer,
      studentAttempt,
      sourceType,
      notesText,
      pdfBase64,
    } = req.body as {
      question: string;
      concept: string;
      correctOrModelAnswer: string;
      studentAttempt?: string;
      sourceType?: 'text' | 'pdf';
      notesText?: string;
      pdfBase64?: string;
    };

    if (!question || !concept) {
      res.status(400).json({ error: 'Question and concept are required.' });
      return;
    }

    await handleJsonRoute(res, async () => {
      const ai = getGeminiClient();

      const prompt = `Explain this concept simply for a 12-year-old using ONE everyday real-world analogy.
Concept: ${concept}
Question: ${question}
Answer: ${correctOrModelAnswer}${studentAttempt ? `\nStudent wrote: ${studentAttempt}` : ''}
Return JSON: analogyTitle (3-5 words), analogy (2-3 simple jargon-free sentences), keyTakeaway (1 memorable sentence).`;

      const parts =
        sourceType === 'pdf' && pdfBase64
          ? buildSourceParts('pdf', notesText, pdfBase64, prompt)
          : [{ text: prompt }];

      const parsed = await generateJsonWithFallback<any>({
        ai,
        contents: { parts },
        config: {
          systemInstruction:
            'Explain academic concepts using simple everyday analogies for a 12-year-old.',
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            required: ['analogyTitle', 'analogy', 'keyTakeaway'],
            properties: {
              analogyTitle: { type: Type.STRING },
              analogy: { type: Type.STRING },
              keyTakeaway: { type: Type.STRING },
            },
          },
        },
      });
      return {
        analogyTitle: String(parsed.analogyTitle ?? 'Everyday Analogy'),
        analogy: String(parsed.analogy ?? ''),
        keyTakeaway: String(parsed.keyTakeaway ?? ''),
      };
    });
  });

  // Global JSON error handler so malformed/oversized payloads never crash with raw HTML
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const { status, message } = formatGeminiError(err);
    res.status(status).json({ error: message });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ExamForge server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start ExamForge server:', err);
  process.exit(1);
});
