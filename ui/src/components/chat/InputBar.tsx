import { useState, useCallback } from 'react';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from '@/components/ui/prompt-input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface InputBarProps {
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function InputBar({
  onSend,
  placeholder = 'Ask about this component...',
  disabled = false,
}: InputBarProps) {
  const [value, setValue] = useState('');

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  }, [value, onSend]);

  const isSubmitDisabled = disabled || !value.trim();

  return (
    <PromptInput
      value={value}
      onValueChange={setValue}
      isLoading={disabled}
      onSubmit={handleSubmit}
      className="rounded-none border-t border-border border-x-0 border-b-0 shadow-none p-1.5"
    >
      <PromptInputTextarea
        placeholder={placeholder}
        className="!min-h-[32px] text-12 placeholder:text-fg-disabled"
        aria-label="Chat message"
      />

      <PromptInputActions className="justify-end">
        <PromptInputAction tooltip="Send">
          <Button
            type="button"
            variant="default"
            size="icon"
            className="h-6 w-6 rounded-md"
            disabled={isSubmitDisabled}
            onClick={handleSubmit}
            aria-label="Send message"
          >
            <Send className="!size-3" />
          </Button>
        </PromptInputAction>
      </PromptInputActions>
    </PromptInput>
  );
}
