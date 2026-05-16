/**
 * Utility: className merger using clsx + tailwind-merge.
 * Used by the CrossSection component and other UI components.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
