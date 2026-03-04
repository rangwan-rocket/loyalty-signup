import React from "react";
import type { MerchantConfig, PersonaConfig } from "../types";
import { StepHeader } from "../components/StepHeader";
import { Button } from "../components/Button";
import { styles } from "../styles/theme";

interface PersonaScreenProps {
  config: MerchantConfig;
  persona: PersonaConfig;
  currentStep: number;
  totalSteps: number;
  loading: boolean;
  onClose?: () => void;
  onBack: () => void;
  onSelect: (personaId: string) => void;
  onNext: () => void;
}

function PersonaAvatar({ src, name, size = 80 }: { src: string | null | undefined; name: string | null | undefined; size?: number }) {
  const displayName = name ?? "?";
  if (src) {
    return (
      <img
        src={src}
        alt={displayName}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#f0f0f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 700,
        color: "#999",
      }}
    >
      {displayName.charAt(0).toUpperCase()}
    </div>
  );
}

export function PersonaScreen({
  config,
  persona,
  currentStep,
  totalSteps,
  loading,
  onClose,
  onBack,
  onSelect,
  onNext,
}: PersonaScreenProps) {
  const allPersonas = persona.persona_groups.flatMap((g) => g.personas ?? []);
  const selected = persona.selected_persona_id;

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
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
          Please Select Member Type
        </h3>

        <div style={styles.personaGrid}>
          {allPersonas.map((p: any) => {
            const pid = p.id;
            const pname = p.name ?? p.persona_name ?? "Unknown";
            const pimg = p.image_url ?? p.image ?? null;
            const isSelected = selected === pid;
            return (
              <div key={pid} style={styles.personaCard} onClick={() => onSelect(pid)}>
                {isSelected && <div style={styles.personaCheck}>✓</div>}
                <div
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: "50%",
                    border: `3px solid ${isSelected ? "var(--ls-primary)" : "transparent"}`,
                    transition: "border-color 0.2s",
                    padding: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    boxSizing: "border-box",
                  }}
                >
                  <PersonaAvatar src={pimg} name={pname} />
                </div>
                <span style={styles.personaName}>{pname}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ ...styles.footer, position: "sticky", bottom: 0, background: "var(--ls-bg, #fff)" }}>
        <Button onClick={onNext} disabled={!selected} loading={loading}>
          Next
        </Button>
      </div>
    </div>
  );
}
