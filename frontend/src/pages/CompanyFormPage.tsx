import ReadErrorState from "../components/ReadErrorState";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
import { useCompany } from "../hooks/useCompany";
import { useWorkspace } from "../context/Workspace";
import {
  ApiError,
  addContractor,
  fetchContractorById,
  fetchContractors,
  updateContractor,
} from "../services/api";
import {
  buildContractorInput,
  buildContractorPatch,
  ContractorDraftError,
  createContractorDraft,
  type ContractorDraft,
} from "../domain/contractors";
import type {
  Contractor,
  ContractorInput,
  ContractorPatch,
  FieldErrors,
} from "../types";
import { ConfirmDialog, Icon, Loading, errorMessage } from "../components/ui";
import { SignInForm } from "./AuthPage";

function EditFormLoader({ id }: { id: string }) {
  const { record, loading, error, retry } = useCompany(id);
  const { listSearch } = useWorkspace();
  if (loading) return <Loading label="Loading company..." />;
  if (error || !record)
    return (
      <>
        <Link className="back-link" to={`/contractors${listSearch}`}>
          <Icon name="back" />
          Back to companies
        </Link>
        <ReadErrorState
          error={error}
          title={
            error instanceof ApiError && error.status === 404
              ? "Company not found"
              : "Could not load this company"
          }
          message="Return to your register or try again."
          retry={retry}
        />
      </>
    );
  return <CompanyForm key={record._id} original={record} />;
}
export default function CompanyFormPage() {
  const { id } = useParams();
  return id ? <EditFormLoader id={id} /> : <CompanyForm />;
}
function CompanyForm({ original }: { original?: Contractor }) {
  const [draft, setDraft] = useState<ContractorDraft>(() =>
    createContractorDraft(original),
  );
  const [fields, setFields] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState<
    ContractorInput | ContractorPatch | null
  >(null);
  const [checked, setChecked] = useState(false);
  const [matches, setMatches] = useState<Contractor[]>([]);
  const [needSignIn, setNeedSignIn] = useState(false);
  const [signIn, setSignIn] = useState(false);
  const [checkMessage, setCheckMessage] = useState("");
  const { listSearch, upsert, setNotice } = useWorkspace();
  const navigate = useNavigate();
  const errorRef = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const bypass = useRef(false);
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(createContractorDraft(original));
  const blocker = useBlocker(() => dirty && !bypass.current);
  const backPath = original
    ? `/contractors/${encodeURIComponent(original._id)}`
    : `/contractors${listSearch}`;
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty && !bypass.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  const saved = (record: Contractor) => {
    upsert(record);
    setNotice(original ? "Changes saved." : "Company added.");
    bypass.current = true;
    navigate(`/contractors/${encodeURIComponent(record._id)}`, {
      replace: true,
    });
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current || uncertain || needSignIn) return;
    let payload: ContractorInput | ContractorPatch;
    try {
      payload = original
        ? buildContractorPatch(original, draft)
        : buildContractorInput(draft);
    } catch (failure) {
      if (failure instanceof ContractorDraftError) {
        setFields(failure.fields);
        setError("Check the highlighted fields before saving.");
      }
      return;
    }
    submitting.current = true;
    setPending(true);
    setFields({});
    setError("");
    try {
      saved(
        original
          ? await updateContractor(original._id, payload)
          : await addContractor(payload as ContractorInput),
      );
    } catch (failure) {
      if (failure instanceof ApiError && failure.ambiguous) {
        setUncertain(payload);
        setChecked(false);
        setMatches([]);
        setCheckMessage("");
        setError(
          "Could not confirm the save. Check the saved records before trying again. Your draft is still here.",
        );
      } else {
        setError(
          errorMessage(
            failure,
            "Could not save the company. Please try again.",
          ),
        );
        if (failure instanceof ApiError) {
          setFields(failure.fields ?? {});
          setNeedSignIn(failure.status === 401);
        }
      }
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };
  const reconcile = async () => {
    if (!uncertain || submitting.current) return;
    submitting.current = true;
    setPending(true);
    setCheckMessage("");
    const agrees = (record: Contractor) =>
      Object.entries(uncertain).every(
        ([key, value]) =>
          (record as unknown as Record<string, unknown>)[key] === value,
      );
    try {
      if (original) {
        const current = await fetchContractorById(original._id);
        if (agrees(current)) {
          saved(current);
          return;
        }
        setCheckMessage(
          "The saved company differs from this draft. Review it before allowing another save.",
        );
        setMatches([]);
      } else {
        const found = (await fetchContractors()).filter(agrees);
        found.forEach(upsert);
        setMatches(found);
        setCheckMessage(
          found.length
            ? "Matching saved companies were found. Open the record to check the save; another creation is blocked."
            : "No matching company was found. Check your register before allowing another save.",
        );
      }
      setChecked(true);
    } catch (failure) {
      setCheckMessage(
        "Could not check saved records. Check your connection and try again.",
      );
      setNeedSignIn(failure instanceof ApiError && failure.status === 401);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };
  const input = (
    key: keyof ContractorDraft,
    label: string,
    options: {
      type?: string;
      required?: boolean;
      help?: string;
      maxLength?: number;
      inputMode?: "decimal" | "tel" | "text";
      autoComplete?: string;
    } = {},
  ) => (
    <div className={`field field-${key}`}>
      <label htmlFor={key}>
        {label}
        {options.required && (
          <span className="required-marker"> (required)</span>
        )}
      </label>
      <input
        id={key}
        name={key}
        type={options.type ?? "text"}
        value={draft[key]}
        required={options.required}
        maxLength={options.maxLength}
        autoComplete={options.autoComplete ?? "off"}
        inputMode={options.inputMode}
        aria-invalid={Boolean(fields[key])}
        aria-describedby={
          fields[key]
            ? `${key}-error`
            : options.help
              ? `${key}-help`
              : undefined
        }
        onChange={(event) => {
          setDraft({ ...draft, [key]: event.target.value });
          if (fields[key]) setFields({ ...fields, [key]: "" });
        }}
      />
      {fields[key] ? (
        <span className="field-error" id={`${key}-error`}>
          {fields[key]}
        </span>
      ) : (
        options.help && (
          <span className="field-help" id={`${key}-help`}>
            {options.help}
          </span>
        )
      )}
    </div>
  );
  return (
    <>
      <Link className="back-link" to={backPath}>
        <Icon name="back" />
        {original ? "Back to company" : "Back to companies"}
      </Link>
      <div className="page-heading">
        <div>
          <h1>{original ? "Edit company" : "Add company"}</h1>
          <p className="page-description">
            {original
              ? `Update the saved details for ${original.name}.`
              : "Start with company details. Add prices and notes when you have them."}
          </p>
        </div>
      </div>
      <div className="form-layout">
        <form className="company-form" onSubmit={submit} noValidate>
          {error && (
            <div
              className="form-alert"
              ref={errorRef}
              role="alert"
              tabIndex={-1}
            >
              <p>{error}</p>
              {Object.entries(fields).some(([, message]) => message) && (
                <ul>
                  {Object.entries(fields)
                    .filter(([, message]) => message)
                    .map(([key, message]) => (
                      <li key={key}>
                        <a
                          href={`#${key}`}
                          onClick={() => document.getElementById(key)?.focus()}
                        >
                          {message}
                        </a>
                      </li>
                    ))}
                </ul>
              )}
              {needSignIn && !signIn && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setSignIn(true)}
                >
                  Sign in again
                </button>
              )}
            </div>
          )}
          {uncertain && (
            <section
              className="reconciliation"
              aria-label="Check uncertain save"
            >
              <p>
                Your save may have reached the server. Check first to avoid
                creating a duplicate or repeating an update.
              </p>
              <button
                type="button"
                className="button secondary"
                onClick={() => void reconcile()}
                disabled={pending}
              >
                {pending ? "Checking..." : "Check saved records"}
              </button>
              {checkMessage && <p role="status">{checkMessage}</p>}
              {matches.length > 0 && (
                <ul>
                  {matches.map((record) => (
                    <li key={record._id}>
                      <Link
                        to={`/contractors/${encodeURIComponent(record._id)}`}
                        onClick={() => {
                          bypass.current = true;
                        }}
                        aria-label={`View saved company: ${record.name}`}
                      >
                        {record.name}
                        <Icon name="arrow" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {original && checked && (
                <Link
                  to={`/contractors/${encodeURIComponent(original._id)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Review saved company in a new tab
                </Link>
              )}
              {checked && matches.length === 0 && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setUncertain(null);
                    setError("");
                    setCheckMessage("");
                    setChecked(false);
                  }}
                >
                  I checked; allow another save
                </button>
              )}
            </section>
          )}
          <fieldset
            disabled={pending || Boolean(uncertain) || needSignIn}
            className="form-fields"
          >
            <legend className="sr-only">Company record</legend>
            <section className="form-section">
              <div className="form-section-heading">
                <h2>Company details</h2>
                <p>
                  The information used to identify and contact this company.
                </p>
              </div>
              <div className="field-grid">
                {input("name", "Company name", {
                  required: true,
                  maxLength: 200,
                  autoComplete: "organization",
                })}
                {input("nip", "NIP", {
                  required: true,
                  maxLength: 100,
                  help: "Keep any leading zeros.",
                })}
                {input("phone", "Phone number", {
                  required: true,
                  maxLength: 100,
                  type: "tel",
                  autoComplete: "tel",
                })}
                {input("address", "Address", {
                  required: true,
                  maxLength: 1000,
                  autoComplete: "street-address",
                })}
                {input("contactDate", "Contact date", {
                  type: "date",
                  help: "Optional. Use the date that is relevant to this record.",
                })}
              </div>
            </section>
            <section className="form-section">
              <div className="form-section-heading">
                <h2>Current material prices</h2>
                <p>
                  All prices are in PLN per kilogram. Leave a field blank when
                  no price is set.
                </p>
              </div>
              <div className="field-grid">
                {input("priceColorless", "FOD colorless (PLN/kg)", {
                  inputMode: "decimal",
                  help: "Decimals and zero are accepted.",
                })}
                {input("priceColor", "FOD color (PLN/kg)", {
                  inputMode: "decimal",
                })}
                {input("typeUnknown", "Additional material type", {
                  maxLength: 200,
                })}
                {input("priceUnknown", "Additional material price (PLN/kg)", {
                  inputMode: "decimal",
                })}
              </div>
            </section>
            <section className="form-section">
              <div className="form-section-heading">
                <h2>Notes</h2>
                <p>Keep the context you want available next time.</p>
              </div>
              <div className="field">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={5}
                  maxLength={10000}
                  value={draft.notes}
                  aria-invalid={Boolean(fields.notes)}
                  aria-describedby={fields.notes ? "notes-error" : undefined}
                  onChange={(event) =>
                    setDraft({ ...draft, notes: event.target.value })
                  }
                />
                {fields.notes && (
                  <span className="field-error" id="notes-error">
                    {fields.notes}
                  </span>
                )}
              </div>
            </section>
          </fieldset>
          <div className="form-actions">
            <span>
              {pending
                ? "Saving your company..."
                : "Changes are saved only when you submit."}
            </span>
            <div>
              <button
                type="button"
                className="button secondary"
                onClick={() => navigate(backPath)}
                disabled={pending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button primary"
                disabled={pending || Boolean(uncertain) || needSignIn}
              >
                {pending
                  ? "Saving..."
                  : original
                    ? "Save changes"
                    : "Add company"}
                {!pending && <Icon name="check" />}
              </button>
            </div>
          </div>
        </form>
        <aside className="form-guide">
          <Icon name="document" />
          <h2>One company, one record.</h2>
          <p>
            Company details are required. Contact date, prices and notes can be
            added later.
          </p>
          <p>
            Prices stay in PLN/kg. Editing another field keeps the precision of
            an existing price.
          </p>
          <p>Your draft stays here if saving fails.</p>
        </aside>
      </div>
      {signIn && (
        <section className="reauth-panel">
          <SignInForm
            inline
            onSuccess={() => {
              setSignIn(false);
              setNeedSignIn(false);
              setError("");
            }}
          />
        </section>
      )}
      {blocker.state === "blocked" && (
        <ConfirmDialog
          title="Discard changes?"
          cancelLabel="Keep editing"
          confirmLabel="Discard changes"
          pending={pending}
          destructive
          onCancel={() => blocker.reset()}
          onConfirm={() => blocker.proceed()}
        >
          <p>
            Your unsaved changes will be lost. Keep editing to return to this
            draft.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
