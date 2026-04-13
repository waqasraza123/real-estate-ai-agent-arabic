import Link from "next/link";

import {
  canOperatorRoleAccessWorkspace,
  type ListGovernanceEventsQuery,
  type OperatorRole,
  type PersistedGovernanceEventList,
  type PersistedGovernanceEventRecord,
  type PersistedGovernanceSummary,
  type SupportedLocale
} from "@real-estate-ai/contracts";
import { EmptyState, Panel, StatusBadge } from "@real-estate-ai/ui";

import { ScreenIntro } from "@/components/screen-intro";
import { getOperatorRoleLabel } from "@/lib/operator-role";
import { buildCaseReferenceCode } from "@/lib/persisted-case-presenters";
import { buildGovernanceReportHref } from "@/lib/governance-report";

export function ManagerGovernanceReport(props: {
  currentOperatorRole: OperatorRole;
  filters: ListGovernanceEventsQuery;
  governanceEvents: PersistedGovernanceEventList | null;
  governanceSummary: PersistedGovernanceSummary | null;
  locale: SupportedLocale;
}) {
  const activeRoleLabel = getOperatorRoleLabel(props.locale, props.currentOperatorRole);
  const exportHref = buildGovernanceExportHref(props.locale, props.filters);
  const currentOpenCount = props.governanceSummary?.currentOpenItems.totalCount ?? 0;
  const openedCount = props.governanceSummary?.openedItems.totalCount ?? 0;
  const resolvedCount = props.governanceSummary?.resolvedItems.totalCount ?? 0;
  const filteredCount = props.governanceEvents?.totalCount ?? 0;

  return (
    <div className="page-stack">
      <ScreenIntro
        badge={props.locale === "ar" ? "تقرير الحوكمة" : "Governance report"}
        summary={
          props.locale === "ar"
            ? "سجل تصديري مفصل لفتحات الجودة وقراراتها عبر الإيرادات والتسليم، مع فلاتر تشغيلية صريحة وحدود دور موثوقة."
            : "A manager-grade reporting surface for detailed QA openings and resolutions across revenue and handover, with explicit operational filters and trusted role boundaries."
        }
        title={props.locale === "ar" ? "تقرير الحوكمة" : "Governance report"}
      />

      <Panel title={props.locale === "ar" ? "نطاق التقرير الحالي" : "Current report scope"}>
        <div className="page-stack">
          <p className="panel-summary">
            {props.locale === "ar"
              ? `يعمل التقرير بدور ${activeRoleLabel} مع نافذة ${props.filters.windowDays} يوماً وحد أقصى ${props.filters.limit} حدثاً مفصلاً.`
              : `The report is running as ${activeRoleLabel}, scoped to the last ${props.filters.windowDays} days with up to ${props.filters.limit} detailed events.`}
          </p>
          <div className="status-row-wrap">
            <StatusBadge>{activeRoleLabel}</StatusBadge>
            <StatusBadge>{props.locale === "ar" ? `${props.filters.windowDays} أيام` : `${props.filters.windowDays} days`}</StatusBadge>
            <StatusBadge>{props.locale === "ar" ? `${props.filters.limit} حدثاً` : `${props.filters.limit} events`}</StatusBadge>
            {props.filters.kind ? <StatusBadge>{getKindLabel(props.locale, props.filters.kind)}</StatusBadge> : null}
            {props.filters.status ? <StatusBadge tone={getStatusTone(props.filters.status)}>{getStatusLabel(props.locale, props.filters.status)}</StatusBadge> : null}
            {props.filters.subjectType ? <StatusBadge>{getSubjectLabel(props.locale, props.filters.subjectType)}</StatusBadge> : null}
          </div>
        </div>
      </Panel>

      <div className="metric-grid">
        <article className="metric-tile metric-tile-rose">
          <p className="metric-label">{props.locale === "ar" ? "حدود مفتوحة الآن" : "Open governance holds"}</p>
          <p className="metric-value">{currentOpenCount}</p>
          <p className="metric-detail">
            {props.locale === "ar"
              ? "عدد العناصر التي ما زالت عالقة في حدود الجودة الحية."
              : "Items that are still sitting inside a live governance boundary."}
          </p>
        </article>
        <article className="metric-tile metric-tile-sand">
          <p className="metric-label">{props.locale === "ar" ? "فتحات النافذة الحالية" : "Opened in window"}</p>
          <p className="metric-value">{openedCount}</p>
          <p className="metric-detail">
            {props.locale === "ar"
              ? "كل فتحات الجودة المسجلة داخل نافذة التقرير الحالية."
              : "All governance openings captured inside the active reporting window."}
          </p>
        </article>
        <article className="metric-tile metric-tile-mint">
          <p className="metric-label">{props.locale === "ar" ? "حسم النافذة الحالية" : "Resolved in window"}</p>
          <p className="metric-value">{resolvedCount}</p>
          <p className="metric-detail">
            {props.locale === "ar"
              ? "القرارات التي أغلقت حدود الجودة خلال نفس النافذة."
              : "Decisions that resolved governance boundaries during the same window."}
          </p>
        </article>
        <article className="metric-tile">
          <p className="metric-label">{props.locale === "ar" ? "الأحداث المطابقة للفلاتر" : "Events matching filters"}</p>
          <p className="metric-value">{filteredCount}</p>
          <p className="metric-detail">
            {props.locale === "ar"
              ? "إجمالي السجل المطابق بعد تطبيق الفلاتر الحالية قبل التصدير."
              : "Filtered event count after the current scope is applied, before export."}
          </p>
        </article>
      </div>

      <div className="two-column-grid">
        <Panel title={props.locale === "ar" ? "فلاتر سريعة" : "Quick filters"}>
          <div className="page-stack">
            <FilterTabs
              activeValue={String(props.filters.windowDays)}
              locale={props.locale}
              options={[
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, windowDays: 7 }),
                  label: props.locale === "ar" ? "7 أيام" : "7 days",
                  value: "7"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, windowDays: 30 }),
                  label: props.locale === "ar" ? "30 يوماً" : "30 days",
                  value: "30"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, windowDays: 60 }),
                  label: props.locale === "ar" ? "60 يوماً" : "60 days",
                  value: "60"
                }
              ]}
              title={props.locale === "ar" ? "النافذة الزمنية" : "Time window"}
            />

            <FilterTabs
              activeValue={props.filters.kind ?? "all"}
              locale={props.locale}
              options={[
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, kind: undefined }),
                  label: props.locale === "ar" ? "الكل" : "All",
                  value: "all"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, kind: "case_message" }),
                  label: props.locale === "ar" ? "إيرادات" : "Revenue",
                  value: "case_message"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, kind: "handover_customer_update" }),
                  label: props.locale === "ar" ? "تسليم" : "Handover",
                  value: "handover_customer_update"
                }
              ]}
              title={props.locale === "ar" ? "السطح" : "Surface"}
            />

            <FilterTabs
              activeValue={props.filters.status ?? "all"}
              locale={props.locale}
              options={[
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, status: undefined }),
                  label: props.locale === "ar" ? "كل الحالات" : "All statuses",
                  value: "all"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, status: "pending_review" }),
                  label: props.locale === "ar" ? "قيد الانتظار" : "Pending",
                  value: "pending_review"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, status: "approved" }),
                  label: props.locale === "ar" ? "معتمد" : "Approved",
                  value: "approved"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, status: "follow_up_required" }),
                  label: props.locale === "ar" ? "تحتاج متابعة" : "Follow-up",
                  value: "follow_up_required"
                }
              ]}
              title={props.locale === "ar" ? "الحالة" : "Status"}
            />

            <FilterTabs
              activeValue={props.filters.subjectType ?? "all"}
              locale={props.locale}
              options={[
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, subjectType: undefined }),
                  label: props.locale === "ar" ? "كل الموضوعات" : "All subjects",
                  value: "all"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, subjectType: "case_message" }),
                  label: props.locale === "ar" ? "رسالة محادثة" : "Conversation message",
                  value: "case_message"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, subjectType: "prepared_reply_draft" }),
                  label: props.locale === "ar" ? "مسودة رد" : "Reply draft",
                  value: "prepared_reply_draft"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, subjectType: "scheduling_invite" }),
                  label: props.locale === "ar" ? "دعوة جدولة" : "Scheduling invite",
                  value: "scheduling_invite"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, subjectType: "appointment_confirmation" }),
                  label: props.locale === "ar" ? "تأكيد موعد" : "Appointment confirmation",
                  value: "appointment_confirmation"
                }
              ]}
              title={props.locale === "ar" ? "موضوع المراجعة" : "Review subject"}
            />
          </div>
        </Panel>

        <Panel title={props.locale === "ar" ? "التصدير والاستخدام" : "Export and usage"}>
          <div className="page-stack">
            <p className="panel-summary">
              {props.locale === "ar"
                ? "نزّل نفس النطاق الحالي كملف CSV لمشاركته مع التشغيل أو المراجعة اليومية دون فقدان سياق الإشارات أو الأدلة."
                : "Download the current filtered scope as CSV for operations review without losing policy signals, evidence, or reviewer context."}
            </p>
            <div className="status-row-wrap">
              <StatusBadge>{props.locale === "ar" ? "CSV جاهز" : "CSV export ready"}</StatusBadge>
              <StatusBadge>{props.locale === "ar" ? `${filteredCount} صفاً مطابقاً` : `${filteredCount} matching rows`}</StatusBadge>
            </div>
            <Link className="inline-link" href={exportHref}>
              {props.locale === "ar" ? "تنزيل تقرير CSV" : "Download CSV report"}
            </Link>
            <Link className="inline-link" href={`/${props.locale}/manager`}>
              {props.locale === "ar" ? "العودة إلى بوابة الإدارة" : "Return to the manager gateway"}
            </Link>
          </div>
        </Panel>
      </div>

      <Panel title={props.locale === "ar" ? "سجل أحداث الحوكمة" : "Governance event log"}>
        {props.governanceEvents && props.governanceEvents.items.length > 0 ? (
          <div className="lead-table-wrapper">
            <table className="lead-table">
              <thead>
                <tr>
                  <th>{props.locale === "ar" ? "الحدث" : "Event"}</th>
                  <th>{props.locale === "ar" ? "الحالة" : "Status"}</th>
                  <th>{props.locale === "ar" ? "السياق" : "Context"}</th>
                  <th>{props.locale === "ar" ? "الأثر" : "Impact"}</th>
                  <th>{props.locale === "ar" ? "المسار" : "Route"}</th>
                </tr>
              </thead>
              <tbody>
                {props.governanceEvents.items.map((event) => {
                  const routeLink = getEventRouteLink(props.locale, props.currentOperatorRole, event);

                  return (
                    <tr key={`${event.caseId}:${event.createdAt}:${event.action}:${event.subjectType ?? "unknown"}`}>
                      <td data-column-label={props.locale === "ar" ? "الحدث" : "Event"}>
                        <div className="table-link">
                          <strong>{event.customerName}</strong>
                          <span>{buildCaseReferenceCode(event.caseId)}</span>
                          <span>{new Date(event.createdAt).toLocaleString(props.locale)}</span>
                          <span>
                            {getActionLabel(props.locale, event.action)} · {getKindLabel(props.locale, event.kind)}
                          </span>
                        </div>
                      </td>
                      <td data-column-label={props.locale === "ar" ? "الحالة" : "Status"}>
                        <div className="stack-tight">
                          <StatusBadge tone={getStatusTone(event.status)}>{getStatusLabel(props.locale, event.status)}</StatusBadge>
                          <StatusBadge>{getSubjectLabel(props.locale, event.subjectType)}</StatusBadge>
                          {event.triggerSource ? (
                            <StatusBadge>{event.triggerSource === "policy_rule" ? (props.locale === "ar" ? "قاعدة سياسة" : "Policy rule") : props.locale === "ar" ? "طلب يدوي" : "Manual request"}</StatusBadge>
                          ) : null}
                        </div>
                      </td>
                      <td data-column-label={props.locale === "ar" ? "السياق" : "Context"}>
                        <div className="stack-tight">
                          <p>{event.reviewSummary ?? event.sampleSummary ?? (props.locale === "ar" ? "لا يوجد ملخص إضافي." : "No additional summary.")}</p>
                          {event.draftMessage ? <span>{event.draftMessage}</span> : null}
                        </div>
                      </td>
                      <td data-column-label={props.locale === "ar" ? "الأثر" : "Impact"}>
                        <div className="stack-tight">
                          {event.policySignals.length > 0 ? (
                            <div className="status-row-wrap">
                              {event.policySignals.slice(0, 2).map((signal) => (
                                <StatusBadge key={`${event.caseId}:${event.createdAt}:${signal}`}>{signal}</StatusBadge>
                              ))}
                            </div>
                          ) : null}
                          {event.triggerEvidence.length > 0 ? (
                            <span>
                              {props.locale === "ar" ? "أدلة:" : "Evidence:"} {event.triggerEvidence.slice(0, 2).join(" | ")}
                            </span>
                          ) : (
                            <span>{props.locale === "ar" ? "لا توجد أدلة مسجلة." : "No explicit evidence recorded."}</span>
                          )}
                        </div>
                      </td>
                      <td data-column-label={props.locale === "ar" ? "المسار" : "Route"}>
                        <div className="stack-tight">
                          <Link className="inline-link" href={routeLink.href}>
                            {routeLink.label}
                          </Link>
                          {event.handoverCaseId ? <span>{event.handoverCaseId}</span> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            summary={
              props.locale === "ar"
                ? "عدّل نافذة التقرير أو الفلاتر لعرض أحداث الجودة المطابقة داخل السجل الحي."
                : "Adjust the report window or filters to surface matching governance events from the live log."
            }
            title={props.locale === "ar" ? "لا توجد أحداث مطابقة" : "No matching governance events"}
          />
        )}
      </Panel>
    </div>
  );
}

function FilterTabs(props: {
  activeValue: string;
  locale: SupportedLocale;
  options: Array<{
    href: string;
    label: string;
    value: string;
  }>;
  title: string;
}) {
  return (
    <div className="page-stack">
      <p className="panel-summary">{props.title}</p>
      <div className="case-route-tabs">
        {props.options.map((option) => (
          <Link
            key={`${props.title}:${option.value}`}
            className={option.value === props.activeValue ? "case-route-tab case-route-tab-active" : "case-route-tab"}
            href={option.href}
          >
            {option.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function buildGovernanceExportHref(locale: SupportedLocale, filters: ListGovernanceEventsQuery) {
  const query = new URLSearchParams();
  query.set("limit", "500");
  query.set("windowDays", String(filters.windowDays));

  if (filters.action) {
    query.set("action", filters.action);
  }

  if (filters.kind) {
    query.set("kind", filters.kind);
  }

  if (filters.status) {
    query.set("status", filters.status);
  }

  if (filters.subjectType) {
    query.set("subjectType", filters.subjectType);
  }

  if (filters.triggerSource) {
    query.set("triggerSource", filters.triggerSource);
  }

  return `/${locale}/manager/governance/export?${query.toString()}`;
}

function getActionLabel(locale: SupportedLocale, action: PersistedGovernanceEventRecord["action"]) {
  if (action === "opened") {
    return locale === "ar" ? "فتح" : "Opened";
  }

  return locale === "ar" ? "حسم" : "Resolved";
}

function getKindLabel(locale: SupportedLocale, kind: PersistedGovernanceEventRecord["kind"]) {
  if (kind === "handover_customer_update") {
    return locale === "ar" ? "مسودة تسليم" : "Handover draft";
  }

  return locale === "ar" ? "محادثة إيرادات" : "Revenue conversation";
}

function getStatusLabel(locale: SupportedLocale, status: PersistedGovernanceEventRecord["status"]) {
  if (status === "approved") {
    return locale === "ar" ? "معتمد" : "Approved";
  }

  if (status === "follow_up_required") {
    return locale === "ar" ? "تحتاج متابعة" : "Follow-up required";
  }

  return locale === "ar" ? "قيد الانتظار" : "Pending review";
}

function getStatusTone(status: PersistedGovernanceEventRecord["status"]) {
  if (status === "approved") {
    return "success" as const;
  }

  if (status === "follow_up_required") {
    return "warning" as const;
  }

  return "critical" as const;
}

function getSubjectLabel(locale: SupportedLocale, subjectType: PersistedGovernanceEventRecord["subjectType"]) {
  switch (subjectType) {
    case "prepared_reply_draft":
      return locale === "ar" ? "مسودة رد" : "Reply draft";
    case "readiness_update":
      return locale === "ar" ? "تحديث الجاهزية" : "Readiness update";
    case "scheduling_invite":
      return locale === "ar" ? "دعوة جدولة" : "Scheduling invite";
    case "appointment_confirmation":
      return locale === "ar" ? "تأكيد موعد" : "Appointment confirmation";
    case "case_message":
      return locale === "ar" ? "رسالة محادثة" : "Conversation message";
    default:
      return locale === "ar" ? "غير محدد" : "Unspecified";
  }
}

function getEventRouteLink(
  locale: SupportedLocale,
  operatorRole: OperatorRole,
  event: PersistedGovernanceEventRecord
) {
  if (event.kind === "handover_customer_update") {
    if (event.handoverCaseId && canOperatorRoleAccessWorkspace("handover", operatorRole)) {
      return {
        href: `/${locale}/handover/${event.handoverCaseId}`,
        label: locale === "ar" ? "فتح سجل التسليم" : "Open handover record"
      };
    }

    return {
      href: `/${locale}/manager/handover`,
      label: locale === "ar" ? "فتح قيادة التسليم" : "Open handover command center"
    };
  }

  if (canOperatorRoleAccessWorkspace("sales", operatorRole)) {
    return {
      href: `/${locale}/leads/${event.caseId}`,
      label: locale === "ar" ? "فتح سجل الحالة" : "Open case record"
    };
  }

  return {
    href: `/${locale}/manager/revenue`,
    label: locale === "ar" ? "فتح قيادة الإيرادات" : "Open revenue command center"
  };
}
