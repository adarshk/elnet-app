import { useAppSelector } from "../store/hooks";

export default function StatusBanner({ siteId }: { siteId: string }) {
  const home = useAppSelector((state) => state.home.bySiteId[siteId]?.data);

  if (!home) return null;

  const isEB = home.eb_dg_status === 0;

  return (
    <div className={`status-banner ${isEB ? "status-eb" : "status-dg"}`}>
      <span className="status-icon">{isEB ? "⚡" : "🔋"}</span>
      <span className="status-text">
        {isEB ? "EB — Normal Power" : "DG — Generator Power"}
      </span>
      <span className="status-indicator">{home.rel_status}</span>
    </div>
  );
}
