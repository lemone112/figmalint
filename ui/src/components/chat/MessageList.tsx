import { useEffect, useRef } from 'react';
import type { ChatMessage, AnalysisPhase } from '../../lib/messages';
import AiMessage from '../messages/AiMessage';
import ScoreCard from '../messages/ScoreCard';
import IssuesList from '../messages/IssuesList';
import FixResult from '../messages/FixResult';
import AiReviewCard from '../messages/AiReviewCard';
import ReferoGallery from '../messages/ReferoGallery';
import FlowResultCard from '../messages/FlowResultCard';
import DiffCard from '../messages/DiffCard';
import ActionButtons from '../shared/ActionButtons';

interface MessageListProps {
  messages: ChatMessage[];
  onAction: (action: string, params?: Record<string, unknown>) => void;
  onJumpToNode: (nodeId: string) => void;
}

export default function MessageList({ messages, onAction, onJumpToNode }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-[280px]">
          <div className="text-[40px] mb-1">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-fg-tertiary" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-13 font-medium text-fg mb-1">FigmaLint</p>
            <p className="text-11 text-fg-secondary">AI-powered design quality review</p>
          </div>
          <div className="text-left space-y-2">
            <div className="flex items-start gap-2 text-11">
              <span className="shrink-0 w-5 h-5 rounded-full bg-bg-brand text-fg-onbrand flex items-center justify-center text-[10px] font-bold mt-0.5">1</span>
              <span className="text-fg-secondary"><strong className="text-fg">Select</strong> a component or frame on the canvas</span>
            </div>
            <div className="flex items-start gap-2 text-11">
              <span className="shrink-0 w-5 h-5 rounded-full bg-bg-brand text-fg-onbrand flex items-center justify-center text-[10px] font-bold mt-0.5">2</span>
              <span className="text-fg-secondary"><strong className="text-fg">Analyze</strong> to check design rules, visual quality, and token usage</span>
            </div>
            <div className="flex items-start gap-2 text-11">
              <span className="shrink-0 w-5 h-5 rounded-full bg-bg-brand text-fg-onbrand flex items-center justify-center text-[10px] font-bold mt-0.5">3</span>
              <span className="text-fg-secondary"><strong className="text-fg">Fix</strong> auto-fixable issues with one click, or chat with AI for guidance</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div role="log" aria-live="polite" aria-label="Chat messages" className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
      {messages.map((msg) => {
        const m = msg.message;
        switch (m.kind) {
          case 'ai-text':
            return <AiMessage key={msg.id} content={m.content} />;
          case 'user-text':
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="bg-bg-brand text-fg-onbrand rounded-xl rounded-br-sm px-3 py-2 text-12 max-w-[85%]">
                  {m.content}
                </div>
              </div>
            );
          case 'score-card':
            return <ScoreCard key={msg.id} data={m.data} />;
          case 'issues-list':
            return <IssuesList key={msg.id} errors={m.data} onJumpToNode={onJumpToNode} />;
          case 'fix-result':
            return <FixResult key={msg.id} data={m.data} />;
          case 'issue-detail':
            return (
              <div key={msg.id} className="bg-bg-secondary rounded-xl px-3 py-2 text-12 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-fg">{m.data.nodeName}</span>
                  <span className="text-10 text-fg-tertiary">{m.data.errorType}</span>
                </div>
                <p className="text-11 text-fg-secondary">{m.data.message}</p>
                {m.data.value && (
                  <p className="text-10 text-fg-tertiary font-mono">{m.data.value}</p>
                )}
              </div>
            );
          case 'action-buttons':
            return <ActionButtons key={msg.id} buttons={m.buttons} onAction={onAction} />;
          case 'batch-summary':
            return (
              <div key={msg.id} className="bg-bg-success rounded-xl px-3 py-2 text-12">
                <div className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-success shrink-0" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>
                    <strong>{m.data.applied}</strong> of {m.data.total} fixes applied
                    {m.data.failed > 0 && <span className="text-fg-danger"> ({m.data.failed} failed)</span>}
                  </span>
                </div>
              </div>
            );
          case 'ai-review':
            return <AiReviewCard key={msg.id} data={m.data} />;
          case 'refero-gallery':
            return <ReferoGallery key={msg.id} data={m.data} />;
          case 'analysis-phase':
            return <AnalysisPhaseIndicator key={msg.id} phase={m.phase} done={m.done} />;
          case 'flow-result':
            return <FlowResultCard key={msg.id} data={m.data} onJumpToNode={onJumpToNode} />;
          case 'diff-result':
            return <DiffCard key={msg.id} data={m.data} />;
          case 'baseline-saved':
            return (
              <div key={msg.id} className="bg-bg-success rounded-xl px-3 py-2 text-12">
                <div className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-success shrink-0" aria-hidden="true">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  <span>Baseline saved (score: {m.data.overall}/100)</span>
                </div>
              </div>
            );
          case 'score-update': {
            const diff = m.data.newScore - m.data.oldScore;
            const arrow = diff > 0 ? '\u2191' : diff < 0 ? '\u2193' : '\u2192';
            const color = diff > 0 ? 'text-fg-success' : diff < 0 ? 'text-fg-danger' : 'text-fg-secondary';
            return (
              <div key={msg.id} className="bg-bg-secondary rounded-xl px-3 py-2 text-12">
                <span className={color}>
                  Score: {m.data.oldScore} {arrow} {m.data.newScore} ({diff > 0 ? '+' : ''}{diff})
                </span>
                {m.data.issuesRemaining > 0 && (
                  <span className="text-fg-secondary ml-2">
                    {m.data.issuesRemaining} issue{m.data.issuesRemaining !== 1 ? 's' : ''} remaining
                  </span>
                )}
              </div>
            );
          }
          default:
            return null;
        }
      })}
      <div ref={endRef} />
    </div>
  );
}

const PHASE_LABELS: Record<AnalysisPhase, string> = {
  lint: 'Checking design rules',
  screenshot: 'Capturing screenshot',
  'ai-review': 'Analyzing visual quality',
  refero: 'Finding similar designs',
};

const PHASE_ORDER: AnalysisPhase[] = ['lint', 'screenshot', 'ai-review', 'refero'];

function AnalysisPhaseIndicator({ phase, done }: { phase: AnalysisPhase; done?: boolean }) {
  const currentIdx = PHASE_ORDER.indexOf(phase);

  return (
    <div className="bg-bg-secondary rounded-xl px-3 py-2 space-y-1.5">
      {PHASE_ORDER.map((p, i) => {
        const isActive = i === currentIdx && !done;
        const isComplete = i < currentIdx || (done && i === currentIdx);
        const isPending = i > currentIdx;

        return (
          <div key={p} className="flex items-center gap-2 text-11">
            {isComplete && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-fg-success shrink-0" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {isActive && (
              <div className="w-3 h-3 border-[1.5px] border-bg-brand border-t-transparent rounded-full animate-spin shrink-0" />
            )}
            {isPending && (
              <div className="w-3 h-3 rounded-full bg-bg-tertiary shrink-0" />
            )}
            <span className={isActive ? 'text-fg font-medium' : isComplete ? 'text-fg-secondary' : 'text-fg-tertiary'}>
              {PHASE_LABELS[p]}{isActive ? '...' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
