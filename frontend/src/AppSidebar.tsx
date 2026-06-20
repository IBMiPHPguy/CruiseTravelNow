import { REQUEST_DASHBOARD_PAGE_TITLE } from "./branding";
import type { AppNavItem } from "./types";

type AppSidebarProps = {
  activeItem: AppNavItem | null;
  onNavigate: (item: AppNavItem) => void;
};

export default function AppSidebar({ activeItem, onNavigate }: AppSidebarProps) {
  return (
    <nav className="app-sidebar" aria-label="Main navigation">
      <ul className="app-sidebar-list">
        <li>
          <button
            type="button"
            className={`app-sidebar-link${activeItem === "dashboard" ? " is-active" : ""}`}
            aria-current={activeItem === "dashboard" ? "page" : undefined}
            onClick={() => onNavigate("dashboard")}
          >
            {REQUEST_DASHBOARD_PAGE_TITLE}
          </button>
        </li>
        <li>
          <button
            type="button"
            className={`app-sidebar-link${activeItem === "sales-analytics" ? " is-active" : ""}`}
            aria-current={activeItem === "sales-analytics" ? "page" : undefined}
            onClick={() => onNavigate("sales-analytics")}
          >
            Sales Analytics
          </button>
        </li>
        <li>
          <button
            type="button"
            className={`app-sidebar-link${activeItem === "clients" ? " is-active" : ""}`}
            aria-current={activeItem === "clients" ? "page" : undefined}
            onClick={() => onNavigate("clients")}
          >
            Clients
          </button>
        </li>
      </ul>
    </nav>
  );
}

export function activeNavItemForView(viewType: string): AppNavItem | null {
  if (viewType === "dashboard" || viewType === "closed") {
    return "dashboard";
  }
  if (viewType === "sales-analytics") {
    return "sales-analytics";
  }
  if (viewType === "clients") {
    return "clients";
  }
  return null;
}
