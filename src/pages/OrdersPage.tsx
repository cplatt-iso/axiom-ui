// frontend/src/pages/OrdersPage.tsx

import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { PaginationState } from "@tanstack/react-table"; // Removed unused ColumnFiltersState

import { getOrders } from "@/services/api";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { OrdersFilters } from "@/components/orders/OrdersFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatus, OrderStatusEnum } from "@/schemas/orderSchema";

export interface OrderFilters {
  search: string;
  modalities: string[];
  statuses: OrderStatus[];
  dateRange: {
    from?: Date;
    to?: Date;
  };
}

export function OrdersPage() {
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25, // Let's not be monsters, 25 is a sane default.
  });

  const [filters, setFilters] = useState<OrderFilters>({
    search: "",
    modalities: [],
    statuses: [...OrderStatusEnum.options], // Default to all statuses
    dateRange: { from: undefined, to: undefined }, // This initialization is still fine
  });

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "orders",
      pageIndex,
      pageSize,
      filters.search,
      filters.modalities,
      filters.statuses,
      filters.dateRange,
    ],
    queryFn: () =>
      getOrders({
        pageIndex,
        pageSize,
        search: filters.search,
        modalities: filters.modalities,
        statuses: filters.statuses,
        dateRange: filters.dateRange,
      }),
    placeholderData: (prev) => prev, // Use previous data for smooth pagination
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const allModalitiesRef = useRef<string[]>([]);

  const availableModalities = useMemo(() => {
    const newModalities = new Set<string>(allModalitiesRef.current);
    (data?.items ?? []).forEach((order) => {
      if (order.modality) newModalities.add(order.modality);
    });
    const sortedModalities = Array.from(newModalities).sort();
    allModalitiesRef.current = sortedModalities;
    return sortedModalities;
  }, [data]);

  // --- RENDER LOGIC ---
  // What to do if the API shits the bed.
  if (error) {
    return (
      <div className="text-red-500 p-4">
        Error: {(error as Error).message}
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
          <OrdersFilters
            filters={filters}
            setFilters={setFilters}
            availableModalities={availableModalities}
          />
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