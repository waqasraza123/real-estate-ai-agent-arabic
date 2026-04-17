import { notFound } from "next/navigation";

import { canOperatorRoleAccessWorkspace, canOperatorRolePerform, type SupportedLocale } from "@real-estate-ai/contracts";
import { getDemoHandoverCaseById, getLocalizedText } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";
import {
  caseMetaClassName,
  DetailGrid,
  DetailItem,
  documentRowActionsClassName,
  documentRowClassName,
  fieldNoteClassName,
  pageStackClassName,
  panelSummaryClassName,
  Panel,
  rowBetweenClassName,
  StatusBadge,
  statusRowWrapClassName,
  twoColumnGridClassName,
  WorkflowPanelBody,
} from "@real-estate-ai/ui";

import { HandoverAppointmentConfirmationForm } from "@/components/handover-appointment-confirmation-form";
import { HandoverAppointmentForm } from "@/components/handover-appointment-form";
import { HandoverArchiveReviewForm } from "@/components/handover-archive-review-form";
import { HandoverArchiveStatusForm } from "@/components/handover-archive-status-form";
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
import { WorkspaceAccessPanel } from "@/components/workspace-access-panel";
import { formatDateTime } from "@/lib/format";
import {
  getOperatorPermissionGuardNote,
  getPreferredOperatorSurfacePath,
} from "@/lib/operator-role";
import { getCurrentOperatorRole } from "@/lib/operator-session";
import {
  buildCaseReferenceCode,
  getPersistedHandoverAppointmentDisplay,
  getPersistedHandoverArchiveReviewDisplay,
  getPersistedHandoverArchiveStatusDisplay,
  getPersistedHandoverBlockerDisplay,
  getPersistedHandoverCustomerUpdateQaReviewDisplay,
  getPersistedHandoverCustomerUpdateDisplay,
  getPersistedHandoverMilestoneDisplay,
  getPersistedHandoverPostCompletionFollowUpDisplay,
  getPersistedHandoverReviewDisplay,
  buildPersistedHandoverTimeline,
  getPersistedHandoverDisplay,
  getPersistedHandoverStatusLabel
} from "@/lib/persisted-case-presenters";
import { tryGetPersistedCaseDetail, tryGetPersistedHandoverCaseDetail } from "@/lib/live-api";

interface PageProps {
  params: Promise<{ locale: SupportedLocale; handoverCaseId: string }>;
}

export default async function HandoverPage(props: PageProps) {
  const { locale, handoverCaseId } = await props.params;
  const messages = getMessages(locale);
  const currentOperatorRole = await getCurrentOperatorRole();

  if (!canOperatorRoleAccessWorkspace("handover", currentOperatorRole)) {
    return (
      <div className={pageStackClassName}>
        <ScreenIntro badge={messages.handover.title} summary={messages.handover.summary} title={messages.handover.title} />
        <WorkspaceAccessPanel
          actionHref={getPreferredOperatorSurfacePath(locale, currentOperatorRole)}
          actionLabel={locale === "ar" ? "فتح السطح المتاح" : "Open an allowed surface"}
          locale={locale}
          operatorRole={currentOperatorRole}
          summary={
            locale === "ar"
              ? "سجل التسليم الحي متاح فقط لمساحة التسليم المحلية الموثوقة. إذا كنت تحتاج متابعة الحالة التجارية فارجع إلى مساحة المبيعات."
              : "The live handover record is available only inside the trusted local handover workspace. Return to the sales surface if you need the commercial case context instead."
          }
          title={locale === "ar" ? "مساحة التسليم مطلوبة" : "Handover workspace required"}
          workspace="handover"
        />
      </div>
    );
  }

  const persistedHandoverCase = await tryGetPersistedHandoverCaseDetail(handoverCaseId);

  if (persistedHandoverCase) {
    const persistedCaseDetail = await tryGetPersistedCaseDetail(persistedHandoverCase.caseId);
    const appointmentItem = getPersistedHandoverAppointmentDisplay(locale, persistedHandoverCase);
    const blockerItems = getPersistedHandoverBlockerDisplay(locale, persistedHandoverCase);
    const openBlockerItems = blockerItems.filter((blocker) => blocker.status !== "resolved");
    const taskItems = getPersistedHandoverDisplay(locale, persistedHandoverCase);
    const milestoneItems = getPersistedHandoverMilestoneDisplay(locale, persistedHandoverCase);
    const customerUpdateItems = getPersistedHandoverCustomerUpdateDisplay(locale, persistedHandoverCase);
    const activeCustomerUpdateQaReview = persistedCaseDetail
      ? getPersistedHandoverCustomerUpdateQaReviewDisplay(locale, persistedCaseDetail)
      : null;
    const reviewItem = getPersistedHandoverReviewDisplay(locale, persistedHandoverCase);
    const postCompletionFollowUpItem = getPersistedHandoverPostCompletionFollowUpDisplay(locale, persistedHandoverCase);
    const archiveReviewItem = getPersistedHandoverArchiveReviewDisplay(locale, persistedHandoverCase);
    const archiveStatusItem = getPersistedHandoverArchiveStatusDisplay(locale, persistedHandoverCase);
    const appointmentHoldMilestone = milestoneItems.find((milestone) => milestone.type === "handover_appointment_hold");
    const appointmentConfirmationUpdate = customerUpdateItems.find((customerUpdate) => customerUpdate.type === "appointment_confirmation");
    const appointmentConfirmationQaReview =
      activeCustomerUpdateQaReview?.customerUpdateId === appointmentConfirmationUpdate?.customerUpdateId
        ? activeCustomerUpdateQaReview
        : null;
    const canManageArchiveBoundary =
      persistedHandoverCase.status === "completed" &&
      Boolean(reviewItem) &&
      (reviewItem?.outcome !== "follow_up_required" || postCompletionFollowUpItem?.status === "resolved");
    const archiveStatusOptions =
      archiveReviewItem?.outcome === "hold_for_review"
        ? (["held"] as const)
        : archiveStatusItem?.status === "ready"
          ? (["ready", "archived"] as const)
          : archiveStatusItem?.status === "archived"
            ? (["archived"] as const)
            : (["ready"] as const);
    const canManageExecution = canOperatorRolePerform("manage_handover_execution", currentOperatorRole);
    const canManageBlockers = canOperatorRolePerform("manage_handover_blockers", currentOperatorRole);
    const canManageHandoverTasks = canOperatorRolePerform("manage_handover_tasks", currentOperatorRole);
    const canManageMilestones = canOperatorRolePerform("manage_handover_milestones", currentOperatorRole);
    const canManageAppointments = canOperatorRolePerform("manage_handover_appointments", currentOperatorRole);
    const canManageCustomerUpdates = canOperatorRolePerform("manage_handover_customer_updates", currentOperatorRole);
    const executionGuardNote = getOperatorPermissionGuardNote(locale, "manage_handover_execution");
    const blockerGuardNote = getOperatorPermissionGuardNote(locale, "manage_handover_blockers");
    const taskGuardNote = getOperatorPermissionGuardNote(locale, "manage_handover_tasks");
    const milestoneGuardNote = getOperatorPermissionGuardNote(locale, "manage_handover_milestones");
    const appointmentGuardNote = getOperatorPermissionGuardNote(locale, "manage_handover_appointments");
    const customerUpdateGuardNote = getOperatorPermissionGuardNote(locale, "manage_handover_customer_updates");

    return (
      <div className={pageStackClassName}>
        <ScreenIntro
          badge={buildCaseReferenceCode(persistedHandoverCase.handoverCaseId)}
          summary={persistedHandoverCase.readinessSummary}
          title={messages.handover.title}
        />

        <div className={twoColumnGridClassName}>
          <Panel title={persistedHandoverCase.customerName}>
            <DetailGrid>
              <DetailItem label={messages.common.currentOwner} value={persistedHandoverCase.ownerName} />
              <DetailItem
                label={messages.common.stage}
                value={
                  <StatusBadge
                    tone={
                      persistedHandoverCase.status === "customer_scheduling_ready" ||
                      persistedHandoverCase.status === "scheduled" ||
                      persistedHandoverCase.status === "completed"
                        ? "success"
                        : "warning"
                    }
                  >
                    {getPersistedHandoverStatusLabel(locale, persistedHandoverCase)}
                  </StatusBadge>
                }
              />
              <DetailItem label={locale === "ar" ? "المشروع" : "Project"} value={persistedHandoverCase.projectInterest} />
              <DetailItem
                label={locale === "ar" ? "لغة العميل" : "Customer language"}
                value={persistedHandoverCase.preferredLocale === "ar" ? "العربية" : "English"}
              />
            </DetailGrid>
          </Panel>

          <Panel title={locale === "ar" ? "ملخص الجاهزية" : "Readiness summary"}>
            <p className={panelSummaryClassName}>{persistedHandoverCase.readinessSummary}</p>
          </Panel>
        </div>

        <Panel title={messages.common.handoverReadiness}>
          <p className={fieldNoteClassName}>{taskGuardNote}</p>
          <StatefulStack
            emptySummary={messages.states.emptyMilestonesSummary}
            emptyTitle={messages.states.emptyMilestonesTitle}
            items={taskItems}
            renderItem={(task) => (
              <article key={task.taskId} className={documentRowClassName}>
                <div>
                  <h3>{task.title}</h3>
                  <p>{task.summary}</p>
                  <p className={caseMetaClassName}>{task.ownerName}</p>
                  <p className={caseMetaClassName}>{task.dueAt}</p>
                </div>
                <div className={documentRowActionsClassName}>
                  <StatusBadge tone={task.statusTone}>{task.statusLabel}</StatusBadge>
                  <HandoverTaskStatusForm
                    canManage={canManageHandoverTasks}
                    disabledLabel={locale === "ar" ? "يتطلب دور تنسيق التسليم" : "Handover coordination role required"}
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

        <div className={twoColumnGridClassName}>
          <Panel title={locale === "ar" ? "تنفيذ يوم التسليم" : "Handover-day execution"}>
            <WorkflowPanelBody
              note={executionGuardNote}
              summary={
                locale === "ar"
                  ? "ابدأ حالة التنفيذ الحي بعد اكتمال الجدولة الداخلية وتصفية العوائق المفتوحة، من دون تشغيل أي تكامل خارجي."
                  : "Start the live execution state after internal scheduling is complete and open blockers are cleared, without triggering any external integration."
              }
            >
              <DetailGrid className="xl:grid-cols-2">
                <DetailItem
                  label={locale === "ar" ? "بدأ التنفيذ" : "Execution started"}
                  value={
                    persistedHandoverCase.executionStartedAt
                      ? formatDateTime(persistedHandoverCase.executionStartedAt, locale)
                      : locale === "ar"
                        ? "لم يبدأ بعد"
                        : "Not started yet"
                  }
                />
                <DetailItem label={locale === "ar" ? "العوائق المفتوحة" : "Open blockers"} value={String(openBlockerItems.length)} />
              </DetailGrid>
              <HandoverExecutionStartForm
                canManage={canManageExecution}
                disabledLabel={locale === "ar" ? "يتطلب مدير التسليم" : "Handover manager required"}
                handoverCaseId={persistedHandoverCase.handoverCaseId}
                locale={locale}
                returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                status={persistedHandoverCase.status}
              />
            </WorkflowPanelBody>
          </Panel>

          <Panel title={locale === "ar" ? "الإتمام المضبوط" : "Controlled completion"}>
            <WorkflowPanelBody
              note={executionGuardNote}
              summary={
                locale === "ar"
                  ? "أغلق يوم التسليم بملخص إتمام واضح بعد انتهاء التنفيذ ومعالجة العوائق المفتوحة."
                  : "Close the handover day with a clear completion summary after execution finishes and open blockers are resolved."
              }
            >
              <DetailGrid className="xl:grid-cols-2">
                <DetailItem
                  label={locale === "ar" ? "اكتمل في" : "Completed at"}
                  value={
                    persistedHandoverCase.completedAt
                      ? formatDateTime(persistedHandoverCase.completedAt, locale)
                      : locale === "ar"
                        ? "بانتظار الإتمام"
                        : "Waiting for completion"
                  }
                />
                <DetailItem
                  label={locale === "ar" ? "ملخص الإتمام الحالي" : "Current completion summary"}
                  value={
                    persistedHandoverCase.completionSummary ??
                    (locale === "ar" ? "لم يتم حفظ ملخص الإتمام بعد." : "No completion summary has been saved yet.")
                  }
                />
              </DetailGrid>
              <HandoverCompletionForm
                canManage={canManageExecution}
                completionSummary={persistedHandoverCase.completionSummary ?? ""}
                disabledLabel={locale === "ar" ? "يتطلب مدير التسليم" : "Handover manager required"}
                handoverCaseId={persistedHandoverCase.handoverCaseId}
                locale={locale}
                returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                status={persistedHandoverCase.status}
              />
            </WorkflowPanelBody>
          </Panel>
        </div>

        <div className={twoColumnGridClassName}>
          <Panel title={locale === "ar" ? "مراجعة ما بعد التسليم" : "Post-handover review"}>
            <div className={pageStackClassName}>
              <p className={panelSummaryClassName}>
                {locale === "ar"
                  ? "بعد اكتمال يوم التسليم، احفظ مراجعة المدير وحدد ما إذا كانت الحالة تحتاج إلى متابعة ما بعد التسليم."
                  : "After the handover day is complete, save the manager review and decide whether the case needs post-handover follow-up."}
              </p>
              {reviewItem ? (
                <DetailGrid className="xl:grid-cols-2">
                  <DetailItem label={locale === "ar" ? "النتيجة الحالية" : "Current outcome"} value={reviewItem.outcomeLabel} />
                  <DetailItem label={locale === "ar" ? "آخر تحديث" : "Last updated"} value={reviewItem.updatedAt} />
                </DetailGrid>
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
            <div className={pageStackClassName}>
              <p className={panelSummaryClassName}>
                {locale === "ar"
                  ? "استخدم هذا الحد إذا كشفت المراجعة المكتملة عن عنصر متابعة لاحق بعد إغلاق يوم التسليم."
                  : "Use this boundary when the completed review reveals an aftercare item that must stay visible after handover closure."}
              </p>
              {postCompletionFollowUpItem ? (
                <div className={pageStackClassName}>
                  <DetailGrid>
                    <DetailItem
                      label={locale === "ar" ? "الحالة" : "Status"}
                      value={<StatusBadge tone={postCompletionFollowUpItem.statusTone}>{postCompletionFollowUpItem.statusLabel}</StatusBadge>}
                    />
                    <DetailItem label={locale === "ar" ? "الموعد" : "Due time"} value={postCompletionFollowUpItem.dueAt} />
                    <DetailItem label={locale === "ar" ? "المالك" : "Owner"} value={postCompletionFollowUpItem.ownerName} />
                    <DetailItem label={locale === "ar" ? "آخر تحديث" : "Last updated"} value={postCompletionFollowUpItem.updatedAt} />
                  </DetailGrid>
                  <p>{postCompletionFollowUpItem.summary}</p>
                  {postCompletionFollowUpItem.resolutionSummary ? (
                    <DetailGrid className="xl:grid-cols-2">
                      <DetailItem label={locale === "ar" ? "ملخص الحل" : "Resolution summary"} value={postCompletionFollowUpItem.resolutionSummary} />
                      <DetailItem label={locale === "ar" ? "أُغلقت في" : "Resolved at"} value={postCompletionFollowUpItem.resolvedAt} />
                    </DetailGrid>
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
                <p className={panelSummaryClassName}>
                  {locale === "ar"
                    ? "تظهر متابعة ما بعد التسليم بعد حفظ مراجعة تطلب المتابعة على سجل مكتمل."
                    : "Post-handover follow-up opens after a saved review that requires follow-up on a completed record."}
                </p>
              )}
            </div>
          </Panel>
        </div>

        <div className={twoColumnGridClassName}>
          <Panel title={locale === "ar" ? "مراجعة الإغلاق الإداري" : "Administrative closure review"}>
            <WorkflowPanelBody
              summary={
                locale === "ar"
                  ? "بعد اكتمال السجل وإغلاق أي متابعة مطلوبة، احفظ قرار الإغلاق الإداري لتحديد ما إذا كان السجل جاهزاً للأرشفة أو يحتاج إلى تعليق يدوي."
                  : "Once the handover is complete and any required aftercare is resolved, save the administrative closure decision to mark whether the record is ready to archive or should remain on hold."
              }
            >
              {archiveReviewItem ? (
                <DetailGrid className="xl:grid-cols-2">
                  <DetailItem label={locale === "ar" ? "النتيجة الحالية" : "Current outcome"} value={archiveReviewItem.outcomeLabel} />
                  <DetailItem label={locale === "ar" ? "آخر تحديث" : "Last updated"} value={archiveReviewItem.updatedAt} />
                </DetailGrid>
              ) : null}
              {canManageArchiveBoundary ? (
                <HandoverArchiveReviewForm
                  handoverCaseId={persistedHandoverCase.handoverCaseId}
                  locale={locale}
                  outcome={archiveReviewItem?.outcome ?? "ready_to_archive"}
                  returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                  summary={archiveReviewItem?.summary ?? ""}
                />
              ) : (
                <p className={panelSummaryClassName}>
                  {locale === "ar"
                    ? "تظهر مراجعة الأرشفة بعد اكتمال السجل الأساسي وحفظ مراجعة المدير وإغلاق أي متابعة مطلوبة."
                    : "The archive review opens after completion, a saved manager review, and any required post-handover follow-up resolution."}
                </p>
              )}
            </WorkflowPanelBody>
          </Panel>

          <Panel title={locale === "ar" ? "حالة الأرشفة الإدارية" : "Administrative archive status"}>
            <WorkflowPanelBody
              summary={
                locale === "ar"
                  ? "هذه الحدود لا تشغل أي نظام أرشفة خارجي، لكنها تجعل قرار الإغلاق الإداري مرئياً: تعليق، جاهز للأرشفة، ثم مؤرشف."
                  : "This boundary does not trigger any external archiving system. It simply makes administrative closure visible as held, ready to archive, and then archived."
              }
            >
              {archiveStatusItem ? (
                <DetailGrid>
                  <DetailItem
                    label={locale === "ar" ? "الحالة الحالية" : "Current status"}
                    value={<StatusBadge tone={archiveStatusItem.statusTone}>{archiveStatusItem.statusLabel}</StatusBadge>}
                  />
                  <DetailItem label={locale === "ar" ? "آخر تحديث" : "Last updated"} value={archiveStatusItem.updatedAt} />
                  <DetailItem label={locale === "ar" ? "الملخص الحالي" : "Current summary"} span="full" value={archiveStatusItem.summary} />
                </DetailGrid>
              ) : null}
              {canManageArchiveBoundary && archiveReviewItem ? (
                <HandoverArchiveStatusForm
                  handoverCaseId={persistedHandoverCase.handoverCaseId}
                  locale={locale}
                  returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                  status={archiveStatusItem?.status ?? archiveStatusOptions[0]}
                  statusOptions={[...archiveStatusOptions]}
                  summary={archiveStatusItem?.summary ?? archiveReviewItem.summary}
                />
              ) : (
                <p className={panelSummaryClassName}>
                  {locale === "ar"
                    ? "تظهر حالة الأرشفة بعد حفظ مراجعة الإغلاق الإداري على السجل المكتمل."
                    : "Archive status becomes available after the administrative closure review is saved on the completed record."}
                </p>
              )}
            </WorkflowPanelBody>
          </Panel>
        </div>

        <div className={twoColumnGridClassName}>
          <Panel title={locale === "ar" ? "الموعد الداخلي" : "Internal appointment"}>
            <div className={pageStackClassName}>
              <p className={fieldNoteClassName}>{appointmentGuardNote}</p>
              {appointmentItem ? (
                <div className={pageStackClassName}>
                  <DetailGrid>
                    <DetailItem label={locale === "ar" ? "الموقع" : "Location"} value={appointmentItem.location} />
                    <DetailItem
                      label={locale === "ar" ? "الحالة" : "Status"}
                      value={<StatusBadge tone={appointmentItem.statusTone}>{appointmentItem.statusLabel}</StatusBadge>}
                    />
                    <DetailItem label={locale === "ar" ? "منسق التسليم" : "Coordinator"} value={appointmentItem.coordinatorName} />
                    <DetailItem label={locale === "ar" ? "الموعد" : "Scheduled time"} value={appointmentItem.scheduledAt} />
                  </DetailGrid>
                  <HandoverAppointmentForm
                    canManage={canManageAppointments}
                    coordinatorName={appointmentItem.coordinatorName}
                    disabledLabel={locale === "ar" ? "يتطلب دور جدولة التسليم" : "Handover scheduling role required"}
                    handoverCaseId={persistedHandoverCase.handoverCaseId}
                    locale={locale}
                    location={appointmentItem.location}
                    returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                    scheduledAt={appointmentItem.scheduledAtInput}
                  />
                </div>
              ) : (
                <div className={pageStackClassName}>
                  <p className={panelSummaryClassName}>
                    {locale === "ar"
                      ? "لن يتم حفظ الموعد الداخلي حتى تصبح حدود الجدولة معتمدة ويصبح السجل جاهزاً للجدولة."
                      : "The internal appointment stays unavailable until the scheduling boundary is approved and the record is ready for scheduling."}
                  </p>
                  <HandoverAppointmentForm
                    canManage={canManageAppointments}
                    coordinatorName={persistedHandoverCase.ownerName}
                    disabledLabel={locale === "ar" ? "يتطلب دور جدولة التسليم" : "Handover scheduling role required"}
                    handoverCaseId={persistedHandoverCase.handoverCaseId}
                    locale={locale}
                    location=""
                    returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                    scheduledAt={appointmentHoldMilestone?.targetAtInput ?? ""}
                  />
                </div>
              )}
            </div>
          </Panel>

          <Panel title={locale === "ar" ? "تأكيد الموعد" : "Appointment confirmation"}>
            {appointmentItem ? (
              <div className={pageStackClassName}>
                <p className={panelSummaryClassName}>
                  {locale === "ar"
                    ? "يتطلب هذا التأكيد اعتماد حد تأكيد الموعد أولاً، لكنه لا يطلق أي رسالة حقيقية إلى العميل."
                    : "This confirmation requires the appointment-confirmation boundary first, and still does not trigger any real outbound message."}
                </p>
                <p className={fieldNoteClassName}>{appointmentGuardNote}</p>
                <HandoverAppointmentConfirmationForm
                  appointmentId={appointmentItem.appointmentId}
                  canManage={canManageAppointments}
                  disabledLabel={locale === "ar" ? "يتطلب دور جدولة التسليم" : "Handover scheduling role required"}
                  handoverCaseId={persistedHandoverCase.handoverCaseId}
                  locale={locale}
                  returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                  status={appointmentItem.status}
                />
              </div>
            ) : (
              <p className={panelSummaryClassName}>
                {locale === "ar"
                  ? "سيظهر تأكيد الموعد بعد حفظ موعد داخلي فعلي."
                  : "Appointment confirmation appears after a real internal appointment has been planned."}
              </p>
            )}
          </Panel>
        </div>

        <div className={twoColumnGridClassName}>
          <Panel title={locale === "ar" ? "تجهيز الإرسال" : "Delivery preparation"}>
            {appointmentConfirmationUpdate ? (
              <div className={pageStackClassName}>
                <p className={panelSummaryClassName}>
                  {locale === "ar"
                    ? "هذه الخطوة تحفظ صياغة التأكيد المعتمدة كرسالة جاهزة للإرسال لاحقاً من دون تشغيل أي قناة فعلية."
                    : "This stores the approved confirmation as outbound-ready content for later dispatch without triggering any live channel."}
                </p>
                <p className={fieldNoteClassName}>{customerUpdateGuardNote}</p>
                {appointmentConfirmationUpdate.deliverySummary ? (
                  <DetailGrid className="xl:grid-cols-2">
                    <DetailItem label={locale === "ar" ? "ملخص التجهيز" : "Delivery summary"} value={appointmentConfirmationUpdate.deliverySummary} />
                    <DetailItem label={locale === "ar" ? "تم التجهيز في" : "Prepared at"} value={appointmentConfirmationUpdate.deliveryPreparedAt} />
                  </DetailGrid>
                ) : null}
                {appointmentConfirmationQaReview ? (
                  <div className={pageStackClassName}>
                    <div className={statusRowWrapClassName}>
                      <StatusBadge tone={appointmentConfirmationQaReview.reviewStatusTone}>
                        {appointmentConfirmationQaReview.reviewStatusLabel}
                      </StatusBadge>
                      {appointmentConfirmationQaReview.policySignalLabels.map((label) => (
                        <StatusBadge key={label}>{label}</StatusBadge>
                      ))}
                    </div>
                    <p>{appointmentConfirmationQaReview.reviewSampleSummary}</p>
                  </div>
                ) : null}
                <HandoverCustomerUpdateDeliveryForm
                  canManage={canManageCustomerUpdates}
                  customerUpdateId={appointmentConfirmationUpdate.customerUpdateId}
                  disabledLabel={locale === "ar" ? "يتطلب مدير التسليم" : "Handover manager required"}
                  deliverySummary={appointmentConfirmationUpdate.deliverySummary ?? ""}
                  handoverCaseId={persistedHandoverCase.handoverCaseId}
                  locale={locale}
                  qaReviewStatus={appointmentConfirmationUpdate.qaReviewStatus}
                  returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                  status={appointmentConfirmationUpdate.status}
                />
              </div>
            ) : (
              <p className={panelSummaryClassName}>
                {locale === "ar"
                  ? "سيظهر تجهيز الإرسال بعد إنشاء حد تأكيد الموعد في هذا السجل."
                  : "Delivery preparation appears after the appointment-confirmation boundary exists on this record."}
              </p>
            )}
          </Panel>

          <Panel title={locale === "ar" ? "جاهزية الإرسال" : "Dispatch readiness"}>
            {appointmentConfirmationUpdate ? (
              <div className={pageStackClassName}>
                <p className={panelSummaryClassName}>
                  {locale === "ar"
                    ? "هذه الخطوة لا ترسل أي رسالة، لكنها ترفع سجل التسليم إلى حالة مجدولة داخلياً بمجرد اكتمال التجهيز."
                    : "This still does not send anything, but it promotes the handover record into an internally scheduled state once preparation is complete."}
                </p>
                <p className={fieldNoteClassName}>{customerUpdateGuardNote}</p>
                {appointmentConfirmationUpdate.dispatchReadyAt ? (
                  <DetailGrid className="xl:grid-cols-2">
                    <DetailItem label={locale === "ar" ? "جاهز للإرسال منذ" : "Ready since"} value={appointmentConfirmationUpdate.dispatchReadyAt} />
                    <DetailItem
                      label={locale === "ar" ? "حالة الحد" : "Boundary status"}
                      value={<StatusBadge tone={appointmentConfirmationUpdate.statusTone}>{appointmentConfirmationUpdate.statusLabel}</StatusBadge>}
                    />
                  </DetailGrid>
                ) : null}
                {appointmentConfirmationQaReview ? (
                  <div className={pageStackClassName}>
                    <div className={statusRowWrapClassName}>
                      <StatusBadge tone={appointmentConfirmationQaReview.reviewStatusTone}>
                        {appointmentConfirmationQaReview.reviewStatusLabel}
                      </StatusBadge>
                      <StatusBadge>{appointmentConfirmationQaReview.typeLabel}</StatusBadge>
                    </div>
                    <p>{appointmentConfirmationQaReview.reviewSummary ?? appointmentConfirmationQaReview.reviewSampleSummary}</p>
                  </div>
                ) : null}
                <HandoverCustomerUpdateDispatchReadyForm
                  canManage={canManageCustomerUpdates}
                  customerUpdateId={appointmentConfirmationUpdate.customerUpdateId}
                  disabledLabel={locale === "ar" ? "يتطلب مدير التسليم" : "Handover manager required"}
                  handoverCaseId={persistedHandoverCase.handoverCaseId}
                  locale={locale}
                  qaReviewStatus={appointmentConfirmationUpdate.qaReviewStatus}
                  returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                  status={appointmentConfirmationUpdate.status}
                />
              </div>
            ) : (
              <p className={panelSummaryClassName}>
                {locale === "ar"
                  ? "ستظهر جاهزية الإرسال بعد تجهيز حد تأكيد الموعد."
                  : "Dispatch readiness appears after the appointment-confirmation update is prepared."}
              </p>
            )}
          </Panel>
        </div>

        <div className={twoColumnGridClassName}>
          <Panel title={locale === "ar" ? "عوائق التنفيذ" : "Execution blockers"}>
            <div className={pageStackClassName}>
              <p className={panelSummaryClassName}>
                {locale === "ar"
                  ? "بعد وصول السجل إلى حالة مجدولة، استخدم هذا القسم لإبقاء الـ snag والعوائق الميدانية مرئية قبل التنفيذ الفعلي."
                  : "Once the record reaches the scheduled boundary, use this section to keep snags and field blockers visible before live execution."}
              </p>
              <p className={fieldNoteClassName}>{blockerGuardNote}</p>
              <StatefulStack
                emptySummary={
                  locale === "ar"
                    ? "لا توجد عوائق تنفيذ مفتوحة أو مسجلة حتى الآن."
                    : "No execution blockers have been logged on this scheduled handover record yet."
                }
                emptyTitle={locale === "ar" ? "لا توجد عوائق" : "No blockers"}
                items={blockerItems}
                renderItem={(blocker) => (
                  <article key={blocker.blockerId} className={documentRowClassName}>
                    <div>
                      <div className={rowBetweenClassName}>
                        <h3>{blocker.title}</h3>
                        <div className={rowBetweenClassName}>
                          <StatusBadge tone={blocker.severityTone}>{blocker.severityLabel}</StatusBadge>
                          <StatusBadge tone={blocker.statusTone}>{blocker.statusLabel}</StatusBadge>
                        </div>
                      </div>
                      <p>{blocker.typeDetail}</p>
                      <p>{blocker.summary}</p>
                      <p className={caseMetaClassName}>{blocker.ownerName}</p>
                      <p className={caseMetaClassName}>{blocker.dueAt}</p>
                    </div>
                    <div className={documentRowActionsClassName}>
                      <HandoverBlockerStatusForm
                        blockerId={blocker.blockerId}
                        canManage={canManageBlockers}
                        disabledLabel={locale === "ar" ? "يتطلب دور تنفيذ التسليم" : "Execution role required"}
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
                  canManage={canManageBlockers}
                  disabledLabel={locale === "ar" ? "يتطلب دور تنفيذ التسليم" : "Execution role required"}
                  dueAt={appointmentItem?.scheduledAtInput ?? ""}
                  handoverCaseId={persistedHandoverCase.handoverCaseId}
                  locale={locale}
                  ownerName={persistedHandoverCase.ownerName}
                  returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                />
              ) : (
                <p className={panelSummaryClassName}>
                  {locale === "ar"
                    ? "سيفتح تسجيل عوائق التنفيذ بعد انتقال السجل إلى حالة التسليم المجدولة."
                    : "Execution blocker logging opens after the handover record reaches the scheduled boundary."}
                </p>
              )}
            </div>
          </Panel>

          <Panel title={locale === "ar" ? "خطة المحطات" : "Milestone plan"}>
            <div className={pageStackClassName}>
              <p className={fieldNoteClassName}>{milestoneGuardNote}</p>
              <StatefulStack
                emptySummary={locale === "ar" ? "لم يتم إنشاء أي محطات بعد." : "No handover milestones have been planned yet."}
                emptyTitle={locale === "ar" ? "لا توجد محطات" : "No milestones"}
                items={milestoneItems}
                renderItem={(milestone) => (
                  <article key={milestone.milestoneId} className={documentRowClassName}>
                    <div>
                      <div className={rowBetweenClassName}>
                        <h3>{milestone.title}</h3>
                        <StatusBadge tone={milestone.statusTone}>{milestone.statusLabel}</StatusBadge>
                      </div>
                      <p>{milestone.summary}</p>
                      <p className={caseMetaClassName}>{milestone.ownerName}</p>
                      <p className={caseMetaClassName}>{milestone.targetAt}</p>
                    </div>
                    <div className={documentRowActionsClassName}>
                      <HandoverMilestoneForm
                        canManage={canManageMilestones}
                        disabledLabel={locale === "ar" ? "يتطلب دور تنسيق التسليم" : "Handover coordination role required"}
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
            </div>
          </Panel>

          <Panel title={locale === "ar" ? "حدود تواصل العميل" : "Customer-update boundaries"}>
            <div className={pageStackClassName}>
              <p className={fieldNoteClassName}>{customerUpdateGuardNote}</p>
              <StatefulStack
                emptySummary={
                  locale === "ar"
                    ? "لن تظهر حدود التحديث إلا بعد إنشاء سجل التسليم الحي."
                    : "Update boundaries only appear after the live handover record exists."
                }
                emptyTitle={locale === "ar" ? "لا توجد حدود" : "No update boundaries"}
                items={customerUpdateItems}
                renderItem={(customerUpdate) => (
                  <article key={customerUpdate.customerUpdateId} className={documentRowClassName}>
                    <div>
                      <div className={rowBetweenClassName}>
                        <h3>{customerUpdate.title}</h3>
                        <StatusBadge tone={customerUpdate.statusTone}>{customerUpdate.statusLabel}</StatusBadge>
                      </div>
                      <p>{customerUpdate.summary}</p>
                      {customerUpdate.qaReviewStatus !== "not_required" ? (
                        <div className={statusRowWrapClassName}>
                          <StatusBadge tone={customerUpdate.qaReviewStatusTone}>{customerUpdate.qaReviewStatusLabel}</StatusBadge>
                          {customerUpdate.qaPolicySignalLabels.map((label) => (
                            <StatusBadge key={label}>{label}</StatusBadge>
                          ))}
                        </div>
                      ) : null}
                      <p className={caseMetaClassName}>{customerUpdate.updatedAt}</p>
                    </div>
                    <div className={documentRowActionsClassName}>
                      <HandoverCustomerUpdateApprovalForm
                        canManage={canManageCustomerUpdates}
                        customerUpdateId={customerUpdate.customerUpdateId}
                        disabledLabel={locale === "ar" ? "يتطلب مدير التسليم" : "Handover manager required"}
                        handoverCaseId={persistedHandoverCase.handoverCaseId}
                        locale={locale}
                        returnPath={`/${locale}/handover/${persistedHandoverCase.handoverCaseId}`}
                        status={customerUpdate.status}
                      />
                    </div>
                  </article>
                )}
              />
            </div>
          </Panel>
        </div>

        <TimelinePanel events={buildPersistedHandoverTimeline(persistedHandoverCase, locale)} locale={locale} />
      </div>
    );
  }

  const handoverCase = getDemoHandoverCaseById(handoverCaseId);

  if (!handoverCase) {
    notFound();
  }

  return (
    <div className={pageStackClassName}>
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
              <div className={rowBetweenClassName}>
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
