"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { CompanyTagEditor, TagBadge } from "@/components/investor/company-tag-editor";

type Props = {
  companyId: string;
  stage: string | null;
  industry: string | null;
  businessModel: string | null;
};

export function CompanyTagEditorWrapper({
  companyId,
  stage: initialStage,
  industry: initialIndustry,
  businessModel: initialBusinessModel,
}: Props) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [stage, setStage] = React.useState(initialStage);
  const [industry, setIndustry] = React.useState(initialIndustry);
  const [businessModel, setBusinessModel] = React.useState(initialBusinessModel);

  const hasTags = stage || industry || businessModel;

  return (
    <div className="rounded-xl border border-border-default bg-bg-elevated p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Company Tags</div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-default bg-bg-elevated px-3 text-xs font-medium text-text-primary hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
          type="button"
        >
          <Pencil className="h-3 w-3" />
          {isEditing ? "Close" : "Edit"}
        </button>
      </div>

      {!isEditing && (
        <div className="mt-3 flex flex-wrap gap-2">
          {hasTags ? (
            <>
              <TagBadge label="Stage" value={stage} />
              <TagBadge label="Industry" value={industry} />
              <TagBadge label="Model" value={businessModel} />
            </>
          ) : (
            <span className="text-sm text-text-tertiary">No tags set. Click Edit to add tags.</span>
          )}
        </div>
      )}

      {isEditing && (
        <div className="mt-4 border-t border-border-default pt-4">
          <CompanyTagEditor
            companyId={companyId}
            stage={stage}
            industry={industry}
            businessModel={businessModel}
            onSaved={(newTags) => {
              setStage(newTags.stage);
              setIndustry(newTags.industry);
              setBusinessModel(newTags.businessModel);
              setIsEditing(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
