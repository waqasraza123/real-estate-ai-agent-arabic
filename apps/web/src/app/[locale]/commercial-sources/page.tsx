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

import { CommercialFactExpiryReviewForm, CommercialSourceCreateForm, ManualCommercialFactForm, SourceRefreshTaskResolutionForm } from "@/components/commercial-source-forms";
import { ScreenIntro } from "@/components/screen-intro";
import { getCurrentOperatorRole } from "@/lib/operator-session";
import { tryListActiveCommercialFacts, tryListCommercialFactExpiryReviews, tryListCommercialFactProposals, tryListCommercialSourceRefreshTasks, tryListCommercialSources } from "@/lib/live-api";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: SupportedLocale }>;
}

export default async function CommercialSourcesPage(props: PageProps) {
  const { locale } = await props.params;
  const messages = getMessages(locale);
  const role = await getCurrentOperatorRole();
  const canManage = canOperatorRolePerform("manage_commercial_sources", role);
  const [sources, proposals, facts, expiryReviews, refreshTasks] = await Promise.all([
    tryListCommercialSources(role),
    tryListCommercialFactProposals(role),
    tryListActiveCommercialFacts(role),
    tryListCommercialFactExpiryReviews(role),
    tryListCommercialSourceRefreshTasks(role)
  ]);
  const staleFacts = facts.filter((fact) => fact.freshnessStatus === "stale" || fact.freshnessStatus === "expired");
  const expiringFacts = facts.filter((fact) => fact.freshnessStatus === "expiring_soon");
  const factsNeedingReview = [...expiringFacts, ...staleFacts].slice(0, 12);
  const openRefreshTasks = refreshTasks.filter((task) => task.status === "open");

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
        <MetricTile detail={locale === "ar" ? "مسموح بها للردود التجارية" : "Allowed for commercial replies"} label={locale === "ar" ? "حقائق نشطة" : "Active facts"} tone="ocean" value={String(facts.length)} />
        <MetricTile detail={locale === "ar" ? "تحتاج قرار مدير" : "Need manager decision"} label={locale === "ar" ? "بانتظار الاعتماد" : "Pending approvals"} tone="sand" value={String(proposals.filter((item) => item.state === "pending_review").length)} />
        <MetricTile detail={locale === "ar" ? "نشطة لكن تحتاج مراجعة" : "Active but needs review"} label={locale === "ar" ? "تنتهي قريباً" : "Expiring soon"} tone="rose" value={String(expiringFacts.length)} />
        <MetricTile detail={locale === "ar" ? "تحتاج تحديث مصدر" : "Need source refresh"} label={locale === "ar" ? "مهام مفتوحة" : "Open tasks"} tone="mint" value={String(openRefreshTasks.length)} />
      </div>

      <div className={twoColumnGridClassName}>
        <Panel title={locale === "ar" ? "إضافة مصدر" : "Add source"}>
          <WorkflowPanelBody className="mt-4" summary={locale === "ar" ? "ابدأ مصدر مخزون أو سياسة أو ملف مبيعات للعميل." : "Start an inventory, policy, or sales-sheet source for the client."}>
            <CommercialSourceCreateForm canManage={canManage} locale={locale} returnPath={`/${locale}/commercial-sources`} />
          </WorkflowPanelBody>
        </Panel>

        <Panel title={locale === "ar" ? "حقيقة يدوية" : "Manual fact"}>
          <WorkflowPanelBody className="mt-4" summary={locale === "ar" ? "استخدمها للسياسات والرسوم وشروط الزيارة التي لا تأتي من CSV." : "Use this for policies, fees, and visit terms that do not come from CSV."}>
            <ManualCommercialFactForm canManage={canManage} locale={locale} returnPath={`/${locale}/commercial-sources`} />
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
                  <CommercialFactExpiryReviewForm canManage={canManage} fact={fact} locale={locale} returnPath={`/${locale}/commercial-sources`} />
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
                      {locale === "ar" ? "مطلوبة قبل:" : "Due:"} {task.dueAt ?? "-"}
                    </p>
                  }
                  summary={task.reason}
                  title={task.fact?.title ?? task.source.sourceName}
                >
                  <SourceRefreshTaskResolutionForm canManage={canManage} locale={locale} returnPath={`/${locale}/commercial-sources`} task={task} />
                </WorkflowListItem>
              ))}
            </div>
          )}
        </WorkflowPanelBody>
      </Panel>

      <Panel title={locale === "ar" ? "المصادر" : "Sources"}>
        <WorkflowPanelBody className="mt-4">
          {sources.length === 0 ? (
            <EmptyState
              summary={locale === "ar" ? "لا توجد مصادر تجارية حيّة بعد." : "No live commercial sources exist yet."}
              title={locale === "ar" ? "لا توجد مصادر" : "No sources"}
            />
          ) : (
            <div className="grid gap-4">
              {sources.map((source) => (
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
          {expiryReviews.length === 0 ? (
            <EmptyState
              summary={locale === "ar" ? "ستظهر قرارات التجديد والأرشفة هنا." : "Renewal and archive decisions will appear here."}
              title={locale === "ar" ? "لا توجد مراجعات" : "No reviews"}
            />
          ) : (
            <div className="grid gap-4">
              {expiryReviews.slice(0, 12).map((review) => (
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
