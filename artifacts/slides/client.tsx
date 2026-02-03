"use client";

// Slayt artifact: chat'ta createDocument(slides) sonrası önizleme + sağ panel; data-slidesDelta ile stream.
import { Artifact } from "@/components/create-artifact";
import { RedoIcon, SparklesIcon, UndoIcon } from "@/components/icons";
import { SlidesContentComponent } from "@/components/ui-slide";

type Metadata = Record<string, never>;

export const slidesArtifact = new Artifact<"slides", Metadata>({
  kind: "slides",
  description: "Useful for creating slide decks and presentations",
  initialize: () => undefined,
  onStreamPart: ({ setArtifact, streamPart }) => {
    // Sunucudan gelen slayt JSON'u; paneli açıp içeriği günceller.
    if (streamPart.type === "data-slidesDelta") {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible: true,
        status: "streaming",
      }));
    }
  },
  content: (props) => <SlidesContentComponent {...props} />,
  actions: [
    {
      icon: <UndoIcon size={18} />,
      description: "View previous version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
      isDisabled: ({ currentVersionIndex }) => currentVersionIndex <= 0,
    },
    {
      icon: <RedoIcon size={18} />,
      description: "View next version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
      isDisabled: ({ isCurrentVersion }) => isCurrentVersion,
    },
  ],
  toolbar: [
    {
      description: "Improve or expand slides",
      icon: <SparklesIcon />,
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "Please improve or expand the slides in this deck.",
            },
          ],
        });
      },
    },
  ],
});
