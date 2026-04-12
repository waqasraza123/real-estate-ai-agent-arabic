import Link from "next/link";

import { demoDataset, getLocalizedText, type SupportedLocale } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";
import { EmptyState, Panel, StatusBadge } from "@real-estate-ai/ui";

import { ScreenIntro } from "@/components/screen-intro";
import {
  buildCaseReferenceCode,
  formatCaseLastChange,
  formatDueAt,
  getPersistedAutomationLabel,
  getPersistedCaseStageLabel,
  getPersistedFollowUpLabel,
  getPersistedHandoverClosureDisplay
} from "@/lib/persisted-case-presenters";
import { getInterventionCountLabel } from "@/lib/live-copy";
import { tryListPersistedCases } from "@/lib/live-api";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: SupportedLocale }>;
}

export default async function LeadsPage(props: PageProps) {
  const { locale } = await props.params;
  const messages = getMessages(locale);
  const persistedCases = await tryListPersistedCases();
  const columnLabels = {
    closure: locale === "ar" ? "إغلاق التسليم" : "Handover closure",
    currentOwner: messages.common.currentOwner,
    dueAt: locale === "ar" ? "موعد الخطوة التالية" : "Next action due",
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
                  <th>{columnLabels.closure}</th>
                  <th>{columnLabels.currentOwner}</th>
                  <th>{columnLabels.nextAction}</th>
                  <th>{columnLabels.dueAt}</th>
                  <th>{columnLabels.lastChange}</th>
                </tr>
              </thead>
              <tbody>
                {persistedCases.map((caseItem) => (
                  (() => {
                    const closureDisplay = getPersistedHandoverClosureDisplay(locale, caseItem);

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
                        <td data-column-label={columnLabels.closure}>
                          {closureDisplay ? (
                            <div className="stack-tight">
                              <StatusBadge tone={closureDisplay.statusTone}>{closureDisplay.statusLabel}</StatusBadge>
                              <Link className="inline-link" href={`/${locale}/handover/${closureDisplay.handoverCaseId}`}>
                                {locale === "ar" ? "فتح سجل التسليم" : "Open handover"}
                              </Link>
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
                  <th>{columnLabels.closure}</th>
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
                    <td data-column-label={columnLabels.closure}>
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
