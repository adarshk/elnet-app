import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";
import type { LiveUpdates } from "../../types";

interface SiteData {
  data: LiveUpdates | null;
  loading: boolean;
  error: string | null;
}

interface LiveState {
  bySiteId: Record<string, SiteData>;
}

const initialState: LiveState = {
  bySiteId: {},
};

const emptySiteData: SiteData = { data: null, loading: false, error: null };

export const fetchLive = createAsyncThunk(
  "live/fetch",
  async (siteId: string) => {
    const response = await api.get<LiveUpdates>(`/sites/${siteId}/live`);
    return { siteId, data: response.data };
  }
);

const liveSlice = createSlice({
  name: "live",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLive.pending, (state, action) => {
        const siteId = action.meta.arg;
        const existing = state.bySiteId[siteId] || emptySiteData;
        state.bySiteId[siteId] = { ...existing, loading: true, error: null };
      })
      .addCase(fetchLive.fulfilled, (state, action) => {
        const { siteId, data } = action.payload;
        state.bySiteId[siteId] = { data, loading: false, error: null };
      })
      .addCase(fetchLive.rejected, (state, action) => {
        const siteId = action.meta.arg;
        const existing = state.bySiteId[siteId] || emptySiteData;
        state.bySiteId[siteId] = { ...existing, loading: false, error: action.error.message || "Failed to fetch live data" };
      });
  },
});

export default liveSlice.reducer;
