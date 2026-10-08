"use client";

import { createContext, useCallback, useContext, useRef, type ReactNode } from "react";
import { useConfirmDialog } from "@/components/ConfirmDialog";

type UnsavedChangesContextValue = {
  setDirty: (dirty: boolean) => void;
  confirmNavigation: () => Promise<boolean>;
};

// No-op default (not null): BackButton is also used from
// app/admin/layout.tsx's own separate header, which has no provider --
// it should keep navigating normally there rather than crash, since that
// layout has nothing comparable to guard.
const noopGuard: UnsavedChangesContextValue = {
  setDirty: () => {},
  confirmNavigation: () => Promise.resolve(true),
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue>(noopGuard);

// Covers in-app navigation (drawer links, the back button, a search
// result click) with a confirm prompt when the current page has unsaved
// edits -- components/handoff/HandoffBoard.tsx's beforeunload guard only
// catches leaving the page/tab entirely (close, refresh, typed URL); it
// never fires for Next's client-side navigation. A ref, not state: this
// is read imperatively at the moment of a navigation attempt, never used
// to drive a render, so there's no reason to pay for one.
export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const dirtyRef = useRef(false);
  const { confirm, dialog } = useConfirmDialog();

  const setDirty = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  const confirmNavigation = useCallback(() => {
    if (!dirtyRef.current) return Promise.resolve(true);
    return confirm({
      title: "לצאת מהעמוד?",
      description: "יש שינויים שלא נשמרו בעמוד הזה. אם תצאו עכשיו, הם יאבדו.",
      confirmLabel: "יציאה בכל זאת",
      danger: true,
    });
  }, [confirm]);

  return (
    <UnsavedChangesContext.Provider value={{ setDirty, confirmNavigation }}>
      {children}
      {dialog}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChangesGuard() {
  return useContext(UnsavedChangesContext);
}
