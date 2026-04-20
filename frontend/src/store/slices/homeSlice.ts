import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";
import type { HomeData } from "../../types";

interface SiteData {
  data: HomeData | null;
  loading: boolean;
  error: string | null;
}

interface HomeState {
  bySiteId: Record<string, SiteData>;
}

const initialState: HomeState = {
  bySiteId: {},
};

const emptySiteData: SiteData = { data: null, loading: false, error: null };

export const fetchHome = createAsyncThunk(
  "home/fetch",
  async (siteId: string) => {
    const response = await api.get<HomeData>(`/sites/${siteId}/home`);
    return { siteId, data: response.data };
  }
);

const homeSlice = createSlice({
  name: "home",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHome.pending, (state, action) => {
        const siteId = action.meta.arg;
        const existing = state.bySiteId[siteId] || emptySiteData;
        state.bySiteId[siteId] = { ...existing, loading: true, error: null };
      })
      .addCase(fetchHome.fulfilled, (state, action) => {
        const { siteId, data } = action.payload;
        state.bySiteId[siteId] = { data, loading: false, error: null };
      })
      .addCase(fetchHome.rejected, (state, action) => {
        const siteId = action.meta.arg;
        const existing = state.bySiteId[siteId] || emptySiteData;
        state.bySiteId[siteId] = { ...existing, loading: false, error: action.error.message || "Failed to fetch home data" };
      });
  },
});

export default homeSlice.reducer;
