// frontend/src/components/orders/OrdersFilters.tsx

import { OrderFilters } from "@/pages/OrdersPage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, XIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { OrderStatus, OrderStatusEnum } from "@/schemas/orderSchema";

interface OrdersFiltersProps {
  filters: OrderFilters;
  setFilters: (filters: OrderFilters) => void;
  availableModalities: string[];
}

export function OrdersFilters({ filters, setFilters, availableModalities }: OrdersFiltersProps) {
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilters({ ...filters, [name]: value });
  };

  const handleModalityChange = (modality: string) => {
    const newModalities = filters.modalities.includes(modality)
      ? filters.modalities.filter((m: string) => m !== modality)
      : [...filters.modalities, modality];
    setFilters({ ...filters, modalities: newModalities });
  };

  const handleStatusChange = (status: OrderStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s: OrderStatus) => s !== status)
      : [...filters.statuses, status];
    setFilters({ ...filters, statuses: newStatuses });
  };
  
  const handleDateChange = (dateRange: { from?: Date; to?: Date }) => {
    setFilters({ 
      ...filters, 
      dateRange: { from: dateRange.from ?? undefined, to: dateRange.to ?? undefined }
    });
  };

  const clearFilters = () => {
    setFilters({
        search: "",
        modalities: [],
        statuses: [...OrderStatusEnum.options],
        dateRange: { from: undefined, to: undefined },
    });
  }

  const areFiltersActive = filters.search || filters.modalities.length > 0 || filters.statuses.length < OrderStatusEnum.options.length || filters.dateRange.from || filters.dateRange.to;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          placeholder="Search Patient, MRN, Accession, Sending/Receiving Facility..."
          name="search"
          value={filters.search}
          onChange={handleInputChange}
          className="md:col-span-2"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
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
      </div>
      
      <div className="space-y-2">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Modalities</h4>
          <div className="flex gap-2 flex-wrap mt-2 items-center">
            {availableModalities.map((modality) => (
              <Badge
                key={modality}
                variant={filters.modalities.includes(modality) ? "default" : "outline"}
                onClick={() => handleModalityChange(modality)}
                className="cursor-pointer"
              >
                {modality}
              </Badge>
            ))}
            {areFiltersActive && (
                <Button variant="ghost" onClick={clearFilters} size="sm" className="flex items-center">
                    <XIcon className="mr-2 h-4 w-4" />
                    Clear
                </Button>
            )}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Order Status</h4>
          <div className="flex gap-2 flex-wrap mt-2">
            {OrderStatusEnum.options.map((status: OrderStatus) => (
              <Badge
                key={status}
                variant={filters.statuses.includes(status) ? "default" : "outline"}
                onClick={() => handleStatusChange(status)}
                className="cursor-pointer"
              >
                {status}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}