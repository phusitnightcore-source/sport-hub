"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

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
}

export function Select({
  name,
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = "เลือก...",
  required,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const selectRef = useRef<HTMLDivElement>(null);

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
    <div className="relative w-full" ref={selectRef}>
      {/* Hidden input for native form submission */}
      <input type="hidden" name={name} value={value} required={required} />

      <button
        type="button"
        className={`flex w-full items-center justify-between rounded-md border bg-surface px-4 py-2.5 text-left text-body-sm outline-none transition-all focus:ring-2 focus:ring-brand ${
          isOpen ? "border-brand ring-2 ring-brand" : "border-line"
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`block truncate ${!selectedOption ? "text-ink-soft" : "text-ink"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-ink-soft transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-line bg-surface p-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {options.map((option) => (
            <div
              key={option.value}
              className={`relative cursor-pointer select-none rounded-sm py-2 pl-10 pr-4 text-body-sm transition-colors hover:bg-brand-soft hover:text-brand ${
                value === option.value ? "bg-brand-soft font-medium text-brand" : "text-ink"
              }`}
              onClick={() => handleSelect(option.value)}
            >
              <span className="block truncate">{option.label}</span>
              {value === option.value ? (
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-brand">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
