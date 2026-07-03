import { useRef, type KeyboardEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface TabDef {
  id: string;
  label: string;
  icon?: LucideIcon;
}

/**
 * Row of tab buttons. Purely presentational - the caller owns the active-tab
 * state and is responsible for rendering the matching <TabPanel /> elements.
 *
 * Keyboard support follows the ARIA APG tabs pattern: a roving tabindex (only
 * the selected tab is in the Tab order) plus arrow-key navigation between
 * tabs, with Home/End jumping to the first/last tab. Arrow keys are mapped
 * for the app's RTL layout: ArrowLeft advances to the next tab in DOM order
 * (which is visually to the left) and ArrowRight goes back.
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
  const listRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = tabs.findIndex((tab) => tab.id === active);
    if (currentIndex === -1) return;
    let nextIndex: number;
    switch (event.key) {
      case "ArrowLeft":
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case "ArrowRight":
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const nextId = tabs[nextIndex].id;
    onChange(nextId);
    listRef.current
      ?.querySelector<HTMLButtonElement>(`#tab-${CSS.escape(nextId)}`)
      ?.focus();
  }

  return (
    <div className="tabs" role="tablist" ref={listRef} onKeyDown={handleKeyDown}>
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
            tabIndex={isActive ? 0 : -1}
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
