import Link from "next/link";

import { canOperatorRoleAccessWorkspace, type OperatorRole, type PersistedCaseSummary, type SupportedLocale } from "@real-estate-ai/contracts";
import { demoDataset, getLocalizedText } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";
import { Panel, StatusBadge } from "@real-estate-ai/ui";

import { ScreenIntro } from "@/components/screen-intro";
import { StatefulStack } from "@/components/stateful-stack";
import { WorkspaceAccessPanel } from "@/components/workspace-access-panel";
import { getInterventionCountLabel } from "@/lib/live-copy";
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
  getPersistedHandoverWorkspaceDisplay
} from "@/lib/persisted-case-presenters";

export function HandoverManagerCommandCenter(props: {
  currentOperatorRole: OperatorRole;
  locale: SupportedLocale;
  persistedCases: PersistedCaseSummary[];
}) {
  const messages = getMessages(props.locale);
  const workspaceCopy = getManagerWorkspaceCopy(props.locale, "manager_handover");
  const managerCapabilities = getManagerWorkspaceCapabilities(props.currentOperatorRole);
  const { closureCases, executionCases, planningCases } = buildManagerWorkspaceQueues(props.persistedCases);
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
  locale: SupportedLocale;
  persistedCases: PersistedCaseSummary[];
}) {
  const messages = getMessages(props.locale);
  const { closureCases, executionCases, openInterventionsCount, pausedAutomationCases, planningCases, revenueAttentionCases } =
    buildManagerWorkspaceQueues(props.persistedCases);
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
        </div>
      </Panel>

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
  locale: SupportedLocale;
  persistedCases: PersistedCaseSummary[];
}) {
  const messages = getMessages(props.locale);
  const workspaceCopy = getManagerWorkspaceCopy(props.locale, "manager_revenue");
  const managerCapabilities = getManagerWorkspaceCapabilities(props.currentOperatorRole);
  const { openInterventionsCount, pausedAutomationCases, revenueAttentionCases } = buildManagerWorkspaceQueues(props.persistedCases);
  const canAccessHandoverManagerWorkspace = canOperatorRoleAccessWorkspace("manager_handover", props.currentOperatorRole);
  const canAccessHandoverWorkspace = canOperatorRoleAccessWorkspace("handover", props.currentOperatorRole);

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
      </div>

      <div className="two-column-grid">
        <Panel title={props.locale === "ar" ? "طابور متابعة الإيرادات" : "Revenue follow-up queue"}>
          <StatefulStack
            emptySummary={messages.states.emptyAlertsSummary}
            emptyTitle={messages.states.emptyAlertsTitle}
            items={revenueAttentionCases}
            renderItem={(caseItem) => {
              const handoverDisplay = getPersistedHandoverWorkspaceDisplay(props.locale, caseItem);

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
                    {handoverDisplay ? <StatusBadge tone={handoverDisplay.statusTone}>{handoverDisplay.statusLabel}</StatusBadge> : null}
                    <StatusBadge>{getPersistedCaseStageLabel(props.locale, caseItem.stage)}</StatusBadge>
                  </div>
                </Link>
              );
            }}
          />
        </Panel>
      </div>
    </div>
  );
}
