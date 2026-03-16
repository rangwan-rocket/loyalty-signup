import { useReducer, useCallback, useEffect, useRef } from "react";
import type {
  SignupState,
  SignupAction,
  MerchantConfig,
  AuthCompleteResponse,
  MissingData,
  Language,
} from "../types";
import { INITIAL_STATE } from "../constants";
import { fetchMerchantConfig, setConfig as setApiConfig } from "../api/client";
import { sendOtp, authComplete, exchangeLineCode, saveProfile, fetchProfileTemplate } from "../api/auth";
import {
  parseLineCallback,
  cleanLineCallbackParams,
  buildLineAuthUrl,
  generateState,
} from "../api/line";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function computeSteps(config: MerchantConfig | null, missingData: MissingData | null) {
  let steps = 1; // auth is always step 1
  if (missingData?.persona?.persona_groups?.length) steps++;
  const hasFields =
    missingData?.default_fields_config?.some((g) => g.fields.length) ||
    missingData?.custom_fields_config?.some((g) => g.fields.length);
  if (hasFields) steps++;
  if (missingData?.pdpa?.length) steps++;
  return steps;
}

function firstFormStep(missingData: MissingData | null): SignupState["formStep"] {
  if (missingData?.persona?.persona_groups?.length) return "persona";
  if (missingData?.default_fields_config?.some((g) => g.fields.length)) return "default_field";
  if (missingData?.custom_fields_config?.some((g) => g.fields.length)) return "custom_field";
  return "pdpa";
}

function screenFromNextStep(
  nextStep: AuthCompleteResponse["next_step"],
  missingData: MissingData | null,
): SignupState["screen"] {
  switch (nextStep) {
    case "verify_line":
    case "verify_tel":
      return "auth";
    case "complete_profile_new":
    case "complete_profile_existing": {
      const step = firstFormStep(missingData ?? null);
      if (step === "persona") return "persona";
      if (step === "default_field" || step === "custom_field") return "profile";
      return "consent";
    }
    case "complete":
      return "complete";
    default:
      return "auth";
  }
}

/* ------------------------------------------------------------------ */
/*  Reducer                                                           */
/* ------------------------------------------------------------------ */

function reducer(state: SignupState, action: SignupAction): SignupState {
  switch (action.type) {
    case "SET_CONFIG":
      return { ...state, config: action.config, screen: "auth", loading: false };

    case "SET_LINE_PROFILE":
      return { ...state, lineProfile: action.profile };

    case "SET_PHONE":
      return { ...state, phone: action.phone };

    case "SET_OTP_CODE":
      return { ...state, otpCode: action.code };

    case "SET_OTP_SESSION":
      return { ...state, otpSessionId: action.sessionId, screen: "otp", loading: false };

    case "SET_AUTH_RESULT": {
      const r = action.result;
      const missingData = r.missing_data ?? null;
      const totalSteps = computeSteps(state.config, missingData);
      const screen = screenFromNextStep(r.next_step, missingData);
      return {
        ...state,
        accessToken: r.access_token ?? state.accessToken,
        refreshToken: r.refresh_token ?? state.refreshToken,
        userId: r.user_account?.id ?? state.userId,
        isNewUser: r.is_new_user ?? false,
        missingData,
        screen,
        formStep: firstFormStep(missingData),
        totalSteps,
        currentStep: screen === "auth" || screen === "otp" ? 1 : 2,
        loading: false,
        error: null,
      };
    }

    case "SET_SCREEN":
      return { ...state, screen: action.screen };

    case "SET_FORM_STEP":
      return { ...state, formStep: action.step };

    case "SELECT_PERSONA": {
      const md = state.missingData;
      if (!md?.persona) return state;
      return {
        ...state,
        selectedPersonaId: action.personaId,
        missingData: {
          ...md,
          persona: { ...md.persona, selected_persona_id: action.personaId },
        },
      };
    }

    case "REFRESH_TEMPLATE": {
      const newTemplate = action.template;
      const oldMd = state.missingData;
      // Build a map of existing field values to preserve user input
      const existingValues: Record<string, string | string[] | null> = {};
      for (const g of oldMd?.default_fields_config ?? []) {
        for (const f of g.fields) {
          if (f.value !== null && f.value !== undefined && f.value !== "") {
            existingValues[f.field_key] = f.value;
          }
        }
      }
      for (const g of oldMd?.custom_fields_config ?? []) {
        for (const f of g.fields) {
          if (f.value !== null && f.value !== undefined && f.value !== "") {
            existingValues[f.field_key] = f.value;
          }
        }
      }
      // Overlay existing values onto the new template fields
      const overlayValues = (groups: typeof newTemplate.default_fields_config) =>
        groups?.map((g) => ({
          ...g,
          fields: g.fields.map((f) => ({
            ...f,
            value: existingValues[f.field_key] ?? f.value,
          })),
        })) ?? null;

      const merged: typeof state.missingData = {
        ...newTemplate,
        persona: oldMd?.persona
          ? { ...oldMd.persona, ...newTemplate.persona, selected_persona_id: oldMd.persona.selected_persona_id }
          : newTemplate.persona,
        default_fields_config: overlayValues(newTemplate.default_fields_config),
        custom_fields_config: overlayValues(newTemplate.custom_fields_config),
        pdpa: newTemplate.pdpa ?? oldMd?.pdpa ?? null,
      };

      const totalSteps = computeSteps(state.config, merged);
      return { ...state, missingData: merged, totalSteps, loading: false };
    }

    case "UPDATE_FIELD": {
      const md = state.missingData;
      if (!md) return state;

      const updateFields = (groups: typeof md.default_fields_config) =>
        groups?.map((g) => ({
          ...g,
          fields: g.fields.map((f) =>
            f.field_key === action.fieldKey ? { ...f, value: action.value } : f,
          ),
        })) ?? null;

      return {
        ...state,
        missingData: {
          ...md,
          default_fields_config: updateFields(md.default_fields_config),
          custom_fields_config: updateFields(md.custom_fields_config),
        },
      };
    }

    case "UPDATE_CONSENT": {
      const md = state.missingData;
      if (!md?.pdpa) return state;
      return {
        ...state,
        missingData: {
          ...md,
          pdpa: md.pdpa.map((s) =>
            s.id === action.sectionId ? { ...s, isAccepted: action.accepted } : s,
          ),
        },
      };
    }

    case "UPDATE_CONSENT_OPTION": {
      const md = state.missingData;
      if (!md?.pdpa) return state;
      return {
        ...state,
        missingData: {
          ...md,
          pdpa: md.pdpa.map((s) =>
            s.id === action.sectionId
              ? {
                  ...s,
                  options: s.options?.map((o) =>
                    o.id === action.optionId ? { ...o, isAccepted: action.accepted } : o,
                  ),
                }
              : s,
          ),
        },
      };
    }

    case "SET_ERROR":
      return { ...state, error: action.error, loading: false };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    case "SET_LOADING":
      return { ...state, loading: action.loading };

    case "PROFILE_SAVED":
      return { ...state, screen: "complete", loading: false };

    case "RESET":
      return INITIAL_STATE;

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export interface UseSignupFlowOptions {
  merchantCode: string;
  apiBaseUrl?: string;
  language?: Language;
  /** Supply config directly (skips bff_get_merchant_frontend_config fetch) */
  directConfig?: MerchantConfig;
}

export function useSignupFlow(
  merchantCode: string,
  apiBaseUrl?: string,
  language?: Language,
  directConfig?: MerchantConfig,
  callbackUrl?: string,
) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const lineCallbackHandled = useRef(false);

  /* Load config on mount — either from directConfig or fetched from backend */
  useEffect(() => {
    let cancelled = false;
    if (directConfig) {
      setApiConfig(directConfig);
      dispatch({ type: "SET_CONFIG", config: directConfig });
    } else {
      fetchMerchantConfig(merchantCode)
        .then((config) => {
          if (!cancelled) dispatch({ type: "SET_CONFIG", config });
        })
        .catch((err) => {
          if (!cancelled) dispatch({ type: "SET_ERROR", error: err.message });
        });
    }
    return () => { cancelled = true; };
  }, [merchantCode, directConfig]);

  /* Handle LINE OAuth callback on mount (check URL for ?code=) */
  useEffect(() => {
    if (!state.config || lineCallbackHandled.current) return;
    const callback = parseLineCallback();
    if (!callback) return;

    lineCallbackHandled.current = true;
    const savedState = sessionStorage.getItem("ls_line_state");
    if (savedState && savedState !== callback.state) {
      dispatch({ type: "SET_ERROR", error: "LINE login state mismatch. Please try again." });
      cleanLineCallbackParams();
      return;
    }

    cleanLineCallbackParams();
    dispatch({ type: "SET_LOADING", loading: true });

    const redirectUri = sessionStorage.getItem("ls_line_redirect_uri") || callbackUrl || window.location.origin + window.location.pathname;

    exchangeLineCode(callback.code, merchantCode, redirectUri)
      .then((profile) => {
        dispatch({
          type: "SET_LINE_PROFILE",
          profile: {
            line_user_id: profile.line_user_id,
            display_name: profile.display_name,
            picture_url: profile.picture_url,
          },
        });
        return authComplete({
          merchantCode,
          lineUserId: profile.line_user_id,
          language: language ?? "th",
        });
      })
      .then((result) => {
        dispatch({ type: "SET_AUTH_RESULT", result });
      })
      .catch((err) => {
        dispatch({ type: "SET_ERROR", error: (err as Error).message });
      });
  }, [state.config, merchantCode, callbackUrl]);

  /* ---------- Actions ---------- */

  const initiateLineLogin = useCallback(() => {
    if (!state.config) return;
    const lineChannelId = state.config.line_liff_id;
    if (!lineChannelId) {
      dispatch({ type: "SET_ERROR", error: "LINE login not configured for this merchant" });
      return;
    }
    const oauthState = generateState();
    const redirectUri = callbackUrl || window.location.origin + window.location.pathname;
    sessionStorage.setItem("ls_line_state", oauthState);
    sessionStorage.setItem("ls_line_redirect_uri", redirectUri);
    const url = buildLineAuthUrl({
      channelId: lineChannelId,
      redirectUri,
      state: oauthState,
    });
    window.location.href = url;
  }, [state.config, callbackUrl]);

  const requestOtp = useCallback(
    async (phone: string) => {
      dispatch({ type: "SET_LOADING", loading: true });
      dispatch({ type: "SET_PHONE", phone });
      try {
        const code = state.config?.merchant_code ?? merchantCode;
        const res = await sendOtp(phone, code);
        dispatch({ type: "SET_OTP_SESSION", sessionId: res.session_id });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to send OTP";
        dispatch({ type: "SET_ERROR", error: msg });
      }
    },
    [merchantCode, state.config],
  );

  const verifyOtp = useCallback(
    async (otpCode: string) => {
      dispatch({ type: "SET_LOADING", loading: true });
      dispatch({ type: "SET_OTP_CODE", code: otpCode });
      try {
        // Use the merchant_code from the fetched config if available (correct casing)
        const code = state.config?.merchant_code ?? merchantCode;
        const res = await authComplete({
          merchantCode: code,
          tel: state.phone,
          otpCode,
          sessionId: state.otpSessionId ?? undefined,
          lineUserId: state.lineProfile?.line_user_id,
          accessToken: state.accessToken ?? undefined,
          language: language ?? "th",
        });
        dispatch({ type: "SET_AUTH_RESULT", result: res });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "OTP verification failed";
        dispatch({ type: "SET_ERROR", error: msg });
      }
    },
    [merchantCode, state.config, state.phone, state.otpSessionId, state.lineProfile, state.accessToken],
  );

  const submitLineLogin = useCallback(
    async (lineUserId: string, displayName: string, pictureUrl: string | null) => {
      dispatch({
        type: "SET_LINE_PROFILE",
        profile: { line_user_id: lineUserId, display_name: displayName, picture_url: pictureUrl },
      });
      dispatch({ type: "SET_LOADING", loading: true });
      try {
        const res = await authComplete({
          merchantCode,
          lineUserId,
          accessToken: state.accessToken ?? undefined,
          language: language ?? "th",
        });
        dispatch({ type: "SET_AUTH_RESULT", result: res });
      } catch (err: unknown) {
        dispatch({ type: "SET_ERROR", error: (err as Error).message });
      }
    },
    [merchantCode, state.accessToken],
  );

  const selectPersona = useCallback((personaId: string) => {
    dispatch({ type: "SELECT_PERSONA", personaId });
  }, []);

  const confirmPersonaAndRefetch = useCallback(async () => {
    if (!state.accessToken || !state.selectedPersonaId) return;
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      let merchantId: string | undefined;
      try {
        const payload = JSON.parse(atob(state.accessToken.split(".")[1]));
        merchantId = payload.merchant_id;
      } catch {}

      const mcode = state.config?.merchant_code ?? merchantCode;
      const template = await fetchProfileTemplate(
        language ?? "th",
        state.accessToken,
        merchantId,
        mcode,
      );

      const t = template as any;
      const personaId = state.selectedPersonaId;

      const filterByPersona = (groups: any[] | null) =>
        groups?.map((g: any) => ({
          ...g,
          fields: (g.fields ?? []).filter((f: any) => {
            if (!f.persona_ids || f.persona_ids.length === 0) return true;
            return f.persona_ids.includes(personaId);
          }),
        })).filter((g: any) => g.fields.length > 0) ?? null;

      const newMissing: MissingData = {
        persona: state.missingData?.persona ?? t.persona ?? null,
        default_fields_config: filterByPersona(t.default_fields_config),
        custom_fields_config: filterByPersona(t.custom_fields_config),
        pdpa: t.pdpa ?? state.missingData?.pdpa ?? null,
        selected_section: null,
      };

      dispatch({ type: "REFRESH_TEMPLATE", template: newMissing });

      // Advance to next screen after template is refreshed
      const hasDefaultFields = newMissing.default_fields_config?.some((g) => g.fields.length);
      const hasCustomFields = newMissing.custom_fields_config?.some((g) => g.fields.length);
      if (hasDefaultFields || hasCustomFields) {
        dispatch({ type: "SET_FORM_STEP", step: "default_field" });
        dispatch({ type: "SET_SCREEN", screen: "profile" });
      } else if (newMissing.pdpa?.length) {
        dispatch({ type: "SET_FORM_STEP", step: "pdpa" });
        dispatch({ type: "SET_SCREEN", screen: "consent" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load profile template";
      dispatch({ type: "SET_ERROR", error: msg });
      dispatch({ type: "SET_LOADING", loading: false });
    }
  }, [merchantCode, state.accessToken, state.selectedPersonaId, state.config, state.missingData, language]);

  const updateField = useCallback(
    (groupId: string, fieldKey: string, value: string | string[] | null) => {
      dispatch({ type: "UPDATE_FIELD", groupId, fieldKey, value });
    },
    [],
  );

  const updateConsent = useCallback((sectionId: string, accepted: boolean) => {
    dispatch({ type: "UPDATE_CONSENT", sectionId, accepted });
  }, []);

  const updateConsentOption = useCallback(
    (sectionId: string, optionId: string, accepted: boolean) => {
      dispatch({ type: "UPDATE_CONSENT_OPTION", sectionId, optionId, accepted });
    },
    [],
  );

  const nextFormStep = useCallback(() => {
    const order: SignupState["formStep"][] = ["persona", "default_field", "custom_field", "pdpa"];
    const md = state.missingData;
    const currentScreen = state.screen;
    const idx = order.indexOf(state.formStep);

    for (let i = idx + 1; i < order.length; i++) {
      const step = order[i];
      const targetScreen = step === "persona" ? "persona" : step === "pdpa" ? "consent" : "profile";

      // Skip steps that render on the same screen we're already showing
      // (default_field and custom_field both render on "profile")
      if (targetScreen === currentScreen) continue;

      const hasContent =
        (step === "persona" && md?.persona?.persona_groups?.length) ||
        (step === "default_field" && md?.default_fields_config?.some((g) => g.fields.length)) ||
        (step === "custom_field" && md?.custom_fields_config?.some((g) => g.fields.length)) ||
        (step === "pdpa" && md?.pdpa?.length);
      if (hasContent) {
        dispatch({ type: "SET_FORM_STEP", step });
        dispatch({ type: "SET_SCREEN", screen: targetScreen });
        dispatch({ type: "SET_LOADING", loading: false });
        return false;
      }
    }
    return true; // all steps complete, ready to save
  }, [state.formStep, state.screen, state.missingData]);

  const prevFormStep = useCallback(() => {
    const order: SignupState["formStep"][] = ["persona", "default_field", "custom_field", "pdpa"];
    const md = state.missingData;
    const idx = order.indexOf(state.formStep);
    for (let i = idx - 1; i >= 0; i--) {
      const step = order[i];
      const hasContent =
        (step === "persona" && md?.persona?.persona_groups?.length) ||
        (step === "default_field" && md?.default_fields_config?.some((g) => g.fields.length)) ||
        (step === "custom_field" && md?.custom_fields_config?.some((g) => g.fields.length)) ||
        (step === "pdpa" && md?.pdpa?.length);
      if (hasContent) {
        dispatch({ type: "SET_FORM_STEP", step });
        dispatch({
          type: "SET_SCREEN",
          screen: step === "persona" ? "persona" : step === "pdpa" ? "consent" : "profile",
        });
        return;
      }
    }
  }, [state.formStep, state.missingData]);

  const submitProfile = useCallback(async () => {
    if (!state.accessToken || !state.missingData) return;
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      // Extract merchant_id from JWT for x-merchant-id header
      let merchantId: string | undefined;
      try {
        const payload = JSON.parse(atob(state.accessToken.split(".")[1]));
        merchantId = payload.merchant_id;
      } catch {}

      await saveProfile(
        state.missingData as unknown as Record<string, unknown>,
        state.accessToken,
        merchantId,
      );
      dispatch({ type: "PROFILE_SAVED" });
    } catch (err: unknown) {
      dispatch({ type: "SET_ERROR", error: (err as Error).message });
    }
  }, [state.accessToken, state.missingData]);

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  return {
    state,
    dispatch,
    actions: {
      initiateLineLogin,
      requestOtp,
      verifyOtp,
      submitLineLogin,
      selectPersona,
      confirmPersonaAndRefetch,
      updateField,
      updateConsent,
      updateConsentOption,
      nextFormStep,
      prevFormStep,
      submitProfile,
      clearError,
    },
  };
}
