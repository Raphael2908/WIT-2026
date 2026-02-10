/**
 * WebSocket client for real-time streaming decode.
 *
 * Handles connection, reconnection, message sending/receiving for the decode stream.
 */

import type { LipFrame, WSClientMessage, WSServerMessage } from '../types';

export type ConnectionState = "connecting" | "open" | "closed" | "error";

type MessageCallback = (msg: WSServerMessage) => void;
type StateChangeCallback = (state: ConnectionState) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private messageCallbacks: MessageCallback[] = [];
  private stateCallbacks: StateChangeCallback[] = [];
  private _state: ConnectionState = "closed";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeouts = [1000, 2000, 4000]; // exponential backoff in ms
  private reconnectTimer: NodeJS.Timeout | null = null;
  private manualDisconnect = false;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Current connection state
   */
  get state(): ConnectionState {
    return this._state;
  }

  /**
   * Update state and notify listeners
   */
  private setState(newState: ConnectionState): void {
    if (this._state !== newState) {
      this._state = newState;
      this.stateCallbacks.forEach(cb => {
        try {
          cb(newState);
        } catch (err) {
          console.error('[WebSocketClient] State callback error:', err);
        }
      });
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
        console.warn('[WebSocketClient] Already connected or connecting');
        resolve();
        return;
      }

      this.manualDisconnect = false;
      this.setState("connecting");

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WebSocketClient] Connected');
          this.setState("open");
          this.reconnectAttempts = 0;
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WSServerMessage;
            this.messageCallbacks.forEach(cb => {
              try {
                cb(message);
              } catch (err) {
                console.error('[WebSocketClient] Message callback error:', err);
              }
            });
          } catch (err) {
            console.error('[WebSocketClient] Failed to parse message:', err);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocketClient] Error:', error);
          if (this._state === "connecting") {
            reject(new Error('Failed to connect to WebSocket'));
          }
        };

        this.ws.onclose = (event) => {
          console.log('[WebSocketClient] Closed:', event.code, event.reason);
          this.ws = null;

          if (!this.manualDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.setState("connecting");
            this.attemptReconnect();
          } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.setState("error");
          } else {
            this.setState("closed");
          }
        };
      } catch (err) {
        console.error('[WebSocketClient] Failed to create WebSocket:', err);
        this.setState("error");
        reject(err);
      }
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.manualDisconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    const delay = this.reconnectTimeouts[Math.min(this.reconnectAttempts, this.reconnectTimeouts.length - 1)];
    console.log(`[WebSocketClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(err => {
        console.error('[WebSocketClient] Reconnect failed:', err);
      });
    }, delay);
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.manualDisconnect = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch (err) {
        console.error('[WebSocketClient] Error closing WebSocket:', err);
      }
      this.ws = null;
    }

    this.setState("closed");
    this.reconnectAttempts = 0;
  }

  /**
   * Send a message to the server
   */
  private send(message: WSClientMessage): void {
    if (this._state !== "open" || !this.ws) {
      console.warn('[WebSocketClient] Cannot send message: WebSocket not open');
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (err) {
      console.error('[WebSocketClient] Failed to send message:', err);
    }
  }

  /**
   * Send audio chunk
   */
  sendAudioChunk(base64: string): void {
    this.send({ type: "audio", data: base64 });
  }

  /**
   * Send lip landmarks frame
   */
  sendLandmarks(frame: LipFrame): void {
    this.send({ type: "landmarks", data: frame });
  }

  /**
   * Signal end of utterance
   */
  sendEndUtterance(): void {
    this.send({ type: "end_utterance" });
  }

  /**
   * Register a callback for incoming messages
   */
  onMessage(callback: MessageCallback): void {
    this.messageCallbacks.push(callback);
  }

  /**
   * Unregister a message callback
   */
  offMessage(callback: MessageCallback): void {
    this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Register a callback for state changes
   */
  onStateChange(callback: StateChangeCallback): void {
    this.stateCallbacks.push(callback);
  }

  /**
   * Unregister a state change callback
   */
  offStateChange(callback: StateChangeCallback): void {
    this.stateCallbacks = this.stateCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Clear all callbacks (useful for cleanup)
   */
  clearCallbacks(): void {
    this.messageCallbacks = [];
    this.stateCallbacks = [];
  }
}
