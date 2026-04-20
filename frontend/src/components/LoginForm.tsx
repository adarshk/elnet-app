import { useState, FormEvent } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { loginSite, fetchSites } from "../store/slices/siteSlice";
import type { LoginRequest } from "../types";

export default function LoginForm() {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.site);

  const [form, setForm] = useState<LoginRequest>({
    username: "",
    password: "",
    apiBaseUrl: "",
    encKey: "A29C4A3EA99E7DE9F2AE3C7D21050D26",
    ivKey: "D9A3DEFBD3B38144C3C7088735C601C7",
    userAgent: "",
    fcmId: "",
    siteName: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await dispatch(loginSite(form));
    dispatch(fetchSites());
  };

  const update = (field: keyof LoginRequest, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <h2>Add Site</h2>

      {error && <div className="error-banner">{error}</div>}

      <div className="form-group">
        <label>API Endpoint (ip:port)</label>
        <input
          type="text"
          value={form.apiBaseUrl}
          onChange={(e) => update("apiBaseUrl", e.target.value)}
          placeholder="http://192.168.1.1:8080"
          required
        />
      </div>

      <div className="form-group">
        <label>Username</label>
        <input
          type="text"
          value={form.username}
          onChange={(e) => update("username", e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label>Password</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label>Site Name (optional)</label>
        <input
          type="text"
          value={form.siteName || ""}
          onChange={(e) => update("siteName", e.target.value)}
          placeholder="Home / Office"
        />
      </div>

      <details className="advanced-settings">
        <summary>Advanced Settings</summary>
        <div className="form-group">
          <label>Encryption Key</label>
          <input
            type="text"
            value={form.encKey}
            onChange={(e) => update("encKey", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>IV Key</label>
          <input
            type="text"
            value={form.ivKey}
            onChange={(e) => update("ivKey", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>User Agent</label>
          <input
            type="text"
            value={form.userAgent || ""}
            onChange={(e) => update("userAgent", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>FCM ID</label>
          <input
            type="text"
            value={form.fcmId || ""}
            onChange={(e) => update("fcmId", e.target.value)}
          />
        </div>
      </details>

      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? "Adding site..." : "Add Site"}
      </button>
    </form>
  );
}
