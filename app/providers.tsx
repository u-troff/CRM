"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Create the client once per browser session (useState initializer), so it
  // survives re-renders but isn't shared across users on the server.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Leads change infrequently within a session; serve cached data
            // instantly and revalidate in the background.
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
