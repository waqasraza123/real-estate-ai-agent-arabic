import type { ReactNode } from "react";

import { headers } from "next/headers";
import { Noto_Kufi_Arabic, Space_Grotesk } from "next/font/google";

import type { SupportedLocale } from "@real-estate-ai/domain";
import { getDirection, getMessages, isSupportedLocale } from "@real-estate-ai/i18n";

import { AppChrome } from "@/components/app-chrome";
import { getCurrentOperatorRole } from "@/lib/operator-session";

import "./globals.css";

const latinFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-latin",
  weight: ["400", "500", "700"]
});

const arabicFont = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  weight: ["400", "500", "700"]
});

export default async function RootLayout(props: {
  children: ReactNode;
}) {
  const requestHeaders = await headers();
  const headerLocale = requestHeaders.get("x-locale");
  const locale: SupportedLocale = headerLocale && isSupportedLocale(headerLocale) ? headerLocale : "en";
  const messages = getMessages(locale);
  const currentOperatorRole = await getCurrentOperatorRole();

  return (
    <html className={`${latinFont.variable} ${arabicFont.variable}`} dir={getDirection(locale)} lang={locale}>
      <body className={`app-body locale-${locale}`}>
        <AppChrome currentOperatorRole={currentOperatorRole} locale={locale} messages={messages}>
          {props.children}
        </AppChrome>
      </body>
    </html>
  );
}
