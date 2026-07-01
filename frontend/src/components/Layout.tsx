import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">פלטפורמת ניהול תיקים משפטיים</div>
        <nav>
          <Link to="/">לוח תיקים</Link>
          <Link to="/clients">לקוחות</Link>
        </nav>
        <div className="user-box">
          {user && <span>{user.full_name}</span>}
          <button
            className="link-button"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            התנתקות
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
