import Link from "next/link";

import { canOperatorRolePerform, type SupportedLocale } from "@real-estate-ai/contracts";
import { getMessages } from "@real-estate-ai/i18n";
import {
  DetailGrid,
  DetailItem,
  EmptyState,
  MetricTile,
  Panel,
  StatusBadge,
  WorkflowCard,
  WorkflowListItem,
  WorkflowPanelBody,
  caseMetaClassName,
  inlineLinkClassName,
  metricGridClassName,
  pageStackClassName,
  statusRowWrapClassName,
  twoColumnGridClassName
} from "@real-estate-ai/ui";

import { CommercialEvidenceGapResolutionForm, CommercialFactExpiryReviewForm, CommercialSourceCreateForm, ManualCommercialFactForm, SourceRefreshTaskResolutionForm } from "@/components/commercial-source-forms";
import { ScreenIntro } from "@/components/screen-intro";
import { getCurrentOperatorRole } from "@/lib/operator-session";
import { tryListActiveCommercialFacts, tryListCommercialEvidenceGaps, tryListCommercialFactExpiryReviews, tryListCommercialFactProposals, tryListCommercialSourceRefreshTasks, tryListCommercialSources } from "@/lib/live-api";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: SupportedLocale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getSingleSearchValue(value: string | string[] | undefined) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function buildCommercialSourcesHref(locale: SupportedLocale, filters: { ownerName?: string | null; projectCode?: string | null }) {
  const searchParams = new URLSearchParams();

  if (filters.ownerName) {
    searchParams.set("ownerName", filters.ownerName);
  }

  if (filters.projectCode) {
    searchParams.set("projectCode", filters.projectCode);
  }

  const serialized = searchParams.toString();

  return `/${locale}/commercial-sources${serialized ? `?${serialized}` : ""}`;
}

export default async function CommercialSourcesPage(props: PageProps) {
  const [{ locale }, rawSearchParams] = await Promise.all([props.params, props.searchParams]);
  const messages = getMessages(locale);
  const ownerNameFilter = getSingleSearchValue(rawSearchParams.ownerName);
  const projectCodeFilter = getSingleSearchValue(rawSearchParams.projectCode);
  const role = await getCurrentOperatorRole();
  const canManage = canOperatorRolePerform("manage_commercial_sources", role);
  const [allSources, proposals, facts, expiryReviews, refreshTasks, evidenceGaps] = await Promise.all([
    tryListCommercialSources(role),
    tryListCommercialFactProposals(role),
    tryListActiveCommercialFacts(role),
    tryListCommercialFactExpiryReviews(role),
    tryListCommercialSourceRefreshTasks(role),
    tryListCommercialEvidenceGaps(role)
  ]);
  const isUnassignedOwnerFilter = ownerNameFilter === "__unassigned";
  const scopedSources = allSources
    .filter((source) => !projectCodeFilter || source.projectCode === projectCodeFilter)
    .filter((source) => {
      if (!ownerNameFilter) {
        return true;
      }

      return isUnassignedOwnerFilter ? source.ownerName === null : source.ownerName === ownerNameFilter;
    });
  const scopedSourceIds = new Set(scopedSources.map((source) => source.sourceId));
  const scopedProjectCodes = new Set([...scopedSources.map((source) => source.projectCode), ...(projectCodeFilter ? [projectCodeFilter] : [])]);
  const hasScopedQueue = Boolean(ownerNameFilter || projectCodeFilter);
  const scopedFacts = facts.filter((fact) => !hasScopedQueue || (fact.sourceId ? scopedSourceIds.has(fact.sourceId) : scopedProjectCodes.has(fact.projectCode)));
  const scopedProposals = proposals.filter(
    (proposal) => !hasScopedQueue || (proposal.sourceId ? scopedSourceIds.has(proposal.sourceId) : scopedProjectCodes.has(proposal.projectCode))
  );
  const scopedExpiryReviews = expiryReviews.filter(
    (review) => !hasScopedQueue || (review.fact ? (review.fact.sourceId ? scopedSourceIds.has(review.fact.sourceId) : scopedProjectCodes.has(review.fact.projectCode)) : false)
  );
  const staleFacts = scopedFacts.filter((fact) => fact.freshnessStatus === "stale" || fact.freshnessStatus === "expired");
  const expiringFacts = scopedFacts.filter((fact) => fact.freshnessStatus === "expiring_soon");
  const factsNeedingReview = [...expiringFacts, ...staleFacts].slice(0, 12);
  const scopedRefreshTasks = refreshTasks.filter((task) => !hasScopedQueue || scopedSourceIds.has(task.sourceId));
  const openRefreshTasks = scopedRefreshTasks.filter((task) => task.status === "open");
  const scopedEvidenceGaps = evidenceGaps.filter((gap) => !hasScopedQueue || scopedProjectCodes.has(gap.projectCode));
  const openEvidenceGaps = scopedEvidenceGaps.filter((gap) => gap.status === "open");
  const ownersByProject = new Map<string, string[]>();

  for (const source of allSources) {
    if (!source.ownerName) {
      continue;
    }

    const owners = ownersByProject.get(source.projectCode) ?? [];

    if (!owners.includes(source.ownerName)) {
      owners.push(source.ownerName);
      ownersByProject.set(source.projectCode, owners);
    }
  }
  const queueSources = allSources.filter((source) => !projectCodeFilter || source.projectCode === projectCodeFilter);
  const ownerQueueKeys = Array.from(new Set(queueSources.map((source) => source.ownerName ?? "__unassigned")));
  const ownerQueueSummaries = ownerQueueKeys
    .map((ownerKey) => {
      const ownerSources = queueSources.filter((source) => (ownerKey === "__unassigned" ? source.ownerName === null : source.ownerName === ownerKey));
      const ownerSourceIds = new Set(ownerSources.map((source) => source.sourceId));
      const ownerProjectCodes = new Set(ownerSources.map((source) => source.projectCode));
      const ownerFacts = facts.filter((fact) => (fact.sourceId ? ownerSourceIds.has(fact.sourceId) : ownerProjectCodes.has(fact.projectCode)));

      return {
        activeFactsCount: ownerFacts.filter((fact) => fact.freshnessStatus === "active" || fact.freshnessStatus === "expiring_soon").length,
        expiringSoonFactsCount: ownerFacts.filter((fact) => fact.freshnessStatus === "expiring_soon").length,
        href: buildCommercialSourcesHref(locale, { ownerName: ownerKey, projectCode: projectCodeFilter }),
        isActive: ownerNameFilter === ownerKey,
        openEvidenceGapsCount: evidenceGaps.filter((gap) => gap.status === "open" && ownerProjectCodes.has(gap.projectCode)).length,
        openRefreshTasksCount: refreshTasks.filter((task) => task.status === "open" && ownerSourceIds.has(task.sourceId)).length,
        ownerLabel: ownerKey === "__unassigned" ? (locale === "ar" ? "غير معين" : "Unassigned") : ownerKey,
        ownerName: ownerKey,
        pendingApprovalsCount: proposals.filter(
          (proposal) => proposal.state === "pending_review" && (proposal.sourceId ? ownerSourceIds.has(proposal.sourceId) : ownerProjectCodes.has(proposal.projectCode))
        ).length,
        projectCount: ownerProjectCodes.size,
        sourceCount: ownerSources.length,
        staleFactsCount: ownerFacts.filter((fact) => fact.freshnessStatus === "stale" || fact.freshnessStatus === "expired").length
      };
    })
    .sort(
      (a, b) =>
        Number(b.isActive) - Number(a.isActive) ||
        b.openEvidenceGapsCount - a.openEvidenceGapsCount ||
        b.openRefreshTasksCount - a.openRefreshTasksCount ||
        b.pendingApprovalsCount - a.pendingApprovalsCount ||
        a.ownerLabel.localeCompare(b.ownerLabel)
    );
  const currentReturnPath = buildCommercialSourcesHref(locale, { ownerName: ownerNameFilter, projectCode: projectCodeFilter });

  return (
    <div className={pageStackClassName}>
      <ScreenIntro
        badge={messages.app.phaseLabel}
        summary={
          locale === "ar"
            ? "تحكم محلي في مصادر الأسعار والتوفر وخطط الدفع قبل أن يستخدمها الوكيل في واتساب."
            : "Local control over price, availability, and payment-plan sources before the agent can use them on WhatsApp."
        }
        title={locale === "ar" ? "مركز المصادر التجارية" : "Commercial Source Control Center"}
      />

      <div className={metricGridClassName}>
        <MetricTile detail={locale === "ar" ? "مسموح بها للردود التجارية" : "Allowed for commercial replies"} label={locale === "ar" ? "حقائق نشطة" : "Active facts"} tone="ocean" value={String(scopedFacts.length)} />
        <MetricTile detail={locale === "ar" ? "تحتاج قرار مدير" : "Need manager decision"} label={locale === "ar" ? "بانتظار الاعتماد" : "Pending approvals"} tone="sand" value={String(scopedProposals.filter((item) => item.state === "pending_review").length)} />
        <MetricTile detail={locale === "ar" ? "نشطة لكن تحتاج مراجعة" : "Active but needs review"} label={locale === "ar" ? "تنتهي قريباً" : "Expiring soon"} tone="rose" value={String(expiringFacts.length)} />
        <MetricTile detail={locale === "ar" ? "تحتاج تحديث مصدر" : "Need source refresh"} label={locale === "ar" ? "مهام مفتوحة" : "Open tasks"} tone="mint" value={String(openRefreshTasks.length)} />
        <MetricTile detail={locale === "ar" ? "تمنع مسودات الرد" : "Blocking reply drafts"} label={locale === "ar" ? "فجوات أدلة" : "Evidence gaps"} tone="rose" value={String(openEvidenceGaps.length)} />
      </div>

      {hasScopedQueue ? (
        <Panel title={locale === "ar" ? "نطاق قائمة العمل" : "Queue scope"}>
          <WorkflowPanelBody
            className="mt-4"
            summary={
              locale === "ar"
                ? "تعرض هذه الصفحة الآن ضغط المصادر التجارية ضمن المالك أو المشروع المحدد فقط."
                : "This page is scoped to the selected commercial source owner or project."
            }
          >
            <div className={statusRowWrapClassName}>
              {ownerNameFilter ? (
                <StatusBadge tone="warning">
                  {locale === "ar" ? "المالك" : "Owner"}
                  {": "}
                  {isUnassignedOwnerFilter ? (locale === "ar" ? "غير معين" : "Unassigned") : ownerNameFilter}
                </StatusBadge>
              ) : null}
              {projectCodeFilter ? (
                <StatusBadge>
                  {locale === "ar" ? "المشروع" : "Project"}
                  {": "}
                  {projectCodeFilter}
                </StatusBadge>
              ) : null}
              <Link className={inlineLinkClassName} href={`/${locale}/commercial-sources`}>
                {locale === "ar" ? "عرض كل القوائم" : "View all queues"}
              </Link>
            </div>
          </WorkflowPanelBody>
        </Panel>
      ) : null}

      <Panel title={locale === "ar" ? "قوائم جاهزية حسب المالك" : "Owner readiness queues"}>
        <WorkflowPanelBody
          className="mt-4"
          summary={
            locale === "ar"
              ? "افتح قائمة عمل مركزة لكل مالك مصدر لمراجعة مهام التحديث وفجوات الأدلة والاعتمادات المرتبطة بمصادره."
              : "Open a focused work queue for each source owner across refresh tasks, evidence gaps, and pending approvals tied to their sources."
          }
        >
          {ownerQueueSummaries.length === 0 ? (
            <EmptyState
              summary={locale === "ar" ? "لا توجد مصادر ضمن هذا النطاق." : "No sources exist inside this scope."}
              title={locale === "ar" ? "لا توجد قوائم" : "No queues"}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {ownerQueueSummaries.map((queue) => (
                <WorkflowCard
                  key={queue.ownerName}
                  badges={
                    <div className={statusRowWrapClassName}>
                      <StatusBadge tone={queue.isActive ? "warning" : "neutral"}>{queue.isActive ? (locale === "ar" ? "محدد" : "Scoped") : queue.ownerLabel}</StatusBadge>
                      <StatusBadge>{locale === "ar" ? `${queue.sourceCount} مصادر` : `${queue.sourceCount} sources`}</StatusBadge>
                      <StatusBadge>{locale === "ar" ? `${queue.projectCount} مشاريع` : `${queue.projectCount} projects`}</StatusBadge>
                    </div>
                  }
                  summary={
                    locale === "ar"
                      ? `${queue.openEvidenceGapsCount} فجوات أدلة، ${queue.openRefreshTasksCount} مهام تحديث، ${queue.pendingApprovalsCount} اعتمادات معلقة`
                      : `${queue.openEvidenceGapsCount} evidence gaps, ${queue.openRefreshTasksCount} refresh tasks, ${queue.pendingApprovalsCount} pending approvals`
                  }
                  title={queue.ownerLabel}
                >
                  <DetailGrid>
                    <DetailItem label={locale === "ar" ? "حقائق نشطة" : "Active facts"} value={String(queue.activeFactsCount)} />
                    <DetailItem label={locale === "ar" ? "قريبة الانتهاء" : "Expiring"} value={String(queue.expiringSoonFactsCount)} />
                    <DetailItem label={locale === "ar" ? "قديمة" : "Stale"} value={String(queue.staleFactsCount)} />
                  </DetailGrid>
                  <Link className={inlineLinkClassName} href={queue.href}>
                    {locale === "ar" ? "فتح قائمة المالك" : "Open owner queue"}
                  </Link>
                </WorkflowCard>
              ))}
            </div>
          )}
        </WorkflowPanelBody>
      </Panel>

      <div className={twoColumnGridClassName}>
        <Panel title={locale === "ar" ? "إضافة مصدر" : "Add source"}>
          <WorkflowPanelBody className="mt-4" summary={locale === "ar" ? "ابدأ مصدر مخزون أو سياسة أو ملف مبيعات للعميل." : "Start an inventory, policy, or sales-sheet source for the client."}>
            <CommercialSourceCreateForm canManage={canManage} locale={locale} returnPath={currentReturnPath} />
          </WorkflowPanelBody>
        </Panel>

        <Panel title={locale === "ar" ? "حقيقة يدوية" : "Manual fact"}>
          <WorkflowPanelBody className="mt-4" summary={locale === "ar" ? "استخدمها للسياسات والرسوم وشروط الزيارة التي لا تأتي من CSV." : "Use this for policies, fees, and visit terms that do not come from CSV."}>
            <ManualCommercialFactForm canManage={canManage} locale={locale} returnPath={currentReturnPath} />
          </WorkflowPanelBody>
        </Panel>
      </div>

      <Panel title={locale === "ar" ? "مراجعة الصلاحية" : "Expiry review"}>
        <WorkflowPanelBody
          className="mt-4"
          summary={
            locale === "ar"
              ? "راجع الحقائق التي اقتربت من الانتهاء أو أصبحت قديمة قبل أن تتسبب في إيقاف الردود التجارية."
              : "Review facts that are expiring or stale before they start blocking commercial replies."
          }
        >
          {factsNeedingReview.length === 0 ? (
            <EmptyState
              summary={locale === "ar" ? "كل الحقائق النشطة ضمن نافذة صلاحية مقبولة." : "All active facts are inside an acceptable freshness window."}
              title={locale === "ar" ? "لا توجد مراجعة مطلوبة" : "No review required"}
            />
          ) : (
            <div className="grid gap-4">
              {factsNeedingReview.map((fact) => (
                <WorkflowListItem
                  key={fact.factId}
                  badges={
                    <div className={statusRowWrapClassName}>
                      <StatusBadge tone={fact.freshnessStatus === "expiring_soon" ? "warning" : "critical"}>{fact.freshnessStatus}</StatusBadge>
                      <StatusBadge>{fact.kind}</StatusBadge>
                      <StatusBadge>{fact.locale}</StatusBadge>
                    </div>
                  }
                  meta={
                    <p className={caseMetaClassName}>
                      {locale === "ar" ? "تنتهي:" : "Expires:"} {fact.expiresAt ?? "-"}
                    </p>
                  }
                  summary={fact.content}
                  title={fact.title}
                >
                  <CommercialFactExpiryReviewForm canManage={canManage} fact={fact} locale={locale} returnPath={currentReturnPath} />
                </WorkflowListItem>
              ))}
            </div>
          )}
        </WorkflowPanelBody>
      </Panel>

      <Panel title={locale === "ar" ? "مهام تحديث المصدر" : "Source refresh tasks"}>
        <WorkflowPanelBody
          className="mt-4"
          summary={
            locale === "ar"
              ? "أي مراجعة صلاحية تنتهي بقرار تحديث المصدر تفتح مهمة هنا حتى لا يبقى القرار في السجل فقط."
              : "Any expiry review marked source refresh required opens a task here so the decision does not stay buried in history."
          }
        >
          {openRefreshTasks.length === 0 ? (
            <EmptyState
              summary={locale === "ar" ? "لا توجد مهام تحديث مصدر مفتوحة." : "No source refresh tasks are open."}
              title={locale === "ar" ? "لا توجد مهام" : "No tasks"}
            />
          ) : (
            <div className="grid gap-4">
              {openRefreshTasks.slice(0, 12).map((task) => (
                <WorkflowListItem
                  key={task.taskId}
                  badges={
                    <div className={statusRowWrapClassName}>
                      <StatusBadge tone="warning">{task.status}</StatusBadge>
                      <StatusBadge>{task.source.sourceType}</StatusBadge>
                      <StatusBadge>{task.source.projectCode}</StatusBadge>
                    </div>
                  }
                  meta={
                    <p className={caseMetaClassName}>
                      {locale === "ar" ? "المالك:" : "Owner:"} {task.source.ownerName ?? (locale === "ar" ? "غير معين" : "Unassigned")}
                      {" · "}
                      {locale === "ar" ? "مطلوبة قبل:" : "Due:"} {task.dueAt ?? "-"}
                    </p>
                  }
                  summary={task.reason}
                  title={task.fact?.title ?? task.source.sourceName}
                >
                  <SourceRefreshTaskResolutionForm canManage={canManage} locale={locale} returnPath={currentReturnPath} task={task} />
                </WorkflowListItem>
              ))}
            </div>
          )}
        </WorkflowPanelBody>
      </Panel>

      <Panel title={locale === "ar" ? "فجوات الأدلة التجارية" : "Commercial evidence gaps"}>
        <WorkflowPanelBody
          className="mt-4"
          summary={
            locale === "ar"
              ? "تظهر هنا مسودات الرد التي مُنعت من دخول الجودة لأن المشروع يفتقد حقيقة تجارية معتمدة."
              : "Reply drafts blocked before QA appear here when the project is missing an approved commercial fact."
          }
        >
          {openEvidenceGaps.length === 0 ? (
            <EmptyState
              summary={locale === "ar" ? "لا توجد فجوات أدلة مفتوحة." : "No commercial evidence gaps are open."}
              title={locale === "ar" ? "لا توجد فجوات" : "No gaps"}
            />
          ) : (
            <div className="grid gap-4">
              {openEvidenceGaps.slice(0, 12).map((gap) => (
                <WorkflowListItem
                  key={gap.gapId}
                  badges={
                    <div className={statusRowWrapClassName}>
                      <StatusBadge tone="critical">{gap.status}</StatusBadge>
                      <StatusBadge>{gap.kind}</StatusBadge>
                      <StatusBadge>{gap.projectCode}</StatusBadge>
                    </div>
                  }
                  meta={
                    <p className={caseMetaClassName}>
                      {locale === "ar" ? "مالك المشروع:" : "Project owner:"}{" "}
                      {(ownersByProject.get(gap.projectCode) ?? []).join(locale === "ar" ? "، " : ", ") || (locale === "ar" ? "غير معين" : "Unassigned")}
                      {" · "}
                      {locale === "ar" ? "آخر تحديث:" : "Updated:"} {gap.updatedAt}
                    </p>
                  }
                  summary={gap.summary}
                  title={locale === "ar" ? "فجوة أدلة لمسودة رد" : "Reply draft evidence gap"}
                >
                  {gap.warnings.length > 0 ? (
                    <p className={caseMetaClassName}>{gap.warnings.join(locale === "ar" ? "، " : ", ")}</p>
                  ) : null}
                  {gap.draftMessage ? <p className="text-sm leading-7 text-ink-soft">{gap.draftMessage}</p> : null}
                  <CommercialEvidenceGapResolutionForm canManage={canManage} gap={gap} locale={locale} returnPath={currentReturnPath} />
                </WorkflowListItem>
              ))}
            </div>
          )}
        </WorkflowPanelBody>
      </Panel>

      <Panel title={locale === "ar" ? "المصادر" : "Sources"}>
        <WorkflowPanelBody className="mt-4">
          {scopedSources.length === 0 ? (
            <EmptyState
              summary={
                hasScopedQueue
                  ? locale === "ar"
                    ? "لا توجد مصادر تجارية ضمن هذا النطاق."
                    : "No commercial sources match this queue scope."
                  : locale === "ar"
                    ? "لا توجد مصادر تجارية حيّة بعد."
                    : "No live commercial sources exist yet."
              }
              title={locale === "ar" ? "لا توجد مصادر" : "No sources"}
            />
          ) : (
            <div className="grid gap-4">
              {scopedSources.map((source) => (
                <WorkflowCard
                  key={source.sourceId}
                  badges={
                    <div className={statusRowWrapClassName}>
                      <StatusBadge>{source.sourceType}</StatusBadge>
                      <StatusBadge tone={source.pendingProposalsCount > 0 ? "warning" : "success"}>{source.state}</StatusBadge>
                    </div>
                  }
                  summary={source.description ?? (locale === "ar" ? "مصدر تجاري محلي." : "Local commercial source.")}
                  title={source.sourceName}
                >
                  <DetailGrid>
                    <DetailItem label={locale === "ar" ? "المشروع" : "Project"} value={source.projectCode} />
                    <DetailItem label={locale === "ar" ? "مالك المصدر" : "Source owner"} value={source.ownerName ?? "-"} />
                    <DetailItem label={locale === "ar" ? "الحقائق النشطة" : "Active facts"} value={String(source.activeFactsCount)} />
                    <DetailItem label={locale === "ar" ? "مقترحات معلقة" : "Pending proposals"} value={String(source.pendingProposalsCount)} />
                    <DetailItem label={locale === "ar" ? "مهام تحديث" : "Refresh tasks"} value={String(source.openRefreshTasksCount)} />
                    <DetailItem label={locale === "ar" ? "آخر نسخة" : "Latest version"} value={source.latestVersion?.versionLabel ?? "-"} />
                  </DetailGrid>
                  <Link className={inlineLinkClassName} href={`/${locale}/commercial-sources/${source.sourceId}`}>
                    {locale === "ar" ? "فتح المصدر" : "Open source"}
                  </Link>
                </WorkflowCard>
              ))}
            </div>
          )}
        </WorkflowPanelBody>
      </Panel>

      <Panel title={locale === "ar" ? "سجل مراجعات الصلاحية" : "Expiry review history"}>
        <WorkflowPanelBody className="mt-4">
          {scopedExpiryReviews.length === 0 ? (
            <EmptyState
              summary={locale === "ar" ? "ستظهر قرارات التجديد والأرشفة هنا." : "Renewal and archive decisions will appear here."}
              title={locale === "ar" ? "لا توجد مراجعات" : "No reviews"}
            />
          ) : (
            <div className="grid gap-4">
              {scopedExpiryReviews.slice(0, 12).map((review) => (
                <WorkflowCard
                  key={review.reviewId}
                  badges={<StatusBadge tone={review.outcome === "renewed" ? "success" : review.outcome === "archived" ? "critical" : "warning"}>{review.outcome}</StatusBadge>}
                  summary={review.summary}
                  title={review.fact?.title ?? review.factId}
                >
                  <DetailGrid>
                    <DetailItem label={locale === "ar" ? "المراجع" : "Reviewer"} value={review.reviewedByName ?? "-"} />
                    <DetailItem label={locale === "ar" ? "المشروع" : "Project"} value={review.fact?.projectCode ?? "-"} />
                    <DetailItem label={locale === "ar" ? "تاريخ القرار" : "Decision time"} value={review.createdAt} />
                  </DetailGrid>
                </WorkflowCard>
              ))}
            </div>
          )}
        </WorkflowPanelBody>
      </Panel>
    </div>
  );
}
