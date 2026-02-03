"use client";

/**
 * Slayt sağ panel içeriği: sol liste, sağda seçili slayt (başlık / metin / görsel).
 * Başlık, metin veya görsele tıklanınca modal açılır; onDirectUpdate ile update-slide-element API çağrılır.
 */
import { useState } from "react";
import { DocumentSkeleton } from "@/components/document-skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { parseSlidesContent, slideKey } from "./parse-slides-content";
import { cn } from "@/lib/utils";

type EditTarget = "title" | "body" | "image";

type SlidesContentComponentProps = {
  content: string;
  documentId?: string;
  status: "streaming" | "idle";
  isLoading: boolean;
  currentVersionIndex: number;
  isCurrentVersion: boolean;
  getDocumentContentById: (index: number) => string;
  mode: "edit" | "diff";
  onDirectUpdate?: (
    documentId: string,
    payload: { slideId: string; target: EditTarget; prompt: string }
  ) => Promise<string | null>;
  onSaveContent: (updatedContent: string, debounce: boolean) => void;
  sendMessage?: (message: {
    role: "user";
    parts: Array<{ type: "text"; text: string }>;
  }) => void;
};

const EDIT_TARGET_LABELS: Record<EditTarget, string> = {
  title: "Başlığı güncelle",
  body: "Metni güncelle",
  image: "Görseli güncelle",
};

export function SlidesContentComponent({
  content,
  documentId,
  status,
  isLoading,
  currentVersionIndex,
  isCurrentVersion,
  getDocumentContentById,
  mode,
  onDirectUpdate,
  sendMessage,
}: SlidesContentComponentProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const displayContent = isCurrentVersion
    ? content
    : getDocumentContentById(currentVersionIndex);
  const { slides } = parseSlidesContent(displayContent);

  if (isLoading) {
    return <DocumentSkeleton artifactKind="slides" />;
  }

  if (mode === "diff") {
    const oldContent = getDocumentContentById(currentVersionIndex - 1);
    const oldSlides = parseSlidesContent(oldContent).slides;
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <h3 className="font-medium">Previous version</h3>
        <div className="flex flex-col gap-2 rounded-md border p-4 text-sm">
          {oldSlides.map((s, i) => (
            <div key={`old-${slideKey(s, i)}`}>
              <div className="font-medium">{s.title}</div>
              {s.image ? (
                <img
                  alt={s.title}
                  className="my-2 max-h-48 rounded object-contain"
                  src={`data:image/png;base64,${s.image}`}
                />
              ) : null}
              <div className="text-muted-foreground">{s.body}</div>
            </div>
          ))}
        </div>
        <h3 className="font-medium">Current version</h3>
        <div className="flex flex-col gap-2 rounded-md border p-4 text-sm">
          {slides.map((s, i) => (
            <div key={`cur-${slideKey(s, i)}`}>
              <div className="font-medium">{s.title}</div>
              {s.image ? (
                <img
                  alt={s.title}
                  className="my-2 max-h-48 rounded object-contain"
                  src={`data:image/png;base64,${s.image}`}
                />
              ) : null}
              <div className="text-muted-foreground">{s.body}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
        {status === "streaming" ? "Creating slides…" : "No slides yet."}
      </div>
    );
  }

  const clampedIndex = Math.min(selectedIndex, slides.length - 1);
  const selectedSlide = slides[clampedIndex];
  const canEdit = Boolean(
    (onDirectUpdate ?? sendMessage) &&
      isCurrentVersion &&
      documentId &&
      documentId !== "init"
  );

  const openEditModal = (target: EditTarget) => {
    setEditTarget(target);
    setEditPrompt("");
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    const prompt = editPrompt.trim();
    if (!prompt || !editTarget || !selectedSlide.id) {
      return;
    }

    if (onDirectUpdate && documentId) {
      setIsSubmitting(true);
      try {
        await onDirectUpdate(documentId, {
          slideId: selectedSlide.id,
          target: editTarget,
          prompt,
        });
        setEditModalOpen(false);
        setEditTarget(null);
        setEditPrompt("");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (sendMessage) {
      const description = `For slide ${clampedIndex + 1} (title: "${selectedSlide.title}"), apply: ${prompt}. Target: ${editTarget} only.`;
      const messageText = `Do NOT create new slides. Call updateDocument only, with id "${documentId}" and description: ${description}`;
      sendMessage({
        role: "user",
        parts: [{ type: "text", text: messageText }],
      });
    }
    setEditModalOpen(false);
    setEditTarget(null);
    setEditPrompt("");
  };

  const handleEditKeyDown = (target: EditTarget) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (canEdit) {
        openEditModal(target);
      }
    }
  };

  return (
    <ResizablePanelGroup
      className="h-full min-h-0 flex-1"
      direction="horizontal"
    >
      <ResizablePanel defaultSize={18} maxSize={24} minSize={15}>
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-2 p-2">
            {slides.map((slide, i) => (
              <button
                className={cn(
                  "flex flex-col gap-1 rounded-md border border-border bg-background p-2 text-left text-sm transition-colors",
                  i === clampedIndex
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "hover:bg-muted"
                )}
                key={slideKey(slide, i)}
                onClick={() => setSelectedIndex(i)}
                type="button"
              >
                {slide.image ? (
                  <img
                    alt=""
                    className="aspect-video w-full rounded object-cover"
                    src={`data:image/png;base64,${slide.image}`}
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center rounded bg-muted text-muted-foreground text-xs">
                    {i + 1}
                  </div>
                )}
                <span className="line-clamp-2 font-medium">
                  {slide.title || `Slide ${i + 1}`}
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={75} minSize={40}>
        <div className="flex min-h-0 items-start justify-center p-2">
          <div
            className={cn(
              "flex w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-background",
              "h-[70vh] min-h-[240px]"
            )}
          >
            <h2
              className={cn(
                "shrink-0 border-b border-border px-4 py-3 text-center text-lg font-semibold text-foreground",
                canEdit &&
                  "cursor-pointer rounded ring-border transition-shadow hover:ring-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              )}
              onClick={() => canEdit && openEditModal("title")}
              onKeyDown={handleEditKeyDown("title")}
              role={canEdit ? "button" : undefined}
              tabIndex={canEdit ? 0 : undefined}
              title={canEdit ? EDIT_TARGET_LABELS.title : undefined}
            >
              {selectedSlide.title}
            </h2>
            <ResizablePanelGroup
              className="min-h-0 flex-1"
              direction="horizontal"
            >
              <ResizablePanel defaultSize={50} minSize={25}>
                <div
                  className={cn(
                    "h-full",
                    canEdit &&
                      "cursor-pointer rounded ring-border transition-shadow hover:ring-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                  )}
                  onClick={() => canEdit && openEditModal("body")}
                  onKeyDown={handleEditKeyDown("body")}
                  role={canEdit ? "button" : undefined}
                  tabIndex={canEdit ? 0 : undefined}
                  title={canEdit ? EDIT_TARGET_LABELS.body : undefined}
                >
                  <ScrollArea className="h-full p-4">
                    <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {selectedSlide.body}
                    </div>
                  </ScrollArea>
                </div>
              </ResizablePanel>
              <ResizableHandle className="bg-border" withHandle />
              <ResizablePanel defaultSize={50} minSize={25}>
                <div
                  className={cn(
                    "flex h-full min-h-[120px] items-center justify-center",
                    canEdit &&
                      "cursor-pointer rounded ring-border transition-shadow hover:ring-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                  )}
                  onClick={() => canEdit && openEditModal("image")}
                  onKeyDown={handleEditKeyDown("image")}
                  role={canEdit ? "button" : undefined}
                  tabIndex={canEdit ? 0 : undefined}
                  title={canEdit ? EDIT_TARGET_LABELS.image : undefined}
                >
                  {selectedSlide.image ? (
                    <ScrollArea className="h-full w-full p-4">
                      <img
                        alt={selectedSlide.title}
                        className="h-full w-full rounded object-contain"
                        src={`data:image/png;base64,${selectedSlide.image}`}
                      />
                    </ScrollArea>
                  ) : (
                    <div className="rounded border border-dashed border-border p-4 text-muted-foreground text-sm">
                      Görsel yok
                    </div>
                  )}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </ResizablePanel>

      <Dialog onOpenChange={setEditModalOpen} open={editModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? EDIT_TARGET_LABELS[editTarget] : ""}
            </DialogTitle>
            <DialogDescription>
              Slayt {clampedIndex + 1} ({selectedSlide.title}) için prompt
              yazın. LLM bu slaytın{" "}
              {editTarget === "image"
                ? "görselini"
                : editTarget === "title"
                  ? "başlığını"
                  : "metnini"}{" "}
              buna göre güncelleyecek.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label="Güncelleme promptu"
            className="min-h-[100px] resize-y"
            onChange={(e) => setEditPrompt(e.target.value)}
            placeholder={
              editTarget === "image"
                ? "Örn: Daha renkli bir görsel, gün batımı temalı..."
                : editTarget === "title"
                  ? "Örn: Daha kısa bir başlık..."
                  : "Örn: Daha fazla madde ekle, daha teknik yap..."
            }
            value={editPrompt}
          />
          <DialogFooter>
            <Button
              onClick={() => setEditModalOpen(false)}
              type="button"
              variant="outline"
            >
              İptal
            </Button>
            <Button
              disabled={!editPrompt.trim() || isSubmitting}
              onClick={handleEditSubmit}
              type="button"
            >
              {isSubmitting ? "Güncelleniyor…" : "Güncelle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ResizablePanelGroup>
  );
}
