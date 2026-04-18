import { getLocalizedText, type JourneyEvent, type SupportedLocale } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";
import { ActivityEntry, ActivityFeed, EmptyState, Panel, WorkflowPanelBody } from "@real-estate-ai/ui";

export function TimelinePanel(props: {
  events: JourneyEvent[];
  locale: SupportedLocale;
}) {
  const messages = getMessages(props.locale);

  if (props.events.length === 0) {
    return (
      <Panel title={messages.common.timeline}>
        <EmptyState summary={messages.states.emptyTimelineSummary} title={messages.states.emptyTimelineTitle} />
      </Panel>
    );
  }

  return (
    <Panel title={messages.common.timeline}>
      <WorkflowPanelBody className="mt-4">
        <ActivityFeed>
          {props.events.map((event) => (
            <ActivityEntry
              key={event.id}
              meta={<span>{event.timestamp}</span>}
              summary={getLocalizedText(event.detail, props.locale)}
              title={getLocalizedText(event.title, props.locale)}
            />
          ))}
        </ActivityFeed>
      </WorkflowPanelBody>
    </Panel>
  );
}
