import { query, execute } from "./db";
import { login } from "./upstream/client";

interface PollSiteConfig {
  name: string;
  apiBaseUrl: string;
  encKey: string;
  ivKey: string;
  userAgent: string;
  username: string;
  password: string;
  fcmId?: string;
}

function parsePollSites(): PollSiteConfig[] {
  const raw = process.env.POLL_SITES;
  if (!raw) return [];

  try {
    const sites = JSON.parse(raw);
    if (!Array.isArray(sites)) {
      console.error("[Seed] POLL_SITES must be a JSON array");
      return [];
    }
    return sites;
  } catch (err) {
    console.error("[Seed] Failed to parse POLL_SITES:", err);
    return [];
  }
}

export async function seedPollSites(): Promise<void> {
  const configs = parsePollSites();
  if (configs.length === 0) {
    console.log("[Seed] No POLL_SITES configured, skipping seed");
    return;
  }

  console.log(`[Seed] Seeding ${configs.length} poll site(s)...`);

  for (const cfg of configs) {
    if (!cfg.apiBaseUrl || !cfg.encKey || !cfg.ivKey || !cfg.username || !cfg.password) {
      console.error(`[Seed] Skipping site "${cfg.name}": missing required fields`);
      continue;
    }

    // Check if site already exists
    const existing = await query<{ id: string }>(
      "SELECT id FROM sites WHERE api_base_url = ?",
      cfg.apiBaseUrl
    );

    let siteId: string;
    if (existing.length > 0) {
      siteId = existing[0].id;
      // Update site config
      await execute(
        "UPDATE sites SET enc_key = ?, iv_key = ?, user_agent = ?, name = ? WHERE id = ?",
        cfg.encKey,
        cfg.ivKey,
        cfg.userAgent || "",
        cfg.name || cfg.apiBaseUrl,
        siteId
      );
      console.log(`[Seed] Updated existing site "${cfg.name}" (id=${siteId})`);
    } else {
      // Create new site
      await execute(
        `INSERT INTO sites (name, api_base_url, enc_key, iv_key, user_agent)
         VALUES (?, ?, ?, ?, ?)`,
        cfg.name || cfg.apiBaseUrl,
        cfg.apiBaseUrl,
        cfg.encKey,
        cfg.ivKey,
        cfg.userAgent || ""
      );
      const newSites = await query<{ id: string }>(
        "SELECT id FROM sites WHERE api_base_url = ?",
        cfg.apiBaseUrl
      );
      siteId = newSites[0].id;
      console.log(`[Seed] Created site "${cfg.name}" (id=${siteId})`);
    }

    // Check if credentials exist — if not, perform login
    const creds = await query<{ id: string }>(
      "SELECT id FROM site_credentials WHERE site_id = ?",
      siteId
    );

    if (creds.length === 0) {
      const site = {
        id: siteId,
        api_base_url: cfg.apiBaseUrl,
        enc_key: cfg.encKey,
        iv_key: cfg.ivKey,
        user_agent: cfg.userAgent || "",
      };

      try {
        console.log(`[Seed] Logging in to site "${cfg.name}"...`);
        const result = await login(site, cfg.username, cfg.password, cfg.fcmId || "");
        console.log(`[Seed] Login successful for "${cfg.name}" (flatId=${result.flatId})`);
      } catch (err) {
        console.error(`[Seed] Login failed for "${cfg.name}":`, err instanceof Error ? err.message : err);
      }
    } else {
      console.log(`[Seed] Site "${cfg.name}" already has credentials, skipping login`);
    }
  }

  console.log("[Seed] Seeding complete");
}
