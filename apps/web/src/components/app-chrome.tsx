"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import type { OperatorRole } from "@real-estate-ai/contracts";
import { canOperatorRoleAccessWorkspace } from "@real-estate-ai/contracts";
import type { SupportedLocale } from "@real-estate-ai/domain";
import type { AppMessages } from "@real-estate-ai/i18n";
import { getLocaleLabel, locales } from "@real-estate-ai/i18n";
import {
  appBackdropClassName,
  chromeActionsClassName,
  chromeBrandClassName,
  chromeBrandCopyClassName,
  chromeBrandTitleClassName,
  chromeHeaderClassName,
  chromeHeaderInnerClassName,
  chromeLayoutClassName,
  chromeMainClassName,
  chromeRoleGroupClassName,
  chromeRoleNoteClassName,
  chromeShellClassName,
  chromeSidebarClassName,
  chromeStatusClassName,
  localeLinkClassName,
  localeSwitchClassName,
  sidebarLabelClassName,
  sidebarLinkClassName,
  sidebarLinkSummaryClassName,
  sidebarLinkTitleClassName,
  sidebarStackClassName,
  skipLinkClassName
} from "@real-estate-ai/ui";

import { OperatorRoleSwitcher } from "@/components/operator-role-switcher";
import { replacePathLocale } from "@/lib/locale";
import { getQaWorkspaceCopy } from "@/lib/qa-workspace";

export function AppChrome(props: {
  children: ReactNode;
  currentOperatorRole: OperatorRole;
  locale: SupportedLocale;
  messages: AppMessages;
}) {
  const pathname = usePathname();
  const qaWorkspaceCopy = getQaWorkspaceCopy(props.locale);
  const navigation = [
    {
      href: `/${props.locale}`,
      label: props.messages.navigation.landing,
      summary: props.messages.app.shellNote,
      visible: true
    },
    {
      href: `/${props.locale}/dashboard`,
      label: props.messages.navigation.dashboard,
      summary: props.messages.dashboard.title,
      visible: true
    },
    {
      href: `/${props.locale}/leads`,
      label: props.messages.navigation.leads,
      summary: props.messages.leads.title,
      visible: canOperatorRoleAccessWorkspace("sales", props.currentOperatorRole)
    },
    {
      href: `/${props.locale}/manager`,
      label: props.messages.navigation.manager,
      summary: props.messages.manager.title,
      visible:
        canOperatorRoleAccessWorkspace("manager_revenue", props.currentOperatorRole) ||
        canOperatorRoleAccessWorkspace("manager_handover", props.currentOperatorRole)
    },
    {
      href: `/${props.locale}/qa`,
      label: props.messages.navigation.qa,
      summary: qaWorkspaceCopy.title,
      visible: canOperatorRoleAccessWorkspace("qa", props.currentOperatorRole)
    }
  ].filter((item) => item.visible);

  return (
    <div className={chromeShellClassName} data-testid="app-chrome">
      <div aria-hidden="true" className={appBackdropClassName} />
      <a className={skipLinkClassName} href="#main-content">
        {props.messages.common.skipToContent}
      </a>

      <header className={chromeHeaderClassName}>
        <div className={chromeHeaderInnerClassName}>
          <div className={chromeBrandClassName}>
            <strong className={chromeBrandTitleClassName}>{props.messages.app.name}</strong>
            <p className={chromeBrandCopyClassName}>{props.messages.app.shellNote}</p>
          </div>
          <div className={chromeActionsClassName}>
            <span className={chromeStatusClassName}>{props.messages.app.phaseLabel}</span>
            <div className={chromeRoleGroupClassName}>
              <OperatorRoleSwitcher currentOperatorRole={props.currentOperatorRole} messages={props.messages} />
              <p className={chromeRoleNoteClassName}>{props.messages.common.roleGuardNote}</p>
            </div>
            <nav aria-label={props.messages.common.switchLanguage} className={localeSwitchClassName}>
              {locales.map((locale) => (
                <Link
                  key={locale}
                  aria-current={props.locale === locale ? "page" : undefined}
                  className={localeLinkClassName(props.locale === locale)}
                  href={replacePathLocale(pathname, locale)}
                >
                  {getLocaleLabel(locale)}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <div className={chromeLayoutClassName}>
        <aside className={chromeSidebarClassName}>
          <p className={sidebarLabelClassName}>{props.messages.app.phaseLabel}</p>
          <nav
            aria-label={props.messages.common.primaryNavigation}
            className={sidebarStackClassName}
            data-testid="primary-navigation"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={sidebarLinkClassName(pathname === item.href)}
                href={item.href}
              >
                <strong className={sidebarLinkTitleClassName}>{item.label}</strong>
                <span className={sidebarLinkSummaryClassName}>{item.summary}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className={chromeMainClassName} data-testid="chrome-main" id="main-content" tabIndex={-1}>
          {props.children}
        </main>
      </div>
    </div>
  );
}
