import dotenv from "dotenv";
dotenv.config();

import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import { initializeDatabase } from "./db";
import app from "./server";
import { seedPollSites } from "./seed";
import { startPolling } from "./upstream/poller";

const PORT = parseInt(process.env.PORT || "3001", 10);
const POLL_INTERVAL_MS = parseInt(
  process.env.POLL_INTERVAL_MS || "60000",
  10
);

async function main() {
  try {
    await initializeDatabase();

    // Seed sites from POLL_SITES env var (auto-login if needed)
    await seedPollSites();

    const certPath = path.resolve(__dirname, "../certs/cert.pem");
    const keyPath = path.resolve(__dirname, "../certs/key.pem");

    const httpsOptions = {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    };

    https.createServer(httpsOptions, app).listen(PORT, () => {
      console.log(`Backend server running on https://localhost:${PORT}`);
    });

    /* http.createServer(app).listen(PORT, () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
    }); */

    // Start polling for all configured sites
    startPolling(POLL_INTERVAL_MS);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

main();
