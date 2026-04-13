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
import { Panel, StatusBadge } from "@real-estate-ai/ui";

import { ScreenIntro } from "@/components/screen-intro";
import { StatefulStack } from "@/components/stateful-stack";
import { WorkspaceAccessPanel } from "@/components/workspace-access-panel";
import {
  getCaseQaPolicySignalLabel,
  getCaseQaReviewStatusLabel,
  getHandoverCustomerUpdateQaReviewStatusLabel,
  getHandoverCustomerUpdateTypeLabel,
  getHandoverCustomerUpdateQaPolicySignalLabel,
  getInterventionCountLabel
} from "@/lib/live-copy";
import { buildManagerGovernanceSummary, type GovernanceSignalCount } from "@/lib/governance-workspace";
import {
  buildManagerWorkspaceQueues,
  getManagerWorkspaceCapabilities,
  getManagerWorkspaceCopy,
  getManagerWorkspaceFallbackAction,
  getManagerWorkspacePath,
  type ManagerWorkspaceRoute
} from "@/lib/manager-workspace";
import { getOperatorRoleLabel } from "@/lib/operator-role";
import {
  buildCaseReferenceCode,
  formatCaseLastChange,
  getPersistedAutomationLabel,
  getPersistedCaseStageLabel,
  getPersistedFollowUpLabel,
  getPersistedHandoverCustomerUpdateQaReviewDisplay,
  getPersistedHandoverWorkspaceDisplay,
  getPersistedQaReviewDisplay
} from "@/lib/persisted-case-presenters";

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
      <div className="page-stack">
        <ScreenIntro badge={workspaceCopy.title} summary={workspaceCopy.summary} title={workspaceCopy.title} />

        <Panel title={props.locale === "ar" ? "سجل الدور المحلي الحالي" : "Current local role mode"}>
          <div className="page-stack">
            <p className="panel-summary">
              {props.locale === "ar"
                ? `يعمل هذا المركز بدور ${getOperatorRoleLabel(props.locale, props.currentOperatorRole)} مع واجهة تجريبية جاهزة لمسارات التخطيط والتنفيذ والإغلاق.`
                : `This command center is running as ${getOperatorRoleLabel(props.locale, props.currentOperatorRole)} with a fixture-backed shell for planning, execution, and closure queues.`}
            </p>
            <div className="status-row-wrap">
              <StatusBadge>{getOperatorRoleLabel(props.locale, props.currentOperatorRole)}</StatusBadge>
              {actionableSurfaceLabels.map((label) => (
                <StatusBadge key={label} tone="success">
                  {label}
                </StatusBadge>
              ))}
            </div>
          </div>
        </Panel>

        <div className="metric-grid">
          <article className="metric-tile metric-tile-mint">
            <p className="metric-label">{props.locale === "ar" ? "سجلات التسليم التجريبية" : "Fixture handovers"}</p>
            <p className="metric-value">{demoDataset.handoverCases.length}</p>
            <p className="metric-detail">
              {props.locale === "ar"
                ? "واجهة جاهزة لإظهار الحدود التشغيلية حتى قبل تشغيل البيانات الحية."
                : "A seeded surface showing the intended operational boundaries before live data is available."}
            </p>
          </article>
          <article className="metric-tile metric-tile-sand">
            <p className="metric-label">{props.locale === "ar" ? "المراحل الجاهزة" : "Ready milestones"}</p>
            <p className="metric-value">
              {
                demoDataset.handoverCases.flatMap((handoverCase) => handoverCase.milestones).filter((milestone) => milestone.status === "ready")
                  .length
              }
            </p>
            <p className="metric-detail">
              {props.locale === "ar"
                ? "مراحل قابلة للانتقال إلى خطوة مديرية تالية."
                : "Milestones already staged for the next manager-owned boundary."}
            </p>
          </article>
          <article className="metric-tile metric-tile-rose">
            <p className="metric-label">{props.locale === "ar" ? "عوائق مفتوحة" : "Open blockers"}</p>
            <p className="metric-value">
              {
                demoDataset.handoverCases.flatMap((handoverCase) => handoverCase.milestones).filter((milestone) => milestone.status === "blocked")
                  .length
              }
            </p>
            <p className="metric-detail">
              {props.locale === "ar"
                ? "توضح كيف سيظهر خطر التسليم حتى قبل تفعيل الرحلة الحية بالكامل."
                : "Shows how handover risk will surface before the live workflow is fully enabled."}
            </p>
          </article>
          <article className="metric-tile metric-tile-ocean">
            <p className="metric-label">{props.locale === "ar" ? "بوابات جودة المسودات" : "Draft QA gates"}</p>
            <p className="metric-value">0</p>
            <p className="metric-detail">
              {props.locale === "ar"
                ? "ستظهر هنا ضغوط جودة المسودات الصادرة عندما تتوفر سجلات تسليم حيّة."
                : "Outbound draft-governance pressure will surface here once live handover records are available."}
            </p>
          </article>
        </div>

        <div className="two-column-grid">
          <Panel title={props.locale === "ar" ? "طابور التسليم التجريبي" : "Fixture handover queue"}>
            <StatefulStack
              emptySummary={messages.states.emptyMilestonesSummary}
              emptyTitle={messages.states.emptyMilestonesTitle}
              items={demoDataset.handoverCases}
              renderItem={(handoverCase) => (
                <Link key={handoverCase.id} className="case-link-card" href={`/${props.locale}/handover/${handoverCase.id}`}>
                  <div>
                    <p className="case-link-meta">{getLocalizedText(handoverCase.projectName, props.locale)}</p>
                    <h3>{handoverCase.customerName}</h3>
                    <p>{getLocalizedText(handoverCase.readinessLabel, props.locale)}</p>
                  </div>
                  <div className="case-link-aside">
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
                <Link key={caseItem.id} className="case-link-card" href={`/${props.locale}/handover/${caseItem.handoverCaseId}`}>
                  <div>
                    <p className="case-link-meta">{caseItem.referenceCode}</p>
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

        <div className="two-column-grid">
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
    <div className="page-stack">
      <ScreenIntro badge={workspaceCopy.title} summary={workspaceCopy.summary} title={workspaceCopy.title} />

      <Panel title={props.locale === "ar" ? "سجل الدور المحلي الحالي" : "Current local role mode"}>
        <div className="page-stack">
          <p className="panel-summary">
            {props.locale === "ar"
              ? `يعمل هذا المركز الآن بدور ${getOperatorRoleLabel(props.locale, props.currentOperatorRole)}. يتم فصل طوابير التخطيط والتنفيذ والإغلاق في مسار مستقل عن متابعة الإيرادات.`
              : `This command center is currently running as ${getOperatorRoleLabel(props.locale, props.currentOperatorRole)}. Planning, execution, and closure queues now live on a dedicated route separate from revenue follow-up.`}
          </p>
          <div className="status-row-wrap">
            <StatusBadge>{getOperatorRoleLabel(props.locale, props.currentOperatorRole)}</StatusBadge>
            {actionableSurfaceLabels.map((label) => (
              <StatusBadge key={label} tone="success">
                {label}
              </StatusBadge>
            ))}
          </div>
          {canAccessRevenueManagerWorkspace ? (
            <Link className="inline-link" href={getManagerWorkspacePath(props.locale, "manager_revenue")}>
              {props.locale === "ar" ? "الانتقال إلى قيادة الإيرادات" : "Switch to revenue command center"}
            </Link>
          ) : null}
          <Link className="inline-link" href={`/${props.locale}/manager/governance`}>
            {props.locale === "ar" ? "فتح تقرير الحوكمة" : "Open governance report"}
          </Link>
        </div>
      </Panel>

      <div className="metric-grid">
        <article className="metric-tile metric-tile-mint">
          <p className="metric-label">{props.locale === "ar" ? "تخطيط التسليم" : "Handover planning"}</p>
          <p className="metric-value">{planningCases.length}</p>
          <p className="metric-detail">
            {props.locale === "ar"
              ? "سجلات حيّة ما زالت داخل حدود الجاهزية أو الجدولة."
              : "Live records still inside readiness and customer-scheduling boundaries."}
          </p>
        </article>
        <article className="metric-tile metric-tile-sand">
          <p className="metric-label">{props.locale === "ar" ? "تنفيذ التسليم" : "Handover execution"}</p>
          <p className="metric-value">{executionCases.length}</p>
          <p className="metric-detail">
            {props.locale === "ar"
              ? "سجلات مجدولة أو قيد التنفيذ تحتاج وضوحاً تشغيلياً."
              : "Scheduled and in-progress records that still need active operational control."}
          </p>
        </article>
        <article className="metric-tile metric-tile-rose">
          <p className="metric-label">{props.locale === "ar" ? "إغلاق التسليم" : "Handover closure"}</p>
          <p className="metric-value">{closureCases.length}</p>
          <p className="metric-detail">
            {props.locale === "ar"
              ? "سجلات مكتملة دخلت مرحلة المراجعة أو المتابعة أو الأرشفة."
              : "Completed records now inside review, aftercare, or administrative archive boundaries."}
          </p>
        </article>
        <article className="metric-tile metric-tile-ocean">
          <p className="metric-label">{props.locale === "ar" ? "حوكمة المسودات" : "Draft governance"}</p>
          <p className="metric-value">{governanceSummary.handoverAttentionCases.length}</p>
          <p className="metric-detail">
            {props.locale === "ar"
              ? "مسودات تحديث العميل التي لا تزال متوقفة بانتظار جودة أو تحتاج إعادة صياغة."
              : "Prepared customer updates that are still blocked on QA or need draft changes before they can move on."}
          </p>
        </article>
        <article className="metric-tile metric-tile-rose">
          <p className="metric-label">{props.locale === "ar" ? "مراجعات قديمة" : "Stale pending QA"}</p>
          <p className="metric-value">{governanceSummary.stalePendingCasesCount}</p>
          <p className="metric-detail">
            {props.locale === "ar"
              ? "عناصر جودة معلقة لأكثر من يوم وتحتاج تصعيداً أو إعادة توجيه واضحة."
              : "Governance items that have been pending for more than a day and likely need escalation or re-routing."}
          </p>
        </article>
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
                <Link key={caseItem.caseId} className="case-link-card" href={`/${props.locale}/handover/${handoverDisplay.handoverCaseId}`}>
                  <div>
                    <p className="case-link-meta">{buildCaseReferenceCode(caseItem.caseId)}</p>
                    <h3>{caseItem.customerName}</h3>
                    <p>{caseItem.nextAction}</p>
                    <p className="case-link-meta">{handoverDisplay.updatedAt}</p>
                  </div>
                  <div className="case-link-aside">
                    <StatusBadge tone={handoverDisplay.statusTone}>{handoverDisplay.statusLabel}</StatusBadge>
                    <StatusBadge>{handoverDisplay.surfaceLabel}</StatusBadge>
                  </div>
                </Link>
              );
            }}
          />
        </Panel>
      ) : null}

      <div className="two-column-grid">
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
                <article key={caseItem.caseId} className="alert-row alert-row-high">
                  <div className="row-between">
                    <div className="stack-tight">
                      <h3>{caseItem.customerName}</h3>
                      <p className="case-link-meta">{buildCaseReferenceCode(caseItem.caseId)}</p>
                    </div>
                    <div className="status-row-wrap">
                      <StatusBadge tone={qaReviewDisplay.reviewStatusTone}>{qaReviewDisplay.reviewStatusLabel}</StatusBadge>
                      <StatusBadge>{qaReviewDisplay.typeLabel}</StatusBadge>
                    </div>
                  </div>
                  <p>{qaReviewDisplay.reviewSummary ?? qaReviewDisplay.reviewSampleSummary}</p>
                  <p className="case-link-meta">{qaReviewDisplay.updatedAt}</p>
                  <div className="status-row-wrap">
                    {qaReviewDisplay.policySignalLabels.map((label) => (
                      <StatusBadge key={`${caseItem.caseId}-${label}`}>{label}</StatusBadge>
                    ))}
                  </div>
                  <div className="status-row-wrap">
                    <Link className="inline-link" href={`/${props.locale}/handover/${qaReviewDisplay.handoverCaseId}`}>
                      {props.locale === "ar" ? "فتح سجل التسليم" : "Open handover"}
                    </Link>
                    {canAccessQaWorkspace ? (
                      <Link className="inline-link" href={`/${props.locale}/qa/cases/${caseItem.caseId}`}>
                        {props.locale === "ar" ? "فتح سجل الجودة" : "Open QA record"}
                      </Link>
                    ) : null}
                  </div>
                </article>
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

      <div className="two-column-grid">
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

      <div className="two-column-grid">
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
                  <Link key={caseItem.caseId} className="case-link-card" href={`/${props.locale}/handover/${handoverDisplay.handoverCaseId}`}>
                    <div>
                      <p className="case-link-meta">{buildCaseReferenceCode(caseItem.caseId)}</p>
                      <h3>{caseItem.customerName}</h3>
                      <p>{caseItem.nextAction}</p>
                      <p className="case-link-meta">{handoverDisplay.updatedAt}</p>
                    </div>
                    <div className="case-link-aside">
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
                  <Link key={caseItem.caseId} className="case-link-card" href={`/${props.locale}/handover/${handoverDisplay.handoverCaseId}`}>
                    <div>
                      <p className="case-link-meta">{buildCaseReferenceCode(caseItem.caseId)}</p>
                      <h3>{caseItem.customerName}</h3>
                      <p>{caseItem.nextAction}</p>
                      <p className="case-link-meta">{handoverDisplay.updatedAt}</p>
                    </div>
                    <div className="case-link-aside">
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
    <div className="page-stack">
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
        <div className="page-stack">
          <p className="panel-summary">
            {props.locale === "ar"
              ? `يعمل مدخل الإدارة الآن بدور ${currentRoleLabel}. بما أن هذا الدور يملك أكثر من مساحة إدارية، فقد تم إبقاء هذا المسار كبوابة اختيار واضحة.`
              : `The manager entry is currently running as ${currentRoleLabel}. Because this role can operate more than one manager surface, this route now acts as an explicit workspace gateway.`}
          </p>
          <div className="status-row-wrap">
            <StatusBadge>{currentRoleLabel}</StatusBadge>
            <StatusBadge tone="success">{getManagerWorkspaceCopy(props.locale, "manager_revenue").title}</StatusBadge>
            <StatusBadge tone="success">{getManagerWorkspaceCopy(props.locale, "manager_handover").title}</StatusBadge>
          </div>
          <Link className="inline-link" href={`/${props.locale}/manager/governance`}>
            {props.locale === "ar" ? "فتح تقرير الحوكمة" : "Open governance report"}
          </Link>
        </div>
      </Panel>

      {props.persistedCases.length > 0 ? (
        <Panel title={props.locale === "ar" ? "ضغط الحوكمة الحالي" : "Current governance pressure"}>
          <div className="page-stack">
            <p className="panel-summary">
              {props.locale === "ar"
                ? `${governanceSummary.totalAttentionCasesCount} عنصر حوكمة مفتوح عبر الإيرادات والتسليم، منها ${governanceSummary.pendingCasesCount} بانتظار القرار و${governanceSummary.followUpRequiredCasesCount} تحتاج تصحيحاً.`
                : `${governanceSummary.totalAttentionCasesCount} governance items are open across revenue and handover, with ${governanceSummary.pendingCasesCount} waiting for a decision and ${governanceSummary.followUpRequiredCasesCount} needing corrective follow-up.`}
            </p>
            <div className="status-row-wrap">
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
            <Link className="inline-link" href={`/${props.locale}/qa`}>
              {props.locale === "ar" ? "فتح مركز الجودة" : "Open QA review center"}
            </Link>
          ) : null}
          <Link className="inline-link" href={`/${props.locale}/manager/governance`}>
            {props.locale === "ar" ? "فتح تقرير الحوكمة" : "Open governance report"}
          </Link>
        </div>
      </Panel>
      ) : null}

      <div className="two-column-grid">
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

      <div className="two-column-grid">
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
    <div className="page-stack">
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
  currentOperatorRole: OperatorRole;
  governanceReport: PersistedGovernanceSummary | null;
  locale: SupportedLocale;
  persistedCases: PersistedCaseSummary[];
}) {
  const messages = getMessages(props.locale);
  const workspaceCopy = getManagerWorkspaceCopy(props.locale, "manager_revenue");
  const managerCapabilities = getManagerWorkspaceCapabilities(props.currentOperatorRole);
  const { openInterventionsCount, pausedAutomationCases, revenueAttentionCases } = buildManagerWorkspaceQueues(props.persistedCases);
  const governanceSummary = buildManagerGovernanceSummary(props.persistedCases);
  const canAccessHandoverManagerWorkspace = canOperatorRoleAccessWorkspace("manager_handover", props.currentOperatorRole);
  const canAccessHandoverWorkspace = canOperatorRoleAccessWorkspace("handover", props.currentOperatorRole);
  const canAccessQaWorkspace = canOperatorRoleAccessWorkspace("qa", props.currentOperatorRole);

  if (props.persistedCases.length === 0) {
    return (
      <div className="page-stack">
        <ScreenIntro badge={workspaceCopy.title} summary={workspaceCopy.summary} title={workspaceCopy.title} />

        <Panel title={props.locale === "ar" ? "سجل الدور المحلي الحالي" : "Current local role mode"}>
          <div className="page-stack">
            <p className="panel-summary">
              {props.locale === "ar"
                ? `يعمل هذا المركز بدور ${getOperatorRoleLabel(props.locale, props.currentOperatorRole)} مع طابور متابعة تجريبي جاهز للتحول إلى بيانات حية.`
                : `This command center is running as ${getOperatorRoleLabel(props.locale, props.currentOperatorRole)} with a fixture-backed follow-up queue ready to move onto live data.`}
            </p>
            <div className="status-row-wrap">
              <StatusBadge>{getOperatorRoleLabel(props.locale, props.currentOperatorRole)}</StatusBadge>
              {managerCapabilities.canManageFollowUp ? (
                <StatusBadge tone="success">{props.locale === "ar" ? "المتابعة" : "Follow-up"}</StatusBadge>
              ) : null}
            </div>
          </div>
        </Panel>

        <div className="metric-grid">
          <article className="metric-tile metric-tile-ocean">
            <p className="metric-label">{props.locale === "ar" ? "تنبيهات الإدارة" : "Manager alerts"}</p>
            <p className="metric-value">{demoDataset.managerAlerts.length}</p>
            <p className="metric-detail">
              {props.locale === "ar"
                ? "تنبيهات مزروعة لإثبات وضوح طوابير التدخل التجاري."
                : "Fixture alerts proving the intended commercial intervention queue."}
            </p>
          </article>
          <article className="metric-tile metric-tile-sand">
            <p className="metric-label">{props.locale === "ar" ? "حالات مرتبطة" : "Linked cases"}</p>
            <p className="metric-value">{demoDataset.cases.length}</p>
            <p className="metric-detail">
              {props.locale === "ar"
                ? "سجل حالات جاهز للانتقال من المتابعة إلى الإجراءات التالية."
                : "A case list already wired for follow-up ownership and next-step visibility."}
            </p>
          </article>
          <article className="metric-tile metric-tile-rose">
            <p className="metric-label">{props.locale === "ar" ? "ضغوط الحوكمة" : "Governance pressure"}</p>
            <p className="metric-value">0</p>
            <p className="metric-detail">
              {props.locale === "ar"
                ? "ستظهر مراجعات جودة الرسائل هنا عندما تتوفر حالات حيّة محفوظة."
                : "Conversation-governance holds will surface here once persisted live cases are available."}
            </p>
          </article>
        </div>

        <div className="two-column-grid">
          <Panel title={props.locale === "ar" ? "طابور متابعة الإيرادات" : "Revenue follow-up queue"}>
            <StatefulStack
              emptySummary={messages.states.emptyAlertsSummary}
              emptyTitle={messages.states.emptyAlertsTitle}
              items={demoDataset.managerAlerts}
              renderItem={(alert) => (
                <article key={alert.id} className={`alert-row alert-row-${alert.severity}`}>
                  <div className="row-between">
                    <h3>{getLocalizedText(alert.title, props.locale)}</h3>
                    <StatusBadge tone={alert.severity === "high" ? "critical" : "warning"}>{alert.severity}</StatusBadge>
                  </div>
                  <p>{getLocalizedText(alert.detail, props.locale)}</p>
                </article>
              )}
            />
          </Panel>

          <Panel title={messages.leads.title}>
            <StatefulStack
              emptySummary={messages.states.emptyCasesSummary}
              emptyTitle={messages.states.emptyCasesTitle}
              items={demoDataset.cases}
              renderItem={(caseItem) => (
                <Link key={caseItem.id} className="case-link-card" href={`/${props.locale}/leads/${caseItem.id}`}>
                  <div>
                    <p className="case-link-meta">{caseItem.referenceCode}</p>
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

        <div className="two-column-grid">
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
    <div className="page-stack">
      <ScreenIntro badge={workspaceCopy.title} summary={workspaceCopy.summary} title={workspaceCopy.title} />

      <Panel title={props.locale === "ar" ? "سجل الدور المحلي الحالي" : "Current local role mode"}>
        <div className="page-stack">
          <p className="panel-summary">
            {props.locale === "ar"
              ? `يعمل هذا المركز الآن بدور ${getOperatorRoleLabel(props.locale, props.currentOperatorRole)}. تمت إزالة طوابير التسليم من هذا المسار حتى تبقى متابعة الإيرادات واضحة وقابلة للتنفيذ.`
              : `This command center is currently running as ${getOperatorRoleLabel(props.locale, props.currentOperatorRole)}. Handover queues have moved off this route so revenue follow-up can stay focused and actionable.`}
          </p>
          <div className="status-row-wrap">
            <StatusBadge>{getOperatorRoleLabel(props.locale, props.currentOperatorRole)}</StatusBadge>
            {managerCapabilities.canManageFollowUp ? (
              <StatusBadge tone="success">{props.locale === "ar" ? "المتابعة" : "Follow-up"}</StatusBadge>
            ) : null}
          </div>
          {canAccessHandoverManagerWorkspace ? (
            <Link className="inline-link" href={getManagerWorkspacePath(props.locale, "manager_handover")}>
              {props.locale === "ar" ? "الانتقال إلى قيادة التسليم" : "Switch to handover command center"}
            </Link>
          ) : null}
          <Link className="inline-link" href={`/${props.locale}/manager/governance`}>
            {props.locale === "ar" ? "فتح تقرير الحوكمة" : "Open governance report"}
          </Link>
        </div>
      </Panel>

      <div className="metric-grid">
        <article className="metric-tile metric-tile-ocean">
          <p className="metric-label">{props.locale === "ar" ? "طابور المتابعة" : "Follow-up queue"}</p>
          <p className="metric-value">{revenueAttentionCases.length}</p>
          <p className="metric-detail">
            {props.locale === "ar"
              ? "حالات تجاوزت مواعيد المتابعة أو تحتوي على تدخلات مفتوحة."
              : "Cases with overdue follow-up or open manager interventions."}
          </p>
        </article>
        <article className="metric-tile metric-tile-sand">
          <p className="metric-label">{props.locale === "ar" ? "التدخلات المفتوحة" : "Open interventions"}</p>
          <p className="metric-value">{openInterventionsCount}</p>
          <p className="metric-detail">
            {props.locale === "ar"
              ? "إجمالي التدخلات غير المحلولة عبر الحالات الحية."
              : "The total unresolved intervention count across live cases."}
          </p>
        </article>
        <article className="metric-tile metric-tile-rose">
          <p className="metric-label">{props.locale === "ar" ? "الأتمتة المتوقفة" : "Paused automation"}</p>
          <p className="metric-value">{pausedAutomationCases.length}</p>
          <p className="metric-detail">
            {props.locale === "ar"
              ? "حالات أوقفت فيها الأتمتة بقرار إداري واضح."
              : "Cases where automation was paused behind an explicit managerial decision."}
          </p>
        </article>
        <article className="metric-tile metric-tile-mint">
          <p className="metric-label">{props.locale === "ar" ? "حوكمة المحادثات" : "Conversation governance"}</p>
          <p className="metric-value">{governanceSummary.revenueAttentionCases.length}</p>
          <p className="metric-detail">
            {props.locale === "ar"
              ? "حالات ما زالت رسائلها داخل مراجعة الجودة أو تحتاج متابعة تصحيحية."
              : "Cases whose customer-facing message state is still blocked on QA or needs corrective follow-up."}
          </p>
        </article>
        <article className="metric-tile metric-tile-rose">
          <p className="metric-label">{props.locale === "ar" ? "مراجعات قديمة" : "Stale pending QA"}</p>
          <p className="metric-value">{governanceSummary.stalePendingCasesCount}</p>
          <p className="metric-detail">
            {props.locale === "ar"
              ? "مراجعات جودة معلقة لأكثر من يوم وقد تحتاج تصعيداً من الإدارة."
              : "QA items that have been pending for more than a day and may need managerial escalation."}
          </p>
        </article>
      </div>

      <div className="two-column-grid">
        <Panel title={props.locale === "ar" ? "طابور متابعة الإيرادات" : "Revenue follow-up queue"}>
          <StatefulStack
            emptySummary={messages.states.emptyAlertsSummary}
            emptyTitle={messages.states.emptyAlertsTitle}
            items={revenueAttentionCases}
            renderItem={(caseItem) => {
              const handoverDisplay = getPersistedHandoverWorkspaceDisplay(props.locale, caseItem);
              const qaReviewDisplay = getPersistedQaReviewDisplay(props.locale, caseItem);

              return (
                <article key={caseItem.caseId} className="alert-row alert-row-high">
                  <div className="row-between">
                    <div className="stack-tight">
                      <h3>{caseItem.customerName}</h3>
                      <p className="case-link-meta">{buildCaseReferenceCode(caseItem.caseId)}</p>
                    </div>
                    <div className="status-row-wrap">
                      <StatusBadge tone={caseItem.followUpStatus === "attention" ? "critical" : "warning"}>
                        {getPersistedFollowUpLabel(props.locale, caseItem)}
                      </StatusBadge>
                      {caseItem.openInterventionsCount > 0 ? (
                        <StatusBadge tone="warning">{getInterventionCountLabel(props.locale, caseItem.openInterventionsCount)}</StatusBadge>
                      ) : null}
                      {qaReviewDisplay ? <StatusBadge tone={qaReviewDisplay.statusTone}>{qaReviewDisplay.statusLabel}</StatusBadge> : null}
                      {handoverDisplay ? <StatusBadge tone={handoverDisplay.statusTone}>{handoverDisplay.statusLabel}</StatusBadge> : null}
                    </div>
                  </div>
                  <p>{caseItem.nextAction}</p>
                  <p className="case-link-meta">{formatCaseLastChange(caseItem, props.locale)}</p>
                  <div className="status-row-wrap">
                    <StatusBadge>{getPersistedAutomationLabel(props.locale, caseItem.automationStatus)}</StatusBadge>
                    <StatusBadge>{getPersistedCaseStageLabel(props.locale, caseItem.stage)}</StatusBadge>
                  </div>
                  <div className="status-row-wrap">
                    <Link className="inline-link" href={`/${props.locale}/leads/${caseItem.caseId}`}>
                      {props.locale === "ar" ? "فتح الحالة" : "Open case"}
                    </Link>
                    {handoverDisplay && canAccessHandoverWorkspace ? (
                      <Link className="inline-link" href={`/${props.locale}/handover/${handoverDisplay.handoverCaseId}`}>
                        {props.locale === "ar" ? "فتح سجل التسليم" : "Open handover"}
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            }}
          />
        </Panel>

        <Panel title={messages.leads.title}>
          <StatefulStack
            emptySummary={messages.states.emptyCasesSummary}
            emptyTitle={messages.states.emptyCasesTitle}
            items={props.persistedCases}
            renderItem={(caseItem) => {
              const handoverDisplay = getPersistedHandoverWorkspaceDisplay(props.locale, caseItem);
              const qaReviewDisplay = getPersistedQaReviewDisplay(props.locale, caseItem);

              return (
                <Link key={caseItem.caseId} className="case-link-card" href={`/${props.locale}/leads/${caseItem.caseId}`}>
                  <div>
                    <p className="case-link-meta">{buildCaseReferenceCode(caseItem.caseId)}</p>
                    <h3>{caseItem.customerName}</h3>
                    <p>{caseItem.nextAction}</p>
                  </div>
                  <div className="case-link-aside">
                    <StatusBadge tone={caseItem.followUpStatus === "attention" ? "critical" : "success"}>
                      {getPersistedFollowUpLabel(props.locale, caseItem)}
                    </StatusBadge>
                    <StatusBadge>{getPersistedAutomationLabel(props.locale, caseItem.automationStatus)}</StatusBadge>
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

      <div className="two-column-grid">
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
                <article key={caseItem.caseId} className="alert-row alert-row-high">
                  <div className="row-between">
                    <div className="stack-tight">
                      <h3>{caseItem.customerName}</h3>
                      <p className="case-link-meta">{buildCaseReferenceCode(caseItem.caseId)}</p>
                    </div>
                    <div className="status-row-wrap">
                      <StatusBadge tone={qaReviewDisplay.statusTone}>{qaReviewDisplay.statusLabel}</StatusBadge>
                      <StatusBadge>{qaReviewDisplay.subjectTypeLabel}</StatusBadge>
                      <StatusBadge>{qaReviewDisplay.triggerSourceLabel}</StatusBadge>
                    </div>
                  </div>
                  {qaReviewDisplay.draftMessage ? <p>{qaReviewDisplay.draftMessage}</p> : null}
                  <p>{qaReviewDisplay.reviewSummary ?? qaReviewDisplay.sampleSummary}</p>
                  <p className="case-link-meta">{qaReviewDisplay.updatedAt}</p>
                  <div className="status-row-wrap">
                    {qaReviewDisplay.policySignalLabels.map((label) => (
                      <StatusBadge key={`${caseItem.caseId}-${label}`}>{label}</StatusBadge>
                    ))}
                  </div>
                  <div className="status-row-wrap">
                    <Link className="inline-link" href={`/${props.locale}/leads/${caseItem.caseId}`}>
                      {props.locale === "ar" ? "فتح الحالة" : "Open case"}
                    </Link>
                    {canAccessQaWorkspace ? (
                      <Link className="inline-link" href={`/${props.locale}/qa/cases/${caseItem.caseId}`}>
                        {props.locale === "ar" ? "فتح سجل الجودة" : "Open QA record"}
                      </Link>
                    ) : null}
                  </div>
                </article>
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

      <div className="two-column-grid">
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
        <article
          key={`${signalCount.kind}-${signalCount.signal}`}
          className={signalCount.kind === "handover_customer_update" ? "intervention-row intervention-row-open" : "intervention-row"}
        >
          <div className="row-between">
            <h3>{getGovernanceSignalLabel(props.locale, signalCount)}</h3>
            <StatusBadge tone={signalCount.count > 1 ? "critical" : "warning"}>{signalCount.count}</StatusBadge>
          </div>
          <p>
            {signalCount.kind === "handover_customer_update"
              ? props.locale === "ar"
                ? "إشارة متكررة داخل مسودات تحديث العميل في مسار التسليم."
                : "Recurring risk signal inside prepared customer-update drafts."
              : props.locale === "ar"
                ? "إشارة متكررة داخل مراجعات رسائل العملاء في مسار الإيرادات."
                : "Recurring risk signal inside customer-message QA reviews."}
          </p>
        </article>
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
        <article key={item.date} className="intervention-row">
          <div className="row-between">
            <h3>{new Date(`${item.date}T00:00:00.000Z`).toLocaleDateString(props.locale, { month: "short", day: "numeric" })}</h3>
            <div className="status-row-wrap">
              <StatusBadge tone={item.openedCount > item.resolvedCount ? "warning" : "success"}>
                {props.locale === "ar" ? `${item.openedCount} فتحت` : `${item.openedCount} opened`}
              </StatusBadge>
              <StatusBadge tone={item.resolvedCount > 0 ? "success" : "warning"}>
                {props.locale === "ar" ? `${item.resolvedCount} حسمت` : `${item.resolvedCount} resolved`}
              </StatusBadge>
            </div>
          </div>
          <p>
            {props.locale === "ar"
              ? item.openedCount > item.resolvedCount
                ? "ضغط الحوكمة ازداد في هذا اليوم أكثر مما حُسم."
                : "تم حسم النشاطات اليومية بقدر يوازي أو يفوق الفتحات الجديدة."
              : item.openedCount > item.resolvedCount
                ? "Governance pressure increased on this day faster than reviews were closed."
                : "Daily governance work was resolved at the same pace as, or faster than, new openings."}
          </p>
        </article>
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
          <article key={`${event.caseId}-${event.createdAt}-${event.kind}-${event.action}`} className="intervention-row">
            <div className="row-between">
              <div className="stack-tight">
                <h3>{event.customerName}</h3>
                <p className="case-link-meta">{new Date(event.createdAt).toLocaleString(props.locale)}</p>
              </div>
              <div className="status-row-wrap">
                <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
                {event.subjectType && event.kind === "handover_customer_update" ? (
                  <StatusBadge>
                    {getHandoverCustomerUpdateTypeLabel(
                      props.locale,
                      event.subjectType as Parameters<typeof getHandoverCustomerUpdateTypeLabel>[1]
                    )}
                  </StatusBadge>
                ) : null}
              </div>
            </div>
            <p>{getGovernanceRecentEventSummary(props.locale, event)}</p>
            <div className="status-row-wrap">
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
          </article>
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
