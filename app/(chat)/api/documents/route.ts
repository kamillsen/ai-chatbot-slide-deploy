import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getDocumentsByUserIdAndKind } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

/** Kullanıcının belirtilen kind'taki (örn. slides) son doküman listesini döner. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const kindParam = searchParams.get("kind") ?? "slides";
  const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);

  const session = await auth();
  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:document").toResponse();
  }

  if (kindParam !== "slides") {
    return new ChatSDKError(
      "bad_request:api",
      "Only kind=slides is supported"
    ).toResponse();
  }

  const documents = await getDocumentsByUserIdAndKind({
    userId: session.user.id,
    kind: "slides",
    limit,
  });

  return Response.json(documents, { status: 200 });
}
