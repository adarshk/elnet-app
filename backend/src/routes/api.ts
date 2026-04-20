import { Router, Request, Response } from "express";
import { query, execute } from "../db";
import {
  login,
  getSiteWithCredentials,
  pollAllEndpoints,
  checkPasswordExpired,
} from "../upstream/client";
import { pollSite } from "../upstream/poller";

const router = Router();

// POST /api/login - Create site and login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password, apiBaseUrl, encKey, ivKey, userAgent, fcmId, siteName } =
      req.body;

    if (!username || !password || !apiBaseUrl || !encKey || !ivKey) {
      res.status(400).json({ error: "Missing required fields: username, password, apiBaseUrl, encKey, ivKey" });
      return;
    }

    // Check if site with this URL + username already exists
    const defaultName = `${username}@${apiBaseUrl.replace(/^https?:\/\//, "")}`;
    let sites = await query<{ id: string }>(
      "SELECT id FROM sites WHERE api_base_url = ? AND username = ?",
      apiBaseUrl,
      username
    );

    let siteId: string;
    if (sites.length > 0) {
      siteId = sites[0].id;
      // Update site config
      await execute(
        "UPDATE sites SET enc_key = ?, iv_key = ?, user_agent = ?, name = ? WHERE id = ?",
        encKey,
        ivKey,
        userAgent || "",
        siteName || defaultName,
        siteId
      );
    } else {
      // Create new site
      await execute(
        `INSERT INTO sites (name, api_base_url, username, enc_key, iv_key, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)`,
        siteName || defaultName,
        apiBaseUrl,
        username,
        encKey,
        ivKey,
        userAgent || ""
      );
      const newSites = await query<{ id: string }>(
        "SELECT id FROM sites WHERE api_base_url = ? AND username = ?",
        apiBaseUrl,
        username
      );
      siteId = newSites[0].id;
    }

    const site = {
      id: siteId,
      api_base_url: apiBaseUrl,
      enc_key: encKey,
      iv_key: ivKey,
      user_agent: userAgent || "",
    };

    // Perform upstream login
    const loginResult = await login(site, username, password, fcmId || "");

    // Check password expired
    const result = await getSiteWithCredentials(siteId);
    let passwordExpired = false;
    if (result) {
      try {
        passwordExpired = await checkPasswordExpired(site, result.creds);
      } catch {
        // Non-critical, continue
      }
    }

    res.json({
      siteId,
      userId: loginResult.userId,
      flatId: loginResult.flatId,
      flatName: loginResult.flatName,
      passwordExpired,
    });
  } catch (err) {
    console.error("Login error:", err);
    const message = err instanceof Error ? err.message : "Login failed";
    res.status(500).json({ error: message });
  }
});

// GET /api/sites - List all sites
router.get("/sites", async (_req: Request, res: Response) => {
  try {
    const sites = await query(
      `SELECT s.id, s.name, s.api_base_url, s.username, s.created_at,
              sc.flat_id, sc.meter_sn, sc.logged_in_at
       FROM sites s
       LEFT JOIN site_credentials sc ON s.id = sc.site_id`
    );
    res.json(sites);
  } catch (err) {
    console.error("List sites error:", err);
    res.status(500).json({ error: "Failed to list sites" });
  }
});

// GET /api/sites/:siteId/dashboard - Latest dashboard details
router.get("/sites/:siteId/dashboard", async (req: Request, res: Response) => {
  try {
    const siteId = req.params.siteId as string;
    const rows = await query(
      `SELECT avg_energy, avg_cost, balance, exp_recharge_days, polled_at
       FROM dashboard_details
       WHERE site_id = ?
       ORDER BY polled_at DESC
       LIMIT 1`,
      siteId
    );

    if (rows.length === 0) {
      res.status(404).json({ error: "No dashboard data found" });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard details" });
  }
});

// GET /api/sites/:siteId/live - Latest live updates
router.get("/sites/:siteId/live", async (req: Request, res: Response) => {
  try {
    const siteId = req.params.siteId as string;
    const rows = await query(
      `SELECT supply, present_load, balance, eb, dg, sanction_eb, sanction_dg, updated_on, polled_at
       FROM live_updates
       WHERE site_id = ?
       ORDER BY polled_at DESC
       LIMIT 1`,
      siteId
    );

    if (rows.length === 0) {
      res.status(404).json({ error: "No live data found" });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Live updates error:", err);
    res.status(500).json({ error: "Failed to fetch live updates" });
  }
});

// GET /api/sites/:siteId/home - Latest home data
router.get("/sites/:siteId/home", async (req: Request, res: Response) => {
  try {
    const siteId = req.params.siteId as string;
    const rows = await query(
      `SELECT device_id, meter_sn, eb_dg_status, rel_status,
              current_day_eb, current_day_dg, current_month_eb, current_month_dg,
              meter_bal, polled_at
       FROM home_data
       WHERE site_id = ?
       ORDER BY polled_at DESC
       LIMIT 1`,
      siteId
    );

    if (rows.length === 0) {
      res.status(404).json({ error: "No home data found" });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Home data error:", err);
    res.status(500).json({ error: "Failed to fetch home data" });
  }
});

// GET /api/sites/:siteId/recharge-history - Recharge history
router.get(
  "/sites/:siteId/recharge-history",
  async (req: Request, res: Response) => {
    try {
      const siteId = req.params.siteId as string;
      const rows = await query(
        `SELECT serial_no, datetime, amount, status
       FROM recharge_history
       WHERE site_id = ?
       ORDER BY datetime DESC`,
        siteId
      );
      res.json(rows);
    } catch (err) {
      console.error("Recharge history error:", err);
      res.status(500).json({ error: "Failed to fetch recharge history" });
    }
  }
);

// GET /api/sites/:siteId/consumption?start=&end= - Time range consumption data
router.get(
  "/sites/:siteId/consumption",
  async (req: Request, res: Response) => {
    try {
      const siteId = req.params.siteId as string;
      const { start, end } = req.query;

      let whereClause = "site_id = ?";
      const params: unknown[] = [siteId];

      if (start) {
        whereClause += " AND polled_at >= ?";
        params.push(start);
      }
      if (end) {
        whereClause += " AND polled_at <= ?";
        params.push(end);
      }

      const [liveData, homeData] = await Promise.all([
        query(
          `SELECT supply, present_load, balance, eb, dg, updated_on, polled_at
         FROM live_updates
         WHERE ${whereClause}
         ORDER BY polled_at ASC`,
          ...params
        ),
        query(
          `SELECT eb_dg_status, current_day_eb, current_day_dg, current_month_eb, current_month_dg, meter_bal, polled_at
         FROM home_data
         WHERE ${whereClause}
         ORDER BY polled_at ASC`,
          ...params
        ),
      ]);

      res.json({ liveData, homeData });
    } catch (err) {
      console.error("Consumption data error:", err);
      res.status(500).json({ error: "Failed to fetch consumption data" });
    }
  }
);

// POST /api/sites/:siteId/refresh - Trigger immediate re-poll
router.post("/sites/:siteId/refresh", async (req: Request, res: Response) => {
  try {
    const siteId = req.params.siteId as string;
    const result = await getSiteWithCredentials(siteId);

    if (!result) {
      res.status(404).json({ error: "Site not found or not logged in" });
      return;
    }

    const { site, creds } = result;
    const pollResult = await pollAllEndpoints(site, creds);

    res.json({
      message: "Refresh complete",
      data: pollResult,
    });
  } catch (err) {
    console.error("Refresh error:", err);
    const message = err instanceof Error ? err.message : "Refresh failed";
    res.status(500).json({ error: message });
  }
});

export default router;
