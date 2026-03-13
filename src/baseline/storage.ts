/// <reference types="@figma/plugin-typings" />

import { compressToUTF16, decompressFromUTF16 } from 'lz-string';

/**
 * Compact error digest for baseline storage.
 * Omits path/value to save space — only what's needed for diff matching.
 */
export interface ErrorDigest {
  errorType: string;
  severity: string;
  nodeId: string;
  message: string;
}

/** Score snapshot per category. */
export interface CategoryScoreSnapshot {
  score: number;
  passed: number;
  failed: number;
}

/** Full baseline snapshot persisted in pluginData. */
export interface BaselineSnapshot {
  version: 1;
  timestamp: number;
  nodeId: string;
  nodeName: string;
  overall: number;
  grade: string;
  categories: Record<string, CategoryScoreSnapshot>;
  summary: {
    totalErrors: number;
    totalNodes: number;
    nodesWithErrors: number;
    byType: Record<string, number>;
  };
  errors: ErrorDigest[];
}

// ── Chunked pluginData helpers ──────────────────────────────

const CHUNK_SIZE = 80_000; // 80 KB — safely below Figma's 90 KB per-key limit
const PREFIX = 'baseline::';

function metaKey(nodeId: string): string {
  return `${PREFIX}${nodeId}::meta`;
}

function chunkKey(nodeId: string, index: number): string {
  return `${PREFIX}${nodeId}::chunk_${index}`;
}

/**
 * Save a baseline snapshot to pluginData with LZ-string compression + chunking.
 */
export function saveBaseline(snapshot: BaselineSnapshot): void {
  const json = JSON.stringify(snapshot);
  const compressed = compressToUTF16(json);

  // Split into chunks
  const chunks: string[] = [];
  for (let i = 0; i < compressed.length; i += CHUNK_SIZE) {
    chunks.push(compressed.slice(i, i + CHUNK_SIZE));
  }

  const nodeId = snapshot.nodeId;

  // Clear old chunks first (there may be more old chunks than new ones)
  clearBaselineChunks(nodeId);

  // Write meta
  figma.root.setPluginData(metaKey(nodeId), JSON.stringify({
    chunkCount: chunks.length,
    timestamp: snapshot.timestamp,
    nodeName: snapshot.nodeName,
    overall: snapshot.overall,
  }));

  // Write chunks
  for (let i = 0; i < chunks.length; i++) {
    figma.root.setPluginData(chunkKey(nodeId, i), chunks[i]);
  }
}

/**
 * Load a baseline snapshot from pluginData.
 * Returns null if no baseline exists for this nodeId.
 */
export function loadBaseline(nodeId: string): BaselineSnapshot | null {
  const metaRaw = figma.root.getPluginData(metaKey(nodeId));
  if (!metaRaw) return null;

  let meta: { chunkCount: number };
  try {
    meta = JSON.parse(metaRaw);
  } catch {
    return null;
  }

  // Reassemble chunks
  const parts: string[] = [];
  for (let i = 0; i < meta.chunkCount; i++) {
    const chunk = figma.root.getPluginData(chunkKey(nodeId, i));
    if (!chunk) return null; // corrupted — missing chunk
    parts.push(chunk);
  }

  const compressed = parts.join('');
  const json = decompressFromUTF16(compressed);
  if (!json) return null;

  try {
    return JSON.parse(json) as BaselineSnapshot;
  } catch {
    return null;
  }
}

/**
 * Delete all baseline data for a given nodeId.
 */
export function deleteBaseline(nodeId: string): void {
  clearBaselineChunks(nodeId);
  figma.root.setPluginData(metaKey(nodeId), '');
}

/**
 * Check if a baseline exists (without fully loading it).
 * Returns metadata or null.
 */
export function getBaselineMeta(nodeId: string): { timestamp: number; nodeName: string; overall: number } | null {
  const metaRaw = figma.root.getPluginData(metaKey(nodeId));
  if (!metaRaw) return null;
  try {
    return JSON.parse(metaRaw);
  } catch {
    return null;
  }
}

// ── Internal helpers ────────────────────────────────────────

function clearBaselineChunks(nodeId: string): void {
  // Try clearing up to 100 chunks (more than enough for any realistic data)
  for (let i = 0; i < 100; i++) {
    const key = chunkKey(nodeId, i);
    const existing = figma.root.getPluginData(key);
    if (!existing) break;
    figma.root.setPluginData(key, '');
  }
}
