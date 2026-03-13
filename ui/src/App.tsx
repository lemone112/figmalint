import { useState, useCallback, useEffect, useRef } from 'react';
import ChatContainer from './components/chat/ChatContainer';
import SettingsPanel from './components/shared/SettingsPanel';
import TeamConfigPanel from './components/shared/TeamConfigPanel';
import { useChat } from './hooks/useChat';
import { usePluginMessages, usePostToPlugin } from './hooks/usePluginMessages';
import type { PluginEvent, LintResult, LintError, AiReviewData, ReferoComparisonData, FlowAnalysisData, DiffResultData, PageSweepData, PageSweepRawData, MiniScoreData } from './lib/messages';
import { analyzeComponent, streamChat, checkHealth, setBackendUrl, fetchReferoData, analyzeFlow, analyzePageSweep } from './lib/api';

export default function App() {
  const chat = useChat();
  const post = usePostToPlugin();
  const [componentName, setComponentName] = useState<string | undefined>();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'quick' | 'deep'>('quick');
  const [showSettings, setShowSettings] = useState(false);
  const [showTeamConfig, setShowTeamConfig] = useState(false);
  const [teamConfig, setTeamConfig] = useState<Record<string, unknown> | undefined>(undefined);
  const [selectionStale, setSelectionStale] = useState(false);
  const [currentNodeName, setCurrentNodeName] = useState<string | null>(null);
  const [miniScore, setMiniScore] = useState<MiniScoreData | null>(null);
  const analyzedNodeId = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const walkthroughIndex = useRef(0);
  const referoPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingLintResult = useRef<LintResult | null>(null);
  const pendingScreenshot = useRef<{ screenshot: string; nodeId: string; nodeName: string; width: number; height: number } | null>(null);
  const pageSweepRequestId = useRef(0);

  // Try to send lint + screenshot to backend for AI analysis
  const tryBackendAnalysis = useCallback(async (
    lintResult: LintResult,
    screenshot: { screenshot: string; nodeId: string; nodeName: string; width: number; height: number }
  ) => {
    if (!backendAvailable) return;

    chat.addMessage({ kind: 'analysis-phase', phase: 'ai-review' });

    try {
      const result = await analyzeComponent({
        screenshot: screenshot.screenshot,
        lintResult,
        extractedData: {
          componentName: componentName || screenshot.nodeName || 'Component',
          metadata: {
            nodeId: screenshot.nodeId,
            nodeType: (screenshot as any).nodeType ?? 'FRAME',
            width: screenshot.width,
            height: screenshot.height,
            hasAutoLayout: (screenshot as any).hasAutoLayout ?? false,
            childCount: (screenshot as any).childCount ?? 0,
          },
          tokenSummary: (screenshot as any).tokenSummary,
        },
        sessionId: chat.sessionId || undefined,
        mode: analysisMode,
      });

      chat.handleAiReview({
        sessionId: result.sessionId,
        aiReview: result.aiReview as AiReviewData,
        referoComparison: result.referoComparison,
      });

      // In quick mode, Refero runs in background — poll for results
      if (analysisMode === 'quick' && !result.referoComparison) {
        startReferoPolling(result.sessionId);
      }
    } catch (error) {
      // Clean up analysis-phase indicator on failure
      chat.clearAnalysisPhase();
      chat.addMessage({
        kind: 'ai-text',
        content: `AI analysis unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }, [backendAvailable, chat, componentName, analysisMode]);

  // Poll for async Refero data (quick mode background fetch)
  const startReferoPolling = useCallback((sessionId: string) => {
    // Clear any existing poll
    if (referoPollingRef.current) clearInterval(referoPollingRef.current);

    chat.addMessage({ kind: 'analysis-phase', phase: 'refero' });

    let attempts = 0;
    referoPollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 12) { // max ~1 minute of polling
        if (referoPollingRef.current) clearInterval(referoPollingRef.current);
        referoPollingRef.current = null;
        return;
      }
      try {
        const result = await fetchReferoData(sessionId);
        if (result.ready && result.data) {
          if (referoPollingRef.current) clearInterval(referoPollingRef.current);
          referoPollingRef.current = null;
          chat.addMessage({ kind: 'refero-gallery', data: result.data });
          if (result.data.suggestions?.length > 0) {
            const sugText = result.data.suggestions
              .map((s: { title: string; description: string; evidence: string }) => `- **${s.title}:** ${s.description} _(${s.evidence})_`)
              .join('\n');
            chat.addMessage({ kind: 'ai-text', content: `**Refero-based suggestions:**\n${sugText}` });
          }
        }
      } catch { /* polling failed, will retry */ }
    }, 5000);
  }, [chat]);

  // Listen for messages from the plugin main thread
  usePluginMessages(
    useCallback(
      (event: PluginEvent) => {
        switch (event.type) {
          case 'design-lint-result':
            // If we already have a lint result, treat this as a rescan
            if (chat.lintResult) {
              chat.handleRescan(event.data as LintResult);
            } else {
              chat.handleLintResult(event.data as LintResult);
              // Store lint result and request screenshot for AI analysis
              pendingLintResult.current = event.data as LintResult;
              post('export-screenshot');
              chat.addMessage({ kind: 'analysis-phase', phase: 'screenshot' });
            }
            break;
          case 'enhanced-analysis-result': {
            const result = event.data as any;
            if (result.metadata?.component) {
              setComponentName(result.metadata.component);
            }
            if (result.lintResult) {
              chat.handleLintResult(result.lintResult);
            }
            break;
          }
          case 'analysis-error':
            chat.addMessage({
              kind: 'ai-text',
              content: `Error: ${(event.data as any)?.error || 'Unknown error'}`,
            });
            break;
          case 'fix-applied':
            chat.handleFixApplied(event.data as any);
            break;
          case 'fix-error':
            chat.addMessage({
              kind: 'ai-text',
              content: `Fix failed: ${(event.data as any)?.error || 'Unknown error'}`,
            });
            break;
          case 'batch-fix-v2-result':
            chat.handleBatchFixResult(event.data as any);
            // Plugin-side handleBatchFixV2 already triggers a rescan — no need for duplicate
            break;
          case 'rescan-complete':
            // Rescan lint result will arrive via 'design-lint-result' — handled there
            break;
          case 'screenshot-result': {
            const ssData = event.data as { nodeId: string; nodeName: string; screenshot: string; width: number; height: number; hasAutoLayout?: boolean; childCount?: number };
            pendingScreenshot.current = ssData;
            analyzedNodeId.current = ssData.nodeId;
            // Check for existing baseline for this node
            post('load-baseline', { nodeId: ssData.nodeId });
            // If we have both lint result and screenshot, trigger backend analysis
            if (pendingLintResult.current && pendingScreenshot.current) {
              tryBackendAnalysis(pendingLintResult.current, pendingScreenshot.current);
              pendingLintResult.current = null;
              pendingScreenshot.current = null;
            }
            break;
          }
          case 'screenshot-error':
            // Screenshot failed — clear pending lint so we don't hang
            pendingLintResult.current = null;
            break;
          case 'flow-analysis-started': {
            const status = (event.data as any)?.status || 'analyzing';
            const progress = (event.data as any)?.progress;
            const total = (event.data as any)?.total;
            const progressText = progress && total ? ` (${progress}/${total})` : '';
            chat.addMessage({
              kind: 'ai-text',
              content: `Flow analysis: ${status}${progressText}...`,
            });
            break;
          }
          case 'flow-analysis-result': {
            const flowData = event.data as FlowAnalysisData;
            // Show deterministic results immediately
            chat.addMessage({ kind: 'flow-result', data: flowData });

            // Fire backend AI analysis in background if available
            if (backendAvailable && Object.keys(flowData.screenshots).length > 0) {
              chat.addMessage({ kind: 'ai-text', content: 'Running AI flow analysis...' });
              analyzeFlow({
                frames: flowData.graph.frames,
                edges: flowData.graph.edges,
                graphIssues: flowData.graphIssues,
                screenshots: flowData.screenshots,
                lintResults: flowData.lintResults,
              }).then(result => {
                if (result.flowAnalysis) {
                  // Update the flow result with AI data
                  chat.addMessage({
                    kind: 'flow-result',
                    data: { ...flowData, aiAnalysis: result.flowAnalysis },
                  });
                }
              }).catch(err => {
                chat.addMessage({
                  kind: 'ai-text',
                  content: `AI flow analysis unavailable: ${err instanceof Error ? err.message : 'Unknown error'}`,
                });
              });
            }
            break;
          }
          case 'flow-analysis-error':
            chat.addMessage({
              kind: 'ai-text',
              content: `Flow analysis failed: ${(event.data as any)?.error || 'Unknown error'}`,
            });
            break;
          case 'api-key-status':
            setHasApiKey((event.data as any)?.hasKey || false);
            break;
          case 'api-key-saved':
            if ((event.data as any)?.success) {
              setHasApiKey(true);
              chat.addMessage({ kind: 'ai-text', content: 'API key saved successfully.' });
            }
            break;
          case 'baseline-saved':
            chat.handleBaselineSaved(event.data as { nodeId: string; nodeName: string; timestamp: number; overall: number });
            break;
          case 'baseline-loaded':
            chat.handleBaselineLoaded(event.data as { timestamp: number; nodeName: string; overall: number } | null);
            break;
          case 'diff-result': {
            const diffData = event.data as DiffResultData | null;
            if (diffData) {
              chat.handleDiffResult(diffData);
            } else {
              chat.addMessage({ kind: 'ai-text', content: 'No baseline found for this component. Save a baseline first.' });
            }
            break;
          }
          case 'page-sweep-progress': {
            const prog = event.data as { current: number; total: number; frameName: string };
            chat.addMessage({
              kind: 'ai-text',
              content: `Sweeping page: ${prog.current}/${prog.total} - "${prog.frameName}"...`,
            });
            break;
          }
          case 'page-sweep-result': {
            const sweepData = event.data as PageSweepRawData;
            const requestId = ++pageSweepRequestId.current;
            chat.addMessage({
              kind: 'ai-text',
              content: `Page sweep complete: ${sweepData.frames.length} frames analyzed. ${backendAvailable ? 'Running AI analysis...' : 'Backend unavailable, showing deterministic results.'}`,
            });

            if (backendAvailable) {
              analyzePageSweep({
                frames: sweepData.frames,
              }).then((result) => {
                if (pageSweepRequestId.current !== requestId) return;
                chat.addMessage({ kind: 'page-sweep-result', data: result as PageSweepData });
              }).catch((err) => {
                if (pageSweepRequestId.current !== requestId) return;
                chat.addMessage({
                  kind: 'ai-text',
                  content: `AI page analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}. Showing deterministic results.`,
                });
                const deterministicResult = buildDeterministicSweepResult(sweepData);
                chat.addMessage({ kind: 'page-sweep-result', data: deterministicResult });
              });
            } else {
              if (pageSweepRequestId.current !== requestId) break;
              const deterministicResult = buildDeterministicSweepResult(sweepData);
              chat.addMessage({ kind: 'page-sweep-result', data: deterministicResult });
            }
            break;
          }
          case 'selection-changed': {
            const selData = event.data as { hasSelection: boolean; nodeId: string | null; nodeName: string | null };
            setCurrentNodeName(selData.nodeName);
            // Clear mini-score when selection clears
            if (!selData.hasSelection) setMiniScore(null);
            // Mark results as stale if selection differs from analyzed node; clear if it matches again
            if (chat.lintResult && analyzedNodeId.current) {
              setSelectionStale(selData.nodeId !== analyzedNodeId.current);
            }
            break;
          }
          case 'selection-mini-score': {
            setMiniScore(event.data as MiniScoreData);
            break;
          }

          // ── New analysis feature events ────────────────────

          case 'design-debt-result': {
            chat.addMessage({ kind: 'design-debt', data: event.data });
            break;
          }

          case 'dark-mode-card-result': {
            chat.addMessage({ kind: 'dark-mode', data: event.data });
            break;
          }

          case 'mode-comparison-result': {
            // Raw mode data — show text summary (card comes via dark-mode-card-result)
            const modeRaw = event.data as { collection: string; variableDiffs: unknown[]; missingValues: unknown[] };
            chat.addMessage({
              kind: 'ai-text',
              content: `Mode comparison for "${modeRaw.collection}": ${(modeRaw.variableDiffs as unknown[]).length} variable diffs, ${(modeRaw.missingValues as unknown[]).length} missing values.`,
            });
            break;
          }

          case 'mode-comparison-error': {
            chat.addMessage({
              kind: 'ai-text',
              content: `Dark mode comparison failed: ${(event.data as { error: string }).error}`,
            });
            break;
          }

          case 'dtcg-compliance-result': {
            chat.addMessage({ kind: 'token-compliance', data: event.data });
            break;
          }

          case 'dtcg-compliance-error': {
            chat.addMessage({
              kind: 'ai-text',
              content: `Token compliance check failed: ${(event.data as { error: string }).error}`,
            });
            break;
          }

          case 'variable-system-result': {
            const report = event.data as { totalVariables: number; unusedVariables: string[]; adoptionRate: number; collections: unknown[] };
            chat.addMessage({
              kind: 'ai-text',
              content: `**Variable System Report**\n- Total variables: ${report.totalVariables}\n- Adoption rate: ${Math.round(report.adoptionRate * 100)}%\n- Unused variables: ${report.unusedVariables.length}\n- Collections: ${report.collections.length}`,
            });
            break;
          }

          case 'variable-system-error': {
            chat.addMessage({
              kind: 'ai-text',
              content: `Variable collection failed: ${(event.data as { error: string }).error}`,
            });
            break;
          }

          case 'extended-lint-result': {
            const extResult = event.data as Record<string, { issues?: unknown[] }>;
            const totalIssues = Object.values(extResult).reduce(
              (sum, r) => sum + (r?.issues?.length ?? 0), 0
            );
            chat.addMessage({
              kind: 'ai-text',
              content: `**Extended lint complete** — ${totalIssues} issue${totalIssues !== 1 ? 's' : ''} across ${Object.keys(extResult).length} modules.`,
            });
            break;
          }

          case 'extended-lint-error': {
            chat.addMessage({
              kind: 'ai-text',
              content: `Extended lint failed: ${(event.data as { error: string }).error}`,
            });
            break;
          }

          case 'team-config-loaded': {
            const payload = event.data as { config: Record<string, unknown> | null; settings: unknown };
            if (payload.config) {
              setTeamConfig(payload.config);
              chat.addMessage({ kind: 'ai-text', content: 'Team config loaded from file.' });
            } else {
              chat.addMessage({ kind: 'ai-text', content: 'No team config found in this file.' });
            }
            break;
          }

          case 'team-config-saved': {
            const saveResult = event.data as { success: boolean; error?: string };
            if (saveResult.success) {
              chat.addMessage({ kind: 'ai-text', content: 'Team config saved to file.' });
            } else {
              chat.addMessage({ kind: 'ai-text', content: `Failed to save team config: ${saveResult.error || 'Unknown error'}` });
            }
            break;
          }
        }
      },
      [chat, post, tryBackendAnalysis]
    )
  );

  // Clean up Refero polling interval on unmount
  useEffect(() => {
    return () => {
      if (referoPollingRef.current) {
        clearInterval(referoPollingRef.current);
        referoPollingRef.current = null;
      }
    };
  }, []);

  // Check API key and backend health on mount
  useEffect(() => {
    post('check-api-key');
    checkHealth().then(ok => setBackendAvailable(ok));
  }, [post]);

  const handleAnalyze = useCallback(() => {
    // Abort any in-flight streaming chat
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    // Stop any active Refero polling from a previous analysis
    if (referoPollingRef.current) {
      clearInterval(referoPollingRef.current);
      referoPollingRef.current = null;
    }
    chat.startAnalysis();
    chat.addMessage({ kind: 'analysis-phase', phase: 'lint' });
    walkthroughIndex.current = 0;
    setSelectionStale(false);
    post('run-design-lint');
  }, [chat, post]);

  const handleSendMessage = useCallback(
    (text: string) => {
      chat.addMessage({ kind: 'user-text', content: text });

      // If we have a backend session, use streaming chat
      if (chat.sessionId && backendAvailable) {
        // Abort any previous in-flight stream
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        streamChat(
          chat.sessionId,
          text,
          (chunk) => chat.appendStreamChunk(chunk),
          () => {
            abortControllerRef.current = null;
            chat.finishStream();
          },
          (error) => {
            abortControllerRef.current = null;
            chat.finishStream();
            chat.addMessage({ kind: 'ai-text', content: `Error: ${error}` });
          },
          controller.signal
        );
      } else {
        // Fallback to plugin main thread chat
        post('chat-message', { message: text, history: chat.messages });
      }
    },
    [chat, post, backendAvailable]
  );

  const handleAction = useCallback(
    (action: string, params?: Record<string, unknown>) => {
      switch (action) {
        case 'fix-all': {
          const errors = chat.lintResult?.errors || [];
          const fixes: Array<{ type: string; params: Record<string, unknown> }> = [];

          // Spacing fixes
          for (const err of errors) {
            if (err.errorType === 'spacing' && err.property) {
              fixes.push({
                type: 'fixSpacingToNearest',
                params: { nodeId: err.nodeId, property: err.property },
              });
            }
          }

          // Radius fixes
          for (const err of errors) {
            if (err.errorType === 'radius') {
              fixes.push({
                type: 'fixRadiusToNearest',
                params: { nodeId: err.nodeId },
              });
            }
          }

          if (fixes.length > 0) {
            chat.addMessage({
              kind: 'ai-text',
              content: `Fixing ${fixes.length} auto-fixable issue${fixes.length !== 1 ? 's' : ''} (spacing + radius)...`,
            });
            post('batch-fix-v2', { fixes });
          }
          break;
        }

        case 'walkthrough': {
          const errors = chat.lintResult?.errors;
          if (!errors || errors.length === 0) break;

          const idx = walkthroughIndex.current;
          if (idx >= errors.length) {
            chat.addMessage({
              kind: 'ai-text',
              content: 'All issues reviewed!',
            });
            walkthroughIndex.current = 0;
            break;
          }

          const issue = errors[idx];
          walkthroughIndex.current = idx + 1;

          chat.addMessage({
            kind: 'ai-text',
            content: `**${idx + 1}/${errors.length}:** ${issue.message}\n\nLayer: **${issue.nodeName}** (${issue.nodeType})`,
          });

          // Show fix actions for this issue
          const buttons = [];
          if (issue.errorType === 'spacing' && issue.property) {
            buttons.push({
              id: `fix-${issue.nodeId}`,
              label: 'Fix to nearest',
              variant: 'primary' as const,
              action: 'fix-single-spacing',
              params: { nodeId: issue.nodeId, property: issue.property },
            });
          } else if (issue.errorType === 'radius') {
            buttons.push({
              id: `fix-radius-${issue.nodeId}`,
              label: 'Fix radius to nearest',
              variant: 'primary' as const,
              action: 'fix-single-radius',
              params: { nodeId: issue.nodeId },
            });
          }
          buttons.push({
            id: `skip-${idx}`,
            label: idx + 1 < errors.length ? 'Next issue' : 'Done',
            variant: 'secondary' as const,
            action: 'walkthrough',
          });

          chat.addMessage({ kind: 'action-buttons', buttons });
          post('jump-to-node', { nodeId: issue.nodeId });
          break;
        }

        case 'fix-single-spacing': {
          if (params?.nodeId && params?.property) {
            post('fix-spacing-to-nearest', {
              nodeId: params.nodeId,
              property: params.property,
            });
          }
          break;
        }

        case 'fix-single-radius': {
          if (params?.nodeId) {
            post('batch-fix-v2', {
              fixes: [{ type: 'fixRadiusToNearest', params: { nodeId: params.nodeId } }],
            });
          }
          break;
        }

        case 'rescan': {
          chat.addMessage({ kind: 'ai-text', content: 'Re-scanning...' });
          post('rescan-lint');
          break;
        }

        case 'export': {
          const result = chat.lintResult;
          if (result) {
            const md = buildFullReport(result, componentName, chat.issuesFixed, chat.aiReview, chat.lastDiff);
            navigator.clipboard.writeText(md).then(
              () => {
                chat.addMessage({
                  kind: 'ai-text',
                  content: 'Full report copied to clipboard!',
                });
              },
              () => {
                chat.addMessage({
                  kind: 'ai-text',
                  content: 'Failed to copy report to clipboard.',
                });
              }
            );
          }
          break;
        }

        case 'export-json': {
          const jsonResult = chat.lintResult;
          if (jsonResult) {
            const report = {
              component: componentName || 'Component',
              timestamp: new Date().toISOString(),
              lint: {
                summary: jsonResult.summary,
                errors: jsonResult.errors,
                issuesFixed: chat.issuesFixed,
              },
              aiReview: chat.aiReview || undefined,
              diff: chat.lastDiff || undefined,
            };
            navigator.clipboard.writeText(JSON.stringify(report, null, 2)).then(
              () => chat.addMessage({ kind: 'ai-text', content: 'JSON report copied to clipboard!' }),
              () => chat.addMessage({ kind: 'ai-text', content: 'Failed to copy JSON to clipboard.' }),
            );
          }
          break;
        }

        case 'save-baseline': {
          if (!chat.score || !chat.lintResult) {
            chat.addMessage({ kind: 'ai-text', content: 'Run an analysis first before saving a baseline.' });
            break;
          }
          const nodeId = analyzedNodeId.current;
          if (!nodeId) break;
          post('save-baseline', {
            nodeId,
            nodeName: componentName || 'Component',
            overall: chat.score.overall,
            grade: chat.score.grade,
            categories: {
              tokens: chat.score.tokens,
              spacing: chat.score.spacing,
              layout: chat.score.layout,
              accessibility: chat.score.accessibility,
              naming: chat.score.naming,
              visualQuality: chat.score.visualQuality,
              microcopy: chat.score.microcopy,
              conversion: chat.score.conversion,
              cognitive: chat.score.cognitive,
            },
            errors: chat.lintResult.errors.map(e => ({
              errorType: e.errorType,
              severity: e.severity,
              nodeId: e.nodeId,
              message: e.message,
            })),
            summary: chat.lintResult.summary,
          });
          break;
        }

        case 'compare-baseline': {
          if (!chat.score || !chat.lintResult) {
            chat.addMessage({ kind: 'ai-text', content: 'Run an analysis first before comparing.' });
            break;
          }
          const diffNodeId = analyzedNodeId.current;
          if (!diffNodeId) break;
          post('compare-baseline', {
            nodeId: diffNodeId,
            overall: chat.score.overall,
            grade: chat.score.grade,
            categories: {
              tokens: chat.score.tokens,
              spacing: chat.score.spacing,
              layout: chat.score.layout,
              accessibility: chat.score.accessibility,
              naming: chat.score.naming,
              visualQuality: chat.score.visualQuality,
              microcopy: chat.score.microcopy,
              conversion: chat.score.conversion,
              cognitive: chat.score.cognitive,
            },
            errors: chat.lintResult.errors.map(e => ({
              errorType: e.errorType,
              severity: e.severity,
              nodeId: e.nodeId,
              message: e.message,
            })),
            summary: chat.lintResult.summary,
          });
          break;
        }

        case 'analyze-flow': {
          chat.addMessage({ kind: 'ai-text', content: 'Starting flow analysis on current page...' });
          post('analyze-flow');
          break;
        }

        case 'analyze-page': {
          chat.addMessage({ kind: 'ai-text', content: 'Starting whole-page sweep...' });
          post('analyze-page');
          break;
        }

        case 'toggle-mode': {
          const next = analysisMode === 'quick' ? 'deep' : 'quick';
          setAnalysisMode(next);
          chat.addMessage({
            kind: 'ai-text',
            content: `Analysis mode: **${next}**. ${next === 'deep' ? 'Refero comparison will be included in the initial response.' : 'Refero data loads in the background.'}`,
          });
          break;
        }

        // ── New analysis feature actions ────────────────────

        case 'design-debt': {
          if (!chat.lintResult) {
            chat.addMessage({ kind: 'ai-text', content: 'Run an analysis first to calculate design debt.' });
            break;
          }
          chat.addMessage({ kind: 'ai-text', content: 'Calculating design debt...' });
          post('calculate-design-debt', {
            lintResult: {
              errors: chat.lintResult.errors,
              summary: chat.lintResult.summary,
            },
          });
          break;
        }

        case 'dark-mode': {
          chat.addMessage({ kind: 'ai-text', content: 'Comparing variable modes...' });
          post('compare-modes');
          break;
        }

        case 'token-audit': {
          chat.addMessage({ kind: 'ai-text', content: 'Running token audit (DTCG compliance + variable collection)...' });
          post('check-dtcg-compliance');
          post('collect-variables');
          break;
        }
      }
    },
    [chat, post, componentName, analysisMode]
  );

  const handleJumpToNode = useCallback(
    (nodeId: string) => {
      post('jump-to-node', { nodeId });
    },
    [post]
  );

  return (
    <div className="h-full flex flex-col relative">
      {/* Settings panel (overlay) */}
      {showSettings && (
        <SettingsPanel
          hasApiKey={hasApiKey}
          analysisMode={analysisMode}
          backendAvailable={backendAvailable}
          onSaveApiKey={(key, prov) => post('save-api-key', { apiKey: key, provider: prov })}
          onClearApiKey={() => { post('clear-api-key'); setHasApiKey(false); }}
          onToggleMode={() => {
            const next = analysisMode === 'quick' ? 'deep' : 'quick';
            setAnalysisMode(next);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Team config panel (overlay) */}
      {showTeamConfig && (
        <TeamConfigPanel
          initialConfig={teamConfig as any}
          onClose={() => setShowTeamConfig(false)}
        />
      )}

      {/* Top analyze bar (shown when no results yet) */}
      {chat.messages.length === 0 && !chat.isAnalyzing && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <button
            className="flex-1 py-2 bg-bg-brand text-fg-onbrand text-12 font-medium rounded-md hover:opacity-90 transition-opacity"
            onClick={handleAnalyze}
          >
            Analyze Selection
          </button>
          <button
            className="flex-1 py-2 bg-bg-secondary text-fg text-12 font-medium rounded-md hover:bg-bg-hover transition-colors border border-border"
            onClick={() => handleAction('analyze-flow')}
          >
            Analyze Flow
          </button>
          <button
            className="flex-1 py-2 bg-bg-secondary text-fg text-12 font-medium rounded-md hover:bg-bg-hover transition-colors border border-border"
            onClick={() => handleAction('analyze-page')}
            title="Sweep all top-level frames on the page"
          >
            Sweep Page
          </button>
          <button
            onClick={() => setShowTeamConfig(true)}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-fg-tertiary hover:text-fg rounded-md hover:bg-bg-hover transition-colors"
            title="Team Config"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-fg-tertiary hover:text-fg rounded-md hover:bg-bg-hover transition-colors"
            title="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      )}

      {/* Stale selection banner */}
      {selectionStale && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-warning text-fg-warning text-11 border-b border-border">
          <span className="flex-1">
            Selection changed{currentNodeName ? ` to "${currentNodeName}"` : ''}. Results may be stale.
          </span>
          <button
            className="shrink-0 px-2 py-0.5 bg-bg-brand text-fg-onbrand text-11 font-medium rounded hover:opacity-90"
            onClick={handleAnalyze}
          >
            Re-analyze
          </button>
        </div>
      )}

      <ChatContainer
        state={chat}
        componentName={componentName}
        analysisMode={analysisMode}
        miniScore={miniScore}
        onAnalyze={handleAnalyze}
        onSendMessage={handleSendMessage}
        onAction={handleAction}
        onJumpToNode={handleJumpToNode}
        onOpenSettings={() => setShowSettings(true)}
      />
    </div>
  );
}


function buildFullReport(
  result: LintResult,
  componentName?: string,
  issuesFixed?: number,
  aiReview?: AiReviewData | null,
  diff?: DiffResultData | null,
): string {
  const lines = [
    `# Design Review Report: ${componentName || 'Component'}`,
    '',
    `Total lint issues: ${result.summary.totalErrors} across ${result.summary.nodesWithErrors} layers`,
    ...(issuesFixed ? [`Fixed: ${issuesFixed}`] : []),
    '',
  ];

  // Lint breakdown
  lines.push('## Lint Issues', '');
  const byType = result.summary.byType;
  if (byType.fill > 0) lines.push(`- **Fill styles:** ${byType.fill} missing`);
  if (byType.stroke > 0) lines.push(`- **Stroke styles:** ${byType.stroke} missing`);
  if (byType.effect > 0) lines.push(`- **Effect styles:** ${byType.effect} missing`);
  if (byType.text > 0) lines.push(`- **Text styles:** ${byType.text} missing`);
  if (byType.radius > 0) lines.push(`- **Border radius:** ${byType.radius} non-standard`);
  if (byType.spacing > 0) lines.push(`- **Spacing:** ${byType.spacing} off-grid`);
  if (byType.autoLayout > 0) lines.push(`- **Auto Layout:** ${byType.autoLayout} missing`);
  if (byType.visualQuality > 0) lines.push(`- **Visual Quality:** ${byType.visualQuality} issues`);
  if (byType.microcopy > 0) lines.push(`- **Microcopy:** ${byType.microcopy} issues`);

  // AI Review section (rubric-based)
  if (aiReview) {
    lines.push('', '## AI Design Review', '');
    lines.push(`| Category | Rating |`);
    lines.push(`|----------|--------|`);
    lines.push(`| Visual Hierarchy | ${aiReview.visualHierarchy.rating.toUpperCase()} |`);
    lines.push(`| States Coverage | ${aiReview.statesCoverage.rating.toUpperCase()} |`);
    lines.push(`| Platform Alignment | ${aiReview.platformAlignment.rating.toUpperCase()} (${aiReview.platformAlignment.detectedPlatform}) |`);
    lines.push(`| Color Harmony | ${aiReview.colorHarmony.rating.toUpperCase()} |`);
    if (aiReview.visualBalance) lines.push(`| Visual Balance | ${aiReview.visualBalance.rating.toUpperCase()} |`);
    if (aiReview.microcopyQuality) lines.push(`| Microcopy Quality | ${aiReview.microcopyQuality.rating.toUpperCase()} |`);
    if (aiReview.cognitiveLoad) lines.push(`| Cognitive Load | ${aiReview.cognitiveLoad.rating.toUpperCase()} |`);

    const missingStates = aiReview.statesCoverage?.missingStates || [];
    if (missingStates.length > 0) {
      lines.push('', `**Missing states:** ${missingStates.join(', ')}`);
    }

    if (aiReview.recommendations.length > 0) {
      lines.push('', '### Recommendations', '');
      for (const rec of aiReview.recommendations) {
        lines.push(`- **[${rec.severity.toUpperCase()}]** ${rec.title}: ${rec.description}`);
      }
    }

    if (aiReview.summary) {
      lines.push('', `> ${aiReview.summary}`);
    }
  }

  // Baseline diff section
  if (diff) {
    lines.push('', '## Baseline Comparison', '');
    const delta = diff.scoreDelta.overall;
    const arrow = delta > 0 ? '+' : '';
    lines.push(`Score: ${diff.scoreDelta.oldOverall} → ${diff.scoreDelta.newOverall} (${arrow}${delta})`);
    lines.push(`Baseline from: ${new Date(diff.baselineTimestamp).toLocaleString()}`);
    lines.push('');

    if (diff.summary.totalFixed > 0) lines.push(`- **Fixed:** ${diff.summary.totalFixed} issues`);
    if (diff.summary.totalNew > 0) lines.push(`- **New:** ${diff.summary.totalNew} issues`);
    lines.push(`- **Remaining:** ${diff.summary.totalRemaining} issues`);

    // Category deltas
    const changed = diff.scoreDelta.categories.filter(c => c.delta !== 0);
    if (changed.length > 0) {
      lines.push('', '| Category | Before | After | Delta |');
      lines.push('|----------|--------|-------|-------|');
      for (const c of changed) {
        const d = c.delta > 0 ? `+${c.delta}` : `${c.delta}`;
        lines.push(`| ${c.category} | ${c.oldScore} | ${c.newScore} | ${d} |`);
      }
    }
  }

  // All issues detail
  if (result.errors.length > 0) {
    lines.push('', '## All Issues', '');
    for (const err of result.errors) {
      lines.push(`- **[${err.errorType.toUpperCase()}]** ${err.nodeName}: ${err.message}`);
    }
  }

  return lines.join('\n');
}

/**
 * Build a deterministic PageSweepData from plugin-side sweep results (no AI).
 */
function buildDeterministicSweepResult(sweepData: PageSweepRawData): PageSweepData {
  const SEVERITY_WEIGHT: Record<string, number> = { critical: 10, warning: 3, info: 1 };

  const frameResults = sweepData.frames.map((frame) => {
    const errors = frame.lintResult.errors;
    const total = Math.max(frame.lintResult.summary.totalNodes, 1);
    const weightedFailed = errors.reduce((sum, e) => sum + (SEVERITY_WEIGHT[e.severity || 'warning'] || 3), 0);
    const weightedPassed = Math.max(0, total - errors.length) * 10;
    const t = weightedPassed + weightedFailed;
    const score = t > 0 ? Math.round((weightedPassed / t) * 100) : 100;

    const typeCounts: Record<string, number> = {};
    for (const err of errors) {
      typeCounts[err.errorType] = (typeCounts[err.errorType] || 0) + 1;
    }
    const topIssues = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, count]) => `${type} (${count})`);

    return {
      id: frame.id,
      name: frame.name,
      score,
      issueCount: frame.lintResult.summary.totalErrors,
      topIssues,
    };
  });

  const scores = frameResults.map((f) => f.score);
  const overallScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 100;

  const mean = overallScore;
  const variance = scores.length > 0
    ? scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
    : 0;
  const consistencyScore = Math.max(0, Math.round(100 - Math.sqrt(variance)));

  const grade = overallScore >= 90 ? 'excellent' : overallScore >= 70 ? 'needs-work' : 'poor';

  return {
    fileHealth: {
      overallScore,
      grade,
      totalFrames: sweepData.aggregated.totalFrames,
      totalIssues: sweepData.aggregated.totalIssues,
      topIssues: sweepData.aggregated.topIssues,
      consistencyScore,
    },
    frames: frameResults,
    aiInsights: {
      strengths: [],
      weaknesses: [],
      recommendations: [],
      summary: 'AI analysis unavailable. Scores are based on deterministic lint rules only.',
    },
  };
}
