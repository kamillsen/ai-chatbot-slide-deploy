import "server-only";
import { generateImage } from "ai";
import { getImageModel } from "./providers";

/**
 * Slayt görseli üretir: metin prompt'u ile yapılandırılmış görsel modeli (AI Gateway) kullanır.
 * document.content içinde saklamak için data URL öneki olmadan base64 döner.
 */
export async function generateSlideImage(prompt: string): Promise<string> {
  const model = getImageModel();
  const { image } = await generateImage({
    model,
    prompt: prompt.trim() || "A simple illustration.",
  });
  return image.base64;
}
