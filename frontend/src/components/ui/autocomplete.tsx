import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "./input"
import { Badge } from "./badge"
import { TrendingUp, Building2, BarChart3, Loader2 } from "lucide-react"

export interface AutocompleteOption {
  symbol: string;
  name?: string;
  type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND';
  exchange: string;
}

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (option: AutocompleteOption) => void;
  options: AutocompleteOption[];
  loading?: boolean;
  placeholder?: string;
  className?: string;
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  options,
  loading = false,
  placeholder = "Search symbols...",
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Show dropdown when there are options and value is not empty
  React.useEffect(() => {
    setIsOpen(options.length > 0 && value.length >= 2);
  }, [options, value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || options.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < options.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          handleSelect(options[focusedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  const handleSelect = (option: AutocompleteOption) => {
    // For mutual funds, show the name in the input instead of the scheme code
    const displayValue = option.type === 'MUTUAL_FUND' && option.name 
      ? option.name 
      : option.symbol;
    onChange(displayValue);
    onSelect(option);
    setIsOpen(false);
    setFocusedIndex(-1);
    inputRef.current?.blur();
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-900">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase());
            setFocusedIndex(-1);
          }}
          onFocus={() => {
            if (options.length > 0 && value.length >= 2) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {isOpen && options.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="max-h-60 overflow-auto p-1">
            {options.map((option, index) => (
              <div
                key={`${option.symbol}-${index}`}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                  focusedIndex === index
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                {option.type === 'INDEX' ? (
                  <TrendingUp className="h-4 w-4 text-blue-500 flex-shrink-0" />
                ) : option.type === 'MUTUAL_FUND' ? (
                  <BarChart3 className="h-4 w-4 text-purple-500 flex-shrink-0" />
                ) : (
                  <Building2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {option.type === 'MUTUAL_FUND' && option.name ? (
                    <>
                      <div className="font-medium">
                        {highlightMatch(option.name, value)}
                      </div>
                      <div className="text-xs text-muted-foreground truncate font-mono">
                        Scheme Code: {option.symbol}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-medium">
                        {highlightMatch(option.symbol, value)}
                      </div>
                      {option.name && (
                        <div className="text-xs text-muted-foreground truncate">
                          {option.name}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <Badge variant={option.type === 'INDEX' ? 'default' : option.type === 'MUTUAL_FUND' ? 'outline' : 'secondary'} className="text-xs">
                  {option.type === 'MUTUAL_FUND' ? 'Mutual Fund' : option.type}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {isOpen && !loading && options.length === 0 && value.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md p-3 text-sm text-muted-foreground text-center">
          No symbols found
        </div>
      )}
    </div>
  );
};

