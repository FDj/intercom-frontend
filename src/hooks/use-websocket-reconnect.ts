import { useEffect, useRef } from "react";
import { useGlobalState } from "../global-state/context-provider";
import { CallState } from "../global-state/types";
import { useCallList } from "./use-call-list";
import logger from "../utils/logger";

const MAX_RETRY_ATTEMPTS = 10;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds

export const useWebsocketReconnect = ({
  calls,
  isMasterInputMuted,
  isWSReconnecting,
  isWSConnected,
  isConnectionConflict,
  isKioskMode,
  setIsWSReconnecting,
  wsConnect,
}: {
  calls: Record<string, CallState>;
  isMasterInputMuted: boolean;
  isWSReconnecting: boolean;
  isWSConnected: boolean;
  isConnectionConflict: boolean;
  isKioskMode: boolean;
  setIsWSReconnecting: (v: boolean) => void;
  wsConnect: (url: string) => void;
}) => {
  const [{ websocket, error }] = useGlobalState();
  const retryAttemptRef = useRef(0);
  const retryTimeoutRef = useRef<number | null>(null);

  const { deregisterCall, registerCallList } = useCallList({
    websocket,
    globalMute: isMasterInputMuted,
    numberOfCalls: Object.values(calls).length,
  });

  // Reset reconnecting flag and retry count when connection succeeds
  useEffect(() => {
    if (isWSConnected && isWSReconnecting) {
      setIsWSReconnecting(false);
      retryAttemptRef.current = 0;
      logger.green("WebSocket reconnected successfully");
    }
  }, [isWSConnected, isWSReconnecting, setIsWSReconnecting]);

  // Handle reconnect attempts with exponential backoff
  useEffect(() => {
    // Always reset reconnecting flag on error
    if (error) {
      setIsWSReconnecting(false);
    }

    const shouldReconnect =
      websocket !== null &&
      websocket.readyState === WebSocket.CLOSED &&
      websocket.url &&
      !isWSConnected &&
      !isConnectionConflict;

    if (shouldReconnect) {
      const canRetry =
        isKioskMode || retryAttemptRef.current < MAX_RETRY_ATTEMPTS;

      if (!canRetry) {
        logger.red(
          `Max reconnection attempts (${MAX_RETRY_ATTEMPTS}) reached. Giving up.`
        );
        setIsWSReconnecting(false);
      } else {
        setIsWSReconnecting(true);

        // Calculate delay with exponential backoff
        const delay = Math.min(
          INITIAL_RETRY_DELAY * Math.pow(2, retryAttemptRef.current),
          MAX_RETRY_DELAY
        );

        logger.yellow(
          `Attempting to reconnect (${retryAttemptRef.current + 1}/${MAX_RETRY_ATTEMPTS}) in ${delay}ms...`
        );

        retryTimeoutRef.current = window.setTimeout(() => {
          retryAttemptRef.current += 1;
          wsConnect(websocket.url);
        }, delay);
      }
    } else if (retryAttemptRef.current > 0) {
      // Reset retry count when connection is established or no longer needed
      retryAttemptRef.current = 0;
    }

    return () => {
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [
    websocket,
    wsConnect,
    isWSConnected,
    isWSReconnecting,
    setIsWSReconnecting,
    error,
    isConnectionConflict,
    isKioskMode,
  ]);

  return { registerCallList, deregisterCall };
};
