import { useCallback } from 'react';
import { Loader } from '@/components/ui/loader';
import StickyHeader from './StickyHeader';
import MessageList from './MessageList';
import InputBar from './InputBar';
import QuickActions from '../shared/QuickActions';
import type { ChatState } from '../../hooks/useChat';
import type { MiniScoreData } from '../../lib/messages';

interface ChatContainerProps {
  state: ChatState;
  componentName?: string;
  analysisMode?: 'quick' | 'deep';
  miniScore?: MiniScoreData | null;
  isActionLoading?: boolean;
  onAnalyze: () => void;
  onSendMessage: (text: string) => void;
  onAction: (action: string, params?: Record<string, unknown>) => void;
  onJumpToNode: (nodeId: string) => void;
  onOpenSettings?: () => void;
}

export default function ChatContainer({
  state,
  componentName,
  analysisMode,
  miniScore,
  isActionLoading,
  onAnalyze,
  onSendMessage,
  onAction,
  onJumpToNode,
  onOpenSettings,
}: ChatContainerProps) {
  const { messages, score, lintResult, isAnalyzing, issuesFixed, baselineMeta, lastDiff, prevScore } = state;
  const totalIssues = lintResult?.summary.totalErrors || 0;
  const hasResults = messages.length > 0;

  const handleAction = useCallback(
    (action: string, params?: Record<string, unknown>) => {
      if (action === 'rescan') {
        onAnalyze();
      } else {
        onAction(action, params);
      }
    },
    [onAnalyze, onAction]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header with score */}
      <StickyHeader
        componentName={componentName}
        score={score}
        totalIssues={totalIssues}
        issuesFixed={issuesFixed}
        lastDiff={lastDiff}
        miniScore={miniScore}
        prevScore={prevScore}
        onOpenSettings={onOpenSettings}
      />

      {/* Message stream */}
      {isAnalyzing ? (
        <div className="flex-1 flex items-center justify-center" role="status" aria-live="polite">
          <div className="text-center space-y-2">
            <Loader variant="typing" size="md" />
            <p className="text-12 text-fg-secondary">Analyzing...</p>
          </div>
        </div>
      ) : (
        <MessageList messages={messages} onAction={handleAction} onJumpToNode={onJumpToNode} />
      )}

      {/* Bottom bar */}
      <div>
        {hasResults && (
          <QuickActions
            onAnalyze={onAnalyze}
            hasFixable={(lintResult?.errors.filter(e => e.errorType === 'spacing' || e.errorType === 'radius').length || 0) > 0}
            analysisMode={analysisMode}
            hasBaseline={!!baselineMeta}
            isLoading={isActionLoading}
            onAction={handleAction}
          />
        )}
        <InputBar onSend={onSendMessage} disabled={isAnalyzing} />
      </div>
    </div>
  );
}
