/**
 * Vercel only (frontend-only deployment). The SkillUp API is not hosted on Vercel, so every
 * /api/* request gets a clear 503 in the app's error format until vercel.json rewrites /api to
 * the real API (docs/deploy.md, "Frontend on Vercel"). Not used by Vite or Docker.
 */
export default function handler(_req, res) {
  res.statusCode = 503;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(
    JSON.stringify({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message:
          "The SkillUp server isn't connected to this site yet. This is a preview of the app only.",
      },
    }),
  );
}
