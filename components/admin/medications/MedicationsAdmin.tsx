"use client";

import { useState } from "react";
import { CategoryManager } from "./CategoryManager";
import { FieldManager } from "./FieldManager";
import { ImportPanel } from "./ImportPanel";
import { MedicationsAdminList } from "./MedicationsAdminList";
import type { MedicationCategory, MedicationField, MedicationWithCategories } from "@/lib/supabase/types";

type Tab = "medications" | "categories" | "fields" | "import";

// Top-level admin screen for a 'medications'-type section: three
// sub-panels (drugs / category tabs / field schema) switched with a
// segmented control, rather than separate routes -- keeps everything
// about this one feature in one place.
export function MedicationsAdmin({
  sectionSlug,
  fields,
  categories,
  medications,
}: {
  sectionSlug: string;
  fields: MedicationField[];
  categories: MedicationCategory[];
  medications: MedicationWithCategories[];
}) {
  const [tab, setTab] = useState<Tab>("medications");

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        <TabButton active={tab === "medications"} onClick={() => setTab("medications")}>
          תרופות ({medications.length})
        </TabButton>
        <TabButton active={tab === "categories"} onClick={() => setTab("categories")}>
          קטגוריות ({categories.length})
        </TabButton>
        <TabButton active={tab === "fields"} onClick={() => setTab("fields")}>
          שדות ({fields.length})
        </TabButton>
        <TabButton active={tab === "import"} onClick={() => setTab("import")}>
          ייבוא מ-PDF
        </TabButton>
      </div>

      {tab === "medications" && (
        <MedicationsAdminList
          sectionSlug={sectionSlug}
          fields={fields}
          categories={categories}
          medications={medications}
        />
      )}
      {tab === "categories" && <CategoryManager sectionSlug={sectionSlug} categories={categories} />}
      {tab === "fields" && <FieldManager sectionSlug={sectionSlug} fields={fields} />}
      {tab === "import" && (
        <ImportPanel sectionSlug={sectionSlug} fields={fields} categories={categories} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
      }`}
    >
      {children}
    </button>
  );
}
