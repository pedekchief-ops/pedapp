"use client";

import { useState } from "react";
import type { Block, BlockNode, MedicationField, MedicationFieldValue } from "@/lib/supabase/types";
import type { SearchHit } from "@/lib/search";

export function hitKey(hit: SearchHit): string {
  return `${hit.medicationId ?? hit.pageSlug}-${hit.blockId ?? "page"}`;
}

export type MedicationPreview = {
  fields: MedicationField[];
  values: Record<string, MedicationFieldValue>;
};

// Shared by SearchOverlay (full-screen modal) and HomeSearchBar (inline
// dropdown on the home page) -- both let a resident expand a result in
// place (a matched block rendered live, or a drug's full field list)
// instead of navigating away immediately. See hitKey: a title-only match
// (no blockId/medicationId) has nothing to preview, so callers should
// still navigate straight away for those rather than calling this.
export function useSearchPreview() {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [blockPreview, setBlockPreview] = useState<BlockNode | null>(null);
  const [medicationPreview, setMedicationPreview] = useState<MedicationPreview | null>(null);

  function resetPreview() {
    setExpandedKey(null);
    setBlockPreview(null);
    setMedicationPreview(null);
  }

  async function togglePreview(hit: SearchHit) {
    const key = hitKey(hit);
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(key);
    setBlockPreview(null);
    setMedicationPreview(null);
    setPreviewLoading(true);
    try {
      if (hit.blockId) {
        const res = await fetch(`/api/blocks/${hit.blockId}`);
        if (res.ok) {
          const block = (await res.json()) as Block;
          // Force collapsible off for the preview -- whatever state the
          // page itself uses it in, the point here is to show the match
          // immediately, not behind a toggle.
          setBlockPreview({ ...block, collapsible: false, children: [] });
        }
      } else if (hit.medicationId) {
        const res = await fetch("/api/medications");
        if (res.ok) {
          const data = await res.json();
          const medication = (
            data.medications as { id: string; values: Record<string, MedicationFieldValue> }[]
          ).find((m) => m.id === hit.medicationId);
          if (medication) {
            setMedicationPreview({ fields: data.fields, values: medication.values });
          }
        }
      }
    } finally {
      setPreviewLoading(false);
    }
  }

  return { expandedKey, previewLoading, blockPreview, medicationPreview, togglePreview, resetPreview };
}
