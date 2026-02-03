/**
 * Slayt tek öğe güncelleme API'si: documentId + slideId + target (title|body|image|content) + prompt.
 * Sadece belirtilen slaytın belirtilen alanını günceller; saveDocument ile yeni versiyon yazılır.
 */
import { auth } from "@/app/(auth)/auth";
import { updateSlidesTargeted } from "@/artifacts/slides/slides-update";
import type { SlideUpdateTarget } from "@/artifacts/slides/slides-update";
import { getDocumentById, saveDocument } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

const TARGETS: SlideUpdateTarget[] = ["title", "body", "image", "content"];

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:document").toResponse();
  }

  let body: {
    documentId?: string;
    slideId?: string;
    target?: string;
    prompt?: string;
  };

  try {
    body = await request.json();
  } catch {
    return new ChatSDKError(
      "bad_request:api",
      "Invalid JSON body"
    ).toResponse();
  }

  const { documentId, slideId, target, prompt } = body;

  if (!documentId || typeof documentId !== "string") {
    return new ChatSDKError(
      "bad_request:api",
      "documentId is required"
    ).toResponse();
  }

  if (!slideId || typeof slideId !== "string") {
    return new ChatSDKError(
      "bad_request:api",
      "slideId is required"
    ).toResponse();
  }

  if (
    !target ||
    typeof target !== "string" ||
    !TARGETS.includes(target as SlideUpdateTarget)
  ) {
    return new ChatSDKError(
      "bad_request:api",
      `target must be one of: ${TARGETS.join(", ")}`
    ).toResponse();
  }

  if (!prompt || typeof prompt !== "string") {
    return new ChatSDKError(
      "bad_request:api",
      "prompt is required"
    ).toResponse();
  }

  const document = await getDocumentById({ id: documentId });

  if (!document) {
    return new ChatSDKError("not_found:document").toResponse();
  }

  if (document.userId !== session.user.id) {
    return new ChatSDKError("forbidden:document").toResponse();
  }

  if (document.kind !== "slides") {
    return new ChatSDKError(
      "bad_request:api",
      "Document is not a slides document"
    ).toResponse();
  }

  const newContent = await updateSlidesTargeted(
    document.content,
    slideId,
    target as SlideUpdateTarget,
    prompt.trim()
  );

  if (!newContent) {
    return new ChatSDKError(
      "bad_request:api",
      "Could not update slide (slideId not found or invalid)"
    ).toResponse();
  }

  await saveDocument({
    id: document.id,
    title: document.title,
    content: newContent,
    kind: "slides",
    userId: session.user.id,
  });

  return Response.json({ content: newContent }, { status: 200 });
}
