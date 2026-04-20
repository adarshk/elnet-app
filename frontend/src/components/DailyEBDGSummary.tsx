import { useAppSelector } from "../store/hooks";

export default function DailyEBDGSummary({ siteId }: { siteId: string }) {
  const siteData = useAppSelector((state) => state.home.bySiteId[siteId]);
  const home = siteData?.data;
  const loading = siteData?.loading;

  if (loading) return <div className="card loading">Loading...</div>;
  if (!home) return null;

  return (
    <div className="card">
      <h3>Daily EB / DG Summary</h3>
      <div className="ebdg-summary">
        <div className="ebdg-row">
          <div className="ebdg-bar-container">
            <div className="ebdg-label">Today</div>
            <div className="ebdg-bars">
              <div
                className="ebdg-bar eb-bar"
                style={{
                  width: `${
                    home.current_day_eb + home.current_day_dg > 0
                      ? (home.current_day_eb /
                          (home.current_day_eb + home.current_day_dg)) *
                        100
                      : 50
                  }%`,
                }}
              >
                EB: {home.current_day_eb.toFixed(2)}
              </div>
              <div
                className="ebdg-bar dg-bar"
                style={{
                  width: `${
                    home.current_day_eb + home.current_day_dg > 0
                      ? (home.current_day_dg /
                          (home.current_day_eb + home.current_day_dg)) *
                        100
                      : 50
                  }%`,
                }}
              >
                DG: {home.current_day_dg.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
        <div className="ebdg-row">
          <div className="ebdg-bar-container">
            <div className="ebdg-label">This Month</div>
            <div className="ebdg-bars">
              <div
                className="ebdg-bar eb-bar"
                style={{
                  width: `${
                    home.current_month_eb + home.current_month_dg > 0
                      ? (home.current_month_eb /
                          (home.current_month_eb + home.current_month_dg)) *
                        100
                      : 50
                  }%`,
                }}
              >
                EB: {home.current_month_eb.toFixed(2)}
              </div>
              <div
                className="ebdg-bar dg-bar"
                style={{
                  width: `${
                    home.current_month_eb + home.current_month_dg > 0
                      ? (home.current_month_dg /
                          (home.current_month_eb + home.current_month_dg)) *
                        100
                      : 50
                  }%`,
                }}
              >
                DG: {home.current_month_dg.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
