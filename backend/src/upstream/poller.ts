import { query } from "../db";
import {
  getSiteWithCredentials,
  pollAllEndpoints,
  login,
} from "./client";

let pollingIntervals: Map<number, NodeJS.Timeout> = new Map();

async function pollSite(siteId: string): Promise<void> {
  try {
    const result = await getSiteWithCredentials(siteId);
    if (!result) {
      console.error(`[Poller] Site ${siteId}: no credentials found, skipping`);
      return;
    }

    const { site, creds } = result;
    console.log(`[Poller] Polling site ${siteId}...`);

    try {
      await pollAllEndpoints(site, creds);
      console.log(`[Poller] Site ${siteId}: poll complete`);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number }; message?: string };
      // If 401, try re-login
      if (error.response?.status === 401) {
        console.log(`[Poller] Site ${siteId}: auth expired, re-logging in...`);
        try {
          await login(site, creds.username, creds.password, creds.fcm_id);
          // Retry poll after re-login
          const refreshedResult = await getSiteWithCredentials(siteId);
          if (refreshedResult) {
            await pollAllEndpoints(
              refreshedResult.site,
              refreshedResult.creds
            );
            console.log(
              `[Poller] Site ${siteId}: poll complete after re-login`
            );
          }
        } catch (loginErr) {
          console.error(
            `[Poller] Site ${siteId}: re-login failed:`,
            loginErr
          );
        }
      } else {
        console.error(`[Poller] Site ${siteId}: poll error:`, error.message);
      }
    }
  } catch (err) {
    console.error(`[Poller] Site ${siteId}: unexpected error:`, err);
  }
}

export function startPolling(intervalMs: number): void {
  console.log(
    `[Poller] Starting polling with interval ${intervalMs}ms`
  );

  // Poll all sites periodically
  const interval = setInterval(async () => {
    try {
      const sites = await query<{ id: string }>("SELECT id FROM sites");
      for (const site of sites) {
        await pollSite(site.id);
      }
    } catch (err) {
      console.error("[Poller] Error fetching sites:", err);
    }
  }, intervalMs);

  // Store interval for cleanup
  pollingIntervals.set(0, interval);

  // Also poll immediately on start
  (async () => {
    try {
      const sites = await query<{ id: string }>("SELECT id FROM sites");
      for (const site of sites) {
        await pollSite(site.id);
      }
    } catch (err) {
      console.error("[Poller] Initial poll error:", err);
    }
  })();
}

export function stopPolling(): void {
  for (const [, interval] of pollingIntervals) {
    clearInterval(interval);
  }
  pollingIntervals.clear();
  console.log("[Poller] Stopped");
}

export { pollSite };
