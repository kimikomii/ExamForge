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

function safeParseJson<T>(rawText: string | undefined): T {
  const trimmed = (rawText ?? '{}').trim();
  const cleaned = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

async function generateContentWithFallback(params: {
  ai: GoogleGenAI;
  contents: { parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> };
  config: Record<string, any>;
}) {
  const { ai, contents, config } = params;
  let lastError: unknown;

  for (let i = 0; i < MODEL_FALLBACK_CHAIN.length; i++) {
    const model = MODEL_FALLBACK_CHAIN[i];
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });

      const rawText = response.text?.trim();
      if (!rawText) {
        const finishReason = response.candidates?.[0]?.finishReason ?? 'UNKNOWN';
        console.error(
          `[Gemini] ${model} returned empty text. candidates[0].finishReason=${finishReason}`,
          JSON.stringify(response.candidates?.[0] ?? null)
        );
        const emptyErr = new Error(
          `Model ${model} returned empty text (finishReason: ${finishReason}).`
        ) as Error & { status?: number };
        emptyErr.status = 502;
        lastError = emptyErr;
        if (MODEL_FALLBACK_CHAIN[i + 1]) {
          continue;
        }
        throw emptyErr;
      }

      return response;
    } catch (err) {
      lastError = err;
      const nextModel = MODEL_FALLBACK_CHAIN[i + 1];
      if (nextModel && isRetryableCapacityError(err)) {
        console.warn(
          `[Gemini] ${model} returned 503/429. Falling back immediately to ${nextModel}.`
        );
        continue;
      }
      throw err;
    }
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
      difficulty = 'Standard Diploma Level',
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

      const difficultyGuidance =
        difficulty === 'Hard / Tricky'
          ? 'Hard/Tricky: subtle distractors, edge cases, multi-step analysis.'
          : difficulty === 'Quick Revision'
            ? 'Quick Revision: concise high-yield core definitions and recall checks.'
            : 'Standard Diploma Level: balanced recall and applied scenarios.';

      const avoidClause =
        Array.isArray(previousQuestions) && previousQuestions.length > 0
          ? `\nAvoid repeating these prior questions:\n${previousQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}`
          : '';

      const prompt = `Create a comprehensive 3-section mock exam strictly from the lecture material (${difficultyGuidance}).${avoidClause}
Return JSON matching the schema:
- topicTitle: 3-6 word topic title
- sourceSummary: 1 concise overview sentence
- mcqs (Section A): exactly 20 distinct objective multiple-choice questions covering all key topics; 4 clean option strings each (no A/B/C/D prefixes); correctIndex (0-3); explanation (concise 1 sentence); concept (2-4 words)
- fillInBlanks (Section B): exactly 10 distinct fill-in-the-blank sentences; each "sentence" must contain exactly one "___" placeholder for the missing key term; "answer" is the exact missing 1-3 word key term; "concept" (2-4 words)
- structured (Section C): exactly 3 short-answer/scenario questions (5 marks each); contextTag (2-3 words e.g. Applied Scenario); concept (2-4 words)`;

      const response = await generateContentWithFallback({
        ai,
        contents: {
          parts: buildSourceParts(sourceType, notesText, pdfBase64, prompt),
        },
        config: {
          systemInstruction:
            'You are a concise university lecturer. Output compact, valid JSON grounded strictly in the provided material.',
          maxOutputTokens: 8192,
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
                  required: ['question', 'options', 'correctIndex', 'explanation', 'concept'],
                  properties: {
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                    concept: { type: Type.STRING },
                  },
                },
              },
              fillInBlanks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ['sentence', 'answer', 'concept'],
                  properties: {
                    sentence: { type: Type.STRING },
                    answer: { type: Type.STRING },
                    concept: { type: Type.STRING },
                  },
                },
              },
              structured: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ['question', 'contextTag', 'concept'],
                  properties: {
                    question: { type: Type.STRING },
                    contextTag: { type: Type.STRING },
                    concept: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const parsed = safeParseJson<any>(response.text);

      const mcqs = (parsed.mcqs ?? []).slice(0, 20).map((q: any, i: number) => ({
        id: `mcq-${i + 1}`,
        question: String(q.question ?? ''),
        options: Array.isArray(q.options) ? q.options.slice(0, 4).map(String) : [],
        correctIndex: Math.min(3, Math.max(0, Number(q.correctIndex ?? 0))),
        explanation: String(q.explanation ?? ''),
        concept: String(q.concept ?? 'Core Concept'),
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
      difficulty = 'Standard Diploma Level',
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

      const response = await generateContentWithFallback({
        ai,
        contents: {
          parts: buildSourceParts(sourceType, notesText, pdfBase64, prompt),
        },
        config: {
          systemInstruction:
            'You are a concise academic lecturer grading short answers against the provided lecture material.',
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

      const parsed = safeParseJson<any>(response.text);
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

      const response = await generateContentWithFallback({
        ai,
        contents: { parts },
        config: {
          systemInstruction:
            'Explain academic concepts using simple everyday analogies for a 12-year-old.',
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

      const parsed = safeParseJson<any>(response.text);
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
