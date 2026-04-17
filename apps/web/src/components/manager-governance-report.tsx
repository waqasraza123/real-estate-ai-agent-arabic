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
import {
  dataTableCellClassName,
  dataTableClassName,
  dataTableHeaderCellClassName,
  dataTableWrapperClassName,
  EmptyState,
  fieldNoteClassName,
  inlineLinkClassName,
  MetricTile,
  pageStackClassName,
  panelSummaryClassName,
  Panel,
  stackTightClassName,
  StatusBadge,
  statusRowWrapClassName,
  tableLinkClassName,
  tableLinkMetaClassName,
  tableLinkTitleClassName,
  twoColumnGridClassName
} from "@real-estate-ai/ui";

import { SegmentedLinkTabs } from "@/components/segmented-link-tabs";
import { ScreenIntro } from "@/components/screen-intro";
import type { ExportRecipient } from "@/lib/export-summary";
import { formatDateTime } from "@/lib/format";
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
  exportRecipient: ExportRecipient;
  filters: ListGovernanceEventsQuery;
  governanceEvents: PersistedGovernanceEventList | null;
  governanceSummary: PersistedGovernanceSummary | null;
  locale: SupportedLocale;
  operationalRiskSummary: GovernanceOperationalRiskSummary;
  view: GovernanceReportView;
}) {
  const activeRoleLabel = getOperatorRoleLabel(props.locale, props.currentOperatorRole);
  const currentOpenCount = props.governanceSummary?.currentOpenItems.totalCount ?? 0;
  const openedCount = props.governanceSummary?.openedItems.totalCount ?? 0;
  const resolvedCount = props.governanceSummary?.resolvedItems.totalCount ?? 0;
  const filteredCount = props.governanceEvents?.totalCount ?? 0;
  const showQaHistory = props.view !== "operational_risk";
  const showOperationalRisk = props.view !== "qa_history";
  const exportOptions = showQaHistory
    ? (["manager", "operations", "qa"] as const).map((recipient) => ({
        href: buildGovernanceExportHref(props.locale, props.filters, recipient),
        recipient
      }))
    : [];

  return (
    <div className={pageStackClassName}>
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
        <div className={pageStackClassName}>
          <p className={panelSummaryClassName}>
            {props.locale === "ar"
              ? `يعمل التقرير بدور ${activeRoleLabel} مع نافذة ${props.filters.windowDays} يوماً وحد أقصى ${props.filters.limit} حدثاً مفصلاً.`
              : `The report is running as ${activeRoleLabel}, scoped to the last ${props.filters.windowDays} days with up to ${props.filters.limit} detailed events.`}
          </p>
          <div className={statusRowWrapClassName}>
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {showQaHistory ? (
          <MetricTile
            detail={
              props.locale === "ar"
                ? "عدد العناصر التي ما زالت عالقة في حدود الجودة الحية."
                : "Items that are still sitting inside a live governance boundary."
            }
            label={props.locale === "ar" ? "حدود مفتوحة الآن" : "Open governance holds"}
            tone="rose"
            value={String(currentOpenCount)}
          />
        ) : null}
        {showQaHistory ? (
          <MetricTile
            detail={
              props.locale === "ar"
                ? "كل فتحات الجودة المسجلة داخل نافذة التقرير الحالية."
                : "All governance openings captured inside the active reporting window."
            }
            label={props.locale === "ar" ? "فتحات النافذة الحالية" : "Opened in window"}
            tone="sand"
            value={String(openedCount)}
          />
        ) : null}
        {showQaHistory ? (
          <MetricTile
            detail={
              props.locale === "ar"
                ? "القرارات التي أغلقت حدود الجودة خلال نفس النافذة."
                : "Decisions that resolved governance boundaries during the same window."
            }
            label={props.locale === "ar" ? "حسم النافذة الحالية" : "Resolved in window"}
            tone="mint"
            value={String(resolvedCount)}
          />
        ) : null}
        {showQaHistory ? (
          <MetricTile
            detail={
              props.locale === "ar"
                ? "إجمالي السجل المطابق بعد تطبيق الفلاتر الحالية قبل التصدير."
                : "Filtered event count after the current scope is applied, before export."
            }
            label={props.locale === "ar" ? "الأحداث المطابقة للفلاتر" : "Events matching filters"}
            tone="ocean"
            value={String(filteredCount)}
          />
        ) : null}
        {showOperationalRisk ? (
          <MetricTile
            detail={
              props.locale === "ar"
                ? "حالات حيّة انتقل فيها الرد البشري إلى مالك جديد ثم أصبحت متأخرة أو محملة بتدخلات مفتوحة."
                : "Live cases where a human reply was handed to a new owner and that handoff is now overdue or intervention-backed."
            }
            label={props.locale === "ar" ? "تسليمات متصاعدة بعد الرد" : "Escalated reply handoffs"}
            tone="ocean"
            value={String(props.operationalRiskSummary.totalEscalatedReplyHandoffCount)}
          />
        ) : null}
        {showOperationalRisk ? (
          <MetricTile
            detail={
              props.locale === "ar"
                ? "الدفعات الحديثة التي تغيّرت فيها الحالات لاحقاً بعد إعادة الضبط الجماعية الأصلية."
                : "Recent bulk batches where affected cases picked up later follow-up changes after the original reset."
            }
            label={props.locale === "ar" ? "دفعات المتابعة مع انجراف" : "Bulk batches with drift"}
            tone="sand"
            value={String(props.operationalRiskSummary.batchesWithDriftCount)}
          />
        ) : null}
        {showOperationalRisk ? (
          <MetricTile
            detail={
              props.locale === "ar"
                ? "عدد الحالات داخل أحدث الدفعات التي حملت تحديث متابعة أو إعادة ضبط جماعية لاحقة."
                : "Affected cases across the recent visible batches that later received another follow-up update or bulk reset."
            }
            label={props.locale === "ar" ? "تغيّرات لاحقة مرئية" : "Visible later changes"}
            tone="ocean"
            value={String(props.operationalRiskSummary.driftedCaseCount)}
          />
        ) : null}
        {showOperationalRisk ? (
          <div className="flex min-h-44 flex-col justify-between rounded-4xl border border-brand-100/90 bg-gradient-to-b from-brand-50 to-white p-5 shadow-panel transition duration-300 hover:-translate-y-0.5 hover:shadow-panel-lg">
            <div className={pageStackClassName}>
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-ink-soft">
                  {props.locale === "ar" ? "مزيج أسباب الانجراف" : "Drift reason mix"}
                </p>
                <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-ink">
                  {props.operationalRiskSummary.mixedReasonDriftCaseCount}
                </p>
              </div>
              <p className="text-sm leading-7 text-ink-soft">
                {props.locale === "ar"
                  ? "حالات انجرفت بسبب تحديث متابعة فردي وإعادة ضبط جماعية لاحقة معاً داخل الدفعات الحديثة المرئية."
                  : "Drifted cases in the recent visible batches that were changed by both later individual follow-up saves and later bulk resets."}
              </p>
            </div>
            <div className={statusRowWrapClassName}>
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
          </div>
        ) : null}
      </div>

      <div className={twoColumnGridClassName}>
        <Panel title={props.locale === "ar" ? "فلاتر سريعة" : "Quick filters"}>
          <div className={pageStackClassName}>
            <SegmentedLinkTabs
              activeValue={props.view}
              items={[
                {
                  href: buildGovernanceReportHref(props.locale, props.filters, "blended", {
                    exportRecipient: props.exportRecipient
                  }),
                  label: props.locale === "ar" ? "مزدوج" : "Blended",
                  value: "blended"
                },
                {
                  href: buildGovernanceReportHref(props.locale, props.filters, "qa_history", {
                    exportRecipient: props.exportRecipient
                  }),
                  label: props.locale === "ar" ? "تاريخ الجودة" : "QA history",
                  value: "qa_history"
                },
                {
                  href: buildGovernanceReportHref(props.locale, props.filters, "operational_risk", {
                    exportRecipient: props.exportRecipient
                  }),
                  label: props.locale === "ar" ? "مخاطر التشغيل" : "Operational risk",
                  value: "operational_risk"
                }
              ]}
              title={props.locale === "ar" ? "وضع التقرير" : "Report mode"}
            />

            <SegmentedLinkTabs
              activeValue={String(props.filters.windowDays)}
              items={[
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, windowDays: 7 }, props.view, {
                    exportRecipient: props.exportRecipient
                  }),
                  label: props.locale === "ar" ? "7 أيام" : "7 days",
                  value: "7"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, windowDays: 30 }, props.view, {
                    exportRecipient: props.exportRecipient
                  }),
                  label: props.locale === "ar" ? "30 يوماً" : "30 days",
                  value: "30"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, windowDays: 60 }, props.view, {
                    exportRecipient: props.exportRecipient
                  }),
                  label: props.locale === "ar" ? "60 يوماً" : "60 days",
                  value: "60"
                }
              ]}
              title={props.locale === "ar" ? "النافذة الزمنية" : "Time window"}
            />

            {showQaHistory ? (
            <SegmentedLinkTabs
              activeValue={props.filters.kind ?? "all"}
              items={[
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, kind: undefined }, props.view, {
                    exportRecipient: props.exportRecipient
                  }),
                  label: props.locale === "ar" ? "الكل" : "All",
                  value: "all"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, kind: "case_message" }, props.view, {
                    exportRecipient: props.exportRecipient
                  }),
                  label: props.locale === "ar" ? "إيرادات" : "Revenue",
                  value: "case_message"
                },
                {
                  href: buildGovernanceReportHref(
                    props.locale,
                    { ...props.filters, kind: "handover_customer_update" },
                    props.view,
                    { exportRecipient: props.exportRecipient }
                  ),
                  label: props.locale === "ar" ? "تسليم" : "Handover",
                  value: "handover_customer_update"
                }
              ]}
              title={props.locale === "ar" ? "السطح" : "Surface"}
            />
            ) : null}

            {showQaHistory ? (
            <SegmentedLinkTabs
              activeValue={props.filters.status ?? "all"}
              items={[
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, status: undefined }, props.view, {
                    exportRecipient: props.exportRecipient
                  }),
                  label: props.locale === "ar" ? "كل الحالات" : "All statuses",
                  value: "all"
                },
                {
                  href: buildGovernanceReportHref(
                    props.locale,
                    { ...props.filters, status: "pending_review" },
                    props.view,
                    { exportRecipient: props.exportRecipient }
                  ),
                  label: props.locale === "ar" ? "قيد الانتظار" : "Pending",
                  value: "pending_review"
                },
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, status: "approved" }, props.view, {
                    exportRecipient: props.exportRecipient
                  }),
                  label: props.locale === "ar" ? "معتمد" : "Approved",
                  value: "approved"
                },
                {
                  href: buildGovernanceReportHref(
                    props.locale,
                    { ...props.filters, status: "follow_up_required" },
                    props.view,
                    { exportRecipient: props.exportRecipient }
                  ),
                  label: props.locale === "ar" ? "تحتاج متابعة" : "Follow-up",
                  value: "follow_up_required"
                }
              ]}
              title={props.locale === "ar" ? "الحالة" : "Status"}
            />
            ) : null}

            {showQaHistory ? (
            <SegmentedLinkTabs
              activeValue={props.filters.subjectType ?? "all"}
              items={[
                {
                  href: buildGovernanceReportHref(props.locale, { ...props.filters, subjectType: undefined }, props.view, {
                    exportRecipient: props.exportRecipient
                  }),
                  label: props.locale === "ar" ? "كل الموضوعات" : "All subjects",
                  value: "all"
                },
                {
                  href: buildGovernanceReportHref(
                    props.locale,
                    { ...props.filters, subjectType: "case_message" },
                    props.view,
                    { exportRecipient: props.exportRecipient }
                  ),
                  label: props.locale === "ar" ? "رسالة محادثة" : "Conversation message",
                  value: "case_message"
                },
                {
                  href: buildGovernanceReportHref(
                    props.locale,
                    { ...props.filters, subjectType: "prepared_reply_draft" },
                    props.view,
                    { exportRecipient: props.exportRecipient }
                  ),
                  label: props.locale === "ar" ? "مسودة رد" : "Reply draft",
                  value: "prepared_reply_draft"
                },
                {
                  href: buildGovernanceReportHref(
                    props.locale,
                    { ...props.filters, subjectType: "scheduling_invite" },
                    props.view,
                    { exportRecipient: props.exportRecipient }
                  ),
                  label: props.locale === "ar" ? "دعوة جدولة" : "Scheduling invite",
                  value: "scheduling_invite"
                },
                {
                  href: buildGovernanceReportHref(
                    props.locale,
                    { ...props.filters, subjectType: "appointment_confirmation" },
                    props.view,
                    { exportRecipient: props.exportRecipient }
                  ),
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
          <div className={pageStackClassName}>
            <p className={panelSummaryClassName}>
              {props.view === "operational_risk"
                ? props.locale === "ar"
                  ? "وضع مخاطر التشغيل يعرض ضغط التسليمات الحية فقط. تصدير CSV على مستوى التقرير يبقى مخصصاً لسجل أحداث الجودة التاريخي، بينما توفّر صفوف الدفعات أدناه تصدير الحالات الحية الدقيقة لكل نطاق دفعة."
                  : "Operational risk mode focuses on live handoff pressure only. Report-level CSV export remains reserved for historical QA-event reporting, while the bulk rows below can export exact live-case scopes per batch."
                : props.locale === "ar"
                  ? "نزّل نفس النطاق الحالي كملف CSV لمشاركته مع التشغيل أو المراجعة اليومية دون فقدان سياق الإشارات أو الأدلة."
                  : "Download the current filtered scope as CSV for operations review without losing policy signals, evidence, or reviewer context."}
            </p>
            <div className={statusRowWrapClassName}>
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
              {showQaHistory ? (
                <StatusBadge tone="success">
                  {getExportRecipientBadgeLabel(props.locale, props.exportRecipient)}
                </StatusBadge>
              ) : null}
            </div>
            <SegmentedLinkTabs
              activeValue={props.exportRecipient}
              items={[
                {
                  href: buildGovernanceReportHref(props.locale, props.filters, props.view, { exportRecipient: "manager" }),
                  label: props.locale === "ar" ? "إدارة" : "Manager",
                  value: "manager"
                },
                {
                  href: buildGovernanceReportHref(props.locale, props.filters, props.view, { exportRecipient: "operations" }),
                  label: props.locale === "ar" ? "تشغيل" : "Operations",
                  value: "operations"
                },
                {
                  href: buildGovernanceReportHref(props.locale, props.filters, props.view, { exportRecipient: "qa" }),
                  label: props.locale === "ar" ? "جودة" : "QA",
                  value: "qa"
                }
              ]}
              title={props.locale === "ar" ? "المستلم الافتراضي للتصدير" : "Default export recipient"}
            />
            {showQaHistory ? (
              <div className={pageStackClassName}>
                {exportOptions.map((option) => (
                  <div key={`report-export:${option.recipient}`} className={stackTightClassName}>
                    <Link className={inlineLinkClassName} href={option.href}>
                      {getGovernanceExportOptionLabel(props.locale, option.recipient)}
                    </Link>
                    <span className={fieldNoteClassName}>{getGovernanceExportOptionSummary(props.locale, option.recipient)}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <Link className={inlineLinkClassName} href={`/${props.locale}/manager`}>
              {props.locale === "ar" ? "العودة إلى بوابة الإدارة" : "Return to the manager gateway"}
            </Link>
          </div>
        </Panel>
      </div>

      {showOperationalRisk ? (
      <Panel title={props.locale === "ar" ? "أولويات التصدير المقترحة" : "Recommended export priorities"}>
        {props.operationalRiskSummary.exportCandidates.length > 0 ? (
          <div className={pageStackClassName}>
            <p className={panelSummaryClassName}>
              {props.locale === "ar"
                ? "يعرض هذا الملخص أي نطاقات CSV الحية تستحق السحب أولاً قبل فتح صفوف الدفعات، اعتماداً على حجم الانجراف وتعقيد سببه والحالات التي ما زالت متصاعدة."
                : "This summary ranks which live CSV scopes are worth pulling first before opening batch rows, based on visible drift volume, drift complexity, and cases that are still escalated."}
            </p>
            <div className={dataTableWrapperClassName}>
              <table className={dataTableClassName}>
                <thead>
                  <tr>
                    <th className={dataTableHeaderCellClassName}>{props.locale === "ar" ? "الأولوية" : "Priority"}</th>
                    <th className={dataTableHeaderCellClassName}>{props.locale === "ar" ? "النطاق المقترح" : "Recommended scope"}</th>
                    <th className={dataTableHeaderCellClassName}>{props.locale === "ar" ? "الحجم" : "Volume"}</th>
                    <th className={dataTableHeaderCellClassName}>{props.locale === "ar" ? "الإجراء" : "Action"}</th>
                  </tr>
                </thead>
                <tbody>
                  {props.operationalRiskSummary.exportCandidates.map((candidate) => (
                    <tr key={`${candidate.batchId}:${candidate.scope}`}>
                      <td className={dataTableCellClassName} data-column-label={props.locale === "ar" ? "الأولوية" : "Priority"}>
                        <div className={stackTightClassName}>
                          <StatusBadge tone={getExportCandidateTone(candidate.priority)}>
                            {getExportCandidatePriorityLabel(props.locale, candidate.priority)}
                          </StatusBadge>
                          <span>{formatDateTime(candidate.savedAt, props.locale)}</span>
                        </div>
                      </td>
                      <td className={dataTableCellClassName} data-column-label={props.locale === "ar" ? "النطاق المقترح" : "Recommended scope"}>
                        <div className={tableLinkClassName}>
                          <strong className={tableLinkTitleClassName}>{getOperationalRiskExportScopeLabel(props.locale, candidate.scope)}</strong>
                          <span className={tableLinkMetaClassName}>
                            {props.locale === "ar"
                              ? `دفعة ${candidate.scopedOwnerName}`
                              : `${candidate.scopedOwnerName} batch`}
                          </span>
                          <span className={tableLinkMetaClassName}>{getExportCandidateJustification(props.locale, candidate)}</span>
                          {candidate.comparisonToNext ? (
                            <span className={tableLinkMetaClassName}>{getExportCandidateComparisonLabel(props.locale, candidate)}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className={dataTableCellClassName} data-column-label={props.locale === "ar" ? "الحجم" : "Volume"}>
                        <div className={stackTightClassName}>
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
                      <td className={dataTableCellClassName} data-column-label={props.locale === "ar" ? "الإجراء" : "Action"}>
                        <div className={stackTightClassName}>
                          {(["manager", "operations", "qa"] as const).map((recipient) => (
                            <Link
                              key={`${candidate.batchId}:${candidate.scope}:${recipient}`}
                              className={inlineLinkClassName}
                              href={buildOperationalRiskExportHref(props.locale, candidate, recipient)}
                            >
                              {getOperationalRiskExportLinkLabel(props.locale, recipient)}
                            </Link>
                          ))}
                          <Link
                            className={inlineLinkClassName}
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
          <div className={dataTableWrapperClassName}>
            <table className={dataTableClassName}>
              <thead>
                <tr>
                  <th className={dataTableHeaderCellClassName}>{props.locale === "ar" ? "المالك الحالي" : "Current owner"}</th>
                  <th className={dataTableHeaderCellClassName}>{props.locale === "ar" ? "التسليمات المتصاعدة" : "Escalated handoffs"}</th>
                  <th className={dataTableHeaderCellClassName}>{props.locale === "ar" ? "التدخلات المفتوحة" : "Open interventions"}</th>
                  <th className={dataTableHeaderCellClassName}>{props.locale === "ar" ? "آخر مرسلي الرد" : "Latest reply senders"}</th>
                </tr>
              </thead>
              <tbody>
                {props.operationalRiskSummary.owners.map((owner) => (
                  <tr key={owner.ownerName}>
                    <td className={dataTableCellClassName} data-column-label={props.locale === "ar" ? "المالك الحالي" : "Current owner"}>
                      <div className={tableLinkClassName}>
                        <strong className={tableLinkTitleClassName}>{owner.ownerName}</strong>
                        <span className={tableLinkMetaClassName}>
                          {props.locale === "ar"
                            ? `${owner.overdueHandoffCount} تسليمات متأخرة`
                            : `${owner.overdueHandoffCount} overdue handoffs`}
                        </span>
                        <Link
                          className={inlineLinkClassName}
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
                    <td className={dataTableCellClassName} data-column-label={props.locale === "ar" ? "التسليمات المتصاعدة" : "Escalated handoffs"}>
                      <StatusBadge tone="warning">
                        {props.locale === "ar"
                          ? `${owner.escalatedHandoffCount} حالات`
                          : `${owner.escalatedHandoffCount} cases`}
                      </StatusBadge>
                    </td>
                    <td className={dataTableCellClassName} data-column-label={props.locale === "ar" ? "التدخلات المفتوحة" : "Open interventions"}>
                      <StatusBadge tone={owner.openInterventionsCount > 0 ? "warning" : "success"}>
                        {props.locale === "ar"
                          ? `${owner.openInterventionsCount} تدخلات`
                          : `${owner.openInterventionsCount} interventions`}
                      </StatusBadge>
                    </td>
                    <td className={dataTableCellClassName} data-column-label={props.locale === "ar" ? "آخر مرسلي الرد" : "Latest reply senders"}>
                      <div className={statusRowWrapClassName}>
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
          <div className={dataTableWrapperClassName}>
            <table className={dataTableClassName}>
              <thead>
                <tr>
                  <th className={dataTableHeaderCellClassName}>{props.locale === "ar" ? "الدفعة" : "Batch"}</th>
                  <th className={dataTableHeaderCellClassName}>{props.locale === "ar" ? "النطاق الأصلي" : "Original scope"}</th>
                  <th className={dataTableHeaderCellClassName}>{props.locale === "ar" ? "النتيجة الحالية" : "Current result"}</th>
                  <th className={dataTableHeaderCellClassName}>{props.locale === "ar" ? "الانجراف اللاحق" : "Later drift"}</th>
                  <th className={dataTableHeaderCellClassName}>{props.locale === "ar" ? "المسار" : "Route"}</th>
                </tr>
              </thead>
              <tbody>
                {props.operationalRiskSummary.bulkBatches.map((batch) => (
                  <tr key={batch.batchId}>
                    <td className={dataTableCellClassName} data-column-label={props.locale === "ar" ? "الدفعة" : "Batch"}>
                      <div className={tableLinkClassName}>
                        <strong className={tableLinkTitleClassName}>{formatDateTime(batch.savedAt, props.locale)}</strong>
                        <span className={tableLinkMetaClassName}>
                          {props.locale === "ar"
                            ? `${batch.caseCount} حالات في الدفعة`
                            : `${batch.caseCount} cases in batch`}
                        </span>
                      </div>
                    </td>
                    <td className={dataTableCellClassName} data-column-label={props.locale === "ar" ? "النطاق الأصلي" : "Original scope"}>
                      <div className={stackTightClassName}>
                        <StatusBadge>{batch.scopedOwnerName}</StatusBadge>
                        <div className={statusRowWrapClassName}>
                          {batch.currentOwnerNames.map((ownerName) => (
                            <StatusBadge key={`${batch.batchId}:${ownerName}`}>{ownerName}</StatusBadge>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className={dataTableCellClassName} data-column-label={props.locale === "ar" ? "النتيجة الحالية" : "Current result"}>
                      <div className={stackTightClassName}>
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
                    <td className={dataTableCellClassName} data-column-label={props.locale === "ar" ? "الانجراف اللاحق" : "Later drift"}>
                      {batch.drift ? (
                        <div className={stackTightClassName}>
                          <StatusBadge tone={batch.drift.casesWithLaterChangesCount > 0 ? "warning" : "success"}>
                            {props.locale === "ar"
                              ? `${batch.drift.casesWithLaterChangesCount} تغيّرت لاحقاً`
                              : `${batch.drift.casesWithLaterChangesCount} changed later`}
                          </StatusBadge>
                          <div className={statusRowWrapClassName}>
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
                    <td className={dataTableCellClassName} data-column-label={props.locale === "ar" ? "المسار" : "Route"}>
                      <div className={stackTightClassName}>
                        {batch.drift && batch.drift.casesWithLaterChangesCount > 0 ? (
                          <Link
                            className={inlineLinkClassName}
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
                            className={inlineLinkClassName}
                            href={buildRevenueManagerExportHref(props.locale, {
                              batchDrift: "changed_later",
                              bulkBatchId: batch.batchId
                            }, { recipient: props.exportRecipient })}
                          >
                            {props.locale === "ar" ? "تنزيل CSV للحالات التي تغيّرت لاحقاً" : "Download changed-later CSV"}
                          </Link>
                        ) : null}
                        {batch.drift && batch.drift.followUpUpdateOnlyCaseCount > 0 ? (
                          <Link
                            className={inlineLinkClassName}
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
                            className={inlineLinkClassName}
                            href={buildRevenueManagerExportHref(props.locale, {
                              batchDrift: "changed_later",
                              batchDriftReason: "follow_up_only",
                              bulkBatchId: batch.batchId
                            }, { recipient: props.exportRecipient })}
                          >
                            {props.locale === "ar" ? "تنزيل CSV للمتابعة فقط" : "Download follow-up-only CSV"}
                          </Link>
                        ) : null}
                        {batch.drift && batch.drift.laterBulkResetOnlyCaseCount > 0 ? (
                          <Link
                            className={inlineLinkClassName}
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
                            className={inlineLinkClassName}
                            href={buildRevenueManagerExportHref(props.locale, {
                              batchDrift: "changed_later",
                              batchDriftReason: "later_bulk_reset_only",
                              bulkBatchId: batch.batchId
                            }, { recipient: props.exportRecipient })}
                          >
                            {props.locale === "ar" ? "تنزيل CSV للدفعات فقط" : "Download bulk-reset-only CSV"}
                          </Link>
                        ) : null}
                        {batch.drift && batch.drift.mixedReasonCaseCount > 0 ? (
                          <Link
                            className={inlineLinkClassName}
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
                            className={inlineLinkClassName}
                            href={buildRevenueManagerExportHref(props.locale, {
                              batchDrift: "changed_later",
                              batchDriftReason: "mixed",
                              bulkBatchId: batch.batchId
                            }, { recipient: props.exportRecipient })}
                          >
                            {props.locale === "ar" ? "تنزيل CSV للحالات المختلطة" : "Download mixed-reason CSV"}
                          </Link>
                        ) : null}
                        <Link
                          className={inlineLinkClassName}
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
                          className={inlineLinkClassName}
                          href={buildRevenueManagerExportHref(props.locale, {
                            bulkBatchId: batch.batchId
                          }, { recipient: props.exportRecipient })}
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
          <div className={dataTableWrapperClassName}>
            <table className={dataTableClassName}>
              <thead>
                <tr>
                  <th className={dataTableHeaderCellClassName}>{props.locale === "ar" ? "الحدث" : "Event"}</th>
                  <th className={dataTableHeaderCellClassName}>{props.locale === "ar" ? "الحالة" : "Status"}</th>
                  <th className={dataTableHeaderCellClassName}>{props.locale === "ar" ? "السياق" : "Context"}</th>
                  <th className={dataTableHeaderCellClassName}>{props.locale === "ar" ? "الأثر" : "Impact"}</th>
                  <th className={dataTableHeaderCellClassName}>{props.locale === "ar" ? "المسار" : "Route"}</th>
                </tr>
              </thead>
              <tbody>
                {props.governanceEvents.items.map((event) => {
                  const routeLink = getEventRouteLink(props.locale, props.currentOperatorRole, event);

                  return (
                    <tr key={`${event.caseId}:${event.createdAt}:${event.action}:${event.subjectType ?? "unknown"}`}>
                      <td className={dataTableCellClassName} data-column-label={props.locale === "ar" ? "الحدث" : "Event"}>
                        <div className={tableLinkClassName}>
                          <strong className={tableLinkTitleClassName}>{event.customerName}</strong>
                          <span className={tableLinkMetaClassName}>{buildCaseReferenceCode(event.caseId)}</span>
                          <span className={tableLinkMetaClassName}>{formatDateTime(event.createdAt, props.locale)}</span>
                          <span className={tableLinkMetaClassName}>
                            {getActionLabel(props.locale, event.action)} · {getKindLabel(props.locale, event.kind)}
                          </span>
                        </div>
                      </td>
                      <td className={dataTableCellClassName} data-column-label={props.locale === "ar" ? "الحالة" : "Status"}>
                        <div className={stackTightClassName}>
                          <StatusBadge tone={getStatusTone(event.status)}>{getStatusLabel(props.locale, event.status)}</StatusBadge>
                          <StatusBadge>{getSubjectLabel(props.locale, event.subjectType)}</StatusBadge>
                          {event.triggerSource ? (
                            <StatusBadge>{event.triggerSource === "policy_rule" ? (props.locale === "ar" ? "قاعدة سياسة" : "Policy rule") : props.locale === "ar" ? "طلب يدوي" : "Manual request"}</StatusBadge>
                          ) : null}
                        </div>
                      </td>
                      <td className={dataTableCellClassName} data-column-label={props.locale === "ar" ? "السياق" : "Context"}>
                        <div className={stackTightClassName}>
                          <p>{event.reviewSummary ?? event.sampleSummary ?? (props.locale === "ar" ? "لا يوجد ملخص إضافي." : "No additional summary.")}</p>
                          {event.draftMessage ? <span>{event.draftMessage}</span> : null}
                        </div>
                      </td>
                      <td className={dataTableCellClassName} data-column-label={props.locale === "ar" ? "الأثر" : "Impact"}>
                        <div className={stackTightClassName}>
                          {event.policySignals.length > 0 ? (
                            <div className={statusRowWrapClassName}>
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
                      <td className={dataTableCellClassName} data-column-label={props.locale === "ar" ? "المسار" : "Route"}>
                        <div className={stackTightClassName}>
                          <Link className={inlineLinkClassName} href={routeLink.href}>
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

function buildGovernanceExportHref(
  locale: SupportedLocale,
  filters: ListGovernanceEventsQuery,
  recipient?: ExportRecipient
) {
  const query = new URLSearchParams();
  const resolvedRecipient =
    recipient ?? (filters.subjectType === "prepared_reply_draft" || filters.status === "pending_review" ? "qa" : "manager");
  query.set("limit", "500");
  query.set("recipient", resolvedRecipient);
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

function buildOperationalRiskExportHref(
  locale: SupportedLocale,
  candidate: GovernanceOperationalRiskExportCandidate,
  recipient: ExportRecipient
) {
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

  return buildRevenueManagerExportHref(locale, filters, { recipient });
}

function getGovernanceExportOptionLabel(locale: SupportedLocale, recipient: ExportRecipient) {
  if (locale === "ar") {
    switch (recipient) {
      case "manager":
        return "تنزيل تقرير CSV للإدارة";
      case "operations":
        return "تنزيل تقرير CSV للتشغيل";
      case "qa":
        return "تنزيل تقرير CSV للجودة";
    }
  }

  switch (recipient) {
    case "manager":
      return "Download manager CSV report";
    case "operations":
      return "Download operations CSV report";
    case "qa":
      return "Download QA CSV report";
  }
}

function getGovernanceExportOptionSummary(locale: SupportedLocale, recipient: ExportRecipient) {
  if (locale === "ar") {
    switch (recipient) {
      case "manager":
        return "يحتفظ هذا الخيار بسياق المراجعة الإداري والتاريخ الكامل للنطاق الحالي.";
      case "operations":
        return "يحوّل نفس السجل إلى صيغة جاهزة للمتابعة اليومية والتنفيذ التشغيلي.";
      case "qa":
        return "يعبّئ نفس السجل بصيغة تدقيق جودة وسياسات أوضح عند المراجعة خارج المنتج.";
    }
  }

  switch (recipient) {
    case "manager":
      return "Keeps the current scope in a manager-facing review format with full historical context.";
    case "operations":
      return "Packages the same history for daily operational follow-up and action-ready review.";
    case "qa":
      return "Frames the same history for QA and policy audit when it leaves the product.";
  }
}

function getExportRecipientBadgeLabel(locale: SupportedLocale, recipient: ExportRecipient) {
  if (locale === "ar") {
    switch (recipient) {
      case "manager":
        return "المستلم الحالي: الإدارة";
      case "operations":
        return "المستلم الحالي: التشغيل";
      case "qa":
        return "المستلم الحالي: الجودة";
    }
  }

  switch (recipient) {
    case "manager":
      return "Recipient: manager";
    case "operations":
      return "Recipient: operations";
    case "qa":
      return "Recipient: QA";
  }
}

function getOperationalRiskExportLinkLabel(locale: SupportedLocale, recipient: ExportRecipient) {
  if (locale === "ar") {
    switch (recipient) {
      case "manager":
        return "CSV إداري";
      case "operations":
        return "CSV تشغيلي";
      case "qa":
        return "CSV جودة";
    }
  }

  switch (recipient) {
    case "manager":
      return "Manager CSV";
    case "operations":
      return "Operations CSV";
    case "qa":
      return "QA CSV";
  }
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

function getExportCandidateJustification(locale: SupportedLocale, candidate: GovernanceOperationalRiskExportCandidate) {
  if (locale === "ar") {
    switch (candidate.scope) {
      case "mixed":
        return `يعزل ${candidate.mixedReasonCaseCount} حالات انجراف مختلط تجمع بين تحديثات المتابعة وإعادات الضبط الجماعية اللاحقة.`;
      case "changed_later":
        return `يغطي ${candidate.changedLaterCaseCount} حالات تغيّرت لاحقاً بعد إعادة الضبط الأصلية.`;
      case "follow_up_only":
        return `يحصر ${candidate.followUpOnlyCaseCount} حالات انجرفت بسبب تحديثات متابعة فردية فقط.`;
      case "later_bulk_reset_only":
        return `يحصر ${candidate.laterBulkResetOnlyCaseCount} حالات انجرفت بسبب دفعات جماعية لاحقة فقط.`;
      case "full_batch":
        return `يحافظ على عرض كامل لـ ${candidate.caseCount} حالات متأثرة داخل هذه الدفعة.`;
    }
  }

  switch (candidate.scope) {
    case "mixed":
      return `Isolates ${candidate.mixedReasonCaseCount} mixed-reason drifted cases touched by both later follow-up saves and later bulk resets.`;
    case "changed_later":
      return `Covers ${candidate.changedLaterCaseCount} cases that changed after the original bulk reset.`;
    case "follow_up_only":
      return `Narrows the export to ${candidate.followUpOnlyCaseCount} cases drifted only by later individual follow-up saves.`;
    case "later_bulk_reset_only":
      return `Narrows the export to ${candidate.laterBulkResetOnlyCaseCount} cases drifted only by later bulk resets.`;
    case "full_batch":
      return `Keeps full coverage of all ${candidate.caseCount} affected cases in the batch.`;
  }
}

function getExportCandidateComparisonLabel(locale: SupportedLocale, candidate: GovernanceOperationalRiskExportCandidate) {
  const comparison = candidate.comparisonToNext;

  if (!comparison) {
    return "";
  }

  if (locale === "ar") {
    switch (comparison.reasonAdvantage) {
      case "mixed_reason_focus":
        return `يتقدم على التوصية التالية لأنه يرفع الحالات ذات السبب المختلط أولاً قبل النطاقات الأوسع.`;
      case "scope_specificity":
        return `يتقدم على التوصية التالية لأنه يقدّم نطاقاً أضيق يركّز على سبب الانجراف بدل كامل الدفعة.`;
      case "broader_coverage":
        return `يتقدم على التوصية التالية لأنه يغطي ${comparison.caseCountDelta} حالات إضافية ضمن نفس أولوية المراجعة الحية.`;
      case "still_escalated_pressure":
        return `يتقدم على التوصية التالية لأنه يبقي ${comparison.stillEscalatedCaseDelta} حالات متصاعدة إضافية داخل النطاق الموصى به.`;
      case "newer_batch":
        return `يتقدم على التوصية التالية لأنه يعود إلى دفعة أحدث ما زالت أقرب إلى ضغط التشغيل الحالي.`;
      case "tie":
        return `يتقدم على التوصية التالية بهامش ترتيب بسيط فقط، لذا يمكن مشاركة النطاقين معاً إذا لزم الأمر.`;
    }
  }

  switch (comparison.reasonAdvantage) {
    case "mixed_reason_focus":
      return "Ranks above the next option because it surfaces mixed-reason drift before broader recovery scopes.";
    case "scope_specificity":
      return "Ranks above the next option because it keeps the export focused on one drift cause instead of the full batch.";
    case "broader_coverage":
      return `Ranks above the next option because it covers ${comparison.caseCountDelta} more live cases in the same review pass.`;
    case "still_escalated_pressure":
      return `Ranks above the next option because it keeps ${comparison.stillEscalatedCaseDelta} more still-escalated cases inside scope.`;
    case "newer_batch":
      return "Ranks above the next option because it comes from a newer batch that is closer to current operating pressure.";
    case "tie":
      return "Only narrowly outranks the next option, so both scopes may be worth sharing together if needed.";
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
