import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCompany } from "../hooks/useCompany";
import { useWorkspace } from "../context/Workspace";
import {
  ApiError,
  deleteContractor,
  fetchContractorById,
} from "../services/api";
import { formatContactDate, formatPrice } from "../domain/contractors";
import {
  ConfirmDialog,
  ErrorState,
  Icon,
  Loading,
  errorMessage,
} from "../components/ui";
import { SignInForm } from "./AuthPage";

export default function CompanyDetailPage() {
  const { id = "" } = useParams();
  const { record, loading, error, retry } = useCompany(id);
  const { listSearch, remove, setNotice } = useWorkspace();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [ambiguous, setAmbiguous] = useState(false);
  const [needSignIn, setNeedSignIn] = useState(false);
  const [signIn, setSignIn] = useState(false);
  const submitting = useRef(false);
  const removed = () => {
    remove(id);
    setNotice("Company deleted.");
    navigate(`/contractors${listSearch}`, { replace: true });
  };
  const deleteRecord = async () => {
    if (submitting.current || ambiguous) return;
    submitting.current = true;
    setPending(true);
    setDeleteError("");
    try {
      await deleteContractor(id);
      removed();
    } catch (failure) {
      if (failure instanceof ApiError && failure.ambiguous) {
        setAmbiguous(true);
        setDeleteError(
          "Could not confirm deletion. Check the saved company before trying again.",
        );
      } else {
        setDeleteError(
          errorMessage(
            failure,
            "Could not delete the company. Please try again.",
          ),
        );
        setNeedSignIn(failure instanceof ApiError && failure.status === 401);
      }
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };
  const reconcile = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    try {
      await fetchContractorById(id);
      setAmbiguous(false);
      setDeleteError("The company is still present. You can retry deletion.");
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 404) removed();
      else {
        setDeleteError(
          "Could not check the saved company. Check your connection and try again.",
        );
        setNeedSignIn(failure instanceof ApiError && failure.status === 401);
      }
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };
  const back = (
    <Link to={`/contractors${listSearch}`} className="back-link">
      <Icon name="back" />
      Back to companies
    </Link>
  );
  if (loading)
    return (
      <>
        {back}
        <Loading label="Loading company..." />
      </>
    );
  if (error || !record)
    return (
      <>
        {back}
        <ErrorState
          title={
            error instanceof ApiError && error.status === 404
              ? "Company not found"
              : "Could not load this company"
          }
          message={
            error instanceof ApiError && error.status === 404
              ? "This record is unavailable or has been deleted."
              : "Check your connection and try again."
          }
          retry={
            error instanceof ApiError && error.status === 404
              ? undefined
              : retry
          }
        />
      </>
    );
  return (
    <>
      {back}
      <div className="page-heading detail-heading">
        <div>
          <h1>{record.name}</h1>
          <p className="page-description">NIP {record.nip}</p>
        </div>
        <Link
          className="button primary"
          to={`/contractors/${encodeURIComponent(id)}/edit`}
        >
          <Icon name="edit" />
          Edit company
        </Link>
      </div>
      <div className="detail-grid">
        <section className="record-panel">
          <div className="section-heading">
            <h2>Company details</h2>
            <Icon name="companies" />
          </div>
          <dl className="detail-data">
            <div>
              <dt>Company name</dt>
              <dd>{record.name}</dd>
            </div>
            <div>
              <dt>NIP</dt>
              <dd>{record.nip}</dd>
            </div>
            <div>
              <dt>Phone number</dt>
              <dd>
                <a href={`tel:${record.phone.replace(/[^+\d]/g, "")}`}>
                  {record.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>
                {record.address}
                <a
                  className="map-link"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(record.address)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon name="map" />
                  Open in Google Maps
                  <Icon name="arrow" />
                </a>
              </dd>
            </div>
            <div>
              <dt>Contact date</dt>
              <dd>{formatContactDate(record.contactDate)}</dd>
            </div>
          </dl>
        </section>
        <section className="record-panel prices-panel">
          <div className="section-heading">
            <h2>Current material prices</h2>
            <span>PLN/kg</span>
          </div>
          <dl className="price-list">
            <div>
              <dt>FOD colorless</dt>
              <dd
                className={record.priceColorless == null ? "missing-price" : ""}
              >
                {formatPrice(record.priceColorless)}
              </dd>
            </div>
            <div>
              <dt>FOD color</dt>
              <dd className={record.priceColor == null ? "missing-price" : ""}>
                {formatPrice(record.priceColor)}
              </dd>
            </div>
            <div>
              <dt>
                Additional material
                {record.typeUnknown && <span>{record.typeUnknown}</span>}
              </dt>
              <dd
                className={record.priceUnknown == null ? "missing-price" : ""}
              >
                {formatPrice(record.priceUnknown)}
              </dd>
            </div>
          </dl>
          <p className="price-note">
            Current saved values. Prices are displayed to two decimal places.
          </p>
        </section>
        <section className="record-panel notes-panel">
          <div className="section-heading">
            <h2>Notes</h2>
            <Icon name="document" />
          </div>
          <p className={record.notes ? "record-notes" : "record-notes muted"}>
            {record.notes || "No notes added."}
          </p>
        </section>
      </div>
      <div className="record-footer">
        <dl>
          <div>
            <dt>Record created</dt>
            <dd>{formatContactDate(record.createdAt)}</dd>
          </div>
          <div>
            <dt>Record updated</dt>
            <dd>{formatContactDate(record.updatedAt)}</dd>
          </div>
        </dl>
        <button
          className="text-button destructive"
          onClick={() => {
            setConfirm(true);
            setDeleteError("");
          }}
        >
          <Icon name="trash" />
          Delete company
        </button>
      </div>
      {confirm && (
        <ConfirmDialog
          title={`Delete ${record.name}?`}
          cancelLabel="Keep company"
          confirmLabel="Delete company"
          destructive
          pending={pending}
          confirmDisabled={ambiguous || needSignIn}
          onCancel={() => {
            if (!pending) setConfirm(false);
          }}
          onConfirm={() => void deleteRecord()}
        >
          <p>
            This removes the company’s contact details, notes and current
            prices. This action cannot be undone.
          </p>
          {deleteError && (
            <div role="alert" className="form-alert">
              {deleteError}
            </div>
          )}
          {ambiguous && (
            <button
              className="button secondary"
              disabled={pending}
              onClick={() => void reconcile()}
            >
              {pending ? "Checking..." : "Check saved company"}
            </button>
          )}
          {needSignIn && !signIn && (
            <button
              className="button secondary"
              onClick={() => setSignIn(true)}
            >
              Sign in again
            </button>
          )}
          {signIn && (
            <SignInForm
              inline
              onSuccess={() => {
                setSignIn(false);
                setNeedSignIn(false);
                setDeleteError("Signed in. You can continue.");
              }}
            />
          )}
        </ConfirmDialog>
      )}
    </>
  );
}
