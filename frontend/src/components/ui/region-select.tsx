"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RUSSIAN_REGIONS } from "@/constants/regions";
import { cn } from "@/lib/utils";

/** Sentinel для «регион не выбран» в optional-режиме (совместимо с существующими формами). */
export const REGION_NONE_VALUE = "__none__";

export type RegionSelectProps = {
  id?: string;
  label?: ReactNode;
  value: string;
  onValueChange: (region: string) => void;
  /** Разрешить «Не указан» → onValueChange(""). */
  optional?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
};

/**
 * Единый выбор региона из справочника {@link RUSSIAN_REGIONS}.
 * Если в `value` строка не из списка (старые данные), показывается отдельным пунктом.
 */
export function RegionSelect({
  id,
  label,
  value,
  onValueChange,
  optional = false,
  placeholder = "Выберите регион России",
  className,
  triggerClassName,
  disabled,
}: RegionSelectProps) {
  const unknownInList = Boolean(value && !RUSSIAN_REGIONS.includes(value));
  const selectValue = optional ? (value.trim() ? value : REGION_NONE_VALUE) : value;

  return (
    <div className={className}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (optional && v === REGION_NONE_VALUE) onValueChange("");
          else onValueChange(v);
        }}
        disabled={disabled}
      >
        <SelectTrigger id={id} className={cn("w-full", label && "mt-1", triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-[min(16rem,50vh)]" position="popper">
          {optional ? <SelectItem value={REGION_NONE_VALUE}>Не указан</SelectItem> : null}
          {unknownInList ? (
            <SelectItem value={value}>{value} (вне справочника)</SelectItem>
          ) : null}
          {RUSSIAN_REGIONS.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
