import React, { forwardRef } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'      // Brand brown/gold
  | 'secondary'    // Subtle neutral filled
  | 'outline'      // Subtle border, transparent bg
  | 'ghost'        // Flat, hover subtle
  | 'destructive'  // Rose/red for deletes and critical actions
  | 'whatsapp'     // Emerald green for WhatsApp actions
  | 'accent';      // Soft brand accent tint

export type ButtonSize =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'icon-xs'
  | 'icon-sm'
  | 'icon'
  | 'icon-lg';

export type ButtonRounded = 'lg' | 'xl' | '2xl' | 'full';

export interface ButtonVariantOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  rounded?: ButtonRounded;
  className?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white shadow-2xs border border-[var(--color-imamu-brown-dark)]/40',
  secondary: 'bg-slate-100 hover:bg-slate-200/90 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700/80 shadow-2xs',
  outline: 'border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white',
  ghost: 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-200',
  destructive: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-2xs',
  whatsapp: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs',
  accent: 'bg-[var(--color-imamu-accent)]/15 hover:bg-[var(--color-imamu-accent)]/25 text-[var(--color-imamu-accent)] border border-[var(--color-imamu-accent)]/30 shadow-2xs',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-[11px] font-bold gap-1',
  sm: 'px-3 py-1.5 text-xs font-bold gap-1.5',
  md: 'px-4 py-2.5 text-xs font-bold gap-2',
  lg: 'px-6 py-3.5 text-sm sm:text-base font-bold gap-2.5',
  'icon-xs': 'p-1',
  'icon-sm': 'p-1.5',
  icon: 'p-2',
  'icon-lg': 'p-3',
};

const roundedStyles: Record<ButtonRounded, string> = {
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

/**
 * Utility to generate standardized button classes for buttons, links, or anchor tags.
 */
export function buttonVariants({
  variant = 'primary',
  size = 'md',
  rounded = 'xl',
  className = '',
}: ButtonVariantOptions = {}): string {
  return clsx(
    'btn-rise inline-flex items-center justify-center font-sans select-none whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100',
    variantStyles[variant],
    sizeStyles[size],
    roundedStyles[rounded],
    className
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  rounded?: ButtonRounded;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export interface ButtonLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  rounded?: ButtonRounded;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    rounded = 'xl',
    isLoading = false,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={buttonVariants({ variant, size, rounded, className })}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>
      )}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
    </button>
  );
});

Button.displayName = 'Button';

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  {
    variant = 'primary',
    size = 'md',
    rounded = 'xl',
    leftIcon,
    rightIcon,
    className,
    children,
    ...props
  },
  ref
) {
  return (
    <a
      ref={ref}
      className={buttonVariants({ variant, size, rounded, className })}
      {...props}
    >
      {leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
    </a>
  );
});

ButtonLink.displayName = 'ButtonLink';
