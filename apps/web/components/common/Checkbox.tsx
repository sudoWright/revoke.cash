import { twMerge } from 'tailwind-merge';
import Check from './icons/Check';
import Minus from './icons/Minus';

// Shaped to satisfy TanStack table selection handlers
export interface CheckboxToggleEvent {
  target: { checked: boolean };
  shiftKey: boolean;
  nativeEvent: MouseEvent | KeyboardEvent;
}

interface Props {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange?: (event: CheckboxToggleEvent) => void;
  className?: string;
  iconClassName?: string;
}

// Note: this is a controlled checkbox, so the checked prop must be passed in
const Checkbox = ({ checked, indeterminate, disabled, onChange, className, iconClassName }: Props) => {
  const iconClasses = twMerge('w-4 h-4', iconClassName);

  const classes = twMerge(
    'border border-zinc-300 dark:border-zinc-700 flex justify-center rounded-sm items-center cursor-pointer focus:outline-hidden focus:border-black dark:focus:border-white',
    iconClasses,
    className,
    (checked || indeterminate) && 'bg-brand text-black border-0',
    disabled && 'cursor-not-allowed bg-zinc-300 dark:bg-zinc-500 border-0',
  );

  const icon = disabled ? null : checked ? (
    <Check className={iconClasses} />
  ) : indeterminate ? (
    <Minus className={iconClasses} />
  ) : null;

  const emitToggle = (event: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    onChange?.({
      target: { checked: !checked },
      shiftKey: event.shiftKey,
      nativeEvent: event.nativeEvent,
    });
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: we want to use a div instead of a native checkbox for styling reasons
    <div
      role="checkbox"
      aria-checked={checked}
      className={classes}
      onClick={emitToggle}
      onKeyDown={(event) => event.key === 'Enter' && emitToggle(event)}
      // Prevent default text selection behavior on shift-click
      onMouseDown={(event) => event.preventDefault()}
      tabIndex={0}
    >
      {icon}
    </div>
  );
};

export default Checkbox;
