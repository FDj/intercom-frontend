/**
 * Hook to retrieve configuration from URL parameters.
 * This centralizes the logic for reading kiosk mode and username parameters,
 * making it easy to switch to data attributes or other sources in the future.
 */
export const useUrlParams = () => {
  const urlParams = new URLSearchParams(window.location.search);

  const usernameFromUrl = urlParams.get("username");
  const kioskParam = urlParams.get("kiosk");
  const isKioskParam = kioskParam === "1";

  return {
    usernameFromUrl,
    isKioskParam,
  };
};
