import Link from "next/link";

import { demoDataset, getLocalizedText, type SupportedLocale } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";
import { Panel, StatusBadge } from "@real-estate-ai/ui";

import { ScreenIntro } from "@/components/screen-intro";
import { StatefulStack } from "@/components/stateful-stack";
import {
  buildCaseReferenceCode,
  formatCaseLastChange,
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

export default async function ManagerPage(props: PageProps) {
  const { locale } = await props.params;
  const messages = getMessages(locale);
  const persistedCases = await tryListPersistedCases();
  const closureCases = persistedCases
    .filter((caseItem) => caseItem.handoverClosure)
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
  const archivedCases = closureCases.filter((caseItem) => caseItem.handoverClosure?.status === "archived");
  const readyToArchiveCases = closureCases.filter((caseItem) => caseItem.handoverClosure?.status === "ready_to_archive");
  const heldClosureCases = closureCases.filter((caseItem) => caseItem.handoverClosure?.status === "held");
  const attentionCases = persistedCases.filter(
    (caseItem) =>
      caseItem.followUpStatus === "attention" ||
      caseItem.openInterventionsCount > 0 ||
      (caseItem.handoverClosure !== null && caseItem.handoverClosure.status !== "archived")
  );

  return (
    <div className="page-stack">
      <ScreenIntro badge={messages.app.shellNote} summary={messages.manager.summary} title={messages.manager.title} />

      {persistedCases.length > 0 ? (
        <>
          <div className="metric-grid">
            <article className="metric-tile metric-tile-ocean">
              <p className="metric-label">{locale === "ar" ? "حالات تحتاج إجراء" : "Cases needing action"}</p>
              <p className="metric-value">{attentionCases.length}</p>
              <p className="metric-detail">
                {locale === "ar"
                  ? "تشمل تدخلات المتابعة وحالات الإغلاق الإداري المفتوحة."
                  : "Includes follow-up interventions and open administrative closure work."}
              </p>
            </article>
            <article className="metric-tile metric-tile-mint">
              <p className="metric-label">{locale === "ar" ? "جاهزة للأرشفة" : "Ready to archive"}</p>
              <p className="metric-value">{readyToArchiveCases.length}</p>
              <p className="metric-detail">
                {locale === "ar"
                  ? "سجلات مكتملة اجتازت المراجعة الإدارية وتنتظر خطوة الأرشفة اليدوية."
                  : "Completed records that passed closure review and are waiting for the final archive step."}
              </p>
            </article>
            <article className="metric-tile metric-tile-sand">
              <p className="metric-label">{locale === "ar" ? "تعليق إداري" : "Admin holds"}</p>
              <p className="metric-value">{heldClosureCases.length}</p>
              <p className="metric-detail">
                {locale === "ar"
                  ? "سجلات مكتملة ما زالت معلقة بقرار إداري واضح قبل الأرشفة."
                  : "Completed records still held behind an explicit administrative closure decision."}
              </p>
            </article>
            <article className="metric-tile metric-tile-rose">
              <p className="metric-label">{locale === "ar" ? "مؤرشفة" : "Archived"}</p>
              <p className="metric-value">{archivedCases.length}</p>
              <p className="metric-detail">
                {locale === "ar"
                  ? "سجلات مكتملة عبرت حدود الإغلاق الإداري ووصلت إلى الحالة المؤرشفة."
                  : "Completed records that moved all the way through the admin closure boundary into archived status."}
              </p>
            </article>
          </div>

          <div className="two-column-grid">
            <Panel title={locale === "ar" ? "حالات تحتاج تدخل المدير" : "Cases that need manager action"}>
              <StatefulStack
                emptySummary={messages.states.emptyAlertsSummary}
                emptyTitle={messages.states.emptyAlertsTitle}
                items={attentionCases}
                renderItem={(caseItem) => {
                  const closureDisplay = getPersistedHandoverClosureDisplay(locale, caseItem);

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
                          {closureDisplay ? <StatusBadge tone={closureDisplay.statusTone}>{closureDisplay.statusLabel}</StatusBadge> : null}
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
                        {closureDisplay ? (
                          <Link className="inline-link" href={`/${locale}/handover/${closureDisplay.handoverCaseId}`}>
                            {locale === "ar" ? "فتح سجل التسليم" : "Open handover"}
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  );
                }}
              />
            </Panel>

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
                  const closureDisplay = getPersistedHandoverClosureDisplay(locale, caseItem);

                  if (!closureDisplay) {
                    return null;
                  }

                  return (
                    <Link key={caseItem.caseId} className="case-link-card" href={`/${locale}/handover/${closureDisplay.handoverCaseId}`}>
                      <div>
                        <p className="case-link-meta">{buildCaseReferenceCode(caseItem.caseId)}</p>
                        <h3>{caseItem.customerName}</h3>
                        <p>{caseItem.nextAction}</p>
                        <p className="case-link-meta">{closureDisplay.updatedAt}</p>
                      </div>
                      <div className="case-link-aside">
                        <StatusBadge tone={closureDisplay.statusTone}>{closureDisplay.statusLabel}</StatusBadge>
                        <StatusBadge>{getPersistedCaseStageLabel(locale, caseItem.stage)}</StatusBadge>
                      </div>
                    </Link>
                  );
                }}
              />
            </Panel>
          </div>

          <Panel title={messages.leads.title}>
            <StatefulStack
              emptySummary={messages.states.emptyCasesSummary}
              emptyTitle={messages.states.emptyCasesTitle}
              items={persistedCases}
              renderItem={(caseItem) => {
                const closureDisplay = getPersistedHandoverClosureDisplay(locale, caseItem);

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
                      {closureDisplay ? <StatusBadge tone={closureDisplay.statusTone}>{closureDisplay.statusLabel}</StatusBadge> : null}
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
