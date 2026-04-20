import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import api from "../../api";
import type { Site, LoginRequest, LoginResponse } from "../../types";

interface SiteState {
  sites: Site[];
  activeSiteId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: SiteState = {
  sites: [],
  activeSiteId: null,
  loading: false,
  error: null,
};

export const fetchSites = createAsyncThunk("site/fetchSites", async () => {
  const response = await api.get<Site[]>("/sites");
  return response.data;
});

export const loginSite = createAsyncThunk(
  "site/login",
  async (loginData: LoginRequest) => {
    const response = await api.post<LoginResponse>("/login", loginData);
    return response.data;
  }
);

const siteSlice = createSlice({
  name: "site",
  initialState,
  reducers: {
    setActiveSite: (state, action: PayloadAction<string | null>) => {
      state.activeSiteId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSites.fulfilled, (state, action) => {
        state.loading = false;
        state.sites = action.payload;
        if (action.payload.length > 0 && !state.activeSiteId) {
          state.activeSiteId = action.payload[0].id;
        }
      })
      .addCase(fetchSites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch sites";
      })
      .addCase(loginSite.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginSite.fulfilled, (state, action) => {
        state.loading = false;
        state.activeSiteId = action.payload.siteId;
      })
      .addCase(loginSite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Login failed";
      });
  },
});

export const { setActiveSite } = siteSlice.actions;
export default siteSlice.reducer;
