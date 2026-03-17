import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Custom Yjs provider that uses Supabase Realtime broadcast
 * for syncing document updates between collaborative editors.
 */
export class SupabaseYjsProvider {
  doc: Y.Doc;
  awareness: Awareness;
  private channel: RealtimeChannel | null = null;
  private documentId: string;
  private isSynced = false;
  private _onSync: (() => void)[] = [];
  private _destroyed = false;

  constructor(documentId: string, doc: Y.Doc) {
    this.documentId = documentId;
    this.doc = doc;
    this.awareness = new Awareness(doc);

    this.connect();
  }

  private connect() {
    const channelName = `collab:${this.documentId}`;

    this.channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    // Listen for document updates from other clients
    this.channel.on("broadcast", { event: "yjs-update" }, ({ payload }) => {
      if (this._destroyed) return;
      try {
        const update = new Uint8Array(payload.update);
        Y.applyUpdate(this.doc, update, "remote");
      } catch (e) {
        console.error("Failed to apply Yjs update:", e);
      }
    });

    // Listen for awareness updates (cursor positions, user info)
    this.channel.on("broadcast", { event: "awareness" }, ({ payload }) => {
      if (this._destroyed) return;
      try {
        const update = new Uint8Array(payload.update);
        const { applyAwarenessUpdate } = require("y-protocols/awareness");
        applyAwarenessUpdate(this.awareness, update, "remote");
      } catch (e) {
        console.error("Failed to apply awareness update:", e);
      }
    });

    // Request sync from other peers when joining
    this.channel.on("broadcast", { event: "sync-request" }, () => {
      if (this._destroyed) return;
      // Send full document state to the requesting peer
      const state = Y.encodeStateAsUpdate(this.doc);
      this.channel?.send({
        type: "broadcast",
        event: "sync-response",
        payload: { update: Array.from(state) },
      });
    });

    // Receive sync response
    this.channel.on("broadcast", { event: "sync-response" }, ({ payload }) => {
      if (this._destroyed) return;
      try {
        const update = new Uint8Array(payload.update);
        Y.applyUpdate(this.doc, update, "remote");
        if (!this.isSynced) {
          this.isSynced = true;
          this._onSync.forEach((fn) => fn());
        }
      } catch (e) {
        console.error("Failed to apply sync response:", e);
      }
    });

    this.channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        // Request sync from other connected peers
        this.channel?.send({
          type: "broadcast",
          event: "sync-request",
          payload: {},
        });

        // If no response within 1s, consider ourselves synced
        setTimeout(() => {
          if (!this.isSynced && !this._destroyed) {
            this.isSynced = true;
            this._onSync.forEach((fn) => fn());
          }
        }, 1000);
      }
    });

    // Broadcast local document updates
    this.doc.on("update", this.handleDocUpdate);

    // Broadcast awareness changes
    this.awareness.on("update", this.handleAwarenessUpdate);
  }

  private handleDocUpdate = (update: Uint8Array, origin: any) => {
    if (origin === "remote" || this._destroyed) return;
    this.channel?.send({
      type: "broadcast",
      event: "yjs-update",
      payload: { update: Array.from(update) },
    });
  };

  private handleAwarenessUpdate = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: any
  ) => {
    if (origin === "remote" || this._destroyed) return;
    const { encodeAwarenessUpdate } = require("y-protocols/awareness");
    const changedClients = [...added, ...updated, ...removed];
    const update = encodeAwarenessUpdate(this.awareness, changedClients);
    this.channel?.send({
      type: "broadcast",
      event: "awareness",
      payload: { update: Array.from(update) },
    });
  };

  onSync(fn: () => void) {
    if (this.isSynced) {
      fn();
    } else {
      this._onSync.push(fn);
    }
  }

  destroy() {
    this._destroyed = true;
    this.doc.off("update", this.handleDocUpdate);
    this.awareness.off("update", this.handleAwarenessUpdate);
    this.awareness.destroy();
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
