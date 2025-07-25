// frontend/src/pages/OrdersPage.tsx

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PaginationState } from "@tanstack/react-table";
import { fetchEventSource } from "@microsoft/fetch-event-source";

import { getOrders } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { OrdersFilters } from "@/components/orders/OrdersFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatus, OrderStatusEnum, ImagingOrder, OrdersApiResponse } from "@/schemas/orderSchema";

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
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
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

  const queryKey = useMemo(() => [
    "orders",
    pageIndex,
    pageSize,
    filters.search,
    filters.modalities,
    filters.statuses,
    filters.dateRange,
  ], [pageIndex, pageSize, filters]);

  const { data, isLoading, error } = useQuery<OrdersApiResponse>({
    queryKey,
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
  });

  useEffect(() => {
    const controller = new AbortController();
    const token = getToken();

    if (!token) {
      console.error("SSE connection requires a token, none found.");
      return;
    }

    fetchEventSource("/api/v1/orders/events", {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream', // Explicitly set the Accept header
      },
      onopen: async (response) => {
        if (response.ok) {
          console.log("SSE connection established.");
        } else {
          console.error(`SSE connection failed with status ${response.status}.`);
          controller.abort(); // Stop trying if there's an auth error etc.
        }
      },
      onmessage: (event) => {
        if (event.event === "order_created") {
          const newOrder: ImagingOrder = JSON.parse(event.data);
          console.log("SSE: order_created received", newOrder);
          queryClient.invalidateQueries({ queryKey: ["orders"] });
        } else if (event.event === "order_updated") {
          const updatedOrder: ImagingOrder = JSON.parse(event.data);
          console.log("SSE: order_updated received", updatedOrder);
          queryClient.setQueryData(queryKey, (oldData: OrdersApiResponse | undefined) => {
            if (!oldData) return oldData;
            const itemIndex = oldData.items.findIndex((item) => item.id === updatedOrder.id);
            if (itemIndex !== -1) {
              const newItems = [...oldData.items];
              newItems[itemIndex] = updatedOrder;
              return { ...oldData, items: newItems };
            }
            return oldData;
          });
        } else if (event.event === "order_deleted") {
          const deletedOrder: { id: number } = JSON.parse(event.data);
          console.log("SSE: order_deleted received", deletedOrder);
          queryClient.invalidateQueries({ queryKey: ["orders"] });
        }
      },
      onerror: (error) => {
        console.error("EventSource failed:", error);
        // The library handles reconnection automatically, but we'll abort if a fatal error occurs.
        // This prevents constant retries on auth failures.
        throw error;
      },
    });

    return () => {
      console.log("Closing SSE connection.");
      controller.abort();
    };
  }, [queryClient, getToken, queryKey]);

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