"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { FeedbackDialog } from "./FeedbackDialog";

// Mounted once in AppChrome.tsx, so it's literally always on screen
// (that's the point) regardless of route. bottom-20 rather than the more
// usual bottom-4: the admin page editor has its own full-width fixed bar
// at bottom-0 (components/editor/PageEditor.tsx's publish button), and
// this needs to clear it there without needing route-aware positioning
// logic.
export function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 start-4 z-30 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground shadow-lg hover:opacity-90 sm:text-sm print:hidden"
      >
        <MessageSquarePlus size={16} />
        משוב/הצעות/הערות
      </button>
      {open && <FeedbackDialog onClose={() => setOpen(false)} />}
    </>
  );
}
