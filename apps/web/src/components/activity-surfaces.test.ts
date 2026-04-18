import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ConversationMessage, JourneyEvent } from "@real-estate-ai/domain";

import { MessageThread } from "./message-thread";
import { TimelinePanel } from "./timeline-panel";

Object.assign(globalThis, { React });

const sampleMessages: ConversationMessage[] = [
  {
    body: {
      ar: "أحتاج تفاصيل الموعد.",
      en: "I need the visit details."
    },
    id: "message-1",
    sender: "customer",
    state: {
      ar: "بانتظار مراجعة المدير",
      en: "Awaiting manager review"
    },
    timestamp: "2026-04-18 10:00",
    translation: {
      ar: "تمت ترجمة الرسالة آلياً للفريق.",
      en: "The message was translated for the team."
    }
  }
];

const sampleEvents: JourneyEvent[] = [
  {
    detail: {
      ar: "تمت جدولة الاتصال التأهيلي مع المشتري.",
      en: "The qualification call was scheduled with the buyer."
    },
    id: "event-1",
    timestamp: "2026-04-18 11:30",
    title: {
      ar: "تم حجز المكالمة",
      en: "Call booked"
    }
  }
];

describe("activity surfaces", () => {
  it("renders the shared message thread entry contract with translation context", () => {
    const html = renderToStaticMarkup(createElement(MessageThread, { locale: "en", messages: sampleMessages }));

    expect(html).toContain('data-testid="conversation-thread"');
    expect(html).toContain("Customer");
    expect(html).toContain("Awaiting manager review");
    expect(html).toContain("I need the visit details.");
    expect(html).toContain("The message was translated for the team.");
    expect(html).toContain("2026-04-18 10:00");
  });

  it("renders the Arabic empty-state copy for conversation surfaces", () => {
    const html = renderToStaticMarkup(createElement(MessageThread, { locale: "ar", messages: [] }));

    expect(html).toContain("لا توجد رسائل بعد");
    expect(html).toContain("واجهة المحادثة جاهزة");
  });

  it("renders timeline events inside the shared panel and activity feed", () => {
    const html = renderToStaticMarkup(createElement(TimelinePanel, { events: sampleEvents, locale: "en" }));

    expect(html).toContain("Timeline");
    expect(html).toContain("Call booked");
    expect(html).toContain("The qualification call was scheduled with the buyer.");
    expect(html).toContain("2026-04-18 11:30");
  });

  it("renders the Arabic empty-state copy for timeline surfaces", () => {
    const html = renderToStaticMarkup(createElement(TimelinePanel, { events: [], locale: "ar" }));

    expect(html).toContain("التسلسل الزمني");
    expect(html).toContain("لا توجد أحداث زمنية بعد");
    expect(html).toContain("سيظهر التسلسل الزمني هنا");
  });
});
