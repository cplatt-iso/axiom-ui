// frontend/src/components/orders/OrdersFilters.tsx

import { OrderFilters } from "@/pages/OrdersPage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, XIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Hardcoding modalities for now. Sue me.
// A real app would fetch this from a '/api/v1/modalities' endpoint.
// But we're not building a real app, we're building THIS app.
const MODALITIES = ["CT", "MR", "US", "XA", "CR", "OT"];

interface OrdersFiltersProps {
  filters: OrderFilters;
  setFilters: (filters: OrderFilters) => void;
}

export function OrdersFilters({ filters, setFilters }: OrdersFiltersProps) {
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, search: event.target.value });
  };

  const handleModalityChange = (modality: string) => {
    const newModalities = filters.modalities.includes(modality)
      ? filters.modalities.filter((m) => m !== modality)
      : [...filters.modalities, modality];
    setFilters({ ...filters, modalities: newModalities });
  };
  
  const handleDateChange = (dateRange: { from?: Date; to?: Date }) => {
    setFilters({ 
      ...filters, 
      dateRange: { from: dateRange.from ?? undefined, to: dateRange.to ?? undefined } // ensure both keys exist
    });
  };

  const clearFilters = () => {
    setFilters({
        search: "",
        modalities: [],
        dateRange: { from: undefined, to: undefined }, // ensure both keys exist
    });
  }

  const areFiltersActive = filters.search || filters.modalities.length > 0 || filters.dateRange.from || filters.dateRange.to;

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center">
      {/* Search Input */}
      <div className="flex-grow w-full md:w-auto">
        <Input
          placeholder="Search by Patient, MRN, or Accession..."
          value={filters.search}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
      </div>

      {/* Modality "Multi-Select" using Badges. It's chic. */}
      <div className="flex gap-2 flex-wrap">
        {MODALITIES.map((modality) => (
          <Badge
            key={modality}
            variant={filters.modalities.includes(modality) ? "default" : "outline"}
            onClick={() => handleModalityChange(modality)}
            className="cursor-pointer"
          >
            {modality}
          </Badge>
        ))}
      </div>

      {/* Date Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full md:w-[280px] justify-start text-left font-normal",
              !filters.dateRange.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateRange.from ? (
              filters.dateRange.to ? (
                <>
                  {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                  {format(filters.dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(filters.dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
              mode="range"
              selected={{
                from: filters.dateRange.from ?? undefined,
                to: filters.dateRange.to ?? undefined,
              }}
              onSelect={(range) => handleDateChange(range || { from: undefined, to: undefined })}
              initialFocus
            />
        </PopoverContent>
      </Popover>

      {/* Clear Button - only shows if filters are active */}
      {areFiltersActive && (
        <Button variant="ghost" onClick={clearFilters}>
            <XIcon className="mr-2 h-4 w-4" />
            Clear
        </Button>
      )}
    </div>
  );
}