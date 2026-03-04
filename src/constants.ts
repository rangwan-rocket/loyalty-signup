import type { ThemeConfig, SignupState } from "./types";

export const DEFAULT_THEME: Required<ThemeConfig> = {
  primaryColor: "#E91E63",
  secondaryColor: "#9C27B0",
  backgroundColor: "#FFFFFF",
  textColor: "#333333",
  borderRadius: 16,
  fontFamily:
    'GraphikTH, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

export const OTP_LENGTH = 6;
export const OTP_RESEND_COOLDOWN_MS = 60_000;

export const INITIAL_STATE: SignupState = {
  screen: "loading",
  config: null,
  lineProfile: null,
  otpSessionId: null,
  phone: "",
  otpCode: "",
  accessToken: null,
  refreshToken: null,
  userId: null,
  missingData: null,
  selectedPersonaId: null,
  formStep: "persona",
  isNewUser: false,
  totalSteps: 4,
  currentStep: 1,
  error: null,
  loading: true,
};
