"use client";

import dynamic from "next/dynamic";
import type {
  BlockNode,
  ImageContent,
  PdfContent,
  RichTextContent,
  TabsContainerContent,
} from "@/lib/supabase/types";
import { RichTextBlock } from "./RichTextBlock";
import { ImageBlock } from "./ImageBlock";
import { TabsBlock } from "./TabsBlock";

// pdfjs-dist (used inside PdfBlock) assumes a browser environment and
// crashes ("Object.defineProperty called on non-object") if its module
// code runs during server rendering. `ssr: false` guarantees it's only
// ever imported in the browser, after hydration.
const PdfBlock = dynamic(() => import("./PdfBlock").then((m) => m.PdfBlock), {
  ssr: false,
  loading: () => <p className="p-4 text-sm text-neutral-500 dark:text-neutral-400">טוען PDF...</p>,
});

// Pure dispatch by block.type -- no data fetching of its own, so it's safe
// to render from any client-rendered tree (the resident page view, or
// TabsBlock recursing into its children).
export function BlockRenderer({ block }: { block: BlockNode }) {
  switch (block.type) {
    case "rich_text":
      return <RichTextBlock content={block.content as RichTextContent} />;
    case "image":
      return <ImageBlock content={block.content as ImageContent} />;
    case "pdf":
      return <PdfBlock content={block.content as PdfContent} />;
    case "tabs_container":
      return (
        <TabsBlock
          content={block.content as TabsContainerContent}
          childBlocks={block.children}
        />
      );
    default:
      return null;
  }
}
