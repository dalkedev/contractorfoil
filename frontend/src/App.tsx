import { useState } from "react";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import { RequireSession, SessionProvider } from "./context/Session";
import { WorkspaceProvider } from "./context/Workspace";
import AppShell from "./components/AppShell";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import CompaniesPage from "./pages/CompaniesPage";
import CompanyDetailPage from "./pages/CompanyDetailPage";
import CompanyFormPage from "./pages/CompanyFormPage";
import OverviewPage from "./pages/OverviewPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  const [router] = useState(() =>
    createBrowserRouter([
      {
        element: (
          <SessionProvider>
            <Outlet />
          </SessionProvider>
        ),
        children: [
          { path: "/", element: <HomePage /> },
          { path: "/login", element: <AuthPage /> },
          { path: "/register", element: <AuthPage register /> },
          {
            element: (
              <RequireSession>
                <WorkspaceProvider>
                  <AppShell />
                </WorkspaceProvider>
              </RequireSession>
            ),
            children: [
              { path: "/dashboard", element: <OverviewPage /> },
              { path: "/contractors", element: <CompaniesPage /> },
              { path: "/contractors/new", element: <CompanyFormPage /> },
              { path: "/contractors/:id", element: <CompanyDetailPage /> },
              { path: "/contractors/:id/edit", element: <CompanyFormPage /> },
            ],
          },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ]),
  );
  return <RouterProvider router={router} />;
}
