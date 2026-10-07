import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useMergeRefs } from '@floating-ui/react';
import type { ThemeController } from '@/src/core/appearance';
import { AboutData, type AboutEmpty } from '@/src/react/ui/AboutData';
import type { DataContext } from '@/src/react/ui/data-context';
import { AppIcon } from '@/src/react/ui/icons';
import { IconButton } from '@/src/react/ui/IconButton';
import { GradientScroll } from '@/src/react/ui/GradientScroll';
import {
  searchParams,
  subscribeSearch,
  writeSearch,
} from '@/src/react/ui/search';
import {
  isEditingTarget,
  shortcuts,
  useShortcut,
} from '@/src/react/ui/shortcuts';
import { Tooltip } from '@/src/react/ui/Tooltip';
import { ThemeToggle } from '@/src/react/ui/ThemeSelector';
import { storySteps, type StoryFinding } from '@/src/react/ui/story';

export type StoryStep = {
  id: string;
  empty?: AboutEmpty;
  headline: string;
  context?: string;
  glossaryIds?: string[];
  queryNames?: string[];
  visual: ReactNode;
  visualKind?: 'metric' | 'chart';
};

export type PresentStoryProps = {
  title: string;
  findings: readonly StoryFinding[];
  empty?: AboutEmpty;
  scope?: ReactNode;
  dataContext: DataContext;
  theme?: ThemeController;
  headerActions?: ReactNode;
  footer?: ReactNode;
} & Omit<ComponentPropsWithRef<'button'>, 'title'>;

const stepKeys: Record<string, (index: number, last: number) => number> = {
  ArrowRight(index) {
    return index + 1;
  },
  PageDown(index) {
    return index + 1;
  },
  ArrowLeft(index) {
    return index - 1;
  },
  PageUp(index) {
    return index - 1;
  },
  Home() {
    return 0;
  },
  End(_, last) {
    return last;
  },
};

/**
 * Uses an already loaded snapshot. Navigation is stored in `?present=1&step=`, and step
 * inspection uses `?about=`. The presentation owns its modal structure.
 */
export function PresentStory({
  title,
  findings,
  empty,
  scope,
  dataContext,
  theme,
  headerActions,
  footer,
  children,
  className,
  onClick,
  disabled,
  ref,
  ...props
}: PresentStoryProps) {
  const steps = storySteps(findings, dataContext);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const headline = useRef<HTMLHeadingElement>(null);
  const ownedFullscreenElement = useRef<HTMLElement | null>(null);
  const isOpening = useRef(false);
  const headlineId = useId();
  const contextId = useId();
  const [stepId, setStepId] = useState(steps[0]?.id);
  const triggerRef = useMergeRefs([trigger, ref]);
  const index = Math.max(
    0,
    steps.findIndex(step => step.id === stepId)
  );
  const step = steps[index];
  const stepIds = steps.map(item => item.id).join('\u0000');
  const unavailable = !steps.length || !!disabled;
  const currentSteps = useEffectEvent(() => steps);

  useEffect(() => {
    function syncFromUrl() {
      const params = searchParams();
      const availableSteps = currentSteps();
      if (params.get('present') === '1' && availableSteps.length) {
        const requested = params.get('step');
        setStepId(
          availableSteps.find(item => item.id === requested)?.id ??
            availableSteps[0]!.id
        );
        if (!dialog.current?.open) dialog.current?.showModal();
      } else if (dialog.current?.open) {
        dialog.current.close();
      }
    }
    syncFromUrl();

    return subscribeSearch(syncFromUrl);
  }, [stepIds]);

  useEffect(() => {
    if (dialog.current?.open) headline.current?.focus({ preventScroll: true });
  }, [stepId]);

  useEffect(() => {
    const presentationDialog = dialog.current;
    if (!presentationDialog) return;
    const ownerDocument = presentationDialog.ownerDocument;
    function handleFullscreenChange() {
      const fullscreenElement = ownedFullscreenElement.current;
      if (
        !fullscreenElement ||
        ownerDocument.fullscreenElement === fullscreenElement
      )
        return;
      ownedFullscreenElement.current = null;
      dialog.current?.close();
    }
    ownerDocument.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      ownerDocument.removeEventListener(
        'fullscreenchange',
        handleFullscreenChange
      );
      exitPresentationFullscreen();
    };
  }, []);

  function exitPresentationFullscreen() {
    const fullscreenElement = ownedFullscreenElement.current;
    ownedFullscreenElement.current = null;
    if (!fullscreenElement) return;
    const ownerDocument = fullscreenElement.ownerDocument;
    if (ownerDocument.fullscreenElement === fullscreenElement)
      void ownerDocument.exitFullscreen().catch(() => {});
  }

  function writePresentation(
    id?: string,
    mode: 'replace' | 'push' = 'replace'
  ) {
    writeSearch({ present: id ? '1' : null, step: id ?? null }, mode);
  }

  async function openPresentation() {
    const presentationDialog = dialog.current;
    const firstStep = steps[0];
    if (unavailable || isOpening.current || !presentationDialog || !firstStep)
      return;
    const ownerDocument = presentationDialog.ownerDocument;
    const fullscreenElement = ownerDocument.documentElement;
    isOpening.current = true;
    try {
      if (!ownerDocument.fullscreenElement && ownerDocument.fullscreenEnabled) {
        await fullscreenElement.requestFullscreen();
        ownedFullscreenElement.current = fullscreenElement;
      }
    } catch {
      // Keep the presentation available when fullscreen is denied.
    } finally {
      isOpening.current = false;
    }
    if (!presentationDialog.isConnected) {
      exitPresentationFullscreen();
      return;
    }
    setStepId(firstStep.id);
    presentationDialog.showModal();
    headline.current?.focus({ preventScroll: true });
    writePresentation(firstStep.id, 'push');
  }

  useShortcut(shortcuts.playStory, openPresentation, !unavailable);

  function goTo(nextIndex: number) {
    const next = steps[nextIndex];
    if (!next) return;
    setStepId(next.id);
    writePresentation(next.id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (
      !(event.target instanceof HTMLElement) ||
      event.target.closest('dialog') !== event.currentTarget
    )
      return;
    const move = stepKeys[event.key];
    if (
      !move ||
      isEditingTarget(event.target) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    event.preventDefault();
    goTo(move(index, steps.length - 1));
  }

  return (
    <>
      <span className="altertable-present-launch">
        <IconButton
          {...props}
          ref={triggerRef}
          icon="present"
          variant="elevated"
          label={props['aria-label'] ?? 'Present story'}
          shortcut={shortcuts.playStory}
          tooltipAlign="end"
          className={className}
          disabled={unavailable}
          onClick={event => {
            onClick?.(event);
            if (!event.defaultPrevented) void openPresentation();
          }}
        >
          {children}
        </IconButton>
      </span>
      <dialog
        ref={dialog}
        className="altertable-present-dialog"
        aria-labelledby={headlineId}
        aria-describedby={step?.context ? contextId : undefined}
        onClose={event => {
          if (event.target !== event.currentTarget) return;
          exitPresentationFullscreen();
          if (searchParams().get('present') === '1') writePresentation();
          trigger.current?.focus({ preventScroll: true });
        }}
        onKeyDown={event => {
          if (!event.defaultPrevented) handleKeyDown(event);
        }}
      >
        {step && (
          <div className="altertable-present-shell">
            <header className="altertable-present-header">
              <div className="altertable-present-title">
                <strong>{title}</strong>
                {scope && (
                  <>
                    <span
                      className="altertable-present-connector"
                      aria-hidden="true"
                    >
                      /
                    </span>
                    {scope}
                  </>
                )}
              </div>
              <div className="altertable-present-actions">
                <span
                  className="altertable-present-count"
                  aria-label={`Finding ${index + 1} of ${steps.length}`}
                >
                  {index + 1} / {steps.length}
                </span>
                {theme && (
                  <span className="altertable-present-theme">
                    <ThemeToggle theme={theme} portalRoot={dialog} />
                  </span>
                )}
                {headerActions}
                <IconButton
                  icon="close"
                  variant="ghost"
                  label="Exit presentation"
                  shortcut={{ label: 'Esc', aria: 'Escape' }}
                  tooltipAlign="end"
                  portalRoot={dialog}
                  onClick={() => dialog.current?.close()}
                />
              </div>
            </header>
            <GradientScroll className="altertable-present-main" key={step.id}>
              <div className="altertable-present-copy">
                <h2 id={headlineId} ref={headline} tabIndex={-1}>
                  {step.headline}
                </h2>
                {step.context && <p id={contextId}>{step.context}</p>}
                <div className="altertable-present-explore">
                  <AboutData
                    shortcut={false}
                    key={step.id}
                    id={step.id}
                    empty={step.empty ?? empty}
                    title={step.headline}
                    description={step.context}
                    visual={step.visual}
                    visualKind={step.visualKind}
                    dataContext={dataContext}
                    tab={step.glossaryIds?.length ? 'glossary' : 'queries'}
                    references={{
                      kind: 'ids',
                      glossaryIds: step.glossaryIds,
                      queryNames: step.queryNames,
                    }}
                    tooltip="Explore this finding"
                    variant="outline"
                    portalRoot={dialog}
                  >
                    <AppIcon name="explore" /> Explore sources
                  </AboutData>
                </div>
              </div>
              <div
                className="altertable-present-visual"
                data-kind={step.visualKind}
              >
                {step.visual}
              </div>
            </GradientScroll>
            <nav className="altertable-present-nav" aria-label="Story findings">
              <IconButton
                icon="previous"
                variant="ghost"
                label="Previous step"
                shortcut={{ label: '←', aria: 'ArrowLeft' }}
                tooltipPlacement="top"
                tooltipAlign="start"
                portalRoot={dialog}
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
              />
              <div className="altertable-present-dots">
                {steps.map((item, itemIndex) => (
                  <Tooltip
                    key={item.id}
                    content={item.headline}
                    placement="top"
                    portalRoot={dialog}
                  >
                    <button
                      type="button"
                      aria-label={`Finding ${itemIndex + 1}: ${item.headline}`}
                      aria-current={itemIndex === index ? 'step' : undefined}
                      onClick={() => goTo(itemIndex)}
                    />
                  </Tooltip>
                ))}
              </div>
              <IconButton
                icon="next"
                variant="ghost"
                label="Next step"
                shortcut={{ label: '→', aria: 'ArrowRight' }}
                tooltipPlacement="top"
                tooltipAlign="end"
                portalRoot={dialog}
                onClick={() => goTo(index + 1)}
                disabled={index === steps.length - 1}
              />
            </nav>
            {footer}
          </div>
        )}
      </dialog>
    </>
  );
}
