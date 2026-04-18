import { getLocalizedText, type ConversationMessage, type SupportedLocale } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";
import {
  ActivityEntry,
  ActivityFeed,
  EmptyState,
  HighlightNotice,
  StatusBadge,
  bodyTextClassName
} from "@real-estate-ai/ui";

export function MessageThread(props: {
  locale: SupportedLocale;
  messages: ConversationMessage[];
}) {
  const ui = getMessages(props.locale);

  if (props.messages.length === 0) {
    return (
      <EmptyState
        summary={ui.states.emptyMessagesSummary}
        testId="conversation-empty-state"
        title={ui.states.emptyMessagesTitle}
      />
    );
  }

  return (
    <ActivityFeed testId="conversation-thread">
      {props.messages.map((message) => (
        <ActivityEntry
          key={message.id}
          badges={message.state ? <StatusBadge tone="warning">{getLocalizedText(message.state, props.locale)}</StatusBadge> : null}
          meta={<span>{message.timestamp}</span>}
          summary={getLocalizedText(message.body, props.locale)}
          title={ui.common[message.sender]}
        >
          {message.translation ? (
            <HighlightNotice tone="ai">
              <p className={bodyTextClassName}>{getLocalizedText(message.translation, props.locale)}</p>
            </HighlightNotice>
          ) : null}
        </ActivityEntry>
      ))}
    </ActivityFeed>
  );
}
