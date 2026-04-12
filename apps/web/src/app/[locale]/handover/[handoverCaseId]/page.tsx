import { notFound } from "next/navigation";

import { getDemoHandoverCaseById, getLocalizedText, type SupportedLocale } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";
import { Panel, StatusBadge } from "@real-estate-ai/ui";

import { HandoverAppointmentConfirmationForm } from "@/components/handover-appointment-confirmation-form";
import { HandoverAppointmentForm } from "@/components/handover-appointment-form";
import { HandoverBlockerForm } from "@/components/handover-blocker-form";
import { HandoverBlockerStatusForm } from "@/components/handover-blocker-status-form";
import { HandoverCompletionForm } from "@/components/handover-completion-form";
import { HandoverCustomerUpdateApprovalForm } from "@/components/handover-customer-update-approval-form";
import { HandoverCustomerUpdateDeliveryForm } from "@/components/handover-customer-update-delivery-form";
import { HandoverCustomerUpdateDispatchReadyForm } from "@/components/handover-customer-update-dispatch-ready-form";
import { HandoverExecutionStartForm } from "@/components/handover-execution-start-form";
import { HandoverMilestoneForm } from "@/components/handover-milestone-form";
import { HandoverPostCompletionFollowUpForm } from "@/components/handover-post-completion-follow-up-form";
import { HandoverPostCompletionFollowUpResolutionForm } from "@/components/handover-post-completion-follow-up-resolution-form";
import { HandoverReviewForm } from "@/components/handover-review-form";
import { HandoverTaskStatusForm } from "@/components/handover-task-status-form";
import { PlaceholderNotice } from "@/components/placeholder-notice";
import { ScreenIntro } from "@/components/screen-intro";
import { StatefulStack } from "@/components/stateful-stack";
import { TimelinePanel } from "@/components/timeline-panel";
import {
  buildCaseReferenceCode,
  getPersistedHandoverAppointmentDisplay,
  getPersistedHandoverBlockerDisplay,
  getPersistedHandoverCustomerUpdateDisplay,
  getPersistedHandoverMilestoneDisplay,
  getPersistedHandoverPostCompletionFollowUpDisplay,
  getPersistedHandoverReviewDisplay,
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
    const appointmentItem = getPersistedHandoverAppointmentDisplay(locale, persistedHandoverCase);
    const blockerItems = getPersistedHandoverBlockerDisplay(locale, persistedHandoverCase);
    const openBlockerItems = blockerItems.filter((blocker) => blocker.status !== "resolved");
    const taskItems = getPersistedHandoverDisplay(locale, persistedHandoverCase);
    const milestoneItems = getPersistedHandoverMilestoneDisplay(locale, persistedHandoverCase);
    const customerUpdateItems = getPersistedHandoverCustomerUpdateDisplay(locale, persistedHandoverCase);
    const reviewItem = getPersistedHandoverReviewDisplay(locale, persistedHandoverCase);
    const postCompletionFollowUpItem = getPersistedHandoverPostCompletionFollowUpDisplay(locale, persistedHandoverCase);
    const appointmentHoldMilestone = milestoneItems.find((milestone) => milestone.type === "handover_appointment_hold");
    const appointmentConfirmationUpdate = customerUpdateItems.find((customerUpdate) => customerUpdate.type === "appointment_confirmation");

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
                <StatusBadge
                  tone={
                    persistedHandoverCase.status === "customer_scheduling_ready" ||
                    persistedHandoverCase.status === "scheduled" ||
                    persistedHandoverCase.status === "completed"
                      ? "success"
                      : persistedHandoverCase.status === "in_progress"
                        ? "warning"
                      : "warning"
                  }
                >
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
          <Panel title={locale === "ar" ? "تنفيذ يوم التسليم" : "Handover-day execution"}>
            <div className="page-stack">
              <p className="panel-summary">
                {locale === "ar"
                  ? "ابدأ حالة التنفيذ الحي بعد اكتمال الجدولة الداخلية وتصفية العوائق المفتوحة، من دون تشغيل أي تكامل خارجي."
                  : "Start the live execution state after internal scheduling is complete and open blockers are cleared, without triggering any external integration."}
              </p>
              <div className="detail-grid">
                <div>
                  <p className="detail-label">{locale === "ar" ? "بدأ التنفيذ" : "Execution started"}</p>
                  <p>
                    {persistedHandoverCase.executionStartedAt
                      ? new Date(persistedHandoverCase.executionStartedAt).toLocaleString(locale)
                      : locale === "ar"
                        ? "لم يبدأ بعد"
                        : "Not started yet"}
                  </p>
                </div>
                <div>
                  <p className="detail-label">{locale === "ar" ? "العوائق المفتوحة" : "Open blockers"}</p>
                  <p>{openBlockerItems.length}</p>
                </div>
              </div>
              <HandoverExecutionStartForm
                handoverCaseId={persistedHandoverCase.handoverCaseId}
                locale={locale}
                returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                status={persistedHandoverCase.status}
              />
            </div>
          </Panel>

          <Panel title={locale === "ar" ? "الإتمام المضبوط" : "Controlled completion"}>
            <div className="page-stack">
              <p className="panel-summary">
                {locale === "ar"
                  ? "أغلق يوم التسليم بملخص إتمام واضح بعد انتهاء التنفيذ ومعالجة العوائق المفتوحة."
                  : "Close the handover day with a clear completion summary after execution finishes and open blockers are resolved."}
              </p>
              <div className="detail-grid">
                <div>
                  <p className="detail-label">{locale === "ar" ? "اكتمل في" : "Completed at"}</p>
                  <p>
                    {persistedHandoverCase.completedAt
                      ? new Date(persistedHandoverCase.completedAt).toLocaleString(locale)
                      : locale === "ar"
                        ? "بانتظار الإتمام"
                        : "Waiting for completion"}
                  </p>
                </div>
                <div>
                  <p className="detail-label">{locale === "ar" ? "ملخص الإتمام الحالي" : "Current completion summary"}</p>
                  <p>
                    {persistedHandoverCase.completionSummary ??
                      (locale === "ar" ? "لم يتم حفظ ملخص الإتمام بعد." : "No completion summary has been saved yet.")}
                  </p>
                </div>
              </div>
              <HandoverCompletionForm
                completionSummary={persistedHandoverCase.completionSummary ?? ""}
                handoverCaseId={persistedHandoverCase.handoverCaseId}
                locale={locale}
                returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                status={persistedHandoverCase.status}
              />
            </div>
          </Panel>
        </div>

        <div className="two-column-grid">
          <Panel title={locale === "ar" ? "مراجعة ما بعد التسليم" : "Post-handover review"}>
            <div className="page-stack">
              <p className="panel-summary">
                {locale === "ar"
                  ? "بعد اكتمال يوم التسليم، احفظ مراجعة المدير وحدد ما إذا كانت الحالة تحتاج إلى متابعة ما بعد التسليم."
                  : "After the handover day is complete, save the manager review and decide whether the case needs post-handover follow-up."}
              </p>
              {reviewItem ? (
                <div className="detail-grid">
                  <div>
                    <p className="detail-label">{locale === "ar" ? "النتيجة الحالية" : "Current outcome"}</p>
                    <p>{reviewItem.outcomeLabel}</p>
                  </div>
                  <div>
                    <p className="detail-label">{locale === "ar" ? "آخر تحديث" : "Last updated"}</p>
                    <p>{reviewItem.updatedAt}</p>
                  </div>
                </div>
              ) : null}
              <HandoverReviewForm
                handoverCaseId={persistedHandoverCase.handoverCaseId}
                locale={locale}
                outcome={reviewItem?.outcome ?? "accepted"}
                returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                summary={reviewItem?.summary ?? ""}
              />
            </div>
          </Panel>

          <Panel title={locale === "ar" ? "متابعة ما بعد التسليم" : "Post-handover follow-up"}>
            <div className="page-stack">
              <p className="panel-summary">
                {locale === "ar"
                  ? "استخدم هذا الحد إذا كشفت المراجعة المكتملة عن عنصر متابعة لاحق بعد إغلاق يوم التسليم."
                  : "Use this boundary when the completed review reveals an aftercare item that must stay visible after handover closure."}
              </p>
              {postCompletionFollowUpItem ? (
                <div className="page-stack">
                  <div className="detail-grid">
                    <div>
                      <p className="detail-label">{locale === "ar" ? "الحالة" : "Status"}</p>
                      <StatusBadge tone={postCompletionFollowUpItem.statusTone}>{postCompletionFollowUpItem.statusLabel}</StatusBadge>
                    </div>
                    <div>
                      <p className="detail-label">{locale === "ar" ? "الموعد" : "Due time"}</p>
                      <p>{postCompletionFollowUpItem.dueAt}</p>
                    </div>
                    <div>
                      <p className="detail-label">{locale === "ar" ? "المالك" : "Owner"}</p>
                      <p>{postCompletionFollowUpItem.ownerName}</p>
                    </div>
                    <div>
                      <p className="detail-label">{locale === "ar" ? "آخر تحديث" : "Last updated"}</p>
                      <p>{postCompletionFollowUpItem.updatedAt}</p>
                    </div>
                  </div>
                  <p>{postCompletionFollowUpItem.summary}</p>
                  {postCompletionFollowUpItem.resolutionSummary ? (
                    <div className="detail-grid">
                      <div>
                        <p className="detail-label">{locale === "ar" ? "ملخص الحل" : "Resolution summary"}</p>
                        <p>{postCompletionFollowUpItem.resolutionSummary}</p>
                      </div>
                      <div>
                        <p className="detail-label">{locale === "ar" ? "أُغلقت في" : "Resolved at"}</p>
                        <p>{postCompletionFollowUpItem.resolvedAt}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {reviewItem?.outcome === "follow_up_required" ? (
                <>
                  <HandoverPostCompletionFollowUpForm
                    dueAt={postCompletionFollowUpItem?.dueAtInput ?? ""}
                    handoverCaseId={persistedHandoverCase.handoverCaseId}
                    locale={locale}
                    ownerName={postCompletionFollowUpItem?.ownerName ?? persistedHandoverCase.ownerName}
                    returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                    status={postCompletionFollowUpItem?.status ?? "open"}
                    summary={postCompletionFollowUpItem?.summary ?? ""}
                  />
                  {postCompletionFollowUpItem ? (
                    <HandoverPostCompletionFollowUpResolutionForm
                      followUpId={postCompletionFollowUpItem.followUpId}
                      handoverCaseId={persistedHandoverCase.handoverCaseId}
                      locale={locale}
                      resolutionSummary={postCompletionFollowUpItem.resolutionSummary ?? ""}
                      returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                      status={postCompletionFollowUpItem.status}
                    />
                  ) : null}
                </>
              ) : (
                <p className="panel-summary">
                  {locale === "ar"
                    ? "تظهر متابعة ما بعد التسليم بعد حفظ مراجعة تطلب المتابعة على سجل مكتمل."
                    : "Post-handover follow-up opens after a saved review that requires follow-up on a completed record."}
                </p>
              )}
            </div>
          </Panel>
        </div>

        <div className="two-column-grid">
          <Panel title={locale === "ar" ? "الموعد الداخلي" : "Internal appointment"}>
            {appointmentItem ? (
              <div className="page-stack">
                <div className="detail-grid">
                  <div>
                    <p className="detail-label">{locale === "ar" ? "الموقع" : "Location"}</p>
                    <p>{appointmentItem.location}</p>
                  </div>
                  <div>
                    <p className="detail-label">{locale === "ar" ? "الحالة" : "Status"}</p>
                    <StatusBadge tone={appointmentItem.statusTone}>{appointmentItem.statusLabel}</StatusBadge>
                  </div>
                  <div>
                    <p className="detail-label">{locale === "ar" ? "منسق التسليم" : "Coordinator"}</p>
                    <p>{appointmentItem.coordinatorName}</p>
                  </div>
                  <div>
                    <p className="detail-label">{locale === "ar" ? "الموعد" : "Scheduled time"}</p>
                    <p>{appointmentItem.scheduledAt}</p>
                  </div>
                </div>
                <HandoverAppointmentForm
                  coordinatorName={appointmentItem.coordinatorName}
                  handoverCaseId={persistedHandoverCase.handoverCaseId}
                  locale={locale}
                  location={appointmentItem.location}
                  returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                  scheduledAt={appointmentItem.scheduledAtInput}
                />
              </div>
            ) : (
              <div className="page-stack">
                <p className="panel-summary">
                  {locale === "ar"
                    ? "لن يتم حفظ الموعد الداخلي حتى تصبح حدود الجدولة معتمدة ويصبح السجل جاهزاً للجدولة."
                    : "The internal appointment stays unavailable until the scheduling boundary is approved and the record is ready for scheduling."}
                </p>
                <HandoverAppointmentForm
                  coordinatorName={persistedHandoverCase.ownerName}
                  handoverCaseId={persistedHandoverCase.handoverCaseId}
                  locale={locale}
                  location=""
                  returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                  scheduledAt={appointmentHoldMilestone?.targetAtInput ?? ""}
                />
              </div>
            )}
          </Panel>

          <Panel title={locale === "ar" ? "تأكيد الموعد" : "Appointment confirmation"}>
            {appointmentItem ? (
              <div className="page-stack">
                <p className="panel-summary">
                  {locale === "ar"
                    ? "يتطلب هذا التأكيد اعتماد حد تأكيد الموعد أولاً، لكنه لا يطلق أي رسالة حقيقية إلى العميل."
                    : "This confirmation requires the appointment-confirmation boundary first, and still does not trigger any real outbound message."}
                </p>
                <HandoverAppointmentConfirmationForm
                  appointmentId={appointmentItem.appointmentId}
                  handoverCaseId={persistedHandoverCase.handoverCaseId}
                  locale={locale}
                  returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                  status={appointmentItem.status}
                />
              </div>
            ) : (
              <p className="panel-summary">
                {locale === "ar"
                  ? "سيظهر تأكيد الموعد بعد حفظ موعد داخلي فعلي."
                  : "Appointment confirmation appears after a real internal appointment has been planned."}
              </p>
            )}
          </Panel>
        </div>

        <div className="two-column-grid">
          <Panel title={locale === "ar" ? "تجهيز الإرسال" : "Delivery preparation"}>
            {appointmentConfirmationUpdate ? (
              <div className="page-stack">
                <p className="panel-summary">
                  {locale === "ar"
                    ? "هذه الخطوة تحفظ صياغة التأكيد المعتمدة كرسالة جاهزة للإرسال لاحقاً من دون تشغيل أي قناة فعلية."
                    : "This stores the approved confirmation as outbound-ready content for later dispatch without triggering any live channel."}
                </p>
                {appointmentConfirmationUpdate.deliverySummary ? (
                  <div className="detail-grid">
                    <div>
                      <p className="detail-label">{locale === "ar" ? "ملخص التجهيز" : "Delivery summary"}</p>
                      <p>{appointmentConfirmationUpdate.deliverySummary}</p>
                    </div>
                    <div>
                      <p className="detail-label">{locale === "ar" ? "تم التجهيز في" : "Prepared at"}</p>
                      <p>{appointmentConfirmationUpdate.deliveryPreparedAt}</p>
                    </div>
                  </div>
                ) : null}
                <HandoverCustomerUpdateDeliveryForm
                  customerUpdateId={appointmentConfirmationUpdate.customerUpdateId}
                  deliverySummary={appointmentConfirmationUpdate.deliverySummary ?? ""}
                  handoverCaseId={persistedHandoverCase.handoverCaseId}
                  locale={locale}
                  returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                  status={appointmentConfirmationUpdate.status}
                />
              </div>
            ) : (
              <p className="panel-summary">
                {locale === "ar"
                  ? "سيظهر تجهيز الإرسال بعد إنشاء حد تأكيد الموعد في هذا السجل."
                  : "Delivery preparation appears after the appointment-confirmation boundary exists on this record."}
              </p>
            )}
          </Panel>

          <Panel title={locale === "ar" ? "جاهزية الإرسال" : "Dispatch readiness"}>
            {appointmentConfirmationUpdate ? (
              <div className="page-stack">
                <p className="panel-summary">
                  {locale === "ar"
                    ? "هذه الخطوة لا ترسل أي رسالة، لكنها ترفع سجل التسليم إلى حالة مجدولة داخلياً بمجرد اكتمال التجهيز."
                    : "This still does not send anything, but it promotes the handover record into an internally scheduled state once preparation is complete."}
                </p>
                {appointmentConfirmationUpdate.dispatchReadyAt ? (
                  <div className="detail-grid">
                    <div>
                      <p className="detail-label">{locale === "ar" ? "جاهز للإرسال منذ" : "Ready since"}</p>
                      <p>{appointmentConfirmationUpdate.dispatchReadyAt}</p>
                    </div>
                    <div>
                      <p className="detail-label">{locale === "ar" ? "حالة الحد" : "Boundary status"}</p>
                      <StatusBadge tone={appointmentConfirmationUpdate.statusTone}>{appointmentConfirmationUpdate.statusLabel}</StatusBadge>
                    </div>
                  </div>
                ) : null}
                <HandoverCustomerUpdateDispatchReadyForm
                  customerUpdateId={appointmentConfirmationUpdate.customerUpdateId}
                  handoverCaseId={persistedHandoverCase.handoverCaseId}
                  locale={locale}
                  returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                  status={appointmentConfirmationUpdate.status}
                />
              </div>
            ) : (
              <p className="panel-summary">
                {locale === "ar"
                  ? "ستظهر جاهزية الإرسال بعد تجهيز حد تأكيد الموعد."
                  : "Dispatch readiness appears after the appointment-confirmation update is prepared."}
              </p>
            )}
          </Panel>
        </div>

        <div className="two-column-grid">
          <Panel title={locale === "ar" ? "عوائق التنفيذ" : "Execution blockers"}>
            <div className="page-stack">
              <p className="panel-summary">
                {locale === "ar"
                  ? "بعد وصول السجل إلى حالة مجدولة، استخدم هذا القسم لإبقاء الـ snag والعوائق الميدانية مرئية قبل التنفيذ الفعلي."
                  : "Once the record reaches the scheduled boundary, use this section to keep snags and field blockers visible before live execution."}
              </p>
              <StatefulStack
                emptySummary={
                  locale === "ar"
                    ? "لا توجد عوائق تنفيذ مفتوحة أو مسجلة حتى الآن."
                    : "No execution blockers have been logged on this scheduled handover record yet."
                }
                emptyTitle={locale === "ar" ? "لا توجد عوائق" : "No blockers"}
                items={blockerItems}
                renderItem={(blocker) => (
                  <article key={blocker.blockerId} className="document-row document-row-live">
                    <div>
                      <div className="row-between">
                        <h3>{blocker.title}</h3>
                        <div className="row-between">
                          <StatusBadge tone={blocker.severityTone}>{blocker.severityLabel}</StatusBadge>
                          <StatusBadge tone={blocker.statusTone}>{blocker.statusLabel}</StatusBadge>
                        </div>
                      </div>
                      <p>{blocker.typeDetail}</p>
                      <p>{blocker.summary}</p>
                      <p className="case-link-meta">{blocker.ownerName}</p>
                      <p className="case-link-meta">{blocker.dueAt}</p>
                    </div>
                    <div className="document-row-actions">
                      <HandoverBlockerStatusForm
                        blockerId={blocker.blockerId}
                        dueAt={blocker.dueAtInput}
                        handoverCaseId={persistedHandoverCase.handoverCaseId}
                        locale={locale}
                        ownerName={blocker.ownerName}
                        returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                        severity={blocker.severity}
                        status={blocker.status}
                        summary={blocker.summary}
                      />
                    </div>
                  </article>
                )}
              />
              {persistedHandoverCase.status === "scheduled" ? (
                <HandoverBlockerForm
                  dueAt={appointmentItem?.scheduledAtInput ?? ""}
                  handoverCaseId={persistedHandoverCase.handoverCaseId}
                  locale={locale}
                  ownerName={persistedHandoverCase.ownerName}
                  returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                />
              ) : (
                <p className="panel-summary">
                  {locale === "ar"
                    ? "سيفتح تسجيل عوائق التنفيذ بعد انتقال السجل إلى حالة التسليم المجدولة."
                    : "Execution blocker logging opens after the handover record reaches the scheduled boundary."}
                </p>
              )}
            </div>
          </Panel>

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
