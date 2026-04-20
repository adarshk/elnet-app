import axios, { AxiosInstance } from "axios";
import { encrypt } from "../crypto";
import { query, execute } from "../db";

interface SiteConfig {
  id: string;
  api_base_url: string;
  enc_key: string;
  iv_key: string;
  user_agent: string;
}

interface SiteCredentials {
  auth_token: string;
  refresh_token: string;
  user_id: number;
  flat_id: number;
  meter_sn: string;
  username: string;
  password: string;
  fcm_id: string;
}

function createHttpClient(
  site: SiteConfig,
  authToken?: string
): AxiosInstance {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=UTF-8",
    Accept: "*/*",
    Connection: "keep-alive",
    "Accept-Language": "en-US;q=1.0, en-GB;q=0.9, te-US;q=0.8, co-US;q=0.7",
  };
  if (site.user_agent) {
    headers["User-Agent"] = site.user_agent;
  }
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return axios.create({
    baseURL: site.api_base_url,
    headers,
    timeout: 30000,
  });
}

function encryptPayload(
  jsonString: string,
  encKey: string,
  ivKey: string
): string {
  return encrypt(jsonString, encKey, ivKey);
}

export async function login(
  site: SiteConfig,
  username: string,
  password: string,
  fcmId: string
): Promise<{
  authToken: string;
  refreshToken: string;
  userId: number;
  flatId: number;
  flatName: string;
  meterSn?: string;
}> {
  const payload = `{
  "Password" : "${password}",
  "Access" : "Live",
  "FCMID" : "${fcmId}",
  "UserName" : "${username}"
}`;

  const inputType = encryptPayload(payload, site.enc_key, site.iv_key);
  const client = createHttpClient(site);

  const response = await client.post("/api/Dashboard/login", {
    InputType: inputType,
  });

  const data = response.data;
  if (data.Status !== "Success") {
    throw new Error(`Login failed: ${data.Message}`);
  }

  const result = {
    authToken: data.Data.AuthToken,
    refreshToken: data.Data.RefreshToken,
    userId: data.Data.UserID,
    flatId: data.Data.FlatId,
    flatName: data.Data.FlatName,
    meterSn: "",
  };

  // Store credentials
  // First check if credentials exist for this site
  const existing = await query<{ id: string }>(
    "SELECT id FROM site_credentials WHERE site_id = ?",
    site.id
  );

  if (existing.length > 0) {
    await execute(
      `UPDATE site_credentials SET 
        username = ?, password = ?, fcm_id = ?, input_type = ?,
        auth_token = ?, refresh_token = ?, user_id = ?, flat_id = ?,
        logged_in_at = CURRENT_TIMESTAMP
      WHERE site_id = ?`,
      username,
      password,
      fcmId,
      inputType,
      result.authToken,
      result.refreshToken,
      result.userId,
      result.flatId,
      site.id
    );
  } else {
    await execute(
      `INSERT INTO site_credentials (site_id, username, password, fcm_id, input_type, auth_token, refresh_token, user_id, flat_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      site.id,
      username,
      password,
      fcmId,
      inputType,
      result.authToken,
      result.refreshToken,
      result.userId,
      result.flatId
    );
  }

  return result;
}

export async function checkPasswordExpired(
  site: SiteConfig,
  creds: SiteCredentials
): Promise<boolean> {
  const payload = `{
  "UserId" : ${creds.user_id},
  "MeterID" : "${creds.flat_id}"
}`;

  const inputType = encryptPayload(payload, site.enc_key, site.iv_key);
  const client = createHttpClient(site, creds.auth_token);

  const response = await client.post("/api/Dashboard/PasswordExpired", {
    InputType: inputType,
  });

  return response.data.Data;
}

export async function getDashboardDetails(
  site: SiteConfig,
  creds: SiteCredentials
): Promise<Record<string, unknown>> {
  // MeterID is a string here
  const payload = `{
  "MeterID" : "${creds.flat_id}"
}`;

  const inputType = encryptPayload(payload, site.enc_key, site.iv_key);
  const client = createHttpClient(site, creds.auth_token);

  const response = await client.post("/api/Dashboard/GetDashboardDetails", {
    InputType: inputType,
  });

  const data = response.data;
  if (data.Status !== "Success") {
    throw new Error(`GetDashboardDetails failed: ${data.Message}`);
  }

  // Store in DB
  await execute(
    `INSERT INTO dashboard_details (site_id, avg_energy, avg_cost, balance, exp_recharge_days)
     VALUES (?, ?, ?, ?, ?)`,    
    site.id,
    data.Data.AvgEnergy,
    data.Data.AvgCost,
    data.Data.Balance,
    data.Data.ExpRechargeDays
  );

  return data.Data;
}

export async function getLiveUpdates(
  site: SiteConfig,
  creds: SiteCredentials
): Promise<Record<string, unknown>> {
  // MeterID is a NUMBER here
  const payload = `{
  "MeterID" : ${creds.flat_id}
}`;

  const inputType = encryptPayload(payload, site.enc_key, site.iv_key);
  const client = createHttpClient(site, creds.auth_token);

  const response = await client.post("/api/Dashboard/GetLiveUpdates", {
    InputType: inputType,
  });

  const data = response.data;
  if (data.Status !== "Success") {
    throw new Error(`GetLiveUpdates failed: ${data.Message}`);
  }

  await execute(
    `INSERT INTO live_updates (site_id, supply, present_load, balance, eb, dg, sanction_eb, sanction_dg, updated_on)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,    
    site.id,
    data.Data.Supply,
    data.Data.PresentLoad,
    data.Data.Balance,
    data.Data.EB,
    data.Data.DG,
    data.Data.SanctionEB,
    data.Data.SanctionDG,
    data.Data.UpdatedOn
  );

  return data.Data;
}

export async function getHomeData(
  site: SiteConfig,
  creds: SiteCredentials
): Promise<Record<string, unknown>> {
  // MeterID is a string here
  const payload = `{
  "MeterID" : "${creds.flat_id}"
}`;

  const inputType = encryptPayload(payload, site.enc_key, site.iv_key);
  const client = createHttpClient(site, creds.auth_token);

  const response = await client.post("/api/Dashboard/HomeData", {
    InputType: inputType,
  });

  const data = response.data;
  if (data.Status !== "Success") {
    throw new Error(`HomeData failed: ${data.Message}`);
  }

  // Update meter_sn in credentials if available
  if (data.Data.Meter_SN) {
    await execute(
      "UPDATE site_credentials SET meter_sn = ? WHERE site_id = ?",
      data.Data.Meter_SN,
      site.id
    );
  }

  await execute(
    `INSERT INTO home_data (site_id, device_id, meter_sn, eb_dg_status, rel_status, current_day_eb, current_day_dg, current_month_eb, current_month_dg, meter_bal)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,    
    site.id,
    data.Data.DeviceId,
    data.Data.Meter_SN,
    data.Data.EBDGStatus,
    data.Data.RelStatus,
    data.Data.CurrentDay_EB,
    data.Data.CurrentDay_DG,
    data.Data.CurrentMonth_EB,
    data.Data.CurrentMonth_DG,
    data.Data.MeterBal
  );

  return data.Data;
}

export async function getRechargeHistory(
  site: SiteConfig,
  creds: SiteCredentials
): Promise<Record<string, unknown>> {
  const payload = `{
  "Month" : 0,
  "MeterID" : "${creds.flat_id}",
  "Year" : 0
}`;

  const inputType = encryptPayload(payload, site.enc_key, site.iv_key);
  const client = createHttpClient(site, creds.auth_token);

  const response = await client.post("/api/Dashboard/RechargeHistory", {
    InputType: inputType,
  });

  const data = response.data;
  if (data.Status !== "Success") {
    throw new Error(`RechargeHistory failed: ${data.Message}`);
  }

  // Insert recharge history entries (upsert by datetime + site_id to avoid duplicates)
  if (data.Data.RechargeHistory) {
    for (const entry of data.Data.RechargeHistory) {
      // Check if this entry already exists
      const existing = await query<{ id: string }>(
        "SELECT id FROM recharge_history WHERE site_id = ? AND datetime = ? AND amount = ?",
        site.id,
        entry.DateTime,
        entry.Amount
      );

      if (existing.length === 0) {
        await execute(
          `INSERT INTO recharge_history (site_id, serial_no, datetime, amount, status)
           VALUES (?, ?, ?, ?, ?)`,          
          site.id,
          entry.SerialNo,
          entry.DateTime,
          entry.Amount,
          entry.Status
        );
      }
    }
  }

  return data.Data;
}

export async function getResourcesDetails(
  site: SiteConfig,
  creds: SiteCredentials
): Promise<Record<string, unknown>> {
  // MeterID is a NUMBER here
  const payload = `{
  "Input" : 7,
  "EndDate" : "",
  "StartDate" : "",
  "Type" : 1,
  "MeterID" : ${creds.flat_id}
}`;

  const inputType = encryptPayload(payload, site.enc_key, site.iv_key);
  const client = createHttpClient(site, creds.auth_token);

  const response = await client.post("/api/Dashboard/GetResourcesDetails", {
    InputType: inputType,
  });

  const data = response.data;
  if (data.Status !== "Success") {
    throw new Error(`GetResourcesDetails failed: ${data.Message}`);
  }

  return data.Data;
}

export async function getSiteWithCredentials(
  siteId: string
): Promise<{ site: SiteConfig; creds: SiteCredentials } | null> {
  const sites = await query<SiteConfig>(
    "SELECT id, api_base_url, enc_key, iv_key, user_agent FROM sites WHERE id = ?",
    siteId
  );

  if (sites.length === 0) return null;

  const creds = await query<SiteCredentials>(
    `SELECT auth_token, refresh_token, user_id, flat_id, meter_sn, username, password, fcm_id
     FROM site_credentials WHERE site_id = ?`,
    siteId
  );

  if (creds.length === 0) return null;

  return { site: sites[0], creds: creds[0] };
}

export async function pollAllEndpoints(
  site: SiteConfig,
  creds: SiteCredentials
): Promise<{
  dashboard: Record<string, unknown>;
  live: Record<string, unknown>;
  home: Record<string, unknown>;
  recharge: Record<string, unknown>;
}> {
  const [dashboard, live, home, recharge] = await Promise.all([
    getDashboardDetails(site, creds),
    getLiveUpdates(site, creds),
    getHomeData(site, creds),
    getRechargeHistory(site, creds),
  ]);

  return { dashboard, live, home, recharge };
}
