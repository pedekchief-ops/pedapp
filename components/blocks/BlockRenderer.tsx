"use client";

import type {
  BlockNode,
  DataTableContent,
  ImageContent,
  LinkButtonContent,
  PdfContent,
  RichTextContent,
  TabsContainerContent,
} from "@/lib/supabase/types";
import { RichTextBlock } from "./RichTextBlock";
import { ImageBlock } from "./ImageBlock";
import { PdfBlock } from "./PdfBlock";
import { TabsBlock } from "./TabsBlock";
import { LinkButtonBlock } from "./LinkButtonBlock";
import { DataTableBlock } from "./DataTableBlock";

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
    case "link_button":
      return <LinkButtonBlock content={block.content as LinkButtonContent} />;
    case "data_table":
      return <DataTableBlock content={block.content as DataTableContent} />;
    default:
      return null;
  }
}
