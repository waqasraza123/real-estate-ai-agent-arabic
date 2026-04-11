import Link from "next/link";

import { demoDataset, getLocalizedText, type SupportedLocale } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";
import { EmptyState, Panel, StatusBadge } from "@real-estate-ai/ui";

import { ScreenIntro } from "@/components/screen-intro";

interface PageProps {
  params: Promise<{ locale: SupportedLocale }>;
}

export default async function LeadsPage(props: PageProps) {
  const { locale } = await props.params;
  const messages = getMessages(locale);
  const columnLabels = {
    currentOwner: messages.common.currentOwner,
    lastChange: messages.common.lastChange,
    lead: messages.common.lead,
    nextAction: messages.common.nextAction,
    stage: messages.common.stage
  };

  return (
    <div className="page-stack">
      <ScreenIntro badge={messages.app.phaseLabel} summary={messages.leads.summary} title={messages.leads.title} />

      <Panel title={messages.leads.title}>
        {demoDataset.cases.length === 0 ? (
          <EmptyState summary={messages.states.emptyCasesSummary} title={messages.states.emptyCasesTitle} />
        ) : (
          <div className="lead-table-wrapper" data-testid="lead-table-wrapper">
            <table className="lead-table">
              <thead>
                <tr>
                  <th>{columnLabels.lead}</th>
                  <th>{columnLabels.stage}</th>
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
                    <td data-column-label={columnLabels.currentOwner}>{caseItem.owner}</td>
                    <td data-column-label={columnLabels.nextAction}>{getLocalizedText(caseItem.nextAction, locale)}</td>
                    <td data-column-label={columnLabels.lastChange}>
                      {new Date(caseItem.lastMeaningfulChange).toLocaleString(locale)}
                    </td>
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
