import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { Fraunces, Inter } from "next/font/google";
import { PREFS_COOKIE, parsePrefs } from "@/lib/preferences";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });

export const metadata: Metadata = {
  title: "Asafe",
  description: "Organize e compartilhe repertórios de música litúrgica católica.",
  appleWebApp: { capable: true, title: "Asafe", statusBarStyle: "default" },
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
