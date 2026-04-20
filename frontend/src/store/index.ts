import { configureStore } from "@reduxjs/toolkit";
import siteReducer from "./slices/siteSlice";
import dashboardReducer from "./slices/dashboardSlice";
import liveReducer from "./slices/liveSlice";
import homeReducer from "./slices/homeSlice";
import rechargeReducer from "./slices/rechargeSlice";
import consumptionReducer from "./slices/consumptionSlice";

export const store = configureStore({
  reducer: {
    site: siteReducer,
    dashboard: dashboardReducer,
    live: liveReducer,
    home: homeReducer,
    recharge: rechargeReducer,
    consumption: consumptionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
