import { cn } from "@/lib/utils";

/**
 * Three widths, named by what they hold. Every signed-in page picks one —
 * previously each page hand-rolled its own container and the app drifted to
 * six widths (1440/1280/1152/1120/1000/720) and five vertical paddings.
 *
 * Kept in its own module so `site-header` and `page-shell` can both read it
 * without importing each other.
 */
export const PAGE_WIDTHS = {
  /** Dense directories and admin tables that need every pixel. */
  wide: "max-w-[1440px]",
  /** Reading and workflow pages — profiles, match screens. */
  content: "max-w-6xl",
  /** Single-column forms. */
  form: "max-w-[720px]",
} as const;

export type PageWidth = keyof typeof PAGE_WIDTHS;

export const PAGE_GUTTER = "px-4 sm:px-6";

export function pageContainer(width: PageWidth, className?: string): string {
  return cn("mx-auto w-full", PAGE_WIDTHS[width], PAGE_GUTTER, className);
}
