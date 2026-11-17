import type { RealtimeChannel } from "@supabase/supabase-js";

import { parseAppData } from "./schema";
import { supabase } from "./supabase";
import type { AppData } from "./types";

export interface CloudSnapshot {
  data: AppData;
  revision: number;
  exists: boolean;
  legacyMigrated: boolean;
}

export class CloudConflictError extends Error {
  constructor(readonly latest: CloudSnapshot) {
    super("Your data changed in another tab or device.");
    this.name = "CloudConflictError";
  }
}

type CloudRow = {
  user_id: string;
  payload: unknown;
  revision: number;
  legacy_migrated_at: string | null;
  updated_at: string;
};

function requiredClient() {
  if (!supabase) throw new Error("Supabase is not configured for this deployment.");
  return supabase;
}

function snapshot(row: CloudRow | null, emptyData: AppData): CloudSnapshot {
  return row
    ? {
        data: parseAppData(row.payload),
        revision: Number(row.revision),
        exists: true,
        legacyMigrated: Boolean(row.legacy_migrated_at),
      }
    : { data: emptyData, revision: 0, exists: false, legacyMigrated: false };
}

export async function loadCloudData(userId: string, emptyData: AppData): Promise<CloudSnapshot> {
  const { data, error } = await requiredClient()
    .from("nexora_user_data")
    .select("user_id,payload,revision,legacy_migrated_at,updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return snapshot(data as CloudRow | null, emptyData);
}

export async function saveCloudData(
  userId: string,
  data: AppData,
  expectedRevision: number,
  markLegacyMigrated = false,
): Promise<CloudSnapshot> {
  const client = requiredClient();
  const payload = parseAppData(data);

  if (expectedRevision === 0) {
    const { data: inserted, error } = await client
      .from("nexora_user_data")
      .insert({
        user_id: userId,
        payload,
        revision: 1,
        legacy_migrated_at: markLegacyMigrated ? new Date().toISOString() : null,
      })
      .select("user_id,payload,revision,legacy_migrated_at,updated_at")
      .single();
    if (!error) return snapshot(inserted as CloudRow, payload);
    if (error.code !== "23505") throw error;
  } else {
    const update = client
      .from("nexora_user_data")
      .update({
        payload,
        revision: expectedRevision + 1,
        ...(markLegacyMigrated ? { legacy_migrated_at: new Date().toISOString() } : {}),
      })
      .eq("user_id", userId)
      .eq("revision", expectedRevision)
      .select("user_id,payload,revision,legacy_migrated_at,updated_at")
      .maybeSingle();
    const { data: updated, error } = await update;
    if (error) throw error;
    if (updated) return snapshot(updated as CloudRow, payload);
  }

  throw new CloudConflictError(await loadCloudData(userId, payload));
}

export function subscribeCloudData(
  userId: string,
  onChange: (latest: CloudSnapshot) => void,
  emptyData: AppData,
): () => void {
  if (!supabase) return () => {};
  let channel: RealtimeChannel | null = supabase
    .channel(`nexora-data:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "nexora_user_data",
        filter: `user_id=eq.${userId}`,
      },
      (event) => {
        if (event.eventType === "DELETE") {
          onChange({ data: emptyData, revision: 0, exists: false, legacyMigrated: false });
          return;
        }
        try {
          onChange(snapshot(event.new as CloudRow, emptyData));
        } catch (error) {
          console.error("Could not validate synchronized NEXORA data", error);
        }
      },
    )
    .subscribe();

  return () => {
    if (channel) void supabase?.removeChannel(channel);
    channel = null;
  };
}
