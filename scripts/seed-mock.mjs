import { randomBytes } from "node:crypto";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running seed:mock.");
}
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)) throw new Error("Mock seed is restricted to a local Supabase instance.");

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
};

async function request(path, options = {}) {
  const response = await fetch(`${url}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  const body = await response.text();
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${path} failed (${response.status}): ${body}`);
  return body ? JSON.parse(body) : null;
}

const email = process.env.MOCK_USER_EMAIL ?? "mila@example.com";
const password = process.env.MOCK_USER_PASSWORD ?? "museum-of-me-local-password";
const users = await request("/auth/v1/admin/users?per_page=1000");
let user = users.users?.find((candidate) => candidate.email === email);

if (!user) {
  user = await request("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
}

const ownerId = user.id;
const museumId = "b7f2ac1d-8e8c-4b4c-9a4d-0c4c1e4d7a01";
const inviteId = "b7f2ac1d-8e8c-4b4c-9a4d-0c4c1e4d7a02";

async function upsert(table, rows, onConflict) {
  return request(`/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(rows),
  });
}

await upsert("profiles", [{ user_id: ownerId, username: "mila", display_name: "Mila Petrova" }], "user_id");
await upsert("museums", [{ id: museumId, owner_id: ownerId, slug: "mila", title: "Mila’s Museum", theme: "paper", required_exhibits: 5, collected_exhibits: 2, status: "collecting", unlocked_at: null }], "id");
await upsert("invite_links", [{ id: inviteId, museum_id: museumId, token: randomBytes(32).toString("hex"), max_submissions: 5 }], "id");

await request(`/rest/v1/exhibits?museum_id=eq.${museumId}`, { method: "DELETE" });
await request("/rest/v1/exhibits", {
  method: "POST",
  headers: { Prefer: "return=minimal" },
  body: JSON.stringify([
    { museum_id: museumId, invite_id: inviteId, title: "The red scarf", caption: "For all the walks where the weather did not matter.", media_type: "text" },
    { museum_id: museumId, invite_id: inviteId, title: "A blurry sunset", caption: "You always stop to look up, even when we are late.", media_type: "text" },
  ]),
});

console.log(`Seeded Museum of Me mock data for ${email}.`);
