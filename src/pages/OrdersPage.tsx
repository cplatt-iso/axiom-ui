// frontend/src/pages/OrdersPage.tsx

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { PaginationState } from "@tanstack/react-table";
import { fetchEventSource } from "@microsoft/fetch-event-source";

import { getOrders, deleteAllOrders } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { OrdersFilters } from "@/components/orders/OrdersFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "lucide-react";
import { toast } from "sonner";
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
  const { getToken, isSuperUser } = useAuth();
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25, // Let's not be monsters, 25 is a sane default.
  });

  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const [filters, setFilters] = useState<OrderFilters>({
    search: "",
    modalities: [],
    statuses: [...OrderStatusEnum.options], // Default to all statuses
    dateRange: { from: undefined, to: undefined }, // This initialization is still fine
  });

  const deleteAllMutation = useMutation({
    mutationFn: deleteAllOrders,
    onMutate: () => {
      // Show a loading toast when starting
      toast.info("Starting to delete all orders...");
    },
    onSuccess: () => {
      toast.success("All orders deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowDeleteAllConfirm(false);
    },
    onError: (error: unknown) => {
      console.error("Delete all orders error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to delete all orders: ${errorMessage}`);
    },
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
    // SSE for real-time updates
    const SSE_ENABLED = true; 
    
    if (!SSE_ENABLED) {
      console.log("SSE disabled - Real-time updates not available. Backend needs to implement /api/v1/orders/events endpoint without conflicting with /api/v1/orders/{order_id}");
      return;
    }

    const controller = new AbortController();
    const token = getToken();

    if (!token) {
      console.error("SSE connection requires a token, none found.");
      return () => controller.abort();
    }

    console.log("SSE: Attempting to connect to /api/v1/orders/events");
    
    let connected = false;
    
    fetchEventSource("/api/v1/orders/events", {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      onopen: async (response) => {
        if (response.ok) {
          console.log("✅ SSE connection established successfully.");
          connected = true;
          connected = true;
        } else {
          console.error(`❌ SSE connection failed with status ${response.status}.`);
          connected = false;
          // Try to get more error details
          try {
            const errorText = await response.text();
            console.error("SSE error response body:", errorText);
          } catch {
            console.error("Could not read error response body");
          }
          controller.abort();
        }
      },
      onmessage: (event) => {
        console.log(`📡 SSE: Received event type: ${event.event}`, event.data);
        if (event.event === "order_created") {
          const newOrder: ImagingOrder = JSON.parse(event.data);
          console.log("🆕 SSE: order_created received", newOrder);
          queryClient.invalidateQueries({ queryKey: ["orders"] });
        } else if (event.event === "order_updated") {
          const updatedOrder: ImagingOrder = JSON.parse(event.data);
          console.log("🔄 SSE: order_updated received", updatedOrder);
          queryClient.invalidateQueries({ queryKey: ["orders"] });
        } else if (event.event === "order_deleted") {
          const deletedOrder: { id: number } = JSON.parse(event.data);
          console.log("🗑️ SSE: order_deleted received", deletedOrder);
          queryClient.invalidateQueries({ queryKey: ["orders"] });
        } else {
          console.log(`❓ SSE: Unknown event type: ${event.event}`);
        }
      },
      onerror: (error) => {
        console.error("💥 EventSource failed:", error);
        console.error("SSE Error details:", {
          error: error,
          timestamp: new Date().toISOString(),
          url: "/api/v1/orders/events",
          connected: connected
        });
        connected = false;
        // Don't throw to allow reconnection attempts
      },
    });

    return () => {
      console.log("🔌 Cleaning up SSE connection.");
      controller.abort();
    };
  }, [queryClient, getToken]);

  // Fallback polling mechanism if SSE fails
  useEffect(() => {
    const POLLING_INTERVAL = 30000; // Poll every 30 seconds as fallback
    
    console.log(`⏰ Setting up fallback polling every ${POLLING_INTERVAL/1000} seconds`);
    
    const pollForUpdates = setInterval(() => {
      console.log("🔄 Fallback polling: Refreshing orders data");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }, POLLING_INTERVAL);

    return () => {
      console.log("⏰ Cleaning up fallback polling");
      clearInterval(pollForUpdates);
    };
  }, [queryClient]);

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
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Imaging Worklist</CardTitle>
              <p className="text-muted-foreground">
                Browse, search, and filter incoming imaging orders.
              </p>
            </div>
            {isSuperUser() && (
              <div className="flex space-x-2">
                {showDeleteAllConfirm ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowDeleteAllConfirm(false)}
                      disabled={deleteAllMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deleteAllMutation.mutate()}
                      disabled={deleteAllMutation.isPending}
                    >
                      {deleteAllMutation.isPending ? 'Deleting All Orders...' : 'Confirm Delete All'}
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setShowDeleteAllConfirm(true)}
                    disabled={deleteAllMutation.isPending}
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete All Orders
                  </Button>
                )}
              </div>
            )}
          </div>
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