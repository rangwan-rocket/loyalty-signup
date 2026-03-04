import React from "react";
import { styles } from "../styles/theme";

interface StepHeaderProps {
  logoUrl: string | null;
  merchantName: string;
  currentStep: number;
  totalSteps: number;
  onClose?: () => void;
  onBack?: () => void;
  showBack?: boolean;
}

export function StepHeader({
  logoUrl,
  merchantName,
  currentStep,
  totalSteps,
  onClose,
  onBack,
  showBack,
}: StepHeaderProps) {
  return (
    <div style={styles.header}>
      <div style={styles.headerLeft}>
        {showBack && (
          <button style={styles.backBtn} onClick={onBack} aria-label="Back">
            &#8249;
          </button>
        )}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={merchantName}
            style={{
              height: 32,
              maxWidth: 80,
              objectFit: "contain",
              borderRadius: 6,
            }}
          />
        ) : (
          <span style={{ fontWeight: 700, fontSize: 14 }}>{merchantName}</span>
        )}
        <span style={styles.stepTitle}>
          Sign Up {currentStep}/{totalSteps}
        </span>
      </div>
      {onClose && (
        <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
          &times;
        </button>
      )}
    </div>
  );
}
