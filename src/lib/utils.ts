import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Abbreviates large numbers: 1200 → "1.2K" */
export function formatCount(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return count.toString();
}
