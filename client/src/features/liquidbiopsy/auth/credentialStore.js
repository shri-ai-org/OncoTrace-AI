// Holds the demo credential in memory only, for the life of the loaded page.
//
// Deliberately NOT sessionStorage or localStorage: this is one credential
// shared between several people, so it re-prompts on every refresh and on
// every new tab, and nothing is ever written to the device. Navigating inside
// the app (react-router, no reload) keeps the session, which is the only case
// where holding it matters.
//
// It is never a VITE_* build variable either -- client/.env is committed, and
// anything in it ships inside the JS bundle.

export const AUTH_EXPIRED_EVENT = "lb-auth-expired";

let credential = null;

// btoa() throws on any character above U+00FF, which a password may contain.
export function encodeCredential(username, password) {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function getCredential() {
  return credential;
}

export function setCredential(encoded) {
  credential = encoded;
}

// Also notifies the gate, so a credential rejected mid-session puts the login
// modal back up rather than leaving the user on a dead dashboard.
export function clearCredential() {
  credential = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
}

export function authHeader() {
  return credential ? { Authorization: `Basic ${credential}` } : {};
}
