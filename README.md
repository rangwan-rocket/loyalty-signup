# Loyalty Signup Component

A self-contained React component that handles the entire loyalty program signup/login flow — LINE OAuth, Phone OTP, profile form, persona selection, and PDPA consent collection. Drop it into any React/Next.js storefront with a single prop.

## Install

```bash
npm install github:rangwan-rocket/loyalty-signup
```

## Quick Start

```tsx
import { LoyaltySignup } from '@loyaltyst/signup';

function App() {
  const [showSignup, setShowSignup] = useState(false);

  return (
    <>
      <button onClick={() => setShowSignup(true)}>Sign Up / Login</button>

      {showSignup && (
        <LoyaltySignup
          merchantCode="YOUR_MERCHANT_CODE"
          language="th"
          mode="modal"
          onComplete={(user) => {
            // User signed up or logged in successfully
            console.log('User ID:', user.id);
            console.log('JWT:', user.access_token);

            // Store the token for authenticated API calls
            localStorage.setItem('access_token', user.access_token);
            localStorage.setItem('refresh_token', user.refresh_token);

            setShowSignup(false);
            // Redirect to account page, refresh cart, etc.
          }}
          onClose={() => setShowSignup(false)}
        />
      )}
    </>
  );
}
```

That's it. The component handles everything else internally.

## What It Does

When rendered, the component:

1. Fetches merchant config (auth methods, LINE credentials, theme, logo) from the backend
2. Shows LINE login button and/or phone OTP input based on merchant config
3. Handles LINE OAuth redirect (redirects to LINE, receives callback with auth code)
4. Sends OTP via SMS, auto-submits when 6 digits entered
5. Shows persona selection if configured (member types like Dealer, Customer, etc.)
6. Shows dynamic profile form with fields configured per merchant and persona
7. Shows PDPA consent collection
8. Saves profile and returns authenticated user with JWT

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `merchantCode` | `string` | **Yes** | — | Your merchant code (e.g., `"newcrm"`) |
| `onComplete` | `(user) => void` | No | — | Called when signup/login is fully complete |
| `onClose` | `() => void` | No | — | Called when user closes the popup |
| `language` | `"th" \| "en"` | No | `"th"` | Language for form labels and consent text |
| `mode` | `"modal" \| "inline" \| "fullscreen"` | No | `"modal"` | How the component renders |
| `theme` | `ThemeConfig` | No | Auto from merchant | Override brand colors |

### Mode Options

- **`modal`** — Popup overlay. Centered on desktop, bottom sheet on mobile. Click outside to close.
- **`inline`** — Renders in-place within your page layout. No overlay.
- **`fullscreen`** — Covers the entire viewport.

### ThemeConfig (optional)

Override the merchant's theme if needed:

```tsx
<LoyaltySignup
  merchantCode="newcrm"
  theme={{
    primaryColor: '#E91E63',
    secondaryColor: '#9C27B0',
  }}
/>
```

Theme is auto-loaded from the merchant's display settings. Only use this prop if you need to override.

### onComplete Callback

```tsx
onComplete={(user) => {
  user.id             // UUID — user account ID
  user.access_token   // JWT — use for authenticated API calls (24h expiry)
  user.refresh_token  // Token to refresh the JWT (30 day expiry)
  user.tel            // Phone number (if provided)
  user.line_id        // LINE user ID (if connected)
  user.fullname       // Full name (if filled)
  user.email          // Email (if filled)
  user.persona_id     // Selected persona/member type ID
}}
```

### Using the JWT

After `onComplete`, include the access token in all API calls:

```tsx
fetch('https://your-api.com/endpoint', {
  headers: {
    'Authorization': `Bearer ${user.access_token}`
  }
});
```

## Setup Requirements

### 1. LINE Developer Console

Add your storefront URL as a **Callback URL** in your LINE Login channel:

```
https://www.yourstore.com
```

For local development:
```
http://localhost:3000
```

This is required for LINE OAuth redirect to work. The component auto-detects the current page URL as the callback.

### 2. That's it

The component auto-loads everything else from the backend:
- Supabase connection (hardcoded)
- LINE Channel ID (from `merchant_credentials`)
- Auth methods — LINE only, Phone only, or both (from `merchant_master.auth_methods`)
- Merchant logo and theme colors (from `merchant_display_settings`)
- Profile form fields and options (from `bff_get_user_profile_template`)
- Persona/member types (from persona config)
- PDPA consent forms (from consent config)

## Examples

### Trigger from a button

```tsx
const [open, setOpen] = useState(false);

<button onClick={() => setOpen(true)}>
  Join Loyalty Program
</button>

{open && (
  <LoyaltySignup
    merchantCode="newcrm"
    mode="modal"
    onComplete={(user) => { setOpen(false); }}
    onClose={() => setOpen(false)}
  />
)}
```

### Inline on a registration page

```tsx
<div className="registration-container">
  <h1>Create Account</h1>
  <LoyaltySignup
    merchantCode="newcrm"
    mode="inline"
    language="en"
    onComplete={(user) => router.push('/account')}
  />
</div>
```

### Next.js App Router

```tsx
'use client';
import { useState } from 'react';
import { LoyaltySignup } from '@loyaltyst/signup';

export default function Page() {
  const [show, setShow] = useState(false);

  return (
    <>
      <button onClick={() => setShow(true)}>Login / Register</button>
      {show && (
        <LoyaltySignup
          merchantCode="newcrm"
          mode="modal"
          onComplete={(user) => {
            document.cookie = `token=${user.access_token}; path=/`;
            setShow(false);
            window.location.reload();
          }}
          onClose={() => setShow(false)}
        />
      )}
    </>
  );
}
```

## Peer Dependencies

- React 18+
- React DOM 18+

## Flow Overview

```
merchantCode
     │
     ▼
┌─────────────────┐
│  Load Config    │ ← auto-fetches auth methods, LINE creds, theme, logo
└────────┬────────┘
         ▼
┌─────────────────┐
│  Auth Screen    │ ← LINE OAuth and/or Phone OTP
└────────┬────────┘
         ▼
┌─────────────────┐
│  Persona Select │ ← member type (if configured)
└────────┬────────┘
         ▼
┌─────────────────┐
│  Profile Form   │ ← dynamic fields per merchant + persona
└────────┬────────┘
         ▼
┌─────────────────┐
│  PDPA Consent   │ ← privacy policy + marketing consent
└────────┬────────┘
         ▼
    onComplete(user)
```

Steps are skipped automatically if not configured or already completed. Returning users who completed signup go straight to `onComplete`.
