import React from "react";
import { styles } from "../styles/theme";

export function LoadingScreen() {
  return (
    <div
      style={{
        ...styles.body,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 300,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            ...styles.spinner,
            width: 32,
            height: 32,
            borderColor: "#E91E63",
            borderTopColor: "transparent",
            margin: "0 auto 16px",
          }}
        />
        <div style={{ color: "#999", fontSize: 14 }}>Loading...</div>
      </div>
    </div>
  );
}
