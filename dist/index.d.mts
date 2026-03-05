import * as react_jsx_runtime from 'react/jsx-runtime';

interface LoyaltySignupProps {
    merchantCode: string;
    onComplete?: (user: UserData) => void;
    onClose?: () => void;
    language?: Language;
    theme?: ThemeConfig;
    mode?: "modal" | "inline" | "fullscreen";
}
interface ThemeConfig {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: number;
    fontFamily?: string;
}
type Language = "en" | "th" | "zh" | "ja";
interface UserData {
    id: string;
    tel: string | null;
    line_id: string | null;
    fullname: string | null;
    email: string | null;
    persona_id: string | null;
    access_token: string;
    refresh_token: string;
}
interface MerchantConfig {
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
type AuthMethod = "line" | "tel";

interface LoyaltySignupFullProps extends LoyaltySignupProps {
    /** Supply config directly (skips config endpoint — useful for demo/testing) */
    directConfig?: MerchantConfig;
}
declare function LoyaltySignup({ merchantCode, onComplete, onClose, language, theme: themeOverrides, mode, directConfig, }: LoyaltySignupFullProps): react_jsx_runtime.JSX.Element;

export { type Language, LoyaltySignup, type LoyaltySignupFullProps, type LoyaltySignupProps, type MerchantConfig, type ThemeConfig, type UserData };
