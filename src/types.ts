/* ------------------------------------------------------------------ */
/*  Public API types (what the host project sees)                     */
/* ------------------------------------------------------------------ */

export interface LoyaltySignupProps {
  merchantCode: string;
  onComplete?: (user: UserData) => void;
  onClose?: () => void;
  language?: Language;
  theme?: ThemeConfig;
  mode?: "modal" | "inline" | "fullscreen";
}

export interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  fontFamily?: string;
}

export type Language = "en" | "th" | "zh" | "ja";

export interface UserData {
  id: string;
  tel: string | null;
  line_id: string | null;
  fullname: string | null;
  email: string | null;
  persona_id: string | null;
  access_token: string;
  refresh_token: string;
}

/* ------------------------------------------------------------------ */
/*  Merchant config (returned by bff_get_merchant_frontend_config)    */
/* ------------------------------------------------------------------ */

export interface MerchantConfig {
  supabase_url: string;
  supabase_anon_key: string;
  /** The canonical merchant_code from the database (correct casing) */
  merchant_code?: string;
  auth_methods: AuthMethod[];
  line_liff_id: string | null;
  merchant_name: string;
  merchant_logo_url: string | null;
  theme: {
    primary_color: string;
    secondary_color: string;
  } | null;
  signup_incentive: string | null;
}

export type AuthMethod = "line" | "tel";

/* ------------------------------------------------------------------ */
/*  Auth flow types                                                   */
/* ------------------------------------------------------------------ */

export type NextStep =
  | "verify_line"
  | "verify_tel"
  | "complete_profile_new"
  | "complete_profile_existing"
  | "complete";

export type FlowScreen =
  | "loading"
  | "auth"
  | "otp"
  | "persona"
  | "profile"
  | "consent"
  | "complete"
  | "error";

export interface AuthCompleteResponse {
  success: boolean;
  next_step: NextStep;
  user_account?: {
    id: string;
    tel: string | null;
    line_id: string | null;
    fullname: string | null;
    email: string | null;
  };
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  is_new_user?: boolean;
  is_signup_form_complete?: boolean;
  missing?: {
    tel: boolean;
    line: boolean;
    consent: boolean;
    profile: boolean;
    address: boolean;
  };
  missing_data?: MissingData | null;
  message?: string;
}

export interface LineProfile {
  line_user_id: string;
  display_name: string;
  picture_url: string | null;
}

export interface OtpResponse {
  success: boolean;
  session_id: string;
  expires_in: number;
  message: string;
}

/* ------------------------------------------------------------------ */
/*  Profile form types (from missing_data)                            */
/* ------------------------------------------------------------------ */

export interface MissingData {
  persona?: PersonaConfig | null;
  default_fields_config?: FieldGroup[] | null;
  custom_fields_config?: FieldGroup[] | null;
  pdpa?: ConsentSection[] | null;
  selected_section?: string | null;
}

export interface PersonaConfig {
  merchant_config: { persona_attain: string };
  selected_persona_id: string | null;
  persona_groups: PersonaGroup[];
}

export interface PersonaGroup {
  id: string;
  name: string;
  personas: Persona[];
}

export interface Persona {
  id: string;
  name: string;
  image_url: string | null;
  description: string | null;
  sort_order: number;
}

export interface FieldGroup {
  id: string;
  name?: string;
  fields: FormField[];
}

export interface FormField {
  id?: string;
  field_key: string;
  label: string;
  placeholder: string | null;
  field_type: string;
  is_required: boolean;
  value: string | string[] | null;
  options?: FieldOptionBackend[] | null;
  /** Legacy format from storybook mocks */
  field_options?: FieldOptionLegacy[] | null;
  sort_order?: number;
  order_index?: number;
  is_address_field?: boolean;
  persona_ids?: string[] | null;
  conditions?: FieldCondition[] | null;
  text_format?: string;
}

/** Backend format from bff_get_user_profile_template */
export interface FieldOptionBackend {
  id?: string;
  option_value: string;
  option_label: string;
  is_default?: boolean;
  order_index?: number;
}

/** Legacy/simplified format */
export interface FieldOptionLegacy {
  value: string;
  label: string;
}

export interface FieldCondition {
  source_field_key: string;
  operator: string;
  compare_value: string;
  target_field_key?: string;
  action_type: string;
}

export interface ConsentSection {
  id: string;
  title: string;
  version_label: string | null;
  body_html: string;
  interaction_type: "notice" | "text_content" | "checkbox_options";
  is_mandatory: boolean;
  isAccepted: boolean;
  isExpanded?: boolean;
  options?: ConsentOption[];
}

export interface ConsentOption {
  id: string;
  label: string;
  isAccepted: boolean;
}

/* ------------------------------------------------------------------ */
/*  State machine                                                     */
/* ------------------------------------------------------------------ */

export interface SignupState {
  screen: FlowScreen;
  config: MerchantConfig | null;
  lineProfile: LineProfile | null;
  otpSessionId: string | null;
  phone: string;
  otpCode: string;
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  missingData: MissingData | null;
  selectedPersonaId: string | null;
  formStep: "persona" | "default_field" | "custom_field" | "pdpa";
  isNewUser: boolean;
  totalSteps: number;
  currentStep: number;
  error: string | null;
  loading: boolean;
}

export type SignupAction =
  | { type: "SET_CONFIG"; config: MerchantConfig }
  | { type: "SET_LINE_PROFILE"; profile: LineProfile }
  | { type: "SET_PHONE"; phone: string }
  | { type: "SET_OTP_CODE"; code: string }
  | { type: "SET_OTP_SESSION"; sessionId: string }
  | { type: "SET_AUTH_RESULT"; result: AuthCompleteResponse }
  | { type: "SET_SCREEN"; screen: FlowScreen }
  | { type: "SET_FORM_STEP"; step: SignupState["formStep"] }
  | { type: "SELECT_PERSONA"; personaId: string }
  | { type: "UPDATE_FIELD"; groupId: string; fieldKey: string; value: string | string[] | null }
  | { type: "REFRESH_TEMPLATE"; template: MissingData }
  | { type: "UPDATE_CONSENT"; sectionId: string; accepted: boolean }
  | { type: "UPDATE_CONSENT_OPTION"; sectionId: string; optionId: string; accepted: boolean }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "PROFILE_SAVED" }
  | { type: "RESET" };
