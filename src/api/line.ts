const LINE_AUTH_BASE = "https://access.line.me/oauth2/v2.1/authorize";

export interface LineOAuthParams {
  channelId: string;
  redirectUri: string;
  state: string;
}

export function buildLineAuthUrl({ channelId, redirectUri, state }: LineOAuthParams): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: redirectUri,
    state,
    scope: "profile openid",
    bot_prompt: "aggressive",
  });
  return `${LINE_AUTH_BASE}?${params.toString()}`;
}

export function generateState(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Check current URL for LINE OAuth callback params.
 * Returns { code, state } if present, null otherwise.
 */
export function parseLineCallback(): { code: string; state: string } | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  if (code && state) return { code, state };
  return null;
}

/**
 * Remove LINE OAuth params from URL without reload (clean up address bar).
 */
export function cleanLineCallbackParams(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("friendship_status_changed");
  url.searchParams.delete("liffClientId");
  url.searchParams.delete("liffRedirectUri");
  window.history.replaceState({}, "", url.toString());
}
