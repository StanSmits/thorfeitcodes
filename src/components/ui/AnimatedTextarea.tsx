import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface AnimatedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'> {
  label?: string;
  error?: string;
}

const AnimatedTextarea = React.forwardRef<HTMLTextAreaElement, AnimatedTextareaProps>(
  ({ className, label, error, onFocus, onBlur, onChange, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);

    React.useEffect(() => {
      setHasValue(!!props.value || !!props.defaultValue);
    }, [props.value, props.defaultValue]);

    return (
      <div className="relative">
        <motion.textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 pt-5 pb-2 text-sm ring-offset-background placeholder:text-transparent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none',
            error && 'border-destructive focus-visible:ring-destructive',
            !error && 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            className
          )}
          ref={ref}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e as React.FocusEvent<HTMLTextAreaElement>);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e as React.FocusEvent<HTMLTextAreaElement>);
          }}
          onChange={(e) => {
            setHasValue(!!e.target.value);
            onChange?.(e as React.ChangeEvent<HTMLTextAreaElement>);
          }}
          {...props}
        />
        {label && (
          <motion.label
            initial={false}
            animate={{
              top: isFocused || hasValue ? '0.5rem' : '1.25rem',
              fontSize: isFocused || hasValue ? '0.75rem' : '0.875rem',
            }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'absolute left-3 pointer-events-none origin-left',
              error ? 'text-destructive' : 'text-muted-foreground',
              (isFocused || hasValue) && !error && 'text-foreground'
            )}
          >
            {label}
          </motion.label>
        )}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-destructive mt-1.5"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);
AnimatedTextarea.displayName = 'AnimatedTextarea';

export { AnimatedTextarea };
