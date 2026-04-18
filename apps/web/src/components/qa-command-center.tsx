import Link from "next/link";

import { canOperatorRoleAccessWorkspace, type OperatorRole, type PersistedCaseSummary, type SupportedLocale } from "@real-estate-ai/contracts";
import {
  caseMetaClassName,
  inlineLinkClassName,
  MetricTile,
  metricGridClassName,
  pageStackClassName,
  Panel,
  panelSummaryClassName,
  StatusBadge,
  statusRowWrapClassName,
  twoColumnGridClassName
} from "@real-estate-ai/ui";

import { ReviewSummaryCard } from "@/components/review-summary-card";
import { ScreenIntro } from "@/components/screen-intro";
import { StatefulStack } from "@/components/stateful-stack";
import { WorkspaceAccessPanel } from "@/components/workspace-access-panel";
import { getPreferredOperatorSurfacePath, getOperatorRoleLabel } from "@/lib/operator-role";
import { buildCaseReferenceCode, getPersistedActiveQaItemDisplay } from "@/lib/persisted-case-presenters";
import { buildQaWorkspaceQueues, getQaWorkspaceCopy } from "@/lib/qa-workspace";

export function QaCommandCenter(props: {
  currentOperatorRole: OperatorRole;
  locale: SupportedLocale;
  persistedCases: PersistedCaseSummary[];
}) {
  const workspaceCopy = getQaWorkspaceCopy(props.locale);
  const { approvedCases, followUpCases, pendingCases, qaCases } = buildQaWorkspaceQueues(props.persistedCases);

  return (
    <div className={pageStackClassName}>
      <ScreenIntro badge={workspaceCopy.title} summary={workspaceCopy.summary} title={workspaceCopy.title} />

      <Panel title={props.locale === "ar" ? "وضع المراجع الحالي" : "Current reviewer mode"}>
        <div className="mt-4 space-y-5">
          <p className={panelSummaryClassName}>
            {props.locale === "ar"
              ? `يعمل هذا المركز بدور ${getOperatorRoleLabel(props.locale, props.currentOperatorRole)} مع طابور صريح للحالات التي تحتاج تدقيقاً بشرياً.`
              : `This center is running as ${getOperatorRoleLabel(props.locale, props.currentOperatorRole)} with an explicit queue for cases that need human review.`}
          </p>
          <div className={statusRowWrapClassName}>
            <StatusBadge>{getOperatorRoleLabel(props.locale, props.currentOperatorRole)}</StatusBadge>
            <StatusBadge tone="critical">
              {props.locale === "ar" ? `${pendingCases.length} بانتظار المراجعة` : `${pendingCases.length} pending`}
            </StatusBadge>
            <StatusBadge tone="warning">
              {props.locale === "ar" ? `${followUpCases.length} تحتاج متابعة` : `${followUpCases.length} follow-up`}
            </StatusBadge>
          </div>
        </div>
      </Panel>

      <div className={metricGridClassName}>
        <MetricTile
          detail={
            props.locale === "ar"
              ? "حالات مفتوحة لم تحصل بعد على قرار جودة نهائي."
              : "Open cases that still need an explicit QA decision."
          }
          label={props.locale === "ar" ? "قيد الانتظار" : "Pending review"}
          tone="rose"
          value={String(pendingCases.length)}
        />
        <MetricTile
          detail={
            props.locale === "ar"
              ? "حالات تمت مراجعتها وتحتاج تصحيحاً أو متابعة بشرية إضافية."
              : "Reviewed cases that need corrective work or extra human follow-up."
          }
          label={props.locale === "ar" ? "تحتاج متابعة" : "Follow-up required"}
          tone="sand"
          value={String(followUpCases.length)}
        />
        <MetricTile
          detail={
            props.locale === "ar"
              ? "حالات عبرت مراجعة الجودة ويمكنها الاستمرار دون عائق إضافي."
              : "Cases that passed QA and can continue without an extra governance hold."
          }
          label={props.locale === "ar" ? "معتمدة" : "Approved"}
          tone="mint"
          value={String(approvedCases.length)}
        />
      </div>

      <div className={twoColumnGridClassName}>
        <Panel title={props.locale === "ar" ? "طابور الجودة المفتوح" : "Open QA queue"}>
          <div className="mt-4">
            <StatefulStack
              emptySummary={
                props.locale === "ar" ? "لا توجد حالياً حالات مرسلة إلى مراجعة الجودة." : "No live cases are currently sitting in the QA queue."
              }
              emptyTitle={props.locale === "ar" ? "لا يوجد طابور جودة" : "No QA queue"}
              items={qaCases}
              renderItem={(caseItem) => {
                const qaReview = getPersistedActiveQaItemDisplay(props.locale, caseItem);

                if (!qaReview) {
                  return null;
                }

                return (
                  <ReviewSummaryCard
                    key={caseItem.caseId}
                    actions={
                      <Link className={inlineLinkClassName} href={`/${props.locale}/qa/cases/${caseItem.caseId}`}>
                        {props.locale === "ar" ? "فتح سجل الجودة" : "Open QA record"}
                      </Link>
                    }
                    badges={[
                      { label: qaReview.statusLabel, tone: qaReview.statusTone },
                      { label: qaReview.triggerSourceLabel },
                      { label: qaReview.subjectLabel },
                      ...(qaReview.policySignalLabels[0] ? [{ label: qaReview.policySignalLabels[0] }] : []),
                      { label: caseItem.ownerName }
                    ]}
                    meta={
                      <p className={caseMetaClassName}>
                        {buildCaseReferenceCode(caseItem.caseId)}
                        {" · "}
                        {qaReview.updatedAt}
                      </p>
                    }
                    summary={qaReview.reviewSummary ?? qaReview.sampleSummary}
                    title={caseItem.customerName}
                    tone="critical"
                  />
                );
              }}
            />
          </div>
        </Panel>

        <Panel title={props.locale === "ar" ? "الحالات المعتمدة أخيراً" : "Recently approved cases"}>
          <div className="mt-4">
            <StatefulStack
              emptySummary={
                props.locale === "ar"
                  ? "لم يتم اعتماد أي حالة من طابور الجودة بعد."
                  : "No cases have been approved from the QA queue yet."
              }
              emptyTitle={props.locale === "ar" ? "لا يوجد اعتماد بعد" : "No approvals yet"}
              items={approvedCases}
              renderItem={(caseItem) => {
                const qaReview = getPersistedActiveQaItemDisplay(props.locale, caseItem);

                if (!qaReview) {
                  return null;
                }

                return (
                  <ReviewSummaryCard
                    key={caseItem.caseId}
                    actions={
                      <Link className={inlineLinkClassName} href={`/${props.locale}/qa/cases/${caseItem.caseId}`}>
                        {props.locale === "ar" ? "فتح سجل الجودة" : "Open QA record"}
                      </Link>
                    }
                    badges={[
                      { label: qaReview.statusLabel, tone: "success" },
                      { label: qaReview.subjectLabel }
                    ]}
                    meta={
                      <p className={caseMetaClassName}>
                        {buildCaseReferenceCode(caseItem.caseId)}
                        {" · "}
                        {qaReview.updatedAt}
                      </p>
                    }
                    summary={qaReview.reviewSummary ?? qaReview.sampleSummary}
                    title={caseItem.customerName}
                    tone="success"
                  />
                );
              }}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function QaWorkspaceUnavailable(props: {
  currentOperatorRole: OperatorRole;
  locale: SupportedLocale;
}) {
  const workspaceCopy = getQaWorkspaceCopy(props.locale);

  return (
    <div className={pageStackClassName}>
      <ScreenIntro badge={workspaceCopy.title} summary={workspaceCopy.summary} title={workspaceCopy.title} />
      <WorkspaceAccessPanel
        actionHref={getPreferredOperatorSurfacePath(props.locale, props.currentOperatorRole)}
        actionLabel={props.locale === "ar" ? "فتح السطح المتاح" : "Open an available surface"}
        locale={props.locale}
        operatorRole={props.currentOperatorRole}
        summary={
          props.locale === "ar"
            ? "هذه المساحة مخصصة للمراجع أو المشرف الذي يملك حدود اعتماد الجودة داخل الجلسة المحلية الموثوقة."
            : "This surface is reserved for reviewers or admins who own the local QA approval boundary."
        }
        title={workspaceCopy.accessRequiredTitle}
        workspace="qa"
      />
    </div>
  );
}

export function canAccessQaWorkspace(operatorRole: OperatorRole) {
  return canOperatorRoleAccessWorkspace("qa", operatorRole);
}
