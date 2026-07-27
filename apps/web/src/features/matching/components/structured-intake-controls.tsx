"use client";

import { Check, ChevronDown, X } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { IntakeOption } from "@/features/matching/types/structured-intake";
import { cn } from "@/lib/utils";

function FieldLabel({
  htmlFor,
  label,
  required,
}: {
  htmlFor?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
      {label}
      {required ? (
        <span className="ml-1 text-destructive" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}

export function SelectField({
  id,
  label,
  value,
  placeholder = "Select an option",
  options,
  required,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  options: IntakeOption[];
  required?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <FieldLabel htmlFor={id} label={label} required={required} />
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-11 w-full appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export function MultiSelectField({
  label,
  placeholder,
  options,
  selected,
  maxSelected,
  required,
  disabled,
  emptyMessage,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: IntakeOption[];
  selected: string[];
  maxSelected: number;
  required?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
  onChange: (values: string[]) => void;
}) {
  const selectedOptions = selected
    .map((value) => options.find((option) => option.value === value))
    .filter((option): option is IntakeOption => Boolean(option));
  const atLimit = selected.length >= maxSelected;

  function toggle(value: string, checked: boolean) {
    if (checked) {
      if (!selected.includes(value) && !atLimit) {
        onChange([...selected, value]);
      }
      return;
    }
    onChange(selected.filter((item) => item !== value));
  }

  return (
    <div className="grid gap-2">
      <FieldLabel label={label} required={required} />
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-3 rounded-md border border-input bg-background px-3 text-left text-sm shadow-xs outline-none transition",
            "hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <span
            className={cn("truncate", selected.length === 0 && "text-muted-foreground")}
          >
            {selected.length > 0
              ? `${selected.length} selected`
              : disabled && emptyMessage
                ? emptyMessage
                : placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-72 min-w-72">
          {options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={isSelected}
                disabled={!isSelected && atLimit}
                onCheckedChange={(checked) => toggle(option.value, checked === true)}
                className="py-2"
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedOptions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-foreground"
            >
              <Check className="size-3 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">{option.label}</span>
              <button
                type="button"
                onClick={() =>
                  onChange(selected.filter((value) => value !== option.value))
                }
                className="rounded-full text-muted-foreground transition hover:text-destructive"
                aria-label={`Remove ${option.label}`}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">Select up to {maxSelected}.</p>
    </div>
  );
}
