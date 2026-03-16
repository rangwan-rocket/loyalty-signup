import React, { useCallback, useMemo, Component } from "react";
import type { LoyaltySignupProps, MerchantConfig } from "./types";

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#D32F2F" }}>
            Component Error
          </h3>
          <pre style={{
            fontSize: 12, color: "#666", whiteSpace: "pre-wrap", wordBreak: "break-all",
            background: "#f5f5f5", padding: 12, borderRadius: 8, textAlign: "left",
          }}>
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack?.split("\n").slice(0, 5).join("\n")}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: 16, padding: "10px 24px", border: "1px solid #ddd",
              borderRadius: 8, background: "#fff", cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { useSignupFlow } from "./hooks/useSignupFlow";
import { resolveTheme, cssVars } from "./styles/theme";
import { Modal } from "./components/Modal";
import { LoadingScreen } from "./screens/LoadingScreen";
import { AuthScreen } from "./screens/AuthScreen";
import { PersonaScreen } from "./screens/PersonaScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { ConsentScreen } from "./screens/ConsentScreen";
import { CompleteScreen } from "./screens/CompleteScreen";
import { ErrorScreen } from "./screens/ErrorScreen";

const KEYFRAME_STYLE = `@keyframes ls-spin { to { transform: rotate(360deg); } }`;

export interface LoyaltySignupFullProps extends LoyaltySignupProps {
  /** Supply config directly (skips config endpoint — useful for demo/testing) */
  directConfig?: MerchantConfig;
}

export function LoyaltySignup({
  merchantCode,
  onComplete,
  onClose,
  language,
  theme: themeOverrides,
  mode = "modal",
  callbackUrl,
  directConfig,
}: LoyaltySignupFullProps) {
  const { state, actions } = useSignupFlow(merchantCode, undefined, language, directConfig, callbackUrl);

  // Merge: prop overrides > merchant config from DB > defaults
  const theme = useMemo(() => {
    const fromConfig = state.config?.theme
      ? {
          primaryColor: state.config.theme.primary_color,
          secondaryColor: state.config.theme.secondary_color,
        }
      : {};
    return resolveTheme({ ...fromConfig, ...themeOverrides });
  }, [themeOverrides, state.config?.theme]);
  const vars = useMemo(() => cssVars(theme), [theme]);

  const handleNextFormStep = useCallback(async () => {
    const isLast = actions.nextFormStep();
    if (isLast) {
      await actions.submitProfile();
    }
  }, [actions]);

  const currentStep = useMemo(() => {
    const { screen } = state;
    if (screen === "auth" || screen === "otp") return 1;
    if (screen === "persona") return 2;
    if (screen === "profile") {
      const hasPersona = state.missingData?.persona?.persona_groups?.length;
      return hasPersona ? 3 : 2;
    }
    if (screen === "consent") {
      let step = 2;
      if (state.missingData?.persona?.persona_groups?.length) step++;
      const hasFields =
        state.missingData?.default_fields_config?.some((g) => g.fields.length) ||
        state.missingData?.custom_fields_config?.some((g) => g.fields.length);
      if (hasFields) step++;
      return step;
    }
    return state.totalSteps;
  }, [state]);

  const renderScreen = () => {
    if (state.screen === "loading") {
      return <LoadingScreen />;
    }

    if (state.screen === "error" || state.error) {
      return (
        <ErrorScreen
          message={state.error ?? "Something went wrong"}
          onRetry={actions.clearError}
          onClose={onClose}
        />
      );
    }

    if (!state.config) return <LoadingScreen />;

    switch (state.screen) {
      case "auth":
      case "otp":
        return (
          <AuthScreen
            config={state.config}
            lineProfile={state.lineProfile}
            phone={state.phone}
            showOtp={state.screen === "otp" || !!state.otpSessionId}
            otpCode={state.otpCode}
            loading={state.loading}
            error={state.error}
            totalSteps={state.totalSteps}
            onClose={onClose}
            onLineLogin={actions.initiateLineLogin}
            onPhoneSubmit={actions.requestOtp}
            onOtpSubmit={actions.verifyOtp}
            onClearError={actions.clearError}
          />
        );

      case "persona":
        if (!state.missingData?.persona) return null;
        return (
          <PersonaScreen
            config={state.config}
            persona={state.missingData.persona}
            currentStep={currentStep}
            totalSteps={state.totalSteps}
            loading={state.loading}
            onClose={onClose}
            onBack={actions.prevFormStep}
            onSelect={actions.selectPersona}
            onNext={actions.confirmPersonaAndRefetch}
          />
        );

      case "profile": {
        const groups = [
          ...(state.missingData?.default_fields_config ?? []),
          ...(state.missingData?.custom_fields_config ?? []),
        ].filter((g) => g.fields.length > 0);

        return (
          <ProfileScreen
            config={state.config}
            groups={groups}
            currentStep={currentStep}
            totalSteps={state.totalSteps}
            loading={state.loading}
            onClose={onClose}
            onBack={actions.prevFormStep}
            onFieldChange={actions.updateField}
            onNext={handleNextFormStep}
          />
        );
      }

      case "consent":
        if (!state.missingData?.pdpa) return null;
        return (
          <ConsentScreen
            config={state.config}
            sections={state.missingData.pdpa}
            currentStep={currentStep}
            totalSteps={state.totalSteps}
            loading={state.loading}
            onClose={onClose}
            onBack={actions.prevFormStep}
            onAccept={actions.updateConsent}
            onAcceptOption={actions.updateConsentOption}
            onSubmit={async () => {
              await actions.submitProfile();
            }}
          />
        );

      case "complete":
        return (
          <CompleteScreen
            user={{
              id: state.userId ?? "",
              tel: null,
              line_id: state.lineProfile?.line_user_id ?? null,
              fullname: null,
              email: null,
              persona_id: state.selectedPersonaId,
              access_token: state.accessToken ?? "",
              refresh_token: state.refreshToken ?? "",
            }}
            isNewUser={state.isNewUser}
            onComplete={onComplete}
          />
        );

      default:
        return null;
    }
  };

  const content = (
    <div style={vars}>
      <style>{KEYFRAME_STYLE}</style>
      {renderScreen()}
    </div>
  );

  const errorToast = state.error && state.screen !== "error" && state.screen !== "auth" && state.screen !== "otp" ? (
    <div
      onClick={actions.clearError}
      style={{
        position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
        background: "#D32F2F", color: "#fff", padding: "12px 20px",
        borderRadius: 10, fontSize: 14, maxWidth: 360, textAlign: "center",
        zIndex: 10000, boxShadow: "0 4px 12px rgba(0,0,0,0.3)", cursor: "pointer",
      }}
    >
      {state.error}
    </div>
  ) : null;

  if (mode === "inline" || mode === "fullscreen") {
    return (
      <ErrorBoundary>
        <div
          style={{
            ...vars,
            ...(mode === "fullscreen"
              ? { position: "fixed", inset: 0, zIndex: 9999, background: "var(--ls-bg)" }
              : {}),
          }}
        >
          <style>{KEYFRAME_STYLE}</style>
          {renderScreen()}
          {errorToast}
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Modal onClose={onClose}>
        {content}
        {errorToast}
      </Modal>
    </ErrorBoundary>
  );
}
