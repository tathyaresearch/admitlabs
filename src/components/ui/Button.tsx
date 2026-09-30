import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import styles from './Button.module.css';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'quiet';
type Size = 'sm' | 'md' | 'lg';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconAfter?: IconName;
  block?: boolean;
  children: ReactNode;
}

function classes(variant: Variant, size: Size, block: boolean | undefined, extra?: string) {
  return [styles.button, styles[variant], styles[size], block ? styles.block : '', extra].filter(Boolean).join(' ');
}

function Content({ icon, iconAfter, loading, children }: Pick<CommonProps, 'icon' | 'iconAfter' | 'children'> & { loading?: boolean }) {
  return (
    <>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : icon ? <Icon name={icon} size={18} /> : null}
      <span className={styles.label}>{children}</span>
      {iconAfter && !loading ? <Icon name={iconAfter} size={18} /> : null}
    </>
  );
}

export interface ButtonProps extends CommonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Shows a spinner and keeps the button from being pressed twice. */
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', icon, iconAfter, block, loading, disabled, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={classes(variant, size, block, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <Content icon={icon} iconAfter={iconAfter} loading={loading}>
        {children}
      </Content>
    </button>
  );
}

export interface ButtonLinkProps extends CommonProps, Omit<ComponentProps<typeof Link>, 'children'> {}

export function ButtonLink({ variant = 'primary', size = 'md', icon, iconAfter, block, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={classes(variant, size, block, className)} {...rest}>
      <Content icon={icon} iconAfter={iconAfter}>
        {children}
      </Content>
    </Link>
  );
}

/** A plain link styled as a button, for addresses the router should not handle (a file download). */
export function AnchorButton({
  variant = 'primary',
  size = 'md',
  icon,
  iconAfter,
  block,
  className,
  children,
  ...rest
}: CommonProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'>) {
  return (
    <a className={classes(variant, size, block, className)} {...rest}>
      <Content icon={icon} iconAfter={iconAfter}>
        {children}
      </Content>
    </a>
  );
}

/** For links that leave Drishti (source links, for example). */
export function ExternalButtonLink({
  variant = 'secondary',
  size = 'md',
  icon,
  block,
  className,
  children,
  ...rest
}: CommonProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'>) {
  return (
    <a className={classes(variant, size, block, className)} target="_blank" rel="noreferrer" {...rest}>
      <Content icon={icon} iconAfter="external">
        {children}
      </Content>
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  /** Required: says what the button does, for screen readers and as a tooltip. */
  label: string;
  variant?: 'quiet' | 'secondary';
  size?: 'sm' | 'md';
}

export function IconButton({ icon, label, variant = 'quiet', size = 'md', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} className={[styles.iconButton, styles[variant], styles[`icon-${size}`], className].filter(Boolean).join(' ')} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={size === 'sm' ? 18 : 20} />
    </button>
  );
}
