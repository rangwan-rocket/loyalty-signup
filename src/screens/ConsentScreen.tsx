import React, { useState } from "react";
import type { MerchantConfig, ConsentSection } from "../types";
import { StepHeader } from "../components/StepHeader";
import { Button } from "../components/Button";
import { styles } from "../styles/theme";

interface ConsentScreenProps {
  config: MerchantConfig;
  sections: ConsentSection[];
  currentStep: number;
  totalSteps: number;
  loading: boolean;
  onClose?: () => void;
  onBack: () => void;
  onAccept: (sectionId: string, accepted: boolean) => void;
  onAcceptOption: (sectionId: string, optionId: string, accepted: boolean) => void;
  onSubmit: () => void;
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function CheckCircle({ checked }: { checked: boolean }) {
  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: checked ? "var(--ls-primary, #4CAF50)" : "#e0e0e0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "background 0.2s",
      }}
    >
      {checked && (
        <span style={{ color: "#fff", fontSize: 14, fontWeight: 700, lineHeight: 1 }}>✓</span>
      )}
    </div>
  );
}

function SectionCard({
  section,
  expanded,
  onToggle,
  onAccept,
  onAcceptOption,
}: {
  section: ConsentSection;
  expanded: boolean;
  onToggle: () => void;
  onAccept: (sectionId: string, accepted: boolean) => void;
  onAcceptOption: (sectionId: string, optionId: string, accepted: boolean) => void;
}) {
  const isAccepted =
    section.interaction_type === "notice"
      ? true
      : section.interaction_type === "checkbox_options"
        ? section.options?.every((o) => o.isAccepted) ?? true
        : section.isAccepted;

  const rawPreview = stripHtml(section.body_html);
  const preview = rawPreview ? rawPreview.slice(0, 80) : "";

  return (
    <div style={{ borderBottom: "1px solid #f0f0f0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "16px 0",
          cursor: "pointer",
        }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (section.interaction_type === "notice") return;
            if (section.interaction_type === "checkbox_options") {
              const allChecked = section.options?.every((o) => o.isAccepted) ?? false;
              for (const opt of section.options ?? []) {
                onAcceptOption(section.id, opt.id, !allChecked);
              }
            } else {
              onAccept(section.id, !section.isAccepted);
            }
          }}
        >
          <CheckCircle checked={!!isAccepted} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }} onClick={onToggle}>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>
            {section.title}
          </div>
          {!expanded && preview.length > 0 && (
            <div
              style={{
                fontSize: 13,
                color: "#888",
                marginTop: 4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {preview}{rawPreview.length > 80 ? "..." : ""}
            </div>
          )}
        </div>
        <span
          style={{
            fontSize: 18,
            color: "#999",
            transition: "transform 0.2s",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
            marginTop: 2,
            cursor: "pointer",
          }}
          onClick={onToggle}
        >
          ▾
        </span>
      </div>

      {expanded && (
        <div style={{ paddingLeft: 36, paddingBottom: 16 }}>
          {section.body_html ? (
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: "#555",
                maxHeight: 200,
                overflow: "auto",
                marginBottom: 12,
              }}
              dangerouslySetInnerHTML={{ __html: section.body_html }}
            />
          ) : (
            <div style={{ fontSize: 13, color: "#aaa", marginBottom: 12 }}>
              ยังไม่มีเนื้อหา
            </div>
          )}

          {section.interaction_type === "text_content" && (
            <div
              style={styles.checkboxRow}
              onClick={(e) => {
                e.stopPropagation();
                onAccept(section.id, !section.isAccepted);
              }}
            >
              <div
                style={{
                  ...styles.checkbox,
                  ...(section.isAccepted ? styles.checkboxChecked : {}),
                }}
              >
                {section.isAccepted && "✓"}
              </div>
              <span style={{ fontSize: 14 }}>
                ยินยอม{section.is_mandatory ? " (จำเป็น)" : ""}
              </span>
            </div>
          )}

          {section.interaction_type === "checkbox_options" && (
            <div>
              {section.options?.map((opt) => (
                <div
                  key={opt.id}
                  style={styles.checkboxRow}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAcceptOption(section.id, opt.id, !opt.isAccepted);
                  }}
                >
                  <div
                    style={{
                      ...styles.checkbox,
                      ...(opt.isAccepted ? styles.checkboxChecked : {}),
                    }}
                  >
                    {opt.isAccepted && "✓"}
                  </div>
                  <span style={{ fontSize: 14 }}>{opt.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ConsentScreen({
  config,
  sections,
  currentStep,
  totalSteps,
  loading,
  onClose,
  onBack,
  onAccept,
  onAcceptOption,
  onSubmit,
}: ConsentScreenProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allMandatoryAccepted = sections
    .filter((s) => s.is_mandatory)
    .every((s) => {
      if (s.interaction_type === "notice") return true;
      if (s.interaction_type === "checkbox_options") {
        return s.options?.every((o) => o.isAccepted) ?? true;
      }
      return s.isAccepted;
    });

  const allAccepted = sections.every((s) => {
    if (s.interaction_type === "notice") return true;
    if (s.interaction_type === "checkbox_options") {
      return s.options?.every((o) => o.isAccepted) ?? true;
    }
    return s.isAccepted;
  });

  const handleAcceptAll = () => {
    const targetState = !allAccepted;
    for (const section of sections) {
      if (section.interaction_type === "checkbox_options") {
        for (const opt of section.options ?? []) {
          if (opt.isAccepted !== targetState) {
            onAcceptOption(section.id, opt.id, targetState);
          }
        }
      } else {
        if (section.isAccepted !== targetState) {
          onAccept(section.id, targetState);
        }
      }
    }
  };

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

      <div style={{ ...styles.body, flex: 1, overflow: "auto" }}>
        {sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            expanded={expandedId === section.id}
            onToggle={() =>
              setExpandedId(expandedId === section.id ? null : section.id)
            }
            onAccept={onAccept}
            onAcceptOption={onAcceptOption}
          />
        ))}

        <div
          style={{
            ...styles.checkboxRow,
            paddingTop: 16,
            marginTop: 4,
          }}
          onClick={handleAcceptAll}
        >
          <CheckCircle checked={allAccepted} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>ยินยอมทั้งหมด</span>
        </div>
      </div>

      <div style={{ ...styles.footer, position: "sticky", bottom: 0, background: "var(--ls-bg, #fff)" }}>
        <Button onClick={onSubmit} disabled={!allMandatoryAccepted} loading={loading}>
          Confirm
        </Button>
      </div>
    </div>
  );
}
