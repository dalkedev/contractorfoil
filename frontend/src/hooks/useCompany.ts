import { useEffect, useState } from "react";
import { fetchContractorById } from "../services/api";
import type { Contractor } from "../types";

export function useCompany(id: string) {
  const [record, setRecord] = useState<Contractor | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setRecord(null);
    fetchContractorById(id, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setRecord(value);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, attempt]);
  return {
    record,
    error,
    loading,
    retry: () => setAttempt((current) => current + 1),
  };
}
