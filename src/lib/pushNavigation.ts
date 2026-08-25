/**
 * Bridge between a native push-notification tap and React Router.
 *
 * A OneSignal notification click can fire before the router has mounted
 * (cold start), so the target path is queued here and consumed by
 * `usePushNavigation` as soon as a navigator is available.
 */

let pendingPath: string | null = null;
let listener: ((path: string) => void) | null = null;

/** Turn a payload url/route into an in-app path, or null if not routable. */
export const toAppPath = (raw?: string | null): string | null => {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;

  if (value.startsWith("/")) return value;

  try {
    const url = new URL(value);
    // zentro:// deep links carry the path in host + pathname
    if (url.protocol === "zentro:") {
      const host = url.host ? `/${url.host}` : "";
      return `${host}${url.pathname}${url.search}` || "/";
    }
    return `${url.pathname}${url.search}` || "/";
  } catch {
    return null;
  }
};

/** Called from the OneSignal click handler. */
export const queuePushNavigation = (raw?: string | null) => {
  const path = toAppPath(raw);
  if (!path) return;
  if (listener) listener(path);
  else pendingPath = path;
};

/** Called by usePushNavigation once the router is ready. */
export const setPushNavigationListener = (fn: ((path: string) => void) | null) => {
  listener = fn;
  if (fn && pendingPath) {
    const path = pendingPath;
    pendingPath = null;
    fn(path);
  }
};
