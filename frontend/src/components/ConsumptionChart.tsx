import { useAppSelector } from "../store/hooks";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function ConsumptionChart({ siteId }: { siteId: string }) {
  const siteData = useAppSelector((state) => state.consumption.bySiteId[siteId]);
  const consumption = siteData?.data;
  const loading = siteData?.loading;

  if (loading) return <div className="card loading">Loading chart...</div>;
  if (!consumption || consumption.homeData.length === 0) {
    return (
      <div className="card">
        <h3>EB vs DG Consumption</h3>
        <p className="text-muted">No consumption data available yet. Data will appear after polling begins.</p>
      </div>
    );
  }

  const chartData = consumption.homeData.map((entry) => ({
    time: new Date(entry.polled_at).toLocaleString(),
    EB: entry.current_day_eb,
    DG: entry.current_day_dg,
    Balance: entry.meter_bal,
  }));

  return (
    <div className="card">
      <h3>EB vs DG Consumption Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="EB"
            stroke="#22c55e"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="DG"
            stroke="#f97316"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
