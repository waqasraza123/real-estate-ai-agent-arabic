import Link from "next/link";

import { canOperatorRoleAccessWorkspace } from "@real-estate-ai/contracts";
import { demoDataset, getLocalizedText, type SupportedLocale } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";
import { EmptyState, Panel, StatusBadge } from "@real-estate-ai/ui";

import { ScreenIntro } from "@/components/screen-intro";
import { WorkspaceAccessPanel } from "@/components/workspace-access-panel";
import {
  buildCaseReferenceCode,
  formatCaseLastChange,
  formatDueAt,
  getPersistedAutomationLabel,
  getPersistedCaseStageLabel,
  getPersistedFollowUpLabel,
  getPersistedHandoverWorkspaceDisplay
} from "@/lib/persisted-case-presenters";
import { getInterventionCountLabel } from "@/lib/live-copy";
import { tryListPersistedCases } from "@/lib/live-api";
import { getCurrentOperatorRole } from "@/lib/operator-session";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: SupportedLocale }>;
}

export default async function LeadsPage(props: PageProps) {
  const { locale } = await props.params;
  const messages = getMessages(locale);
  const currentOperatorRole = await getCurrentOperatorRole();
  const canAccessHandoverWorkspace = canOperatorRoleAccessWorkspace("handover", currentOperatorRole);

  if (!canOperatorRoleAccessWorkspace("sales", currentOperatorRole)) {
    return (
      <div className="page-stack">
        <ScreenIntro badge={messages.app.phaseLabel} summary={messages.leads.summary} title={messages.leads.title} />
        <WorkspaceAccessPanel
          actionHref={`/${locale}/manager`}
          actionLabel={locale === "ar" ? "العودة إلى مركز القيادة" : "Return to the command center"}
          locale={locale}
          operatorRole={currentOperatorRole}
          summary={
            locale === "ar"
              ? "هذه الصفحة مخصصة لمساحة المبيعات في وضع الجلسة المحلي الموثوق. استخدم مسارات التسليم أو مركز القيادة المناسب لدورك الحالي."
              : "This route is reserved for the sales workspace in trusted local session mode. Use the handover workspace or the command center that matches your current role."
          }
          title={locale === "ar" ? "وصول المبيعات مطلوب" : "Sales workspace required"}
          workspace="sales"
        />
      </div>
    );
  }

  const persistedCases = await tryListPersistedCases();
  const columnLabels = {
    currentOwner: messages.common.currentOwner,
    dueAt: locale === "ar" ? "موعد الخطوة التالية" : "Next action due",
    handover: locale === "ar" ? "مسار التسليم" : "Handover workflow",
    lastChange: messages.common.lastChange,
    lead: messages.common.lead,
    nextAction: messages.common.nextAction,
    stage: messages.common.stage
  };

  return (
    <div className="page-stack">
      <ScreenIntro badge={messages.app.phaseLabel} summary={messages.leads.summary} title={messages.leads.title} />

      <Panel title={messages.leads.title}>
        {persistedCases.length === 0 && demoDataset.cases.length === 0 ? (
          <EmptyState summary={messages.states.emptyCasesSummary} title={messages.states.emptyCasesTitle} />
        ) : persistedCases.length > 0 ? (
          <div className="lead-table-wrapper" data-testid="lead-table-wrapper">
            <table className="lead-table">
              <thead>
                <tr>
                  <th>{columnLabels.lead}</th>
                  <th>{columnLabels.stage}</th>
                  <th>{columnLabels.handover}</th>
                  <th>{columnLabels.currentOwner}</th>
                  <th>{columnLabels.nextAction}</th>
                  <th>{columnLabels.dueAt}</th>
                  <th>{columnLabels.lastChange}</th>
                </tr>
              </thead>
              <tbody>
                {persistedCases.map((caseItem) => (
                  (() => {
                    const handoverDisplay = getPersistedHandoverWorkspaceDisplay(locale, caseItem);

                    return (
                      <tr key={caseItem.caseId}>
                        <td data-column-label={columnLabels.lead}>
                          <Link className="table-link" href={`/${locale}/leads/${caseItem.caseId}`}>
                            <strong>{caseItem.customerName}</strong>
                            <span>{buildCaseReferenceCode(caseItem.caseId)}</span>
                          </Link>
                        </td>
                        <td data-column-label={columnLabels.stage}>
                          <StatusBadge>{getPersistedCaseStageLabel(locale, caseItem.stage)}</StatusBadge>
                        </td>
                        <td data-column-label={columnLabels.handover}>
                          {handoverDisplay ? (
                            <div className="stack-tight">
                              <div className="status-row-wrap">
                                <StatusBadge tone={handoverDisplay.statusTone}>{handoverDisplay.statusLabel}</StatusBadge>
                                <StatusBadge>{handoverDisplay.surfaceLabel}</StatusBadge>
                              </div>
                              {canAccessHandoverWorkspace ? (
                                <Link className="inline-link" href={`/${locale}/handover/${handoverDisplay.handoverCaseId}`}>
                                  {locale === "ar" ? "فتح سجل التسليم" : "Open handover"}
                                </Link>
                              ) : null}
                            </div>
                          ) : (
                            <span className="case-link-meta">{locale === "ar" ? "غير متاح" : "Not active"}</span>
                          )}
                        </td>
                        <td data-column-label={columnLabels.currentOwner}>{caseItem.ownerName}</td>
                        <td data-column-label={columnLabels.nextAction}>
                          <div className="stack-tight">
                            <span>{caseItem.nextAction}</span>
                            <div className="status-row-wrap">
                              <StatusBadge>{getPersistedAutomationLabel(locale, caseItem.automationStatus)}</StatusBadge>
                              {caseItem.openInterventionsCount > 0 ? (
                                <StatusBadge tone="warning">{getInterventionCountLabel(locale, caseItem.openInterventionsCount)}</StatusBadge>
                              ) : null}
                            </div>
                            <StatusBadge tone={caseItem.followUpStatus === "attention" ? "critical" : "success"}>
                              {getPersistedFollowUpLabel(locale, caseItem)}
                            </StatusBadge>
                          </div>
                        </td>
                        <td data-column-label={columnLabels.dueAt}>{formatDueAt(caseItem, locale)}</td>
                        <td data-column-label={columnLabels.lastChange}>{formatCaseLastChange(caseItem, locale)}</td>
                      </tr>
                    );
                  })()
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="lead-table-wrapper" data-testid="lead-table-wrapper">
            <table className="lead-table">
              <thead>
                <tr>
                  <th>{columnLabels.lead}</th>
                  <th>{columnLabels.stage}</th>
                  <th>{columnLabels.handover}</th>
                  <th>{columnLabels.currentOwner}</th>
                  <th>{columnLabels.nextAction}</th>
                  <th>{columnLabels.lastChange}</th>
                </tr>
              </thead>
              <tbody>
                {demoDataset.cases.map((caseItem) => (
                  <tr key={caseItem.id}>
                    <td data-column-label={columnLabels.lead}>
                      <Link className="table-link" href={`/${locale}/leads/${caseItem.id}`}>
                        <strong>{caseItem.customerName}</strong>
                        <span>{getLocalizedText(caseItem.projectName, locale)}</span>
                      </Link>
                    </td>
                    <td data-column-label={columnLabels.stage}>
                      <StatusBadge>{getLocalizedText(caseItem.stage, locale)}</StatusBadge>
                    </td>
                    <td data-column-label={columnLabels.handover}>
                      <span className="case-link-meta">{locale === "ar" ? "غير متاح" : "Not active"}</span>
                    </td>
                    <td data-column-label={columnLabels.currentOwner}>{caseItem.owner}</td>
                    <td data-column-label={columnLabels.nextAction}>{getLocalizedText(caseItem.nextAction, locale)}</td>
                    <td data-column-label={columnLabels.lastChange}>{new Date(caseItem.lastMeaningfulChange).toLocaleString(locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
