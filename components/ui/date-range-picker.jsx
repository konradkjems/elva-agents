import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

export function DateRangePicker({ 
  dateRange, 
  onDateRangeChange, 
  className,
  placeholder = "Pick a date range" 
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (range) => {
    if (range?.from && range?.to) {
      onDateRangeChange(range);
      setIsOpen(false);
    } else if (range?.from) {
      onDateRangeChange(range);
    }
  };

  const formatDateRange = (range) => {
    if (!range?.from) return placeholder;
    if (!range.to) return format(range.from, 'LLL dd, y');
    return `${format(range.from, 'LLL dd, y')} - ${format(range.to, 'LLL dd, y')}`;
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(dateRange)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
