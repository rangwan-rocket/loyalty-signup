import React, { useState } from "react";
import type { MerchantConfig, FieldGroup, FormField } from "../types";
import { StepHeader } from "../components/StepHeader";
import { Button } from "../components/Button";
import { styles } from "../styles/theme";

interface ProfileScreenProps {
  config: MerchantConfig;
  groups: FieldGroup[];
  currentStep: number;
  totalSteps: number;
  loading: boolean;
  onClose?: () => void;
  onBack: () => void;
  onFieldChange: (groupId: string, fieldKey: string, value: string | string[] | null) => void;
  onNext: () => void;
}

const DEFAULT_FIELD_OPTIONS: Record<string, { value: string; label: string }[]> = {
  gender: [
    { value: "male", label: "ชาย (Male)" },
    { value: "female", label: "หญิง (Female)" },
    { value: "other", label: "อื่นๆ (Other)" },
  ],
};

function hasValidLabels(opts: { label?: string | null }[]): boolean {
  return opts.some((o) => o.label != null && o.label !== "");
}

function getOptions(field: FormField): { value: string; label: string }[] {
  if (field.options?.length) {
    const mapped = field.options.map((o) => ({
      value: o.option_value,
      label: o.option_label,
    }));
    if (hasValidLabels(mapped)) return mapped;
  }
  if (field.field_options?.length) {
    const mapped = field.field_options.map((o) => ({ value: o.value, label: o.label }));
    if (hasValidLabels(mapped)) return mapped;
  }
  if (DEFAULT_FIELD_OPTIONS[field.field_key]) {
    return DEFAULT_FIELD_OPTIONS[field.field_key];
  }
  return [];
}

function getFieldOrder(field: FormField): number {
  return field.sort_order ?? field.order_index ?? 0;
}

function isSelectType(field: FormField): boolean {
  const t = field.field_type?.toLowerCase();
  return (
    t === "select" ||
    t === "single_select" ||
    t === "single-select" ||
    t === "multi_select" ||
    t === "multi-select" ||
    t === "radio"
  );
}

function isDateType(field: FormField): boolean {
  const t = field.field_type?.toLowerCase();
  return t === "date" || field.text_format === "date";
}

function FieldInput({
  field,
  groupId,
  onChange,
}: {
  field: FormField;
  groupId: string;
  onChange: (groupId: string, fieldKey: string, value: string | null) => void;
}) {
  const [showOptions, setShowOptions] = useState(false);
  const options = getOptions(field);

  if (isSelectType(field) && options.length > 0) {
    const selectedLabel = options.find(
      (o) => o.value === field.value,
    )?.label;
    return (
      <div>
        <div style={styles.fieldRow} onClick={() => setShowOptions(!showOptions)}>
          <span style={styles.fieldLabel}>
            {field.label}
            {field.is_required && <span style={{ color: "var(--ls-primary)" }}>*</span>}
          </span>
          <span style={selectedLabel ? styles.fieldValueFilled : styles.fieldValue}>
            {selectedLabel ?? field.placeholder ?? "Select"} ›
          </span>
        </div>
        {showOptions && (
          <div
            style={{
              padding: "4px 0 4px 16px",
              borderBottom: "1px solid #f0f0f0",
              maxHeight: 200,
              overflow: "auto",
            }}
          >
            {options.map((opt) => (
              <div
                key={opt.value}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  borderRadius: 8,
                  background: field.value === opt.value ? "rgba(var(--ls-primary-rgb, 0,0,0), 0.05)" : "transparent",
                  fontWeight: field.value === opt.value ? 600 : 400,
                  fontSize: 14,
                }}
                onClick={() => {
                  onChange(groupId, field.field_key, opt.value);
                  setShowOptions(false);
                }}
              >
                {field.value === opt.value && "✓ "}{opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isDateType(field)) {
    return (
      <div style={styles.fieldRow}>
        <span style={styles.fieldLabel}>
          {field.label}
          {field.is_required && <span style={{ color: "var(--ls-primary)" }}>*</span>}
        </span>
        <input
          type="date"
          value={(field.value as string) ?? ""}
          onChange={(e) => onChange(groupId, field.field_key, e.target.value || null)}
          style={{
            border: "none",
            background: "transparent",
            fontSize: 15,
            color: field.value ? "var(--ls-text)" : "#999",
            textAlign: "right" as const,
            outline: "none",
          }}
        />
      </div>
    );
  }

  // Default: text / email / normal / free_text
  const inputType =
    field.field_type === "email" || field.text_format === "email"
      ? "email"
      : field.field_type === "phone" || field.field_type === "tel" || field.text_format === "phone"
        ? "tel"
        : "text";

  return (
    <div style={styles.fieldRow}>
      <span style={styles.fieldLabel}>
        {field.label}
        {field.is_required && <span style={{ color: "var(--ls-primary)" }}>*</span>}
      </span>
      <input
        type={inputType}
        placeholder={field.placeholder ?? `${field.label}`}
        value={(field.value as string) ?? ""}
        onChange={(e) => onChange(groupId, field.field_key, e.target.value || null)}
        style={{
          border: "none",
          background: "transparent",
          fontSize: 15,
          color: "var(--ls-text)",
          textAlign: "right" as const,
          outline: "none",
          width: "55%",
        }}
      />
    </div>
  );
}

export function ProfileScreen({
  config,
  groups,
  currentStep,
  totalSteps,
  loading,
  onClose,
  onBack,
  onFieldChange,
  onNext,
}: ProfileScreenProps) {
  const allFields = groups.flatMap((g) => g.fields);
  const requiredFilled = allFields
    .filter((f) => f.is_required)
    .every((f) => f.value !== null && f.value !== "" && f.value !== undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "80vh" }}>
      <StepHeader
        logoUrl={config.merchant_logo_url}
        merchantName={config.merchant_name}
        currentStep={currentStep}
        totalSteps={totalSteps}
        onClose={onClose}
        onBack={onBack}
        showBack
      />

      <div style={{ ...styles.body, flex: 1, overflow: "auto", paddingBottom: 8 }}>
        {groups.map((group) => (
          <div key={group.id}>
            {group.fields
              .sort((a, b) => getFieldOrder(a) - getFieldOrder(b))
              .map((field) => (
                <FieldInput
                  key={field.field_key}
                  field={field}
                  groupId={group.id}
                  onChange={onFieldChange}
                />
              ))}
          </div>
        ))}
      </div>

      <div style={{ ...styles.footer, position: "sticky", bottom: 0, background: "var(--ls-bg, #fff)" }}>
        {!requiredFilled && (
          <div style={{ fontSize: 12, color: "#999", textAlign: "center", marginBottom: 8 }}>
            Please fill all required fields (*)
          </div>
        )}
        <Button onClick={onNext} disabled={!requiredFilled} loading={loading}>
          Next
        </Button>
      </div>
    </div>
  );
}
