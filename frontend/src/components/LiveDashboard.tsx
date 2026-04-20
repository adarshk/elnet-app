import { useAppSelector } from "../store/hooks";

export default function LiveDashboard({ siteId }: { siteId: string }) {
  const siteData = useAppSelector((state) => state.live.bySiteId[siteId]);
  const live = siteData?.data;
  const loading = siteData?.loading;

  if (loading) return <div className="card loading">Loading live data...</div>;
  if (!live) return null;

  const isEB = live.supply === 0;

  return (
    <div className="card live-dashboard">
      <h3>Live Data</h3>
      <div className="metrics-grid">
        <div className="metric">
          <span className="metric-label">Balance</span>
          <span className="metric-value">₹{live.balance.toFixed(2)}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Present Load</span>
          <span className="metric-value">{live.present_load} kW</span>
        </div>
        <div className="metric">
          <span className="metric-label">Supply</span>
          <span className={`metric-value ${isEB ? "text-green" : "text-orange"}`}>
            {isEB ? "EB" : "DG"}
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">EB Units</span>
          <span className="metric-value">{live.eb.toFixed(2)}</span>
        </div>
        <div className="metric">
          <span className="metric-label">DG Units</span>
          <span className="metric-value">{live.dg.toFixed(2)}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Sanction EB</span>
          <span className="metric-value">{live.sanction_eb}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Sanction DG</span>
          <span className="metric-value">{live.sanction_dg}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Updated</span>
          <span className="metric-value metric-value-sm">{live.updated_on}</span>
        </div>
      </div>
    </div>
  );
}
