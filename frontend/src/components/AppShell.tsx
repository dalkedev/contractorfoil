import { useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSession } from "../context/Session";
import { useWorkspace } from "../context/Workspace";
import { Brand, Icon } from "./ui";

export default function AppShell() {
  const { user } = useSession();
  const { notice } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      window.scrollTo?.(0, 0);
      contentRef.current?.focus();
      previousPath.current = location.pathname;
    }
  }, [location.pathname]);
  return (
    <div className="workspace">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand to="/dashboard" />
        <div className="sidebar-body">
          <nav aria-label="Main navigation">
            <NavLink to="/dashboard">
              <Icon name="overview" />
              Overview
            </NavLink>
            <NavLink to="/contractors">
              <Icon name="companies" />
              Companies
            </NavLink>
          </nav>
          <div className="sidebar-note">
            <Icon name="document" />
            <p>
              Contacts and current material prices.
              <br />
              <span>Your company register.</span>
            </p>
          </div>
        </div>
        <div className="account">
          <div className="avatar" aria-hidden="true">
            {user?.name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((word) => word[0])
              .join("")}
          </div>
          <div className="account-name">
            <strong>{user?.name}</strong>
            <span>Your workspace</span>
          </div>
          <button
            className="sign-out"
            onClick={() => navigate("/login", { state: { signOut: true } })}
            aria-label="Sign out"
            title="Sign out"
          >
            <Icon name="logout" />
          </button>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-topbar">
          <span>Company register</span>
          <span className="topbar-context">Personal workspace</span>
        </header>
        <main
          id="main-content"
          className="main-content"
          ref={contentRef}
          tabIndex={-1}
        >
          {notice && (
            <p className="success-notice" role="status">
              <Icon name="check" />
              {notice}
            </p>
          )}
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span>ContractorFoil</span>
          <span>Company contacts &amp; current prices</span>
        </footer>
      </div>
    </div>
  );
}
