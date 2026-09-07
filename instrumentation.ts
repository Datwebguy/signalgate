export async function register() {
  // Do not import the sqlite poller here. Next.js webpacks this file on Vercel
  // and cannot bundle node:sqlite / dotenv. Continuous demand:
  // - Vercel: Cron GET /api/watchlist/poll
  // - Railway/Docker: npm run worker
}
