import Link from "next/link";

import { type SupportedLocale } from "@real-estate-ai/domain";
import { getMessages, isSupportedLocale } from "@real-estate-ai/i18n";
import { Panel, pageStackClassName, panelSummaryClassName, primaryLinkClassName } from "@real-estate-ai/ui";

interface PageProps {
  params?: Promise<{ locale?: string }>;
}

export default async function NotFoundPage(props: PageProps) {
  const resolvedParams = props.params ? await props.params : undefined;
  const locale: SupportedLocale = resolvedParams?.locale && isSupportedLocale(resolvedParams.locale) ? resolvedParams.locale : "ar";
  const messages = getMessages(locale);

  return (
    <div className={pageStackClassName}>
      <Panel title={messages.app.name}>
        <p className={panelSummaryClassName}>{messages.common.placeholderNotice}</p>
        <Link className={primaryLinkClassName} href={`/${locale}`}>
          {messages.navigation.landing}
        </Link>
      </Panel>
    </div>
  );
}
