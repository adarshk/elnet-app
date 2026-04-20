import { useAppSelector } from "../store/hooks";

export default function RechargeHistory({ siteId }: { siteId: string }) {
  const siteData = useAppSelector((state) => state.recharge.bySiteId[siteId]);
  const data = siteData?.data || [];
  const loading = siteData?.loading;

  if (loading) return <div className="card loading">Loading recharge history...</div>;
  if (data.length === 0) {
    return (
      <div className="card">
        <h3>Recharge History</h3>
        <p className="text-muted">No recharge history available.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Recharge History</h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry, i) => (
              <tr key={i}>
                <td>{new Date(entry.datetime).toLocaleDateString()}</td>
                <td className={entry.amount >= 0 ? "text-green" : "text-red"}>
                  {entry.amount >= 0 ? "+" : ""}₹{entry.amount.toFixed(2)}
                </td>
                <td>{entry.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
