import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const base = "http://localhost:3100";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
type Event = { name: string; url: string; props: Record<string, string> };

async function boundaries(context: BrowserContext, events: Event[]) {
  await context.route("https://plausible.io/api/event", async (route) => {
    events.push(JSON.parse(route.request().postData()!));
    await route.fulfill({ status: 202, headers: { "Access-Control-Allow-Origin": "*" }, body: "{}" });
  });
  await context.route("https://challenges.cloudflare.com/turnstile/v0/api.js*", (route) => route.fulfill({ contentType: "application/javascript", body: `window.turnstile={render(el,opts){const b=document.createElement('button');b.type='button';b.textContent='Verify for smoke test';b.onclick=()=>{opts.callback('e2e-'+crypto.randomUUID());b.textContent='Verified';};el.append(b);return 'widget';},remove(){}};` }));
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

for (const locale of ["en", "ru"] as const) {
test(`owner → friends → reveal → share poster (${locale})`, async ({ page, context, browser }, testInfo) => {
  const russian: Record<string, string> = {
    "pieces of you.": "частичек вас.", "Create your museum": "Создать свой музей",
    "Email address": "Электронная почта", "Continue with email": "Продолжить с почтой", "Email verification code": "Код из письма", "Verify code": "Подтвердить код",
    "Your name": "Ваше имя", "Museum address": "Адрес музея", "Museum title": "Название музея", "Required exhibits": "Сколько экспонатов", "Create museum": "Создать музей",
    "Copy invite link": "Скопировать приглашение", "Link copied": "Ссылка скопирована", "still forming": "ещё собирается", "No account needed": "Регистрация не нужна",
    "What is it?": "Что это?", "Why?": "Почему?", "Upload my own": "Загрузить свою", "Preparing your photo…": "Готовим фотографию…", "Add to museum": "Добавить в музей",
    "A little piece of you.": "Частичка вас.", "Create my own museum": "Создать свой музей", "Open your museum": "Открыть свой музей", "Make a share poster": "Создать постер",
    "Square · 1:1": "Квадрат · 1:1", "Download PNG": "Скачать PNG", "Landscape · 1.91:1": "Горизонтальный · 1.91:1", "Copy gallery link": "Скопировать ссылку на музей", "Gallery link copied": "Ссылка на музей скопирована",
  };
  const ui = (text: string) => locale === "ru" ? russian[text] ?? text : text;
  await context.addInitScript((value) => localStorage.setItem("museum-locale", value), locale);
  const events: Event[] = []; const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await boundaries(context, events);
  const suffix = `${Date.now()}${testInfo.project.name}`;
  const email = `smoke-${suffix}@example.com`;
  const username = `smoke_${suffix}`.slice(0, 32);
  let ownerId: string | undefined;
  try {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(ui("pieces of you."));
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath("landing.png"), fullPage: true });
    await page.getByRole("link", { name: ui("Create your museum") }).click();
    await expect(page).toHaveURL(/\/auth$/);
    await page.getByLabel(ui("Email address"), { exact: true }).fill(email);
    await page.getByRole("button", { name: ui("Continue with email") }).click();
    await expect(page.getByLabel(ui("Email verification code"))).toBeVisible();
    // Auth is real Supabase. Generate only the local email code through the admin API.
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (linkError || !link.user || !link.properties) throw new Error("Could not generate a local email code.");
    ownerId = link.user.id;
    await page.getByLabel(ui("Email verification code")).fill(link.properties.email_otp);
    await page.getByRole("button", { name: ui("Verify code") }).click();
    await expect(page).toHaveURL(/\/create$/);
    await page.getByLabel(ui("Your name"), { exact: true }).fill("Alex");
    await page.getByLabel("Upload your portrait", { exact: true }).setInputFiles({ name: "portrait.webp", mimeType: "image/webp", buffer: readFileSync("public/images/hero-woman-v2.webp") });
    await expect(page.locator(".hero-uploaded-portrait img")).toBeVisible();
    await page.getByLabel(ui("Museum address")).fill(username);
    await page.getByLabel(ui("Museum title"), { exact: true }).fill("Alex’s little world");
    await page.getByLabel(ui("Required exhibits")).selectOption("3");
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath("create.png"), fullPage: true });
    await page.getByRole("button", { name: ui("Create museum") }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    await expect(page.getByRole("img", { name: "Alex portrait", exact: true })).toBeVisible();
    const inviteUrl = await page.getByLabel("Invitation link").inputValue();
    const inviteToken = inviteUrl.split("/").at(-1)!;
    await page.getByRole("button", { name: ui("Copy invite link") }).click();
    await expect(page.getByRole("button", { name: ui("Link copied") })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("dashboard-collecting.png"), fullPage: true });
    const { data: museum } = await admin.from("museums").select("id,analytics_id").eq("slug", username).single();
    expect(museum).toBeTruthy();

    for (let index = 0; index < 3; index++) {
      const guest = await browser.newContext({ ...testInfo.project.use, baseURL: base, reducedMotion: "reduce" });
      await guest.addInitScript((value) => localStorage.setItem("museum-locale", value), locale);
      await boundaries(guest, events);
      const friend = await guest.newPage();
      friend.on("pageerror", (error) => errors.push(error.message));
      await friend.goto(`/museum/${username}`);
      await expect(friend.getByRole("heading", { level: 1 })).toContainText(ui("still forming"));
      await expect(friend.getByText("Sunday coffee", { exact: true })).toHaveCount(0);
      await friend.goto(inviteUrl);
      await expect(friend.getByText(ui("No account needed"), { exact: false })).toBeVisible();
      await friend.getByLabel(ui("What is it?")).fill(index === 0 ? "Sunday coffee" : `Memory ${index + 1}`);
      await friend.getByRole("textbox", { name: ui("Why?") }).fill("You make ordinary days feel special.");
      if (index === 0) {
        await friend.getByRole("button", { name: ui("Upload my own") }).click();
        const sharp = (await import("sharp")).default;
        const photo = await sharp({ create: { width: 480, height: 320, channels: 3, background: "#c9d7b8" } }).png().toBuffer();
        await friend.getByLabel("Upload a photo").setInputFiles({ name: "memory.png", mimeType: "image/png", buffer: photo });
        await expect(friend.getByText(ui("Preparing your photo…"))).toHaveCount(0);
      }
      await friend.getByRole("button", { name: "Verify for smoke test" }).click();
      await noOverflow(friend);
      if (index === 0) await friend.screenshot({ path: testInfo.outputPath("guest.png"), fullPage: true });
      await friend.getByRole("button", { name: ui("Add to museum") }).click();
      await expect(friend.getByRole("heading", { name: ui("A little piece of you.") })).toBeVisible();
      await noOverflow(friend);
      if (index === 0) {
        await friend.screenshot({ path: testInfo.outputPath("success.png"), fullPage: true });
        const { data: exhibit } = await admin.from("exhibits").select("image_url").eq("museum_id", museum!.id).single();
        const publicFile = await friend.request.get(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/exhibits/${exhibit!.image_url}`);
        expect(publicFile.ok()).toBe(false);
        await friend.getByRole("link", { name: ui("Create my own museum") }).click();
        await expect(friend).toHaveURL(/\/auth$/);
      }
      await guest.close();
    }
    // The owner's open dashboard notices the transition without a manual reload.
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3", { timeout: 25000 });
    await page.getByRole("link", { name: ui("Open your museum") }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Alex");
    await expect(page.getByRole("img", { name: "Alex portrait", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sunday coffee" })).toBeVisible();
    for (let index = 1; index <= 3; index++) {
      const scene = page.locator(`#exhibit-${index}`);
      const artwork = scene.locator("div[style]").first();
      await artwork.scrollIntoViewIfNeeded();
      await expect(artwork).toHaveCSS("opacity", "1");
      if (index === 1) await expect.poll(() => scene.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    }
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath("reveal.png"), fullPage: true });
    await page.getByRole("link", { name: ui("Make a share poster") }).click();
    const poster = page.getByRole("img", { name: "Museum of Me poster", exact: false });
    await expect.poll(() => poster.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.getByRole("button", { name: ui("Square · 1:1") }).click();
    await expect.poll(() => poster.evaluate((img: HTMLImageElement) => img.naturalWidth === 1080 && img.naturalHeight === 1080)).toBe(true);
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath("share.png"), fullPage: true });
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: ui("Download PNG") }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`${username}-museum-square.png`);
    await page.getByRole("button", { name: ui("Landscape · 1.91:1") }).click();
    await expect.poll(() => poster.evaluate((img: HTMLImageElement) => img.naturalWidth === 1200 && img.naturalHeight === 630)).toBe(true);
    await page.getByRole("button", { name: ui("Copy gallery link") }).click();
    await expect(page.getByRole("button", { name: ui("Gallery link copied") })).toBeVisible();
    for (const name of ["landing_view", "create_started", "signup_completed", "museum_created", "invite_copied", "invite_opened", "exhibit_started", "exhibit_submitted", "viral_cta_clicked", "museum_unlocked", "museum_viewed", "museum_shared"]) expect(events.some((event) => event.name === name), name).toBe(true);
    expect(events.filter((event) => event.name === "museum_unlocked")).toHaveLength(1);
    const payloads = JSON.stringify(events);
    for (const secret of [inviteToken, username, email, "Sunday coffee", "Alex’s little world"]) expect(payloads).not.toContain(secret);
    expect(events.filter((event) => event.name === "exhibit_submitted").every((event) => event.props.museum === museum!.analytics_id)).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    if (ownerId) {
      // Delete only this test's rows; the FK intentionally prevents implicit exhibit removal via invite deletion.
      const { data: museums } = await admin.from("museums").select("id,portrait_path").eq("owner_id", ownerId);
      for (const museum of museums ?? []) {
        const { data: exhibits } = await admin.from("exhibits").select("image_url").eq("museum_id", museum.id);
        const paths = (exhibits ?? []).map((e) => e.image_url).filter((url): url is string => Boolean(url?.startsWith("exhibits/")));
        if (paths.length) await admin.storage.from("exhibits").remove(paths);
        if (museum.portrait_path) await admin.storage.from("portraits").remove([museum.portrait_path]);
        await admin.from("exhibits").delete().eq("museum_id", museum.id);
      }
      await admin.auth.admin.deleteUser(ownerId);
    }
  }
});
}

test("public pages and privacy controls", async ({ page, context }) => {
  const events: Event[] = []; await boundaries(context, events);
  await page.addInitScript(() => { Object.defineProperty(navigator, "doNotTrack", { get: () => "1" }); });
  await page.goto("/"); await noOverflow(page);
  await expect(page.getByRole("img", { name: "Mila, a smiling woman" })).toBeVisible();
  await expect.poll(() => page.locator(".hero-orbit-card img").evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.getByRole("button", { name: "Pause memory motion" }).click();
  await expect(page.locator(".editorial-home")).toHaveClass(/motion-paused/);
  await page.getByRole("button", { name: "Read memory: One more coffee", exact: true }).click();
  await expect(page.getByRole("region", { name: "Selected memory" })).toContainText("another cup");
  await page.getByRole("button", { name: "Close memory" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const card = page.locator(".hero-orbit-card").first();
  const transform = await card.evaluate((element) => element.style.transform);
  await page.waitForTimeout(200);
  expect(await card.evaluate((element) => element.style.transform)).toBe(transform);
  await page.getByRole("link", { name: "Step inside a sample" }).click();
  await expect(page.getByText("A sample museum · Fictional memories")).toBeVisible();
  await noOverflow(page);
  await page.goto("/privacy"); await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible();
  await page.goto("/m/not-an-invitation"); await expect(page.getByText("Invitation unavailable")).toBeVisible();
  expect(events).toEqual([]);
});
