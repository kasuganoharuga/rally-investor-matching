import * as React from "react";

import { cn } from "@/lib/utils";
import { DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

/**
 * Shared sizing/spacing for the header's two dropdowns (SiteHeader's
 * "Management" nav group and AccountMenu). Centralized here so the two
 * stay visually consistent — same width, offset from the trigger, and
 * item padding — without repeating the same Tailwind classes in both
 * components.
 */
export function NavDropdownContent({
  className,
  sideOffset = 10,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      sideOffset={sideOffset}
      className={cn("w-48 space-y-0.5 p-1.5", className)}
      {...props}
    />
  );
}

export function NavDropdownItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuItem>) {
  return (
    <DropdownMenuItem
      className={cn("whitespace-nowrap py-1.5", className)}
      {...props}
    />
  );
}
