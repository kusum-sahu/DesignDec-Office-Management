import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, Sparkles, X, Plus } from "lucide-react";
import { ITEM_TYPES } from "../../constants/status";
import { cn } from "../../utils/cn";

export function ItemTypeSelect({
  value = "",
  onChange,
  error,
  label = "Project / Item Type",
  required = true,
  disabled = false,
  className = "",
  helperText,
}) {
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const customInputRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Determine if current value is one of predefined types or custom
  const isPredefined = useMemo(() => {
    return ITEM_TYPES.includes(value);
  }, [value]);

  const [isOtherMode, setIsOtherMode] = useState(() => {
    return Boolean(value && !ITEM_TYPES.includes(value));
  });

  const [customValue, setCustomValue] = useState(() => {
    return value && !ITEM_TYPES.includes(value) ? value : "";
  });

  // Synchronize when external value changes
  useEffect(() => {
    if (value) {
      if (ITEM_TYPES.includes(value)) {
        setIsOtherMode(false);
      } else {
        setIsOtherMode(true);
        setCustomValue(value);
      }
    } else {
      setIsOtherMode(false);
      setCustomValue("");
    }
  }, [value]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filtered predefined item types based on search
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ITEM_TYPES;
    return ITEM_TYPES.filter((item) => item.toLowerCase().includes(q));
  }, [searchQuery]);

  const hasExactMatch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ITEM_TYPES.some((item) => item.toLowerCase() === q);
  }, [searchQuery]);

  const handleSelectPredefined = (item) => {
    setIsOtherMode(false);
    setCustomValue("");
    setSearchQuery("");
    setIsOpen(false);
    if (onChange) onChange(item);
  };

  const handleSelectOther = () => {
    setIsOtherMode(true);
    // If user typed something in search that is not an existing item, prefill it
    const trimmed = searchQuery.trim();
    const initialVal = trimmed && !hasExactMatch ? trimmed : customValue || "";
    setCustomValue(initialVal);
    setSearchQuery("");
    setIsOpen(false);
    if (onChange) onChange(initialVal);

    setTimeout(() => {
      customInputRef.current?.focus();
    }, 60);
  };

  const handleCustomInputChange = (e) => {
    const newVal = e.target.value;
    setCustomValue(newVal);
    if (onChange) onChange(newVal);
  };

  return (
    <div ref={containerRef} className={cn("w-full space-y-2 text-left", className)}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-1 text-rose-500">*</span>}
        </label>
      )}

      {/* Select Dropdown Trigger Button */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "w-full flex items-center justify-between rounded-lg border bg-white px-3.5 py-2.5 text-left text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer shadow-xs",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-200"
              : isOpen
              ? "border-rose-500 ring-2 ring-rose-200"
              : "border-slate-300 hover:border-slate-400"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {isOtherMode ? (
              <span className="flex items-center gap-1.5 font-medium text-slate-900 truncate">
                <span className="px-1.5 py-0.5 rounded text-[10.5px] font-bold bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                  Custom
                </span>
                <span className="truncate">
                  {customValue.trim() ? customValue : "Other (Enter custom product name)"}
                </span>
              </span>
            ) : isPredefined ? (
              <span className="font-medium text-slate-900 truncate">{value}</span>
            ) : (
              <span className="text-slate-400">Select or search item type...</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 shrink-0 ml-2">
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-150",
                isOpen && "rotate-180 text-rose-500"
              )}
            />
          </div>
        </button>

        {/* Dropdown Floating Popover */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
            {/* Search Input Bar */}
            <div className="p-2 border-b border-slate-100 bg-slate-50/70">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Type to search or enter new item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-50">
              {filteredItems.length > 0 ? (
                <div className="py-0.5">
                  {filteredItems.map((item) => {
                    const isSelected = !isOtherMode && value === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleSelectPredefined(item)}
                        className={cn(
                          "w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors cursor-pointer",
                          isSelected
                            ? "bg-rose-50 font-bold text-rose-700"
                            : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                        )}
                      >
                        <span>{item}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-rose-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-slate-500">
                  No predefined item type matches &ldquo;{searchQuery}&rdquo;
                </div>
              )}

              {/* Other Option (Always accessible, prominently highlighted when searching) */}
              <div className="p-1 bg-slate-50/50">
                <button
                  type="button"
                  onClick={handleSelectOther}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all cursor-pointer border",
                    isOtherMode
                      ? "bg-rose-100/70 text-rose-800 border-rose-300 shadow-2xs"
                      : "bg-white text-slate-700 border-dashed border-slate-300 hover:border-rose-400 hover:text-rose-700 hover:bg-rose-50/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-rose-100 text-rose-600">
                      {searchQuery.trim() && !hasExactMatch ? (
                        <Plus className="h-3 w-3" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-bold">
                        {searchQuery.trim() && !hasExactMatch
                          ? `Other: Use "${searchQuery.trim()}"`
                          : "Other (Custom Item Type)"}
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        Click to enter any new product or service name
                      </div>
                    </div>
                  </div>

                  {isOtherMode && <Check className="h-3.5 w-3.5 text-rose-600 shrink-0" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Required Custom Item Type Input when Other is selected */}
      {isOtherMode && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 space-y-1.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800">
              Custom Product / Item Name
              <span className="ml-1 text-rose-600">*</span>
            </label>
            <span className="text-[10px] font-semibold text-rose-600 bg-rose-100/80 px-1.5 py-0.5 rounded">
              Required for Other
            </span>
          </div>

          <input
            ref={customInputRef}
            type="text"
            required
            disabled={disabled}
            placeholder="e.g. Silicone LED Signage, Customized Mug Printing"
            value={customValue}
            onChange={handleCustomInputChange}
            className={cn(
              "w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 shadow-2xs",
              error || (isOtherMode && !customValue.trim())
                ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                : "border-slate-300 hover:border-slate-400 focus:border-rose-500 focus:ring-rose-200"
            )}
          />

          <p className="text-[10.5px] text-slate-500 leading-tight">
            Specify the custom item name. This will be saved as the official item type on this order.
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-xs font-medium text-red-600">{error}</p>
      )}

      {!error && helperText && (
        <p className="text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  );
}

export default ItemTypeSelect;
