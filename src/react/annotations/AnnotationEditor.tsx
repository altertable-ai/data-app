import type { ComponentRef, CSSProperties, Ref } from 'react';
import { ArrowUp } from 'lucide-react';
import type { AnnotationEditorState } from '@/src/react/annotations/annotation-editor-state';
import { Button } from '@/src/react/ui/Button';
import { Kbd } from '@/src/react/ui/Kbd';
import { isPlainKeyEvent } from '@/src/react/ui/keyboard';
import {
  ariaKeyShortcuts,
  matchesShortcut,
  shortcuts,
} from '@/src/react/ui/shortcuts';
import { AnnotationTooltip } from '@/src/react/annotations/AnnotationTooltip';

type AnnotationEditorProps = {
  editor: AnnotationEditorState;
  editorRef: Ref<ComponentRef<'section'>>;
  textareaRef: Ref<ComponentRef<'textarea'>>;
  style: CSSProperties;
  disabled: boolean;
  onCommentChange: (comment: string) => void;
  onSubmit: () => void;
  onSend: () => void;
  onRetryScreenshot: () => void;
  onShakeEnd: () => void;
};

export function AnnotationEditor({
  editor,
  editorRef,
  textareaRef,
  style,
  disabled,
  onCommentChange,
  onSubmit,
  onSend,
  onRetryScreenshot,
  onShakeEnd,
}: AnnotationEditorProps) {
  const submitLabel = editor.annotationId
    ? 'Save annotation'
    : 'Add annotation';
  return (
    <section
      data-annotation-ui
      ref={editorRef}
      style={style}
      className="altertable-annotation-composer"
      data-shaking={editor.shaking || undefined}
      onAnimationEnd={onShakeEnd}
      aria-label="Annotation editor"
    >
      <textarea
        data-atbl-control="text"
        aria-label="Annotation text"
        aria-keyshortcuts={`Enter ${ariaKeyShortcuts(shortcuts.sendAnnotations)}`}
        placeholder="Describe what to change…"
        ref={textareaRef}
        rows={1}
        maxLength={2000}
        value={editor.comment}
        disabled={disabled}
        onChange={event => onCommentChange(event.target.value)}
        onKeyDown={event => {
          if (matchesShortcut(event.nativeEvent, shortcuts.sendAnnotations)) {
            event.preventDefault();
            event.stopPropagation();
            event.nativeEvent.stopImmediatePropagation();
            onSend();
            return;
          }
          if (event.key === 'Enter' && isPlainKeyEvent(event.nativeEvent)) {
            event.preventDefault();
            if (editor.comment.trim()) onSubmit();
          }
        }}
      />
      <AnnotationTooltip
        content={
          <>
            {submitLabel} <Kbd>Enter</Kbd>
          </>
        }
      >
        <Button
          aria-label={submitLabel}
          onClick={onSubmit}
          className="altertable-annotation-submit"
          size="icon-compact"
          variant="elevated"
          disabled={
            disabled ||
            !editor.comment.trim() ||
            editor.captureStatus !== 'ready'
          }
        >
          <ArrowUp size={16} aria-hidden />
        </Button>
      </AnnotationTooltip>
      {editor.captureStatus === 'capturing' && (
        <output className="altertable-annotation-capture-status">
          Capturing screenshot…
        </output>
      )}
      {editor.captureStatus === 'failed' && (
        <div className="altertable-annotation-capture-status">
          <p role="alert">Screenshot capture failed. Your text is preserved.</p>
          <Button
            size="compact"
            disabled={disabled}
            onClick={onRetryScreenshot}
          >
            Retry screenshot
          </Button>
        </div>
      )}
      {editor.error && <p role="alert">{editor.error}</p>}
    </section>
  );
}
