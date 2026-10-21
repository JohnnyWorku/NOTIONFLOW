import { Injectable } from '@nestjs/common';

export interface SyncEvent { pageId: string; type: string; at: string; version: number }

/**
 * In-memory change feed. `version` increments on every app-originated write and every verified Notion webhook.
 * Clients poll the cheap GET /sync/status and refetch when the version changes.
 * Limitation: state resets on restart, and clients that were offline just do a full refetch (safe fallback).
 * Persisting this (e.g. PostgreSQL) is the upgrade path if multi-instance deployment is needed.
 */
@Injectable()
export class SyncService {
  private version = 0;
  private events: SyncEvent[] = [];
  lastWebhookAt: string | null = null;

  bump(pageId: string, type: string): number {
    this.version++;
    this.events.push({ pageId, type, at: new Date().toISOString(), version: this.version });
    if (this.events.length > 200) this.events.shift();
    return this.version;
  }
  status() {
    return { version: this.version, lastWebhookAt: this.lastWebhookAt, serverTime: new Date().toISOString() };
  }
  since(version: number) {
    return this.events.filter((e) => e.version > version);
  }
}
