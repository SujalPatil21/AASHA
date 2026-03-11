const DEFAULT_HEALTHCHECK_URL =
  import.meta.env.VITE_CONNECTIVITY_CHECK_URL || "http://localhost:8080/healthz";
const DEFAULT_INTERNET_CHECK_URL =
  import.meta.env.VITE_INTERNET_CHECK_URL || "https://www.gstatic.com/generate_204";
const REQUIRE_INTERNET_FOR_ONLINE_STATUS =
  (import.meta.env.VITE_REQUIRE_INTERNET_FOR_ONLINE_STATUS || "true").toLowerCase() !== "false";

const CONNECTIVITY_TIMEOUT_MS = 3500;

/**
 * Lightweight online verification that checks real reachability, not only network adapter state.
 */
export async function verifyConnectivity(url = DEFAULT_HEALTHCHECK_URL) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return false;
  }

  if (REQUIRE_INTERNET_FOR_ONLINE_STATUS) {
    const internetOk = await verifyInternetReachability();
    if (!internetOk) {
      return false;
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONNECTIVITY_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function verifyInternetReachability(url = DEFAULT_INTERNET_CHECK_URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONNECTIVITY_TIMEOUT_MS);

  try {
    await fetch(url, {
      method: "GET",
      cache: "no-store",
      mode: "no-cors",
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export default verifyConnectivity;
