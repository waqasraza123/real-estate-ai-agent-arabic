import { cva, type VariantProps } from "class-variance-authority";
import clsx, { type ClassValue } from "clsx";
import type { ComponentPropsWithoutRef, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

export function cx(...values: ClassValue[]): string {
  return twMerge(clsx(values));
}

export const pageStackClassName = "flex flex-col gap-5 lg:gap-6";
export const pageTransitionClassName = "animate-soft-reveal";
export const metricGridClassName = "grid gap-4 sm:grid-cols-2 xl:grid-cols-4";
export const metricGridCompactClassName = "grid gap-3 sm:grid-cols-2";
export const twoColumnGridClassName = "grid gap-6 xl:grid-cols-2";
export const heroShellClassName = "grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]";
export const stackListClassName = "flex flex-col gap-4";
export const rowBetweenClassName = "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";
export const stackTightClassName = "flex flex-col gap-1.5";
export const statusRowWrapClassName = "flex flex-wrap items-center gap-2";
export const caseMetaClassName = "text-sm text-ink-muted [unicode-bidi:plaintext]";
export const panelSummaryClassName = "max-w-4xl text-sm leading-7 text-ink-soft sm:text-[0.98rem]";
export const placeholderNoticeClassName =
  "rounded-3xl border border-dashed border-canvas-line/70 bg-white/72 px-5 py-4 text-sm leading-7 text-ink-soft backdrop-blur-sm";
export function highlightNoticeClassName(tone: "brand" | "ai" | "warning" = "brand") {
  if (tone === "ai") {
    return "rounded-4xl border border-ai-200/70 bg-gradient-to-br from-ai-50/90 to-white/80 p-4 text-sm leading-7 text-ink-soft shadow-panel-soft backdrop-blur-sm";
  }

  if (tone === "warning") {
    return "rounded-4xl border border-warning-200/75 bg-gradient-to-br from-warning-50/90 to-white/80 p-4 text-sm leading-7 text-ink-soft shadow-panel-soft backdrop-blur-sm";
  }

  return "rounded-4xl border border-brand-200/70 bg-gradient-to-br from-brand-50/85 to-white/80 p-4 text-sm leading-7 text-ink-soft shadow-panel-soft backdrop-blur-sm";
}
export const inlineLinkClassName =
  "inline-flex items-center gap-2 text-sm font-semibold text-brand-700 underline-offset-4 transition duration-200 ease-soft-out hover:text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas-raised";

export const heroCopyClassName =
  "relative isolate overflow-hidden rounded-5xl border border-white/70 bg-panel-gradient px-6 py-8 shadow-panel-lg backdrop-blur-xl before:pointer-events-none before:absolute before:inset-0 before:bg-panel-sheen before:opacity-90 before:content-[''] sm:px-8 sm:py-10";
export const heroEyebrowClassName = "text-xs font-semibold tracking-[0.24em] text-sand-700";
export const heroTitleClassName =
  "max-w-[14ch] text-balance font-display text-4xl font-semibold leading-none tracking-[-0.045em] text-ink sm:text-5xl xl:text-7xl";
export const heroSummaryClassName = "max-w-2xl text-base leading-8 text-ink-soft";
export const heroActionsClassName = "mt-6 flex flex-wrap items-center gap-3";

export const screenIntroClassName = "flex flex-col gap-2";
export const screenIntroBadgeClassName = "text-xs font-semibold tracking-[0.22em] text-sand-700";
export const screenIntroTitleClassName =
  "text-balance font-display text-3xl font-semibold tracking-[-0.045em] text-ink sm:text-4xl xl:text-5xl";
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

export const cardSurfaceClassName =
  "relative isolate overflow-hidden rounded-4xl border border-white/70 bg-panel-gradient shadow-panel backdrop-blur-xl before:pointer-events-none before:absolute before:inset-0 before:bg-panel-sheen before:opacity-80 before:content-['']";
export const interactiveCardClassName =
  "transition duration-300 ease-soft-out hover:-translate-y-0.5 hover:shadow-panel-lg";
export const cardBaseClassName =
  cx(cardSurfaceClassName, interactiveCardClassName, "p-5 sm:p-6");
export const cardTitleClassName = "text-base font-semibold tracking-[-0.025em] text-ink";
export const bodyTextClassName = "text-sm leading-7 text-ink-soft";
const cardDescendantTitleClassName = "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:tracking-[-0.02em] [&_h3]:text-ink";
const cardDescendantBodyClassName = "[&_p]:text-sm [&_p]:leading-7 [&_p]:text-ink-soft";
export const metricLabelClassName = "text-xs font-semibold tracking-[0.18em] text-ink-soft";
export const metricValueClassName = "font-display text-4xl font-semibold tracking-[-0.05em] text-ink";
export const metricDetailClassName = "text-sm leading-7 text-ink-soft";
export function metricTileClassName(
  tone: "ocean" | "sand" | "mint" | "rose",
  density: "default" | "compact" = "default"
) {
  const toneClassName =
    tone === "ocean"
      ? "border-ai-200/80 bg-gradient-to-br from-ai-50/95 via-white to-white"
      : tone === "sand"
        ? "border-sand-200/70 bg-gradient-to-br from-sand-50/95 via-white to-white"
        : tone === "mint"
          ? "border-brand-200/75 bg-gradient-to-br from-brand-50/95 via-white to-white"
          : "border-danger-200/75 bg-gradient-to-br from-danger-50/95 via-white to-white";

  return cx(
    cardSurfaceClassName,
    interactiveCardClassName,
    density === "compact"
      ? "flex min-h-36 flex-col justify-between p-4 sm:min-h-40 sm:p-5"
      : "flex min-h-44 flex-col justify-between p-5 sm:p-6",
    toneClassName
  );
}
export const alertCardClassName = cx(cardBaseClassName, "border-warning-200/75 bg-gradient-to-br from-warning-50/90 to-white/78", cardDescendantTitleClassName, cardDescendantBodyClassName);
export const criticalAlertCardClassName = cx(cardBaseClassName, "border-danger-200/75 bg-gradient-to-br from-danger-50/90 to-white/78", cardDescendantTitleClassName, cardDescendantBodyClassName);
export const successCardClassName = cx(cardBaseClassName, "border-success-200/75 bg-gradient-to-br from-success-50/90 to-white/78", cardDescendantTitleClassName, cardDescendantBodyClassName);
export const caseLinkCardClassName =
  cx(
    cardSurfaceClassName,
    interactiveCardClassName,
    "group p-5 hover:border-brand-200 sm:flex sm:items-start sm:justify-between sm:gap-4 sm:p-6",
    cardDescendantTitleClassName,
    cardDescendantBodyClassName
  );
export const caseLinkAsideClassName = "mt-4 flex flex-wrap items-center gap-2 sm:mt-0";
export const caseStackCardClassName = cx(cardBaseClassName, "space-y-3");
export const slotCardClassName = cx(cardBaseClassName, "space-y-3");
export const activityFeedClassName = stackListClassName;
export const activityEntryClassName = cx(cardSurfaceClassName, "p-5 sm:p-6");
export const messageThreadClassName = activityFeedClassName;
export const messageCardClassName = activityEntryClassName;
export const messageMetaClassName = "text-xs text-ink-muted [unicode-bidi:plaintext]";
export const timelineListClassName = activityFeedClassName;
export const timelineItemClassName = activityEntryClassName;
export const interventionCardClassName = cx(cardSurfaceClassName, "p-5 sm:p-6", cardDescendantTitleClassName, cardDescendantBodyClassName);
export const interventionOpenCardClassName = cx(interventionCardClassName, "border-warning-200/75 bg-gradient-to-br from-warning-50/90 to-white/78");
export const interventionResolvedCardClassName = cx(interventionCardClassName, "border-success-200/75 bg-gradient-to-br from-success-50/90 to-white/78");
export const detailListClassName = cx(cardSurfaceClassName, "grid gap-4 p-5 sm:grid-cols-2 sm:p-6");
export const detailGridClassName = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3";
export const detailLabelClassName = "text-xs font-semibold tracking-[0.18em] text-ink-soft";
export const detailValueClassName = "mt-1 text-sm leading-7 text-ink";
export const documentRowClassName =
  cx(cardSurfaceClassName, interactiveCardClassName, "p-5 sm:flex sm:items-start sm:justify-between sm:gap-4 sm:p-6");
export const documentRowActionsClassName = "mt-4 flex flex-wrap items-center gap-2 sm:mt-0 sm:justify-end";
export const slotGridClassName = "grid gap-3 sm:grid-cols-2";
export const bulkFollowUpShellClassName = "flex flex-col gap-4 rounded-4xl border border-ai-200/75 bg-gradient-to-br from-ai-50/88 to-white/78 p-5 shadow-panel backdrop-blur-sm";
export const dataTableWrapperClassName = "overflow-x-auto rounded-4xl border border-canvas-line/70 bg-white/55 px-1 shadow-panel-soft backdrop-blur-sm";
export const dataTableClassName = "min-w-[62rem] w-full border-separate border-spacing-0";
export const dataTableHeadClassName = "border-b border-canvas-line/70";
export const dataTableHeaderCellClassName =
  "border-b border-canvas-line/70 px-4 py-4 text-start text-xs font-semibold tracking-[0.18em] text-ink-soft first:ps-5 last:pe-5";
export const dataTableCellClassName = "border-b border-canvas-line/70 px-4 py-4 align-top text-sm text-ink first:ps-5 last:pe-5";
export const tableLinkClassName = "group inline-flex flex-col gap-1 transition duration-200 ease-soft-out hover:-translate-y-0.5";
export const tableLinkTitleClassName = "text-sm font-semibold text-ink";
export const tableLinkMetaClassName = "text-sm text-ink-muted [unicode-bidi:plaintext]";
export const segmentedLinkTabsClassName =
  "flex flex-wrap items-center gap-2 rounded-full border border-canvas-line/70 bg-white/75 p-1.5 shadow-panel backdrop-blur-sm";
export function segmentedLinkTabClassName(active: boolean) {
  return cx(
    "inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition duration-200 ease-soft-out",
    active
      ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-brand-glow"
      : "text-ink-soft hover:bg-brand-50/90 hover:text-brand-700"
  );
}

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition duration-200 ease-soft-out active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55",
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
          "border border-canvas-line/70 bg-white/72 text-ink shadow-panel-soft backdrop-blur-sm hover:border-brand-200 hover:bg-white hover:text-brand-700 focus-visible:ring-brand-300 focus-visible:ring-offset-canvas-raised",
        primary:
          "bg-gradient-to-r from-brand-600 via-brand-600 to-ai-500 text-white shadow-brand-glow hover:from-brand-500 hover:to-ai-500 focus-visible:ring-brand-300 focus-visible:ring-offset-canvas-raised",
        secondary:
          "border border-ai-200/70 bg-ai-50/90 text-ai-700 shadow-panel-soft hover:border-ai-300 hover:bg-ai-100 focus-visible:ring-ai-300 focus-visible:ring-offset-canvas-raised",
        subtle:
          "border border-canvas-line/70 bg-white/75 text-ink shadow-panel-soft backdrop-blur-sm hover:border-sand-200 hover:bg-sand-50/70 focus-visible:ring-sand-300 focus-visible:ring-offset-canvas-raised"
      }
    }
  }
);

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.08em] shadow-panel-soft backdrop-blur-sm",
  {
    defaultVariants: {
      tone: "neutral"
    },
    variants: {
      tone: {
        critical: "border-danger-200/80 bg-danger-50/90 text-danger-700",
        neutral: "border-canvas-line/70 bg-white/76 text-ink-soft",
        success: "border-success-200/80 bg-success-50/90 text-success-700",
        warning: "border-warning-200/80 bg-warning-50/90 text-warning-700"
      }
    }
  }
);

export const primaryLinkClassName = buttonVariants({ tone: "primary" });
export const secondaryLinkClassName = buttonVariants({ tone: "subtle" });
export const ghostLinkClassName = buttonVariants({ tone: "ghost" });

export const textInputClassName = cx(
  "block w-full rounded-[1.5rem] border-canvas-line/70 bg-white/82 px-4 py-3 text-start text-sm text-ink shadow-panel-soft backdrop-blur-sm placeholder:text-ink-muted/80",
  "transition duration-200 ease-soft-out focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-200/80 focus:ring-offset-0"
);
export const selectClassName = cx(
  "block w-full rounded-[1.5rem] border-canvas-line/70 bg-white/82 px-4 py-3 pe-10 text-start text-sm text-ink shadow-panel-soft backdrop-blur-sm",
  "transition duration-200 ease-soft-out focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-200/80 focus:ring-offset-0"
);
export const textAreaClassName = cx(
  "block w-full rounded-[1.5rem] border-canvas-line/70 bg-white/82 px-4 py-3 text-start text-sm leading-7 text-ink shadow-panel-soft backdrop-blur-sm placeholder:text-ink-muted/80",
  "transition duration-200 ease-soft-out focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-200/80 focus:ring-offset-0"
);

export function appBodyClassName(locale: "ar" | "en") {
  return cx(
    "min-h-screen bg-canvas bg-hero-radial text-ink antialiased selection:bg-brand-100 selection:text-brand-800 [font-feature-settings:'rlig'_1,'calt'_1]",
    locale === "ar" ? "font-arabic" : "font-sans"
  );
}

export const appBackdropClassName =
  "pointer-events-none fixed inset-0 bg-shell-radial opacity-100 before:absolute before:inset-0 before:bg-spotlight-grid before:bg-[size:64px_64px] before:opacity-30 before:content-[''] [mask-image:linear-gradient(180deg,rgba(255,255,255,0.72),transparent_88%)]";
export const chromeShellClassName = "relative grid min-h-screen grid-rows-[auto_1fr]";
export const chromeHeaderClassName =
  "sticky top-0 z-30 border-b border-white/70 bg-white/72 shadow-panel-soft backdrop-blur-xl supports-[backdrop-filter]:bg-white/62";
export const chromeHeaderInnerClassName =
  "mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 lg:px-6";
export const chromeHeaderTopRowClassName = "flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between";
export const chromeBrandClassName = "flex max-w-3xl flex-col gap-1";
export const chromeBrandTitleClassName = "font-display text-base font-semibold tracking-[0.01em] text-ink";
export const chromeBrandCopyClassName = "text-sm leading-7 text-ink-soft";
export const chromeMetaRowClassName = "flex flex-wrap items-center gap-2";
export const chromeActionsClassName = "flex flex-col gap-3 xl:items-end";
export const chromeStatusClassName = "inline-flex items-center rounded-full border border-brand-200/80 bg-brand-50/90 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-brand-700 shadow-panel-soft backdrop-blur-sm";
export const chromeWorkspaceBadgeClassName =
  "inline-flex items-center rounded-full border border-canvas-line/70 bg-white/78 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-ink-soft shadow-panel-soft backdrop-blur-sm";
export const chromeRoleGroupClassName = "flex flex-col gap-2";
export const chromeRoleNoteClassName = "max-w-sm text-xs leading-6 text-ink-soft";
export const chromeUtilityRowClassName = "flex flex-wrap items-center gap-3 xl:justify-end";
export const chromeSessionDetailsClassName = "group relative min-w-[15rem]";
export const chromeSessionSummaryClassName =
  "flex min-h-12 list-none items-center justify-between gap-3 rounded-[1.5rem] border border-canvas-line/70 bg-white/78 px-4 py-3 text-start shadow-panel-soft backdrop-blur-sm transition duration-200 ease-soft-out hover:border-brand-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas-raised [&::-webkit-details-marker]:hidden";
export const chromeSessionLabelClassName = "text-[0.68rem] font-semibold tracking-[0.16em] text-ink-soft";
export const chromeSessionValueClassName = "text-sm font-semibold text-ink";
export const chromeSessionPanelClassName =
  "mt-3 flex flex-col gap-3 rounded-4xl border border-white/70 bg-panel-gradient p-4 shadow-panel backdrop-blur-xl";
export const chromeContextBarClassName =
  "flex flex-col gap-2 rounded-4xl border border-white/70 bg-white/66 px-4 py-4 shadow-panel-soft backdrop-blur-sm sm:px-5";
export const chromeContextTitleClassName = "font-display text-xl font-semibold tracking-[-0.03em] text-ink";
export const chromeContextSummaryClassName = "max-w-3xl text-sm leading-7 text-ink-soft";
export const chromeLayoutClassName = "mx-auto grid w-full max-w-[1600px] gap-6 px-4 py-6 lg:grid-cols-[19rem_minmax(0,1fr)] lg:px-6 xl:gap-7 xl:py-7";
export const chromeSidebarClassName =
  "h-fit rounded-5xl border border-white/70 bg-white/74 p-4 shadow-panel backdrop-blur-xl lg:sticky lg:top-28";
export const chromeMainClassName = "min-w-0";
export const sidebarLabelClassName = "mb-4 text-xs font-semibold tracking-[0.18em] text-sand-700";
export const sidebarStackClassName = "flex flex-col gap-2";
export function sidebarLinkClassName(active: boolean) {
  return cx(
    "group flex flex-col gap-1 rounded-[1.75rem] border px-4 py-4 transition duration-200 ease-soft-out",
    active
      ? "border-brand-200/80 bg-brand-50/92 shadow-brand-glow"
      : "border-transparent bg-white/55 hover:-translate-y-0.5 hover:border-canvas-line/80 hover:bg-white/82"
  );
}
export const sidebarLinkTitleClassName = "text-sm font-semibold text-ink";
export const sidebarLinkSummaryClassName = "text-sm leading-6 text-ink-soft";
export const localeSwitchClassName = "inline-flex flex-wrap items-center gap-1 rounded-full border border-canvas-line/70 bg-white/76 p-1.5 shadow-panel-soft backdrop-blur-sm";
export function localeLinkClassName(active: boolean) {
  return cx(
    "inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition duration-200 ease-soft-out",
    active
      ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-brand-glow"
      : "text-ink-soft hover:bg-brand-50/90 hover:text-brand-700"
  );
}
export const skipLinkClassName =
  "sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-gradient-to-r focus:from-brand-600 focus:to-brand-500 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white";

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
    <section className={cx("relative isolate overflow-hidden rounded-5xl border border-white/70 bg-panel-gradient p-5 shadow-panel-lg backdrop-blur-xl before:pointer-events-none before:absolute before:inset-0 before:bg-panel-sheen before:opacity-85 before:content-[''] sm:p-6", props.className)}>
      {props.eyebrow ? <p className="text-xs font-semibold tracking-[0.2em] text-sand-700">{props.eyebrow}</p> : null}
      {props.title ? <h2 className="relative mt-2 font-display text-xl font-semibold tracking-[-0.035em] text-ink">{props.title}</h2> : null}
      {props.children}
    </section>
  );
}

export function DetailGrid(props: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cx(detailGridClassName, props.className)}>{props.children}</div>;
}

export function DetailItem(props: {
  className?: string;
  label: string;
  span?: "default" | "full";
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className={cx(props.span === "full" ? fieldSpanFullClassName : undefined, props.className)}>
      <p className={detailLabelClassName}>{props.label}</p>
      <div className={cx(detailValueClassName, props.valueClassName)}>{props.value}</div>
    </div>
  );
}

export function DetailListItem(props: {
  className?: string;
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className={props.className}>
      <dt className={detailLabelClassName}>{props.label}</dt>
      <dd className={cx(detailValueClassName, props.valueClassName)}>{props.value}</dd>
    </div>
  );
}

export function WorkflowPanelBody(props: {
  children?: ReactNode;
  className?: string;
  note?: ReactNode;
  summary?: ReactNode;
}) {
  return (
    <div className={cx(pageStackClassName, props.className)}>
      {props.summary ? <div className={panelSummaryClassName}>{props.summary}</div> : null}
      {props.note ? <div className={fieldNoteClassName}>{props.note}</div> : null}
      {props.children}
    </div>
  );
}

export function HighlightNotice(props: {
  children: ReactNode;
  className?: string;
  tone?: "brand" | "ai" | "warning";
}) {
  return <div className={cx(highlightNoticeClassName(props.tone), props.className)}>{props.children}</div>;
}

export function workflowCardClassName(tone: "neutral" | "warning" | "critical" | "success" = "neutral") {
  if (tone === "critical") {
    return criticalAlertCardClassName;
  }

  if (tone === "warning") {
    return alertCardClassName;
  }

  if (tone === "success") {
    return successCardClassName;
  }

  return interventionCardClassName;
}

export function WorkflowCard(props: {
  actions?: ReactNode;
  badges?: ReactNode;
  children?: ReactNode;
  className?: string;
  meta?: ReactNode;
  summary?: ReactNode;
  title: ReactNode;
  tone?: "neutral" | "warning" | "critical" | "success";
}) {
  return (
    <article className={cx(workflowCardClassName(props.tone), props.className)}>
      <div className={rowBetweenClassName}>
        <div className={stackTightClassName}>
          <h3>{props.title}</h3>
          {props.meta}
        </div>
        {props.badges ? <div className={statusRowWrapClassName}>{props.badges}</div> : null}
      </div>
      {props.summary ? <div>{props.summary}</div> : null}
      {props.children}
      {props.actions ? <div className={statusRowWrapClassName}>{props.actions}</div> : null}
    </article>
  );
}

export function WorkflowListItem(props: {
  actions?: ReactNode;
  badges?: ReactNode;
  children?: ReactNode;
  className?: string;
  meta?: ReactNode;
  summary?: ReactNode;
  title: ReactNode;
  tone?: "neutral" | "warning" | "critical" | "success";
}) {
  return (
    <article
      className={cx(
        cardSurfaceClassName,
        interactiveCardClassName,
        "p-5 sm:flex sm:items-start sm:justify-between sm:gap-4 sm:p-6",
        props.className
      )}
    >
      <div className={pageStackClassName}>
        <div className={rowBetweenClassName}>
          <div className={stackTightClassName}>
            <h3 className={cardTitleClassName}>{props.title}</h3>
            {props.meta}
          </div>
          {props.badges ? <div className={statusRowWrapClassName}>{props.badges}</div> : null}
        </div>
        {props.summary ? <div>{props.summary}</div> : null}
        {props.children}
      </div>
      {props.actions ? <div className={documentRowActionsClassName}>{props.actions}</div> : null}
    </article>
  );
}

export function ActivityFeed(props: {
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <div className={cx(activityFeedClassName, props.className)} data-testid={props.testId}>
      {props.children}
    </div>
  );
}

export function ActivityEntry(props: {
  badges?: ReactNode;
  children?: ReactNode;
  className?: string;
  meta?: ReactNode;
  summary?: ReactNode;
  title: ReactNode;
}) {
  return (
    <article className={cx(activityEntryClassName, props.className)}>
      <div className="flex flex-col gap-4">
        <div className={rowBetweenClassName}>
          <h3 className={cardTitleClassName}>{props.title}</h3>
          {props.badges ? <div className={statusRowWrapClassName}>{props.badges}</div> : null}
        </div>
        {props.summary ? <div className={bodyTextClassName}>{props.summary}</div> : null}
        {props.children}
        {props.meta ? <div className={messageMetaClassName}>{props.meta}</div> : null}
      </div>
    </article>
  );
}

export function DataTable(props: {
  children: ReactNode;
  className?: string;
  testId?: string;
  wrapperClassName?: string;
}) {
  return (
    <div className={cx(dataTableWrapperClassName, props.wrapperClassName)} data-testid={props.testId}>
      <table className={cx(dataTableClassName, props.className)}>{props.children}</table>
    </div>
  );
}

export function DataTableHead(props: {
  children: ReactNode;
  className?: string;
}) {
  return <thead className={cx(dataTableHeadClassName, props.className)}>{props.children}</thead>;
}

export function DataTableHeaderCell(props: {
  children: ReactNode;
  className?: string;
}) {
  return <th className={cx(dataTableHeaderCellClassName, props.className)}>{props.children}</th>;
}

export function DataTableCell(props: {
  children: ReactNode;
  className?: string;
  columnLabel?: string;
}) {
  return (
    <td
      className={cx(dataTableCellClassName, props.className)}
      {...(props.columnLabel ? { "data-column-label": props.columnLabel } : {})}
    >
      {props.children}
    </td>
  );
}

export function StatusBadge(props: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "critical";
}) {
  return <span className={statusBadgeVariants({ tone: props.tone })}>{props.children}</span>;
}

export function MetricTile(props: {
  className?: string;
  density?: "default" | "compact";
  label: string;
  value: string;
  detail: string;
  tone: "ocean" | "sand" | "mint" | "rose";
}) {
  return (
    <div className={cx(metricTileClassName(props.tone, props.density), props.className)}>
      <p className={metricLabelClassName}>{props.label}</p>
      <p className={cx(metricValueClassName, props.density === "compact" ? "text-[2rem] sm:text-[2.35rem]" : undefined)}>
        {props.value}
      </p>
      <p className={cx(metricDetailClassName, props.density === "compact" ? "leading-6" : undefined)}>{props.detail}</p>
    </div>
  );
}

export function MetricInsightTile(props: {
  detail: ReactNode;
  footer?: ReactNode;
  label: ReactNode;
  tone: "ocean" | "sand" | "mint" | "rose";
  value: ReactNode;
}) {
  return (
    <div className={metricTileClassName(props.tone)}>
      <div className={pageStackClassName}>
        <div>
          <p className={metricLabelClassName}>{props.label}</p>
          <div className={cx(metricValueClassName, "mt-3")}>{props.value}</div>
        </div>
        <div className={metricDetailClassName}>{props.detail}</div>
      </div>
      {props.footer ? <div className={statusRowWrapClassName}>{props.footer}</div> : null}
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
