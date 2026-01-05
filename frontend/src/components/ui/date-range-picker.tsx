import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  className,
}) => {
  const [dateRange, setDateRange] = React.useState<DateRange>(
    value || { from: undefined, to: undefined }
  );

  React.useEffect(() => {
    if (value) {
      setDateRange(value);
    }
  }, [value]);

  const handlePreset = (preset: string) => {
    const today = new Date();
    let from: Date | undefined;
    let to: Date | undefined = today;

    switch (preset) {
      case 'today':
        from = new Date(today);
        from.setHours(0, 0, 0, 0);
        to = new Date(today);
        to.setHours(23, 59, 59, 999);
        break;
      case 'last7':
        from = new Date(today);
        from.setDate(from.getDate() - 7);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'last30':
        from = new Date(today);
        from.setDate(from.getDate() - 30);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'thisMonth':
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'lastMonth':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        from = lastMonth;
        from.setHours(0, 0, 0, 0);
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        to.setHours(23, 59, 59, 999);
        break;
      case 'clear':
        from = undefined;
        to = undefined;
        break;
      default:
        return;
    }

    const newRange = { from, to };
    setDateRange(newRange);
    onChange?.(newRange);
  };

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : undefined;
    if (date) {
      date.setHours(0, 0, 0, 0);
    }
    const newRange = { ...dateRange, from: date };
    setDateRange(newRange);
    onChange?.(newRange);
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : undefined;
    if (date) {
      date.setHours(23, 59, 59, 999);
    }
    const newRange = { ...dateRange, to: date };
    setDateRange(newRange);
    onChange?.(newRange);
  };

  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Select onValueChange={handlePreset}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Quick select date range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="last7">Last 7 days</SelectItem>
          <SelectItem value="last30">Last 30 days</SelectItem>
          <SelectItem value="thisMonth">This month</SelectItem>
          <SelectItem value="lastMonth">Last month</SelectItem>
          <SelectItem value="clear">Clear selection</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label htmlFor="from-date" className="text-xs text-muted-foreground mb-1 block">
            From
          </Label>
          <div className="relative">
            <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="from-date"
              type="date"
              value={formatDateForInput(dateRange.from)}
              onChange={handleFromDateChange}
              className="pl-8"
            />
          </div>
        </div>
        <div className="flex-1">
          <Label htmlFor="to-date" className="text-xs text-muted-foreground mb-1 block">
            To
          </Label>
          <div className="relative">
            <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="to-date"
              type="date"
              value={formatDateForInput(dateRange.to)}
              onChange={handleToDateChange}
              className="pl-8"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

