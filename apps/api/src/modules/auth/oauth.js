/**
 * OAuth adapter interface for college Google / Microsoft sign-in (B1, task 7).
 * Stub only: no provider is implemented in v1.
 *
 * An implementation must:
 * 1. Build the provider authorization URL (with state + PKCE).
 * 2. Exchange the callback code for an ID token and verify it.
 * 3. Accept only emails in allowedDomains (for example "acet.edu.in").
 * 4. Map the verified email to an existing active user. Never auto-create users or roles.
 * The auth controller then issues the same access + refresh tokens as password login.
 */
