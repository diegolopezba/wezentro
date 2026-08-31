const KEY = "zentro_business_intent";

/** Flags that the current signup came from the "Soy empresa" flow. */
export const setBusinessIntent = () => {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
};

export const hasBusinessIntent = (): boolean => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/** Reads and clears the flag. */
export const takeBusinessIntent = (): boolean => {
  const v = hasBusinessIntent();
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return v;
};

export const clearBusinessIntent = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};
