// document.content (JSON string) → SlidesContent; hata durumunda boş slides döner.
import type { SlidesContent } from "@/lib/types";

export function parseSlidesContent(content: string): SlidesContent {
  if (!content?.trim()) {
    return { slides: [] };
  }
  try {
    const parsed = JSON.parse(content) as SlidesContent;
    const slides = Array.isArray(parsed?.slides) ? parsed.slides : [];
    return { slides };
  } catch {
    return { slides: [] };
  }
}

// Liste key'i: slide.id varsa onu, yoksa index tabanlı key kullanır.
export function slideKey(
  slide: SlidesContent["slides"][number],
  index: number
): string {
  return slide.id ?? `slide-${index}`;
}
