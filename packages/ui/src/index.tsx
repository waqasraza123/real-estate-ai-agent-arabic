import { cva, type VariantProps } from "class-variance-authority";
import clsx, { type ClassValue } from "clsx";
import type { ComponentPropsWithoutRef, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

export function cx(...values: ClassValue[]): string {
  return twMerge(clsx(values));
}

export const pageStackClassName = "flex flex-col gap-6 lg:gap-7";
export const pageTransitionClassName = "animate-fade-slide-up";
export const metricGridClassName = "grid gap-4 sm:grid-cols-2 xl:grid-cols-4";
export const twoColumnGridClassName = "grid gap-6 xl:grid-cols-2";
export const heroShellClassName = "grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]";
export const stackListClassName = "flex flex-col gap-4";
export const rowBetweenClassName = "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";
export const stackTightClassName = "flex flex-col gap-1.5";
export const statusRowWrapClassName = "flex flex-wrap items-center gap-2";
export const caseMetaClassName = "text-sm text-ink-muted [unicode-bidi:plaintext]";
export const panelSummaryClassName = "text-sm leading-7 text-ink-soft sm:text-[0.96rem]";
export const placeholderNoticeClassName =
  "rounded-3xl border border-dashed border-canvas-line/80 bg-canvas-raised/85 px-5 py-4 text-sm leading-7 text-ink-soft";
export const inlineLinkClassName =
  "inline-flex items-center gap-2 text-sm font-semibold text-brand-700 transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas-raised";

export const heroCopyClassName =
  "relative overflow-hidden rounded-5xl border border-canvas-line/80 bg-panel-gradient px-6 py-8 shadow-panel-lg sm:px-8 sm:py-10";
export const heroEyebrowClassName = "text-xs font-semibold tracking-[0.24em] text-sand-700";
export const heroTitleClassName =
  "max-w-[14ch] text-balance text-4xl font-semibold leading-none tracking-[-0.04em] text-ink sm:text-5xl xl:text-7xl";
export const heroSummaryClassName = "max-w-2xl text-base leading-8 text-ink-soft";
export const heroActionsClassName = "mt-6 flex flex-wrap items-center gap-3";

export const screenIntroClassName = "flex flex-col gap-2";
export const screenIntroBadgeClassName = "text-xs font-semibold tracking-[0.22em] text-sand-700";
export const screenIntroTitleClassName =
  "text-balance text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl xl:text-5xl";
export const screenIntroSummaryClassName = "max-w-3xl text-base leading-8 text-ink-soft";

export const formStackClassName = "flex flex-col gap-4";
export const fieldGridClassName = "grid gap-4 lg:grid-cols-2";
export const fieldStackClassName = "flex flex-col gap-2";
export const fieldLabelClassName = "text-xs font-semibold tracking-[0.18em] text-ink-soft";
export const fieldSpanFullClassName = "lg:col-span-2";
export const formActionsRowClassName = "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center";
export const formHelperClassName = "text-sm leading-7 text-ink-soft";
export const fieldNoteClassName = "text-sm leading-7 text-ink-soft";
export const technicalValueClassName = "text-left [direction:ltr] [unicode-bidi:plaintext]";

export const cardBaseClassName =
  "rounded-4xl border border-canvas-line/80 bg-canvas-raised/95 p-5 shadow-panel transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-panel-lg sm:p-6";
export const cardTitleClassName = "text-base font-semibold tracking-[-0.02em] text-ink";
export const bodyTextClassName = "text-sm leading-7 text-ink-soft";
const cardDescendantTitleClassName = "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:tracking-[-0.02em] [&_h3]:text-ink";
const cardDescendantBodyClassName = "[&_p]:text-sm [&_p]:leading-7 [&_p]:text-ink-soft";
export const metricLabelClassName = "text-xs font-semibold tracking-[0.18em] text-ink-soft";
export const metricValueClassName = "text-4xl font-semibold tracking-[-0.04em] text-ink";
export const metricDetailClassName = "text-sm leading-7 text-ink-soft";
export function metricTileClassName(tone: "ocean" | "sand" | "mint" | "rose") {
  const toneClassName =
    tone === "ocean"
      ? "border-ai-100/90 bg-gradient-to-b from-ai-50 to-white"
      : tone === "sand"
        ? "border-sand-100/90 bg-gradient-to-b from-sand-50 to-white"
        : tone === "mint"
          ? "border-brand-100/90 bg-gradient-to-b from-brand-50 to-white"
          : "border-danger-100/90 bg-gradient-to-b from-danger-50 to-white";

  return cx("flex min-h-44 flex-col justify-between rounded-4xl border p-5 shadow-panel transition duration-300 hover:-translate-y-0.5 hover:shadow-panel-lg", toneClassName);
}
export const alertCardClassName = cx(cardBaseClassName, "border-warning-200/80 bg-warning-50/70", cardDescendantTitleClassName, cardDescendantBodyClassName);
export const criticalAlertCardClassName = cx(cardBaseClassName, "border-danger-200/80 bg-danger-50/70", cardDescendantTitleClassName, cardDescendantBodyClassName);
export const successCardClassName = cx(cardBaseClassName, "border-success-200/80 bg-success-50/70", cardDescendantTitleClassName, cardDescendantBodyClassName);
export const caseLinkCardClassName =
  cx(
    "group rounded-4xl border border-canvas-line/80 bg-canvas-raised/95 p-5 shadow-panel transition duration-300 ease-out hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-panel-lg sm:flex sm:items-start sm:justify-between sm:gap-4 sm:p-6",
    cardDescendantTitleClassName,
    cardDescendantBodyClassName
  );
export const caseLinkAsideClassName = "mt-4 flex flex-wrap items-center gap-2 sm:mt-0";
export const caseStackCardClassName = cx(cardBaseClassName, "space-y-3");
export const slotCardClassName = cx(cardBaseClassName, "space-y-3");
export const messageThreadClassName = "flex flex-col gap-4";
export const messageCardClassName = "rounded-4xl border border-canvas-line/80 bg-canvas-raised/95 p-5 shadow-panel";
export const messageMetaClassName = "text-xs text-ink-muted [unicode-bidi:plaintext]";
export const timelineListClassName = "flex flex-col gap-4";
export const timelineItemClassName = "rounded-4xl border border-canvas-line/80 bg-canvas-raised/95 p-5 shadow-panel";
export const interventionCardClassName = cx("rounded-4xl border border-canvas-line/80 bg-canvas-raised/95 p-5 shadow-panel", cardDescendantTitleClassName, cardDescendantBodyClassName);
export const interventionOpenCardClassName = cx(interventionCardClassName, "border-warning-200/80 bg-warning-50/70");
export const interventionResolvedCardClassName = cx(interventionCardClassName, "border-success-200/80 bg-success-50/70");
export const detailListClassName = "grid gap-4 rounded-4xl border border-canvas-line/80 bg-canvas-raised/95 p-5 shadow-panel sm:grid-cols-2";
export const detailGridClassName = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3";
export const detailLabelClassName = "text-xs font-semibold tracking-[0.18em] text-ink-soft";
export const detailValueClassName = "mt-1 text-sm leading-7 text-ink";
export const documentRowClassName =
  "rounded-4xl border border-canvas-line/80 bg-canvas-raised/95 p-5 shadow-panel transition duration-300 ease-out sm:flex sm:items-start sm:justify-between sm:gap-4";
export const documentRowActionsClassName = "mt-4 flex flex-wrap items-center gap-2 sm:mt-0 sm:justify-end";
export const slotGridClassName = "grid gap-3 sm:grid-cols-2";
export const bulkFollowUpShellClassName = "flex flex-col gap-4 rounded-4xl border border-ai-100/80 bg-ai-50/70 p-5 shadow-panel";
export const dataTableWrapperClassName = "overflow-x-auto";
export const dataTableClassName = "min-w-[62rem] w-full border-separate border-spacing-0";
export const dataTableHeadClassName = "border-b border-canvas-line/80";
export const dataTableHeaderCellClassName =
  "border-b border-canvas-line/80 px-0 py-4 text-start text-xs font-semibold tracking-[0.18em] text-ink-soft";
export const dataTableCellClassName = "border-b border-canvas-line/80 px-0 py-4 align-top text-sm text-ink";
export const tableLinkClassName = "group inline-flex flex-col gap-1 transition duration-200 hover:-translate-y-0.5";
export const tableLinkTitleClassName = "text-sm font-semibold text-ink";
export const tableLinkMetaClassName = "text-sm text-ink-muted [unicode-bidi:plaintext]";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55",
  {
    defaultVariants: {
      size: "default",
      tone: "primary"
    },
    variants: {
      size: {
        default: "min-h-12 px-5",
        sm: "min-h-10 px-4",
        lg: "min-h-14 px-6 text-base"
      },
      tone: {
        ghost:
          "border border-canvas-line/80 bg-canvas-raised/80 text-ink hover:border-brand-200 hover:text-brand-700 focus-visible:ring-brand-300 focus-visible:ring-offset-canvas-raised",
        primary:
          "bg-brand-600 text-white shadow-brand-glow hover:bg-brand-500 focus-visible:ring-brand-300 focus-visible:ring-offset-canvas-raised",
        secondary:
          "border border-ai-200/70 bg-ai-50/90 text-ai-700 hover:border-ai-300 hover:bg-ai-100 focus-visible:ring-ai-300 focus-visible:ring-offset-canvas-raised",
        subtle:
          "border border-canvas-line/80 bg-white/75 text-ink hover:border-sand-200 hover:bg-sand-50/70 focus-visible:ring-sand-300 focus-visible:ring-offset-canvas-raised"
      }
    }
  }
);

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.08em]",
  {
    defaultVariants: {
      tone: "neutral"
    },
    variants: {
      tone: {
        critical: "border-danger-200 bg-danger-50 text-danger-700",
        neutral: "border-canvas-line/80 bg-white/70 text-ink-soft",
        success: "border-success-200 bg-success-50 text-success-700",
        warning: "border-warning-200 bg-warning-50 text-warning-700"
      }
    }
  }
);

export const primaryLinkClassName = buttonVariants({ tone: "primary" });
export const secondaryLinkClassName = buttonVariants({ tone: "subtle" });
export const ghostLinkClassName = buttonVariants({ tone: "ghost" });

export const textInputClassName = cx(
  "block w-full rounded-[1.4rem] border-canvas-line/80 bg-white/80 px-4 py-3 text-sm text-ink shadow-sm placeholder:text-ink-muted/80",
  "transition duration-200 ease-out focus:border-brand-300 focus:ring-2 focus:ring-brand-200/70 focus:ring-offset-0"
);
export const selectClassName = cx(
  "block w-full rounded-[1.4rem] border-canvas-line/80 bg-white/80 px-4 py-3 pe-10 text-sm text-ink shadow-sm",
  "transition duration-200 ease-out focus:border-brand-300 focus:ring-2 focus:ring-brand-200/70 focus:ring-offset-0"
);
export const textAreaClassName = cx(
  "block w-full rounded-[1.4rem] border-canvas-line/80 bg-white/80 px-4 py-3 text-sm leading-7 text-ink shadow-sm placeholder:text-ink-muted/80",
  "transition duration-200 ease-out focus:border-brand-300 focus:ring-2 focus:ring-brand-200/70 focus:ring-offset-0"
);

export function appBodyClassName(locale: "ar" | "en") {
  return cx(
    "min-h-screen bg-canvas bg-hero-radial text-ink antialiased selection:bg-brand-100 selection:text-brand-800",
    locale === "ar" ? "font-arabic" : "font-sans"
  );
}

export const appBackdropClassName =
  "pointer-events-none fixed inset-0 bg-spotlight-grid bg-[size:64px_64px] opacity-30 [mask-image:linear-gradient(180deg,rgba(255,255,255,0.6),transparent_85%)]";
export const chromeShellClassName = "relative grid min-h-screen grid-rows-[auto_1fr]";
export const chromeHeaderClassName =
  "sticky top-0 z-30 border-b border-canvas-line/80 bg-canvas-raised/90 backdrop-blur supports-[backdrop-filter]:bg-canvas-raised/70";
export const chromeHeaderInnerClassName =
  "mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-start lg:justify-between lg:px-6";
export const chromeBrandClassName = "flex max-w-3xl flex-col gap-1";
export const chromeBrandTitleClassName = "text-base font-semibold tracking-[0.02em] text-ink";
export const chromeBrandCopyClassName = "text-sm leading-7 text-ink-soft";
export const chromeActionsClassName = "flex flex-wrap items-start gap-3 lg:justify-end";
export const chromeStatusClassName = "inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-brand-700";
export const chromeRoleGroupClassName = "flex flex-col gap-2";
export const chromeRoleNoteClassName = "max-w-sm text-xs leading-6 text-ink-soft";
export const chromeLayoutClassName = "mx-auto grid w-full max-w-[1600px] gap-6 px-4 py-6 lg:grid-cols-[19rem_minmax(0,1fr)] lg:px-6";
export const chromeSidebarClassName =
  "h-fit rounded-5xl border border-canvas-line/80 bg-canvas-raised/95 p-4 shadow-panel lg:sticky lg:top-28";
export const chromeMainClassName = "min-w-0";
export const sidebarLabelClassName = "mb-4 text-xs font-semibold tracking-[0.18em] text-sand-700";
export const sidebarStackClassName = "flex flex-col gap-2";
export function sidebarLinkClassName(active: boolean) {
  return cx(
    "group flex flex-col gap-1 rounded-[1.75rem] border px-4 py-4 transition duration-200 ease-out",
    active
      ? "border-brand-200 bg-brand-50 shadow-brand-glow"
      : "border-transparent bg-white/70 hover:-translate-y-0.5 hover:border-canvas-line hover:bg-white"
  );
}
export const sidebarLinkTitleClassName = "text-sm font-semibold text-ink";
export const sidebarLinkSummaryClassName = "text-sm leading-6 text-ink-soft";
export const localeSwitchClassName = "inline-flex flex-wrap items-center gap-1 rounded-full border border-canvas-line/80 bg-white/80 p-1";
export function localeLinkClassName(active: boolean) {
  return cx(
    "inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition",
    active ? "bg-brand-600 text-white shadow-brand-glow" : "text-ink-soft hover:bg-brand-50 hover:text-brand-700"
  );
}
export const skipLinkClassName =
  "sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-brand-600 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white";

export function formFeedbackClassName(status: "idle" | "error" | "success") {
  return cx(
    "text-sm leading-7",
    status === "error" ? "text-danger-700" : status === "success" ? "text-success-700" : "text-ink-soft"
  );
}

export function Button(
  props: ComponentPropsWithoutRef<"button"> & VariantProps<typeof buttonVariants>
) {
  const { className, size, tone, type = "button", ...rest } = props;

  return <button className={cx(buttonVariants({ size, tone }), className)} type={type} {...rest} />;
}

export const TextInput = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(function TextInput(props, ref) {
  const { className, ...rest } = props;

  return <input ref={ref} className={cx(textInputClassName, className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(props, ref) {
  const { className, ...rest } = props;

  return <select ref={ref} className={cx(selectClassName, className)} {...rest} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(props, ref) {
  const { className, ...rest } = props;

  return <textarea ref={ref} className={cx(textAreaClassName, className)} {...rest} />;
});

export function Panel(props: {
  children: ReactNode;
  className?: string;
  eyebrow?: string;
  title?: string;
}) {
  return (
    <section className={cx("rounded-5xl border border-canvas-line/80 bg-panel-gradient p-5 shadow-panel sm:p-6", props.className)}>
      {props.eyebrow ? <p className="text-xs font-semibold tracking-[0.2em] text-sand-700">{props.eyebrow}</p> : null}
      {props.title ? <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-ink">{props.title}</h2> : null}
      {props.children}
    </section>
  );
}

export function StatusBadge(props: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "critical";
}) {
  return <span className={statusBadgeVariants({ tone: props.tone })}>{props.children}</span>;
}

export function MetricTile(props: {
  label: string;
  value: string;
  detail: string;
  tone: "ocean" | "sand" | "mint" | "rose";
}) {
  return (
    <div className={metricTileClassName(props.tone)}>
      <p className={metricLabelClassName}>{props.label}</p>
      <p className={metricValueClassName}>{props.value}</p>
      <p className={metricDetailClassName}>{props.detail}</p>
    </div>
  );
}

function EmptyIllustration() {
  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <div className="absolute h-28 w-28 rounded-full bg-brand-100/80 blur-2xl" />
      <div className="absolute h-20 w-20 rounded-full bg-ai-100/80 blur-2xl" />
      <svg aria-hidden="true" className="relative h-20 w-20 text-brand-700" viewBox="0 0 96 96" fill="none">
        <rect x="20" y="24" width="56" height="48" rx="18" className="fill-current opacity-10" />
        <rect x="20" y="24" width="56" height="48" rx="18" stroke="currentColor" strokeWidth="4" />
        <circle cx="38" cy="42" r="5" className="fill-current" />
        <circle cx="58" cy="42" r="5" className="fill-current opacity-70" />
        <path d="M34 59c5 5 23 5 28 0" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
      </svg>
    </div>
  );
}

export function EmptyState(props: {
  title: string;
  summary: string;
  action?: ReactNode;
  illustration?: ReactNode;
  testId?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-4 py-2 text-start" data-testid={props.testId}>
      {props.illustration ?? <EmptyIllustration />}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold tracking-[-0.02em] text-ink">{props.title}</h3>
        <p className="max-w-2xl text-sm leading-7 text-ink-soft">{props.summary}</p>
      </div>
      {props.action ? <div className="pt-1">{props.action}</div> : null}
    </div>
  );
}

export function SkeletonBlock(props: {
  className?: string;
}) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-full bg-gradient-to-r from-canvas-muted via-white to-canvas-muted bg-[length:200%_100%] animate-shimmer",
        props.className
      )}
    />
  );
}

export function SkeletonLines(props: {
  className?: string;
  lines?: number;
}) {
  const lineCount = props.lines ?? 3;

  return (
    <div className={cx("flex flex-col gap-3", props.className)}>
      {Array.from({ length: lineCount }, (_, index) => (
        <SkeletonBlock
          key={index}
          className={cx("h-4", index % 2 === 0 ? "w-[92%]" : "w-[78%]")}
        />
      ))}
    </div>
  );
}
