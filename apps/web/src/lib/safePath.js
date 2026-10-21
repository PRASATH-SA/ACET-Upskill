/**
 * Returns `path` only if it is a same-origin app path, else null. Blocks protocol-relative
 * and backslash tricks ("//evil.com", "/\\evil.com", encoded forms) that browsers treat as
 * another origin, so a crafted link cannot turn the post-login redirect into an open
 * redirect (react-router CVE-2025-68470 class; v6 has no fix).
 * @param {unknown} path
 * @returns {string | null}
 */
export function safeReturnPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/')) return null;
  let decoded = path;
  try {
    // Decode repeatedly so %5C%5C and double-encoding are checked too.
    for (let i = 0; i < 3; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return null;
  }
  // Control characters are exactly what this check looks for.
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f]/.test(decoded) || decoded.startsWith('//')) return null;
  try {
    const url = new URL(decoded, 'https://skillup.invalid');
    if (url.origin !== 'https://skillup.invalid') return null;
  } catch {
    return null;
  }
  return path;
}
