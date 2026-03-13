import type { ChatMessage, AnalysisPhase } from '../../lib/messages';
import { Check, CheckCircle, Save, MessageSquare } from 'lucide-react';
import { ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor } from '@/components/ui/chat-container';
import { Message, MessageContent } from '@/components/ui/message';
import { Loader } from '@/components/ui/loader';
import AiMessage from '../messages/AiMessage';
import ScoreCard from '../messages/ScoreCard';
import IssuesList from '../messages/IssuesList';
import FixResult from '../messages/FixResult';
import AiReviewCard from '../messages/AiReviewCard';
import ReferoGallery from '../messages/ReferoGallery';
import FlowResultCard from '../messages/FlowResultCard';
import DiffCard from '../messages/DiffCard';
import PageSweepCard from '../messages/PageSweepCard';
import DesignDebtCard from '../messages/DesignDebtCard';
import DarkModeCard from '../messages/DarkModeCard';
import A11ySpecCard from '../messages/A11ySpecCard';
import TokenComplianceCard from '../messages/TokenComplianceCard';
import BrandConsistencyCard from '../messages/BrandConsistencyCard';
import CopyToneCard from '../messages/CopyToneCard';
import PersonaResearchCard from '../messages/PersonaResearchCard';
import AttentionHeatmapCard from '../messages/AttentionHeatmapCard';
import ActionButtons from '../shared/ActionButtons';

interface MessageListProps {
  messages: ChatMessage[];
  onAction: (action: string, params?: Record<string, unknown>) => void;
  onJumpToNode: (nodeId: string) => void;
}

export default function MessageList({ messages, onAction, onJumpToNode }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-[280px]">
          <div className="text-[40px] mb-1">
            <MessageSquare size={40} strokeWidth={1.5} className="mx-auto text-fg-tertiary" aria-hidden="true" />
          </div>
          <div>
            <p className="text-13 font-medium text-fg mb-1">Bezier</p>
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
    <ChatContainerRoot className="flex-1 px-3 py-2" aria-label="Chat messages">
      <ChatContainerContent className="space-y-2">
      {messages.map((msg) => {
        const m = msg.message;
        switch (m.kind) {
          case 'ai-text':
            return <AiMessage key={msg.id} content={m.content} streaming={m.streaming} />;
          case 'user-text':
            return (
              <Message key={msg.id} className="flex justify-end">
                <MessageContent className="bg-primary text-primary-foreground rounded-xl rounded-br-sm px-3 py-2 text-12 max-w-[85%]">
                  {m.content}
                </MessageContent>
              </Message>
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
                  <CheckCircle size={14} strokeWidth={2} className="text-fg-success shrink-0" aria-hidden="true" />
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
          case 'page-sweep-result':
            return <PageSweepCard key={msg.id} data={m.data} />;
          case 'design-debt':
            return <DesignDebtCard key={msg.id} data={m.data as any} />;
          case 'dark-mode':
            return <DarkModeCard key={msg.id} data={m.data as any} />;
          case 'a11y-spec':
            return <A11ySpecCard key={msg.id} data={m.data as any} />;
          case 'token-compliance':
            return <TokenComplianceCard key={msg.id} data={m.data as any} />;
          case 'brand-consistency':
            return <BrandConsistencyCard key={msg.id} data={m.data as any} />;
          case 'copy-tone':
            return <CopyToneCard key={msg.id} data={m.data as any} />;
          case 'persona-research':
            return <PersonaResearchCard key={msg.id} data={m.data as any} />;
          case 'attention-heatmap':
            return <AttentionHeatmapCard key={msg.id} data={m.data as any} />;
          case 'baseline-saved':
            return (
              <div key={msg.id} className="bg-bg-success rounded-xl px-3 py-2 text-12">
                <div className="flex items-center gap-1.5">
                  <Save size={14} strokeWidth={2} className="text-fg-success shrink-0" aria-hidden="true" />
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
      <ChatContainerScrollAnchor />
      </ChatContainerContent>
    </ChatContainerRoot>
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
    <div className="bg-bg-secondary rounded-xl px-3 py-2 space-y-1.5" role="status" aria-live="polite">
      {PHASE_ORDER.map((p, i) => {
        const isActive = i === currentIdx && !done;
        const isComplete = i < currentIdx || (done && i === currentIdx);
        const isPending = i > currentIdx;
        const statusText = isComplete ? 'Complete' : isActive ? 'In progress' : 'Pending';

        return (
          <div key={p} className="flex items-center gap-2 text-11">
            {isComplete && (
              <Check size={12} strokeWidth={3} className="text-fg-success shrink-0" aria-hidden="true" />
            )}
            {isActive && (
              <Loader variant="typing" size="sm" className="shrink-0" />
            )}
            {isPending && (
              <div className="w-3 h-3 rounded-full bg-bg-tertiary shrink-0" />
            )}
            <span className={isActive ? 'text-fg font-medium animate-pulse' : isComplete ? 'text-fg-secondary' : 'text-fg-tertiary'}>
              {PHASE_LABELS[p]}{isActive ? '...' : ''}
            </span>
            <span className="sr-only">{statusText}</span>
          </div>
        );
      })}
    </div>
  );
}
