import LoginForm from "../components/LoginForm";

export default function LoginPage() {
  return (
    <div className="page login-page">
      <div className="login-container">
        <h1>Electricity Tracker</h1>
        <p className="subtitle">Monitor your electricity consumption</p>
        <LoginForm />
      </div>
    </div>
  );
}
