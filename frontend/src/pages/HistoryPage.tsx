import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchRechargeHistory } from "../store/slices/rechargeSlice";
import RechargeHistory from "../components/RechargeHistory";
import { Link } from "react-router-dom";

export default function HistoryPage() {
  const dispatch = useAppDispatch();
  const activeSiteId = useAppSelector((state) => state.site.activeSiteId);

  useEffect(() => {
    if (activeSiteId) {
      dispatch(fetchRechargeHistory(activeSiteId));
    }
  }, [dispatch, activeSiteId]);

  return (
    <div className="page history-page">
      <header className="page-header">
        <h1>Recharge History</h1>
        <Link to="/" className="btn btn-secondary">
          ← Back to Dashboard
        </Link>
      </header>

      {!activeSiteId ? (
        <p>No site selected.</p>
      ) : (
        <RechargeHistory siteId={activeSiteId} />
      )}
    </div>
  );
}
