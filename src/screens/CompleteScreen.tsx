import React, { useEffect } from "react";
import type { UserData } from "../types";
import { styles } from "../styles/theme";

interface CompleteScreenProps {
  user: Partial<UserData>;
  isNewUser: boolean;
  onComplete?: (user: UserData) => void;
}

export function CompleteScreen({ user, isNewUser, onComplete }: CompleteScreenProps) {
  useEffect(() => {
    if (onComplete && user.id && user.access_token) {
      const timer = setTimeout(() => {
        onComplete(user as UserData);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [onComplete, user]);

  return (
    <div
      style={{
        ...styles.body,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 320,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--ls-primary), var(--ls-secondary))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
          fontSize: 32,
          color: "#fff",
        }}
      >
        ✓
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        {isNewUser ? "Welcome!" : "Welcome back!"}
      </h2>
      <p style={{ color: "#888", fontSize: 15 }}>
        {isNewUser
          ? "Your account has been created successfully."
          : "You're all set. Redirecting..."}
      </p>
    </div>
  );
}
