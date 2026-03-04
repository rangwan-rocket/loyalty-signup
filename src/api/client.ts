import type { MerchantConfig } from "../types";

const SUPABASE_URL = "https://wkevmsedchftztoolkmi.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZXZtc2VkY2hmdHp0b29sa21pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MTM2OTgsImV4cCI6MjA2NjA4OTY5OH0.bd8ELGtX8ACmk_WCxR_tIFljwyHgD3YD4PdBDpD-kSM";

let _config: MerchantConfig | null = null;

export function setConfig(config: MerchantConfig) {
  _config = config;
}

function getBaseUrl(): string {
  return `${_config?.supabase_url ?? SUPABASE_URL}/functions/v1`;
}

function getAnonKey(): string {
  return _config?.supabase_anon_key ?? SUPABASE_ANON_KEY;
}

export async function rpcCall<T>(
  functionName: string,
  body: Record<string, unknown>,
  accessToken?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: getAnonKey(),
    Authorization: `Bearer ${accessToken ?? getAnonKey()}`,
  };

  const res = await fetch(`${getBaseUrl()}/${functionName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.message ?? data?.error ?? res.statusText ?? "Request failed";
    throw new Error(msg);
  }

  // Some edge functions return { success: false, error: "..." } with HTTP 200
  if (data && data.success === false && data.error) {
    throw new Error(data.error);
  }

  return data as T;
}

/** Call a Postgres RPC function via PostgREST (not an edge function) */
export async function rpcPost<T>(
  functionName: string,
  body: Record<string, unknown>,
  accessToken: string,
  merchantId?: string,
): Promise<T> {
  const baseUrl = _config?.supabase_url ?? SUPABASE_URL;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: getAnonKey(),
    Authorization: `Bearer ${accessToken}`,
  };

  if (merchantId) {
    headers["x-merchant-id"] = merchantId;
  }

  const res = await fetch(`${baseUrl}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
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
      } catch {}
    }
    throw new Error(msg);
  }

  return data as T;
}

interface BackendConfigResponse {
  merchant_name: string;
  merchant_code: string;
  auth_methods: string[];
  line_channel_id: string | null;
  supabase_url: string;
  supabase_anon_key: string;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
  background_image_url: string | null;
  border_radius: string | null;
  font_family: string | null;
}

export async function fetchMerchantConfig(merchantCode: string): Promise<MerchantConfig> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/bff-get-merchant-frontend-config`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ merchant_code: merchantCode }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error ?? "Failed to load merchant configuration");
  }

  const data = (await res.json()) as BackendConfigResponse;

  const config: MerchantConfig = {
    supabase_url: SUPABASE_URL,
    supabase_anon_key: SUPABASE_ANON_KEY,
    merchant_code: data.merchant_code,
    auth_methods: data.auth_methods as MerchantConfig["auth_methods"],
    line_liff_id: data.line_channel_id,
    merchant_name: data.merchant_name,
    merchant_logo_url: data.logo_url,
    theme: (data.primary_color || data.secondary_color)
      ? {
          primary_color: data.primary_color ?? "#E91E63",
          secondary_color: data.secondary_color ?? "#9C27B0",
        }
      : null,
    signup_incentive: null,
  };

  setConfig(config);
  return config;
}
