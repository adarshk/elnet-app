import { useAppSelector } from "../store/hooks";

export default function DashboardSummary({ siteId }: { siteId: string }) {
  const siteData = useAppSelector((state) => state.dashboard.bySiteId[siteId]);
  const dashboard = siteData?.data;
  const loading = siteData?.loading;

  if (loading) return <div className="card loading">Loading dashboard...</div>;
  if (!dashboard) return null;

  return (
    <div className="card dashboard-summary">
      <h3>Dashboard Summary</h3>
      <div className="metrics-grid">
        <div className="metric">
          <span className="metric-label">Avg Energy</span>
          <span className="metric-value">{dashboard.avg_energy.toFixed(2)} kWh</span>
        </div>
        <div className="metric">
          <span className="metric-label">Avg Cost</span>
          <span className="metric-value">₹{dashboard.avg_cost.toFixed(2)}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Balance</span>
          <span className="metric-value">₹{dashboard.balance.toFixed(2)}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Est. Recharge Days</span>
          <span className="metric-value">{dashboard.exp_recharge_days}</span>
        </div>
      </div>
    </div>
  );
}
