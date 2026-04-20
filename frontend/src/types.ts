export interface Site {
  id: string;
  name: string;
  api_base_url: string;
  created_at: string;
  username?: string;
  flat_id?: number;
  meter_sn?: string;
  logged_in_at?: string;
}

export interface DashboardDetails {
  avg_energy: number;
  avg_cost: number;
  balance: number;
  exp_recharge_days: number;
  polled_at: string;
}

export interface LiveUpdates {
  supply: number;
  present_load: number;
  balance: number;
  eb: number;
  dg: number;
  sanction_eb: number;
  sanction_dg: number;
  updated_on: string;
  polled_at: string;
}

export interface HomeData {
  device_id: number;
  meter_sn: string;
  eb_dg_status: number;
  rel_status: string;
  current_day_eb: number;
  current_day_dg: number;
  current_month_eb: number;
  current_month_dg: number;
  meter_bal: number;
  polled_at: string;
}

export interface RechargeEntry {
  serial_no: number;
  datetime: string;
  amount: number;
  status: string;
}

export interface ConsumptionData {
  liveData: LiveUpdates[];
  homeData: HomeData[];
}

export interface LoginRequest {
  username: string;
  password: string;
  apiBaseUrl: string;
  encKey: string;
  ivKey: string;
  userAgent?: string;
  fcmId?: string;
  siteName?: string;
}

export interface LoginResponse {
  siteId: string;
  userId: number;
  flatId: number;
  flatName: string;
  passwordExpired: boolean;
}
