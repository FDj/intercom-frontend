/**
 * Hook to retrieve configuration from URL parameters or sessionStorage (for embedded mode).
 * This centralizes the logic for reading kiosk mode and username parameters,
 * making it easy to switch to data attributes or other sources in the future.
 */
export const useUrlParams = () => {
  // Check sessionStorage first (for embedded mode)
  const usernameFromSession = sessionStorage.getItem("username");
  const kioskFromSession = sessionStorage.getItem("kiosk");
  const declutterFromSession = sessionStorage.getItem("declutter");
  const companionUriFromSession = sessionStorage.getItem("companion-uri");

  // Fall back to URL params
  const urlParams = new URLSearchParams(window.location.search);
  const usernameFromUrl = urlParams.get("username");
  const kioskParam = urlParams.get("kiosk");
  const declutterParam = urlParams.get("declutter");
  const companionUriFromUrl = urlParams.get("companion-uri");

  const isDeclutterMode = declutterFromSession === "true" || declutterParam === "1";
  const isKioskParam = kioskFromSession === "true" || kioskParam === "1";
  const username = usernameFromSession || usernameFromUrl;
  const companionUri = companionUriFromSession || companionUriFromUrl;

  return {
    usernameFromUrl: username,
    isKioskParam,
    isDeclutterMode,
    companionUri,
  };
};
