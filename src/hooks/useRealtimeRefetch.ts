"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Shared broadcast channel (module-level singleton)
// ---------------------------------------------------------------------------

const CHANNEL_NAME = "db-changes";

let sharedChannel: RealtimeChannel | null = null;
let channelReady = false;
const tableListeners = new Map<string, Set<() => void>>();

function getChannel(): RealtimeChannel {
  if (sharedChannel) return sharedChannel;

  const supabase = createClient();
  sharedChannel = supabase.channel(CHANNEL_NAME, {
    config: { broadcast: { self: true } },
  });

  sharedChannel.on("broadcast", { event: "change" }, ({ payload }) => {
    const table = payload?.table as string | undefined;
    if (table) {
      const listeners = tableListeners.get(table);
      if (listeners) {
        listeners.forEach((cb) => cb());
      }
    }
  });

  sharedChannel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      channelReady = true;
    }
  });

  return sharedChannel;
}

// ---------------------------------------------------------------------------
// notifyChange — 데이터 변경 후 호출하여 다른 페이지에 알림
// ---------------------------------------------------------------------------

export async function notifyChange(table: string) {
  const channel = getChannel();

  if (!channelReady) {
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (channelReady) {
          clearInterval(check);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(check);
        resolve();
      }, 3000);
    });
  }

  await channel.send({
    type: "broadcast",
    event: "change",
    payload: { table },
  });
}

// ---------------------------------------------------------------------------
// useRealtimeRefetch hook
// ---------------------------------------------------------------------------

interface UseRealtimeRefetchOptions {
  tables: string[];
  onChange: () => void;
  enabled?: boolean;
}

export function useRealtimeRefetch({
  tables,
  onChange,
  enabled = true,
}: UseRealtimeRefetchOptions) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const tablesKey = tables.join(",");

  useEffect(() => {
    if (!enabled || tables.length === 0) return;

    getChannel(); // ensure shared channel is created

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const debouncedOnChange = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        onChangeRef.current();
      }, 300);
    };

    // Register listeners for each table
    for (const table of tables) {
      if (!tableListeners.has(table)) {
        tableListeners.set(table, new Set());
      }
      tableListeners.get(table)!.add(debouncedOnChange);
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      for (const table of tables) {
        tableListeners.get(table)?.delete(debouncedOnChange);
      }
    };
  }, [tablesKey, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}
