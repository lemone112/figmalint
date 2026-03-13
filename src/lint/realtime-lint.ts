/// <reference types="@figma/plugin-typings" />

import { LintSettings } from '../types';
import { runDesignLint, DEFAULT_LINT_SETTINGS } from '../core/design-lint';
import { sendMessageToUI } from '../utils/figma-helpers';

// ──────────────────────────────────────────────
// Real-Time Incremental Linting
//
// Uses figma.on('documentchange') to detect changed nodes
// and re-lint only the affected subtrees. Debounced to avoid
// flooding the UI with rapid-fire updates.
// ──────────────────────────────────────────────

export interface RealtimeLintConfig {
  enabled: boolean;
  debounceMs: number; // default 500
  settings: LintSettings;
}

let realtimeConfig: RealtimeLintConfig | null = null;
let debounceTimer: number | null = null;
let pendingNodeIds: Set<string> = new Set();
let handlerRegistered = false;

/**
 * Handler for figma.on('documentchange').
 * Collects changed node IDs, filters to PROPERTY_CHANGE and CREATE,
 * then debounces re-linting.
 */
function onDocumentChange(event: DocumentChangeEvent): void {
  if (!realtimeConfig || !realtimeConfig.enabled) return;

  for (const change of event.documentChanges) {
    // Only react to property changes and creations — not deletes
    if (change.type === 'PROPERTY_CHANGE' || change.type === 'CREATE' || change.type === 'STYLE_PROPERTY_CHANGE') {
      if ('id' in change && typeof change.id === 'string') {
        pendingNodeIds.add(change.id);
      }
    }
  }

  if (pendingNodeIds.size === 0) return;

  // Debounce: clear previous timer and start new one
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }

  const debounceMs = realtimeConfig.debounceMs || 500;
  debounceTimer = setTimeout(() => {
    processChangedNodes();
  }, debounceMs) as unknown as number;
}

/**
 * Fetch each changed node, filter to valid SceneNodes, and re-lint.
 */
async function processChangedNodes(): Promise<void> {
  if (!realtimeConfig) return;

  const nodeIds = Array.from(pendingNodeIds);
  pendingNodeIds.clear();
  debounceTimer = null;

  const changedNodes: SceneNode[] = [];
  const changedNodeIds: string[] = [];

  for (const id of nodeIds) {
    try {
      const node = await figma.getNodeByIdAsync(id);
      if (node && 'type' in node && node.type !== 'PAGE' && node.type !== 'DOCUMENT') {
        changedNodes.push(node as SceneNode);
        changedNodeIds.push(id);
      }
    } catch {
      // Node may have been deleted between change event and processing — skip
    }
  }

  if (changedNodes.length === 0) return;

  try {
    const result = runDesignLint(changedNodes, realtimeConfig.settings);

    sendMessageToUI('realtime-lint-update', {
      errors: result.errors,
      changedNodeIds,
    });
  } catch (error) {
    console.error('Realtime lint error:', error);
  }
}

/**
 * Enable real-time incremental linting.
 * Registers the documentchange handler and stores the config.
 */
export function enableRealtimeLint(config: RealtimeLintConfig): void {
  realtimeConfig = {
    enabled: config.enabled,
    debounceMs: config.debounceMs || 500,
    settings: config.settings || DEFAULT_LINT_SETTINGS,
  };

  if (!handlerRegistered) {
    figma.on('documentchange', onDocumentChange);
    handlerRegistered = true;
  }
}

/**
 * Disable real-time incremental linting.
 * Unregisters the handler and clears pending state.
 */
export function disableRealtimeLint(): void {
  realtimeConfig = null;

  if (handlerRegistered) {
    figma.off('documentchange', onDocumentChange);
    handlerRegistered = false;
  }

  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  pendingNodeIds.clear();
}
