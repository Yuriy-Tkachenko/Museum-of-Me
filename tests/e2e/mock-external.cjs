// Loaded ONLY by the local test command via node --require. Never imported by app code.
const site = new URL(process.env.NEXT_PUBLIC_SITE_URL);
const database = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
if (site.hostname !== 'localhost' || !['127.0.0.1', 'localhost'].includes(database.hostname)) throw new Error('External fixtures are restricted to localhost.');
const original = global.fetch;
const used = new Set();
global.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
    const body = JSON.parse(init.body);
    const success = body.secret === 'local-e2e-secret' && /^e2e-[a-f0-9-]{36}$/.test(body.response) && !used.has(body.response);
    used.add(body.response);
    return Response.json({ success, hostname: 'localhost', action: 'submit_exhibit' });
  }
  if (url.startsWith('https://api.pexels.com/')) return Response.json({ photos: [{ id: 1, alt: 'Coffee on a table', photographer: 'Test photographer', photographer_url: 'https://www.pexels.com', src: { medium: 'https://images.pexels.com/photos/1/coffee.jpeg', large2x: 'https://images.pexels.com/photos/1/coffee.jpeg' } }] });
  return original(input, init);
};
