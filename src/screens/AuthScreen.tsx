import React, { useState, useCallback, useRef } from "react";
import type { MerchantConfig, LineProfile } from "../types";
import { StepHeader } from "../components/StepHeader";
import { Button } from "../components/Button";
import { styles } from "../styles/theme";

interface AuthScreenProps {
  config: MerchantConfig;
  lineProfile: LineProfile | null;
  phone: string;
  showOtp: boolean;
  otpCode: string;
  loading: boolean;
  error: string | null;
  totalSteps: number;
  onClose?: () => void;
  onLineLogin: () => void;
  onPhoneSubmit: (phone: string) => void;
  onOtpSubmit: (code: string) => void;
  onClearError: () => void;
}

export function AuthScreen({
  config,
  lineProfile,
  phone: initialPhone,
  showOtp,
  otpCode: initialOtp,
  loading,
  error,
  totalSteps,
  onClose,
  onLineLogin,
  onPhoneSubmit,
  onOtpSubmit,
  onClearError,
}: AuthScreenProps) {
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState(initialOtp);
  const submittingOtp = useRef(false);
  const needsLine = config.auth_methods.includes("line");
  const needsTel = config.auth_methods.includes("tel");
  const lineConnected = !!lineProfile;

  const canProceed =
    (!needsLine || lineConnected) && (!needsTel || (showOtp && otp.length === 6));

  const handleOtpChange = useCallback(
    (value: string) => {
      const cleaned = value.replace(/\D/g, "").slice(0, 6);
      setOtp(cleaned);
      if (cleaned.length === 6 && !submittingOtp.current && !loading) {
        submittingOtp.current = true;
        onOtpSubmit(cleaned);
        setTimeout(() => { submittingOtp.current = false; }, 2000);
      }
    },
    [onOtpSubmit, loading],
  );

  const handleNext = () => {
    if (needsTel && !showOtp) {
      onPhoneSubmit(phone);
    } else if (needsTel && showOtp && otp.length === 6) {
      onOtpSubmit(otp);
    } else if (needsLine && lineConnected) {
      // LINE-only flow
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "80vh" }}>
      <StepHeader
        logoUrl={config.merchant_logo_url}
        merchantName={config.merchant_name}
        currentStep={1}
        totalSteps={totalSteps}
        onClose={onClose}
      />

      <div style={{ ...styles.body, flex: 1 }}>
        {error && (
          <div style={styles.errorBanner} onClick={onClearError}>
            {error}
          </div>
        )}

        {/* LINE Section */}
        {needsLine && (
          <>
            {lineConnected ? (
              <div style={styles.lineConnected}>
                <img
                  src={lineProfile.picture_url ?? ""}
                  alt={lineProfile.display_name}
                  style={styles.lineAvatar}
                />
                <div>
                  <div style={styles.lineName}>{lineProfile.display_name}</div>
                  <div style={styles.lineStatus}>Connected</div>
                </div>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="8" fill="#06C755" />
                  <text
                    x="16"
                    y="22"
                    textAnchor="middle"
                    fill="white"
                    fontSize="14"
                    fontWeight="bold"
                  >
                    L
                  </text>
                </svg>
              </div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <Button onClick={onLineLogin} loading={loading}>
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <rect width="20" height="20" rx="4" fill="#06C755" />
                      <text x="10" y="15" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                        L
                      </text>
                    </svg>
                    Login with LINE
                  </span>
                </Button>
              </div>
            )}
          </>
        )}

        {/* Phone Section — only show after LINE is connected (if LINE is also required) */}
        {needsTel && (!needsLine || lineConnected) && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>📱</span>
                <span style={styles.fieldLabel}>
                  Number Phone<span style={{ color: "var(--ls-primary)" }}>*</span>
                </span>
              </div>
              <input
                type="tel"
                style={styles.input}
                placeholder="Enter Number Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={showOtp}
              />
            </div>

            {showOtp && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>🔒</span>
                  <span style={styles.fieldLabel}>
                    OTP Number<span style={{ color: "var(--ls-primary)" }}>*</span>
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  style={{ ...styles.input, fontSize: 24, letterSpacing: 8, textAlign: "center" as const }}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  autoFocus
                />
              </div>
            )}
          </>
        )}

        {config.signup_incentive && (
          <div style={styles.incentiveBanner}>{config.signup_incentive}</div>
        )}
      </div>

      {/* Hide Next button when waiting for LINE login (LINE button is the action) */}
      {(!needsLine || lineConnected) && (
        <div style={{ ...styles.footer, position: "sticky", bottom: 0, background: "var(--ls-bg, #fff)" }}>
          <Button
            onClick={handleNext}
            disabled={needsTel ? (showOtp ? otp.length < 6 : !phone) : false}
            loading={loading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
