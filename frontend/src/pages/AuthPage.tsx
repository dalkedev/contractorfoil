import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useSession } from "../context/Session";
import { ApiError } from "../services/api";
import { registrationCaptcha } from "../services/captcha";
import { Brand, Icon, errorMessage } from "../components/ui";
import type { FieldErrors } from "../types";

export function SignInForm({
  onSuccess,
  inline = false,
}: {
  onSuccess: () => void;
  inline?: boolean;
}) {
  const { signIn, user } = useSession();
  const [email, setEmail] = useState(inline ? (user?.email ?? "") : "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (inline) passwordRef.current?.focus();
  }, [inline]);
  useEffect(() => {
    if (inline && !pending && error) passwordRef.current?.focus();
  }, [inline, pending, error]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError("");
    try {
      await signIn(email.trim(), password);
      onSuccess();
    } catch (failure) {
      setError(errorMessage(failure, "Could not sign in. Please try again."));
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };
  return (
    <form onSubmit={submit} className="auth-form">
      {inline && <h3>Sign in to keep editing</h3>}
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      <div className="field">
        <label htmlFor="signin-email">Email address</label>
        <input
          id="signin-email"
          type="email"
          readOnly={inline}
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
        />
      </div>
      <div className="field">
        <label htmlFor="signin-password">Password</label>
        <input
          id="signin-password"
          ref={passwordRef}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={pending}
        />
      </div>
      <button type="submit" className="button primary" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
        {!pending && <Icon name="arrow" />}
      </button>
    </form>
  );
}
function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const { register } = useSession();
  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [fields, setFields] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    if (values.password !== values.confirm) {
      setError("Passwords do not match.");
      setFields({ confirm: "Enter the same password in both fields." });
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    submitting.current = true;
    setPending(true);
    setError("");
    setFields({});
    try {
      let captcha: string | undefined;
      try {
        captcha = await registrationCaptcha();
      } catch (failure) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Account verification failed. Try again.",
        );
        return;
      }
      await register(
        values.name.trim(),
        values.email.trim(),
        values.password,
        captcha,
      );
      onSuccess();
    } catch (failure) {
      setError(
        failure instanceof ApiError && failure.ambiguous
          ? "Could not confirm account creation. Sign in with these details to check before creating the account again."
          : errorMessage(
              failure,
              "Could not create your account. Please try again.",
            ),
      );
      if (failure instanceof ApiError) setFields(failure.fields ?? {});
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };
  const field = (
    key: keyof typeof values,
    label: string,
    type: string,
    autoComplete: string,
  ) => (
    <div className="field">
      <label htmlFor={`register-${key}`}>{label}</label>
      <input
        id={`register-${key}`}
        name={key}
        type={type}
        autoComplete={autoComplete}
        required
        value={values[key]}
        disabled={pending}
        aria-invalid={Boolean(fields[key])}
        aria-describedby={
          fields[key]
            ? `${key}-error`
            : key === "password"
              ? "password-help"
              : undefined
        }
        onChange={(event) =>
          setValues({ ...values, [key]: event.target.value })
        }
      />
      {fields[key] && (
        <span id={`${key}-error`} className="field-error">
          {fields[key]}
        </span>
      )}
    </div>
  );
  return (
    <form className="auth-form" onSubmit={submit}>
      {error && (
        <div className="form-alert" role="alert" tabIndex={-1} ref={errorRef}>
          {error}
        </div>
      )}
      {field("name", "Full name", "text", "name")}
      {field("email", "Email address", "email", "username")}
      {field("password", "Password", "password", "new-password")}
      <p className="field-help" id="password-help">
        Use at least 8 characters. Keep your password private.
      </p>
      {field("confirm", "Confirm password", "password", "new-password")}
      {import.meta.env.VITE_USE_RECAPTCHA === "true" && (
        <p className="field-help">
          Account creation uses Google reCAPTCHA.{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noreferrer"
          >
            Privacy
          </a>{" "}
          and{" "}
          <a
            href="https://policies.google.com/terms"
            target="_blank"
            rel="noreferrer"
          >
            Terms
          </a>{" "}
          apply.
        </p>
      )}
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Creating account..." : "Create account"}
        {!pending && <Icon name="arrow" />}
      </button>
    </form>
  );
}
export default function AuthPage({ register = false }: { register?: boolean }) {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const destination =
    typeof location.state?.from === "string" &&
    location.state.from.startsWith("/") &&
    !location.state.from.startsWith("//")
      ? location.state.from
      : "/dashboard";
  useEffect(() => {
    if (location.state?.signOut) session.signOut();
  }, [location.key]);
  if (session.user && !location.state?.signOut)
    return <Navigate to={destination} replace />;
  return (
    <div className="auth-page">
      <a className="skip-link" href="#auth-content">
        Skip to content
      </a>
      <aside className="auth-aside">
        <Brand />
        <div className="auth-aside-copy">
          <h2>A clearer view of every company.</h2>
          <p>
            Contact details, current material prices and the notes you need,
            together in one record.
          </p>
          <div className="auth-aside-rule" />
          <p className="auth-aside-small">
            Find the company.
            <br />
            Pick up where you left off.
          </p>
        </div>
        <span className="auth-aside-footer">ContractorFoil</span>
      </aside>
      <main className="auth-content" id="auth-content">
        <Link to="/" className="back-link">
          <Icon name="back" />
          Back to home
        </Link>
        <div className="auth-card">
          <h1>{register ? "Create your account" : "Sign in"}</h1>
          <p className="page-description">
            {register
              ? "Start your own company register."
              : "Welcome back to your company workspace."}
          </p>
          {session.notice && (
            <p className="page-description" role="status">{session.notice}</p>
          )}
          {register ? (
            <RegisterForm
              onSuccess={() => navigate(destination, { replace: true })}
            />
          ) : (
            <SignInForm
              onSuccess={() => navigate(destination, { replace: true })}
            />
          )}
          <p className="auth-switch">
            {register ? "Already have an account?" : "New to ContractorFoil?"}{" "}
            <Link
              to={register ? "/login" : "/register"}
              state={{ from: destination }}
            >
              {register ? "Sign in" : "Create account"}
            </Link>
          </p>
        </div>
        <p className="auth-bottom">
          Company contacts &amp; current material prices.
        </p>
      </main>
    </div>
  );
}
