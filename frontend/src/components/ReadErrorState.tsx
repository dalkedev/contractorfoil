import { useRef } from "react";
import { ApiError } from "../services/api";
import { SignInForm } from "../pages/AuthPage";
import { ErrorState } from "./ui";

export default function ReadErrorState({
  error,
  title,
  message,
  retry,
  hideRetry = false,
}: {
  error: unknown;
  title: string;
  message?: string;
  retry: () => void;
  hideRetry?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  if (error instanceof ApiError && error.status === 401) {
    return (
      <div ref={panelRef} className="state-panel error-panel" role="alert">
        <h2>Your session expired</h2>
        <p>
          Sign in again to load this page. You will stay in your current
          workspace.
        </p>
        <div className="read-session-form">
          <SignInForm
            inline
            onSuccess={() => {
              panelRef.current?.closest("main")?.focus();
              retry();
            }}
          />
        </div>
      </div>
    );
  }
  return (
    <ErrorState
      title={title}
      message={message}
      retry={hideRetry ? undefined : retry}
    />
  );
}
