import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import type { User, UserRole } from "../types";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "מנהל/ת מערכת",
  lawyer: 'עו"ד',
  paralegal: "מתמחה",
};

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + parts[parts.length - 1][0];
}

export default function UserMenu({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape closes the menu and returns focus to the toggle button, per the
  // ARIA menu-button pattern.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        ref={toggleRef}
        className="user-menu-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="user-avatar">{initials(user.full_name)}</span>
        <span className="user-menu-info">
          <span className="user-menu-name">{user.full_name}</span>
          <span className="user-menu-role">{ROLE_LABEL[user.role]}</span>
        </span>
        <ChevronDown size={15} className={`user-menu-chevron ${open ? "open" : ""}`} />
      </button>
      {open && (
        <div className="user-menu-popover" role="menu">
          <div className="user-menu-popover-header">
            <div className="user-menu-name">{user.full_name}</div>
            <div className="muted small">{user.email}</div>
          </div>
          <button
            type="button"
            className="user-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <LogOut size={15} /> התנתקות
          </button>
        </div>
      )}
    </div>
  );
}
