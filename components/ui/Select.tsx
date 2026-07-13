"use client";

import { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  name: string;
  options: Option[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  label?: string;
  error?: string;
  /** ไอคอนนำหน้า (lucide) */
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

// Dropdown ตาม DESIGN_SYSTEM.md — v2 polish: ทรงเดียวกับ Input (radius-sm, ring --line,
// shadow), เปิดด้วยอนิเมชัน dropdown-in, แถวตัวเลือก hover พื้น brand-soft + เช็คถูก
export function Select({
  name,
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = "เลือก...",
  required,
  label,
  error,
  icon,
  disabled,
  className,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const selectRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    setInternalValue(val);
    onChange?.(val);
    setIsOpen(false);
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <span id={labelId} className="text-body-sm font-medium text-ink">
          {label}
        </span>
      )}
      <div className="relative w-full" ref={selectRef}>
        {/* Hidden input สำหรับ submit ฟอร์ม native */}
        <input type="hidden" name={name} value={value} required={required} />

        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={label ? labelId : undefined}
          className={cn(
            "flex w-full items-center gap-2 rounded-sm bg-surface px-4 py-2.5 text-left",
            "text-body text-ink shadow-sm outline-none transition-all duration-fast",
            "ring-1 ring-inset ring-line hover:ring-brand/40",
            "disabled:cursor-not-allowed disabled:opacity-60",
            isOpen ? "ring-2 ring-brand shadow-md" : "",
            error ? "ring-2 ring-danger" : "",
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          {icon && (
            <span className="shrink-0 text-ink-soft [&>svg]:h-[18px] [&>svg]:w-[18px]">
              {icon}
            </span>
          )}
          <span className={cn("block flex-1 truncate", !selectedOption && "text-ink-soft")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "h-5 w-5 shrink-0 text-ink-soft transition-transform duration-fast",
              isOpen && "rotate-180",
            )}
          />
        </button>

        {isOpen && (
          <div
            role="listbox"
            className="animate-dropdown-in absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-md bg-surface p-1.5 shadow-lg ring-1 ring-line"
          >
            {options.map((option) => {
              const active = value === option.value;
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={active}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center gap-2 rounded-sm py-2 pl-9 pr-3 text-body-sm transition-colors duration-fast",
                    active
                      ? "bg-brand-soft font-medium text-brand"
                      : "text-ink hover:bg-brand-soft/60",
                  )}
                  onClick={() => handleSelect(option.value)}
                >
                  {active && (
                    <Check
                      aria-hidden
                      className="absolute left-2.5 h-4 w-4 text-brand"
                    />
                  )}
                  <span className="block truncate">{option.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {error && <p className="text-body-sm text-danger">{error}</p>}
    </div>
  );
}
