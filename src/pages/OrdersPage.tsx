// frontend/src/pages/OrdersPage.tsx

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PaginationState } from "@tanstack/react-table"; // Removed unused ColumnFiltersState

import { getOrders } from "@/services/api";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { OrdersFilters } from "@/components/orders/OrdersFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Let's define the shape of our filter state right here.
// It's cleaner than a bunch of loose useStates.
export interface OrderFilters {
  search: string;
  modalities: string[];
  // --- THIS IS THE FIX ---
  // The keys themselves are optional to match react-day-picker's DateRange type.
  // My previous version was a beautiful lie. This is the ugly truth.
  dateRange: {
    from?: Date;
    to?: Date;
  };
}

export function OrdersPage() {
  // --- STATE MANAGEMENT ---
  // We need to manage the state of our table and filters.
  // Pagination state for TanStack Table
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25, // Let's not be monsters, 25 is a sane default.
  });

  // Filter state for our custom filter components
  const [filters, setFilters] = useState<OrderFilters>({
    search: "",
    modalities: [],
    dateRange: { from: undefined, to: undefined }, // This initialization is still fine
  });

  // --- DATA FETCHING ---
  // Here's the magic of TanStack Query. It handles caching, loading, errors... all the boring shit.
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "orders",
      pageIndex,
      pageSize,
      filters.search,
      filters.modalities,
      filters.dateRange,
    ],
    queryFn: () =>
      getOrders({
        pageIndex,
        pageSize,
        search: filters.search,
        modalities: filters.modalities,
        dateRange: filters.dateRange,
      }),
    placeholderData: (prev) => prev, // Use previous data for smooth pagination
  });

  // --- RENDER LOGIC ---
  // What to do if the API shits the bed.
  if (error) {
    return (
      <div className="text-red-500 p-4">
        FUCK. Something broke. Error: {(error as Error).message}
      </div>
    );
  }

  // A nice, clean layout. Card, title, filters, then the table.
  // It's so simple even a manager could understand it.
  return (
    <div className="h-full w-full p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Imaging Worklist</CardTitle>
          <p className="text-muted-foreground">
            Browse, search, and filter incoming imaging orders.
          </p>
        </CardHeader>
        <CardContent>
          <OrdersFilters filters={filters} setFilters={setFilters} />
          <div className="mt-4">
            {isLoading && !data ? (
              // Show some sexy skeletons while the data is loading on the first pass.
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              // Once we have data, we render the real table.
              <OrdersTable
                data={data?.items ?? []}
                pageCount={data ? Math.ceil(data.total / pageSize) : 0}
                pagination={{ pageIndex, pageSize }}
                setPagination={setPagination}
                isLoading={isLoading} // Pass loading state to show overlays/spinners in the table
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}