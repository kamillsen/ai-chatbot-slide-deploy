/**
 * Slayt artifact sunucu handler'ı:
 * - onCreateDocument: LLM ile slayt yapısı (title, body, imagePrompt) üretir, sonra her slayt için görsel üretir.
 * - onUpdateDocument: Tam güncelleme veya hedefli (tek slayt title/body/image) güncelleme.
 */
import { streamObject } from "ai";
import { z } from "zod";
import {
  ensureSlideIds,
  type SlideWithImage,
} from "@/artifacts/slides/slides-update";
import { generateSlideImage } from "@/lib/ai/image";
import { slidesPrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { getSlidesArtifactModel } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

// Slayt JSON şeması (streamObject için)
const slideSchema = z.object({
  title: z.string(),
  body: z.string(),
  imagePrompt: z
    .string()
    .optional()
    .describe("Short prompt to generate an image for this slide"),
});

const slidesSchema = z.object({
  slides: z.array(slideSchema),
});

// updateDocument description'dan hedefli güncelleme bilgisini çıkarır (slide index, target, prompt).
function parseTargetedDescription(description: string): {
  slideIndex: number;
  target: "image" | "content" | null;
  prompt: string;
} {
  const slideMatch = description.match(/For slide (\d+)/i);
  const targetMatch = description.match(/Target: (image|content) only/i);
  const applyStart = description.indexOf("apply: ");
  const applyEnd = description.indexOf(". Target:");
  const prompt =
    applyStart >= 0 && applyEnd > applyStart
      ? description.slice(applyStart + 7, applyEnd).trim()
      : "";
  const slideNum = slideMatch ? Number.parseInt(slideMatch[1], 10) : 0;
  const target = targetMatch
    ? (targetMatch[1].toLowerCase() as "image" | "content")
    : null;
  return { slideIndex: slideNum - 1, target, prompt };
}

export const slidesDocumentHandler = createDocumentHandler<"slides">({
  kind: "slides",
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = "";

    const { fullStream } = streamObject({
      model: getSlidesArtifactModel(),
      system: slidesPrompt,
      prompt: title,
      schema: slidesSchema,
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        const slides = object?.slides;

        if (Array.isArray(slides) && slides.length > 0) {
          ensureSlideIds(slides as Array<SlideWithImage & { id?: string }>);
          const json = JSON.stringify({ slides });
          dataStream.write({
            type: "data-slidesDelta",
            data: json,
            transient: true,
          });
          draftContent = json;
        }
      }
    }

    if (!draftContent) {
      return "";
    }

    const parsed = JSON.parse(draftContent) as {
      slides: Array<SlideWithImage & { id?: string }>;
    };
    const slidesForImages = parsed.slides ?? [];
    ensureSlideIds(slidesForImages);

    dataStream.write({
      type: "data-slidesDelta",
      data: JSON.stringify({ slides: slidesForImages }),
      transient: true,
    });

    // Her slayt için görsel üret (lib/ai/image.ts); UI'a data-slidesDelta ile yazılır.
    const imagePromises = slidesForImages.map(async (slide) => {
      const prompt = slide.imagePrompt?.trim() || slide.title?.trim();
      if (!prompt) {
        return;
      }
      try {
        const base64 = await generateSlideImage(prompt);
        slide.image = base64;
        dataStream.write({
          type: "data-slidesDelta",
          data: JSON.stringify({ slides: slidesForImages }),
          transient: true,
        });
      } catch {
        // Skip image for this slide on error
      }
    });
    await Promise.all(imagePromises);

    return JSON.stringify({ slides: slidesForImages });
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    const { updateSlidesTargeted, resolveSlideIdFromIndex } = await import(
      "@/artifacts/slides/slides-update"
    );
    const parsed = parseTargetedDescription(description);
    const isTargeted =
      parsed.target && parsed.prompt && parsed.slideIndex >= 0;

    if (isTargeted && parsed.target) {
      const slideId = resolveSlideIdFromIndex(
        document.content,
        parsed.slideIndex
      );
      if (!slideId) {
        return document.content ?? "";
      }
      const content = await updateSlidesTargeted(
        document.content,
        slideId,
        parsed.target,
        parsed.prompt
      );
      if (content) {
        dataStream.write({
          type: "data-slidesDelta",
          data: content,
          transient: true,
        });
        return content;
      }
    }

    let draftContent = "";
    const { fullStream } = streamObject({
      model: getSlidesArtifactModel(),
      system: updateDocumentPrompt(document.content, "slides"),
      prompt: description,
      schema: slidesSchema,
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        const slides = object?.slides;

        if (Array.isArray(slides) && slides.length > 0) {
          const json = JSON.stringify({ slides });
          dataStream.write({
            type: "data-slidesDelta",
            data: json,
            transient: true,
          });
          draftContent = json;
        }
      }
    }

    return draftContent;
  },
});
