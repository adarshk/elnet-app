import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";
import type { ConsumptionData } from "../../types";

interface SiteData {
  data: ConsumptionData | null;
  loading: boolean;
  error: string | null;
}

interface ConsumptionState {
  bySiteId: Record<string, SiteData>;
}

const initialState: ConsumptionState = {
  bySiteId: {},
};

const emptySiteData: SiteData = { data: null, loading: false, error: null };

export const fetchConsumption = createAsyncThunk(
  "consumption/fetch",
  async ({
    siteId,
    start,
    end,
  }: {
    siteId: string;
    start?: string;
    end?: string;
  }) => {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    const response = await api.get<ConsumptionData>(
      `/sites/${siteId}/consumption?${params.toString()}`
    );
    return { siteId, data: response.data };
  }
);

const consumptionSlice = createSlice({
  name: "consumption",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchConsumption.pending, (state, action) => {
        const siteId = action.meta.arg.siteId;
        const existing = state.bySiteId[siteId] || emptySiteData;
        state.bySiteId[siteId] = { ...existing, loading: true, error: null };
      })
      .addCase(fetchConsumption.fulfilled, (state, action) => {
        const { siteId, data } = action.payload;
        state.bySiteId[siteId] = { data, loading: false, error: null };
      })
      .addCase(fetchConsumption.rejected, (state, action) => {
        const siteId = action.meta.arg.siteId;
        const existing = state.bySiteId[siteId] || emptySiteData;
        state.bySiteId[siteId] = { ...existing, loading: false, error: action.error.message || "Failed to fetch consumption data" };
      });
  },
});

export default consumptionSlice.reducer;
