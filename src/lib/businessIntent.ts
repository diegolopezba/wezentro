const KEY = "zentro_business_intent";
/** The intent only survives while the user keeps moving through the flow. */
const MAX_AGE_MS = 30 * 60 * 1000;

const store = (): Storage | null => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

/** Flags that the current signup came from the "Soy empresa" flow. */
export const setBusinessIntent = () => {
  try {
    store()?.setItem(KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
};

/** Refreshes the timestamp when the user advances a step in the flow. */
export const touchBusinessIntent = () => {
  if (hasBusinessIntent()) setBusinessIntent();
};

export const hasBusinessIntent = (): boolean => {
  try {
    const raw = store()?.getItem(KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts) || Date.now() - ts > MAX_AGE_MS) {
      clearBusinessIntent();
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

/** Reads and clears the flag. */
export const takeBusinessIntent = (): boolean => {
  const v = hasBusinessIntent();
  clearBusinessIntent();
  return v;
};

export const clearBusinessIntent = () => {
  try {
    store()?.removeItem(KEY);
    // Legacy persistent flag from the previous implementation.
    window.localStorage?.removeItem(KEY);
  } catch {
    /* ignore */
  }
};
