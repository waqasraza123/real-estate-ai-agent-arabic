"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import type { SupportedLocale } from "@real-estate-ai/domain";
import type { AppMessages } from "@real-estate-ai/i18n";
import { getLocaleLabel, toggleLocale } from "@real-estate-ai/i18n";
import { cx } from "@real-estate-ai/ui";

export function AppChrome(props: {
  children: ReactNode;
  locale: SupportedLocale;
  messages: AppMessages;
}) {
  const pathname = usePathname();
  const alternateLocale = toggleLocale(props.locale);
  const alternatePath = replaceLocale(pathname, alternateLocale);
  const navigation = [
    {
      href: `/${props.locale}`,
      label: props.messages.navigation.landing,
      summary: props.messages.app.shellNote
    },
    {
      href: `/${props.locale}/dashboard`,
      label: props.messages.navigation.dashboard,
      summary: props.messages.dashboard.title
    },
    {
      href: `/${props.locale}/leads`,
      label: props.messages.navigation.leads,
      summary: props.messages.leads.title
    },
    {
      href: `/${props.locale}/manager`,
      label: props.messages.navigation.manager,
      summary: props.messages.manager.title
    }
  ];

  return (
    <div className="chrome-shell" data-testid="app-chrome">
      <header className="chrome-header">
        <div className="chrome-brand">
          <strong>{props.messages.app.name}</strong>
          <p>{props.messages.app.shellNote}</p>
        </div>
        <div className="chrome-actions">
          <span className="chrome-status">{props.messages.app.phaseLabel}</span>
          <nav aria-label={props.messages.common.switchLanguage} className="locale-switch">
            <Link className={cx(props.locale === "en" && "locale-active")} href={replaceLocale(pathname, "en")}>
              {getLocaleLabel("en")}
            </Link>
            <Link className={cx(props.locale === "ar" && "locale-active")} href={replaceLocale(pathname, "ar")}>
              {getLocaleLabel("ar")}
            </Link>
            <Link href={alternatePath}>{props.messages.common.switchLanguage}</Link>
          </nav>
        </div>
      </header>

      <div className="chrome-layout">
        <aside className="chrome-sidebar">
          <p className="sidebar-label">{props.messages.app.phaseLabel}</p>
          <nav aria-label={props.messages.common.manager} className="sidebar-stack" data-testid="primary-navigation">
            {navigation.map((item) => (
              <Link
                key={item.href}
                className={cx("sidebar-link", pathname === item.href && "sidebar-link-active")}
                href={item.href}
              >
                <strong>{item.label}</strong>
                <span>{item.summary}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="chrome-main" data-testid="chrome-main">
          {props.children}
        </main>
      </div>
    </div>
  );
}

function replaceLocale(pathname: string, locale: SupportedLocale): string {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return `/${locale}`;
  }

  if (segments[0] === "en" || segments[0] === "ar") {
    segments[0] = locale;
    return `/${segments.join("/")}`;
  }

  return `/${locale}/${segments.join("/")}`;
}
