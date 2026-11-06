import { useEffect, useId, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../services/api";

type IconName =
  | "arrow"
  | "back"
  | "plus"
  | "search"
  | "companies"
  | "overview"
  | "logout"
  | "edit"
  | "map"
  | "trash"
  | "close"
  | "check"
  | "document"
  | "chevron";
const paths: Record<IconName, ReactNode> = {
  arrow: (
    <>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </>
  ),
  back: (
    <>
      <path d="M20 12H4M10 6l-6 6 6 6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  companies: (
    <>
      <path d="M4 21V5h10v16M14 10h6v11M2 21h20M8 9h2M8 13h2M8 17h2M17 14h1M17 17h1" />
    </>
  ),
  overview: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  logout: (
    <>
      <path d="M9 4H4v16h5M13 8l4 4-4 4M8 12h13" />
    </>
  ),
  edit: (
    <>
      <path d="m15 5 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15l-1 5Z" />
    </>
  ),
  map: (
    <>
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  document: (
    <>
      <path d="M14 3H5v18h14V8l-5-5ZM14 3v5h5M8 12h8M8 16h6" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
};
export function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={`icon ${className}`}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
export function Brand({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="brand" aria-label="ContractorFoil home">
      <svg
        width="34"
        height="34"
        viewBox="0 0 34 34"
        fill="none"
        aria-hidden="true"
      >
        <path d="M5 8h18l6 6H11L5 8Z" fill="currentColor" opacity=".55" />
        <path d="M5 14h18l6 6H11l-6-6Z" fill="currentColor" opacity=".75" />
        <path d="M5 20h18l6 6H11l-6-6Z" fill="currentColor" />
      </svg>
      <span>
        Contractor<span className="brand-light">Foil</span>
      </span>
    </Link>
  );
}
export const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof ApiError ? error.message : fallback;
export function Loading({
  label = "Loading companies...",
}: {
  label?: string;
}) {
  return (
    <div className="loading-state" role="status">
      <span>{label}</span>
      <div className="skeleton-row" />
      <div className="skeleton-row" />
      <div className="skeleton-row" />
    </div>
  );
}
export function ErrorState({
  title,
  message,
  retry,
}: {
  title: string;
  message?: string;
  retry?: () => void;
}) {
  return (
    <div className="state-panel error-panel" role="alert">
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {retry && (
        <button className="button secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  filtered = false,
  clear,
}: {
  filtered?: boolean;
  clear?: () => void;
}) {
  return (
    <div className="state-panel empty-state">
      <span className="empty-symbol">
        <Icon name={filtered ? "search" : "companies"} />
      </span>
      <h2>
        {filtered ? "No companies match your search" : "Add your first company"}
      </h2>
      <p>
        {filtered
          ? "Try a company name, NIP, phone number, address or note."
          : "Keep contact details, notes and current material prices together in one record."}
      </p>
      {filtered ? (
        <button className="button secondary" onClick={clear}>
          Clear search
        </button>
      ) : (
        <Link className="button primary" to="/contractors/new">
          <Icon name="plus" />
          Add company
        </Link>
      )}
    </div>
  );
}
export function ConfirmDialog({
  title,
  children,
  cancelLabel = "Cancel",
  confirmLabel,
  pending = false,
  confirmDisabled = false,
  destructive = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  children: ReactNode;
  cancelLabel?: string;
  confirmLabel: string;
  pending?: boolean;
  confirmDisabled?: boolean;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog && typeof dialog.showModal === "function" && !dialog.open)
      dialog.showModal();
    else if (dialog) dialog.setAttribute("open", "");
    cancelRef.current?.focus();
    return () => {
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          if (!pending) onCancel();
        }
        if (event.key === "Tab") {
          const elements = Array.from(
            dialogRef.current?.querySelectorAll<HTMLElement>(
              "button:not(:disabled),a[href],input:not(:disabled)",
            ) ?? [],
          );
          const first = elements[0];
          const last = elements.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <h2 id={id}>{title}</h2>
      <div className="dialog-body">{children}</div>
      <div className="dialog-actions">
        <button
          ref={cancelRef}
          className="button secondary"
          onClick={onCancel}
          disabled={pending}
        >
          {cancelLabel}
        </button>
        <button
          className={`button ${destructive ? "danger" : "primary"}`}
          onClick={onConfirm}
          disabled={pending || confirmDisabled}
        >
          {pending ? "Please wait..." : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
