import type {
  BlockNode,
  ImageContent,
  PdfContent,
  RichTextContent,
  TabsContainerContent,
} from "@/lib/supabase/types";
import { RichTextBlock } from "./RichTextBlock";
import { ImageBlock } from "./ImageBlock";
import { PdfBlock } from "./PdfBlock";
import { TabsBlock } from "./TabsBlock";

// Pure dispatch by block.type -- no data fetching of its own, so it's safe
// to render both from a Server Component (the page view, app/(resident)/...)
// and from a Client Component (TabsBlock, recursing into its children).
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
