import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  inlineImageTexts?: string[];
  aspectRatio?: string | null;
};

export const isPromptDebugEnabled = (): boolean => {
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

let geminiClient: GoogleGenAI | null = null;

const normalizeAspectRatioForGemini = (
  aspectRatio: string | null | undefined,
): string | null => {
  const allowed = new Set(['1:1', '3:4', '4:3', '9:16', '16:9']);
  if (!aspectRatio) return null;
  return allowed.has(aspectRatio) ? aspectRatio : null;
};

const pickImageSizeForAspectRatio = (
  aspectRatio: string | null,
): string | undefined => {
  switch (aspectRatio) {
    case '1:1':
      return '1024x1024';
    case '3:4':
      return '896x1152';
    case '4:3':
      return '1152x896';
    case '9:16':
      return '768x1344';
    case '16:9':
      return '1344x768';
    default:
      return undefined;
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getGeminiClient = (): GoogleGenAI | null => {
  const cfg = getGeminiConfig();
  if (!cfg.apiKey) {
    return null;
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: cfg.apiKey });
    // eslint-disable-next-line no-console
    console.log('[ai] GoogleGenAI client initialized.');
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
          inlineImageTexts: arg.inlineImageTexts ?? [],
          aspectRatio: arg.aspectRatio ?? null,
        };

  const { prompt, inlineImages, inlineImageTexts, aspectRatio } = options;

  const normalizedAspectRatio = normalizeAspectRatioForGemini(aspectRatio);
  const imageSize = pickImageSizeForAspectRatio(normalizedAspectRatio);

  const baseConfig: any = {};
  if (normalizedAspectRatio) {
    baseConfig.responseModalities = ['IMAGE'];
    baseConfig.imageConfig = {
      aspectRatio: normalizedAspectRatio,
      ...(imageSize ? { imageSize } : {}),
    };
  }

  if (isPromptDebugEnabled()) {
    const partsForStub: Array<
      { text: string } | { inlineData: GeminiInlineImage }
    > = [];

    if (!inlineImages || inlineImages.length === 0) {
      partsForStub.push({ text: prompt });
    } else if (
      inlineImageTexts &&
      inlineImageTexts.length === inlineImages.length
    ) {
      partsForStub.push({ text: prompt });
      inlineImages.forEach((img, index) => {
        const text = inlineImageTexts[index];
        if (text && text.trim().length > 0) {
          partsForStub.push({ text });
        }
        partsForStub.push({
          inlineData: {
            mimeType: img.mimeType,
            data: `<base64 ${img.data.length} chars redacted>`,
          },
        });
      });
    } else {
      partsForStub.push({ text: prompt });
      (inlineImages ?? []).forEach((img) => {
        partsForStub.push({
          inlineData: {
            mimeType: img.mimeType,
            data: `<base64 ${img.data.length} chars redacted>`,
          },
        });
      });
    }

    const stub: any = {
      model: cfg.model,
      contents: [
        {
          role: 'user',
          parts: partsForStub,
        },
      ],
    };

    if (normalizedAspectRatio) {
      stub.config = {
        responseModalities: baseConfig.responseModalities,
        imageConfig: baseConfig.imageConfig,
      };
    }

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

  const result = await (async () => {
    if (!inlineImages || inlineImages.length === 0) {
      const contents = [
        {
          role: 'user' as const,
          parts: [{ text: prompt }],
        },
      ];
      return client.models.generateContent({
        model: cfg.model,
        contents,
        ...(normalizedAspectRatio ? { config: baseConfig } : {}),
      } as any);
    }

    const parts: Array<{ text: string } | { inlineData: GeminiInlineImage }> =
      [];

    if (
      inlineImageTexts &&
      inlineImageTexts.length === inlineImages.length
    ) {
      parts.push({ text: prompt });
      inlineImages.forEach((img, index) => {
        const text = inlineImageTexts[index];
        if (text && text.trim().length > 0) {
          parts.push({ text });
        }
        parts.push({
          inlineData: {
            data: img.data,
            mimeType: img.mimeType,
          },
        });
      });
    } else {
      parts.push({ text: prompt });
      inlineImages.forEach((img) => {
        parts.push({
          inlineData: {
            data: img.data,
            mimeType: img.mimeType,
          },
        });
      });
    }

    const contents = [
      {
        role: 'user' as const,
        parts,
      },
    ];

    return client.models.generateContent({
      model: cfg.model,
      contents,
      ...(normalizedAspectRatio ? { config: baseConfig } : {}),
    } as any);
  })();

  const candidates = result.candidates ?? [];
  const first = candidates[0];
  const parts = first?.content?.parts ?? [];

  const blobPart = parts.find(
    (p: any) => p.inlineData && p.inlineData.data,
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
