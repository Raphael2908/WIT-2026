import { useState, useCallback } from "react";
import { api } from "../services/api";
import { API_ROUTES } from "../utils/constants";
import type {
  CalibrationPhrase,
  CalibrationResult,
  CalibrationSummary,
} from "../types";

type CalibrationStatus =
  | "loading"
  | "ready"
  | "recording"
  | "processing"
  | "result"
  | "complete";

export function useCalibration(userId: string) {
  const [status, setStatus] = useState<CalibrationStatus>("loading");
  const [phrases, setPhrases] = useState<CalibrationPhrase[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<CalibrationResult[]>([]);
  const [summary, setSummary] = useState<CalibrationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPhrase = phrases[currentIndex] || null;
  const totalPhrases = phrases.length;
  const progress = totalPhrases > 0 ? currentIndex / totalPhrases : 0;

  const startSession = useCallback(async () => {
    try {
      setStatus("loading");
      setError(null);
      const response = await api.get<{ phrases: CalibrationPhrase[] }>(
        `${API_ROUTES.CALIBRATION_PHRASES}?count=15`
      );
      setPhrases(response.phrases);
      setCurrentIndex(0);
      setResults([]);
      setSummary(null);
      setStatus("ready");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch calibration phrases";
      setError(message);
      setStatus("ready");
    }
  }, []);

  const submitRecording = useCallback(
    async (audioUri: string, videoUri: string): Promise<CalibrationResult> => {
      if (!currentPhrase) {
        throw new Error("No current phrase to submit");
      }

      try {
        setStatus("processing");
        setError(null);

        const formData = new FormData();
        formData.append("audio", {
          uri: audioUri,
          type: "audio/wav",
          name: "audio.wav",
        } as any);
        formData.append("video", {
          uri: videoUri,
          type: "video/mp4",
          name: "video.mp4",
        } as any);
        formData.append("phrase_id", currentPhrase.phrase_id);

        const result = await api.postFormData<CalibrationResult>(
          API_ROUTES.SUBMIT_CALIBRATION(userId),
          formData
        );

        setResults((prev) => [...prev, result]);
        setStatus("result");

        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to submit recording";
        setError(message);
        setStatus("ready");
        throw err;
      }
    },
    [userId, currentPhrase]
  );

  const skipPhrase = useCallback(() => {
    if (currentIndex < totalPhrases - 1) {
      setCurrentIndex((prev) => prev + 1);
      setStatus("ready");
    }
  }, [currentIndex, totalPhrases]);

  const nextPhrase = useCallback(() => {
    if (currentIndex < totalPhrases - 1) {
      setCurrentIndex((prev) => prev + 1);
      setStatus("ready");
    }
  }, [currentIndex, totalPhrases]);

  const completeSession = useCallback(async (): Promise<CalibrationSummary> => {
    try {
      setError(null);
      const summaryResult = await api.post<CalibrationSummary>(
        API_ROUTES.COMPLETE_CALIBRATION(userId),
        {}
      );
      setSummary(summaryResult);
      setStatus("complete");
      return summaryResult;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to complete calibration";
      setError(message);
      throw err;
    }
  }, [userId]);

  const retry = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalPhrases) {
        setCurrentIndex(index);
        setStatus("ready");
      }
    },
    [totalPhrases]
  );

  return {
    status,
    phrases,
    currentPhrase,
    currentIndex,
    totalPhrases,
    progress,
    results,
    summary,
    startSession,
    submitRecording,
    skipPhrase,
    completeSession,
    retry,
    nextPhrase,
    error,
  };
}
