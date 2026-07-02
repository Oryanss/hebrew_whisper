import { LayoutDashboard, Scale, Search, Users } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useAccentColor } from "../theme";
import AccentPicker from "./AccentPicker";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

const NAV_ITEMS = [
  { to: "/", label: "לוח תיקים", icon: LayoutDashboard, end: true },
  { to: "/clients", label: "לקוחות", icon: Users, end: false },
  { to: "/research", label: "מחקר וספריית ידע", icon: Search, end: false },
];

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
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="user-box">
          <ThemeToggle />
          <AccentPicker accent={accent} onChange={setAccent} />
          {user && (
            <UserMenu
              user={user}
              onLogout={() => {
                logout();
                navigate("/login");
              }}
            />
          )}
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
