import type { ComponentPropsWithRef } from 'react';
import {
  Button as AriaButton,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
} from 'react-aria-components';
import { IconButton } from '@/src/react/ui/IconButton';
import { AppIcon } from '@/src/react/ui/icons';
import { classNames } from '@/src/react/ui/classNames';

export type LiveIntervalSeconds = 30 | 60 | 300;

const intervals = [
  { seconds: 30, label: 'Every 30 seconds' },
  { seconds: 60, label: 'Every minute' },
  { seconds: 300, label: 'Every 5 minutes' },
] as const;
const frequencies: Record<LiveIntervalSeconds, string> = {
  30: 'every 30 seconds',
  60: 'every minute',
  300: 'every 5 minutes',
};

export type LiveControlProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  intervalSeconds: LiveIntervalSeconds;
  onIntervalChange: (seconds: LiveIntervalSeconds) => void;
} & Omit<ComponentPropsWithRef<'button'>, 'children' | 'onClick' | 'onChange'>;

/** Toggle an app-owned recurring refresh. The app supplies the timer and its cadence. */
export function LiveControl({
  enabled,
  onChange,
  intervalSeconds,
  onIntervalChange,
  className,
  ...props
}: LiveControlProps) {
  const frequency = frequencies[intervalSeconds];

  return (
    <div
      className={classNames('altertable-live-control', className)}
      data-active={enabled}
    >
      <IconButton
        data-atbl-focus="inset"
        {...props}
        icon="live"
        variant="ghost"
        label={
          props['aria-label'] ??
          (enabled ? 'Pause live updates' : 'Start live updates')
        }
        aria-pressed={enabled}
        onClick={() => onChange(!enabled)}
      />
      <Select
        aria-label={`Live update frequency: ${frequency}`}
        selectedKey={String(intervalSeconds)}
        onSelectionChange={key => {
          const interval = intervals.find(
            option => option.seconds === Number(key)
          );
          if (interval) onIntervalChange(interval.seconds);
        }}
        className="altertable-live-frequency"
      >
        <AriaButton
          data-atbl-internal-surface="control"
          data-atbl-focus="inset"
          data-atbl-control="action"
          aria-label={`Live update frequency: ${frequency}`}
        >
          <SelectValue className="altertable-visually-hidden" />
          <AppIcon name="disclosure" size={14} />
        </AriaButton>
        <Popover
          placement="bottom end"
          className="altertable-live-frequency-popover"
        >
          <ListBox aria-label="Live update frequency">
            {intervals.map(interval => (
              <ListBoxItem
                data-atbl-internal-surface="option"
                data-atbl-focus="inset"
                data-atbl-control="action"
                key={interval.seconds}
                id={String(interval.seconds)}
                textValue={interval.label}
              >
                {interval.label}
                <AppIcon name="check" size={15} />
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </Select>
    </div>
  );
}
