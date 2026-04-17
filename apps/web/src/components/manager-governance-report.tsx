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
import type {
  GovernanceOperationalRiskExportCandidate,
  GovernanceOperationalRiskExportScope,
  GovernanceOperationalRiskSummary
} from "@/lib/governance-workspace";
import type { GovernanceReportView } from "@/lib/governance-report";
import { getOperatorRoleLabel } from "@/lib/operator-role";
import { buildCaseReferenceCode } from "@/lib/persisted-case-presenters";
import { buildGovernanceReportHref } from "@/lib/governance-report";
import { buildRevenueManagerExportHref, buildRevenueManagerHref, revenueManagerFocusedQueueId } from "@/lib/revenue-manager";

export function ManagerGovernanceReport(props: {
  currentOperatorRole: OperatorRole;
  filters: ListGovernanceEventsQuery;
  governanceEvents: PersistedGovernanceEventList | null;
  governanceSummary: PersistedGovernanceSummary | null;
  locale: SupportedLocale;
  operationalRiskSummary: GovernanceOperationalRiskSummary;
  view: GovernanceReportView;
}) {
  const activeRoleLabel = getOperatorRoleLabel(props.locale, props.currentOperatorRole);
  const exportHref = buildGovernanceExportHref(props.locale, props.filters);
  const currentOpenCount = props.governanceSummary?.currentOpenItems.totalCount ?? 0;
  const openedCount = props.governanceSummary?.openedItems.totalCount ?? 0;
  const resolvedCount = props.governanceSummary?.resolvedItems.totalCount ?? 0;
  const filteredCount = props.governanceEvents?.totalCount ?? 0;
  const showQaHistory = props.view !== "operational_risk";
  const showOperationalRisk = props.view !== "qa_history";

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
            <StatusBadge>{getReportViewLabel(props.locale, props.view)}</StatusBadge>
            {props.filters.kind ? <StatusBadge>{getKindLabel(props.locale, props.filters.kind)}</StatusBadge> : null}
            {props.filters.status ? <StatusBadge tone={getStatusTone(props.filters.status)}>{getStatusLabel(props.locale, props.filters.status)}</StatusBadge> : null}
            {props.filters.subjectType ? <StatusBadge>{getSubjectLabel(props.locale, props.filters.subjectType)}</StatusBadge> : null}
          </div>
        </div>
      </Panel>

      <div className="metric-grid">
        {showQaHistory ? (
          <article className="metric-tile metric-tile-rose">
            <p className="metric-label">{props.locale === "ar" ? "حدود مفتوحة الآن" : "Open governance holds"}</p>
            <p className="metric-value">{currentOpenCount}</p>
            <p className="metric-detail">
              {props.locale === "ar"
                ? "عدد العناصر التي ما زالت عالقة في حدود الجودة الحية."
                : "Items that are still sitting inside a live governance boundary."}
            </p>
          </article>
        ) : null}
        {showQaHistory ? (
          <article className="metric-tile metric-tile-sand">
            <p className="metric-label">{props.locale === "ar" ? "فتحات النافذة الحالية" : "Opened in window"}</p>
            <p className="metric-value">{openedCount}</p>
            <p className="metric-detail">
              {props.locale === "ar"
                ? "كل فتحات الجودة المسجلة داخل نافذة التقرير الحالية."
                : "All governance openings captured inside the active reporting window."}
            </p>
          </article>
        ) : null}
        {showQaHistory ? (
          <article className="metric-tile metric-tile-mint">
            <p className="metric-label">{props.locale === "ar" ? "حسم النافذة الحالية" : "Resolved in window"}</p>
            <p className="metric-value">{resolvedCount}</p>
            <p className="metric-detail">
              {props.locale === "ar"
                ? "القرارات التي أغلقت حدود الجودة خلال نفس النافذة."
                : "Decisions that resolved governance boundaries during the same window."}
            </p>
          </article>
        ) : null}
        {showQaHistory ? (
          <article className="metric-tile">
            <p className="metric-label">{props.locale === "ar" ? "الأحداث المطابقة للفلاتر" : "Events matching filters"}</p>
            <p className="metric-value">{filteredCount}</p>
            <p className="metric-detail">
              {props.locale === "ar"
                ? "إجمالي السجل المطابق بعد تطبيق الفلاتر الحالية قبل التصدير."
                : "Filtered event count after the current scope is applied, before export."}
            </p>
          </article>
        ) : null}
        {showOperationalRisk ? (
          <article className="metric-tile metric-tile-ocean">
            <p className="metric-label">{props.locale === "ar" ? "تسليمات متصاعدة بعد الرد" : "Escalated reply handoffs"}</p>
            <p className="metric-value">{props.operationalRiskSummary.totalEscalatedReplyHandoffCount}</p>
            <p className="metric-detail">
              {props.locale === "ar"
                ? "حالات حيّة انتقل فيها الرد البشري إلى مالك جديد ثم أصبحت متأخرة أو محملة بتدخلات مفتوحة."
                : "Live cases where a human reply was handed to a new owner and that handoff is now overdue or intervention-backed."}
            </p>
          </article>
        ) : null}
        {showOperationalRisk ? (
          <article className="metric-tile metric-tile-sand">
            <p className="metric-label">{props.locale === "ar" ? "دفعات المتابعة مع انجراف" : "Bulk batches with drift"}</p>
            <p className="metric-value">{props.operationalRiskSummary.batchesWithDriftCount}</p>
            <p className="metric-detail">
              {props.locale === "ar"
                ? "الدفعات الحديثة التي تغيّرت فيها الحالات لاحقاً بعد إعادة الضبط الجماعية الأصلية."
                : "Recent bulk batches where affected cases picked up later follow-up changes after the original reset."}
            </p>
          </article>
        ) : null}
        {showOperationalRisk ? (
          <article className="metric-tile">
            <p className="metric-label">{props.locale === "ar" ? "تغيّرات لاحقة مرئية" : "Visible later changes"}</p>
            <p className="metric-value">{props.operationalRiskSummary.driftedCaseCount}</p>
            <p className="metric-detail">
              {props.locale === "ar"
                ? "عدد الحالات داخل أحدث الدفعات التي حملت تحديث متابعة أو إعادة ضبط جماعية لاحقة."
                : "Affected cases across the recent visible batches that later received another follow-up update or bulk reset."}
            </p>
          </article>
        ) : null}
        {showOperationalRisk ? (
          <article className="metric-tile metric-tile-mint">
            <p className="metric-label">{props.locale === "ar" ? "مزيج أسباب الانجراف" : "Drift reason mix"}</p>
            <p className="metric-value">{props.operationalRiskSummary.mixedReasonDriftCaseCount}</p>
            <p className="metric-detail">
              {props.locale === "ar"
                ? "حالات انجرفت بسبب تحديث متابعة فردي وإعادة ضبط جماعية لاحقة معاً داخل الدفعات الحديثة المرئية."
                : "Drifted cases in the recent visible batches that were changed by both later individual follow-up saves and later bulk resets."}
            </p>
            <div className="status-row-wrap">
              {props.operationalRiskSummary.followUpUpdateOnlyDriftCaseCount > 0 ? (
                <StatusBadge>
                  {props.locale === "ar"
                    ? `${props.operationalRiskSummary.followUpUpdateOnlyDriftCaseCount} متابعة فقط`
                    : `${props.operationalRiskSummary.followUpUpdateOnlyDriftCaseCount} follow-up only`}
                </StatusBadge>
              ) : null}
              {props.operationalRiskSummary.laterBulkResetOnlyDriftCaseCount > 0 ? (
                <StatusBadge>
                  {props.locale === "ar"
                    ? `${props.operationalRiskSummary.laterBulkResetOnlyDriftCaseCount} دفعة فقط`
                    : `${props.operationalRiskSummary.laterBulkResetOnlyDriftCaseCount} bulk reset only`}
                </StatusBadge>
              ) : null}
              {props.operationalRiskSummary.mixedReasonDriftCaseCount > 0 ? (
                <StatusBadge tone="warning">
                  {props.locale === "ar"
                    ? `${props.operationalRiskSummary.mixedReasonDriftCaseCount} مختلطة`
                    : `${props.operationalRiskSummary.mixedReasonDriftCaseCount} mixed`}
                </StatusBadge>
              ) : null}
            </div>
          </article>
        ) : null}
      </div>

      <div className="two-column-grid">
        <Panel title={props.locale === "ar" ? "فلاتر سريعة" : "Quick filters"}>
          <div className="page-stack">
            <FilterTabs
              activeValue={props.view}
              locale={props.locale}
              options={[
                {
                  href: buildGovernanceReportHref(props.locale, props.filters, "blended"),
                  label: props.locale === "ar" ? "مزدوج" : "Blended",
                  value: "blended"
                },
                {
                  href: buildGovernanceReportHref(props.locale, props.filters, "qa_history"),
                  label: props.locale === "ar" ? "تاريخ الجودة" : "QA history",
                  value: "qa_history"
                },
                {
                  href: buildGovernanceReportHref(props.locale, props.filters, "operational_risk"),
                  label: props.locale === "ar" ? "مخاطر التشغيل" : "Operational risk",
                  value: "operational_risk"
                }
              ]}
              title={props.locale === "ar" ? "وضع التقرير" : "Report mode"}
            />

            <FilterTabs
              activeValue={String(props.filters.windowDays)}
              locale={props.locale}
              options={[
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, windowDays: 7 }, props.view),
                  label: props.locale === "ar" ? "7 أيام" : "7 days",
                  value: "7"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, windowDays: 30 }, props.view),
                  label: props.locale === "ar" ? "30 يوماً" : "30 days",
                  value: "30"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, windowDays: 60 }, props.view),
                  label: props.locale === "ar" ? "60 يوماً" : "60 days",
                  value: "60"
                }
              ]}
              title={props.locale === "ar" ? "النافذة الزمنية" : "Time window"}
            />

            {showQaHistory ? (
            <FilterTabs
              activeValue={props.filters.kind ?? "all"}
              locale={props.locale}
              options={[
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, kind: undefined }, props.view),
                  label: props.locale === "ar" ? "الكل" : "All",
                  value: "all"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, kind: "case_message" }, props.view),
                  label: props.locale === "ar" ? "إيرادات" : "Revenue",
                  value: "case_message"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, kind: "handover_customer_update" }, props.view),
                  label: props.locale === "ar" ? "تسليم" : "Handover",
                  value: "handover_customer_update"
                }
              ]}
              title={props.locale === "ar" ? "السطح" : "Surface"}
            />
            ) : null}

            {showQaHistory ? (
            <FilterTabs
              activeValue={props.filters.status ?? "all"}
              locale={props.locale}
              options={[
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, status: undefined }, props.view),
                  label: props.locale === "ar" ? "كل الحالات" : "All statuses",
                  value: "all"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, status: "pending_review" }, props.view),
                  label: props.locale === "ar" ? "قيد الانتظار" : "Pending",
                  value: "pending_review"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, status: "approved" }, props.view),
                  label: props.locale === "ar" ? "معتمد" : "Approved",
                  value: "approved"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, status: "follow_up_required" }, props.view),
                  label: props.locale === "ar" ? "تحتاج متابعة" : "Follow-up",
                  value: "follow_up_required"
                }
              ]}
              title={props.locale === "ar" ? "الحالة" : "Status"}
            />
            ) : null}

            {showQaHistory ? (
            <FilterTabs
              activeValue={props.filters.subjectType ?? "all"}
              locale={props.locale}
              options={[
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, subjectType: undefined }, props.view),
                  label: props.locale === "ar" ? "كل الموضوعات" : "All subjects",
                  value: "all"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, subjectType: "case_message" }, props.view),
                  label: props.locale === "ar" ? "رسالة محادثة" : "Conversation message",
                  value: "case_message"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, subjectType: "prepared_reply_draft" }, props.view),
                  label: props.locale === "ar" ? "مسودة رد" : "Reply draft",
                  value: "prepared_reply_draft"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, subjectType: "scheduling_invite" }, props.view),
                  label: props.locale === "ar" ? "دعوة جدولة" : "Scheduling invite",
                  value: "scheduling_invite"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, subjectType: "appointment_confirmation" }, props.view),
                  label: props.locale === "ar" ? "تأكيد موعد" : "Appointment confirmation",
                  value: "appointment_confirmation"
                }
              ]}
              title={props.locale === "ar" ? "موضوع المراجعة" : "Review subject"}
            />
            ) : null}
          </div>
        </Panel>

        <Panel title={props.locale === "ar" ? "التصدير والاستخدام" : "Export and usage"}>
          <div className="page-stack">
            <p className="panel-summary">
              {props.view === "operational_risk"
                ? props.locale === "ar"
                  ? "وضع مخاطر التشغيل يعرض ضغط التسليمات الحية فقط. تصدير CSV على مستوى التقرير يبقى مخصصاً لسجل أحداث الجودة التاريخي، بينما توفّر صفوف الدفعات أدناه تصدير الحالات الحية الدقيقة لكل نطاق دفعة."
                  : "Operational risk mode focuses on live handoff pressure only. Report-level CSV export remains reserved for historical QA-event reporting, while the bulk rows below can export exact live-case scopes per batch."
                : props.locale === "ar"
                  ? "نزّل نفس النطاق الحالي كملف CSV لمشاركته مع التشغيل أو المراجعة اليومية دون فقدان سياق الإشارات أو الأدلة."
                  : "Download the current filtered scope as CSV for operations review without losing policy signals, evidence, or reviewer context."}
            </p>
            <div className="status-row-wrap">
              <StatusBadge>{props.view === "operational_risk" ? (props.locale === "ar" ? "عرض حي" : "Live view") : props.locale === "ar" ? "CSV جاهز" : "CSV export ready"}</StatusBadge>
              <StatusBadge>
                {props.view === "operational_risk"
                  ? props.locale === "ar"
                    ? `${props.operationalRiskSummary.totalEscalatedReplyHandoffCount} مخاطر حية`
                    : `${props.operationalRiskSummary.totalEscalatedReplyHandoffCount} live risks`
                  : props.locale === "ar"
                    ? `${filteredCount} صفاً مطابقاً`
                    : `${filteredCount} matching rows`}
              </StatusBadge>
              {props.view === "operational_risk" ? (
                <StatusBadge>{props.locale === "ar" ? "تصدير دفعات حيّة متاح" : "Live batch export available"}</StatusBadge>
              ) : null}
            </div>
            {showQaHistory ? (
              <Link className="inline-link" href={exportHref}>
                {props.locale === "ar" ? "تنزيل تقرير CSV" : "Download CSV report"}
              </Link>
            ) : null}
            <Link className="inline-link" href={`/${props.locale}/manager`}>
              {props.locale === "ar" ? "العودة إلى بوابة الإدارة" : "Return to the manager gateway"}
            </Link>
          </div>
        </Panel>
      </div>

      {showOperationalRisk ? (
      <Panel title={props.locale === "ar" ? "أولويات التصدير المقترحة" : "Recommended export priorities"}>
        {props.operationalRiskSummary.exportCandidates.length > 0 ? (
          <div className="page-stack">
            <p className="panel-summary">
              {props.locale === "ar"
                ? "يعرض هذا الملخص أي نطاقات CSV الحية تستحق السحب أولاً قبل فتح صفوف الدفعات، اعتماداً على حجم الانجراف وتعقيد سببه والحالات التي ما زالت متصاعدة."
                : "This summary ranks which live CSV scopes are worth pulling first before opening batch rows, based on visible drift volume, drift complexity, and cases that are still escalated."}
            </p>
            <div className="lead-table-wrapper">
              <table className="lead-table">
                <thead>
                  <tr>
                    <th>{props.locale === "ar" ? "الأولوية" : "Priority"}</th>
                    <th>{props.locale === "ar" ? "النطاق المقترح" : "Recommended scope"}</th>
                    <th>{props.locale === "ar" ? "الحجم" : "Volume"}</th>
                    <th>{props.locale === "ar" ? "الإجراء" : "Action"}</th>
                  </tr>
                </thead>
                <tbody>
                  {props.operationalRiskSummary.exportCandidates.map((candidate) => (
                    <tr key={`${candidate.batchId}:${candidate.scope}`}>
                      <td data-column-label={props.locale === "ar" ? "الأولوية" : "Priority"}>
                        <div className="stack-tight">
                          <StatusBadge tone={getExportCandidateTone(candidate.priority)}>
                            {getExportCandidatePriorityLabel(props.locale, candidate.priority)}
                          </StatusBadge>
                          <span>{new Date(candidate.savedAt).toLocaleString(props.locale)}</span>
                        </div>
                      </td>
                      <td data-column-label={props.locale === "ar" ? "النطاق المقترح" : "Recommended scope"}>
                        <div className="table-link">
                          <strong>{getOperationalRiskExportScopeLabel(props.locale, candidate.scope)}</strong>
                          <span>
                            {props.locale === "ar"
                              ? `دفعة ${candidate.scopedOwnerName}`
                              : `${candidate.scopedOwnerName} batch`}
                          </span>
                          <span>
                            {props.locale === "ar"
                              ? `الدرجة ${candidate.score}`
                              : `Score ${candidate.score}`}
                          </span>
                        </div>
                      </td>
                      <td data-column-label={props.locale === "ar" ? "الحجم" : "Volume"}>
                        <div className="stack-tight">
                          <StatusBadge tone={candidate.caseCount > 0 ? "warning" : "neutral"}>
                            {props.locale === "ar"
                              ? `${candidate.caseCount} حالات`
                              : `${candidate.caseCount} cases`}
                          </StatusBadge>
                          <StatusBadge tone={candidate.stillEscalatedCaseCount > 0 ? "warning" : "success"}>
                            {props.locale === "ar"
                              ? `${candidate.stillEscalatedCaseCount} ما زالت متصاعدة`
                              : `${candidate.stillEscalatedCaseCount} still escalated`}
                          </StatusBadge>
                        </div>
                      </td>
                      <td data-column-label={props.locale === "ar" ? "الإجراء" : "Action"}>
                        <div className="stack-tight">
                          <Link className="inline-link" href={buildOperationalRiskExportHref(props.locale, candidate)}>
                            {props.locale === "ar" ? "تنزيل CSV المقترح" : "Download recommended CSV"}
                          </Link>
                          <Link
                            className="inline-link"
                            href={buildOperationalRiskDrillDownHref(props.locale, candidate)}
                          >
                            {props.locale === "ar" ? "فتح نفس النطاق" : "Open same scope"}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            summary={
              props.locale === "ar"
                ? "ستظهر هنا توصيات التصدير عندما تحمل الدفعات الحديثة نطاقات حيّة تستحق السحب أو المراجعة."
                : "Export recommendations will appear here when recent batches carry live scopes worth pulling or reviewing."
            }
            title={props.locale === "ar" ? "لا توجد أولويات تصدير بعد" : "No export priorities yet"}
          />
        )}
      </Panel>
      ) : null}

      {showOperationalRisk ? (
      <Panel title={props.locale === "ar" ? "ضغط تسليمات الردود" : "Reply handoff pressure"}>
        {props.operationalRiskSummary.owners.length > 0 ? (
          <div className="lead-table-wrapper">
            <table className="lead-table">
              <thead>
                <tr>
                  <th>{props.locale === "ar" ? "المالك الحالي" : "Current owner"}</th>
                  <th>{props.locale === "ar" ? "التسليمات المتصاعدة" : "Escalated handoffs"}</th>
                  <th>{props.locale === "ar" ? "التدخلات المفتوحة" : "Open interventions"}</th>
                  <th>{props.locale === "ar" ? "آخر مرسلي الرد" : "Latest reply senders"}</th>
                </tr>
              </thead>
              <tbody>
                {props.operationalRiskSummary.owners.map((owner) => (
                  <tr key={owner.ownerName}>
                    <td data-column-label={props.locale === "ar" ? "المالك الحالي" : "Current owner"}>
                      <div className="table-link">
                        <strong>{owner.ownerName}</strong>
                        <span>
                          {props.locale === "ar"
                            ? `${owner.overdueHandoffCount} تسليمات متأخرة`
                            : `${owner.overdueHandoffCount} overdue handoffs`}
                        </span>
                        <Link
                          className="inline-link"
                          href={buildRevenueManagerHref(
                            props.locale,
                            {
                              ownerName: owner.ownerName,
                              queue: "escalated_handoffs"
                            },
                            { hash: revenueManagerFocusedQueueId }
                          )}
                        >
                          {props.locale === "ar" ? "فتح طابور المالك" : "Open owner queue"}
                        </Link>
                      </div>
                    </td>
                    <td data-column-label={props.locale === "ar" ? "التسليمات المتصاعدة" : "Escalated handoffs"}>
                      <StatusBadge tone="warning">
                        {props.locale === "ar"
                          ? `${owner.escalatedHandoffCount} حالات`
                          : `${owner.escalatedHandoffCount} cases`}
                      </StatusBadge>
                    </td>
                    <td data-column-label={props.locale === "ar" ? "التدخلات المفتوحة" : "Open interventions"}>
                      <StatusBadge tone={owner.openInterventionsCount > 0 ? "warning" : "success"}>
                        {props.locale === "ar"
                          ? `${owner.openInterventionsCount} تدخلات`
                          : `${owner.openInterventionsCount} interventions`}
                      </StatusBadge>
                    </td>
                    <td data-column-label={props.locale === "ar" ? "آخر مرسلي الرد" : "Latest reply senders"}>
                      <div className="status-row-wrap">
                        {owner.latestSenderNames.map((senderName) => (
                          <StatusBadge key={`${owner.ownerName}:${senderName}`}>{senderName}</StatusBadge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            summary={
              props.locale === "ar"
                ? "لا توجد حالياً تسليمات ردود متصاعدة داخل الحالات الحية."
                : "No live escalated reply handoffs are currently present in the active case set."
            }
            title={props.locale === "ar" ? "لا يوجد ضغط تشغيلي" : "No operational handoff pressure"}
          />
        )}
      </Panel>
      ) : null}

      {showOperationalRisk ? (
      <Panel title={props.locale === "ar" ? "نتائج المتابعة الجماعية الأخيرة" : "Recent bulk follow-up results"}>
        {props.operationalRiskSummary.bulkBatches.length > 0 ? (
          <div className="lead-table-wrapper">
            <table className="lead-table">
              <thead>
                <tr>
                  <th>{props.locale === "ar" ? "الدفعة" : "Batch"}</th>
                  <th>{props.locale === "ar" ? "النطاق الأصلي" : "Original scope"}</th>
                  <th>{props.locale === "ar" ? "النتيجة الحالية" : "Current result"}</th>
                  <th>{props.locale === "ar" ? "الانجراف اللاحق" : "Later drift"}</th>
                  <th>{props.locale === "ar" ? "المسار" : "Route"}</th>
                </tr>
              </thead>
              <tbody>
                {props.operationalRiskSummary.bulkBatches.map((batch) => (
                  <tr key={batch.batchId}>
                    <td data-column-label={props.locale === "ar" ? "الدفعة" : "Batch"}>
                      <div className="table-link">
                        <strong>{new Date(batch.savedAt).toLocaleString(props.locale)}</strong>
                        <span>
                          {props.locale === "ar"
                            ? `${batch.caseCount} حالات في الدفعة`
                            : `${batch.caseCount} cases in batch`}
                        </span>
                      </div>
                    </td>
                    <td data-column-label={props.locale === "ar" ? "النطاق الأصلي" : "Original scope"}>
                      <div className="stack-tight">
                        <StatusBadge>{batch.scopedOwnerName}</StatusBadge>
                        <div className="status-row-wrap">
                          {batch.currentOwnerNames.map((ownerName) => (
                            <StatusBadge key={`${batch.batchId}:${ownerName}`}>{ownerName}</StatusBadge>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td data-column-label={props.locale === "ar" ? "النتيجة الحالية" : "Current result"}>
                      <div className="stack-tight">
                        <StatusBadge tone={batch.stillEscalatedCaseCount > 0 ? "warning" : "success"}>
                          {props.locale === "ar"
                            ? `${batch.stillEscalatedCaseCount} ما زالت متصاعدة`
                            : `${batch.stillEscalatedCaseCount} still escalated`}
                        </StatusBadge>
                        <StatusBadge tone={batch.clearedCaseCount > 0 ? "success" : "warning"}>
                          {props.locale === "ar"
                            ? `${batch.clearedCaseCount} خرجت من الخطر`
                            : `${batch.clearedCaseCount} now cleared`}
                        </StatusBadge>
                      </div>
                    </td>
                    <td data-column-label={props.locale === "ar" ? "الانجراف اللاحق" : "Later drift"}>
                      {batch.drift ? (
                        <div className="stack-tight">
                          <StatusBadge tone={batch.drift.casesWithLaterChangesCount > 0 ? "warning" : "success"}>
                            {props.locale === "ar"
                              ? `${batch.drift.casesWithLaterChangesCount} تغيّرت لاحقاً`
                              : `${batch.drift.casesWithLaterChangesCount} changed later`}
                          </StatusBadge>
                          <div className="status-row-wrap">
                            <StatusBadge>{props.locale === "ar" ? `${batch.drift.casesWithHistoryCount} بسجل` : `${batch.drift.casesWithHistoryCount} with history`}</StatusBadge>
                            {batch.drift.postBatchFollowUpUpdateCount > 0 ? (
                              <StatusBadge>
                                {props.locale === "ar"
                                  ? `${batch.drift.postBatchFollowUpUpdateCount} تحديثات متابعة`
                                  : `${batch.drift.postBatchFollowUpUpdateCount} follow-up updates`}
                              </StatusBadge>
                            ) : null}
                            {batch.drift.laterBulkResetCount > 0 ? (
                              <StatusBadge>
                                {props.locale === "ar"
                                  ? `${batch.drift.laterBulkResetCount} دفعات لاحقة`
                                  : `${batch.drift.laterBulkResetCount} later bulk resets`}
                              </StatusBadge>
                            ) : null}
                            {batch.drift.followUpUpdateOnlyCaseCount > 0 ? (
                              <StatusBadge>
                                {props.locale === "ar"
                                  ? `${batch.drift.followUpUpdateOnlyCaseCount} متابعة فقط`
                                  : `${batch.drift.followUpUpdateOnlyCaseCount} follow-up only`}
                              </StatusBadge>
                            ) : null}
                            {batch.drift.laterBulkResetOnlyCaseCount > 0 ? (
                              <StatusBadge>
                                {props.locale === "ar"
                                  ? `${batch.drift.laterBulkResetOnlyCaseCount} دفعة فقط`
                                  : `${batch.drift.laterBulkResetOnlyCaseCount} bulk reset only`}
                              </StatusBadge>
                            ) : null}
                            {batch.drift.mixedReasonCaseCount > 0 ? (
                              <StatusBadge tone="warning">
                                {props.locale === "ar"
                                  ? `${batch.drift.mixedReasonCaseCount} أسباب مختلطة`
                                  : `${batch.drift.mixedReasonCaseCount} mixed reasons`}
                              </StatusBadge>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <StatusBadge>{props.locale === "ar" ? "لا يوجد انجراف مرئي" : "No visible drift"}</StatusBadge>
                      )}
                    </td>
                    <td data-column-label={props.locale === "ar" ? "المسار" : "Route"}>
                      <div className="stack-tight">
                        {batch.drift && batch.drift.casesWithLaterChangesCount > 0 ? (
                          <Link
                            className="inline-link"
                            href={buildRevenueManagerHref(
                              props.locale,
                              {
                                batchDrift: "changed_later",
                                bulkBatchId: batch.batchId
                              },
                              { hash: revenueManagerFocusedQueueId }
                            )}
                          >
                            {props.locale === "ar" ? "فتح الحالات التي تغيّرت لاحقاً" : "Open changed-later cases"}
                          </Link>
                        ) : null}
                        {batch.drift && batch.drift.casesWithLaterChangesCount > 0 ? (
                          <Link
                            className="inline-link"
                            href={buildRevenueManagerExportHref(props.locale, {
                              batchDrift: "changed_later",
                              bulkBatchId: batch.batchId
                            })}
                          >
                            {props.locale === "ar" ? "تنزيل CSV للحالات التي تغيّرت لاحقاً" : "Download changed-later CSV"}
                          </Link>
                        ) : null}
                        {batch.drift && batch.drift.followUpUpdateOnlyCaseCount > 0 ? (
                          <Link
                            className="inline-link"
                            href={buildRevenueManagerHref(
                              props.locale,
                              {
                                batchDrift: "changed_later",
                                batchDriftReason: "follow_up_only",
                                bulkBatchId: batch.batchId
                              },
                              { hash: revenueManagerFocusedQueueId }
                            )}
                          >
                            {props.locale === "ar" ? "فتح حالات المتابعة فقط" : "Open follow-up-only cases"}
                          </Link>
                        ) : null}
                        {batch.drift && batch.drift.followUpUpdateOnlyCaseCount > 0 ? (
                          <Link
                            className="inline-link"
                            href={buildRevenueManagerExportHref(props.locale, {
                              batchDrift: "changed_later",
                              batchDriftReason: "follow_up_only",
                              bulkBatchId: batch.batchId
                            })}
                          >
                            {props.locale === "ar" ? "تنزيل CSV للمتابعة فقط" : "Download follow-up-only CSV"}
                          </Link>
                        ) : null}
                        {batch.drift && batch.drift.laterBulkResetOnlyCaseCount > 0 ? (
                          <Link
                            className="inline-link"
                            href={buildRevenueManagerHref(
                              props.locale,
                              {
                                batchDrift: "changed_later",
                                batchDriftReason: "later_bulk_reset_only",
                                bulkBatchId: batch.batchId
                              },
                              { hash: revenueManagerFocusedQueueId }
                            )}
                          >
                            {props.locale === "ar" ? "فتح حالات الدفعات فقط" : "Open bulk-reset-only cases"}
                          </Link>
                        ) : null}
                        {batch.drift && batch.drift.laterBulkResetOnlyCaseCount > 0 ? (
                          <Link
                            className="inline-link"
                            href={buildRevenueManagerExportHref(props.locale, {
                              batchDrift: "changed_later",
                              batchDriftReason: "later_bulk_reset_only",
                              bulkBatchId: batch.batchId
                            })}
                          >
                            {props.locale === "ar" ? "تنزيل CSV للدفعات فقط" : "Download bulk-reset-only CSV"}
                          </Link>
                        ) : null}
                        {batch.drift && batch.drift.mixedReasonCaseCount > 0 ? (
                          <Link
                            className="inline-link"
                            href={buildRevenueManagerHref(
                              props.locale,
                              {
                                batchDrift: "changed_later",
                                batchDriftReason: "mixed",
                                bulkBatchId: batch.batchId
                              },
                              { hash: revenueManagerFocusedQueueId }
                            )}
                          >
                            {props.locale === "ar" ? "فتح الحالات المختلطة" : "Open mixed-reason cases"}
                          </Link>
                        ) : null}
                        {batch.drift && batch.drift.mixedReasonCaseCount > 0 ? (
                          <Link
                            className="inline-link"
                            href={buildRevenueManagerExportHref(props.locale, {
                              batchDrift: "changed_later",
                              batchDriftReason: "mixed",
                              bulkBatchId: batch.batchId
                            })}
                          >
                            {props.locale === "ar" ? "تنزيل CSV للحالات المختلطة" : "Download mixed-reason CSV"}
                          </Link>
                        ) : null}
                        <Link
                          className="inline-link"
                          href={buildRevenueManagerHref(
                            props.locale,
                            {
                              bulkBatchId: batch.batchId
                            },
                            { hash: revenueManagerFocusedQueueId }
                          )}
                        >
                          {props.locale === "ar" ? "فتح كامل الحالات المتأثرة" : "Open full affected cases"}
                        </Link>
                        <Link
                          className="inline-link"
                          href={buildRevenueManagerExportHref(props.locale, {
                            bulkBatchId: batch.batchId
                          })}
                        >
                          {props.locale === "ar" ? "تنزيل CSV لكامل الحالات المتأثرة" : "Download full affected-case CSV"}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            summary={
              props.locale === "ar"
                ? "لا توجد حالياً دفعات متابعة جماعية حديثة ما زال أثرها وظروف انجرافها ظاهرة على السجل الحي."
                : "No recent bulk follow-up batches currently have visible results or drift signals on the live case set."
            }
            title={props.locale === "ar" ? "لا توجد نتائج جماعية بعد" : "No visible bulk results yet"}
          />
        )}
      </Panel>
      ) : null}

      {showQaHistory ? (
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
      ) : null}
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

function buildOperationalRiskDrillDownHref(locale: SupportedLocale, candidate: GovernanceOperationalRiskExportCandidate) {
  const filters =
    candidate.scope === "full_batch"
      ? {
          bulkBatchId: candidate.batchId
        }
      : {
          batchDrift: "changed_later" as const,
          ...(candidate.scope === "follow_up_only"
            ? { batchDriftReason: "follow_up_only" as const }
            : candidate.scope === "later_bulk_reset_only"
              ? { batchDriftReason: "later_bulk_reset_only" as const }
              : candidate.scope === "mixed"
                ? { batchDriftReason: "mixed" as const }
                : {}),
          bulkBatchId: candidate.batchId
        };

  return buildRevenueManagerHref(locale, filters, { hash: revenueManagerFocusedQueueId });
}

function buildOperationalRiskExportHref(locale: SupportedLocale, candidate: GovernanceOperationalRiskExportCandidate) {
  const filters =
    candidate.scope === "full_batch"
      ? {
          bulkBatchId: candidate.batchId
        }
      : {
          batchDrift: "changed_later" as const,
          ...(candidate.scope === "follow_up_only"
            ? { batchDriftReason: "follow_up_only" as const }
            : candidate.scope === "later_bulk_reset_only"
              ? { batchDriftReason: "later_bulk_reset_only" as const }
              : candidate.scope === "mixed"
                ? { batchDriftReason: "mixed" as const }
                : {}),
          bulkBatchId: candidate.batchId
        };

  return buildRevenueManagerExportHref(locale, filters);
}

function getOperationalRiskExportScopeLabel(locale: SupportedLocale, scope: GovernanceOperationalRiskExportScope) {
  if (locale === "ar") {
    switch (scope) {
      case "full_batch":
        return "كامل الحالات المتأثرة";
      case "changed_later":
        return "الحالات التي تغيّرت لاحقاً";
      case "follow_up_only":
        return "انجراف المتابعة فقط";
      case "later_bulk_reset_only":
        return "انجراف الدفعات فقط";
      case "mixed":
        return "انجراف مختلط";
    }
  }

  switch (scope) {
    case "full_batch":
      return "Full affected cases";
    case "changed_later":
      return "Changed-later cases";
    case "follow_up_only":
      return "Follow-up-only drift";
    case "later_bulk_reset_only":
      return "Bulk-reset-only drift";
    case "mixed":
      return "Mixed-reason drift";
  }
}

function getExportCandidatePriorityLabel(locale: SupportedLocale, priority: GovernanceOperationalRiskExportCandidate["priority"]) {
  if (locale === "ar") {
    switch (priority) {
      case "high":
        return "أولوية عالية";
      case "medium":
        return "أولوية متوسطة";
      case "baseline":
        return "أولوية أساسية";
    }
  }

  switch (priority) {
    case "high":
      return "High priority";
    case "medium":
      return "Medium priority";
    case "baseline":
      return "Baseline";
  }
}

function getExportCandidateTone(priority: GovernanceOperationalRiskExportCandidate["priority"]) {
  switch (priority) {
    case "high":
      return "warning";
    case "medium":
      return "success";
    case "baseline":
      return "neutral";
  }
}

function getReportViewLabel(locale: SupportedLocale, view: GovernanceReportView) {
  if (view === "qa_history") {
    return locale === "ar" ? "تاريخ الجودة" : "QA history";
  }

  if (view === "operational_risk") {
    return locale === "ar" ? "مخاطر التشغيل" : "Operational risk";
  }

  return locale === "ar" ? "مزدوج" : "Blended";
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
