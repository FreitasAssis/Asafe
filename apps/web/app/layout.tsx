import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { Fraunces, Inter } from "next/font/google";
import { PREFS_COOKIE, parsePrefs } from "@/lib/preferences";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });

const DESCRIPTION =
  "Prepare a música da celebração: repertórios por momento, liturgia do dia, cifras, Ao vivo e Projeção. Grátis e open source.";

export const metadata: Metadata = {
  metadataBase: new URL("https://asafe.mus.br"),
  title: "Asafe",
  description: DESCRIPTION,
  appleWebApp: { capable: true, title: "Asafe", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: "Asafe",
    title: "Asafe — repertórios litúrgicos",
    description: DESCRIPTION,
    url: "/",
    locale: "pt_BR",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Asafe — prepare a música da celebração" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Asafe — repertórios litúrgicos",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4eee1" },
    { media: "(prefers-color-scheme: dark)", color: "#1e1c1a" },
  ],
};

// Sem cookie de tema (1º acesso), aplica a preferência do sistema antes do paint.
const NO_FLASH = `(function(){try{var d=document.documentElement;if(!d.getAttribute('data-theme')){d.setAttribute('data-theme',matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}}catch(e){}})();`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = parsePrefs((await cookies()).get(PREFS_COOKIE)?.value).theme;

  return (
    <html
      lang="pt-BR"
      data-theme={theme}
      className={`${inter.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
