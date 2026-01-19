import { useCallback, useRef } from "react";
import { useGlobalState } from "../global-state/context-provider";
import { API } from "../api/api";

// Set up automatic token refresh every hour
export const useSetupTokenRefresh = () => {
  const [state, dispatch] = useGlobalState();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reauth = useCallback(async () => {
    const isConnected = Object.values(state.calls).some(
      (call) => call.connectionState === "connected"
    );

    if (isConnected) {
      return;
    }

    const maxRetries = 3;
    let delay = 1000;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        await API.reauth();
        return;
      } catch (error: any) {
        const is500Error = error.message.includes("500");

        if (is500Error) {
          // Don't dispatch 500 errors as they're expected when inital OSC token expires
          return;
        }

        if (i < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }

        dispatch({
          type: "ERROR",
          payload: {
            error: new Error(`Failed to reauth: ${error}`),
          },
        });
      }
    }
  }, [dispatch, state.calls]);

  const setupTokenRefresh = useCallback(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(reauth, 60 * 60 * 1000);

    window.addEventListener("online", reauth);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener("online", reauth);
    };
  }, [reauth]);

  return { setupTokenRefresh };
};
