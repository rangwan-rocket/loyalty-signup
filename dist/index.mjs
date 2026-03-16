// src/LoyaltySignup.tsx
import { useCallback as useCallback3, useMemo, Component } from "react";

// src/hooks/useSignupFlow.ts
import { useReducer, useCallback, useEffect, useRef } from "react";

// src/constants.ts
var DEFAULT_THEME = {
  primaryColor: "#E91E63",
  secondaryColor: "#9C27B0",
  backgroundColor: "#FFFFFF",
  textColor: "#333333",
  borderRadius: 16,
  fontFamily: 'GraphikTH, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
};
var INITIAL_STATE = {
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
  loading: true
};

// src/api/client.ts
var SUPABASE_URL = "https://wkevmsedchftztoolkmi.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZXZtc2VkY2hmdHp0b29sa21pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MTM2OTgsImV4cCI6MjA2NjA4OTY5OH0.bd8ELGtX8ACmk_WCxR_tIFljwyHgD3YD4PdBDpD-kSM";
var _config = null;
function setConfig(config) {
  _config = config;
}
function getBaseUrl() {
  return `${_config?.supabase_url ?? SUPABASE_URL}/functions/v1`;
}
function getAnonKey() {
  return _config?.supabase_anon_key ?? SUPABASE_ANON_KEY;
}
async function rpcCall(functionName, body, accessToken) {
  const headers = {
    "Content-Type": "application/json",
    apikey: getAnonKey(),
    Authorization: `Bearer ${accessToken ?? getAnonKey()}`
  };
  const res = await fetch(`${getBaseUrl()}/${functionName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.message ?? data?.error ?? res.statusText ?? "Request failed";
    throw new Error(msg);
  }
  if (data && data.success === false && data.error) {
    throw new Error(data.error);
  }
  return data;
}
async function rpcPost(functionName, body, accessToken, merchantId) {
  const baseUrl = _config?.supabase_url ?? SUPABASE_URL;
  const headers = {
    "Content-Type": "application/json",
    apikey: getAnonKey(),
    Authorization: `Bearer ${accessToken}`
  };
  if (merchantId) {
    headers["x-merchant-id"] = merchantId;
  }
  const res = await fetch(`${baseUrl}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.message ?? data?.error ?? res.statusText ?? "Request failed";
    throw new Error(msg);
  }
  if (data && data.success === false && data.error) {
    let msg = data.error;
    if (data.errors) {
      try {
        const details = typeof data.errors === "string" ? data.errors : JSON.stringify(data.errors);
        msg += `: ${details}`;
      } catch {
      }
    }
    throw new Error(msg);
  }
  return data;
}
async function fetchMerchantConfig(merchantCode) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/bff-get-merchant-frontend-config`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY
    },
    body: JSON.stringify({ merchant_code: merchantCode })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error ?? "Failed to load merchant configuration");
  }
  const data = await res.json();
  const config = {
    supabase_url: SUPABASE_URL,
    supabase_anon_key: SUPABASE_ANON_KEY,
    merchant_code: data.merchant_code,
    auth_methods: data.auth_methods,
    line_liff_id: data.line_channel_id,
    merchant_name: data.merchant_name,
    merchant_logo_url: data.logo_url,
    theme: data.primary_color || data.secondary_color ? {
      primary_color: data.primary_color ?? "#E91E63",
      secondary_color: data.secondary_color ?? "#9C27B0"
    } : null,
    signup_incentive: null
  };
  setConfig(config);
  return config;
}

// src/api/auth.ts
async function exchangeLineCode(code, merchantCode, redirectUri) {
  return rpcCall("auth-line", {
    code,
    merchant_code: merchantCode,
    redirect_uri: redirectUri
  });
}
async function sendOtp(phone, merchantCode) {
  return rpcCall("auth-send-otp", {
    phone,
    merchant_code: merchantCode
  });
}
async function authComplete(params) {
  const body = {
    merchant_code: params.merchantCode
  };
  if (params.lineUserId) body.line_user_id = params.lineUserId;
  if (params.tel) body.tel = params.tel;
  if (params.otpCode) body.otp_code = params.otpCode;
  if (params.sessionId) body.session_id = params.sessionId;
  if (params.accessToken) body.access_token = params.accessToken;
  if (params.language) body.language = params.language;
  return rpcCall("bff-auth-complete", body);
}
async function fetchProfileTemplate(language, accessToken, merchantId, merchantCode) {
  const params = { p_language: language, p_mode: "new" };
  if (merchantCode) params.p_merchant_code = merchantCode;
  return rpcPost(
    "bff_get_user_profile_template",
    params,
    accessToken,
    merchantId
  );
}
async function saveProfile(formData, accessToken, merchantId) {
  return rpcPost("bff_save_user_profile", { p_data: formData }, accessToken, merchantId);
}

// src/api/line.ts
var LINE_AUTH_BASE = "https://access.line.me/oauth2/v2.1/authorize";
function buildLineAuthUrl({ channelId, redirectUri, state }) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: redirectUri,
    state,
    scope: "profile openid",
    bot_prompt: "aggressive"
  });
  return `${LINE_AUTH_BASE}?${params.toString()}`;
}
function generateState() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function parseLineCallback() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  if (code && state) return { code, state };
  return null;
}
function cleanLineCallbackParams() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("friendship_status_changed");
  url.searchParams.delete("liffClientId");
  url.searchParams.delete("liffRedirectUri");
  window.history.replaceState({}, "", url.toString());
}

// src/hooks/useSignupFlow.ts
function computeSteps(config, missingData) {
  let steps = 1;
  if (missingData?.persona?.persona_groups?.length) steps++;
  const hasFields = missingData?.default_fields_config?.some((g) => g.fields.length) || missingData?.custom_fields_config?.some((g) => g.fields.length);
  if (hasFields) steps++;
  if (missingData?.pdpa?.length) steps++;
  return steps;
}
function firstFormStep(missingData) {
  if (missingData?.persona?.persona_groups?.length) return "persona";
  if (missingData?.default_fields_config?.some((g) => g.fields.length)) return "default_field";
  if (missingData?.custom_fields_config?.some((g) => g.fields.length)) return "custom_field";
  return "pdpa";
}
function screenFromNextStep(nextStep, missingData) {
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
function reducer(state, action) {
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
        error: null
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
          persona: { ...md.persona, selected_persona_id: action.personaId }
        }
      };
    }
    case "REFRESH_TEMPLATE": {
      const newTemplate = action.template;
      const oldMd = state.missingData;
      const existingValues = {};
      for (const g of oldMd?.default_fields_config ?? []) {
        for (const f of g.fields) {
          if (f.value !== null && f.value !== void 0 && f.value !== "") {
            existingValues[f.field_key] = f.value;
          }
        }
      }
      for (const g of oldMd?.custom_fields_config ?? []) {
        for (const f of g.fields) {
          if (f.value !== null && f.value !== void 0 && f.value !== "") {
            existingValues[f.field_key] = f.value;
          }
        }
      }
      const overlayValues = (groups) => groups?.map((g) => ({
        ...g,
        fields: g.fields.map((f) => ({
          ...f,
          value: existingValues[f.field_key] ?? f.value
        }))
      })) ?? null;
      const merged = {
        ...newTemplate,
        persona: oldMd?.persona ? { ...oldMd.persona, ...newTemplate.persona, selected_persona_id: oldMd.persona.selected_persona_id } : newTemplate.persona,
        default_fields_config: overlayValues(newTemplate.default_fields_config),
        custom_fields_config: overlayValues(newTemplate.custom_fields_config),
        pdpa: newTemplate.pdpa ?? oldMd?.pdpa ?? null
      };
      const totalSteps = computeSteps(state.config, merged);
      return { ...state, missingData: merged, totalSteps, loading: false };
    }
    case "UPDATE_FIELD": {
      const md = state.missingData;
      if (!md) return state;
      const updateFields = (groups) => groups?.map((g) => ({
        ...g,
        fields: g.fields.map(
          (f) => f.field_key === action.fieldKey ? { ...f, value: action.value } : f
        )
      })) ?? null;
      return {
        ...state,
        missingData: {
          ...md,
          default_fields_config: updateFields(md.default_fields_config),
          custom_fields_config: updateFields(md.custom_fields_config)
        }
      };
    }
    case "UPDATE_CONSENT": {
      const md = state.missingData;
      if (!md?.pdpa) return state;
      return {
        ...state,
        missingData: {
          ...md,
          pdpa: md.pdpa.map(
            (s) => s.id === action.sectionId ? { ...s, isAccepted: action.accepted } : s
          )
        }
      };
    }
    case "UPDATE_CONSENT_OPTION": {
      const md = state.missingData;
      if (!md?.pdpa) return state;
      return {
        ...state,
        missingData: {
          ...md,
          pdpa: md.pdpa.map(
            (s) => s.id === action.sectionId ? {
              ...s,
              options: s.options?.map(
                (o) => o.id === action.optionId ? { ...o, isAccepted: action.accepted } : o
              )
            } : s
          )
        }
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
function useSignupFlow(merchantCode, apiBaseUrl, language, directConfig, callbackUrl) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const lineCallbackHandled = useRef(false);
  useEffect(() => {
    let cancelled = false;
    if (directConfig) {
      setConfig(directConfig);
      dispatch({ type: "SET_CONFIG", config: directConfig });
    } else {
      fetchMerchantConfig(merchantCode).then((config) => {
        if (!cancelled) dispatch({ type: "SET_CONFIG", config });
      }).catch((err) => {
        if (!cancelled) dispatch({ type: "SET_ERROR", error: err.message });
      });
    }
    return () => {
      cancelled = true;
    };
  }, [merchantCode, directConfig]);
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
    exchangeLineCode(callback.code, merchantCode, redirectUri).then((profile) => {
      dispatch({
        type: "SET_LINE_PROFILE",
        profile: {
          line_user_id: profile.line_user_id,
          display_name: profile.display_name,
          picture_url: profile.picture_url
        }
      });
      return authComplete({
        merchantCode,
        lineUserId: profile.line_user_id,
        language: language ?? "th"
      });
    }).then((result) => {
      dispatch({ type: "SET_AUTH_RESULT", result });
    }).catch((err) => {
      dispatch({ type: "SET_ERROR", error: err.message });
    });
  }, [state.config, merchantCode, callbackUrl]);
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
      state: oauthState
    });
    window.location.href = url;
  }, [state.config, callbackUrl]);
  const requestOtp = useCallback(
    async (phone) => {
      dispatch({ type: "SET_LOADING", loading: true });
      dispatch({ type: "SET_PHONE", phone });
      try {
        const code = state.config?.merchant_code ?? merchantCode;
        const res = await sendOtp(phone, code);
        dispatch({ type: "SET_OTP_SESSION", sessionId: res.session_id });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to send OTP";
        dispatch({ type: "SET_ERROR", error: msg });
      }
    },
    [merchantCode, state.config]
  );
  const verifyOtp = useCallback(
    async (otpCode) => {
      dispatch({ type: "SET_LOADING", loading: true });
      dispatch({ type: "SET_OTP_CODE", code: otpCode });
      try {
        const code = state.config?.merchant_code ?? merchantCode;
        const res = await authComplete({
          merchantCode: code,
          tel: state.phone,
          otpCode,
          sessionId: state.otpSessionId ?? void 0,
          lineUserId: state.lineProfile?.line_user_id,
          accessToken: state.accessToken ?? void 0,
          language: language ?? "th"
        });
        dispatch({ type: "SET_AUTH_RESULT", result: res });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "OTP verification failed";
        dispatch({ type: "SET_ERROR", error: msg });
      }
    },
    [merchantCode, state.config, state.phone, state.otpSessionId, state.lineProfile, state.accessToken]
  );
  const submitLineLogin = useCallback(
    async (lineUserId, displayName, pictureUrl) => {
      dispatch({
        type: "SET_LINE_PROFILE",
        profile: { line_user_id: lineUserId, display_name: displayName, picture_url: pictureUrl }
      });
      dispatch({ type: "SET_LOADING", loading: true });
      try {
        const res = await authComplete({
          merchantCode,
          lineUserId,
          accessToken: state.accessToken ?? void 0,
          language: language ?? "th"
        });
        dispatch({ type: "SET_AUTH_RESULT", result: res });
      } catch (err) {
        dispatch({ type: "SET_ERROR", error: err.message });
      }
    },
    [merchantCode, state.accessToken]
  );
  const selectPersona = useCallback((personaId) => {
    dispatch({ type: "SELECT_PERSONA", personaId });
  }, []);
  const confirmPersonaAndRefetch = useCallback(async () => {
    if (!state.accessToken || !state.selectedPersonaId) return;
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      let merchantId;
      try {
        const payload = JSON.parse(atob(state.accessToken.split(".")[1]));
        merchantId = payload.merchant_id;
      } catch {
      }
      const mcode = state.config?.merchant_code ?? merchantCode;
      const template = await fetchProfileTemplate(
        language ?? "th",
        state.accessToken,
        merchantId,
        mcode
      );
      const t = template;
      const personaId = state.selectedPersonaId;
      const filterByPersona = (groups) => groups?.map((g) => ({
        ...g,
        fields: (g.fields ?? []).filter((f) => {
          if (!f.persona_ids || f.persona_ids.length === 0) return true;
          return f.persona_ids.includes(personaId);
        })
      })).filter((g) => g.fields.length > 0) ?? null;
      const newMissing = {
        persona: state.missingData?.persona ?? t.persona ?? null,
        default_fields_config: filterByPersona(t.default_fields_config),
        custom_fields_config: filterByPersona(t.custom_fields_config),
        pdpa: t.pdpa ?? state.missingData?.pdpa ?? null,
        selected_section: null
      };
      dispatch({ type: "REFRESH_TEMPLATE", template: newMissing });
      const hasDefaultFields = newMissing.default_fields_config?.some((g) => g.fields.length);
      const hasCustomFields = newMissing.custom_fields_config?.some((g) => g.fields.length);
      if (hasDefaultFields || hasCustomFields) {
        dispatch({ type: "SET_FORM_STEP", step: "default_field" });
        dispatch({ type: "SET_SCREEN", screen: "profile" });
      } else if (newMissing.pdpa?.length) {
        dispatch({ type: "SET_FORM_STEP", step: "pdpa" });
        dispatch({ type: "SET_SCREEN", screen: "consent" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load profile template";
      dispatch({ type: "SET_ERROR", error: msg });
      dispatch({ type: "SET_LOADING", loading: false });
    }
  }, [merchantCode, state.accessToken, state.selectedPersonaId, state.config, state.missingData, language]);
  const updateField = useCallback(
    (groupId, fieldKey, value) => {
      dispatch({ type: "UPDATE_FIELD", groupId, fieldKey, value });
    },
    []
  );
  const updateConsent = useCallback((sectionId, accepted) => {
    dispatch({ type: "UPDATE_CONSENT", sectionId, accepted });
  }, []);
  const updateConsentOption = useCallback(
    (sectionId, optionId, accepted) => {
      dispatch({ type: "UPDATE_CONSENT_OPTION", sectionId, optionId, accepted });
    },
    []
  );
  const nextFormStep = useCallback(() => {
    const order = ["persona", "default_field", "custom_field", "pdpa"];
    const md = state.missingData;
    const currentScreen = state.screen;
    const idx = order.indexOf(state.formStep);
    for (let i = idx + 1; i < order.length; i++) {
      const step = order[i];
      const targetScreen = step === "persona" ? "persona" : step === "pdpa" ? "consent" : "profile";
      if (targetScreen === currentScreen) continue;
      const hasContent = step === "persona" && md?.persona?.persona_groups?.length || step === "default_field" && md?.default_fields_config?.some((g) => g.fields.length) || step === "custom_field" && md?.custom_fields_config?.some((g) => g.fields.length) || step === "pdpa" && md?.pdpa?.length;
      if (hasContent) {
        dispatch({ type: "SET_FORM_STEP", step });
        dispatch({ type: "SET_SCREEN", screen: targetScreen });
        dispatch({ type: "SET_LOADING", loading: false });
        return false;
      }
    }
    return true;
  }, [state.formStep, state.screen, state.missingData]);
  const prevFormStep = useCallback(() => {
    const order = ["persona", "default_field", "custom_field", "pdpa"];
    const md = state.missingData;
    const idx = order.indexOf(state.formStep);
    for (let i = idx - 1; i >= 0; i--) {
      const step = order[i];
      const hasContent = step === "persona" && md?.persona?.persona_groups?.length || step === "default_field" && md?.default_fields_config?.some((g) => g.fields.length) || step === "custom_field" && md?.custom_fields_config?.some((g) => g.fields.length) || step === "pdpa" && md?.pdpa?.length;
      if (hasContent) {
        dispatch({ type: "SET_FORM_STEP", step });
        dispatch({
          type: "SET_SCREEN",
          screen: step === "persona" ? "persona" : step === "pdpa" ? "consent" : "profile"
        });
        return;
      }
    }
  }, [state.formStep, state.missingData]);
  const submitProfile = useCallback(async () => {
    if (!state.accessToken || !state.missingData) return;
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      let merchantId;
      try {
        const payload = JSON.parse(atob(state.accessToken.split(".")[1]));
        merchantId = payload.merchant_id;
      } catch {
      }
      await saveProfile(
        state.missingData,
        state.accessToken,
        merchantId
      );
      dispatch({ type: "PROFILE_SAVED" });
    } catch (err) {
      dispatch({ type: "SET_ERROR", error: err.message });
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
      clearError
    }
  };
}

// src/styles/theme.ts
function resolveTheme(overrides) {
  return { ...DEFAULT_THEME, ...overrides };
}
function cssVars(theme) {
  return {
    "--ls-primary": theme.primaryColor,
    "--ls-secondary": theme.secondaryColor,
    "--ls-bg": theme.backgroundColor,
    "--ls-text": theme.textColor,
    "--ls-radius": `${theme.borderRadius}px`,
    "--ls-font": theme.fontFamily
  };
}
var styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 9999,
    fontFamily: "var(--ls-font)",
    color: "var(--ls-text)"
  },
  modal: {
    background: "var(--ls-bg)",
    borderRadius: "var(--ls-radius) var(--ls-radius) 0 0",
    width: "100%",
    maxWidth: 480,
    maxHeight: "92vh",
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
    position: "relative"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid #f0f0f0"
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    objectFit: "cover"
  },
  stepTitle: {
    fontWeight: 700,
    fontSize: 18
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 24,
    cursor: "pointer",
    color: "var(--ls-text)",
    padding: 4,
    lineHeight: 1
  },
  backBtn: {
    background: "none",
    border: "1px solid #ddd",
    borderRadius: "50%",
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 16
  },
  body: {
    flex: 1,
    padding: "20px 20px 24px",
    overflow: "auto"
  },
  footer: {
    padding: "16px 20px 32px",
    borderTop: "1px solid #f0f0f0"
  },
  primaryBtn: {
    width: "100%",
    padding: "14px 0",
    border: "none",
    borderRadius: 999,
    background: "linear-gradient(135deg, var(--ls-primary), var(--ls-secondary))",
    color: "#fff",
    fontWeight: 600,
    fontSize: 16,
    cursor: "pointer",
    transition: "opacity 0.2s"
  },
  primaryBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed"
  },
  secondaryBtn: {
    width: "100%",
    padding: "14px 0",
    border: "1px solid #ddd",
    borderRadius: 999,
    background: "#fff",
    color: "var(--ls-text)",
    fontWeight: 600,
    fontSize: 16,
    cursor: "pointer"
  },
  input: {
    width: "100%",
    padding: "12px 0",
    border: "none",
    borderBottom: "1px solid #e0e0e0",
    fontSize: 15,
    outline: "none",
    background: "transparent",
    color: "var(--ls-text)",
    fontFamily: "inherit"
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: "#666",
    marginBottom: 4
  },
  fieldRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 0",
    borderBottom: "1px solid #f0f0f0",
    cursor: "pointer"
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: 500
  },
  fieldValue: {
    fontSize: 15,
    color: "#999",
    display: "flex",
    alignItems: "center",
    gap: 4
  },
  fieldValueFilled: {
    fontSize: 15,
    color: "var(--ls-text, #222)",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: 4
  },
  errorBanner: {
    background: "#FFF0F0",
    color: "#D32F2F",
    padding: "10px 16px",
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 16
  },
  lineConnected: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#E8F5E9",
    borderRadius: 12,
    padding: "12px 16px",
    marginBottom: 20
  },
  lineAvatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    objectFit: "cover"
  },
  lineName: {
    flex: 1,
    fontWeight: 600,
    fontSize: 15
  },
  lineStatus: {
    color: "#4CAF50",
    fontSize: 13,
    fontWeight: 500
  },
  lineBadge: {
    width: 32,
    height: 32
  },
  incentiveBanner: {
    background: "#E0F7FA",
    borderRadius: 8,
    padding: "10px 16px",
    textAlign: "center",
    fontSize: 14,
    fontWeight: 500,
    marginTop: 16
  },
  personaGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 20,
    justifyContent: "center",
    padding: "20px 0"
  },
  personaCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    position: "relative",
    width: 100
  },
  personaImg: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    objectFit: "cover",
    border: "3px solid transparent",
    transition: "border-color 0.2s"
  },
  personaImgSelected: {
    borderColor: "var(--ls-primary)"
  },
  personaCheck: {
    position: "absolute",
    top: 0,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "#4CAF50",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700
  },
  personaName: {
    fontSize: 13,
    textAlign: "center",
    fontWeight: 500
  },
  consentBody: {
    fontSize: 14,
    lineHeight: 1.7,
    color: "#555",
    maxHeight: 300,
    overflow: "auto",
    padding: "16px 0"
  },
  consentActions: {
    display: "flex",
    gap: 12,
    marginTop: 16
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 0",
    cursor: "pointer"
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    border: "2px solid #ddd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.15s"
  },
  checkboxChecked: {
    background: "var(--ls-primary)",
    borderColor: "var(--ls-primary)",
    color: "#fff"
  },
  spinner: {
    width: 20,
    height: 20,
    border: "2px solid #fff",
    borderTopColor: "transparent",
    borderRadius: "50%",
    animation: "ls-spin 0.6s linear infinite",
    display: "inline-block"
  }
};

// src/components/Modal.tsx
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var MODAL_STYLES = `
  .ls-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    font-family: var(--ls-font);
    color: var(--ls-text);
    padding: 16px;
  }
  .ls-modal-container {
    background: var(--ls-bg, #fff);
    border-radius: var(--ls-radius, 16px);
    width: 100%;
    max-width: 440px;
    max-height: 90vh;
    overflow: auto;
    display: flex;
    flex-direction: column;
    position: relative;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    animation: ls-modal-in 0.25s ease-out;
  }
  @media (max-width: 480px) {
    .ls-modal-overlay {
      align-items: flex-end;
      padding: 0;
    }
    .ls-modal-container {
      max-width: 100%;
      max-height: 95vh;
      border-radius: var(--ls-radius, 16px) var(--ls-radius, 16px) 0 0;
      animation: ls-modal-slide-up 0.3s ease-out;
    }
  }
  @keyframes ls-modal-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes ls-modal-slide-up {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;
function Modal({ children, onClose }) {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("style", { children: MODAL_STYLES }),
    /* @__PURE__ */ jsx("div", { className: "ls-modal-overlay", onClick: onClose, children: /* @__PURE__ */ jsx("div", { className: "ls-modal-container", onClick: (e) => e.stopPropagation(), children }) })
  ] });
}

// src/screens/LoadingScreen.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function LoadingScreen() {
  return /* @__PURE__ */ jsx2(
    "div",
    {
      style: {
        ...styles.body,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 300
      },
      children: /* @__PURE__ */ jsxs2("div", { style: { textAlign: "center" }, children: [
        /* @__PURE__ */ jsx2(
          "div",
          {
            style: {
              ...styles.spinner,
              width: 32,
              height: 32,
              borderColor: "#E91E63",
              borderTopColor: "transparent",
              margin: "0 auto 16px"
            }
          }
        ),
        /* @__PURE__ */ jsx2("div", { style: { color: "#999", fontSize: 14 }, children: "Loading..." })
      ] })
    }
  );
}

// src/screens/AuthScreen.tsx
import { useState, useCallback as useCallback2, useRef as useRef2 } from "react";

// src/components/StepHeader.tsx
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function StepHeader({
  logoUrl,
  merchantName,
  currentStep,
  totalSteps,
  onClose,
  onBack,
  showBack
}) {
  return /* @__PURE__ */ jsxs3("div", { style: styles.header, children: [
    /* @__PURE__ */ jsxs3("div", { style: styles.headerLeft, children: [
      showBack && /* @__PURE__ */ jsx3("button", { style: styles.backBtn, onClick: onBack, "aria-label": "Back", children: "\u2039" }),
      logoUrl ? /* @__PURE__ */ jsx3(
        "img",
        {
          src: logoUrl,
          alt: merchantName,
          style: {
            height: 32,
            maxWidth: 80,
            objectFit: "contain",
            borderRadius: 6
          }
        }
      ) : /* @__PURE__ */ jsx3("span", { style: { fontWeight: 700, fontSize: 14 }, children: merchantName }),
      /* @__PURE__ */ jsxs3("span", { style: styles.stepTitle, children: [
        "Sign Up ",
        currentStep,
        "/",
        totalSteps
      ] })
    ] }),
    onClose && /* @__PURE__ */ jsx3("button", { style: styles.closeBtn, onClick: onClose, "aria-label": "Close", children: "\xD7" })
  ] });
}

// src/components/Button.tsx
import { jsx as jsx4 } from "react/jsx-runtime";
function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  loading
}) {
  const base = variant === "primary" ? styles.primaryBtn : styles.secondaryBtn;
  const style = {
    ...base,
    ...disabled || loading ? styles.primaryBtnDisabled : {}
  };
  return /* @__PURE__ */ jsx4("button", { style, onClick, disabled: disabled || loading, children: loading ? /* @__PURE__ */ jsx4("span", { style: styles.spinner }) : children });
}

// src/screens/AuthScreen.tsx
import { Fragment as Fragment2, jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";
function AuthScreen({
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
  onClearError
}) {
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState(initialOtp);
  const submittingOtp = useRef2(false);
  const needsLine = config.auth_methods.includes("line");
  const needsTel = config.auth_methods.includes("tel");
  const lineConnected = !!lineProfile;
  const canProceed = (!needsLine || lineConnected) && (!needsTel || showOtp && otp.length === 6);
  const handleOtpChange = useCallback2(
    (value) => {
      const cleaned = value.replace(/\D/g, "").slice(0, 6);
      setOtp(cleaned);
      if (cleaned.length === 6 && !submittingOtp.current && !loading) {
        submittingOtp.current = true;
        onOtpSubmit(cleaned);
        setTimeout(() => {
          submittingOtp.current = false;
        }, 2e3);
      }
    },
    [onOtpSubmit, loading]
  );
  const handleNext = () => {
    if (needsTel && !showOtp) {
      onPhoneSubmit(phone);
    } else if (needsTel && showOtp && otp.length === 6) {
      onOtpSubmit(otp);
    } else if (needsLine && lineConnected) {
    }
  };
  return /* @__PURE__ */ jsxs4("div", { style: { display: "flex", flexDirection: "column", height: "100%", minHeight: "80vh" }, children: [
    /* @__PURE__ */ jsx5(
      StepHeader,
      {
        logoUrl: config.merchant_logo_url,
        merchantName: config.merchant_name,
        currentStep: 1,
        totalSteps,
        onClose
      }
    ),
    /* @__PURE__ */ jsxs4("div", { style: { ...styles.body, flex: 1 }, children: [
      error && /* @__PURE__ */ jsx5("div", { style: styles.errorBanner, onClick: onClearError, children: error }),
      needsLine && /* @__PURE__ */ jsx5(Fragment2, { children: lineConnected ? /* @__PURE__ */ jsxs4("div", { style: styles.lineConnected, children: [
        /* @__PURE__ */ jsx5(
          "img",
          {
            src: lineProfile.picture_url ?? "",
            alt: lineProfile.display_name,
            style: styles.lineAvatar
          }
        ),
        /* @__PURE__ */ jsxs4("div", { children: [
          /* @__PURE__ */ jsx5("div", { style: styles.lineName, children: lineProfile.display_name }),
          /* @__PURE__ */ jsx5("div", { style: styles.lineStatus, children: "Connected" })
        ] }),
        /* @__PURE__ */ jsxs4("svg", { width: "32", height: "32", viewBox: "0 0 32 32", fill: "none", children: [
          /* @__PURE__ */ jsx5("rect", { width: "32", height: "32", rx: "8", fill: "#06C755" }),
          /* @__PURE__ */ jsx5(
            "text",
            {
              x: "16",
              y: "22",
              textAnchor: "middle",
              fill: "white",
              fontSize: "14",
              fontWeight: "bold",
              children: "L"
            }
          )
        ] })
      ] }) : /* @__PURE__ */ jsx5("div", { style: { marginBottom: 20 }, children: /* @__PURE__ */ jsx5(Button, { onClick: onLineLogin, loading, children: /* @__PURE__ */ jsxs4("span", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }, children: [
        /* @__PURE__ */ jsxs4("svg", { width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", children: [
          /* @__PURE__ */ jsx5("rect", { width: "20", height: "20", rx: "4", fill: "#06C755" }),
          /* @__PURE__ */ jsx5("text", { x: "10", y: "15", textAnchor: "middle", fill: "white", fontSize: "10", fontWeight: "bold", children: "L" })
        ] }),
        "Login with LINE"
      ] }) }) }) }),
      needsTel && (!needsLine || lineConnected) && /* @__PURE__ */ jsxs4(Fragment2, { children: [
        /* @__PURE__ */ jsxs4("div", { style: { marginBottom: 16 }, children: [
          /* @__PURE__ */ jsxs4("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }, children: [
            /* @__PURE__ */ jsx5("span", { style: { fontSize: 16 }, children: "\u{1F4F1}" }),
            /* @__PURE__ */ jsxs4("span", { style: styles.fieldLabel, children: [
              "Number Phone",
              /* @__PURE__ */ jsx5("span", { style: { color: "var(--ls-primary)" }, children: "*" })
            ] })
          ] }),
          /* @__PURE__ */ jsx5(
            "input",
            {
              type: "tel",
              style: styles.input,
              placeholder: "Enter Number Phone",
              value: phone,
              onChange: (e) => setPhone(e.target.value),
              disabled: showOtp
            }
          )
        ] }),
        showOtp && /* @__PURE__ */ jsxs4("div", { style: { marginBottom: 16 }, children: [
          /* @__PURE__ */ jsxs4("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }, children: [
            /* @__PURE__ */ jsx5("span", { style: { fontSize: 16 }, children: "\u{1F512}" }),
            /* @__PURE__ */ jsxs4("span", { style: styles.fieldLabel, children: [
              "OTP Number",
              /* @__PURE__ */ jsx5("span", { style: { color: "var(--ls-primary)" }, children: "*" })
            ] })
          ] }),
          /* @__PURE__ */ jsx5(
            "input",
            {
              type: "text",
              inputMode: "numeric",
              maxLength: 6,
              style: { ...styles.input, fontSize: 24, letterSpacing: 8, textAlign: "center" },
              placeholder: "\u2022 \u2022 \u2022 \u2022 \u2022 \u2022",
              value: otp,
              onChange: (e) => handleOtpChange(e.target.value),
              autoFocus: true
            }
          )
        ] })
      ] }),
      config.signup_incentive && /* @__PURE__ */ jsx5("div", { style: styles.incentiveBanner, children: config.signup_incentive })
    ] }),
    (!needsLine || lineConnected) && /* @__PURE__ */ jsx5("div", { style: { ...styles.footer, position: "sticky", bottom: 0, background: "var(--ls-bg, #fff)" }, children: /* @__PURE__ */ jsx5(
      Button,
      {
        onClick: handleNext,
        disabled: needsTel ? showOtp ? otp.length < 6 : !phone : false,
        loading,
        children: "Next"
      }
    ) })
  ] });
}

// src/screens/PersonaScreen.tsx
import { jsx as jsx6, jsxs as jsxs5 } from "react/jsx-runtime";
function PersonaAvatar({ src, name, size = 80 }) {
  const displayName = name ?? "?";
  if (src) {
    return /* @__PURE__ */ jsx6(
      "img",
      {
        src,
        alt: displayName,
        style: {
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover"
        }
      }
    );
  }
  return /* @__PURE__ */ jsx6(
    "div",
    {
      style: {
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#f0f0f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 700,
        color: "#999"
      },
      children: displayName.charAt(0).toUpperCase()
    }
  );
}
function PersonaScreen({
  config,
  persona,
  currentStep,
  totalSteps,
  loading,
  onClose,
  onBack,
  onSelect,
  onNext
}) {
  const allPersonas = persona.persona_groups.flatMap((g) => g.personas ?? []);
  const selected = persona.selected_persona_id;
  return /* @__PURE__ */ jsxs5("div", { style: { display: "flex", flexDirection: "column", height: "100%", minHeight: "80vh" }, children: [
    /* @__PURE__ */ jsx6(
      StepHeader,
      {
        logoUrl: config.merchant_logo_url,
        merchantName: config.merchant_name,
        currentStep,
        totalSteps,
        onClose,
        onBack,
        showBack: true
      }
    ),
    /* @__PURE__ */ jsxs5("div", { style: { ...styles.body, flex: 1, overflow: "auto" }, children: [
      /* @__PURE__ */ jsx6("h3", { style: { fontSize: 16, fontWeight: 700, marginBottom: 20 }, children: "Please Select Member Type" }),
      /* @__PURE__ */ jsx6("div", { style: styles.personaGrid, children: allPersonas.map((p) => {
        const pid = p.id;
        const pname = p.name ?? p.persona_name ?? "Unknown";
        const pimg = p.image_url ?? p.image ?? null;
        const isSelected = selected === pid;
        return /* @__PURE__ */ jsxs5("div", { style: styles.personaCard, onClick: () => onSelect(pid), children: [
          isSelected && /* @__PURE__ */ jsx6("div", { style: styles.personaCheck, children: "\u2713" }),
          /* @__PURE__ */ jsx6(
            "div",
            {
              style: {
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
                boxSizing: "border-box"
              },
              children: /* @__PURE__ */ jsx6(PersonaAvatar, { src: pimg, name: pname })
            }
          ),
          /* @__PURE__ */ jsx6("span", { style: styles.personaName, children: pname })
        ] }, pid);
      }) })
    ] }),
    /* @__PURE__ */ jsx6("div", { style: { ...styles.footer, position: "sticky", bottom: 0, background: "var(--ls-bg, #fff)" }, children: /* @__PURE__ */ jsx6(Button, { onClick: onNext, disabled: !selected, loading, children: "Next" }) })
  ] });
}

// src/screens/ProfileScreen.tsx
import { useState as useState2 } from "react";
import { jsx as jsx7, jsxs as jsxs6 } from "react/jsx-runtime";
var DEFAULT_FIELD_OPTIONS = {
  gender: [
    { value: "male", label: "\u0E0A\u0E32\u0E22 (Male)" },
    { value: "female", label: "\u0E2B\u0E0D\u0E34\u0E07 (Female)" },
    { value: "other", label: "\u0E2D\u0E37\u0E48\u0E19\u0E46 (Other)" }
  ]
};
function hasValidLabels(opts) {
  return opts.some((o) => o.label != null && o.label !== "");
}
function getOptions(field) {
  if (field.options?.length) {
    const mapped = field.options.map((o) => ({
      value: o.option_value,
      label: o.option_label
    }));
    if (hasValidLabels(mapped)) return mapped;
  }
  if (field.field_options?.length) {
    const mapped = field.field_options.map((o) => ({ value: o.value, label: o.label }));
    if (hasValidLabels(mapped)) return mapped;
  }
  if (DEFAULT_FIELD_OPTIONS[field.field_key]) {
    return DEFAULT_FIELD_OPTIONS[field.field_key];
  }
  return [];
}
function getFieldOrder(field) {
  return field.sort_order ?? field.order_index ?? 0;
}
function isSelectType(field) {
  const t = field.field_type?.toLowerCase();
  return t === "select" || t === "single_select" || t === "single-select" || t === "multi_select" || t === "multi-select" || t === "radio";
}
function isDateType(field) {
  const t = field.field_type?.toLowerCase();
  return t === "date" || field.text_format === "date";
}
function FieldInput({
  field,
  groupId,
  onChange
}) {
  const [showOptions, setShowOptions] = useState2(false);
  const options = getOptions(field);
  if (isSelectType(field) && options.length > 0) {
    const selectedLabel = options.find(
      (o) => o.value === field.value
    )?.label;
    return /* @__PURE__ */ jsxs6("div", { children: [
      /* @__PURE__ */ jsxs6("div", { style: styles.fieldRow, onClick: () => setShowOptions(!showOptions), children: [
        /* @__PURE__ */ jsxs6("span", { style: styles.fieldLabel, children: [
          field.label,
          field.is_required && /* @__PURE__ */ jsx7("span", { style: { color: "var(--ls-primary)" }, children: "*" })
        ] }),
        /* @__PURE__ */ jsxs6("span", { style: selectedLabel ? styles.fieldValueFilled : styles.fieldValue, children: [
          selectedLabel ?? field.placeholder ?? "Select",
          " \u203A"
        ] })
      ] }),
      showOptions && /* @__PURE__ */ jsx7(
        "div",
        {
          style: {
            padding: "4px 0 4px 16px",
            borderBottom: "1px solid #f0f0f0",
            maxHeight: 200,
            overflow: "auto"
          },
          children: options.map((opt) => /* @__PURE__ */ jsxs6(
            "div",
            {
              style: {
                padding: "10px 12px",
                cursor: "pointer",
                borderRadius: 8,
                background: field.value === opt.value ? "rgba(var(--ls-primary-rgb, 0,0,0), 0.05)" : "transparent",
                fontWeight: field.value === opt.value ? 600 : 400,
                fontSize: 14
              },
              onClick: () => {
                onChange(groupId, field.field_key, opt.value);
                setShowOptions(false);
              },
              children: [
                field.value === opt.value && "\u2713 ",
                opt.label
              ]
            },
            opt.value
          ))
        }
      )
    ] });
  }
  if (isDateType(field)) {
    return /* @__PURE__ */ jsxs6("div", { style: styles.fieldRow, children: [
      /* @__PURE__ */ jsxs6("span", { style: styles.fieldLabel, children: [
        field.label,
        field.is_required && /* @__PURE__ */ jsx7("span", { style: { color: "var(--ls-primary)" }, children: "*" })
      ] }),
      /* @__PURE__ */ jsx7(
        "input",
        {
          type: "date",
          value: field.value ?? "",
          onChange: (e) => onChange(groupId, field.field_key, e.target.value || null),
          style: {
            border: "none",
            background: "transparent",
            fontSize: 15,
            color: field.value ? "var(--ls-text)" : "#999",
            textAlign: "right",
            outline: "none"
          }
        }
      )
    ] });
  }
  const inputType = field.field_type === "email" || field.text_format === "email" ? "email" : field.field_type === "phone" || field.field_type === "tel" || field.text_format === "phone" ? "tel" : "text";
  return /* @__PURE__ */ jsxs6("div", { style: styles.fieldRow, children: [
    /* @__PURE__ */ jsxs6("span", { style: styles.fieldLabel, children: [
      field.label,
      field.is_required && /* @__PURE__ */ jsx7("span", { style: { color: "var(--ls-primary)" }, children: "*" })
    ] }),
    /* @__PURE__ */ jsx7(
      "input",
      {
        type: inputType,
        placeholder: field.placeholder ?? `${field.label}`,
        value: field.value ?? "",
        onChange: (e) => onChange(groupId, field.field_key, e.target.value || null),
        style: {
          border: "none",
          background: "transparent",
          fontSize: 15,
          color: "var(--ls-text)",
          textAlign: "right",
          outline: "none",
          width: "55%"
        }
      }
    )
  ] });
}
function ProfileScreen({
  config,
  groups,
  currentStep,
  totalSteps,
  loading,
  onClose,
  onBack,
  onFieldChange,
  onNext
}) {
  const allFields = groups.flatMap((g) => g.fields);
  const requiredFilled = allFields.filter((f) => f.is_required).every((f) => f.value !== null && f.value !== "" && f.value !== void 0);
  return /* @__PURE__ */ jsxs6("div", { style: { display: "flex", flexDirection: "column", height: "100%", minHeight: "80vh" }, children: [
    /* @__PURE__ */ jsx7(
      StepHeader,
      {
        logoUrl: config.merchant_logo_url,
        merchantName: config.merchant_name,
        currentStep,
        totalSteps,
        onClose,
        onBack,
        showBack: true
      }
    ),
    /* @__PURE__ */ jsx7("div", { style: { ...styles.body, flex: 1, overflow: "auto", paddingBottom: 8 }, children: groups.map((group) => /* @__PURE__ */ jsx7("div", { children: group.fields.sort((a, b) => getFieldOrder(a) - getFieldOrder(b)).map((field) => /* @__PURE__ */ jsx7(
      FieldInput,
      {
        field,
        groupId: group.id,
        onChange: onFieldChange
      },
      field.field_key
    )) }, group.id)) }),
    /* @__PURE__ */ jsxs6("div", { style: { ...styles.footer, position: "sticky", bottom: 0, background: "var(--ls-bg, #fff)" }, children: [
      !requiredFilled && /* @__PURE__ */ jsx7("div", { style: { fontSize: 12, color: "#999", textAlign: "center", marginBottom: 8 }, children: "Please fill all required fields (*)" }),
      /* @__PURE__ */ jsx7(Button, { onClick: onNext, disabled: !requiredFilled, loading, children: "Next" })
    ] })
  ] });
}

// src/screens/ConsentScreen.tsx
import { useState as useState3 } from "react";
import { jsx as jsx8, jsxs as jsxs7 } from "react/jsx-runtime";
function stripHtml(html) {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}
function CheckCircle({ checked }) {
  return /* @__PURE__ */ jsx8(
    "div",
    {
      style: {
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: checked ? "var(--ls-primary, #4CAF50)" : "#e0e0e0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "background 0.2s"
      },
      children: checked && /* @__PURE__ */ jsx8("span", { style: { color: "#fff", fontSize: 14, fontWeight: 700, lineHeight: 1 }, children: "\u2713" })
    }
  );
}
function SectionCard({
  section,
  expanded,
  onToggle,
  onAccept,
  onAcceptOption
}) {
  const isAccepted = section.interaction_type === "notice" ? true : section.interaction_type === "checkbox_options" ? section.options?.every((o) => o.isAccepted) ?? true : section.isAccepted;
  const rawPreview = stripHtml(section.body_html);
  const preview = rawPreview ? rawPreview.slice(0, 80) : "";
  return /* @__PURE__ */ jsxs7("div", { style: { borderBottom: "1px solid #f0f0f0" }, children: [
    /* @__PURE__ */ jsxs7(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "16px 0",
          cursor: "pointer"
        },
        children: [
          /* @__PURE__ */ jsx8(
            "div",
            {
              onClick: (e) => {
                e.stopPropagation();
                if (section.interaction_type === "notice") return;
                if (section.interaction_type === "checkbox_options") {
                  const allChecked = section.options?.every((o) => o.isAccepted) ?? false;
                  for (const opt of section.options ?? []) {
                    onAcceptOption(section.id, opt.id, !allChecked);
                  }
                } else {
                  onAccept(section.id, !section.isAccepted);
                }
              },
              children: /* @__PURE__ */ jsx8(CheckCircle, { checked: !!isAccepted })
            }
          ),
          /* @__PURE__ */ jsxs7("div", { style: { flex: 1, minWidth: 0 }, onClick: onToggle, children: [
            /* @__PURE__ */ jsx8("div", { style: { fontSize: 15, fontWeight: 600, lineHeight: 1.4 }, children: section.title }),
            !expanded && preview.length > 0 && /* @__PURE__ */ jsxs7(
              "div",
              {
                style: {
                  fontSize: 13,
                  color: "#888",
                  marginTop: 4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                },
                children: [
                  preview,
                  rawPreview.length > 80 ? "..." : ""
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsx8(
            "span",
            {
              style: {
                fontSize: 18,
                color: "#999",
                transition: "transform 0.2s",
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                flexShrink: 0,
                marginTop: 2,
                cursor: "pointer"
              },
              onClick: onToggle,
              children: "\u25BE"
            }
          )
        ]
      }
    ),
    expanded && /* @__PURE__ */ jsxs7("div", { style: { paddingLeft: 36, paddingBottom: 16 }, children: [
      section.body_html ? /* @__PURE__ */ jsx8(
        "div",
        {
          style: {
            fontSize: 14,
            lineHeight: 1.7,
            color: "#555",
            maxHeight: 200,
            overflow: "auto",
            marginBottom: 12
          },
          dangerouslySetInnerHTML: { __html: section.body_html }
        }
      ) : /* @__PURE__ */ jsx8("div", { style: { fontSize: 13, color: "#aaa", marginBottom: 12 }, children: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E2B\u0E32" }),
      section.interaction_type === "text_content" && /* @__PURE__ */ jsxs7(
        "div",
        {
          style: styles.checkboxRow,
          onClick: (e) => {
            e.stopPropagation();
            onAccept(section.id, !section.isAccepted);
          },
          children: [
            /* @__PURE__ */ jsx8(
              "div",
              {
                style: {
                  ...styles.checkbox,
                  ...section.isAccepted ? styles.checkboxChecked : {}
                },
                children: section.isAccepted && "\u2713"
              }
            ),
            /* @__PURE__ */ jsxs7("span", { style: { fontSize: 14 }, children: [
              "\u0E22\u0E34\u0E19\u0E22\u0E2D\u0E21",
              section.is_mandatory ? " (\u0E08\u0E33\u0E40\u0E1B\u0E47\u0E19)" : ""
            ] })
          ]
        }
      ),
      section.interaction_type === "checkbox_options" && /* @__PURE__ */ jsx8("div", { children: section.options?.map((opt) => /* @__PURE__ */ jsxs7(
        "div",
        {
          style: styles.checkboxRow,
          onClick: (e) => {
            e.stopPropagation();
            onAcceptOption(section.id, opt.id, !opt.isAccepted);
          },
          children: [
            /* @__PURE__ */ jsx8(
              "div",
              {
                style: {
                  ...styles.checkbox,
                  ...opt.isAccepted ? styles.checkboxChecked : {}
                },
                children: opt.isAccepted && "\u2713"
              }
            ),
            /* @__PURE__ */ jsx8("span", { style: { fontSize: 14 }, children: opt.label })
          ]
        },
        opt.id
      )) })
    ] })
  ] });
}
function ConsentScreen({
  config,
  sections,
  currentStep,
  totalSteps,
  loading,
  onClose,
  onBack,
  onAccept,
  onAcceptOption,
  onSubmit
}) {
  const [expandedId, setExpandedId] = useState3(null);
  const allMandatoryAccepted = sections.filter((s) => s.is_mandatory).every((s) => {
    if (s.interaction_type === "notice") return true;
    if (s.interaction_type === "checkbox_options") {
      return s.options?.every((o) => o.isAccepted) ?? true;
    }
    return s.isAccepted;
  });
  const allAccepted = sections.every((s) => {
    if (s.interaction_type === "notice") return true;
    if (s.interaction_type === "checkbox_options") {
      return s.options?.every((o) => o.isAccepted) ?? true;
    }
    return s.isAccepted;
  });
  const handleAcceptAll = () => {
    const targetState = !allAccepted;
    for (const section of sections) {
      if (section.interaction_type === "checkbox_options") {
        for (const opt of section.options ?? []) {
          if (opt.isAccepted !== targetState) {
            onAcceptOption(section.id, opt.id, targetState);
          }
        }
      } else {
        if (section.isAccepted !== targetState) {
          onAccept(section.id, targetState);
        }
      }
    }
  };
  return /* @__PURE__ */ jsxs7("div", { style: { display: "flex", flexDirection: "column", height: "100%", minHeight: "80vh" }, children: [
    /* @__PURE__ */ jsx8(
      StepHeader,
      {
        logoUrl: config.merchant_logo_url,
        merchantName: config.merchant_name,
        currentStep,
        totalSteps,
        onClose,
        onBack,
        showBack: true
      }
    ),
    /* @__PURE__ */ jsxs7("div", { style: { ...styles.body, flex: 1, overflow: "auto" }, children: [
      sections.map((section) => /* @__PURE__ */ jsx8(
        SectionCard,
        {
          section,
          expanded: expandedId === section.id,
          onToggle: () => setExpandedId(expandedId === section.id ? null : section.id),
          onAccept,
          onAcceptOption
        },
        section.id
      )),
      /* @__PURE__ */ jsxs7(
        "div",
        {
          style: {
            ...styles.checkboxRow,
            paddingTop: 16,
            marginTop: 4
          },
          onClick: handleAcceptAll,
          children: [
            /* @__PURE__ */ jsx8(CheckCircle, { checked: allAccepted }),
            /* @__PURE__ */ jsx8("span", { style: { fontSize: 15, fontWeight: 600 }, children: "\u0E22\u0E34\u0E19\u0E22\u0E2D\u0E21\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsx8("div", { style: { ...styles.footer, position: "sticky", bottom: 0, background: "var(--ls-bg, #fff)" }, children: /* @__PURE__ */ jsx8(Button, { onClick: onSubmit, disabled: !allMandatoryAccepted, loading, children: "Confirm" }) })
  ] });
}

// src/screens/CompleteScreen.tsx
import { useEffect as useEffect2 } from "react";
import { jsx as jsx9, jsxs as jsxs8 } from "react/jsx-runtime";
function CompleteScreen({ user, isNewUser, onComplete }) {
  useEffect2(() => {
    if (onComplete && user.id && user.access_token) {
      const timer = setTimeout(() => {
        onComplete(user);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [onComplete, user]);
  return /* @__PURE__ */ jsxs8(
    "div",
    {
      style: {
        ...styles.body,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 320,
        textAlign: "center"
      },
      children: [
        /* @__PURE__ */ jsx9(
          "div",
          {
            style: {
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--ls-primary), var(--ls-secondary))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              fontSize: 32,
              color: "#fff"
            },
            children: "\u2713"
          }
        ),
        /* @__PURE__ */ jsx9("h2", { style: { fontSize: 22, fontWeight: 700, marginBottom: 8 }, children: isNewUser ? "Welcome!" : "Welcome back!" }),
        /* @__PURE__ */ jsx9("p", { style: { color: "#888", fontSize: 15 }, children: isNewUser ? "Your account has been created successfully." : "You're all set. Redirecting..." })
      ]
    }
  );
}

// src/screens/ErrorScreen.tsx
import { Fragment as Fragment3, jsx as jsx10, jsxs as jsxs9 } from "react/jsx-runtime";
function ErrorScreen({ message, onRetry, onClose }) {
  return /* @__PURE__ */ jsxs9(Fragment3, { children: [
    /* @__PURE__ */ jsxs9("div", { style: styles.header, children: [
      /* @__PURE__ */ jsx10("span", { style: styles.stepTitle, children: "Error" }),
      onClose && /* @__PURE__ */ jsx10("button", { style: styles.closeBtn, onClick: onClose, "aria-label": "Close", children: "\xD7" })
    ] }),
    /* @__PURE__ */ jsxs9(
      "div",
      {
        style: {
          ...styles.body,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 240,
          textAlign: "center"
        },
        children: [
          /* @__PURE__ */ jsx10("div", { style: { fontSize: 48, marginBottom: 16 }, children: "\u26A0\uFE0F" }),
          /* @__PURE__ */ jsx10("p", { style: { color: "#D32F2F", fontSize: 15, marginBottom: 24 }, children: message }),
          /* @__PURE__ */ jsx10(Button, { onClick: onRetry, children: "Try Again" })
        ]
      }
    )
  ] });
}

// src/LoyaltySignup.tsx
import { jsx as jsx11, jsxs as jsxs10 } from "react/jsx-runtime";
var ErrorBoundary = class extends Component {
  constructor() {
    super(...arguments);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return /* @__PURE__ */ jsxs10("div", { style: { padding: 24, textAlign: "center" }, children: [
        /* @__PURE__ */ jsx11("div", { style: { fontSize: 48, marginBottom: 12 }, children: "\u26A0\uFE0F" }),
        /* @__PURE__ */ jsx11("h3", { style: { fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#D32F2F" }, children: "Component Error" }),
        /* @__PURE__ */ jsxs10("pre", { style: {
          fontSize: 12,
          color: "#666",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          background: "#f5f5f5",
          padding: 12,
          borderRadius: 8,
          textAlign: "left"
        }, children: [
          this.state.error.message,
          "\n\n",
          this.state.error.stack?.split("\n").slice(0, 5).join("\n")
        ] }),
        /* @__PURE__ */ jsx11(
          "button",
          {
            onClick: () => this.setState({ error: null }),
            style: {
              marginTop: 16,
              padding: "10px 24px",
              border: "1px solid #ddd",
              borderRadius: 8,
              background: "#fff",
              cursor: "pointer"
            },
            children: "Retry"
          }
        )
      ] });
    }
    return this.props.children;
  }
};
var KEYFRAME_STYLE = `@keyframes ls-spin { to { transform: rotate(360deg); } }`;
function LoyaltySignup({
  merchantCode,
  onComplete,
  onClose,
  language,
  theme: themeOverrides,
  mode = "modal",
  callbackUrl,
  directConfig
}) {
  const { state, actions } = useSignupFlow(merchantCode, void 0, language, directConfig, callbackUrl);
  const theme = useMemo(() => {
    const fromConfig = state.config?.theme ? {
      primaryColor: state.config.theme.primary_color,
      secondaryColor: state.config.theme.secondary_color
    } : {};
    return resolveTheme({ ...fromConfig, ...themeOverrides });
  }, [themeOverrides, state.config?.theme]);
  const vars = useMemo(() => cssVars(theme), [theme]);
  const handleNextFormStep = useCallback3(async () => {
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
      const hasFields = state.missingData?.default_fields_config?.some((g) => g.fields.length) || state.missingData?.custom_fields_config?.some((g) => g.fields.length);
      if (hasFields) step++;
      return step;
    }
    return state.totalSteps;
  }, [state]);
  const renderScreen = () => {
    if (state.screen === "loading") {
      return /* @__PURE__ */ jsx11(LoadingScreen, {});
    }
    if (state.screen === "error" || state.error) {
      return /* @__PURE__ */ jsx11(
        ErrorScreen,
        {
          message: state.error ?? "Something went wrong",
          onRetry: actions.clearError,
          onClose
        }
      );
    }
    if (!state.config) return /* @__PURE__ */ jsx11(LoadingScreen, {});
    switch (state.screen) {
      case "auth":
      case "otp":
        return /* @__PURE__ */ jsx11(
          AuthScreen,
          {
            config: state.config,
            lineProfile: state.lineProfile,
            phone: state.phone,
            showOtp: state.screen === "otp" || !!state.otpSessionId,
            otpCode: state.otpCode,
            loading: state.loading,
            error: state.error,
            totalSteps: state.totalSteps,
            onClose,
            onLineLogin: actions.initiateLineLogin,
            onPhoneSubmit: actions.requestOtp,
            onOtpSubmit: actions.verifyOtp,
            onClearError: actions.clearError
          }
        );
      case "persona":
        if (!state.missingData?.persona) return null;
        return /* @__PURE__ */ jsx11(
          PersonaScreen,
          {
            config: state.config,
            persona: state.missingData.persona,
            currentStep,
            totalSteps: state.totalSteps,
            loading: state.loading,
            onClose,
            onBack: actions.prevFormStep,
            onSelect: actions.selectPersona,
            onNext: actions.confirmPersonaAndRefetch
          }
        );
      case "profile": {
        const groups = [
          ...state.missingData?.default_fields_config ?? [],
          ...state.missingData?.custom_fields_config ?? []
        ].filter((g) => g.fields.length > 0);
        return /* @__PURE__ */ jsx11(
          ProfileScreen,
          {
            config: state.config,
            groups,
            currentStep,
            totalSteps: state.totalSteps,
            loading: state.loading,
            onClose,
            onBack: actions.prevFormStep,
            onFieldChange: actions.updateField,
            onNext: handleNextFormStep
          }
        );
      }
      case "consent":
        if (!state.missingData?.pdpa) return null;
        return /* @__PURE__ */ jsx11(
          ConsentScreen,
          {
            config: state.config,
            sections: state.missingData.pdpa,
            currentStep,
            totalSteps: state.totalSteps,
            loading: state.loading,
            onClose,
            onBack: actions.prevFormStep,
            onAccept: actions.updateConsent,
            onAcceptOption: actions.updateConsentOption,
            onSubmit: async () => {
              await actions.submitProfile();
            }
          }
        );
      case "complete":
        return /* @__PURE__ */ jsx11(
          CompleteScreen,
          {
            user: {
              id: state.userId ?? "",
              tel: null,
              line_id: state.lineProfile?.line_user_id ?? null,
              fullname: null,
              email: null,
              persona_id: state.selectedPersonaId,
              access_token: state.accessToken ?? "",
              refresh_token: state.refreshToken ?? ""
            },
            isNewUser: state.isNewUser,
            onComplete
          }
        );
      default:
        return null;
    }
  };
  const content = /* @__PURE__ */ jsxs10("div", { style: vars, children: [
    /* @__PURE__ */ jsx11("style", { children: KEYFRAME_STYLE }),
    renderScreen()
  ] });
  const errorToast = state.error && state.screen !== "error" && state.screen !== "auth" && state.screen !== "otp" ? /* @__PURE__ */ jsx11(
    "div",
    {
      onClick: actions.clearError,
      style: {
        position: "fixed",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#D32F2F",
        color: "#fff",
        padding: "12px 20px",
        borderRadius: 10,
        fontSize: 14,
        maxWidth: 360,
        textAlign: "center",
        zIndex: 1e4,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        cursor: "pointer"
      },
      children: state.error
    }
  ) : null;
  if (mode === "inline" || mode === "fullscreen") {
    return /* @__PURE__ */ jsx11(ErrorBoundary, { children: /* @__PURE__ */ jsxs10(
      "div",
      {
        style: {
          ...vars,
          ...mode === "fullscreen" ? { position: "fixed", inset: 0, zIndex: 9999, background: "var(--ls-bg)" } : {}
        },
        children: [
          /* @__PURE__ */ jsx11("style", { children: KEYFRAME_STYLE }),
          renderScreen(),
          errorToast
        ]
      }
    ) });
  }
  return /* @__PURE__ */ jsx11(ErrorBoundary, { children: /* @__PURE__ */ jsxs10(Modal, { onClose, children: [
    content,
    errorToast
  ] }) });
}
export {
  LoyaltySignup
};
//# sourceMappingURL=index.mjs.map