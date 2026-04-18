import Link from "next/link";
import { notFound } from "next/navigation";

import { canOperatorRoleAccessWorkspace, canOperatorRolePerform } from "@real-estate-ai/contracts";
import { getDemoCaseById, getLocalizedText, type SupportedLocale } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";
import {
  caseMetaClassName,
  HighlightNotice,
  inlineLinkClassName,
  pageStackClassName,
  Panel,
  StatusBadge,
  twoColumnGridClassName,
  WorkflowCard,
  WorkflowListItem,
  WorkflowPanelBody
} from "@real-estate-ai/ui";

import { CaseRouteTabs } from "@/components/case-route-tabs";
import { DocumentStatusForm } from "@/components/document-status-form";
import { HandoverIntakeForm } from "@/components/handover-intake-form";
import { PlaceholderNotice } from "@/components/placeholder-notice";
import { ScreenIntro } from "@/components/screen-intro";
import { StatefulStack } from "@/components/stateful-stack";
import { WorkspaceAccessPanel } from "@/components/workspace-access-panel";
import {
  buildCaseReferenceCode,
  getPersistedDocumentDisplay,
  getPersistedHandoverStatusLabel
} from "@/lib/persisted-case-presenters";
import { getHandoverIntakeCopy } from "@/lib/live-copy";
import { getCurrentOperatorRole } from "@/lib/operator-session";
import { getOperatorPermissionGuardNote, getPreferredOperatorSurfacePath } from "@/lib/operator-role";
import { tryGetPersistedCaseDetail } from "@/lib/live-api";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: SupportedLocale; caseId: string }>;
}

export default async function DocumentsPage(props: PageProps) {
  const { locale, caseId } = await props.params;
  const messages = getMessages(locale);
  const currentOperatorRole = await getCurrentOperatorRole();

  if (!canOperatorRoleAccessWorkspace("sales", currentOperatorRole)) {
    return (
      <div className={pageStackClassName}>
        <ScreenIntro badge={messages.documents.title} summary={messages.documents.summary} title={messages.documents.title} />
        <WorkspaceAccessPanel
          actionHref={getPreferredOperatorSurfacePath(locale, currentOperatorRole)}
          actionLabel={locale === "ar" ? "العودة إلى السطح المتاح" : "Return to an allowed surface"}
          locale={locale}
          operatorRole={currentOperatorRole}
          summary={
            locale === "ar"
              ? "مركز المستندات الحي ما زال ضمن مساحة المبيعات المحلية، حتى عندما يقود إلى بدء مسار التسليم."
              : "The live document center remains inside the local sales workspace even when it leads into handover initiation."
          }
          title={locale === "ar" ? "مركز المستندات مقصور على المبيعات" : "Document center is limited to sales"}
          workspace="sales"
        />
      </div>
    );
  }

  const persistedCase = await tryGetPersistedCaseDetail(caseId);

  if (persistedCase) {
    const documentItems = getPersistedDocumentDisplay(locale, persistedCase);
    const handoverIntakeCopy = getHandoverIntakeCopy(locale);
    const documentsAccepted = persistedCase.documentRequests.every((documentRequest) => documentRequest.status === "accepted");
    const canAccessHandoverWorkspace = canOperatorRoleAccessWorkspace("handover", currentOperatorRole);
    const canManageHandoverIntake = canOperatorRolePerform("manage_handover_intake", currentOperatorRole);
    const handoverIntakeGuardNote = getOperatorPermissionGuardNote(locale, "manage_handover_intake");

    return (
      <div className={pageStackClassName}>
        <ScreenIntro badge={buildCaseReferenceCode(persistedCase.caseId)} summary={messages.documents.summary} title={messages.documents.title} />
        <CaseRouteTabs caseId={persistedCase.caseId} handoverCaseId={persistedCase.handoverCase?.handoverCaseId} locale={locale} />

        <div className={twoColumnGridClassName}>
          <Panel title={messages.common.documents}>
            <WorkflowPanelBody className="mt-4">
              <StatefulStack
                emptySummary={messages.states.emptyDocumentsSummary}
                emptyTitle={messages.states.emptyDocumentsTitle}
                items={documentItems}
                renderItem={(documentItem) => (
                  <WorkflowListItem
                    key={documentItem.documentRequestId}
                    badges={<StatusBadge tone={documentItem.statusTone}>{documentItem.statusLabel}</StatusBadge>}
                    meta={<p className={caseMetaClassName}>{documentItem.updatedAt}</p>}
                    summary={documentItem.detail}
                    title={documentItem.label}
                    actions={
                      <DocumentStatusForm
                        caseId={persistedCase.caseId}
                        documentRequestId={documentItem.documentRequestId}
                        locale={locale}
                        returnPath={`/${locale}/leads/${persistedCase.caseId}/documents`}
                        status={documentItem.value}
                      />
                    }
                  />
                )}
              />
            </WorkflowPanelBody>
          </Panel>

          <Panel title={handoverIntakeCopy.title}>
            {persistedCase.handoverCase ? (
              <WorkflowPanelBody className="mt-4">
                <WorkflowCard
                  actions={
                    canAccessHandoverWorkspace ? (
                      <Link className={inlineLinkClassName} href={`/${locale}/handover/${persistedCase.handoverCase.handoverCaseId}`}>
                        {locale === "ar" ? "فتح سجل التسليم" : "Open handover record"}
                      </Link>
                    ) : null
                  }
                  badges={<StatusBadge tone="success">{getPersistedHandoverStatusLabel(locale, persistedCase.handoverCase)}</StatusBadge>}
                  meta={<p className={caseMetaClassName}>{persistedCase.handoverCase.ownerName}</p>}
                  summary={handoverIntakeCopy.helperReady}
                  title={locale === "ar" ? "سجل التسليم مرتبط" : "Linked handover record"}
                  tone="success"
                />
              </WorkflowPanelBody>
            ) : documentsAccepted ? (
              <WorkflowPanelBody className="mt-4" note={handoverIntakeGuardNote} summary={handoverIntakeCopy.helperReady}>
                <HandoverIntakeForm
                  canManage={canManageHandoverIntake}
                  caseId={persistedCase.caseId}
                  defaultOwnerName={persistedCase.ownerName}
                  disabledLabel={locale === "ar" ? "يتطلب مدير التسليم" : "Handover manager required"}
                  locale={locale}
                  returnPath={`/${locale}/leads/${persistedCase.caseId}/documents`}
                />
              </WorkflowPanelBody>
            ) : (
              <WorkflowPanelBody className="mt-4">
                <WorkflowCard
                  summary={handoverIntakeCopy.helperLocked}
                  title={locale === "ar" ? "اعتماد التسليم ما زال مقفلاً" : "Handover approval is still locked"}
                  tone="warning"
                >
                  <HighlightNotice tone="warning">
                    {locale === "ar"
                      ? "يبقى هذا المسار مقفلاً حتى تصل كل المستندات المطلوبة إلى حالة مقبولة."
                      : "This route stays locked until every required document reaches an accepted state."}
                  </HighlightNotice>
                </WorkflowCard>
              </WorkflowPanelBody>
            )}
          </Panel>
        </div>
      </div>
    );
  }

  const caseItem = getDemoCaseById(caseId);

  if (!caseItem) {
    notFound();
  }

  return (
    <div className={pageStackClassName}>
      <ScreenIntro badge={caseItem.referenceCode} summary={messages.documents.summary} title={messages.documents.title} />
      <CaseRouteTabs caseId={caseItem.id} handoverCaseId={caseItem.handoverCaseId} locale={locale} />

      <Panel title={messages.common.documents}>
        <WorkflowPanelBody className="mt-4">
          <StatefulStack
            emptySummary={messages.states.emptyDocumentsSummary}
            emptyTitle={messages.states.emptyDocumentsTitle}
            items={caseItem.documents}
            renderItem={(documentItem) => (
              <WorkflowListItem
                key={documentItem.id}
                badges={
                  <StatusBadge tone={documentItem.status === "missing" ? "critical" : documentItem.status === "review" ? "warning" : "success"}>
                    {documentItem.status}
                  </StatusBadge>
                }
                summary={getLocalizedText(documentItem.detail, locale)}
                title={getLocalizedText(documentItem.name, locale)}
              />
            )}
          />
        </WorkflowPanelBody>
      </Panel>

      <PlaceholderNotice locale={locale} />
    </div>
  );
}
