/**
 * Production-safe logger that suppresses logs in production builds.
 * Use this instead of console.log throughout the codebase.
 */
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
};

// Suppress all console.log in production
if (!isDev) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
}
