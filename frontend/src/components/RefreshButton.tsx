import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchDashboard } from "../store/slices/dashboardSlice";
import { fetchLive } from "../store/slices/liveSlice";
import { fetchHome } from "../store/slices/homeSlice";
import { fetchConsumption } from "../store/slices/consumptionSlice";
import api from "../api";

export default function RefreshButton() {
  const dispatch = useAppDispatch();
  const activeSiteId = useAppSelector((state) => state.site.activeSiteId);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!activeSiteId) return;
    setRefreshing(true);
    try {
      await api.post(`/sites/${activeSiteId}/refresh`);
      dispatch(fetchDashboard(activeSiteId));
      dispatch(fetchLive(activeSiteId));
      dispatch(fetchHome(activeSiteId));
      dispatch(fetchConsumption({ siteId: activeSiteId }));
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={refreshing || !activeSiteId}
      className="btn btn-refresh"
    >
      {refreshing ? "Refreshing..." : "↻ Refresh"}
    </button>
  );
}
