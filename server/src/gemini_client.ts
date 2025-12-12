import { GoogleGenerativeAI } from '@google/generative-ai';

type GeminiConfig = {
  apiKey?: string;
  model: string;
};

const isPromptDebugEnabled = (): boolean => {
  const raw = process.env.DEBUG_PROMPT;
  if (!raw) return false;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === '' || trimmed === '0' || trimmed === 'false') {
    return false;
  }
  return true;
};

const getGeminiConfig = (): GeminiConfig => ({
  apiKey: process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_IMAGE_MODEL ?? 'gemini-3-pro-image-preview',
});

let geminiClient: GoogleGenerativeAI | null = null;

export const getGeminiClient = (): GoogleGenerativeAI | null => {
  const cfg = getGeminiConfig();
  if (!cfg.apiKey) {
    return null;
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(cfg.apiKey);
    // eslint-disable-next-line no-console
    console.log('[ai] GoogleGenerativeAI client initialized.');
  }

  return geminiClient;
};

export const logGeminiStatus = (): void => {
  const cfg = getGeminiConfig();
  if (cfg.apiKey) {
    // eslint-disable-next-line no-console
    console.log(
      `[ai] Gemini configured with model=${cfg.model}; GOOGLE_API_KEY/GEMINI_API_KEY present.`,
    );
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      '[ai] GOOGLE_API_KEY/GEMINI_API_KEY missing; Gemini image generation is disabled.',
    );
  }
};

export const renderImageWithGemini = async (
  prompt: string,
): Promise<{ mimeType: string; data: Buffer }> => {
  const cfg = getGeminiConfig();
  const client = getGeminiClient();
  if (!client || !cfg.apiKey) {
    throw new Error('GEMINI_NOT_CONFIGURED');
  }

  if (isPromptDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.log(
      `[ai] Gemini prompt debug (model=${cfg.model}):\n` +
        '------------------------------------------------------------\n' +
        `${prompt}\n` +
        '------------------------------------------------------------',
    );
  }

  const model = client.getGenerativeModel({
    model: cfg.model,
  });

  const result = await model.generateContent(prompt);
  const response = result.response;
  const candidates = response.candidates ?? [];
  const first = candidates[0];
  const parts = first?.content?.parts ?? [];

  const blobPart = parts.find(
    (p) => (p as any).inlineData && (p as any).inlineData.data,
  ) as
    | {
        inlineData: {
          mimeType: string;
          data: string;
        };
      }
    | undefined;

  if (!blobPart) {
    throw new Error('GEMINI_NO_IMAGE_RETURNED');
  }

  const mimeType = blobPart.inlineData.mimeType;
  const buffer = Buffer.from(blobPart.inlineData.data, 'base64');

  return { mimeType, data: buffer };
};
