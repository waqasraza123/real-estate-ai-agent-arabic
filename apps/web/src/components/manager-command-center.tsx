import Link from "next/link";

import {
  canOperatorRoleAccessWorkspace,
  type OperatorRole,
  type PersistedCaseSummary,
  type PersistedGovernanceSummary,
  type SupportedLocale
} from "@real-estate-ai/contracts";
import { demoDataset, getLocalizedText } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";
import {
  bulkFollowUpShellClassName,
  caseLinkAsideClassName,
  caseLinkCardClassName,
  caseMetaClassName,
  fieldNoteClassName,
  inlineLinkClassName,
  metricGridClassName,
  MetricTile,
  pageStackClassName,
  Panel,
  rowBetweenClassName,
  stackTightClassName,
  StatusBadge,
  statusRowWrapClassName,
  twoColumnGridClassName,
  WorkflowCard,
  WorkflowPanelBody
} from "@real-estate-ai/ui";

import { ScreenIntro } from "@/components/screen-intro";
import { ReviewSummaryCard } from "@/components/review-summary-card";
import { StatefulStack } from "@/components/stateful-stack";
import { WorkspaceAccessPanel } from "@/components/workspace-access-panel";
import { ManagerBulkFollowUpForm } from "@/components/manager-bulk-follow-up-form";
import { ManagerFollowUpForm } from "@/components/manager-follow-up-form";
import type { ExportRecipient } from "@/lib/export-summary";
import { formatDateTime, formatShortDate } from "@/lib/format";
import {
  getCaseQaPolicySignalLabel,
  getFollowUpManagerCopy,
  getCaseQaReviewStatusLabel,
  getHandoverCustomerUpdateQaReviewStatusLabel,
  getHandoverCustomerUpdateTypeLabel,
  getHandoverCustomerUpdateQaPolicySignalLabel,
  getInterventionCountLabel
} from "@/lib/live-copy";
import { buildManagerGovernanceSummary, type GovernanceSignalCount } from "@/lib/governance-workspace";
import { buildGovernanceReportHref } from "@/lib/governance-report";
import {
  buildManagerWorkspaceQueues,
  getManagerWorkspaceCapabilities,
  getManagerWorkspaceCopy,
  getManagerWorkspaceFallbackAction,
  getManagerWorkspacePath,
  type ManagerWorkspaceRoute
} from "@/lib/manager-workspace";
import { getOperatorPermissionGuardNote, getOperatorRoleLabel } from "@/lib/operator-role";
import {
  buildCaseReferenceCode,
  formatCaseLastChange,
  formatLatestManagerFollowUpSavedAt,
  formatLatestHumanReplySentAt,
  getPersistedAutomationLabel,
  getPersistedAutomationHoldReasonLabel,
  getPersistedCaseStageLabel,
  getPersistedFollowUpLabel,
  getPersistedHandoverCustomerUpdateQaReviewDisplay,
  getPersistedLatestManagerFollowUpLabel,
  getPersistedLatestManagerFollowUpNote,
  hasPersistedLatestHumanReplyEscalation,
  getPersistedLatestHumanReplyEscalationLabel,
  getPersistedHandoverWorkspaceDisplay,
  getPersistedLatestHumanReplyLabel,
  getPersistedLatestHumanReplyOwnershipLabel,
  getPersistedQaReviewDisplay
} from "@/lib/persisted-case-presenters";
import {
  buildRevenueManagerBatchDriftReasonSummaries,
  buildRevenueManagerExportHref,
  buildRevenueManagerHref,
  buildRevenueManagerScope,
  getRevenueManagerBatchDriftReasonFilter,
  revenueManagerFocusedQueueId,
  type RevenueManagerBatchHistorySummary,
  type RevenueManagerBatchDriftReasonFilter,
  type RevenueManagerFilters
} from "@/lib/revenue-manager";

export function HandoverManagerCommandCenter(props: {
  currentOperatorRole: OperatorRole;
  governanceReport: PersistedGovernanceSummary | null;
  locale: SupportedLocale;
  persistedCases: PersistedCaseSummary[];
}) {
  const messages = getMessages(props.locale);
  const workspaceCopy = getManagerWorkspaceCopy(props.locale, "manager_handover");
  const managerCapabilities = getManagerWorkspaceCapabilities(props.currentOperatorRole);
  const { closureCases, executionCases, planningCases } = buildManagerWorkspaceQueues(props.persistedCases);
  const governanceSummary = buildManagerGovernanceSummary(props.persistedCases);
  const canAccessQaWorkspace = canOperatorRoleAccessWorkspace("qa", props.currentOperatorRole);
  const canAccessRevenueManagerWorkspace = canOperatorRoleAccessWorkspace("manager_revenue", props.currentOperatorRole);
  const actionableSurfaceLabels = [
    managerCapabilities.canManagePlanning ? (props.locale === "ar" ? "تخطيط التسليم" : "Handover planning") : null,
    managerCapabilities.canManageExecution ? (props.locale === "ar" ? "تنفيذ التسليم" : "Handover execution") : null,
    managerCapabilities.canManageClosure ? (props.locale === "ar" ? "إغلاق التسليم" : "Handover closure") : null
  ].filter((label): label is string => Boolean(label));

  if (props.persistedCases.length === 0) {
    return (
      <div className={pageStackClassName}>
        <ScreenIntro badge={workspaceCopy.title} summary={workspaceCopy.summary} title={workspaceCopy.title} />

        <Panel title={props.locale === "ar" ? "سجل الدور المحلي الحالي" : "Current local role mode"}>
          <WorkflowPanelBody
            summary={
              props.locale === "ar"
                ? `يعمل هذا المركز بدور ${getOperatorRoleLabel(props.locale, props.currentOperatorRole)} مع واجهة تجريبية جاهزة لمسارات التخطيط والتنفيذ والإغلاق.`
                : `This command center is running as ${getOperatorRoleLabel(props.locale, props.currentOperatorRole)} with a fixture-backed shell for planning, execution, and closure queues.`
            }
          >
            <div className={statusRowWrapClassName}>
              <StatusBadge>{getOperatorRoleLabel(props.locale, props.currentOperatorRole)}</StatusBadge>
              {actionableSurfaceLabels.map((label) => (
                <StatusBadge key={label} tone="success">
                  {label}
                </StatusBadge>
              ))}
            </div>
          </WorkflowPanelBody>
        </Panel>

        <div className={metricGridClassName}>
          <MetricTile
            detail={
              props.locale === "ar"
                ? "واجهة جاهزة لإظهار الحدود التشغيلية حتى قبل تشغيل البيانات الحية."
                : "A seeded surface showing the intended operational boundaries before live data is available."
            }
            label={props.locale === "ar" ? "سجلات التسليم التجريبية" : "Fixture handovers"}
            tone="mint"
            value={String(demoDataset.handoverCases.length)}
          />
          <MetricTile
            detail={
              props.locale === "ar"
                ? "مراحل قابلة للانتقال إلى خطوة مديرية تالية."
                : "Milestones already staged for the next manager-owned boundary."
            }
            label={props.locale === "ar" ? "المراحل الجاهزة" : "Ready milestones"}
            tone="sand"
            value={String(
              demoDataset.handoverCases.flatMap((handoverCase) => handoverCase.milestones).filter((milestone) => milestone.status === "ready")
                .length
            )}
          />
          <MetricTile
            detail={
              props.locale === "ar"
                ? "توضح كيف سيظهر خطر التسليم حتى قبل تفعيل الرحلة الحية بالكامل."
                : "Shows how handover risk will surface before the live workflow is fully enabled."
            }
            label={props.locale === "ar" ? "عوائق مفتوحة" : "Open blockers"}
            tone="rose"
            value={String(
              demoDataset.handoverCases.flatMap((handoverCase) => handoverCase.milestones).filter((milestone) => milestone.status === "blocked")
                .length
            )}
          />
          <MetricTile
            detail={
              props.locale === "ar"
                ? "ستظهر هنا ضغوط جودة المسودات الصادرة عندما تتوفر سجلات تسليم حيّة."
                : "Outbound draft-governance pressure will surface here once live handover records are available."
            }
            label={props.locale === "ar" ? "بوابات جودة المسودات" : "Draft QA gates"}
            tone="ocean"
            value="0"
          />
        </div>

        <div className={twoColumnGridClassName}>
          <Panel title={props.locale === "ar" ? "طابور التسليم التجريبي" : "Fixture handover queue"}>
            <StatefulStack
              emptySummary={messages.states.emptyMilestonesSummary}
              emptyTitle={messages.states.emptyMilestonesTitle}
              items={demoDataset.handoverCases}
              renderItem={(handoverCase) => (
                <Link key={handoverCase.id} className={caseLinkCardClassName} href={`/${props.locale}/handover/${handoverCase.id}`}>
                  <div>
                    <p className={caseMetaClassName}>{getLocalizedText(handoverCase.projectName, props.locale)}</p>
                    <h3>{handoverCase.customerName}</h3>
                    <p>{getLocalizedText(handoverCase.readinessLabel, props.locale)}</p>
                  </div>
                  <div className={caseLinkAsideClassName}>
                    <StatusBadge>{handoverCase.milestones.length}</StatusBadge>
                    <StatusBadge tone="warning">
                      {
                        handoverCase.milestones.filter((milestone) => milestone.status === "blocked" || milestone.status === "in-progress")
                          .length
                      }
                    </StatusBadge>
                  </div>
                </Link>
              )}
            />
          </Panel>

          <Panel title={messages.leads.title}>
            <StatefulStack
              emptySummary={messages.states.emptyCasesSummary}
              emptyTitle={messages.states.emptyCasesTitle}
              items={demoDataset.cases}
              renderItem={(caseItem) => (
                <Link key={caseItem.id} className={caseLinkCardClassName} href={`/${props.locale}/handover/${caseItem.handoverCaseId}`}>
                  <div>
                    <p className={caseMetaClassName}>{caseItem.referenceCode}</p>
                    <h3>{caseItem.customerName}</h3>
                    <p>{getLocalizedText(caseItem.nextAction, props.locale)}</p>
                  </div>
                  <StatusBadge>{caseItem.owner}</StatusBadge>
                </Link>
              )}
            />
          </Panel>
        </div>

        <Panel title={props.locale === "ar" ? "طابور حوكمة المسودات" : "Draft governance queue"}>
          <StatefulStack
            emptySummary={
              props.locale === "ar"
                ? "ستظهر مراجعات جودة مسودات العميل هنا عندما تفتح البوابات على سجلات التسليم الحية."
                : "Prepared customer-update QA gates will appear here once live handover records open outbound governance holds."
            }
            emptyTitle={props.locale === "ar" ? "لا توجد بوابات جودة بعد" : "No draft QA gates yet"}
            items={[]}
            renderItem={() => null}
          />
        </Panel>

        <div className={twoColumnGridClassName}>
          <Panel title={props.locale === "ar" ? "اتجاه جودة المسودات" : "Draft QA trend"}>
            <GovernanceActivityPanel
              emptySummary={
                props.locale === "ar"
                  ? "سيظهر اتجاه فتح وحسم مراجعات مسودات التسليم هنا عند توفر التقرير الحي."
                  : "Opened and resolved draft-review history will appear here once the live governance report is available."
              }
              emptyTitle={props.locale === "ar" ? "لا يوجد تقرير بعد" : "No draft report yet"}
              items={filterGovernanceDailyActivity(props.governanceReport, "handover_customer_update")}
              locale={props.locale}
            />
          </Panel>

          <Panel title={props.locale === "ar" ? "آخر نشاطات جودة المسودات" : "Recent draft QA activity"}>
            <GovernanceRecentEventsPanel
              emptySummary={
                props.locale === "ar"
                  ? "ستظهر آخر بوابات جودة مسودات التسليم هنا عندما تتوفر بيانات التقرير الحي."
                  : "Recent draft QA openings and resolutions will appear here once live governance reporting is available."
              }
              emptyTitle={props.locale === "ar" ? "لا توجد أحداث بعد" : "No draft QA events"}
              events={filterGovernanceRecentEvents(props.governanceReport, "handover_customer_update")}
              locale={props.locale}
            />
          </Panel>
        </div>

        {canAccessRevenueManagerWorkspace ? (
          <WorkspaceAccessPanel
            actionHref={getManagerWorkspacePath(props.locale, "manager_revenue")}
            actionLabel={props.locale === "ar" ? "فتح قيادة الإيرادات" : "Open revenue command center"}
            locale={props.locale}
            operatorRole={props.currentOperatorRole}
            summary={
              props.locale === "ar"
                ? "يمكنك أيضاً الانتقال إلى قيادة الإيرادات للمتابعة التجارية والتدخلات المرتبطة بالحالات نفسها."
                : "You can also switch into the revenue command center for the commercial follow-up and intervention view on the same cases."
            }
            title={props.locale === "ar" ? "التبديل إلى قيادة الإيرادات" : "Switch to revenue command center"}
            workspace="manager_revenue"
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className={pageStackClassName}>
      <ScreenIntro badge={workspaceCopy.title} summary={workspaceCopy.summary} title={workspaceCopy.title} />

      <Panel title={props.locale === "ar" ? "سجل الدور المحلي الحالي" : "Current local role mode"}>
        <WorkflowPanelBody
          summary={
            props.locale === "ar"
              ? `يعمل هذا المركز الآن بدور ${getOperatorRoleLabel(props.locale, props.currentOperatorRole)}. يتم فصل طوابير التخطيط والتنفيذ والإغلاق في مسار مستقل عن متابعة الإيرادات.`
              : `This command center is currently running as ${getOperatorRoleLabel(props.locale, props.currentOperatorRole)}. Planning, execution, and closure queues now live on a dedicated route separate from revenue follow-up.`
          }
        >
          <div className={statusRowWrapClassName}>
            <StatusBadge>{getOperatorRoleLabel(props.locale, props.currentOperatorRole)}</StatusBadge>
            {actionableSurfaceLabels.map((label) => (
              <StatusBadge key={label} tone="success">
                {label}
              </StatusBadge>
            ))}
          </div>
          {canAccessRevenueManagerWorkspace ? (
            <Link className={inlineLinkClassName} href={getManagerWorkspacePath(props.locale, "manager_revenue")}>
              {props.locale === "ar" ? "الانتقال إلى قيادة الإيرادات" : "Switch to revenue command center"}
            </Link>
          ) : null}
          <Link className={inlineLinkClassName} href={`/${props.locale}/manager/governance`}>
            {props.locale === "ar" ? "فتح تقرير الحوكمة" : "Open governance report"}
          </Link>
        </WorkflowPanelBody>
      </Panel>

      <div className={metricGridClassName}>
        <MetricTile
          detail={
            props.locale === "ar"
              ? "سجلات حيّة ما زالت داخل حدود الجاهزية أو الجدولة."
              : "Live records still inside readiness and customer-scheduling boundaries."
          }
          label={props.locale === "ar" ? "تخطيط التسليم" : "Handover planning"}
          tone="mint"
          value={String(planningCases.length)}
        />
        <MetricTile
          detail={
            props.locale === "ar"
              ? "سجلات مجدولة أو قيد التنفيذ تحتاج وضوحاً تشغيلياً."
              : "Scheduled and in-progress records that still need active operational control."
          }
          label={props.locale === "ar" ? "تنفيذ التسليم" : "Handover execution"}
          tone="sand"
          value={String(executionCases.length)}
        />
        <MetricTile
          detail={
            props.locale === "ar"
              ? "سجلات مكتملة دخلت مرحلة المراجعة أو المتابعة أو الأرشفة."
              : "Completed records now inside review, aftercare, or administrative archive boundaries."
          }
          label={props.locale === "ar" ? "إغلاق التسليم" : "Handover closure"}
          tone="rose"
          value={String(closureCases.length)}
        />
        <MetricTile
          detail={
            props.locale === "ar"
              ? "مسودات تحديث العميل التي لا تزال متوقفة بانتظار جودة أو تحتاج إعادة صياغة."
              : "Prepared customer updates that are still blocked on QA or need draft changes before they can move on."
          }
          label={props.locale === "ar" ? "حوكمة المسودات" : "Draft governance"}
          tone="ocean"
          value={String(governanceSummary.handoverAttentionCases.length)}
        />
        <MetricTile
          detail={
            props.locale === "ar"
              ? "عناصر جودة معلقة لأكثر من يوم وتحتاج تصعيداً أو إعادة توجيه واضحة."
              : "Governance items that have been pending for more than a day and likely need escalation or re-routing."
          }
          label={props.locale === "ar" ? "مراجعات قديمة" : "Stale pending QA"}
          tone="rose"
          value={String(governanceSummary.stalePendingCasesCount)}
        />
      </div>

      {managerCapabilities.canManagePlanning ? (
        <Panel title={props.locale === "ar" ? "طابور تخطيط التسليم" : "Handover planning queue"}>
          <StatefulStack
            emptySummary={
              props.locale === "ar"
                ? "لا توجد حالياً سجلات داخل مرحلة تخطيط التسليم."
                : "No live handover records are currently inside the planning surface."
            }
            emptyTitle={props.locale === "ar" ? "لا يوجد طابور تخطيط" : "No planning queue"}
            items={planningCases}
            renderItem={(caseItem) => {
              const handoverDisplay = getPersistedHandoverWorkspaceDisplay(props.locale, caseItem);

              if (!handoverDisplay) {
                return null;
              }

              return (
                <Link key={caseItem.caseId} className={caseLinkCardClassName} href={`/${props.locale}/handover/${handoverDisplay.handoverCaseId}`}>
                  <div>
                    <p className={caseMetaClassName}>{buildCaseReferenceCode(caseItem.caseId)}</p>
                    <h3>{caseItem.customerName}</h3>
                    <p>{caseItem.nextAction}</p>
                    <p className={caseMetaClassName}>{handoverDisplay.updatedAt}</p>
                  </div>
                  <div className={caseLinkAsideClassName}>
                    <StatusBadge tone={handoverDisplay.statusTone}>{handoverDisplay.statusLabel}</StatusBadge>
                    <StatusBadge>{handoverDisplay.surfaceLabel}</StatusBadge>
                  </div>
                </Link>
              );
            }}
          />
        </Panel>
      ) : null}

      <div className={twoColumnGridClassName}>
        <Panel title={props.locale === "ar" ? "طابور حوكمة المسودات" : "Draft governance queue"}>
          <StatefulStack
            emptySummary={
              props.locale === "ar"
                ? "لا توجد حالياً مسودات تحديث عميل متوقفة عند بوابة جودة."
                : "No prepared customer updates are currently sitting in an outbound QA hold."
            }
            emptyTitle={props.locale === "ar" ? "لا توجد بوابات مفتوحة" : "No open draft QA gates"}
            items={governanceSummary.handoverAttentionCases}
            renderItem={(caseItem) => {
              const qaReviewDisplay = getPersistedHandoverCustomerUpdateQaReviewDisplay(props.locale, caseItem);

              if (!qaReviewDisplay) {
                return null;
              }

              return (
                <ReviewSummaryCard
                  key={caseItem.caseId}
                  actions={
                    <>
                      <Link className={inlineLinkClassName} href={`/${props.locale}/handover/${qaReviewDisplay.handoverCaseId}`}>
                        {props.locale === "ar" ? "فتح سجل التسليم" : "Open handover"}
                      </Link>
                      {canAccessQaWorkspace ? (
                        <Link className={inlineLinkClassName} href={`/${props.locale}/qa/cases/${caseItem.caseId}`}>
                          {props.locale === "ar" ? "فتح سجل الجودة" : "Open QA record"}
                        </Link>
                      ) : null}
                    </>
                  }
                  badges={[
                    { label: qaReviewDisplay.reviewStatusLabel, tone: qaReviewDisplay.reviewStatusTone },
                    { label: qaReviewDisplay.typeLabel },
                    ...qaReviewDisplay.policySignalLabels.map((label) => ({ label }))
                  ]}
                  meta={
                    <p className={caseMetaClassName}>
                      {buildCaseReferenceCode(caseItem.caseId)}
                      {" · "}
                      {qaReviewDisplay.updatedAt}
                    </p>
                  }
                  summary={qaReviewDisplay.reviewSummary ?? qaReviewDisplay.reviewSampleSummary}
                  title={caseItem.customerName}
                  tone="critical"
                />
              );
            }}
          />
        </Panel>

        <Panel title={props.locale === "ar" ? "بؤر مخاطر الجودة" : "Governance hotspots"}>
          <GovernanceHotspotsPanel
            emptySummary={
              props.locale === "ar"
                ? "لا توجد حالياً إشارات سياسة مفتوحة داخل مسار التسليم."
                : "No policy hotspots are currently open inside the handover surface."
            }
            emptyTitle={props.locale === "ar" ? "لا توجد بؤر مفتوحة" : "No active hotspots"}
            locale={props.locale}
            topPolicySignals={governanceSummary.topPolicySignals.filter((signal) => signal.kind === "handover_customer_update")}
          />
        </Panel>
      </div>

      <div className={twoColumnGridClassName}>
        <Panel title={props.locale === "ar" ? "اتجاه جودة المسودات" : "Draft QA trend"}>
          <GovernanceActivityPanel
            emptySummary={
              props.locale === "ar"
                ? "لا توجد حالياً بيانات اتجاه محفوظة لمراجعات مسودات التسليم."
                : "No persisted trend history is currently available for handover draft reviews."
            }
            emptyTitle={props.locale === "ar" ? "لا يوجد اتجاه بعد" : "No draft trend yet"}
            items={filterGovernanceDailyActivity(props.governanceReport, "handover_customer_update")}
            locale={props.locale}
          />
        </Panel>

        <Panel title={props.locale === "ar" ? "آخر نشاطات جودة المسودات" : "Recent draft QA activity"}>
          <GovernanceRecentEventsPanel
            emptySummary={
              props.locale === "ar"
                ? "لا توجد حالياً أحداث محفوظة لفتحات أو حسومات جودة مسودات التسليم."
                : "No persisted openings or resolutions are currently recorded for handover draft reviews."
            }
            emptyTitle={props.locale === "ar" ? "لا توجد أحداث حديثة" : "No recent draft QA events"}
            events={filterGovernanceRecentEvents(props.governanceReport, "handover_customer_update")}
            locale={props.locale}
          />
        </Panel>
      </div>

      <div className={twoColumnGridClassName}>
        {managerCapabilities.canManageExecution ? (
          <Panel title={props.locale === "ar" ? "طابور تنفيذ التسليم" : "Handover execution queue"}>
            <StatefulStack
              emptySummary={
                props.locale === "ar"
                  ? "لا توجد حالياً سجلات داخل مرحلة تنفيذ التسليم."
                  : "No live handover records are currently inside the execution surface."
              }
              emptyTitle={props.locale === "ar" ? "لا يوجد طابور تنفيذ" : "No execution queue"}
              items={executionCases}
              renderItem={(caseItem) => {
                const handoverDisplay = getPersistedHandoverWorkspaceDisplay(props.locale, caseItem);

                if (!handoverDisplay) {
                  return null;
                }

                return (
                  <Link key={caseItem.caseId} className={caseLinkCardClassName} href={`/${props.locale}/handover/${handoverDisplay.handoverCaseId}`}>
                    <div>
                      <p className={caseMetaClassName}>{buildCaseReferenceCode(caseItem.caseId)}</p>
                      <h3>{caseItem.customerName}</h3>
                      <p>{caseItem.nextAction}</p>
                      <p className={caseMetaClassName}>{handoverDisplay.updatedAt}</p>
                    </div>
                    <div className={caseLinkAsideClassName}>
                      <StatusBadge tone={handoverDisplay.statusTone}>{handoverDisplay.statusLabel}</StatusBadge>
                      <StatusBadge>{handoverDisplay.surfaceLabel}</StatusBadge>
                    </div>
                  </Link>
                );
              }}
            />
          </Panel>
        ) : null}

        {managerCapabilities.canManageClosure ? (
          <Panel title={props.locale === "ar" ? "طابور إغلاق التسليم" : "Handover closure queue"}>
            <StatefulStack
              emptySummary={
                props.locale === "ar"
                  ? "لا توجد حالياً سجلات مكتملة داخل حدود الإغلاق الإداري."
                  : "No completed handover records are currently inside the administrative closure queue."
              }
              emptyTitle={props.locale === "ar" ? "لا يوجد طابور إغلاق" : "No closure queue"}
              items={closureCases}
              renderItem={(caseItem) => {
                const handoverDisplay = getPersistedHandoverWorkspaceDisplay(props.locale, caseItem);

                if (!handoverDisplay) {
                  return null;
                }

                return (
                  <Link key={caseItem.caseId} className={caseLinkCardClassName} href={`/${props.locale}/handover/${handoverDisplay.handoverCaseId}`}>
                    <div>
                      <p className={caseMetaClassName}>{buildCaseReferenceCode(caseItem.caseId)}</p>
                      <h3>{caseItem.customerName}</h3>
                      <p>{caseItem.nextAction}</p>
                      <p className={caseMetaClassName}>{handoverDisplay.updatedAt}</p>
                    </div>
                    <div className={caseLinkAsideClassName}>
                      <StatusBadge tone={handoverDisplay.statusTone}>{handoverDisplay.statusLabel}</StatusBadge>
                      <StatusBadge>{handoverDisplay.surfaceLabel}</StatusBadge>
                    </div>
                  </Link>
                );
              }}
            />
          </Panel>
        ) : null}
      </div>
    </div>
  );
}

export function ManagerWorkspaceGateway(props: {
  currentOperatorRole: OperatorRole;
  governanceReport: PersistedGovernanceSummary | null;
  locale: SupportedLocale;
  persistedCases: PersistedCaseSummary[];
}) {
  const messages = getMessages(props.locale);
  const { closureCases, executionCases, openInterventionsCount, pausedAutomationCases, planningCases, revenueAttentionCases } =
    buildManagerWorkspaceQueues(props.persistedCases);
  const governanceSummary = buildManagerGovernanceSummary(props.persistedCases);
  const canAccessQaWorkspace = canOperatorRoleAccessWorkspace("qa", props.currentOperatorRole);
  const currentRoleLabel = getOperatorRoleLabel(props.locale, props.currentOperatorRole);

  return (
    <div className={pageStackClassName}>
      <ScreenIntro
        badge={messages.manager.title}
        summary={
          props.locale === "ar"
            ? "اختر مركز القيادة الذي يطابق القرار التشغيلي التالي. تم الآن فصل متابعة الإيرادات عن حدود قيادة التسليم في مسارات مستقلة."
            : "Choose the command center that matches the next operational decision. Revenue follow-up and handover command work now live on dedicated routes."
        }
        title={messages.manager.title}
      />

      <Panel title={props.locale === "ar" ? "سجل الدور المحلي الحالي" : "Current local role mode"}>
        <WorkflowPanelBody
          summary={
            props.locale === "ar"
              ? `يعمل مدخل الإدارة الآن بدور ${currentRoleLabel}. بما أن هذا الدور يملك أكثر من مساحة إدارية، فقد تم إبقاء هذا المسار كبوابة اختيار واضحة.`
              : `The manager entry is currently running as ${currentRoleLabel}. Because this role can operate more than one manager surface, this route now acts as an explicit workspace gateway.`
          }
        >
          <div className={statusRowWrapClassName}>
            <StatusBadge>{currentRoleLabel}</StatusBadge>
            <StatusBadge tone="success">{getManagerWorkspaceCopy(props.locale, "manager_revenue").title}</StatusBadge>
            <StatusBadge tone="success">{getManagerWorkspaceCopy(props.locale, "manager_handover").title}</StatusBadge>
          </div>
          <Link className={inlineLinkClassName} href={`/${props.locale}/manager/governance`}>
            {props.locale === "ar" ? "فتح تقرير الحوكمة" : "Open governance report"}
          </Link>
        </WorkflowPanelBody>
      </Panel>

      {props.persistedCases.length > 0 ? (
        <Panel title={props.locale === "ar" ? "ضغط الحوكمة الحالي" : "Current governance pressure"}>
          <WorkflowPanelBody
            summary={
              props.locale === "ar"
                ? `${governanceSummary.totalAttentionCasesCount} عنصر حوكمة مفتوح عبر الإيرادات والتسليم، منها ${governanceSummary.pendingCasesCount} بانتظار القرار و${governanceSummary.followUpRequiredCasesCount} تحتاج تصحيحاً.`
                : `${governanceSummary.totalAttentionCasesCount} governance items are open across revenue and handover, with ${governanceSummary.pendingCasesCount} waiting for a decision and ${governanceSummary.followUpRequiredCasesCount} needing corrective follow-up.`
            }
          >
            <div className={statusRowWrapClassName}>
              <StatusBadge tone="critical">
                {props.locale === "ar" ? `${governanceSummary.pendingCasesCount} بانتظار المراجعة` : `${governanceSummary.pendingCasesCount} pending`}
              </StatusBadge>
              <StatusBadge tone="warning">
                {props.locale === "ar"
                  ? `${governanceSummary.followUpRequiredCasesCount} تحتاج متابعة`
                  : `${governanceSummary.followUpRequiredCasesCount} follow-up`}
              </StatusBadge>
              <StatusBadge>
                {props.locale === "ar"
                  ? `${governanceSummary.handoverAttentionCases.length} في التسليم`
                  : `${governanceSummary.handoverAttentionCases.length} handover`}
              </StatusBadge>
              <StatusBadge>
                {props.locale === "ar"
                  ? `${governanceSummary.revenueAttentionCases.length} في الإيرادات`
                  : `${governanceSummary.revenueAttentionCases.length} revenue`}
              </StatusBadge>
              {governanceSummary.topPolicySignals[0] ? (
                <StatusBadge>{getGovernanceSignalLabel(props.locale, governanceSummary.topPolicySignals[0])}</StatusBadge>
              ) : null}
            </div>
          {canAccessQaWorkspace ? (
            <Link className={inlineLinkClassName} href={`/${props.locale}/qa`}>
              {props.locale === "ar" ? "فتح مركز الجودة" : "Open QA review center"}
            </Link>
          ) : null}
          <Link className={inlineLinkClassName} href={`/${props.locale}/manager/governance`}>
            {props.locale === "ar" ? "فتح تقرير الحوكمة" : "Open governance report"}
          </Link>
          </WorkflowPanelBody>
        </Panel>
      ) : null}

      <div className={twoColumnGridClassName}>
        <Panel title={props.locale === "ar" ? "اتجاه الحوكمة لسبعة أيام" : "7-day governance trend"}>
          <GovernanceActivityPanel
            emptySummary={
              props.locale === "ar"
                ? "سيظهر تاريخ الفتح والحسم هنا عندما تتوفر بيانات تقرير الحوكمة الحي."
                : "Opened and resolved governance history will appear here once the live reporting summary is available."
            }
            emptyTitle={props.locale === "ar" ? "لا يوجد تقرير بعد" : "No governance report yet"}
            items={props.governanceReport?.dailyActivity ?? []}
            locale={props.locale}
          />
        </Panel>

        <Panel title={props.locale === "ar" ? "أحدث نشاطات الحوكمة" : "Recent governance activity"}>
          <GovernanceRecentEventsPanel
            emptySummary={
              props.locale === "ar"
                ? "سيظهر آخر فتح أو حسم لحدود الجودة هنا عندما تتوفر بيانات التقرير الحي."
                : "Recent QA opens and resolutions will appear here once the live governance report is available."
            }
            emptyTitle={props.locale === "ar" ? "لا توجد أحداث بعد" : "No recent governance events"}
            events={props.governanceReport?.recentEvents ?? []}
            locale={props.locale}
          />
        </Panel>
      </div>

      <div className={twoColumnGridClassName}>
        <WorkspaceAccessPanel
          actionHref={getManagerWorkspacePath(props.locale, "manager_revenue")}
          actionLabel={props.locale === "ar" ? "فتح قيادة الإيرادات" : "Open revenue command center"}
          locale={props.locale}
          operatorRole={props.currentOperatorRole}
          summary={
            props.persistedCases.length > 0
              ? props.locale === "ar"
                ? `متابعة ${revenueAttentionCases.length} حالة تحتاج اهتماماً مباشراً مع ${openInterventionsCount} تدخلاً مفتوحاً و${pausedAutomationCases.length} حالة أتمتتها متوقفة.`
                : `Track ${revenueAttentionCases.length} cases that need direct attention, ${openInterventionsCount} open interventions, and ${pausedAutomationCases.length} paused automation records.`
              : props.locale === "ar"
                ? `واجهة الإيرادات ما زالت تعتمد على البيانات التجريبية، لكنها جاهزة لإظهار ${demoDataset.managerAlerts.length} تنبيهين إداريين و${demoDataset.cases.length} حالات مرتبطة.`
                : `The revenue surface is still fixture-backed, but it is ready to present ${demoDataset.managerAlerts.length} manager alerts and ${demoDataset.cases.length} linked cases.`
          }
          title={getManagerWorkspaceCopy(props.locale, "manager_revenue").title}
          workspace="manager_revenue"
        />

        <WorkspaceAccessPanel
          actionHref={getManagerWorkspacePath(props.locale, "manager_handover")}
          actionLabel={props.locale === "ar" ? "فتح قيادة التسليم" : "Open handover command center"}
          locale={props.locale}
          operatorRole={props.currentOperatorRole}
          summary={
            props.persistedCases.length > 0
              ? props.locale === "ar"
                ? `يوزع ${planningCases.length} سجلاً في التخطيط و${executionCases.length} في التنفيذ و${closureCases.length} في الإغلاق داخل مسار قيادي مخصص للتسليم.`
                : `${planningCases.length} planning, ${executionCases.length} execution, and ${closureCases.length} closure records now live inside a dedicated handover command route.`
              : props.locale === "ar"
                ? `واجهة التسليم جاهزة لإظهار ${demoDataset.handoverCases.length} سجلات تجريبية مع حدود تخطيط وتنفيذ وإغلاق واضحة.`
                : `The handover surface is ready to present ${demoDataset.handoverCases.length} fixture handover records with explicit planning, execution, and closure boundaries.`
          }
          title={getManagerWorkspaceCopy(props.locale, "manager_handover").title}
          workspace="manager_handover"
        />
      </div>
    </div>
  );
}

export function ManagerWorkspaceUnavailable(props: {
  currentOperatorRole: OperatorRole;
  locale: SupportedLocale;
  workspace: ManagerWorkspaceRoute;
}) {
  const workspaceCopy = getManagerWorkspaceCopy(props.locale, props.workspace);
  const fallbackAction = getManagerWorkspaceFallbackAction(props.locale, props.currentOperatorRole);

  return (
    <div className={pageStackClassName}>
      <ScreenIntro badge={workspaceCopy.title} summary={workspaceCopy.summary} title={workspaceCopy.title} />
      <WorkspaceAccessPanel
        actionHref={fallbackAction.href}
        actionLabel={fallbackAction.label}
        locale={props.locale}
        operatorRole={props.currentOperatorRole}
        summary={
          props.locale === "ar"
            ? "هذا المسار الإداري محجوز للأدوار التي تملك هذه الحدود صراحة داخل وضع الجلسة المحلي الموثوق."
            : "This manager route is reserved for roles that explicitly own this command boundary in trusted local session mode."
        }
        title={workspaceCopy.accessRequiredTitle}
        workspace={props.workspace}
      />
    </div>
  );
}

export function RevenueManagerCommandCenter(props: {
  batchHistory: RevenueManagerBatchHistorySummary | null;
  currentOperatorRole: OperatorRole;
  driftedBatchCaseIds: string[];
  filters: RevenueManagerFilters;
  governanceReport: PersistedGovernanceSummary | null;
  locale: SupportedLocale;
  persistedCases: PersistedCaseSummary[];
}) {
  const messages = getMessages(props.locale);
  const workspaceCopy = getManagerWorkspaceCopy(props.locale, "manager_revenue");
  const managerCapabilities = getManagerWorkspaceCapabilities(props.currentOperatorRole);
  const revenueScope = buildRevenueManagerScope(props.persistedCases, props.filters, {
    changedCaseIds: new Set(props.driftedBatchCaseIds)
  });
  const {
    escalatedPostReplyHandoffCases,
    governanceHeldAutomationCases,
    openInterventionsCount,
    pausedAutomationCases,
    postReplyHandoffCases,
    revenueAttentionCases
  } = revenueScope.ownerScopedQueues;
  const governanceSummary = buildManagerGovernanceSummary(revenueScope.ownerScopedCases);
  const canAccessHandoverManagerWorkspace = canOperatorRoleAccessWorkspace("manager_handover", props.currentOperatorRole);
  const canAccessHandoverWorkspace = canOperatorRoleAccessWorkspace("handover", props.currentOperatorRole);
  const canAccessQaWorkspace = canOperatorRoleAccessWorkspace("qa", props.currentOperatorRole);
  const canManageFollowUp = managerCapabilities.canManageFollowUp;
  const followUpManagerCopy = getFollowUpManagerCopy(props.locale);
  const followUpGuardNote = getOperatorPermissionGuardNote(props.locale, "manage_case_follow_up");
  const hasScopedBatchView = Boolean(revenueScope.batchScope);
  const hasChangedLaterBatchView = hasScopedBatchView && props.filters.batchDrift === "changed_later";
  const hasChangedLaterReasonScopedView = hasChangedLaterBatchView && Boolean(props.filters.batchDriftReason);
  const batchScopeSavedAt = revenueScope.batchScope ? formatDateTime(revenueScope.batchScope.savedAt, props.locale) : null;
  const batchOwnerGroups = revenueScope.batchOwnerGroups;
  const hasScopedView = props.filters.queue !== "all" || Boolean(props.filters.ownerName) || hasScopedBatchView;
  const canShowBulkOperationalRiskActioning =
    props.filters.queue === "escalated_handoffs" &&
    Boolean(props.filters.ownerName) &&
    !hasScopedBatchView &&
    revenueScope.focusedCases.length > 1;
  const clearScopeHref = buildRevenueManagerHref(props.locale);
  const batchExportOptions = hasScopedBatchView
    ? (["manager", "operations", "qa"] as const).map((recipient) => ({
        href: buildRevenueManagerExportHref(props.locale, props.filters, { recipient }),
        recipient
      }))
    : [];
  const batchDriftReasonSummaryByCaseId = new Map(
    buildRevenueManagerBatchDriftReasonSummaries(props.batchHistory).map((summary) => [summary.caseId, summary])
  );
  const fullBatchScopeHref =
    hasChangedLaterBatchView && props.filters.bulkBatchId
      ? buildRevenueManagerHref(
          props.locale,
          {
            bulkBatchId: props.filters.bulkBatchId
          },
          { hash: revenueManagerFocusedQueueId }
        )
      : null;
  const changedLaterBatchScopeHref =
    hasChangedLaterReasonScopedView && props.filters.bulkBatchId
      ? buildRevenueManagerHref(
          props.locale,
          {
            batchDrift: "changed_later",
            bulkBatchId: props.filters.bulkBatchId
          },
          { hash: revenueManagerFocusedQueueId }
        )
      : null;
  const operationalRiskReportHref = buildGovernanceReportHref(props.locale, { windowDays: 30 }, "operational_risk");
  const scopedReturnPath = buildRevenueManagerHref(props.locale, props.filters, { hash: revenueManagerFocusedQueueId });
  const batchDriftReasonScopeLabel = props.filters.batchDriftReason
    ? getRevenueManagerBatchDriftReasonScopeLabel(props.locale, props.filters.batchDriftReason)
    : null;

  if (props.persistedCases.length === 0) {
    return (
      <div className={pageStackClassName}>
        <ScreenIntro badge={workspaceCopy.title} summary={workspaceCopy.summary} title={workspaceCopy.title} />

        <Panel title={props.locale === "ar" ? "سجل الدور المحلي الحالي" : "Current local role mode"}>
          <WorkflowPanelBody
            summary={
              props.locale === "ar"
                ? `يعمل هذا المركز بدور ${getOperatorRoleLabel(props.locale, props.currentOperatorRole)} مع طابور متابعة تجريبي جاهز للتحول إلى بيانات حية.`
                : `This command center is running as ${getOperatorRoleLabel(props.locale, props.currentOperatorRole)} with a fixture-backed follow-up queue ready to move onto live data.`
            }
          >
            <div className={statusRowWrapClassName}>
              <StatusBadge>{getOperatorRoleLabel(props.locale, props.currentOperatorRole)}</StatusBadge>
              {managerCapabilities.canManageFollowUp ? (
                <StatusBadge tone="success">{props.locale === "ar" ? "المتابعة" : "Follow-up"}</StatusBadge>
              ) : null}
            </div>
          </WorkflowPanelBody>
        </Panel>

        <div className={metricGridClassName}>
          <MetricTile
            detail={
              props.locale === "ar"
                ? "تنبيهات مزروعة لإثبات وضوح طوابير التدخل التجاري."
                : "Fixture alerts proving the intended commercial intervention queue."
            }
            label={props.locale === "ar" ? "تنبيهات الإدارة" : "Manager alerts"}
            tone="ocean"
            value={String(demoDataset.managerAlerts.length)}
          />
          <MetricTile
            detail={
              props.locale === "ar"
                ? "سجل حالات جاهز للانتقال من المتابعة إلى الإجراءات التالية."
                : "A case list already wired for follow-up ownership and next-step visibility."
            }
            label={props.locale === "ar" ? "حالات مرتبطة" : "Linked cases"}
            tone="sand"
            value={String(demoDataset.cases.length)}
          />
          <MetricTile
            detail={
              props.locale === "ar"
                ? "ستظهر مراجعات جودة الرسائل هنا عندما تتوفر حالات حيّة محفوظة."
                : "Conversation-governance holds will surface here once persisted live cases are available."
            }
            label={props.locale === "ar" ? "ضغوط الحوكمة" : "Governance pressure"}
            tone="rose"
            value="0"
          />
        </div>

        <div className={twoColumnGridClassName}>
          <Panel title={props.locale === "ar" ? "طابور متابعة الإيرادات" : "Revenue follow-up queue"}>
            <StatefulStack
              emptySummary={messages.states.emptyAlertsSummary}
              emptyTitle={messages.states.emptyAlertsTitle}
              items={demoDataset.managerAlerts}
              renderItem={(alert) => (
                <WorkflowCard
                  key={alert.id}
                  badges={<StatusBadge tone={alert.severity === "high" ? "critical" : "warning"}>{alert.severity}</StatusBadge>}
                  summary={getLocalizedText(alert.detail, props.locale)}
                  title={getLocalizedText(alert.title, props.locale)}
                  tone={alert.severity === "high" ? "critical" : "warning"}
                />
              )}
            />
          </Panel>

          <Panel title={messages.leads.title}>
            <StatefulStack
              emptySummary={messages.states.emptyCasesSummary}
              emptyTitle={messages.states.emptyCasesTitle}
              items={demoDataset.cases}
              renderItem={(caseItem) => (
                <Link key={caseItem.id} className={caseLinkCardClassName} href={`/${props.locale}/leads/${caseItem.id}`}>
                  <div>
                    <p className={caseMetaClassName}>{caseItem.referenceCode}</p>
                    <h3>{caseItem.customerName}</h3>
                    <p>{getLocalizedText(caseItem.nextAction, props.locale)}</p>
                  </div>
                  <StatusBadge>{caseItem.owner}</StatusBadge>
                </Link>
              )}
            />
          </Panel>
        </div>

        <Panel title={props.locale === "ar" ? "طابور حوكمة الإيرادات" : "Revenue governance queue"}>
          <StatefulStack
            emptySummary={
              props.locale === "ar"
                ? "ستظهر مراجعات جودة الرسائل هنا عندما تُرسل الحالات الحية إلى بوابات الجودة."
                : "Conversation QA holds will appear here once live cases start opening governance review gates."
            }
            emptyTitle={props.locale === "ar" ? "لا توجد مراجعات جودة بعد" : "No conversation QA holds yet"}
            items={[]}
            renderItem={() => null}
          />
        </Panel>

        <div className={twoColumnGridClassName}>
          <Panel title={props.locale === "ar" ? "اتجاه جودة المحادثات" : "Conversation QA trend"}>
            <GovernanceActivityPanel
              emptySummary={
                props.locale === "ar"
                  ? "سيظهر اتجاه فتح وحسم مراجعات المحادثات هنا عند توفر التقرير الحي."
                  : "Opened and resolved conversation-review history will appear here once the live governance report is available."
              }
              emptyTitle={props.locale === "ar" ? "لا يوجد تقرير بعد" : "No conversation report yet"}
              items={filterGovernanceDailyActivity(props.governanceReport, "case_message")}
              locale={props.locale}
            />
          </Panel>

          <Panel title={props.locale === "ar" ? "آخر نشاطات جودة المحادثات" : "Recent conversation QA activity"}>
            <GovernanceRecentEventsPanel
              emptySummary={
                props.locale === "ar"
                  ? "ستظهر آخر فتحات وحسومات جودة المحادثات هنا عندما تتوفر بيانات التقرير الحي."
                  : "Recent conversation QA openings and resolutions will appear here once live governance reporting is available."
              }
              emptyTitle={props.locale === "ar" ? "لا توجد أحداث بعد" : "No conversation QA events"}
              events={filterGovernanceRecentEvents(props.governanceReport, "case_message")}
              locale={props.locale}
            />
          </Panel>
        </div>

        {canAccessHandoverManagerWorkspace ? (
          <WorkspaceAccessPanel
            actionHref={getManagerWorkspacePath(props.locale, "manager_handover")}
            actionLabel={props.locale === "ar" ? "فتح قيادة التسليم" : "Open handover command center"}
            locale={props.locale}
            operatorRole={props.currentOperatorRole}
            summary={
              props.locale === "ar"
                ? "إذا أردت الانتقال من متابعة الإيرادات إلى حدود التسليم الحي، افتح قيادة التسليم المخصصة."
                : "If you need to move from revenue attention into live handover boundaries, open the dedicated handover command center."
            }
            title={props.locale === "ar" ? "التبديل إلى قيادة التسليم" : "Switch to handover command center"}
            workspace="manager_handover"
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className={pageStackClassName}>
      <ScreenIntro badge={workspaceCopy.title} summary={workspaceCopy.summary} title={workspaceCopy.title} />

      <Panel title={props.locale === "ar" ? "سجل الدور المحلي الحالي" : "Current local role mode"}>
        <WorkflowPanelBody
          summary={
            props.locale === "ar"
              ? `يعمل هذا المركز الآن بدور ${getOperatorRoleLabel(props.locale, props.currentOperatorRole)}. تمت إزالة طوابير التسليم من هذا المسار حتى تبقى متابعة الإيرادات واضحة وقابلة للتنفيذ.`
              : `This command center is currently running as ${getOperatorRoleLabel(props.locale, props.currentOperatorRole)}. Handover queues have moved off this route so revenue follow-up can stay focused and actionable.`
          }
        >
          <div className={statusRowWrapClassName}>
            <StatusBadge>{getOperatorRoleLabel(props.locale, props.currentOperatorRole)}</StatusBadge>
            {managerCapabilities.canManageFollowUp ? (
              <StatusBadge tone="success">{props.locale === "ar" ? "المتابعة" : "Follow-up"}</StatusBadge>
            ) : null}
          </div>
          {canAccessHandoverManagerWorkspace ? (
            <Link className={inlineLinkClassName} href={getManagerWorkspacePath(props.locale, "manager_handover")}>
              {props.locale === "ar" ? "الانتقال إلى قيادة التسليم" : "Switch to handover command center"}
            </Link>
          ) : null}
          <Link className={inlineLinkClassName} href={`/${props.locale}/manager/governance`}>
            {props.locale === "ar" ? "فتح تقرير الحوكمة" : "Open governance report"}
          </Link>
        </WorkflowPanelBody>
      </Panel>

      {hasScopedView ? (
        <Panel title={props.locale === "ar" ? "نطاق الطابور الحالي" : "Current queue scope"}>
          <WorkflowPanelBody
            summary={
              hasScopedBatchView && revenueScope.batchScope
                ? props.locale === "ar"
                  ? hasChangedLaterReasonScopedView && batchDriftReasonScopeLabel
                    ? `يعرض هذا النطاق فقط الحالات المتأثرة من الدفعة الجماعية المحفوظة ${batchScopeSavedAt} التي تغيّرت لاحقاً بسبب ${batchDriftReasonScopeLabel} بعد إعادة الضبط الأصلية من نطاق ${revenueScope.batchScope.scopedOwnerName}.`
                    : hasChangedLaterBatchView
                    ? `يعرض هذا النطاق فقط الحالات المتأثرة من الدفعة الجماعية المحفوظة ${batchScopeSavedAt} التي تغيّرت لاحقاً بعد إعادة الضبط الأصلية من نطاق ${revenueScope.batchScope.scopedOwnerName}.`
                    : `يعرض هذا النطاق الحالات الحية المتأثرة مباشرة بالدفعة الجماعية المحفوظة ${batchScopeSavedAt} من نطاق ${revenueScope.batchScope.scopedOwnerName}.`
                  : hasChangedLaterReasonScopedView && batchDriftReasonScopeLabel
                    ? `This scope shows only the affected cases from the bulk follow-up batch saved ${batchScopeSavedAt} that changed later because of ${batchDriftReasonScopeLabel} after the original reset from ${revenueScope.batchScope.scopedOwnerName}.`
                    : hasChangedLaterBatchView
                    ? `This scope shows only the affected cases from the bulk follow-up batch saved ${batchScopeSavedAt} that changed later after the original reset from ${revenueScope.batchScope.scopedOwnerName}.`
                    : `This scope shows the exact live cases affected by the bulk follow-up batch saved ${batchScopeSavedAt} from ${revenueScope.batchScope.scopedOwnerName}.`
                : props.filters.queue === "escalated_handoffs"
                ? props.locale === "ar"
                  ? props.filters.ownerName
                    ? `يعرض هذا النطاق فقط تسليمات ما بعد الرد المتصاعدة المسندة حالياً إلى ${props.filters.ownerName}.`
                    : "يعرض هذا النطاق فقط تسليمات ما بعد الرد المتصاعدة عبر كل الملاك الحاليين."
                  : props.filters.ownerName
                    ? `This scope is narrowed to escalated post-reply handoffs currently owned by ${props.filters.ownerName}.`
                    : "This scope is narrowed to escalated post-reply handoffs across the active owner set."
                : props.locale === "ar"
                  ? "يعمل هذا العرض داخل نطاق مخصص لقرار تشغيلي أكثر تركيزاً."
                  : "This view is running inside a narrower operational scope."
            }
          >
            <div id={revenueManagerFocusedQueueId} />
            <div className={statusRowWrapClassName}>
              <StatusBadge>
                {hasScopedBatchView
                  ? props.locale === "ar"
                    ? hasChangedLaterReasonScopedView
                      ? "نطاق سبب الانجراف"
                      : hasChangedLaterBatchView
                        ? "نطاق الانجراف اللاحق"
                      : "نطاق نتيجة الدفعة"
                    : hasChangedLaterReasonScopedView
                      ? "Drift-reason scope"
                      : hasChangedLaterBatchView
                        ? "Later-drift scope"
                      : "Bulk-result scope"
                  : props.filters.queue === "escalated_handoffs"
                    ? props.locale === "ar"
                      ? "طابور المخاطر التشغيلية"
                      : "Operational-risk queue"
                    : props.locale === "ar"
                      ? "نطاق مخصص"
                      : "Scoped view"}
              </StatusBadge>
              {props.filters.ownerName ? <StatusBadge>{props.filters.ownerName}</StatusBadge> : null}
              {hasScopedBatchView && revenueScope.batchScope ? <StatusBadge>{revenueScope.batchScope.scopedOwnerName}</StatusBadge> : null}
              {hasChangedLaterBatchView ? (
                <StatusBadge tone={revenueScope.focusedCases.length > 0 ? "warning" : "success"}>
                  {props.locale === "ar" ? "الحالات التي تغيّرت لاحقاً فقط" : "Changed-later cases only"}
                </StatusBadge>
              ) : null}
              {hasChangedLaterReasonScopedView && batchDriftReasonScopeLabel ? <StatusBadge>{batchDriftReasonScopeLabel}</StatusBadge> : null}
              <StatusBadge tone={revenueScope.focusedCases.length > 0 ? "warning" : "success"}>
                {props.locale === "ar"
                  ? `${revenueScope.focusedCases.length} حالات مطابقة`
                  : `${revenueScope.focusedCases.length} matching cases`}
              </StatusBadge>
              {hasScopedBatchView && revenueScope.batchScope ? (
                <>
                  <StatusBadge tone={revenueScope.batchScope.stillEscalatedCaseCount > 0 ? "warning" : "success"}>
                    {props.locale === "ar"
                      ? `${revenueScope.batchScope.stillEscalatedCaseCount} ما زالت متصاعدة`
                      : `${revenueScope.batchScope.stillEscalatedCaseCount} still escalated`}
                  </StatusBadge>
                  <StatusBadge tone={revenueScope.batchScope.clearedCaseCount > 0 ? "success" : "warning"}>
                    {props.locale === "ar"
                      ? `${revenueScope.batchScope.clearedCaseCount} خرجت من الخطر`
                      : `${revenueScope.batchScope.clearedCaseCount} now cleared`}
                  </StatusBadge>
                </>
              ) : null}
            </div>
            {hasScopedBatchView && revenueScope.batchScope ? (
              <div className={statusRowWrapClassName}>
                {revenueScope.batchScope.currentOwnerNames.map((ownerName) => (
                  <StatusBadge key={`${revenueScope.batchScope?.batchId}:${ownerName}`}>{ownerName}</StatusBadge>
                ))}
                <StatusBadge tone="success">
                  {props.locale === "ar" ? "تنزيلات حسب المستلم" : "Recipient-specific downloads"}
                </StatusBadge>
              </div>
            ) : null}
            <div className={statusRowWrapClassName}>
              <Link className={inlineLinkClassName} href={clearScopeHref}>
                {props.locale === "ar" ? "مسح النطاق" : "Clear scope"}
              </Link>
              <Link className={inlineLinkClassName} href={operationalRiskReportHref}>
                {props.locale === "ar" ? "العودة إلى تقرير المخاطر التشغيلية" : "Return to operational-risk report"}
              </Link>
              {fullBatchScopeHref ? (
                <Link className={inlineLinkClassName} href={fullBatchScopeHref}>
                  {props.locale === "ar" ? "فتح كامل الحالات المتأثرة" : "Open full affected-case scope"}
                </Link>
              ) : null}
              {changedLaterBatchScopeHref ? (
                <Link className={inlineLinkClassName} href={changedLaterBatchScopeHref}>
                  {props.locale === "ar" ? "فتح كل الحالات التي تغيّرت لاحقاً" : "Open all changed-later cases"}
                </Link>
              ) : null}
            </div>
            {batchExportOptions.length > 0 ? (
              <div className={pageStackClassName}>
                {batchExportOptions.map((option) => (
                  <div key={`batch-export:${option.recipient}`} className={stackTightClassName}>
                    <Link className={inlineLinkClassName} href={option.href}>
                      {getRevenueExportOptionLabel(
                        props.locale,
                        option.recipient,
                        hasChangedLaterBatchView,
                        hasChangedLaterReasonScopedView,
                        batchDriftReasonScopeLabel
                      )}
                    </Link>
                    <span className={fieldNoteClassName}>
                      {getRevenueExportOptionSummary(props.locale, option.recipient, hasChangedLaterBatchView)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            <p className={fieldNoteClassName}>
              {hasScopedBatchView
                ? props.locale === "ar"
                  ? hasChangedLaterReasonScopedView && batchDriftReasonScopeLabel
                    ? `يعرض هذا المسار فقط الحالات التي انجرفت بعد إعادة الضبط الجماعية الأصلية بسبب ${batchDriftReasonScopeLabel}، مع إبقاء المسار إلى كل الحالات التي تغيّرت لاحقاً وإلى كامل الدفعة وتصدير CSV لهذا النطاق الضيق متاحين عند الحاجة.`
                    : hasChangedLaterBatchView
                      ? "يعرض هذا المسار فقط الحالات التي انجرفت بعد إعادة الضبط الجماعية الأصلية، مع إبقاء المسار إلى كامل الدفعة وتصدير CSV لهذا النطاق الضيق متاحين عند الحاجة."
                    : "يعرض هذا المسار الأثر الكامل للدفعة عبر الحالات المصعّدة والمصفّاة مع إبقاء التحويل إلى طابور المالك الحالي وتصدير CSV للحالات المتأثرة متاحين عندما تحتاج المراجعة التشغيلية إلى أثر قابل للمشاركة."
                  : hasChangedLaterReasonScopedView && batchDriftReasonScopeLabel
                    ? `This route narrows the batch to only the cases that drifted after the original bulk reset because of ${batchDriftReasonScopeLabel}, while still keeping a path back to all changed-later cases, the full batch, and a matching CSV export for that tighter scope.`
                    : hasChangedLaterBatchView
                      ? "This route narrows the batch to only the cases that drifted after the original bulk reset, while still keeping a path back to the full batch and a matching CSV export for that tighter scope."
                    : "This route shows the full batch outcome across both escalated and cleared cases, while still letting managers jump into the current owner queue and export the affected-case CSV for operational review."
                : props.locale === "ar"
                  ? "يمكن لمدير الإيرادات إعادة تعيين المالك أو حفظ خطوة المتابعة التالية مباشرة من هذا النطاق لتصفية التدخل المفتوح."
                  : "Revenue managers can reassign the owner or save the next follow-up directly from this scope to clear the open intervention."}
            </p>
            {hasScopedBatchView && batchOwnerGroups.length > 0 ? (
              <div className={pageStackClassName}>
                <p className={caseMetaClassName}>
                  {props.locale === "ar"
                    ? "يتم تجميع الدفعة حسب المالك الحالي حتى يظهر أين انجرفت الحالات بعد إعادة الضبط الجماعي وأين ما زالت تحتاج إجراءً مشتركاً."
                    : "The batch is grouped by current owner so managers can see where cases drifted after the bulk reset and where shared action is still possible."}
                </p>
                {batchOwnerGroups.map((ownerGroup) => {
                  const stillEscalatedCases = ownerGroup.cases.filter((caseItem) =>
                    hasPersistedLatestHumanReplyEscalation(
                      caseItem.ownerName,
                      caseItem.latestHumanReply,
                      caseItem.followUpStatus,
                      caseItem.openInterventionsCount
                    )
                  );

                  return (
                    <WorkflowCard
                      key={`${revenueScope.batchScope?.batchId}:${ownerGroup.ownerName}`}
                      actions={
                        <Link
                          className={inlineLinkClassName}
                          href={buildRevenueManagerHref(
                            props.locale,
                            {
                              ownerName: ownerGroup.ownerName,
                              queue: "escalated_handoffs"
                            },
                            { hash: revenueManagerFocusedQueueId }
                          )}
                        >
                          {props.locale === "ar" ? "فتح طابور هذا المالك" : "Open this owner queue"}
                        </Link>
                      }
                      badges={
                        <>
                          <StatusBadge tone={ownerGroup.stillEscalatedCaseCount > 0 ? "warning" : "success"}>
                            {props.locale === "ar"
                              ? `${ownerGroup.stillEscalatedCaseCount} ما زالت متصاعدة`
                              : `${ownerGroup.stillEscalatedCaseCount} still escalated`}
                          </StatusBadge>
                          <StatusBadge tone={ownerGroup.clearedCaseCount > 0 ? "success" : "warning"}>
                            {props.locale === "ar"
                              ? `${ownerGroup.clearedCaseCount} خرجت من الخطر`
                              : `${ownerGroup.clearedCaseCount} now cleared`}
                          </StatusBadge>
                        </>
                      }
                      meta={
                        <p className={caseMetaClassName}>
                          {props.locale === "ar"
                            ? `${ownerGroup.caseCount} حالات من هذه الدفعة تحت هذا المالك الآن`
                            : `${ownerGroup.caseCount} batch cases now sit with this owner`}
                        </p>
                      }
                      title={ownerGroup.ownerName}
                      tone="critical"
                    >
                      {stillEscalatedCases.length > 1 ? (
                        <div className={bulkFollowUpShellClassName}>
                          <p className={caseMetaClassName}>
                            {props.locale === "ar"
                              ? "يمكن تطبيق إعادة ضبط جماعية جديدة فقط على الحالات المتصاعدة التي ما زالت تحت هذا المالك الحالي."
                              : "A fresh bulk reset can be applied only to the still-escalated cases that currently sit with this owner."}
                          </p>
                          <ManagerBulkFollowUpForm
                            canManage={canManageFollowUp}
                            cases={stillEscalatedCases.map((caseItem) => ({
                              caseId: caseItem.caseId,
                              customerName: caseItem.customerName,
                              nextAction: caseItem.nextAction
                            }))}
                            disabledLabel={props.locale === "ar" ? "يتطلب دوراً إدارياً" : "Manager role required"}
                            locale={props.locale}
                            ownerName={ownerGroup.ownerName}
                            returnPath={scopedReturnPath}
                          />
                        </div>
                      ) : stillEscalatedCases.length === 1 ? (
                        <p className={caseMetaClassName}>
                          {props.locale === "ar"
                            ? "تبقى حالة واحدة متصاعدة فقط تحت هذا المالك، لذا يظهر إجراء المتابعة الفردي في قائمة الحالات أدناه."
                            : "Only one escalated case remains under this owner, so the individual follow-up form stays on the case list below."}
                        </p>
                      ) : (
                        <p className={caseMetaClassName}>
                          {props.locale === "ar"
                            ? "كل حالات هذه المجموعة خرجت من المخاطرة الحالية ولا تحتاج إعادة ضبط جماعية جديدة."
                            : "Every case in this owner group is already clear of the current risk, so no new bulk reset is needed here."}
                        </p>
                      )}
                    </WorkflowCard>
                  );
                })}
              </div>
            ) : null}
            {hasScopedBatchView && props.batchHistory && props.batchHistory.historyCases.length > 0 ? (
              <div className={pageStackClassName}>
                <div className={rowBetweenClassName}>
                  <div className={stackTightClassName}>
                    <p className={caseMetaClassName}>{props.locale === "ar" ? "سجل الدفعة داخل المنتج" : "In-product batch history"}</p>
                    <p className={fieldNoteClassName}>
                      {props.locale === "ar"
                        ? "يعرض هذا السجل إعادة الضبط الجماعية الأصلية ثم أي تحديثات متابعة لاحقة على الحالات المتأثرة نفسها."
                        : "This history shows the original bulk reset and any later follow-up saves on the same affected cases."}
                    </p>
                  </div>
                  <div className={statusRowWrapClassName}>
                    <StatusBadge>
                      {props.locale === "ar"
                        ? `${props.batchHistory.casesWithHistoryCount} حالات بسجل`
                        : `${props.batchHistory.casesWithHistoryCount} cases with history`}
                    </StatusBadge>
                    <StatusBadge tone={props.batchHistory.casesWithLaterChangesCount > 0 ? "warning" : "success"}>
                      {props.locale === "ar"
                        ? `${props.batchHistory.casesWithLaterChangesCount} تغيّرت لاحقاً`
                        : `${props.batchHistory.casesWithLaterChangesCount} changed later`}
                    </StatusBadge>
                    {props.batchHistory.postBatchFollowUpUpdateCount > 0 ? (
                      <StatusBadge tone="warning">
                        {props.locale === "ar"
                          ? `${props.batchHistory.postBatchFollowUpUpdateCount} تحديثات لاحقة`
                          : `${props.batchHistory.postBatchFollowUpUpdateCount} later updates`}
                      </StatusBadge>
                    ) : null}
                    {props.batchHistory.laterBulkResetCount > 0 ? (
                      <StatusBadge tone="warning">
                        {props.locale === "ar"
                          ? `${props.batchHistory.laterBulkResetCount} دفعات لاحقة`
                          : `${props.batchHistory.laterBulkResetCount} later bulk resets`}
                      </StatusBadge>
                    ) : null}
                  </div>
                </div>
                {props.batchHistory.historyCases.map((historyCase) => (
                  <WorkflowCard
                    key={`history:${historyCase.caseId}`}
                    badges={
                      <>
                        <StatusBadge>{historyCase.currentOwnerName}</StatusBadge>
                        <StatusBadge tone={historyCase.currentRiskStatus === "still_escalated" ? "warning" : "success"}>
                          {historyCase.currentRiskStatus === "still_escalated"
                            ? props.locale === "ar"
                              ? "ما زالت متصاعدة"
                              : "Still escalated"
                            : props.locale === "ar"
                              ? "خرجت من الخطر"
                              : "Now cleared"}
                        </StatusBadge>
                      </>
                    }
                    meta={<p className={caseMetaClassName}>{buildCaseReferenceCode(historyCase.caseId)}</p>}
                    title={historyCase.customerName}
                    tone="warning"
                  >
                    <div className={pageStackClassName}>
                      {historyCase.entries.map((entry) => {
                        const savedAt = formatDateTime(entry.createdAt, props.locale);
                        const dueAt = formatDateTime(entry.nextActionDueAt, props.locale);
                        const entryLabel =
                          entry.type === "scoped_batch_reset"
                            ? props.locale === "ar"
                              ? "إعادة الضبط الجماعية الأصلية"
                              : "Original bulk reset"
                            : entry.type === "later_bulk_reset"
                              ? props.locale === "ar"
                                ? "دفعة جماعية لاحقة"
                                : "Later bulk reset"
                              : props.locale === "ar"
                                ? "تحديث متابعة لاحق"
                                : "Later follow-up update";

                        return (
                          <div key={`${historyCase.caseId}:${entry.createdAt}:${entry.nextAction}`} className={pageStackClassName}>
                            <div className={statusRowWrapClassName}>
                              <StatusBadge tone={entry.type === "scoped_batch_reset" ? "success" : "warning"}>{entryLabel}</StatusBadge>
                              <StatusBadge>{entry.ownerName}</StatusBadge>
                              {entry.scopedOwnerName ? <StatusBadge>{entry.scopedOwnerName}</StatusBadge> : null}
                              <StatusBadge>{savedAt}</StatusBadge>
                            </div>
                            <p>
                              {props.locale === "ar"
                                ? `حُفظت الخطوة التالية كـ "${entry.nextAction}" باستحقاق ${dueAt}.`
                                : `Saved the next step as "${entry.nextAction}", due ${dueAt}.`}
                            </p>
                            {entry.type === "later_bulk_reset" && entry.batchCaseCount ? (
                              <p className={caseMetaClassName}>
                                {props.locale === "ar"
                                  ? `جاء هذا الحفظ من دفعة لاحقة على ${entry.batchCaseCount} حالات.`
                                  : `This save came from a later ${entry.batchCaseCount}-case bulk action.`}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </WorkflowCard>
                ))}
              </div>
            ) : null}
            {canShowBulkOperationalRiskActioning && props.filters.ownerName ? (
              <div className={bulkFollowUpShellClassName}>
                <p className={caseMetaClassName}>
                  {props.locale === "ar"
                    ? "الإجراء الجماعي يبقى محصوراً داخل هذا المالك الحالي نفسه ويستخدم حد خطة المتابعة الموثق نفسه لكل حالة محددة."
                    : "Bulk actioning stays restricted to this current owner scope and uses the same audited follow-up boundary on each selected case."}
                </p>
                <ManagerBulkFollowUpForm
                  canManage={canManageFollowUp}
                  cases={revenueScope.focusedCases.map((caseItem) => ({
                    caseId: caseItem.caseId,
                    customerName: caseItem.customerName,
                    nextAction: caseItem.nextAction
                  }))}
                  disabledLabel={props.locale === "ar" ? "يتطلب دوراً إدارياً" : "Manager role required"}
                  locale={props.locale}
                  ownerName={props.filters.ownerName}
                  returnPath={scopedReturnPath}
                />
              </div>
            ) : null}
            <p className={fieldNoteClassName}>{followUpGuardNote}</p>
            <StatefulStack
              emptySummary={
                hasScopedBatchView
                  ? props.locale === "ar"
                    ? "لا توجد حالياً حالات حيّة تطابق دفعة المتابعة الجماعية المحددة."
                    : "No live cases currently match this bulk follow-up batch."
                  : props.filters.queue === "escalated_handoffs"
                  ? props.filters.ownerName
                    ? props.locale === "ar"
                      ? "لا توجد حالياً تسليمات متصاعدة مطابقة لهذا المالك داخل الحالات الحية."
                      : "No live escalated handoffs currently match this owner."
                    : props.locale === "ar"
                      ? "لا توجد حالياً تسليمات متصاعدة مطابقة داخل النطاق الحي."
                      : "No live escalated handoffs currently match this scope."
                  : props.locale === "ar"
                    ? "لا توجد حالياً حالات مطابقة لهذا النطاق المخصص."
                    : "No live cases currently match this scoped view."
              }
              emptyTitle={
                hasScopedBatchView
                  ? props.locale === "ar"
                    ? "لا توجد حالات لهذه الدفعة"
                    : "No cases in this batch"
                  : props.filters.queue === "escalated_handoffs"
                  ? props.locale === "ar"
                    ? "لا توجد تسليمات متصاعدة"
                    : "No escalated handoffs"
                  : props.locale === "ar"
                    ? "لا توجد حالات مطابقة"
                    : "No matching cases"
              }
              items={revenueScope.focusedCases}
              renderItem={(caseItem) => {
                const isStillEscalated = hasPersistedLatestHumanReplyEscalation(
                  caseItem.ownerName,
                  caseItem.latestHumanReply,
                  caseItem.followUpStatus,
                  caseItem.openInterventionsCount
                );
                const latestManagerFollowUpLabel = getPersistedLatestManagerFollowUpLabel(props.locale, caseItem.latestManagerFollowUp);
                const latestManagerFollowUpSavedAt = formatLatestManagerFollowUpSavedAt(caseItem.latestManagerFollowUp, props.locale);
                const latestManagerFollowUpNote = getPersistedLatestManagerFollowUpNote(props.locale, caseItem.latestManagerFollowUp);
                const latestHumanReplySentAt = formatLatestHumanReplySentAt(caseItem.latestHumanReply, props.locale);
                const latestHumanReplyOwnershipLabel = getPersistedLatestHumanReplyOwnershipLabel(
                  props.locale,
                  caseItem.ownerName,
                  caseItem.latestHumanReply
                );
                const batchDriftReasonSummary = hasChangedLaterBatchView ? batchDriftReasonSummaryByCaseId.get(caseItem.caseId) : undefined;
                const driftReasonMatchesScope =
                  props.filters.batchDriftReason && batchDriftReasonSummary
                    ? getRevenueManagerBatchDriftReasonFilter(batchDriftReasonSummary) === props.filters.batchDriftReason
                    : false;
                const latestHumanReplyEscalationLabel = getPersistedLatestHumanReplyEscalationLabel(
                  props.locale,
                  caseItem.ownerName,
                  caseItem.latestHumanReply,
                  caseItem.followUpStatus,
                  caseItem.openInterventionsCount
                );

                return (
                  <WorkflowCard
                    key={caseItem.caseId}
                    actions={
                      <>
                        <Link className={inlineLinkClassName} href={`/${props.locale}/leads/${caseItem.caseId}`}>
                          {props.locale === "ar" ? "فتح الحالة" : "Open case"}
                        </Link>
                        {hasScopedBatchView && isStillEscalated ? (
                          <Link
                            className={inlineLinkClassName}
                            href={buildRevenueManagerHref(
                              props.locale,
                              {
                                ownerName: caseItem.ownerName,
                                queue: "escalated_handoffs"
                              },
                              { hash: revenueManagerFocusedQueueId }
                            )}
                          >
                            {props.locale === "ar" ? "فتح طابور المالك الحالي" : "Open current owner queue"}
                          </Link>
                        ) : null}
                      </>
                    }
                    badges={
                      <>
                        <StatusBadge tone={isStillEscalated ? "warning" : "success"}>{getPersistedFollowUpLabel(props.locale, caseItem)}</StatusBadge>
                        {caseItem.openInterventionsCount > 0 ? (
                          <StatusBadge tone="warning">{getInterventionCountLabel(props.locale, caseItem.openInterventionsCount)}</StatusBadge>
                        ) : null}
                        {hasScopedBatchView ? (
                          <>
                            <StatusBadge>{caseItem.ownerName}</StatusBadge>
                            <StatusBadge tone={isStillEscalated ? "warning" : "success"}>
                              {isStillEscalated
                                ? props.locale === "ar"
                                  ? "ما زالت متصاعدة"
                                  : "Still escalated"
                                : props.locale === "ar"
                                  ? "خرجت من الخطر"
                                : "Now cleared"}
                            </StatusBadge>
                          </>
                        ) : null}
                      </>
                    }
                    meta={<p className={caseMetaClassName}>{buildCaseReferenceCode(caseItem.caseId)}</p>}
                    summary={caseItem.nextAction}
                    title={caseItem.customerName}
                    tone="critical"
                  >
                    <div className={stackTightClassName}>
                      {hasChangedLaterBatchView && batchDriftReasonSummary ? (
                        <>
                          <div className={statusRowWrapClassName}>
                            {driftReasonMatchesScope && batchDriftReasonScopeLabel ? (
                              <StatusBadge tone="warning">{batchDriftReasonScopeLabel}</StatusBadge>
                            ) : null}
                            {batchDriftReasonSummary.postBatchFollowUpUpdateCount > 0 ? (
                              <StatusBadge tone="warning">
                                {props.locale === "ar"
                                  ? batchDriftReasonSummary.postBatchFollowUpUpdateCount === 1
                                    ? "تحديث متابعة لاحق"
                                    : `${batchDriftReasonSummary.postBatchFollowUpUpdateCount} تحديثات متابعة لاحقة`
                                  : batchDriftReasonSummary.postBatchFollowUpUpdateCount === 1
                                    ? "Later follow-up update"
                                    : `${batchDriftReasonSummary.postBatchFollowUpUpdateCount} later follow-up updates`}
                              </StatusBadge>
                            ) : null}
                            {batchDriftReasonSummary.laterBulkResetCount > 0 ? (
                              <StatusBadge tone="warning">
                                {props.locale === "ar"
                                  ? batchDriftReasonSummary.laterBulkResetCount === 1
                                    ? "دفعة جماعية لاحقة"
                                    : `${batchDriftReasonSummary.laterBulkResetCount} دفعات جماعية لاحقة`
                                  : batchDriftReasonSummary.laterBulkResetCount === 1
                                    ? "Later bulk reset"
                                    : `${batchDriftReasonSummary.laterBulkResetCount} later bulk resets`}
                              </StatusBadge>
                            ) : null}
                          </div>
                          <p className={caseMetaClassName}>
                            {props.locale === "ar"
                              ? `آخر سبب انجراف سُجّل ${formatDateTime(batchDriftReasonSummary.latestDriftAt, props.locale)}.`
                              : `Latest drift reason was recorded ${formatDateTime(batchDriftReasonSummary.latestDriftAt, props.locale)}.`}
                          </p>
                        </>
                      ) : null}
                      <p className={caseMetaClassName}>
                        {caseItem.latestHumanReply?.sentByName}
                        {" · "}
                        {latestHumanReplySentAt}
                      </p>
                      {latestHumanReplyOwnershipLabel ? <p className={caseMetaClassName}>{latestHumanReplyOwnershipLabel}</p> : null}
                      {latestHumanReplyEscalationLabel ? <p className={caseMetaClassName}>{latestHumanReplyEscalationLabel}</p> : null}
                      {caseItem.latestManagerFollowUp && latestManagerFollowUpLabel && latestManagerFollowUpSavedAt ? (
                        <>
                          <p className={caseMetaClassName}>
                            {latestManagerFollowUpLabel}
                            {" · "}
                            {caseItem.latestManagerFollowUp.ownerName}
                            {" · "}
                            {latestManagerFollowUpSavedAt}
                          </p>
                          {latestManagerFollowUpNote ? <p className={caseMetaClassName}>{latestManagerFollowUpNote}</p> : null}
                        </>
                      ) : null}
                    </div>
                    {hasScopedBatchView ? (
                      isStillEscalated ? (
                        <div className={pageStackClassName}>
                          <p className={caseMetaClassName}>{followUpManagerCopy.title}</p>
                          <ManagerFollowUpForm
                            canManage={canManageFollowUp}
                            caseId={caseItem.caseId}
                            disabledLabel={props.locale === "ar" ? "يتطلب دوراً إدارياً" : "Manager role required"}
                            locale={props.locale}
                            nextAction={caseItem.nextAction}
                            nextActionDueAt={caseItem.nextActionDueAt}
                            ownerName={caseItem.ownerName}
                            returnPath={scopedReturnPath}
                          />
                        </div>
                      ) : (
                        <p className={caseMetaClassName}>
                          {props.locale === "ar"
                            ? "هذه الحالة خرجت من المخاطرة بعد الدفعة الأخيرة ولا تحتاج إعادة تعيين متابعة الآن."
                            : "This case is now clear after the bulk batch and does not need another follow-up reset right now."}
                        </p>
                      )
                    ) : (
                      <div className={pageStackClassName}>
                        <p className={caseMetaClassName}>{followUpManagerCopy.title}</p>
                        <ManagerFollowUpForm
                          canManage={canManageFollowUp}
                          caseId={caseItem.caseId}
                          disabledLabel={props.locale === "ar" ? "يتطلب دوراً إدارياً" : "Manager role required"}
                          locale={props.locale}
                          nextAction={caseItem.nextAction}
                          nextActionDueAt={caseItem.nextActionDueAt}
                          ownerName={caseItem.ownerName}
                          returnPath={scopedReturnPath}
                        />
                      </div>
                    )}
                  </WorkflowCard>
                );
              }}
            />
          </WorkflowPanelBody>
        </Panel>
      ) : null}

      <div className={metricGridClassName}>
        <MetricTile
          detail={
            props.locale === "ar"
              ? "حالات تجاوزت مواعيد المتابعة أو تحتوي على تدخلات مفتوحة."
              : "Cases with overdue follow-up or open manager interventions."
          }
          label={props.locale === "ar" ? "طابور المتابعة" : "Follow-up queue"}
          tone="ocean"
          value={String(revenueAttentionCases.length)}
        />
        <MetricTile
          detail={
            props.locale === "ar"
              ? "إجمالي التدخلات غير المحلولة عبر الحالات الحية."
              : "The total unresolved intervention count across live cases."
          }
          label={props.locale === "ar" ? "التدخلات المفتوحة" : "Open interventions"}
          tone="sand"
          value={String(openInterventionsCount)}
        />
        <MetricTile
          detail={
            props.locale === "ar"
              ? "حالات أوقفت فيها الأتمتة بقرار إداري واضح."
              : "Cases where automation was paused behind an explicit managerial decision."
          }
          label={props.locale === "ar" ? "الأتمتة المتوقفة" : "Paused automation"}
          tone="rose"
          value={String(pausedAutomationCases.length)}
        />
        <MetricTile
          detail={
            props.locale === "ar"
              ? "حالات لا تستطيع فيها المتابعة التلقائية الاستمرار حتى تُغلق مراجعة الجودة الحالية."
              : "Cases where follow-up automation is blocked until the current QA boundary is cleared."
          }
          label={props.locale === "ar" ? "أتمتة معلقة بالجودة" : "QA-held automation"}
          tone="sand"
          value={String(governanceHeldAutomationCases.length)}
        />
        <MetricTile
          detail={
            props.locale === "ar"
              ? "حالات ما زالت رسائلها داخل مراجعة الجودة أو تحتاج متابعة تصحيحية."
              : "Cases whose customer-facing message state is still blocked on QA or needs corrective follow-up."
          }
          label={props.locale === "ar" ? "حوكمة المحادثات" : "Conversation governance"}
          tone="mint"
          value={String(governanceSummary.revenueAttentionCases.length)}
        />
        <MetricTile
          detail={
            props.locale === "ar"
              ? "مراجعات جودة معلقة لأكثر من يوم وقد تحتاج تصعيداً من الإدارة."
              : "QA items that have been pending for more than a day and may need managerial escalation."
          }
          label={props.locale === "ar" ? "مراجعات قديمة" : "Stale pending QA"}
          tone="rose"
          value={String(governanceSummary.stalePendingCasesCount)}
        />
        <MetricTile
          detail={
            props.locale === "ar"
              ? "حالات أرسل فيها شخص آخر آخر رد بشري ثم انتقلت المتابعة الحالية إلى مالك مختلف."
              : "Cases where the latest human reply was sent by one operator and the active follow-up now sits with a different owner."
          }
          label={props.locale === "ar" ? "تسليمات ما بعد الرد" : "Post-reply handoffs"}
          tone="ocean"
          value={String(postReplyHandoffCases.length)}
        />
        <MetricTile
          detail={
            props.locale === "ar"
              ? "تسليمات بعد الرد أصبحت الآن متأخرة أو عليها تدخل إداري مفتوح."
              : "Post-reply handoffs that are already overdue or carrying open managerial intervention pressure."
          }
          label={props.locale === "ar" ? "تسليمات متصاعدة" : "Escalated handoffs"}
          tone="rose"
          value={String(escalatedPostReplyHandoffCases.length)}
        />
      </div>

      <div className={twoColumnGridClassName}>
        <Panel title={props.locale === "ar" ? "طابور متابعة الإيرادات" : "Revenue follow-up queue"}>
          <StatefulStack
            emptySummary={messages.states.emptyAlertsSummary}
            emptyTitle={messages.states.emptyAlertsTitle}
            items={revenueAttentionCases}
            renderItem={(caseItem) => {
              const handoverDisplay = getPersistedHandoverWorkspaceDisplay(props.locale, caseItem);
              const qaReviewDisplay = getPersistedQaReviewDisplay(props.locale, caseItem);
              const automationHoldReasonLabel = getPersistedAutomationHoldReasonLabel(props.locale, caseItem.automationHoldReason);
              const latestManagerFollowUpLabel = getPersistedLatestManagerFollowUpLabel(props.locale, caseItem.latestManagerFollowUp);
              const latestManagerFollowUpSavedAt = formatLatestManagerFollowUpSavedAt(caseItem.latestManagerFollowUp, props.locale);
              const latestManagerFollowUpNote = getPersistedLatestManagerFollowUpNote(props.locale, caseItem.latestManagerFollowUp);
              const latestHumanReplyLabel = getPersistedLatestHumanReplyLabel(props.locale, caseItem.latestHumanReply);
              const latestHumanReplySentAt = formatLatestHumanReplySentAt(caseItem.latestHumanReply, props.locale);
              const latestHumanReplyOwnershipLabel = getPersistedLatestHumanReplyOwnershipLabel(
                props.locale,
                caseItem.ownerName,
                caseItem.latestHumanReply
              );
              const latestHumanReplyEscalationLabel = getPersistedLatestHumanReplyEscalationLabel(
                props.locale,
                caseItem.ownerName,
                caseItem.latestHumanReply,
                caseItem.followUpStatus,
                caseItem.openInterventionsCount
              );

              return (
                <WorkflowCard
                  key={caseItem.caseId}
                  tone="critical"
                  badges={
                    <>
                      <StatusBadge tone={caseItem.followUpStatus === "attention" ? "critical" : "warning"}>
                        {getPersistedFollowUpLabel(props.locale, caseItem)}
                      </StatusBadge>
                      {caseItem.openInterventionsCount > 0 ? (
                        <StatusBadge tone="warning">{getInterventionCountLabel(props.locale, caseItem.openInterventionsCount)}</StatusBadge>
                      ) : null}
                      {qaReviewDisplay ? <StatusBadge tone={qaReviewDisplay.statusTone}>{qaReviewDisplay.statusLabel}</StatusBadge> : null}
                      {handoverDisplay ? <StatusBadge tone={handoverDisplay.statusTone}>{handoverDisplay.statusLabel}</StatusBadge> : null}
                    </>
                  }
                  meta={<p className={caseMetaClassName}>{buildCaseReferenceCode(caseItem.caseId)}</p>}
                  summary={caseItem.nextAction}
                  title={caseItem.customerName}
                  actions={
                    <>
                      <Link className={inlineLinkClassName} href={`/${props.locale}/leads/${caseItem.caseId}`}>
                        {props.locale === "ar" ? "فتح الحالة" : "Open case"}
                      </Link>
                      {handoverDisplay && canAccessHandoverWorkspace ? (
                        <Link className={inlineLinkClassName} href={`/${props.locale}/handover/${handoverDisplay.handoverCaseId}`}>
                          {props.locale === "ar" ? "فتح سجل التسليم" : "Open handover"}
                        </Link>
                      ) : null}
                    </>
                  }
                >
                  {caseItem.latestHumanReply ? (
                    <div className={stackTightClassName}>
                      <p className={caseMetaClassName}>
                        {latestHumanReplyLabel}
                        {" · "}
                        {caseItem.latestHumanReply.sentByName}
                        {" · "}
                        {latestHumanReplySentAt}
                      </p>
                      {latestHumanReplyOwnershipLabel ? <p className={caseMetaClassName}>{latestHumanReplyOwnershipLabel}</p> : null}
                      {latestHumanReplyEscalationLabel ? <p className={caseMetaClassName}>{latestHumanReplyEscalationLabel}</p> : null}
                    </div>
                  ) : null}
                  {caseItem.latestManagerFollowUp && latestManagerFollowUpLabel && latestManagerFollowUpSavedAt ? (
                    <div className={stackTightClassName}>
                      <p className={caseMetaClassName}>
                        {latestManagerFollowUpLabel}
                        {" · "}
                        {caseItem.latestManagerFollowUp.ownerName}
                        {" · "}
                        {latestManagerFollowUpSavedAt}
                      </p>
                      {latestManagerFollowUpNote ? <p className={caseMetaClassName}>{latestManagerFollowUpNote}</p> : null}
                    </div>
                  ) : null}
                  <p className={caseMetaClassName}>{formatCaseLastChange(caseItem, props.locale)}</p>
                  <div className={statusRowWrapClassName}>
                    <StatusBadge>{getPersistedAutomationLabel(props.locale, caseItem.automationStatus)}</StatusBadge>
                    {automationHoldReasonLabel ? <StatusBadge tone="warning">{automationHoldReasonLabel}</StatusBadge> : null}
                    <StatusBadge>{getPersistedCaseStageLabel(props.locale, caseItem.stage)}</StatusBadge>
                  </div>
                </WorkflowCard>
              );
            }}
          />
        </Panel>

        <Panel title={messages.leads.title}>
          <StatefulStack
            emptySummary={messages.states.emptyCasesSummary}
            emptyTitle={messages.states.emptyCasesTitle}
            items={revenueScope.ownerScopedCases}
            renderItem={(caseItem) => {
              const handoverDisplay = getPersistedHandoverWorkspaceDisplay(props.locale, caseItem);
              const qaReviewDisplay = getPersistedQaReviewDisplay(props.locale, caseItem);
              const automationHoldReasonLabel = getPersistedAutomationHoldReasonLabel(props.locale, caseItem.automationHoldReason);
              const latestManagerFollowUpLabel = getPersistedLatestManagerFollowUpLabel(props.locale, caseItem.latestManagerFollowUp);
              const latestManagerFollowUpSavedAt = formatLatestManagerFollowUpSavedAt(caseItem.latestManagerFollowUp, props.locale);
              const latestManagerFollowUpNote = getPersistedLatestManagerFollowUpNote(props.locale, caseItem.latestManagerFollowUp);
              const latestHumanReplyLabel = getPersistedLatestHumanReplyLabel(props.locale, caseItem.latestHumanReply);
              const latestHumanReplySentAt = formatLatestHumanReplySentAt(caseItem.latestHumanReply, props.locale);
              const latestHumanReplyOwnershipLabel = getPersistedLatestHumanReplyOwnershipLabel(
                props.locale,
                caseItem.ownerName,
                caseItem.latestHumanReply
              );
              const latestHumanReplyEscalationLabel = getPersistedLatestHumanReplyEscalationLabel(
                props.locale,
                caseItem.ownerName,
                caseItem.latestHumanReply,
                caseItem.followUpStatus,
                caseItem.openInterventionsCount
              );

              return (
                <Link key={caseItem.caseId} className={caseLinkCardClassName} href={`/${props.locale}/leads/${caseItem.caseId}`}>
                  <div>
                    <p className={caseMetaClassName}>{buildCaseReferenceCode(caseItem.caseId)}</p>
                    <h3>{caseItem.customerName}</h3>
                    <p>{caseItem.nextAction}</p>
                    {caseItem.latestHumanReply ? (
                      <div className={stackTightClassName}>
                        <p className={caseMetaClassName}>
                          {latestHumanReplyLabel}
                          {" · "}
                          {caseItem.latestHumanReply.sentByName}
                          {" · "}
                          {latestHumanReplySentAt}
                        </p>
                        {latestHumanReplyOwnershipLabel ? <p className={caseMetaClassName}>{latestHumanReplyOwnershipLabel}</p> : null}
                        {latestHumanReplyEscalationLabel ? <p className={caseMetaClassName}>{latestHumanReplyEscalationLabel}</p> : null}
                      </div>
                    ) : null}
                    {caseItem.latestManagerFollowUp && latestManagerFollowUpLabel && latestManagerFollowUpSavedAt ? (
                      <div className={stackTightClassName}>
                        <p className={caseMetaClassName}>
                          {latestManagerFollowUpLabel}
                          {" · "}
                          {caseItem.latestManagerFollowUp.ownerName}
                          {" · "}
                          {latestManagerFollowUpSavedAt}
                        </p>
                        {latestManagerFollowUpNote ? <p className={caseMetaClassName}>{latestManagerFollowUpNote}</p> : null}
                      </div>
                    ) : null}
                  </div>
                  <div className={caseLinkAsideClassName}>
                    <StatusBadge tone={caseItem.followUpStatus === "attention" ? "critical" : "success"}>
                      {getPersistedFollowUpLabel(props.locale, caseItem)}
                    </StatusBadge>
                    <StatusBadge>{getPersistedAutomationLabel(props.locale, caseItem.automationStatus)}</StatusBadge>
                    {automationHoldReasonLabel ? <StatusBadge tone="warning">{automationHoldReasonLabel}</StatusBadge> : null}
                    {caseItem.openInterventionsCount > 0 ? (
                      <StatusBadge tone="warning">{getInterventionCountLabel(props.locale, caseItem.openInterventionsCount)}</StatusBadge>
                    ) : null}
                    {qaReviewDisplay ? <StatusBadge tone={qaReviewDisplay.statusTone}>{qaReviewDisplay.statusLabel}</StatusBadge> : null}
                    {handoverDisplay ? <StatusBadge tone={handoverDisplay.statusTone}>{handoverDisplay.statusLabel}</StatusBadge> : null}
                    <StatusBadge>{getPersistedCaseStageLabel(props.locale, caseItem.stage)}</StatusBadge>
                  </div>
                </Link>
              );
            }}
          />
        </Panel>
      </div>

      {props.filters.queue !== "escalated_handoffs" ? (
      <Panel title={props.locale === "ar" ? "تسليمات متصاعدة بعد الرد" : "Escalated post-reply handoffs"}>
        <StatefulStack
          emptySummary={
            props.locale === "ar"
              ? "لا توجد حالياً تسليمات بعد الرد متأخرة أو مدعومة بتدخلات مفتوحة."
              : "No post-reply handoffs are currently overdue or carrying open intervention pressure."
          }
          emptyTitle={props.locale === "ar" ? "لا توجد تسليمات متصاعدة" : "No escalated handoffs"}
          items={escalatedPostReplyHandoffCases}
          renderItem={(caseItem) => {
            const latestHumanReplySentAt = formatLatestHumanReplySentAt(caseItem.latestHumanReply, props.locale);
            const latestHumanReplyOwnershipLabel = getPersistedLatestHumanReplyOwnershipLabel(
              props.locale,
              caseItem.ownerName,
              caseItem.latestHumanReply
            );
            const latestHumanReplyEscalationLabel = getPersistedLatestHumanReplyEscalationLabel(
              props.locale,
              caseItem.ownerName,
              caseItem.latestHumanReply,
              caseItem.followUpStatus,
              caseItem.openInterventionsCount
            );

            return (
              <WorkflowCard
                key={caseItem.caseId}
                tone="critical"
                badges={
                  <>
                    <StatusBadge tone="warning">{getPersistedFollowUpLabel(props.locale, caseItem)}</StatusBadge>
                    {caseItem.openInterventionsCount > 0 ? (
                      <StatusBadge tone="warning">{getInterventionCountLabel(props.locale, caseItem.openInterventionsCount)}</StatusBadge>
                    ) : null}
                  </>
                }
                meta={<p className={caseMetaClassName}>{buildCaseReferenceCode(caseItem.caseId)}</p>}
                summary={caseItem.nextAction}
                title={caseItem.customerName}
                actions={
                  <Link className={inlineLinkClassName} href={`/${props.locale}/leads/${caseItem.caseId}`}>
                    {props.locale === "ar" ? "فتح الحالة" : "Open case"}
                  </Link>
                }
              >
                <div className={stackTightClassName}>
                  <p className={caseMetaClassName}>
                    {caseItem.latestHumanReply?.sentByName}
                    {" · "}
                    {latestHumanReplySentAt}
                  </p>
                  {latestHumanReplyOwnershipLabel ? <p className={caseMetaClassName}>{latestHumanReplyOwnershipLabel}</p> : null}
                  {latestHumanReplyEscalationLabel ? <p className={caseMetaClassName}>{latestHumanReplyEscalationLabel}</p> : null}
                </div>
              </WorkflowCard>
            );
          }}
        />
      </Panel>
      ) : null}

      <div className={twoColumnGridClassName}>
        <Panel title={props.locale === "ar" ? "طابور حوكمة الإيرادات" : "Revenue governance queue"}>
          <StatefulStack
            emptySummary={
              props.locale === "ar"
                ? "لا توجد حالياً حالات إيرادات معلقة عند مراجعة الجودة."
                : "No revenue-side cases are currently waiting on QA governance."
            }
            emptyTitle={props.locale === "ar" ? "لا توجد مراجعات مفتوحة" : "No open governance reviews"}
            items={governanceSummary.revenueAttentionCases}
            renderItem={(caseItem) => {
              const qaReviewDisplay = getPersistedQaReviewDisplay(props.locale, caseItem);

              if (!qaReviewDisplay) {
                return null;
              }

              return (
                <ReviewSummaryCard
                  key={caseItem.caseId}
                  actions={
                    <>
                      <Link className={inlineLinkClassName} href={`/${props.locale}/leads/${caseItem.caseId}`}>
                        {props.locale === "ar" ? "فتح الحالة" : "Open case"}
                      </Link>
                      {canAccessQaWorkspace ? (
                        <Link className={inlineLinkClassName} href={`/${props.locale}/qa/cases/${caseItem.caseId}`}>
                          {props.locale === "ar" ? "فتح سجل الجودة" : "Open QA record"}
                        </Link>
                      ) : null}
                    </>
                  }
                  badges={[
                    { label: qaReviewDisplay.statusLabel, tone: qaReviewDisplay.statusTone },
                    { label: qaReviewDisplay.subjectTypeLabel },
                    { label: qaReviewDisplay.triggerSourceLabel },
                    ...qaReviewDisplay.policySignalLabels.map((label) => ({ label }))
                  ]}
                  meta={
                    <p className={caseMetaClassName}>
                      {buildCaseReferenceCode(caseItem.caseId)}
                      {" · "}
                      {qaReviewDisplay.updatedAt}
                    </p>
                  }
                  summary={qaReviewDisplay.reviewSummary ?? qaReviewDisplay.sampleSummary}
                  title={caseItem.customerName}
                  tone="critical"
                >
                  {qaReviewDisplay.draftMessage ? <p>{qaReviewDisplay.draftMessage}</p> : null}
                </ReviewSummaryCard>
              );
            }}
          />
        </Panel>

        <Panel title={props.locale === "ar" ? "بؤر مخاطر الجودة" : "Governance hotspots"}>
          <GovernanceHotspotsPanel
            emptySummary={
              props.locale === "ar"
                ? "لا توجد حالياً إشارات سياسة مفتوحة داخل مسار الإيرادات."
                : "No policy hotspots are currently open inside the revenue surface."
            }
            emptyTitle={props.locale === "ar" ? "لا توجد بؤر مفتوحة" : "No active hotspots"}
            locale={props.locale}
            topPolicySignals={governanceSummary.topPolicySignals.filter((signal) => signal.kind === "case_message")}
          />
        </Panel>
      </div>

      <div className={twoColumnGridClassName}>
        <Panel title={props.locale === "ar" ? "اتجاه جودة المحادثات" : "Conversation QA trend"}>
          <GovernanceActivityPanel
            emptySummary={
              props.locale === "ar"
                ? "لا توجد حالياً بيانات اتجاه محفوظة لمراجعات المحادثات."
                : "No persisted trend history is currently available for conversation QA reviews."
            }
            emptyTitle={props.locale === "ar" ? "لا يوجد اتجاه بعد" : "No conversation trend yet"}
            items={filterGovernanceDailyActivity(props.governanceReport, "case_message")}
            locale={props.locale}
          />
        </Panel>

        <Panel title={props.locale === "ar" ? "آخر نشاطات جودة المحادثات" : "Recent conversation QA activity"}>
          <GovernanceRecentEventsPanel
            emptySummary={
              props.locale === "ar"
                ? "لا توجد حالياً أحداث محفوظة لفتحات أو حسومات جودة المحادثات."
                : "No persisted openings or resolutions are currently recorded for conversation QA reviews."
            }
            emptyTitle={props.locale === "ar" ? "لا توجد أحداث حديثة" : "No recent conversation QA events"}
            events={filterGovernanceRecentEvents(props.governanceReport, "case_message")}
            locale={props.locale}
          />
        </Panel>
      </div>
    </div>
  );
}

function GovernanceHotspotsPanel(props: {
  emptySummary: string;
  emptyTitle: string;
  locale: SupportedLocale;
  topPolicySignals: GovernanceSignalCount[];
}) {
  return (
    <StatefulStack
      emptySummary={props.emptySummary}
      emptyTitle={props.emptyTitle}
      items={props.topPolicySignals}
      renderItem={(signalCount) => (
        <WorkflowCard
          key={`${signalCount.kind}-${signalCount.signal}`}
          tone={signalCount.kind === "handover_customer_update" ? "warning" : "neutral"}
          badges={<StatusBadge tone={signalCount.count > 1 ? "critical" : "warning"}>{signalCount.count}</StatusBadge>}
          summary={
            signalCount.kind === "handover_customer_update"
              ? props.locale === "ar"
                ? "إشارة متكررة داخل مسودات تحديث العميل في مسار التسليم."
                : "Recurring risk signal inside prepared customer-update drafts."
              : props.locale === "ar"
                ? "إشارة متكررة داخل مراجعات رسائل العملاء في مسار الإيرادات."
                : "Recurring risk signal inside customer-message QA reviews."
          }
          title={getGovernanceSignalLabel(props.locale, signalCount)}
        />
      )}
    />
  );
}

function GovernanceActivityPanel(props: {
  emptySummary: string;
  emptyTitle: string;
  items: Array<{
    date: string;
    openedCount: number;
    resolvedApprovedCount: number;
    resolvedCaseMessageCount: number;
    resolvedCount: number;
    resolvedFollowUpRequiredCount: number;
    resolvedHandoverCustomerUpdateCount: number;
  }>;
  locale: SupportedLocale;
}) {
  return (
    <StatefulStack
      emptySummary={props.emptySummary}
      emptyTitle={props.emptyTitle}
      items={props.items}
      renderItem={(item) => (
        <WorkflowCard
          key={item.date}
          badges={
            <>
              <StatusBadge tone={item.openedCount > item.resolvedCount ? "warning" : "success"}>
                {props.locale === "ar" ? `${item.openedCount} فتحت` : `${item.openedCount} opened`}
              </StatusBadge>
              <StatusBadge tone={item.resolvedCount > 0 ? "success" : "warning"}>
                {props.locale === "ar" ? `${item.resolvedCount} حسمت` : `${item.resolvedCount} resolved`}
              </StatusBadge>
            </>
          }
          summary={
            props.locale === "ar"
              ? item.openedCount > item.resolvedCount
                ? "ضغط الحوكمة ازداد في هذا اليوم أكثر مما حُسم."
                : "تم حسم النشاطات اليومية بقدر يوازي أو يفوق الفتحات الجديدة."
              : item.openedCount > item.resolvedCount
                ? "Governance pressure increased on this day faster than reviews were closed."
                : "Daily governance work was resolved at the same pace as, or faster than, new openings."
          }
          title={formatShortDate(`${item.date}T00:00:00.000Z`, props.locale)}
        />
      )}
    />
  );
}

function GovernanceRecentEventsPanel(props: {
  emptySummary: string;
  emptyTitle: string;
  events: PersistedGovernanceSummary["recentEvents"];
  locale: SupportedLocale;
}) {
  return (
    <StatefulStack
      emptySummary={props.emptySummary}
      emptyTitle={props.emptyTitle}
      items={props.events}
      renderItem={(event) => {
        const statusLabel =
          event.kind === "handover_customer_update"
            ? getHandoverCustomerUpdateQaReviewStatusLabel(
                props.locale,
                event.status as Parameters<typeof getHandoverCustomerUpdateQaReviewStatusLabel>[1]
              )
            : getCaseQaReviewStatusLabel(props.locale, event.status as Parameters<typeof getCaseQaReviewStatusLabel>[1]);
        const statusTone =
          event.status === "approved" ? "success" : event.status === "follow_up_required" ? "warning" : ("critical" as const);

        return (
          <WorkflowCard
            key={`${event.caseId}-${event.createdAt}-${event.kind}-${event.action}`}
            badges={
              <>
                <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
                {event.subjectType && event.kind === "handover_customer_update" ? (
                  <StatusBadge>
                    {getHandoverCustomerUpdateTypeLabel(
                      props.locale,
                      event.subjectType as Parameters<typeof getHandoverCustomerUpdateTypeLabel>[1]
                    )}
                  </StatusBadge>
                ) : null}
              </>
            }
            meta={<p className={caseMetaClassName}>{formatDateTime(event.createdAt, props.locale)}</p>}
            summary={getGovernanceRecentEventSummary(props.locale, event)}
            title={event.customerName}
          >
            <div className={statusRowWrapClassName}>
              {event.policySignals.map((signal) => (
                <StatusBadge key={`${event.caseId}-${event.createdAt}-${signal}`}>
                  {getGovernanceSignalLabel(props.locale, {
                    count: 1,
                    kind: event.kind,
                    signal
                  })}
                </StatusBadge>
              ))}
            </div>
          </WorkflowCard>
        );
      }}
    />
  );
}

function filterGovernanceDailyActivity(report: PersistedGovernanceSummary | null, kind: GovernanceSignalCount["kind"]) {
  if (!report) {
    return [];
  }

  return report.dailyActivity.map((item) => ({
    date: item.date,
    openedCount: kind === "case_message" ? item.openedCaseMessageCount : item.openedHandoverCustomerUpdateCount,
    resolvedApprovedCount: item.resolvedApprovedCount,
    resolvedCaseMessageCount: item.resolvedCaseMessageCount,
    resolvedCount: kind === "case_message" ? item.resolvedCaseMessageCount : item.resolvedHandoverCustomerUpdateCount,
    resolvedFollowUpRequiredCount: item.resolvedFollowUpRequiredCount,
    resolvedHandoverCustomerUpdateCount: item.resolvedHandoverCustomerUpdateCount
  }));
}

function filterGovernanceRecentEvents(report: PersistedGovernanceSummary | null, kind: GovernanceSignalCount["kind"]) {
  return (report?.recentEvents ?? []).filter((event) => event.kind === kind);
}

function getRevenueManagerBatchDriftReasonScopeLabel(
  locale: SupportedLocale,
  reason: RevenueManagerBatchDriftReasonFilter
) {
  if (reason === "follow_up_only") {
    return locale === "ar" ? "متابعة فقط" : "follow-up only";
  }

  if (reason === "later_bulk_reset_only") {
    return locale === "ar" ? "دفعة جماعية فقط" : "bulk reset only";
  }

  return locale === "ar" ? "أسباب مختلطة" : "mixed reasons";
}

function getRevenueExportOptionLabel(
  locale: SupportedLocale,
  recipient: ExportRecipient,
  hasChangedLaterBatchView: boolean,
  hasChangedLaterReasonScopedView: boolean,
  batchDriftReasonScopeLabel: string | null
) {
  const scopeLabel =
    hasChangedLaterReasonScopedView && batchDriftReasonScopeLabel
      ? batchDriftReasonScopeLabel
      : hasChangedLaterBatchView
        ? locale === "ar"
          ? "الحالات التي تغيّرت لاحقاً"
          : "changed-later cases"
        : locale === "ar"
          ? "الحالات المتأثرة"
          : "affected cases";

  if (locale === "ar") {
    switch (recipient) {
      case "manager":
        return `تنزيل CSV إداري لنطاق ${scopeLabel}`;
      case "operations":
        return `تنزيل CSV تشغيلي لنطاق ${scopeLabel}`;
      case "qa":
        return `تنزيل CSV جودة لنطاق ${scopeLabel}`;
    }
  }

  switch (recipient) {
    case "manager":
      return `Download manager CSV for ${scopeLabel}`;
    case "operations":
      return `Download operations CSV for ${scopeLabel}`;
    case "qa":
      return `Download QA CSV for ${scopeLabel}`;
  }
}

function getRevenueExportOptionSummary(
  locale: SupportedLocale,
  recipient: ExportRecipient,
  hasChangedLaterBatchView: boolean
) {
  if (locale === "ar") {
    switch (recipient) {
      case "manager":
        return hasChangedLaterBatchView
          ? "يحافظ هذا الخيار على سياق التوصية ونطاق الانجراف كما تحتاجه مراجعة الإدارة."
          : "يحافظ هذا الخيار على صورة الدفعة الكاملة وسياق التوصية بصيغة إدارية."
      case "operations":
        return "يحزم نفس النطاق بصيغة أوضح لملاك المتابعة الحاليين والتنفيذ التشغيلي.";
      case "qa":
        return "يحزم نفس النطاق بصيغة تدقيق جودة وسياسات عند مشاركة الملف خارج المنتج.";
    }
  }

  switch (recipient) {
    case "manager":
      return hasChangedLaterBatchView
        ? "Keeps the recommendation and drift context in a manager-facing review format."
        : "Keeps the full batch picture and recommendation context in a manager-facing format.";
    case "operations":
      return "Packages the same scope for current follow-up owners and operational execution.";
    case "qa":
      return "Packages the same scope for QA and policy audit when the file is shared outside the product.";
  }
}

function getGovernanceRecentEventSummary(
  locale: SupportedLocale,
  event: PersistedGovernanceSummary["recentEvents"][number]
) {
  if (event.kind === "handover_customer_update") {
    if (event.action === "opened") {
      return locale === "ar"
        ? "فُتحت بوابة جودة لمسودة تحديث عميل بسبب إشارة سياسة أو وعد حساس."
        : "A QA gate opened on a prepared customer update after a policy or promise-sensitive trigger.";
    }

    return event.status === "approved"
      ? locale === "ar"
        ? "تم اعتماد مسودة التحديث ويمكنها التقدم نحو الإرسال الجاهز."
        : "The prepared update was approved and can continue toward dispatch readiness."
      : locale === "ar"
        ? "أعادت الجودة المسودة للمراجعة مع طلب متابعة أو تعديل."
        : "QA sent the prepared draft back for corrective follow-up.";
  }

  if (event.action === "opened") {
    if (event.subjectType === "prepared_reply_draft") {
      return event.triggerSource === "policy_rule"
        ? locale === "ar"
          ? "فُتحت مراجعة جودة لمسودة رد مجهزة بعد رصد صياغة وعد أو سياسة حساسة."
          : "A QA gate opened on a prepared reply draft after policy-sensitive promise language was detected."
        : locale === "ar"
          ? "أُرسلت مسودة رد مجهزة إلى الجودة قبل متابعة المحادثة."
          : "A prepared reply draft was sent to QA before the conversation continues.";
    }

    return event.triggerSource === "policy_rule"
      ? locale === "ar"
        ? "فُتحت مراجعة جودة تلقائية بسبب إشارات سياسة داخل رسالة الحالة."
        : "An automatic QA review opened after policy signals matched in the case message."
      : locale === "ar"
        ? "طلبت الإدارة مراجعة جودة صريحة قبل متابعة المحادثة."
        : "A manager explicitly requested QA review before the conversation continues.";
  }

  if (event.status === "approved") {
    return event.subjectType === "prepared_reply_draft"
      ? locale === "ar"
        ? "اعتمدت الجودة مسودة الرد ويمكن للمالك البشري متابعة الإرسال اليدوي."
        : "QA approved the prepared reply draft and the human owner can continue the manual response."
      : locale === "ar"
        ? "اعتمدت الجودة هذه الحالة ويمكن متابعة المسار التجاري دون عائق إضافي."
        : "QA approved the case and the commercial workflow can continue without an extra hold.";
  }

  return locale === "ar"
    ? event.subjectType === "prepared_reply_draft"
      ? "أعادت الجودة مسودة الرد لتعديل مباشر قبل متابعة العميل."
      : "أعادت الجودة هذه الحالة إلى متابعة بشرية أو تصحيح مباشر."
    : event.subjectType === "prepared_reply_draft"
      ? "QA sent the prepared reply draft back for corrective changes before the customer reply continues."
      : "QA marked the case for direct human follow-up or corrective action.";
}

function getGovernanceSignalLabel(locale: SupportedLocale, signalCount: GovernanceSignalCount) {
  return signalCount.kind === "handover_customer_update"
    ? getHandoverCustomerUpdateQaPolicySignalLabel(
        locale,
        signalCount.signal as Parameters<typeof getHandoverCustomerUpdateQaPolicySignalLabel>[1]
      )
    : getCaseQaPolicySignalLabel(locale, signalCount.signal as Parameters<typeof getCaseQaPolicySignalLabel>[1]);
}
