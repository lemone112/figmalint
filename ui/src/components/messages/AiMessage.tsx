import { MessageContent } from '@/components/ui/message';
import { Loader } from '@/components/ui/loader';

interface AiMessageProps {
  content: string;
  streaming?: boolean;
}

export default function AiMessage({ content, streaming }: AiMessageProps) {
  if (streaming && !content) {
    return (
      <div className="bg-bg-secondary rounded-xl rounded-bl-sm px-3 py-2 max-w-[90%]">
        <Loader variant="typing" size="sm" />
      </div>
    );
  }

  return (
    <MessageContent
      markdown
      className="bg-bg-secondary rounded-xl rounded-bl-sm px-3 py-2 text-12 text-fg max-w-[90%] prose-sm prose-p:my-0.5 prose-headings:mt-2 prose-headings:mb-1 prose-li:my-0 prose-ul:my-0.5 prose-ol:my-0.5"
    >
      {content}
    </MessageContent>
  );
}
