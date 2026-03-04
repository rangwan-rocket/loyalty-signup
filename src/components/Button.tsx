import React from "react";
import { styles } from "../styles/theme";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  loading?: boolean;
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  loading,
}: ButtonProps) {
  const base = variant === "primary" ? styles.primaryBtn : styles.secondaryBtn;
  const style = {
    ...base,
    ...(disabled || loading ? styles.primaryBtnDisabled : {}),
  };

  return (
    <button style={style} onClick={onClick} disabled={disabled || loading}>
      {loading ? <span style={styles.spinner} /> : children}
    </button>
  );
}
