// End-to-end smoke test (Playwright) — drives the real UI across roles and
// prints a PASS/FAIL checklist for the full 5R flow.
//
//   npm run e2e                         # default: live deploy
//   E2E_BASE_URL=http://localhost:3000 npm run e2e
//
// Mock auth: the session is set via cookies (session_email + session_roles),
// mirroring how the app authenticates demo users.
import { chromium } from "playwright";

const BASE =
  process.argv[2] ||
  process.env.E2E_BASE_URL ||
  "https://sustainable-5r-shadow.vercel.app";

const TS = Date.now().toString().slice(-6);
const FINDING = `E2E temuan ${TS}`;
const REDTAG = `E2E barang ${TS}`;

const results = [];
const check = (name, ok) => {
  results.push({ name, ok });
  console.log(`${ok ? "✓ PASS" : "✗ FAIL"}  ${name}`);
};

const ck = (name, value) => ({ name, value, url: BASE, httpOnly: true, sameSite: "Lax" });

// Robust navigation: domcontentloaded (some pages keep a connection open so
// "load" never fires) + a couple of retries for flaky networks.
async function go(page, path) {
  let err;
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      return;
    } catch (e) {
      err = e;
      await page.waitForTimeout(1500);
    }
  }
  throw err;
}

async function main() {
  console.log(`\nE2E target: ${BASE}\n`);
  const browser = await chromium.launch();
  const ctxFor = async (email, roles) => {
    const c = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1200, height: 1000 } });
    await c.addCookies([ck("session_email", email), ck("session_roles", roles)]);
    return c;
  };

  // A) Auditor: catat temuan pada audit draft + kirim
  {
    const c = await ctxFor("auditor1@5r.local", "auditor");
    const p = await c.newPage();
    p.setDefaultTimeout(60000);
    await go(p, `/audit`);
    await p.waitForTimeout(1500);
    const links = [
      ...new Set(await p.locator('a[href^="/audit/"]').evaluateAll((e) => e.map((x) => x.getAttribute("href")))),
    ];
    let target = null;
    for (const h of links) {
      await go(p, `${h}`);
      await p.waitForTimeout(800);
      if ((await p.locator("#pillar").count()) > 0) {
        target = h;
        break;
      }
    }
    check("auditor menemukan audit draft yang bisa diedit", !!target);
    if (target) {
      await p.selectOption("#pillar", { index: 1 });
      await p.waitForTimeout(400);
      await p.selectOption("#guidingQuestionId", { index: 1 });
      await p.selectOption("#kategori", "HIGH");
      await p.fill("#description", FINDING);
      await p.getByRole("button", { name: /Tambah Temuan/ }).click();
      await p.waitForTimeout(2500);
      check("temuan tersimpan & tampil", (await p.locator("body").innerText()).includes(FINDING));
      await p.reload({ waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1500);
      check("temuan persist setelah reload (DB)", (await p.locator("body").innerText()).includes(FINDING));
      await p.getByRole("button", { name: /Kirim & Distribusikan/ }).click();
      await p.waitForTimeout(2500);
      check("audit terkirim", p.url().includes("submitted=1"));
    }
    await c.close();
  }

  // B) Admin: isi CAPA + verifikasi Done (sinkron audit→CAPA→skor)
  {
    const c = await ctxFor("admin@5r.local", "admin");
    const p = await c.newPage();
    p.setDefaultTimeout(60000);
    await go(p, `/capa`);
    await p.waitForTimeout(1500);
    const link = p.locator('a[href^="/capa/"]', { hasText: FINDING }).first();
    const found = (await link.count()) > 0;
    check("temuan muncul di inbox CAPA (sinkron audit→CAPA)", found);
    if (found) {
      await link.click();
      await p.waitForTimeout(1800);
      const url = p.url();
      await p.fill("#rootCause", "Akar masalah E2E.");
      await p.fill("#correctiveAction", "Korektif E2E.");
      await p.fill("#preventiveAction", "Preventif E2E.");
      await p.fill("#woScPoNumber", `WO-E2E-${TS}`);
      await p.getByRole("button", { name: /Simpan CAPA/ }).click();
      await p.waitForTimeout(2500);
      check("CAPA tersimpan", p.url().includes("saved=1"));
      await p.goto(url, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1500);
      check("data CAPA persist (No. WO tampil)", (await p.locator("body").innerText()).includes(`WO-E2E-${TS}`));
      await p.getByRole("button", { name: /Selesai \(Done\)/ }).click();
      await p.waitForTimeout(2500);
      check("CAPA diverifikasi Done (skor dihitung ulang)", p.url().includes("verified=1"));
    }
    await c.close();
  }

  // C) Auditee: checklist harian
  {
    const c = await ctxFor("pic.ref-2@5r.local", "auditee");
    const p = await c.newPage();
    p.setDefaultTimeout(60000);
    await go(p, `/checklist`);
    await p.waitForTimeout(1500);
    if ((await p.getByRole("button", { name: /Simpan Checklist/ }).count()) > 0) {
      await p.getByRole("button", { name: /Tidak Sesuai/ }).first().click();
      await p.waitForTimeout(400);
      await p.getByRole("button", { name: /Simpan Checklist/ }).click();
      await p.waitForTimeout(2500);
      check("checklist harian tersimpan", (await p.locator("body").innerText()).includes("tersimpan") || p.url().includes("saved"));
    } else check("checklist form tersedia", false);
    await c.close();
  }

  // D) Red Tag: dibuat (auditee) lalu diputuskan (koordinator)
  {
    const c = await ctxFor("pic.ref-2@5r.local", "auditee");
    const p = await c.newPage();
    p.setDefaultTimeout(60000);
    await go(p, `/redtag/baru`);
    await p.waitForTimeout(1500);
    await p.fill("#name", REDTAG);
    await p.selectOption('select[name="category"]', { index: 1 });
    await p.fill("#reason", "Tidak terpakai (E2E).");
    await p.getByRole("button", { name: /Daftarkan Red Tag/ }).click();
    await p.waitForTimeout(2500);
    check("red tag terdaftar", p.url().includes("created=1"));
    await c.close();

    const c2 = await ctxFor("redtag@5r.local", "kord_red_tag");
    const p2 = await c2.newPage();
    p2.setDefaultTimeout(60000);
    await go(p2, `/redtag`);
    await p2.waitForTimeout(1500);
    const rt = p2.locator('a[href^="/redtag/"]', { hasText: REDTAG }).first();
    const rtFound = (await rt.count()) > 0;
    check("red tag muncul untuk koordinator (sinkron)", rtFound);
    if (rtFound) {
      await rt.click();
      await p2.waitForTimeout(1500);
      if ((await p2.locator("#decision").count()) > 0) {
        await p2.selectOption("#decision", "INTERNAL");
        await p2.getByRole("button", { name: /Simpan Keputusan/ }).click();
        await p2.waitForTimeout(2500);
        check("keputusan red tag tersimpan", !!(await p2.locator("body").innerText()).match(/Internal|Keputusan|Selesai/));
      }
    }
    await c2.close();
  }

  await browser.close();

  const pass = results.filter((r) => r.ok).length;
  console.log(`\n${pass}/${results.length} langkah PASS\n`);
  process.exit(pass === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error("E2E error:", e.message);
  process.exit(1);
});
