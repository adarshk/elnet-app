import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";
import type { RechargeEntry } from "../../types";

interface SiteData {
  data: RechargeEntry[];
  loading: boolean;
  error: string | null;
}

interface RechargeState {
  bySiteId: Record<string, SiteData>;
}

const initialState: RechargeState = {
  bySiteId: {},
};

const emptySiteData: SiteData = { data: [], loading: false, error: null };

export const fetchRechargeHistory = createAsyncThunk(
  "recharge/fetch",
  async (siteId: string) => {
    const response = await api.get<RechargeEntry[]>(
      `/sites/${siteId}/recharge-history`
    );
    return { siteId, data: response.data };
  }
);

const rechargeSlice = createSlice({
  name: "recharge",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRechargeHistory.pending, (state, action) => {
        const siteId = action.meta.arg;
        const existing = state.bySiteId[siteId] || emptySiteData;
        state.bySiteId[siteId] = { ...existing, loading: true, error: null };
      })
      .addCase(fetchRechargeHistory.fulfilled, (state, action) => {
        const { siteId, data } = action.payload;
        state.bySiteId[siteId] = { data, loading: false, error: null };
      })
      .addCase(fetchRechargeHistory.rejected, (state, action) => {
        const siteId = action.meta.arg;
        const existing = state.bySiteId[siteId] || emptySiteData;
        state.bySiteId[siteId] = { ...existing, loading: false, error: action.error.message || "Failed to fetch recharge history" };
      });
  },
});

export default rechargeSlice.reducer;
