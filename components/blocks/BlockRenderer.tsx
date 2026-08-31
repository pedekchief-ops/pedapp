"use client";

import { ChevronDown } from "lucide-react";
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

// Falls back to a block-type-appropriate label when the admin left
// collapsible_label empty (see components/editor/BlockList.tsx) -- a
// collapsed block still needs *some* visible text to identify what's
// hidden behind it.
function defaultCollapsibleLabel(block: BlockNode): string {
  switch (block.type) {
    case "pdf": {
      const content = block.content as PdfContent;
      return content.title || content.original_filename || "קובץ PDF";
    }
    case "data_table":
      return "טבלה";
    case "image":
      return "תמונה";
    case "link_button":
      return (block.content as LinkButtonContent).label_he || "קישור";
    case "tabs_container":
      return "טאבים";
    default:
      return "תוכן";
  }
}

// Pure dispatch by block.type -- no data fetching of its own, so it's safe
// to render from any client-rendered tree (the resident page view, or
// TabsBlock recursing into its children).
export function BlockRenderer({ block }: { block: BlockNode }) {
  const content = renderBlockContent(block);
  if (!block.collapsible) return content;

  return (
    <details open={!block.default_collapsed} className="group">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-900 [&::-webkit-details-marker]:hidden dark:border-neutral-800 dark:text-neutral-50">
        <ChevronDown size={16} className="shrink-0 text-neutral-400 transition-transform group-open:-rotate-180" />
        {block.collapsible_label?.trim() || defaultCollapsibleLabel(block)}
      </summary>
      <div className="pt-3">{content}</div>
    </details>
  );
}

function renderBlockContent(block: BlockNode) {
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
