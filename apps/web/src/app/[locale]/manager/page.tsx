import Link from "next/link";

import { canOperatorRoleAccessWorkspace, canOperatorRolePerform, type SupportedLocale } from "@real-estate-ai/contracts";
import { demoDataset, getLocalizedText } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";
import { Panel, StatusBadge } from "@real-estate-ai/ui";

import { ScreenIntro } from "@/components/screen-intro";
import { StatefulStack } from "@/components/stateful-stack";
import { WorkspaceAccessPanel } from "@/components/workspace-access-panel";
import {
  buildCaseReferenceCode,
  formatCaseLastChange,
  getPersistedAutomationLabel,
  getPersistedCaseStageLabel,
  getPersistedFollowUpLabel,
  getPersistedHandoverWorkspaceDisplay,
  getPersistedHandoverWorkspaceSurface
} from "@/lib/persisted-case-presenters";
import { getInterventionCountLabel } from "@/lib/live-copy";
import { tryListPersistedCases } from "@/lib/live-api";
import { getCurrentOperatorRole } from "@/lib/operator-session";
import { getOperatorRoleLabel } from "@/lib/operator-role";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: SupportedLocale }>;
}

export default async function ManagerPage(props: PageProps) {
  const { locale } = await props.params;
  const messages = getMessages(locale);
  const currentOperatorRole = await getCurrentOperatorRole();
  const canAccessRevenueManagerWorkspace = canOperatorRoleAccessWorkspace("manager_revenue", currentOperatorRole);
  const canAccessHandoverManagerWorkspace = canOperatorRoleAccessWorkspace("manager_handover", currentOperatorRole);
  const canAccessHandoverWorkspace = canOperatorRoleAccessWorkspace("handover", currentOperatorRole);

  if (!canAccessRevenueManagerWorkspace && !canAccessHandoverManagerWorkspace) {
    return (
      <div className="page-stack">
        <ScreenIntro badge={messages.app.phaseLabel} summary={messages.manager.summary} title={messages.manager.title} />
        <WorkspaceAccessPanel
          actionHref={`/${locale}/dashboard`}
          actionLabel={locale === "ar" ? "العودة إلى اللوحة" : "Return to the dashboard"}
          locale={locale}
          operatorRole={currentOperatorRole}
          summary={
            locale === "ar"
              ? "مركز القيادة الإداري مخصص للأدوار التي تدير طوابير الإيرادات أو حدود قيادة التسليم في وضع الجلسة المحلي الموثوق."
              : "The manager command center is reserved for roles that own revenue queues or handover command boundaries in trusted local session mode."
          }
          title={locale === "ar" ? "مركز القيادة غير متاح لهذا الدور" : "Command center unavailable for this role"}
          workspace="manager_handover"
        />
      </div>
    );
  }

  const persistedCases = await tryListPersistedCases();
  const canManageFollowUp = canOperatorRolePerform("manage_case_follow_up", currentOperatorRole);
  const canManagePlanning =
    canOperatorRolePerform("manage_handover_milestones", currentOperatorRole) ||
    canOperatorRolePerform("manage_handover_appointments", currentOperatorRole) ||
    canOperatorRolePerform("manage_handover_customer_updates", currentOperatorRole);
  const canManageExecution =
    canOperatorRolePerform("manage_handover_blockers", currentOperatorRole) ||
    canOperatorRolePerform("manage_handover_execution", currentOperatorRole);
  const canManageClosure = canOperatorRolePerform("manage_handover_governance", currentOperatorRole);
  const planningCases = persistedCases
    .filter((caseItem) => getPersistedHandoverWorkspaceSurface(caseItem) === "planning")
    .sort((left, right) => {
      const priority = {
        customer_scheduling_ready: 0,
        internal_tasks_open: 1,
        pending_readiness: 2
      } as const;

      const leftStatus = left.handoverCase?.status;
      const rightStatus = right.handoverCase?.status;
      const leftPriority = leftStatus ? (priority[leftStatus as keyof typeof priority] ?? 2) : 2;
      const rightPriority = rightStatus ? (priority[rightStatus as keyof typeof priority] ?? 2) : 2;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  const executionCases = persistedCases
    .filter((caseItem) => getPersistedHandoverWorkspaceSurface(caseItem) === "execution")
    .sort((left, right) => {
      const priority = {
        in_progress: 0,
        scheduled: 1
      } as const;

      const leftStatus = left.handoverCase?.status;
      const rightStatus = right.handoverCase?.status;
      const leftPriority = leftStatus ? (priority[leftStatus as keyof typeof priority] ?? 1) : 1;
      const rightPriority = rightStatus ? (priority[rightStatus as keyof typeof priority] ?? 1) : 1;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  const closureCases = persistedCases
    .filter((caseItem) => getPersistedHandoverWorkspaceSurface(caseItem) === "closure")
    .sort((left, right) => {
      const priority = {
        ready_to_archive: 0,
        held: 1,
        closure_review_required: 2,
        aftercare_open: 3,
        archived: 4
      } as const;

      const leftPriority = priority[left.handoverClosure?.status ?? "archived"];
      const rightPriority = priority[right.handoverClosure?.status ?? "archived"];

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  const revenueAttentionCases = persistedCases.filter(
    (caseItem) => caseItem.followUpStatus === "attention" || caseItem.openInterventionsCount > 0
  );
  const actionableSurfaceLabels = [
    canManageFollowUp ? (locale === "ar" ? "المتابعة" : "Follow-up") : null,
    canManagePlanning ? (locale === "ar" ? "تخطيط التسليم" : "Handover planning") : null,
    canManageExecution ? (locale === "ar" ? "تنفيذ التسليم" : "Handover execution") : null,
    canManageClosure ? (locale === "ar" ? "إغلاق التسليم" : "Handover closure") : null
  ].filter((label): label is string => Boolean(label));

  return (
    <div className="page-stack">
      <ScreenIntro badge={messages.app.shellNote} summary={messages.manager.summary} title={messages.manager.title} />

      {persistedCases.length > 0 ? (
        <>
          <Panel title={locale === "ar" ? "وضع الدور المحلي الحالي" : "Current local role mode"}>
            <div className="page-stack">
              <p className="panel-summary">
                {locale === "ar"
                  ? `يعمل مركز القيادة الآن بدور ${getOperatorRoleLabel(locale, currentOperatorRole)}. يتم تقسيم طوابير المدير حسب أسطح العمل القابلة للتنفيذ في هذا الدور.`
                  : `The command center is currently running as ${getOperatorRoleLabel(locale, currentOperatorRole)}. Manager queues are now split by the workflow surfaces this role can act on.`}
              </p>
              <div className="status-row-wrap">
                <StatusBadge>{getOperatorRoleLabel(locale, currentOperatorRole)}</StatusBadge>
                {actionableSurfaceLabels.map((label) => (
                  <StatusBadge key={label} tone="success">
                    {label}
                  </StatusBadge>
                ))}
              </div>
            </div>
          </Panel>

          <div className="metric-grid">
            <article className="metric-tile metric-tile-ocean">
              <p className="metric-label">{locale === "ar" ? "طابور المتابعة" : "Follow-up queue"}</p>
              <p className="metric-value">{revenueAttentionCases.length}</p>
              <p className="metric-detail">
                {locale === "ar"
                  ? "يشمل الحالات التي تجاوزت مواعيد المتابعة أو تحتوي على تدخلات مفتوحة."
                  : "Includes cases with overdue follow-up or open manager interventions."}
              </p>
            </article>
            <article className="metric-tile metric-tile-mint">
              <p className="metric-label">{locale === "ar" ? "تخطيط التسليم" : "Handover planning"}</p>
              <p className="metric-value">{planningCases.length}</p>
              <p className="metric-detail">
                {locale === "ar"
                  ? "سجلات حيّة ما زالت داخل حدود الجاهزية أو الجدولة وتحتاج إلى تخطيط واضح."
                  : "Live handover records still inside readiness or scheduling boundaries."}
              </p>
            </article>
            <article className="metric-tile metric-tile-sand">
              <p className="metric-label">{locale === "ar" ? "تنفيذ التسليم" : "Handover execution"}</p>
              <p className="metric-value">{executionCases.length}</p>
              <p className="metric-detail">
                {locale === "ar"
                  ? "سجلات مجدولة أو قيد التنفيذ تحتاج إلى وضوح تشغيلي قبل أو أثناء يوم التسليم."
                  : "Scheduled and in-progress records that need execution visibility."}
              </p>
            </article>
            <article className="metric-tile metric-tile-rose">
              <p className="metric-label">{locale === "ar" ? "إغلاق التسليم" : "Handover closure"}</p>
              <p className="metric-value">{closureCases.length}</p>
              <p className="metric-detail">
                {locale === "ar"
                  ? "سجلات مكتملة دخلت مرحلة المراجعة أو المتابعة اللاحقة أو الأرشفة الإدارية."
                  : "Completed records that entered review, aftercare, or administrative archive boundaries."}
              </p>
            </article>
          </div>

          <div className="two-column-grid">
            {canAccessRevenueManagerWorkspace ? (
              <Panel title={locale === "ar" ? "طابور متابعة الإيرادات" : "Revenue follow-up queue"}>
              <StatefulStack
                emptySummary={messages.states.emptyAlertsSummary}
                emptyTitle={messages.states.emptyAlertsTitle}
                items={revenueAttentionCases}
                renderItem={(caseItem) => {
                  const handoverDisplay = getPersistedHandoverWorkspaceDisplay(locale, caseItem);

                  return (
                    <article key={caseItem.caseId} className="alert-row alert-row-high">
                      <div className="row-between">
                        <div className="stack-tight">
                          <h3>{caseItem.customerName}</h3>
                          <p className="case-link-meta">{buildCaseReferenceCode(caseItem.caseId)}</p>
                        </div>
                        <div className="status-row-wrap">
                          <StatusBadge tone={caseItem.followUpStatus === "attention" ? "critical" : "warning"}>
                            {getPersistedFollowUpLabel(locale, caseItem)}
                          </StatusBadge>
                          {caseItem.openInterventionsCount > 0 ? (
                            <StatusBadge tone="warning">{getInterventionCountLabel(locale, caseItem.openInterventionsCount)}</StatusBadge>
                          ) : null}
                          {handoverDisplay ? <StatusBadge tone={handoverDisplay.statusTone}>{handoverDisplay.statusLabel}</StatusBadge> : null}
                        </div>
                      </div>
                      <p>{caseItem.nextAction}</p>
                      <p className="case-link-meta">{formatCaseLastChange(caseItem, locale)}</p>
                      <div className="status-row-wrap">
                        <StatusBadge>{getPersistedAutomationLabel(locale, caseItem.automationStatus)}</StatusBadge>
                        <StatusBadge>{getPersistedCaseStageLabel(locale, caseItem.stage)}</StatusBadge>
                      </div>
                      <div className="status-row-wrap">
                        <Link className="inline-link" href={`/${locale}/leads/${caseItem.caseId}`}>
                          {locale === "ar" ? "فتح الحالة" : "Open case"}
                        </Link>
                        {handoverDisplay && canAccessHandoverWorkspace ? (
                          <Link className="inline-link" href={`/${locale}/handover/${handoverDisplay.handoverCaseId}`}>
                            {locale === "ar" ? "فتح سجل التسليم" : "Open handover"}
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  );
                }}
              />
              </Panel>
            ) : null}
          </div>

          {canAccessHandoverManagerWorkspace && canManagePlanning ? (
            <Panel title={locale === "ar" ? "طابور تخطيط التسليم" : "Handover planning queue"}>
              <StatefulStack
                emptySummary={
                  locale === "ar"
                    ? "لا توجد حالياً سجلات داخل مرحلة تخطيط التسليم."
                    : "No live handover records are currently inside the planning surface."
                }
                emptyTitle={locale === "ar" ? "لا يوجد طابور تخطيط" : "No planning queue"}
                items={planningCases}
                renderItem={(caseItem) => {
                  const handoverDisplay = getPersistedHandoverWorkspaceDisplay(locale, caseItem);

                  if (!handoverDisplay) {
                    return null;
                  }

                  return (
                    <Link key={caseItem.caseId} className="case-link-card" href={`/${locale}/handover/${handoverDisplay.handoverCaseId}`}>
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
            {canAccessHandoverManagerWorkspace && canManageExecution ? (
              <Panel title={locale === "ar" ? "طابور تنفيذ التسليم" : "Handover execution queue"}>
                <StatefulStack
                  emptySummary={
                    locale === "ar"
                      ? "لا توجد حالياً سجلات داخل مرحلة تنفيذ التسليم."
                      : "No live handover records are currently inside the execution surface."
                  }
                  emptyTitle={locale === "ar" ? "لا يوجد طابور تنفيذ" : "No execution queue"}
                  items={executionCases}
                  renderItem={(caseItem) => {
                    const handoverDisplay = getPersistedHandoverWorkspaceDisplay(locale, caseItem);

                    if (!handoverDisplay) {
                      return null;
                    }

                    return (
                      <Link key={caseItem.caseId} className="case-link-card" href={`/${locale}/handover/${handoverDisplay.handoverCaseId}`}>
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

            {canAccessHandoverManagerWorkspace && canManageClosure ? (
              <Panel title={locale === "ar" ? "طابور إغلاق التسليم" : "Handover closure queue"}>
                <StatefulStack
                  emptySummary={
                    locale === "ar"
                      ? "لا توجد حالياً سجلات مكتملة داخل حدود الإغلاق الإداري."
                      : "No completed handover records are currently inside the administrative closure queue."
                  }
                  emptyTitle={locale === "ar" ? "لا يوجد طابور إغلاق" : "No closure queue"}
                  items={closureCases}
                  renderItem={(caseItem) => {
                    const handoverDisplay = getPersistedHandoverWorkspaceDisplay(locale, caseItem);

                    if (!handoverDisplay) {
                      return null;
                    }

                    return (
                      <Link key={caseItem.caseId} className="case-link-card" href={`/${locale}/handover/${handoverDisplay.handoverCaseId}`}>
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

          <Panel title={messages.leads.title}>
            <StatefulStack
              emptySummary={messages.states.emptyCasesSummary}
              emptyTitle={messages.states.emptyCasesTitle}
              items={persistedCases}
              renderItem={(caseItem) => {
                const handoverDisplay = getPersistedHandoverWorkspaceDisplay(locale, caseItem);

                return (
                  <Link key={caseItem.caseId} className="case-link-card" href={`/${locale}/leads/${caseItem.caseId}`}>
                    <div>
                      <p className="case-link-meta">{buildCaseReferenceCode(caseItem.caseId)}</p>
                      <h3>{caseItem.customerName}</h3>
                      <p>{caseItem.nextAction}</p>
                    </div>
                    <div className="case-link-aside">
                      <StatusBadge tone={caseItem.followUpStatus === "attention" ? "critical" : "success"}>
                        {getPersistedFollowUpLabel(locale, caseItem)}
                      </StatusBadge>
                      <StatusBadge>{getPersistedAutomationLabel(locale, caseItem.automationStatus)}</StatusBadge>
                      {caseItem.openInterventionsCount > 0 ? (
                        <StatusBadge tone="warning">{getInterventionCountLabel(locale, caseItem.openInterventionsCount)}</StatusBadge>
                      ) : null}
                      {handoverDisplay ? <StatusBadge tone={handoverDisplay.statusTone}>{handoverDisplay.statusLabel}</StatusBadge> : null}
                      <StatusBadge>{getPersistedCaseStageLabel(locale, caseItem.stage)}</StatusBadge>
                    </div>
                  </Link>
                );
              }}
            />
          </Panel>
        </>
      ) : (
        <div className="two-column-grid">
          <Panel title={locale === "ar" ? "حالات تحتاج تدخل المدير" : "Cases that need manager action"}>
            <StatefulStack
              emptySummary={messages.states.emptyAlertsSummary}
              emptyTitle={messages.states.emptyAlertsTitle}
              items={demoDataset.managerAlerts}
              renderItem={(alert) => (
                <article key={alert.id} className={`alert-row alert-row-${alert.severity}`}>
                  <div className="row-between">
                    <h3>{getLocalizedText(alert.title, locale)}</h3>
                    <StatusBadge tone={alert.severity === "high" ? "critical" : "warning"}>{alert.severity}</StatusBadge>
                  </div>
                  <p>{getLocalizedText(alert.detail, locale)}</p>
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
                <Link key={caseItem.id} className="case-link-card" href={`/${locale}/leads/${caseItem.id}`}>
                  <div>
                    <p className="case-link-meta">{caseItem.referenceCode}</p>
                    <h3>{caseItem.customerName}</h3>
                    <p>{getLocalizedText(caseItem.nextAction, locale)}</p>
                  </div>
                  <StatusBadge>{caseItem.owner}</StatusBadge>
                </Link>
              )}
            />
          </Panel>
        </div>
      )}
    </div>
  );
}
