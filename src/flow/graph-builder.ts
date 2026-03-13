/// <reference types="@figma/plugin-typings" />

import { FlowEdge, FlowFrame, FlowGraph, FlowGraphIssue } from './types';

// ──────────────────────────────────────────────
// Flow Graph Builder
//
// Runs in the Figma plugin sandbox (QuickJS).
// Traverses the current page, reads prototype reactions,
// and builds a navigation graph with dead-end / orphan detection.
// ──────────────────────────────────────────────

const INTERACTIVE_RE = /button|btn|cta|link|tab|nav|menu|input|checkbox|toggle|switch|radio|select|dropdown|slider/i;

/** Check if a node or its descendants have interactive elements. */
function hasInteractiveChildren(node: SceneNode): boolean {
  if (INTERACTIVE_RE.test(node.name)) return true;
  if ('children' in node) {
    for (const child of (node as any).children) {
      if (hasInteractiveChildren(child)) return true;
    }
  }
  return false;
}

/** Recursively collect all reactions from a frame and its descendants. */
function collectReactions(
  node: SceneNode,
  frameId: string,
  edges: FlowEdge[],
): void {
  if ('reactions' in node) {
    const reactions = (node as any).reactions as Reaction[] | undefined;
    if (reactions && reactions.length > 0) {
      for (const reaction of reactions) {
        const actions = (reaction as any).actions || ((reaction as any).action ? [(reaction as any).action] : []);
        for (const action of actions) {
          if (action.type === 'NODE' && action.destinationId) {
            edges.push({
              sourceFrameId: frameId,
              sourceNodeId: node.id,
              sourceNodeName: node.name,
              destinationFrameId: action.destinationId,
              trigger: (reaction.trigger as any)?.type || 'UNKNOWN',
              navigation: action.navigation || 'NAVIGATE',
              hasTransition: !!action.transition,
            });
          }
          // BACK action — special case
          if (action.type === 'BACK') {
            edges.push({
              sourceFrameId: frameId,
              sourceNodeId: node.id,
              sourceNodeName: node.name,
              destinationFrameId: '__BACK__',
              trigger: (reaction.trigger as any)?.type || 'UNKNOWN',
              navigation: 'BACK',
              hasTransition: !!action.transition,
            });
          }
        }
      }
    }
  }

  if ('children' in node) {
    for (const child of (node as any).children) {
      collectReactions(child, frameId, edges);
    }
  }
}

/**
 * Build a flow graph from the current page.
 * Analyzes top-level frames for prototype connections.
 */
export function buildFlowGraph(page?: PageNode): FlowGraph {
  const currentPage = page || figma.currentPage;
  const topFrames = currentPage.children.filter(
    (n): n is FrameNode | ComponentNode =>
      n.type === 'FRAME' || n.type === 'COMPONENT',
  );

  // Collect flow starting points
  const startingPointIds = new Set(
    (currentPage.flowStartingPoints || []).map(sp => sp.nodeId),
  );

  // Build frames list
  const frames: FlowFrame[] = topFrames.map(f => ({
    id: f.id,
    name: f.name,
    pageId: currentPage.id,
    pageName: currentPage.name,
    width: f.width,
    height: f.height,
    isFlowStartingPoint: startingPointIds.has(f.id),
    childCount: 'children' in f ? f.children.length : 0,
    hasInteractiveElements: hasInteractiveChildren(f),
  }));

  const frameIds = new Set(frames.map(f => f.id));

  // Collect all edges (reactions)
  const edges: FlowEdge[] = [];
  for (const frame of topFrames) {
    collectReactions(frame, frame.id, edges);
  }

  // Filter edges to only those pointing to known frames on this page
  const validEdges = edges.filter(
    e => e.destinationFrameId === '__BACK__' || frameIds.has(e.destinationFrameId),
  );

  // ── Graph analysis ──

  // Entry points
  const entryPoints = frames
    .filter(f => f.isFlowStartingPoint)
    .map(f => f.id);

  // Outgoing / incoming maps
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();
  for (const fId of frameIds) {
    outgoing.set(fId, new Set());
    incoming.set(fId, new Set());
  }
  for (const edge of validEdges) {
    if (edge.destinationFrameId !== '__BACK__') {
      outgoing.get(edge.sourceFrameId)?.add(edge.destinationFrameId);
      incoming.get(edge.destinationFrameId)?.add(edge.sourceFrameId);
    }
  }

  // Dead ends: frames with no outgoing connections
  const deadEnds = frames
    .filter(f => (outgoing.get(f.id)?.size || 0) === 0)
    .map(f => f.id);

  // Orphans: frames with no incoming connections AND not entry points
  const orphans = frames
    .filter(f => (incoming.get(f.id)?.size || 0) === 0 && !startingPointIds.has(f.id))
    .map(f => f.id);

  // BFS from entry points to find unreachable frames
  const reachable = new Set<string>();
  const queue = [...entryPoints];
  // If no entry points defined, treat all frames with no incoming as potential entries
  if (queue.length === 0) {
    for (const f of frames) {
      if ((incoming.get(f.id)?.size || 0) === 0) {
        queue.push(f.id);
      }
    }
  }
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (reachable.has(current)) continue;
    reachable.add(current);
    const destinations = outgoing.get(current);
    if (destinations) {
      for (const dest of destinations) {
        if (!reachable.has(dest)) {
          queue.push(dest);
        }
      }
    }
  }
  const unreachable = frames
    .filter(f => !reachable.has(f.id))
    .map(f => f.id);

  // Simple cycle detection (DFS)
  const loops: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string): void {
    if (inStack.has(nodeId)) {
      // Found a cycle
      const cycleStart = path.indexOf(nodeId);
      if (cycleStart !== -1) {
        loops.push(path.slice(cycleStart));
      }
      return;
    }
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    inStack.add(nodeId);
    path.push(nodeId);

    const dests = outgoing.get(nodeId);
    if (dests) {
      for (const dest of dests) {
        dfs(dest);
      }
    }

    path.pop();
    inStack.delete(nodeId);
  }

  for (const fId of frameIds) {
    dfs(fId);
  }

  // Stats
  const branchingFactors = frames.map(f => outgoing.get(f.id)?.size || 0);
  const avgBranching = branchingFactors.length > 0
    ? branchingFactors.reduce((a, b) => a + b, 0) / branchingFactors.length
    : 0;

  // Max depth from entry points (BFS with depth tracking)
  let maxDepth = 0;
  const depthQueue: Array<{ id: string; depth: number }> = entryPoints.map(id => ({ id, depth: 0 }));
  const depthVisited = new Set<string>();
  while (depthQueue.length > 0) {
    const { id, depth } = depthQueue.shift()!;
    if (depthVisited.has(id)) continue;
    depthVisited.add(id);
    if (depth > maxDepth) maxDepth = depth;
    const dests = outgoing.get(id);
    if (dests) {
      for (const dest of dests) {
        if (!depthVisited.has(dest)) {
          depthQueue.push({ id: dest, depth: depth + 1 });
        }
      }
    }
  }

  return {
    frames,
    edges: validEdges,
    entryPoints,
    deadEnds,
    orphans,
    unreachable,
    loops,
    stats: {
      totalFrames: frames.length,
      totalEdges: validEdges.length,
      totalEntryPoints: entryPoints.length,
      maxDepth,
      avgBranching: Math.round(avgBranching * 100) / 100,
    },
  };
}

/**
 * Generate deterministic graph issues from the flow graph.
 */
export function analyzeFlowGraph(graph: FlowGraph): FlowGraphIssue[] {
  const issues: FlowGraphIssue[] = [];
  const frameNameById = new Map(graph.frames.map(f => [f.id, f.name]));
  const nameList = (ids: string[]) => ids.map(id => `"${frameNameById.get(id) || id}"`).join(', ');

  // Dead ends
  for (const id of graph.deadEnds) {
    // Don't flag frames that are clearly terminal (success, confirmation, etc.)
    const name = frameNameById.get(id) || '';
    const isTerminal = /success|confirm|done|complete|thank|receipt|summary/i.test(name);
    if (!isTerminal) {
      issues.push({
        type: 'dead-end',
        severity: 'warning',
        frameIds: [id],
        message: `${nameList([id])} has no outgoing connections — user gets stuck here.`,
      });
    }
  }

  // Orphan frames
  if (graph.orphans.length > 0) {
    issues.push({
      type: 'orphan',
      severity: 'warning',
      frameIds: graph.orphans,
      message: `${nameList(graph.orphans)} ${graph.orphans.length === 1 ? 'has' : 'have'} no incoming connections — unreachable by navigation.`,
    });
  }

  // Unreachable from entry
  const trueUnreachable = graph.unreachable.filter(id => !graph.orphans.includes(id));
  if (trueUnreachable.length > 0) {
    issues.push({
      type: 'unreachable',
      severity: 'critical',
      frameIds: trueUnreachable,
      message: `${nameList(trueUnreachable)} ${trueUnreachable.length === 1 ? 'is' : 'are'} not reachable from any flow entry point.`,
    });
  }

  // Loops without exit
  for (const loop of graph.loops) {
    const loopSet = new Set(loop);
    const hasExit = loop.some(id => {
      const edges = graph.edges.filter(e => e.sourceFrameId === id);
      return edges.some(e => !loopSet.has(e.destinationFrameId));
    });
    if (!hasExit) {
      issues.push({
        type: 'loop',
        severity: 'warning',
        frameIds: loop,
        message: `Circular flow without exit: ${nameList(loop)}. User cannot leave this loop.`,
      });
    }
  }

  // Deep navigation (>3 levels)
  if (graph.stats.maxDepth > 3) {
    issues.push({
      type: 'deep-navigation',
      severity: 'info',
      frameIds: [],
      message: `Navigation depth is ${graph.stats.maxDepth} levels. Consider flattening to ≤3 levels for better UX (3-click rule).`,
    });
  }

  // Missing back navigation
  const framesWithoutBack = graph.frames.filter(f => {
    if (f.isFlowStartingPoint) return false; // Entry points don't need "back"
    const hasBackEdge = graph.edges.some(
      e => e.sourceFrameId === f.id && (e.navigation === 'BACK' || e.navigation === 'CLOSE'),
    );
    const hasIncoming = graph.edges.some(e => e.destinationFrameId === f.id);
    return hasIncoming && !hasBackEdge;
  });
  if (framesWithoutBack.length > 0) {
    issues.push({
      type: 'missing-back',
      severity: 'info',
      frameIds: framesWithoutBack.map(f => f.id),
      message: `${framesWithoutBack.length} frame${framesWithoutBack.length === 1 ? '' : 's'} missing back/close navigation: ${nameList(framesWithoutBack.map(f => f.id))}.`,
    });
  }

  return issues;
}
