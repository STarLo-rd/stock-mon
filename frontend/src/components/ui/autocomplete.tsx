import * as React from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Input } from "./input"
import { Badge } from "./badge"
import { TrendingUp, Building2, BarChart3, Loader2, Lock } from "lucide-react"

export interface AutocompleteOption {
  symbol: string;
  name?: string;
  type: 'INDEX' | 'STOCK' | 'MUTUAL_FUND';
  exchange: string;
  isAccessible?: boolean; // Whether user can access this symbol based on subscription
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
  const navigate = useNavigate();
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

    // Get accessible options only for navigation
    const accessibleOptions = options.filter(opt => opt.isAccessible !== false);
    const accessibleIndices = options
      .map((opt, idx) => ({ opt, idx }))
      .filter(({ opt }) => opt.isAccessible !== false)
      .map(({ idx }) => idx);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (accessibleIndices.length === 0) return;
        const currentAccessibleIdx = accessibleIndices.indexOf(focusedIndex);
        const nextAccessibleIdx = currentAccessibleIdx < accessibleIndices.length - 1 
          ? currentAccessibleIdx + 1 
          : currentAccessibleIdx;
        setFocusedIndex(accessibleIndices[nextAccessibleIdx]);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (accessibleIndices.length === 0) return;
        const currentAccessibleIdxUp = accessibleIndices.indexOf(focusedIndex);
        const prevAccessibleIdx = currentAccessibleIdxUp > 0 
          ? currentAccessibleIdxUp - 1 
          : -1;
        setFocusedIndex(prevAccessibleIdx >= 0 ? accessibleIndices[prevAccessibleIdx] : -1);
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          const option = options[focusedIndex];
          if (option.isAccessible !== false) {
            handleSelect(option);
          }
        }
        break;
      case "Escape":
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  const handleSelect = (option: AutocompleteOption) => {
    // Don't allow selection of locked/disabled options
    if (option.isAccessible === false) {
      return;
    }
    
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
            {options.map((option, index) => {
              const isLocked = option.isAccessible === false;
              return (
                <div
                  key={`${option.symbol}-${index}`}
                  className={cn(
                    "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                    isLocked
                      ? "cursor-default opacity-75 bg-muted/50"
                      : "cursor-pointer",
                    !isLocked && focusedIndex === index
                      ? "bg-accent text-accent-foreground"
                      : !isLocked && "hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => !isLocked && handleSelect(option)}
                  onMouseEnter={() => !isLocked && setFocusedIndex(index)}
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
                <div className="flex items-center gap-2">
                  {isLocked && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/upgrade');
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border border-yellow-200 dark:border-yellow-800 hover:from-yellow-100 hover:to-orange-100 dark:hover:from-yellow-900/40 dark:hover:to-orange-900/40 transition-all duration-200 group"
                      title={`Upgrade to unlock this ${option.type === 'MUTUAL_FUND' ? 'mutual fund' : option.type === 'INDEX' ? 'index' : 'stock'}`}
                    >
                      <Lock className="h-3 w-3 text-yellow-600 dark:text-yellow-400 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                        Upgrade
                      </span>
                    </button>
                  )}
                  <Badge variant={option.type === 'INDEX' ? 'default' : option.type === 'MUTUAL_FUND' ? 'outline' : 'secondary'} className="text-xs">
                    {option.type === 'MUTUAL_FUND' ? 'Mutual Fund' : option.type}
                  </Badge>
                </div>
              </div>
            );
          })}
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

