import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface TabDef {
  id: string;
  label: string;
  icon?: LucideIcon;
}

/**
 * Row of tab buttons. Purely presentational - the caller owns the active-tab
 * state and is responsible for rendering the matching <TabPanel /> elements.
 */
export function TabList({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            className={`tab-button${isActive ? " active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            {Icon && <Icon size={16} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Panel content for a single tab. All panels stay mounted at all times (we
 * only toggle visibility with a CSS class) so that in-progress, uncontrolled
 * form input inside an inactive tab is not lost when the lawyer switches
 * tabs and comes back.
 */
export function TabPanel({
  id,
  active,
  children,
}: {
  id: string;
  active: string;
  children: ReactNode;
}) {
  const isActive = id === active;
  return (
    <div
      id={`panel-${id}`}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      aria-hidden={!isActive}
      className={`tab-panel${isActive ? " active" : ""}`}
    >
      {children}
    </div>
  );
}
