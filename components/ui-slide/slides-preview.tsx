"use client";

// Chat'taki kare önizleme kartında slayt listesi: başlıklar + küçük resimler.
import { parseSlidesContent, slideKey } from "./parse-slides-content";

/** Chat kartında slayt önizlemesi: üstte başlıklar alt alta, en altta resimler yan yana. */
export function SlidesPreview({ content }: { content: string }) {
  const { slides } = parseSlidesContent(content);
  return (
    <div className="flex flex-col gap-3 text-sm">
      {slides.length === 0 ? (
        <span className="text-muted-foreground">No slides yet.</span>
      ) : (
        <>
          {slides.slice(0, 5).map((s, i) => (
            <div className="truncate font-medium" key={slideKey(s, i)}>
              {s.title || "Untitled"}
            </div>
          ))}
          {slides.length > 5 ? (
            <span className="text-muted-foreground text-xs">
              +{slides.length - 5} more
            </span>
          ) : null}
          <div className="mt-1 flex flex-nowrap gap-1 overflow-hidden">
            {slides.map((s, i) =>
              s.image ? (
                <img
                  key={slideKey(s, i)}
                  alt=""
                  className="h-14 w-20 shrink-0 rounded object-cover"
                  src={`data:image/png;base64,${s.image}`}
                />
              ) : (
                <div
                  key={slideKey(s, i)}
                  className="flex h-14 w-20 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground text-xs"
                >
                  {i + 1}
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
