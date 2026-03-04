import type {
  AuthCompleteResponse,
  LineProfile,
  OtpResponse,
} from "../types";
import { rpcCall, rpcPost } from "./client";

export async function exchangeLineCode(
  code: string,
  merchantCode: string,
  redirectUri: string,
): Promise<LineProfile> {
  return rpcCall<LineProfile>("auth-line", {
    code,
    merchant_code: merchantCode,
    redirect_uri: redirectUri,
  });
}

export async function sendOtp(
  phone: string,
  merchantCode: string,
): Promise<OtpResponse> {
  return rpcCall<OtpResponse>("auth-send-otp", {
    phone,
    merchant_code: merchantCode,
  });
}

export interface AuthCompleteParams {
  merchantCode: string;
  lineUserId?: string;
  tel?: string;
  otpCode?: string;
  sessionId?: string;
  accessToken?: string;
  language?: string;
}

export async function authComplete(
  params: AuthCompleteParams,
): Promise<AuthCompleteResponse> {
  const body: Record<string, unknown> = {
    merchant_code: params.merchantCode,
  };
  if (params.lineUserId) body.line_user_id = params.lineUserId;
  if (params.tel) body.tel = params.tel;
  if (params.otpCode) body.otp_code = params.otpCode;
  if (params.sessionId) body.session_id = params.sessionId;
  if (params.accessToken) body.access_token = params.accessToken;
  if (params.language) body.language = params.language;

  return rpcCall<AuthCompleteResponse>("bff-auth-complete", body);
}

export async function fetchProfileTemplate(
  language: string,
  accessToken: string,
  merchantId?: string,
  merchantCode?: string,
): Promise<Record<string, unknown>> {
  const params: Record<string, unknown> = { p_language: language, p_mode: "new" };
  if (merchantCode) params.p_merchant_code = merchantCode;
  return rpcPost(
    "bff_get_user_profile_template",
    params,
    accessToken,
    merchantId,
  );
}

export async function saveProfile(
  formData: Record<string, unknown>,
  accessToken: string,
  merchantId?: string,
): Promise<{ success: boolean; user_id: string; is_signup_form_complete: boolean }> {
  return rpcPost("bff_save_user_profile", { p_data: formData }, accessToken, merchantId);
}
