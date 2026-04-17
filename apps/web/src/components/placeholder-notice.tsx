import type { SupportedLocale } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";
import { placeholderNoticeClassName } from "@real-estate-ai/ui";

export function PlaceholderNotice(props: {
  locale: SupportedLocale;
}) {
  const messages = getMessages(props.locale);

  return <div className={placeholderNoticeClassName}>{messages.common.placeholderNotice}</div>;
}
