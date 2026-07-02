import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Scale } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { api, ApiError } from "../api";
import { useToast } from "../hooks/useToast";
import ToastContainer from "../components/Toast";
import ThemeToggle from "../components/ThemeToggle";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const { toasts, toast, dismiss } = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "register") {
        await api.register(fullName, email, password);
        toast.success("החשבון נוצר בהצלחה, מתחברים...");
        // Brief pause so the confirmation toast is actually visible before
        // this page unmounts on navigation - otherwise register+login+
        // navigate can complete fast enough that the toast never renders.
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
      await login(email, password);
      navigate("/");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "אירעה שגיאה, נסה/י שוב");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-topbar">
          <ThemeToggle />
        </div>
        <div className="auth-logo">
          <Scale size={28} />
        </div>
        <h1>{mode === "login" ? "התחברות" : "הרשמת עורך דין חדש"}</h1>
        {mode === "register" && (
          <label>
            שם מלא
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
        )}
        <label>
          דוא"ל
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          סיסמה
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <button type="submit" disabled={busy}>
          {mode === "login" ? "התחברות" : "הרשמה והתחברות"}
        </button>
        <button
          type="button"
          className="link-button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "אין לך חשבון? הרשמה" : "יש לך כבר חשבון? התחברות"}
        </button>
      </form>
    </div>
  );
}
