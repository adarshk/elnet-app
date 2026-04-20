import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";
import type { DashboardDetails } from "../../types";

interface SiteData {
  data: DashboardDetails | null;
  loading: boolean;
  error: string | null;
}

interface DashboardState {
  bySiteId: Record<string, SiteData>;
}

const initialState: DashboardState = {
  bySiteId: {},
};

const emptySiteData: SiteData = { data: null, loading: false, error: null };

export const fetchDashboard = createAsyncThunk(
  "dashboard/fetch",
  async (siteId: string) => {
    const response = await api.get<DashboardDetails>(
      `/sites/${siteId}/dashboard`
    );
    return { siteId, data: response.data };
  }
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state, action) => {
        const siteId = action.meta.arg;
        const existing = state.bySiteId[siteId] || emptySiteData;
        state.bySiteId[siteId] = { ...existing, loading: true, error: null };
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        const { siteId, data } = action.payload;
        state.bySiteId[siteId] = { data, loading: false, error: null };
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        const siteId = action.meta.arg;
        const existing = state.bySiteId[siteId] || emptySiteData;
        state.bySiteId[siteId] = { ...existing, loading: false, error: action.error.message || "Failed to fetch dashboard" };
      });
  },
});

export default dashboardSlice.reducer;
