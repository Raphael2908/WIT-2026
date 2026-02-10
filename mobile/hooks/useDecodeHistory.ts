import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import { API_ROUTES } from "../utils/constants";
import type { DecodeHistoryEntry } from "../types";

interface DecodeHistoryStats {
  totalDecodes: number;
  confirmedCount: number;
  correctedCount: number;
  accuracyTrend: number[];
}

export function useDecodeHistory(userId: string) {
  const [history, setHistory] = useState<DecodeHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DecodeHistoryStats>({
    totalDecodes: 0,
    confirmedCount: 0,
    correctedCount: 0,
    accuracyTrend: [],
  });

  const computeStats = useCallback((entries: DecodeHistoryEntry[]): DecodeHistoryStats => {
    const totalDecodes = entries.length;
    const confirmedCount = entries.filter(
      (entry) => entry.feedback_status === "confirmed"
    ).length;
    const correctedCount = entries.filter(
      (entry) => entry.feedback_status === "corrected"
    ).length;

    const last10 = entries.slice(0, 10);
    const accuracyTrend = last10.map((entry) => entry.whisper_confidence * 100);

    return {
      totalDecodes,
      confirmedCount,
      correctedCount,
      accuracyTrend,
    };
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const response = await api.get<{ history: DecodeHistoryEntry[] }>(
        API_ROUTES.FEEDBACK_HISTORY(userId)
      );
      setHistory(response.history);
      setStats(computeStats(response.history));
    } catch (err) {
      console.error("Failed to fetch decode history:", err);
      setHistory([]);
      setStats({
        totalDecodes: 0,
        confirmedCount: 0,
        correctedCount: 0,
        accuracyTrend: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, computeStats]);

  const refresh = useCallback(async () => {
    await fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    isLoading,
    refresh,
    stats,
  };
}
