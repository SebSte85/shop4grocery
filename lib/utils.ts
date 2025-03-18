import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names with tailwind-merge
 * @param inputs - Class values to be merged
 * @returns Merged class string
 */
export function cn(...inputs: (string | undefined | null | false | Record<string, boolean>)[]) {
  return twMerge(clsx(inputs));
} 