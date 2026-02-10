import { useState, useRef, useEffect } from "react";
import { WebSocketClient, ConnectionState } from "../services/ws";
import type { LipFrame, DecodeResult } from "../types";

interface UseWebSocketReturn {
  connect: () => Promise<void>;
  disconnect: () => void;
  sendAudioChunk: (base64: string) => void;
  sendLandmarks: (frame: LipFrame) => void;
  sendEndUtterance: () => void;
  lastPartial: string | null;
  lastFinal: DecodeResult | null;
  connectionState: ConnectionState;
  clearResults: () => void;
}

export function useWebSocket(userId: string): UseWebSocketReturn {
  const [lastPartial, setLastPartial] = useState<string | null>(null);
  const [lastFinal, setLastFinal] = useState<DecodeResult | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("closed");

  // Build WebSocket URL
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
  const wsUrl = baseUrl.replace("http", "ws") + "/decode/" + userId + "/stream";

  // Create WebSocket client ref
  const clientRef = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    // Initialize client
    clientRef.current = new WebSocketClient(wsUrl);

    // Register message handler
    clientRef.current.onMessage((message) => {
      if (message.type === "partial") {
        setLastPartial(message.text);
      } else if (message.type === "final") {
        setLastFinal(message.result);
        setLastPartial(null);
      } else if (message.type === "error") {
        console.error("WebSocket error message:", message.message);
      }
    });

    // Register state change handler
    clientRef.current.onStateChange((state) => {
      setConnectionState(state);
    });

    // Cleanup on unmount
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current.clearCallbacks();
        clientRef.current = null;
      }
    };
  }, [wsUrl]);

  const connect = async (): Promise<void> => {
    if (clientRef.current) {
      await clientRef.current.connect();
    }
  };

  const disconnect = (): void => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
  };

  const sendAudioChunk = (base64: string): void => {
    if (clientRef.current) {
      clientRef.current.sendAudioChunk(base64);
    }
  };

  const sendLandmarks = (frame: LipFrame): void => {
    if (clientRef.current) {
      clientRef.current.sendLandmarks(frame);
    }
  };

  const sendEndUtterance = (): void => {
    if (clientRef.current) {
      clientRef.current.sendEndUtterance();
    }
  };

  const clearResults = (): void => {
    setLastPartial(null);
    setLastFinal(null);
  };

  return {
    connect,
    disconnect,
    sendAudioChunk,
    sendLandmarks,
    sendEndUtterance,
    lastPartial,
    lastFinal,
    connectionState,
    clearResults,
  };
}
