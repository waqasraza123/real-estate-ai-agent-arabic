import { notFound } from "next/navigation";

import { getDemoHandoverCaseById, getLocalizedText, type SupportedLocale } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";
import { Panel, StatusBadge } from "@real-estate-ai/ui";

import { HandoverCustomerUpdateApprovalForm } from "@/components/handover-customer-update-approval-form";
import { HandoverMilestoneForm } from "@/components/handover-milestone-form";
import { HandoverTaskStatusForm } from "@/components/handover-task-status-form";
import { PlaceholderNotice } from "@/components/placeholder-notice";
import { ScreenIntro } from "@/components/screen-intro";
import { StatefulStack } from "@/components/stateful-stack";
import { TimelinePanel } from "@/components/timeline-panel";
import {
  buildCaseReferenceCode,
  getPersistedHandoverCustomerUpdateDisplay,
  getPersistedHandoverMilestoneDisplay,
  buildPersistedHandoverTimeline,
  getPersistedHandoverDisplay,
  getPersistedHandoverStatusLabel
} from "@/lib/persisted-case-presenters";
import { tryGetPersistedHandoverCaseDetail } from "@/lib/live-api";

interface PageProps {
  params: Promise<{ locale: SupportedLocale; handoverCaseId: string }>;
}

export default async function HandoverPage(props: PageProps) {
  const { locale, handoverCaseId } = await props.params;
  const messages = getMessages(locale);
  const persistedHandoverCase = await tryGetPersistedHandoverCaseDetail(handoverCaseId);

  if (persistedHandoverCase) {
    const taskItems = getPersistedHandoverDisplay(locale, persistedHandoverCase);
    const milestoneItems = getPersistedHandoverMilestoneDisplay(locale, persistedHandoverCase);
    const customerUpdateItems = getPersistedHandoverCustomerUpdateDisplay(locale, persistedHandoverCase);

    return (
      <div className="page-stack">
        <ScreenIntro
          badge={buildCaseReferenceCode(persistedHandoverCase.handoverCaseId)}
          summary={persistedHandoverCase.readinessSummary}
          title={messages.handover.title}
        />

        <div className="two-column-grid">
          <Panel title={persistedHandoverCase.customerName}>
            <div className="detail-grid">
              <div>
                <p className="detail-label">{messages.common.currentOwner}</p>
                <p>{persistedHandoverCase.ownerName}</p>
              </div>
              <div>
                <p className="detail-label">{messages.common.stage}</p>
                <StatusBadge tone={persistedHandoverCase.status === "customer_scheduling_ready" ? "success" : "warning"}>
                  {getPersistedHandoverStatusLabel(locale, persistedHandoverCase)}
                </StatusBadge>
              </div>
              <div>
                <p className="detail-label">{locale === "ar" ? "المشروع" : "Project"}</p>
                <p>{persistedHandoverCase.projectInterest}</p>
              </div>
              <div>
                <p className="detail-label">{locale === "ar" ? "لغة العميل" : "Customer language"}</p>
                <p>{persistedHandoverCase.preferredLocale === "ar" ? "العربية" : "English"}</p>
              </div>
            </div>
          </Panel>

          <Panel title={locale === "ar" ? "ملخص الجاهزية" : "Readiness summary"}>
            <p className="panel-summary">{persistedHandoverCase.readinessSummary}</p>
          </Panel>
        </div>

        <Panel title={messages.common.handoverReadiness}>
          <StatefulStack
            emptySummary={messages.states.emptyMilestonesSummary}
            emptyTitle={messages.states.emptyMilestonesTitle}
            items={taskItems}
            renderItem={(task) => (
              <article key={task.taskId} className="document-row document-row-live">
                <div>
                  <h3>{task.title}</h3>
                  <p>{task.summary}</p>
                  <p className="case-link-meta">{task.ownerName}</p>
                  <p className="case-link-meta">{task.dueAt}</p>
                </div>
                <div className="document-row-actions">
                  <StatusBadge tone={task.statusTone}>{task.statusLabel}</StatusBadge>
                  <HandoverTaskStatusForm
                    handoverCaseId={persistedHandoverCase.handoverCaseId}
                    handoverTaskId={task.taskId}
                    locale={locale}
                    returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                    status={task.status}
                  />
                </div>
              </article>
            )}
          />
        </Panel>

        <div className="two-column-grid">
          <Panel title={locale === "ar" ? "خطة المحطات" : "Milestone plan"}>
            <StatefulStack
              emptySummary={locale === "ar" ? "لم يتم إنشاء أي محطات بعد." : "No handover milestones have been planned yet."}
              emptyTitle={locale === "ar" ? "لا توجد محطات" : "No milestones"}
              items={milestoneItems}
              renderItem={(milestone) => (
                <article key={milestone.milestoneId} className="document-row document-row-live">
                  <div>
                    <div className="row-between">
                      <h3>{milestone.title}</h3>
                      <StatusBadge tone={milestone.statusTone}>{milestone.statusLabel}</StatusBadge>
                    </div>
                    <p>{milestone.summary}</p>
                    <p className="case-link-meta">{milestone.ownerName}</p>
                    <p className="case-link-meta">{milestone.targetAt}</p>
                  </div>
                  <div className="document-row-actions">
                    <HandoverMilestoneForm
                      handoverCaseId={persistedHandoverCase.handoverCaseId}
                      locale={locale}
                      milestoneId={milestone.milestoneId}
                      ownerName={milestone.ownerName}
                      returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                      status={milestone.status}
                      targetAt={milestone.targetAtInput}
                    />
                  </div>
                </article>
              )}
            />
          </Panel>

          <Panel title={locale === "ar" ? "حدود تواصل العميل" : "Customer-update boundaries"}>
            <StatefulStack
              emptySummary={
                locale === "ar"
                  ? "لن تظهر حدود التحديث إلا بعد إنشاء سجل التسليم الحي."
                  : "Update boundaries only appear after the live handover record exists."
              }
              emptyTitle={locale === "ar" ? "لا توجد حدود" : "No update boundaries"}
              items={customerUpdateItems}
              renderItem={(customerUpdate) => (
                <article key={customerUpdate.customerUpdateId} className="document-row document-row-live">
                  <div>
                    <div className="row-between">
                      <h3>{customerUpdate.title}</h3>
                      <StatusBadge tone={customerUpdate.statusTone}>{customerUpdate.statusLabel}</StatusBadge>
                    </div>
                    <p>{customerUpdate.summary}</p>
                    <p className="case-link-meta">{customerUpdate.updatedAt}</p>
                  </div>
                  <div className="document-row-actions">
                    <HandoverCustomerUpdateApprovalForm
                      customerUpdateId={customerUpdate.customerUpdateId}
                      handoverCaseId={persistedHandoverCase.handoverCaseId}
                      locale={locale}
                      returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                      status={customerUpdate.status}
                    />
                  </div>
                </article>
              )}
            />
          </Panel>
        </div>

        <TimelinePanel events={buildPersistedHandoverTimeline(persistedHandoverCase)} locale={locale} />
      </div>
    );
  }

  const handoverCase = getDemoHandoverCaseById(handoverCaseId);

  if (!handoverCase) {
    notFound();
  }

  return (
    <div className="page-stack">
      <ScreenIntro
        badge={messages.common.handoverReadiness}
        summary={getLocalizedText(handoverCase.readinessLabel, locale)}
        title={messages.handover.title}
      />

      <Panel title={handoverCase.customerName}>
        <StatefulStack
          emptySummary={messages.states.emptyMilestonesSummary}
          emptyTitle={messages.states.emptyMilestonesTitle}
          items={handoverCase.milestones}
          renderItem={(milestone) => (
            <article key={milestone.id} className="milestone-card">
              <div className="row-between">
                <div>
                  <h3>{getLocalizedText(milestone.title, locale)}</h3>
                  <p>{getLocalizedText(milestone.detail, locale)}</p>
                </div>
                <StatusBadge tone={milestone.status === "blocked" ? "critical" : milestone.status === "ready" ? "success" : "warning"}>
                  {milestone.status}
                </StatusBadge>
              </div>
              <div className="milestone-meta">
                <span>{milestone.owner}</span>
                <span>{milestone.dueDate}</span>
              </div>
            </article>
          )}
        />
      </Panel>

      <PlaceholderNotice locale={locale} />
    </div>
  );
}
