import Link from "next/link";

import { canOperatorRoleAccessWorkspace } from "@real-estate-ai/contracts";
import { demoDataset, getLocalizedText, type SupportedLocale } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";
import {
  caseMetaClassName,
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  EmptyState,
  inlineLinkClassName,
  pageStackClassName,
  Panel,
  stackTightClassName,
  StatusBadge,
  statusRowWrapClassName,
  tableLinkClassName,
  tableLinkMetaClassName,
  tableLinkTitleClassName,
  WorkflowPanelBody
} from "@real-estate-ai/ui";

import { ScreenIntro } from "@/components/screen-intro";
import { WorkspaceAccessPanel } from "@/components/workspace-access-panel";
import {
  buildCaseReferenceCode,
  formatCaseLastChange,
  formatDueAt,
  formatLatestManagerFollowUpSavedAt,
  formatLatestHumanReplySentAt,
  getPersistedAutomationLabel,
  getPersistedAutomationHoldReasonLabel,
  getPersistedCaseStageLabel,
  getPersistedFollowUpLabel,
  getPersistedHandoverWorkspaceDisplay,
  getPersistedLatestManagerFollowUpLabel,
  getPersistedLatestManagerFollowUpNote,
  getPersistedLatestHumanReplyEscalationLabel,
  getPersistedLatestHumanReplyLabel,
  getPersistedLatestHumanReplyOwnershipLabel,
  getPersistedQaReviewDisplay
} from "@/lib/persisted-case-presenters";
import { formatDateTime } from "@/lib/format";
import { getInterventionCountLabel } from "@/lib/live-copy";
import { tryListPersistedCases } from "@/lib/live-api";
import { getPreferredOperatorSurfacePath } from "@/lib/operator-role";
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
      <div className={pageStackClassName}>
        <ScreenIntro badge={messages.app.phaseLabel} summary={messages.leads.summary} title={messages.leads.title} />
        <WorkspaceAccessPanel
          actionHref={getPreferredOperatorSurfacePath(locale, currentOperatorRole)}
          actionLabel={messages.common.backToCommandCenter}
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
    <div className={pageStackClassName}>
      <ScreenIntro badge={messages.app.phaseLabel} summary={messages.leads.summary} title={messages.leads.title} />

      <Panel title={messages.leads.title}>
        {persistedCases.length === 0 && demoDataset.cases.length === 0 ? (
          <EmptyState summary={messages.states.emptyCasesSummary} title={messages.states.emptyCasesTitle} />
        ) : persistedCases.length > 0 ? (
          <WorkflowPanelBody
            note={
              locale === "ar"
                ? "يعرض هذا الجدول الحالات الحية من مسار البيانات المحلي الموثوق مع نفس القواعد المشتركة الخاصة بالأسطح والتحكم والتجاوب."
                : "This table shows live cases from the trusted local data path using the same shared surface, control, and responsive table contract."
            }
            summary={
              locale === "ar"
                ? "مساحة المبيعات الآن تستخدم نفس طبقة الجداول والبطاقات المحسنة المشتركة مع بقية السطوح التشغيلية حتى تظل القراءة والفرز والمتابعة متسقة عبر التطبيق."
                : "The sales workspace now uses the same upgraded shared table and surface layer as the rest of the operational routes, keeping scanability and follow-up context consistent across the app."
            }
          >
            <div className={statusRowWrapClassName}>
              <StatusBadge>{locale === "ar" ? `${persistedCases.length} حالات حيّة` : `${persistedCases.length} live cases`}</StatusBadge>
              <StatusBadge>{locale === "ar" ? "مصدر موثوق" : "Trusted source"}</StatusBadge>
              {canAccessHandoverWorkspace ? (
                <StatusBadge>{locale === "ar" ? "مسار التسليم ظاهر" : "Handover visible"}</StatusBadge>
              ) : null}
            </div>
            <DataTable testId="lead-table-wrapper">
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell>{columnLabels.lead}</DataTableHeaderCell>
                  <DataTableHeaderCell>{columnLabels.stage}</DataTableHeaderCell>
                  <DataTableHeaderCell>{columnLabels.handover}</DataTableHeaderCell>
                  <DataTableHeaderCell>{columnLabels.currentOwner}</DataTableHeaderCell>
                  <DataTableHeaderCell>{columnLabels.nextAction}</DataTableHeaderCell>
                  <DataTableHeaderCell>{columnLabels.dueAt}</DataTableHeaderCell>
                  <DataTableHeaderCell>{columnLabels.lastChange}</DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {persistedCases.map((caseItem) =>
                  renderPersistedLeadRow({
                    canAccessHandoverWorkspace,
                    caseItem,
                    columnLabels,
                    locale,
                    messages
                  })
                )}
              </tbody>
            </DataTable>
          </WorkflowPanelBody>
        ) : (
          <WorkflowPanelBody
            note={
              locale === "ar"
                ? "لا توجد حالات حيّة بعد، لذلك يعود المسار مؤقتاً إلى بيانات العرض التجريبية مع نفس قشرة الجدول المشتركة."
                : "No live cases are available yet, so the route falls back to seeded demo data through the same shared table shell."
            }
          >
            <div className={statusRowWrapClassName}>
              <StatusBadge>{locale === "ar" ? `${demoDataset.cases.length} حالات تجريبية` : `${demoDataset.cases.length} demo cases`}</StatusBadge>
              <StatusBadge>{locale === "ar" ? "عرض احتياطي" : "Fallback view"}</StatusBadge>
            </div>
            <DataTable testId="lead-table-wrapper">
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell>{columnLabels.lead}</DataTableHeaderCell>
                  <DataTableHeaderCell>{columnLabels.stage}</DataTableHeaderCell>
                  <DataTableHeaderCell>{columnLabels.handover}</DataTableHeaderCell>
                  <DataTableHeaderCell>{columnLabels.currentOwner}</DataTableHeaderCell>
                  <DataTableHeaderCell>{columnLabels.nextAction}</DataTableHeaderCell>
                  <DataTableHeaderCell>{columnLabels.lastChange}</DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <tbody>
                {demoDataset.cases.map((caseItem) => renderDemoLeadRow({ caseItem, columnLabels, locale, messages }))}
              </tbody>
            </DataTable>
          </WorkflowPanelBody>
        )}
      </Panel>
    </div>
  );
}

function renderPersistedLeadRow(props: {
  canAccessHandoverWorkspace: boolean;
  caseItem: Awaited<ReturnType<typeof tryListPersistedCases>>[number];
  columnLabels: Record<"currentOwner" | "dueAt" | "handover" | "lastChange" | "lead" | "nextAction" | "stage", string>;
  locale: SupportedLocale;
  messages: ReturnType<typeof getMessages>;
}) {
  const { canAccessHandoverWorkspace, caseItem, columnLabels, locale, messages } = props;
  const handoverDisplay = getPersistedHandoverWorkspaceDisplay(locale, caseItem);
  const qaReviewDisplay = getPersistedQaReviewDisplay(locale, caseItem);
  const automationHoldReasonLabel = getPersistedAutomationHoldReasonLabel(locale, caseItem.automationHoldReason);
  const latestManagerFollowUpLabel = getPersistedLatestManagerFollowUpLabel(locale, caseItem.latestManagerFollowUp);
  const latestManagerFollowUpSavedAt = formatLatestManagerFollowUpSavedAt(caseItem.latestManagerFollowUp, locale);
  const latestManagerFollowUpNote = getPersistedLatestManagerFollowUpNote(locale, caseItem.latestManagerFollowUp);
  const latestHumanReplyLabel = getPersistedLatestHumanReplyLabel(locale, caseItem.latestHumanReply);
  const latestHumanReplySentAt = formatLatestHumanReplySentAt(caseItem.latestHumanReply, locale);
  const latestHumanReplyOwnershipLabel = getPersistedLatestHumanReplyOwnershipLabel(locale, caseItem.ownerName, caseItem.latestHumanReply);
  const latestHumanReplyEscalationLabel = getPersistedLatestHumanReplyEscalationLabel(
    locale,
    caseItem.ownerName,
    caseItem.latestHumanReply,
    caseItem.followUpStatus,
    caseItem.openInterventionsCount
  );

  return (
    <tr key={caseItem.caseId}>
      <DataTableCell columnLabel={columnLabels.lead}>
        <Link className={tableLinkClassName} href={`/${locale}/leads/${caseItem.caseId}`}>
          <strong className={tableLinkTitleClassName}>{caseItem.customerName}</strong>
          <span className={tableLinkMetaClassName}>{buildCaseReferenceCode(caseItem.caseId)}</span>
        </Link>
      </DataTableCell>
      <DataTableCell columnLabel={columnLabels.stage}>
        <StatusBadge>{getPersistedCaseStageLabel(locale, caseItem.stage)}</StatusBadge>
      </DataTableCell>
      <DataTableCell columnLabel={columnLabels.handover}>
        {handoverDisplay ? (
          <div className={stackTightClassName}>
            <div className={statusRowWrapClassName}>
              <StatusBadge tone={handoverDisplay.statusTone}>{handoverDisplay.statusLabel}</StatusBadge>
              <StatusBadge>{handoverDisplay.surfaceLabel}</StatusBadge>
            </div>
            {canAccessHandoverWorkspace ? (
              <Link className={inlineLinkClassName} href={`/${locale}/handover/${handoverDisplay.handoverCaseId}`}>
                {messages.common.openHandover}
              </Link>
            ) : null}
          </div>
        ) : (
          <span className={caseMetaClassName}>{messages.common.notActive}</span>
        )}
      </DataTableCell>
      <DataTableCell columnLabel={columnLabels.currentOwner}>{caseItem.ownerName}</DataTableCell>
      <DataTableCell columnLabel={columnLabels.nextAction}>
        <div className={stackTightClassName}>
          <span>{caseItem.nextAction}</span>
          {caseItem.latestHumanReply ? (
            <div className={stackTightClassName}>
              <span className={caseMetaClassName}>
                {latestHumanReplyLabel}
                {" · "}
                {caseItem.latestHumanReply.sentByName}
                {" · "}
                {latestHumanReplySentAt}
              </span>
              {latestHumanReplyOwnershipLabel ? <span className={caseMetaClassName}>{latestHumanReplyOwnershipLabel}</span> : null}
              {latestHumanReplyEscalationLabel ? <span className={caseMetaClassName}>{latestHumanReplyEscalationLabel}</span> : null}
            </div>
          ) : null}
          {caseItem.latestManagerFollowUp && latestManagerFollowUpLabel && latestManagerFollowUpSavedAt ? (
            <div className={stackTightClassName}>
              <span className={caseMetaClassName}>
                {latestManagerFollowUpLabel}
                {" · "}
                {caseItem.latestManagerFollowUp.ownerName}
                {" · "}
                {latestManagerFollowUpSavedAt}
              </span>
              {latestManagerFollowUpNote ? <span className={caseMetaClassName}>{latestManagerFollowUpNote}</span> : null}
            </div>
          ) : null}
          <div className={statusRowWrapClassName}>
            <StatusBadge>{getPersistedAutomationLabel(locale, caseItem.automationStatus)}</StatusBadge>
            {automationHoldReasonLabel ? <StatusBadge tone="warning">{automationHoldReasonLabel}</StatusBadge> : null}
            {caseItem.openInterventionsCount > 0 ? (
              <StatusBadge tone="warning">{getInterventionCountLabel(locale, caseItem.openInterventionsCount)}</StatusBadge>
            ) : null}
            {qaReviewDisplay ? <StatusBadge tone={qaReviewDisplay.statusTone}>{qaReviewDisplay.statusLabel}</StatusBadge> : null}
          </div>
          <StatusBadge tone={caseItem.followUpStatus === "attention" ? "critical" : "success"}>
            {getPersistedFollowUpLabel(locale, caseItem)}
          </StatusBadge>
        </div>
      </DataTableCell>
      <DataTableCell columnLabel={columnLabels.dueAt}>{formatDueAt(caseItem, locale)}</DataTableCell>
      <DataTableCell columnLabel={columnLabels.lastChange}>{formatCaseLastChange(caseItem, locale)}</DataTableCell>
    </tr>
  );
}

function renderDemoLeadRow(props: {
  caseItem: (typeof demoDataset.cases)[number];
  columnLabels: Record<"currentOwner" | "dueAt" | "handover" | "lastChange" | "lead" | "nextAction" | "stage", string>;
  locale: SupportedLocale;
  messages: ReturnType<typeof getMessages>;
}) {
  const { caseItem, columnLabels, locale, messages } = props;

  return (
    <tr key={caseItem.id}>
      <DataTableCell columnLabel={columnLabels.lead}>
        <Link className={tableLinkClassName} href={`/${locale}/leads/${caseItem.id}`}>
          <strong className={tableLinkTitleClassName}>{caseItem.customerName}</strong>
          <span className={tableLinkMetaClassName}>{getLocalizedText(caseItem.projectName, locale)}</span>
        </Link>
      </DataTableCell>
      <DataTableCell columnLabel={columnLabels.stage}>
        <StatusBadge>{getLocalizedText(caseItem.stage, locale)}</StatusBadge>
      </DataTableCell>
      <DataTableCell columnLabel={columnLabels.handover}>
        <span className={caseMetaClassName}>{messages.common.notActive}</span>
      </DataTableCell>
      <DataTableCell columnLabel={columnLabels.currentOwner}>{caseItem.owner}</DataTableCell>
      <DataTableCell columnLabel={columnLabels.nextAction}>{getLocalizedText(caseItem.nextAction, locale)}</DataTableCell>
      <DataTableCell columnLabel={columnLabels.lastChange}>{formatDateTime(caseItem.lastMeaningfulChange, locale)}</DataTableCell>
    </tr>
  );
}
