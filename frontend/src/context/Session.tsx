import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  ApiError,
  fetchCurrentUser,
  invalidateSession,
  loginUser,
  logoutUser,
  registerUser,
} from "../services/api";
import type { User } from "../types";
import { Brand, ErrorState, Loading } from "../components/ui";

type SessionContextValue = {
  user: User | null;
  loading: boolean;
  error: boolean;
  notice: string;
  restore: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    captcha?: string,
  ) => Promise<void>;
  signOut: () => void;
};
const SessionContext = createContext<SessionContextValue | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(
    Boolean(localStorage.getItem("userToken")),
  );
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState("");
  const activeToken = useRef(localStorage.getItem("userToken"));
  const generation = useRef(0);
  const restore = useCallback(async () => {
    const token = localStorage.getItem("userToken");
    const requestGeneration = ++generation.current;
    if (!token) {
      activeToken.current = null;
      setUser(null);
      setError(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    const current = () =>
      generation.current === requestGeneration &&
      localStorage.getItem("userToken") === token;
    try {
      const profile = await fetchCurrentUser();
      if (current()) {
        activeToken.current = token;
        setUser(profile);
      }
    } catch (failure) {
      if (!current()) return;
      if (
        failure instanceof ApiError &&
        (failure.status === 401 || failure.status === 403)
      ) {
        logoutUser();
        setUser(null);
      } else setError(true);
    } finally {
      if (generation.current === requestGeneration) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const changedElsewhere = (event: StorageEvent) => {
      if (event.storageArea && event.storageArea !== localStorage) return;
      if (event.key !== null && event.key !== "userToken") return;
      if (localStorage.getItem("userToken") === activeToken.current) return;
      generation.current += 1;
      activeToken.current = null;
      invalidateSession();
      setUser(null);
      setLoading(false);
      setError(false);
      setNotice("Your session changed in another tab. Sign in again to continue. Unsaved changes in this tab were cleared.");
    };
    window.addEventListener("storage", changedElsewhere);
    void restore();
    return () => {
      window.removeEventListener("storage", changedElsewhere);
      generation.current += 1;
    };
  }, [restore]);
  const signIn = async (email: string, password: string) => {
    generation.current += 1;
    setLoading(false);
    const session = await loginUser(email, password);
    activeToken.current = session.token;
    setUser(session);
    setNotice("");
    setError(false);
    setLoading(false);
  };
  const register = async (
    name: string,
    email: string,
    password: string,
    captcha?: string,
  ) => {
    generation.current += 1;
    setLoading(false);
    const session = await registerUser(name, email, password, captcha);
    activeToken.current = session.token;
    setUser(session);
    setNotice("");
    setError(false);
    setLoading(false);
  };
  const signOut = () => {
    generation.current += 1;
    activeToken.current = null;
    logoutUser();
    setUser(null);
    setNotice("");
    setError(false);
    setLoading(false);
  };
  return (
    <SessionContext.Provider
      value={{ user, loading, error, notice, restore, signIn, register, signOut }}
    >
      {children}
    </SessionContext.Provider>
  );
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Session provider is required.");
  return value;
}
export function RequireSession({ children }: { children: ReactNode }) {
  const session = useSession();
  const location = useLocation();
  if (session.loading)
    return (
      <main className="session-screen">
        <Brand />
        <Loading label="Checking your session..." />
      </main>
    );
  if (session.error)
    return (
      <main className="session-screen">
        <Brand />
        <ErrorState
          title="Could not check your session"
          message="Your saved session could not be verified. Check your connection and try again."
          retry={() => void session.restore()}
        />
        <button className="text-button" onClick={session.signOut}>
          Return to sign in
        </button>
      </main>
    );
  if (!session.user)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  return <Fragment key={session.user._id}>{children}</Fragment>;
}
