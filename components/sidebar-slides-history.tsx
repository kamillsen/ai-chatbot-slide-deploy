"use client";

import { formatDistanceToNow } from "date-fns";
import type { User } from "next-auth";
import useSWR from "swr";
import { useArtifact } from "@/hooks/use-artifact";
import { fetcher } from "@/lib/utils";
import { FileIcon } from "@/components/icons";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type DocumentListItem = {
  id: string;
  title: string;
  createdAt: string;
  kind: string;
};

export function SidebarSlidesHistory({ user }: { user: User | undefined }) {
  const { setOpenMobile } = useSidebar();
  const { setArtifact } = useArtifact();

  const { data: documents, isLoading } = useSWR<DocumentListItem[]>(
    user ? "/api/documents?kind=slides" : null,
    fetcher
  );

  const handleOpenSlide = (doc: DocumentListItem) => {
    setArtifact({
      documentId: doc.id,
      kind: "slides",
      title: doc.title,
      content: "",
      isVisible: true,
      status: "idle",
      boundingBox: { top: 0, left: 0, width: 0, height: 0 },
    });
    setOpenMobile(false);
  };

  if (!user) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="flex w-full flex-row items-center justify-center gap-2 px-2 py-2 text-sm text-zinc-500">
            Slaytları görmek için giriş yapın.
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (isLoading) {
    return (
      <SidebarGroupContent>
        <div className="flex flex-col gap-2 px-2">
          {[1, 2, 3].map((i) => (
            <div
              className="h-8 animate-pulse rounded-md bg-sidebar-accent/20"
              key={i}
            />
          ))}
        </div>
      </SidebarGroupContent>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <SidebarGroupContent>
        <div className="flex w-full flex-row items-center justify-center gap-2 px-2 py-4 text-sm text-zinc-500">
          Henüz slayt yok.
        </div>
      </SidebarGroupContent>
    );
  }

  return (
    <SidebarGroupContent>
      <SidebarMenu>
        {documents.map((doc) => (
          <SidebarMenuItem key={doc.id}>
            <SidebarMenuButton
              className="cursor-pointer"
              onClick={() => handleOpenSlide(doc)}
              type="button"
            >
              <FileIcon size={16} />
              <span className="flex flex-col items-start gap-0 truncate">
                <span className="truncate">{doc.title}</span>
                <span className="text-sidebar-foreground/50 text-xs">
                  {formatDistanceToNow(new Date(doc.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroupContent>
  );
}
