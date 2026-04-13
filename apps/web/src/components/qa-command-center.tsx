import Link from "next/link";

import { canOperatorRoleAccessWorkspace, type OperatorRole, type PersistedCaseSummary, type SupportedLocale } from "@real-estate-ai/contracts";
import { Panel, StatusBadge } from "@real-estate-ai/ui";

import { ScreenIntro } from "@/components/screen-intro";
import { StatefulStack } from "@/components/stateful-stack";
import { WorkspaceAccessPanel } from "@/components/workspace-access-panel";
import { getPreferredOperatorSurfacePath, getOperatorRoleLabel } from "@/lib/operator-role";
import { buildCaseReferenceCode, getPersistedQaReviewDisplay } from "@/lib/persisted-case-presenters";
import { buildQaWorkspaceQueues, getQaWorkspaceCopy } from "@/lib/qa-workspace";

export function QaCommandCenter(props: {
  currentOperatorRole: OperatorRole;
  locale: SupportedLocale;
  persistedCases: PersistedCaseSummary[];
}) {
  const workspaceCopy = getQaWorkspaceCopy(props.locale);
  const { approvedCases, followUpCases, pendingCases, qaCases } = buildQaWorkspaceQueues(props.persistedCases);

  return (
    <div className="page-stack">
      <ScreenIntro badge={workspaceCopy.title} summary={workspaceCopy.summary} title={workspaceCopy.title} />

      <Panel title={props.locale === "ar" ? "وضع المراجع الحالي" : "Current reviewer mode"}>
        <div className="page-stack">
          <p className="panel-summary">
            {props.locale === "ar"
              ? `يعمل هذا المركز بدور ${getOperatorRoleLabel(props.locale, props.currentOperatorRole)} مع طابور صريح للحالات التي تحتاج تدقيقاً بشرياً.`
              : `This center is running as ${getOperatorRoleLabel(props.locale, props.currentOperatorRole)} with an explicit queue for cases that need human review.`}
          </p>
          <div className="status-row-wrap">
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

      <div className="metric-grid">
        <article className="metric-tile metric-tile-rose">
          <p className="metric-label">{props.locale === "ar" ? "قيد الانتظار" : "Pending review"}</p>
          <p className="metric-value">{pendingCases.length}</p>
          <p className="metric-detail">
            {props.locale === "ar"
              ? "حالات مفتوحة لم تحصل بعد على قرار جودة نهائي."
              : "Open cases that still need an explicit QA decision."}
          </p>
        </article>
        <article className="metric-tile metric-tile-sand">
          <p className="metric-label">{props.locale === "ar" ? "تحتاج متابعة" : "Follow-up required"}</p>
          <p className="metric-value">{followUpCases.length}</p>
          <p className="metric-detail">
            {props.locale === "ar"
              ? "حالات تمت مراجعتها وتحتاج تصحيحاً أو متابعة بشرية إضافية."
              : "Reviewed cases that need corrective work or extra human follow-up."}
          </p>
        </article>
        <article className="metric-tile metric-tile-mint">
          <p className="metric-label">{props.locale === "ar" ? "معتمدة" : "Approved"}</p>
          <p className="metric-value">{approvedCases.length}</p>
          <p className="metric-detail">
            {props.locale === "ar"
              ? "حالات عبرت مراجعة الجودة ويمكنها الاستمرار دون عائق إضافي."
              : "Cases that passed QA and can continue without an extra governance hold."}
          </p>
        </article>
      </div>

      <div className="two-column-grid">
        <Panel title={props.locale === "ar" ? "طابور الجودة المفتوح" : "Open QA queue"}>
          <StatefulStack
            emptySummary={
              props.locale === "ar" ? "لا توجد حالياً حالات مرسلة إلى مراجعة الجودة." : "No live cases are currently sitting in the QA queue."
            }
            emptyTitle={props.locale === "ar" ? "لا يوجد طابور جودة" : "No QA queue"}
            items={qaCases}
            renderItem={(caseItem) => {
              const qaReview = getPersistedQaReviewDisplay(props.locale, caseItem);

              if (!qaReview) {
                return null;
              }

              return (
                <Link key={caseItem.caseId} className="case-link-card" href={`/${props.locale}/qa/cases/${caseItem.caseId}`}>
                  <div>
                    <p className="case-link-meta">{buildCaseReferenceCode(caseItem.caseId)}</p>
                    <h3>{caseItem.customerName}</h3>
                    <p>{qaReview.sampleSummary}</p>
                    <p className="case-link-meta">{qaReview.updatedAt}</p>
                  </div>
                  <div className="case-link-aside">
                    <StatusBadge tone={qaReview.statusTone}>{qaReview.statusLabel}</StatusBadge>
                    <StatusBadge>{caseItem.ownerName}</StatusBadge>
                  </div>
                </Link>
              );
            }}
          />
        </Panel>

        <Panel title={props.locale === "ar" ? "الحالات المعتمدة أخيراً" : "Recently approved cases"}>
          <StatefulStack
            emptySummary={
              props.locale === "ar"
                ? "لم يتم اعتماد أي حالة من طابور الجودة بعد."
                : "No cases have been approved from the QA queue yet."
            }
            emptyTitle={props.locale === "ar" ? "لا يوجد اعتماد بعد" : "No approvals yet"}
            items={approvedCases}
            renderItem={(caseItem) => {
              const qaReview = getPersistedQaReviewDisplay(props.locale, caseItem);

              if (!qaReview) {
                return null;
              }

              return (
                <article key={caseItem.caseId} className="intervention-row intervention-row-resolved">
                  <div className="row-between">
                    <h3>{caseItem.customerName}</h3>
                    <StatusBadge tone="success">{qaReview.statusLabel}</StatusBadge>
                  </div>
                  <p>{qaReview.reviewSummary ?? qaReview.sampleSummary}</p>
                  <Link className="inline-link" href={`/${props.locale}/qa/cases/${caseItem.caseId}`}>
                    {props.locale === "ar" ? "فتح سجل الجودة" : "Open QA record"}
                  </Link>
                </article>
              );
            }}
          />
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
    <div className="page-stack">
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
