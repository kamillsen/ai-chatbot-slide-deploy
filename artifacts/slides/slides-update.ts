/**
 * Slayt hedefli güncelleme: tek slaytın title, body veya image alanını prompt ile günceller.
 * update-slide-element API ve onUpdateDocument hedefli akışı bu modülü kullanır.
 */
import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { generateSlideImage } from "@/lib/ai/image";
import { getSlidesArtifactModel } from "@/lib/ai/providers";

// Slayt tipi (id zorunlu; image base64 saklanır).
export type SlideWithImage = {
  id: string;
  title: string;
  body: string;
  imagePrompt?: string;
  image?: string;
};

// Tüm slaytlara yoksa UUID atar (streamObject çıktısında id olmayabilir).
export function ensureSlideIds(
  slides: Array<SlideWithImage | (SlideWithImage & { id?: string })>
): asserts slides is SlideWithImage[] {
  for (const slide of slides) {
    if (!slide.id) {
      (slide as SlideWithImage).id = crypto.randomUUID();
    }
  }
}

// Güncellenebilir hedef: görsel, içerik (title+body), sadece başlık veya sadece gövde.
export type SlideUpdateTarget = "image" | "content" | "title" | "body";

// Belirtilen slaytın yalnızca target alanını prompt ile günceller; yeni JSON string döner.
export async function updateSlidesTargeted(
  documentContent: string | null,
  slideId: string,
  target: SlideUpdateTarget,
  prompt: string
): Promise<string> {
  let slides: SlideWithImage[] = [];
  try {
    if (documentContent) {
      const parsed = JSON.parse(documentContent) as {
        slides?: Array<SlideWithImage & { id?: string }>;
      };
      const raw = Array.isArray(parsed?.slides) ? parsed.slides : [];
      ensureSlideIds(raw);
      slides = raw as SlideWithImage[];
    }
  } catch {
    return documentContent ?? "";
  }

  const slide = slides.find((s) => s.id === slideId);
  if (!slide) {
    return documentContent ?? "";
  }

  if (target === "image") {
    try {
      // Görsel: lib/ai/image.ts ile AI Gateway üzerinden üretilir.
      const base64 = await generateSlideImage(prompt);
      slide.image = base64;
      slide.imagePrompt = prompt;
    } catch {
      // Return unchanged on image error
    }
    return JSON.stringify({ slides });
  }

  if (target === "content") {
    // Hem başlık hem gövde: LLM (getSlidesArtifactModel) ile güncelle.
    const contentPrompt = `Update only the body text (and optionally the title) of this slide. Current title: "${slide.title}". Current body: "${slide.body}". User request: ${prompt}. Reply with a JSON object: { "title": "string", "body": "string" }. Keep the same title unless the user asks to change it.`;
    try {
      const { object } = await generateObject({
        model: getSlidesArtifactModel(),
        system:
          "You output only valid JSON. No markdown, no explanation.",
        prompt: contentPrompt,
        schema: z.object({ title: z.string(), body: z.string() }),
      });
      slide.title = object?.title ?? slide.title;
      slide.body = object?.body ?? slide.body;
    } catch {
      // Keep existing on LLM error
    }
    return JSON.stringify({ slides });
  }

  if (target === "title") {
    try {
      // Sadece başlık: LLM ile güncelle.
      const { object } = await generateObject({
        model: getSlidesArtifactModel(),
        system:
          "You output only valid JSON. No markdown, no explanation. Return a single string in a key 'title'.",
        prompt: `Update the slide title. Current title: "${slide.title}". User request: ${prompt}. Reply with JSON: { "title": "string" }.`,
        schema: z.object({ title: z.string() }),
      });
      slide.title = object?.title ?? slide.title;
    } catch {
      // Keep existing on LLM error
    }
    return JSON.stringify({ slides });
  }

  if (target === "body") {
    try {
      // Sadece gövde metni: LLM ile güncelle.
      const { object } = await generateObject({
        model: getSlidesArtifactModel(),
        system:
          "You output only valid JSON. No markdown, no explanation. Return a single string in a key 'body'.",
        prompt: `Update the slide body. Current body: "${slide.body}". User request: ${prompt}. Reply with JSON: { "body": "string" }.`,
        schema: z.object({ body: z.string() }),
      });
      slide.body = object?.body ?? slide.body;
    } catch {
      // Keep existing on LLM error
    }
    return JSON.stringify({ slides });
  }

  return documentContent ?? "";
}

// Verilen index'teki slaytın id'sini döner (hedefli güncelleme için).
export function resolveSlideIdFromIndex(
  documentContent: string | null,
  slideIndex: number
): string | null {
  if (slideIndex < 0) return null;
  let slides: Array<SlideWithImage & { id?: string }> = [];
  try {
    if (documentContent) {
      const parsed = JSON.parse(documentContent) as { slides?: typeof slides };
      slides = Array.isArray(parsed?.slides) ? parsed.slides : [];
    }
  } catch {
    return null;
  }
  ensureSlideIds(slides);
  return slides[slideIndex]?.id ?? null;
}
