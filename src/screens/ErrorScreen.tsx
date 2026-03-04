import React from "react";
import { Button } from "../components/Button";
import { styles } from "../styles/theme";

interface ErrorScreenProps {
  message: string;
  onRetry: () => void;
  onClose?: () => void;
}

export function ErrorScreen({ message, onRetry, onClose }: ErrorScreenProps) {
  return (
    <>
      <div style={styles.header}>
        <span style={styles.stepTitle}>Error</span>
        {onClose && (
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
            &times;
          </button>
        )}
      </div>
      <div
        style={{
          ...styles.body,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 240,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <p style={{ color: "#D32F2F", fontSize: 15, marginBottom: 24 }}>{message}</p>
        <Button onClick={onRetry}>Try Again</Button>
      </div>
    </>
  );
}
