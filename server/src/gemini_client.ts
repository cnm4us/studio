import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

type GeminiConfig = {
  apiKey?: string;
  model: string;
};

export type GeminiInlineImage = {
  data: string;
  mimeType: string;
};

export type GeminiRenderOptions = {
  prompt: string;
  inlineImages?: GeminiInlineImage[];
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
  arg: string | GeminiRenderOptions,
): Promise<{ mimeType: string; data: Buffer }> => {
  const cfg = getGeminiConfig();
  const client = getGeminiClient();
  if (!client || !cfg.apiKey) {
    throw new Error('GEMINI_NOT_CONFIGURED');
  }

  const options: GeminiRenderOptions =
    typeof arg === 'string'
      ? { prompt: arg }
      : {
          prompt: arg.prompt,
          inlineImages: arg.inlineImages ?? [],
        };

  const { prompt, inlineImages } = options;

  if (isPromptDebugEnabled()) {
    const stub = {
      model: cfg.model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            ...(inlineImages ?? []).map((img) => ({
              inlineData: {
                mimeType: img.mimeType,
                data: `<base64 ${img.data.length} chars redacted>`,
              },
            })),
          ],
        },
      ],
    };

    try {
      const debugDir = path.join(__dirname, '..', 'debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `gemini-request-${timestamp}.json`;
      const filePath = path.join(debugDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(stub, null, 2), 'utf8');
      // eslint-disable-next-line no-console
      console.log(`[ai] Gemini request stub written to ${filePath}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[ai] Failed to write Gemini request debug file:', err);
    }

    // eslint-disable-next-line no-console
    console.log(
      `[ai] Gemini request debug (model=${cfg.model}):\n` +
        '------------------------------------------------------------\n' +
        `${JSON.stringify(stub, null, 2)}\n` +
        '------------------------------------------------------------',
    );
    if (inlineImages && inlineImages.length > 0) {
      // eslint-disable-next-line no-console
      console.log(
        `[ai] Gemini inline images: count=${inlineImages.length}`,
      );
      inlineImages.forEach((img, index) => {
        // eslint-disable-next-line no-console
        console.log(
          `  - [image ${index + 1}] mimeType=${img.mimeType}, bytes=${img.data.length}`,
        );
      });
    }
  }

  const model = client.getGenerativeModel({
    model: cfg.model,
  });

  const result = await (async () => {
    if (!inlineImages || inlineImages.length === 0) {
      return model.generateContent(prompt);
    }

    const parts: Array<{ text: string } | { inlineData: GeminiInlineImage }> = [
      { text: prompt },
      ...inlineImages.map((img) => ({
        inlineData: {
          data: img.data,
          mimeType: img.mimeType,
        },
      })),
    ];

    return model.generateContent(parts as any);
  })();

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
