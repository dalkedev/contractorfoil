import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { fetchContractors } from "../services/api";
import type { Contractor } from "../types";

type WorkspaceValue = {
  records: Contractor[];
  loaded: boolean;
  loading: boolean;
  error: unknown;
  load: () => Promise<void>;
  upsert: (record: Contractor) => void;
  remove: (id: string) => void;
  listSearch: string;
  rememberSearch: (search: string) => void;
  notice: string;
  setNotice: (notice: string) => void;
};
const WorkspaceContext = createContext<WorkspaceValue | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Contractor[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [listSearch, rememberSearch] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const revision = useRef(0);
  const load = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    const startingRevision = revision.current;
    setLoading(true);
    setError(null);
    try {
      const saved = await fetchContractors();
      if (startingRevision === revision.current) {
        setRecords(saved);
        setLoaded(true);
      }
    } catch (failure) {
      if (startingRevision === revision.current) setError(failure);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }, []);
  const upsert = (record: Contractor) => {
    revision.current += 1;
    setRecords((current) =>
      current.some((item) => item._id === record._id)
        ? current.map((item) => (item._id === record._id ? record : item))
        : [...current, record],
    );
  };
  const remove = (id: string) => {
    revision.current += 1;
    setRecords((current) => current.filter((record) => record._id !== id));
  };
  return (
    <WorkspaceContext.Provider
      value={{
        records,
        loaded,
        loading,
        error,
        load,
        upsert,
        remove,
        listSearch,
        rememberSearch,
        notice,
        setNotice,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("Workspace provider is required.");
  return context;
}
