"use client";

import { useEffect } from "react";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import { artifactDefinitions } from "./artifact";
import { useDataStream } from "./data-stream-provider";
import { getChatHistoryPaginationKey } from "./sidebar-history";

export function DataStreamHandler() {
  const { dataStream, setDataStream } = useDataStream();
  const { mutate } = useSWRConfig();

  const { artifact, setArtifact, setMetadata } = useArtifact();

  useEffect(() => {
    if (!dataStream?.length) {
      return;
    }

    const newDeltas = dataStream.slice();
    setDataStream([]);

    let hadSlidesKindInBatch = false;
    let slidesFinishTimeoutId: ReturnType<typeof setTimeout> | undefined;

    for (const delta of newDeltas) {
      // Handle chat title updates
      if (delta.type === "data-chat-title") {
        mutate(unstable_serialize(getChatHistoryPaginationKey));
        continue;
      }
      const artifactDefinition = artifactDefinitions.find(
        (currentArtifactDefinition) =>
          currentArtifactDefinition.kind === artifact.kind
      );

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart: delta,
          setArtifact,
          setMetadata,
        });
      }

      if (delta.type === "data-kind" && delta.data === "slides") {
        hadSlidesKindInBatch = true;
      }
      // Slayt oluşturma bittiğinde sidebar Slides listesini yenile; sunucu kaydı gecikmeli olabilir, 2s sonra tekrar dene
      if (
        delta.type === "data-finish" &&
        (artifact.kind === "slides" || hadSlidesKindInBatch)
      ) {
        mutate("/api/documents?kind=slides");
        slidesFinishTimeoutId = setTimeout(() => {
          mutate("/api/documents?kind=slides");
        }, 2000);
      }

      setArtifact((draftArtifact) => {
        if (!draftArtifact) {
          return { ...initialArtifactData, status: "streaming" };
        }

        switch (delta.type) {
          case "data-id":
            return {
              ...draftArtifact,
              documentId: delta.data,
              status: "streaming",
            };

          case "data-title":
            return {
              ...draftArtifact,
              title: delta.data,
              status: "streaming",
            };

          case "data-kind":
            return {
              ...draftArtifact,
              kind: delta.data,
              status: "streaming",
            };

          case "data-clear":
            return {
              ...draftArtifact,
              content: "",
              status: "streaming",
            };

          case "data-finish":
            return {
              ...draftArtifact,
              status: "idle",
            };

          default:
            return draftArtifact;
        }
      });
    }

    return () => {
      if (slidesFinishTimeoutId !== undefined) {
        clearTimeout(slidesFinishTimeoutId);
      }
    };
  }, [dataStream, setArtifact, setMetadata, artifact, setDataStream, mutate]);

  return null;
}
