import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchSites, setActiveSite } from "../store/slices/siteSlice";
import { fetchDashboard } from "../store/slices/dashboardSlice";
import { fetchLive } from "../store/slices/liveSlice";
import { fetchHome } from "../store/slices/homeSlice";
import { fetchConsumption } from "../store/slices/consumptionSlice";

import StatusBanner from "../components/StatusBanner";
import LiveDashboard from "../components/LiveDashboard";
import DashboardSummary from "../components/DashboardSummary";
import ConsumptionChart from "../components/ConsumptionChart";
import DailyEBDGSummary from "../components/DailyEBDGSummary";
import RefreshButton from "../components/RefreshButton";
import LoginForm from "../components/LoginForm";
import { Link } from "react-router-dom";

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const { sites, activeSiteId } = useAppSelector((state) => state.site);

  const showingAddForm = !activeSiteId || !sites.find((s) => s.id === activeSiteId);

  useEffect(() => {
    dispatch(fetchSites());
  }, [dispatch]);

  useEffect(() => {
    if (activeSiteId && sites.find((s) => s.id === activeSiteId)) {
      dispatch(fetchDashboard(activeSiteId));
      dispatch(fetchLive(activeSiteId));
      dispatch(fetchHome(activeSiteId));
      dispatch(fetchConsumption({ siteId: activeSiteId }));
    }
  }, [dispatch, activeSiteId, sites]);

  const getSiteName = (siteId: string) => {
    const site = sites.find((s) => s.id === siteId);
    return site?.name || site?.api_base_url || `Site ${siteId}`;
  };

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <h1>Electricity Tracker</h1>
        <div className="header-actions">
          {activeSiteId && !showingAddForm && <RefreshButton />}
          {sites.length > 0 && (
            <Link to="/history" className="btn btn-secondary">
              History
            </Link>
          )}
        </div>
      </header>

      <div className="site-tabs">
        {sites.map((site) => (
          <button
            key={site.id}
            className={`site-tab ${activeSiteId === site.id ? "site-tab-active" : ""}`}
            onClick={() => dispatch(setActiveSite(site.id))}
          >
            {site.name || site.api_base_url || `Site ${site.id}`}
          </button>
        ))}
        <button
          className={`site-tab site-tab-add ${showingAddForm ? "site-tab-active" : ""}`}
          onClick={() => dispatch(setActiveSite(null))}
        >
          + Add Site
        </button>
      </div>

      {showingAddForm ? (
        <div className="add-site-container">
          <LoginForm />
        </div>
      ) : (
        <section className="site-section">
          <StatusBanner siteId={activeSiteId!} />
          <div className="dashboard-grid">
            <LiveDashboard siteId={activeSiteId!} />
            <DashboardSummary siteId={activeSiteId!} />
          </div>
          <DailyEBDGSummary siteId={activeSiteId!} />
          <ConsumptionChart siteId={activeSiteId!} />
        </section>
      )}
    </div>
  );
}
