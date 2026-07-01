import { LayoutDashboard, LogOut, Scale, Users } from "lucide-react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useAccentColor } from "../theme";
import AccentPicker from "./AccentPicker";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { accent, setAccent } = useAccentColor();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <Scale size={20} />
          <span>פלטפורמת ניהול תיקים משפטיים</span>
        </div>
        <nav>
          <Link to="/">
            <LayoutDashboard size={16} /> לוח תיקים
          </Link>
          <Link to="/clients">
            <Users size={16} /> לקוחות
          </Link>
        </nav>
        <div className="user-box">
          <AccentPicker accent={accent} onChange={setAccent} />
          {user && <span>{user.full_name}</span>}
          <button
            className="link-button"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <LogOut size={14} /> התנתקות
          </button>
        </div>
      </header>
      <div className="disclaimer-banner">
        כלי זה הוא עוזר משפטי מבוסס בינה מלאכותית לתמיכה בעבודת עורך הדין בלבד. כל
        טיוטה, ניתוח או אסמכתה חייבים בבדיקה, אימות מול מקור מהימן ואישור של עורך דין
        מוסמך לפני כל שימוש או הסתמכות.
      </div>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
