import type { MetadataRoute } from "next";

/** Web app manifest — torna o Asafe instalável ("adicionar à tela inicial") e standalone. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Asafe — repertórios litúrgicos",
    short_name: "Asafe",
    description: "Organize e compartilhe repertórios de música litúrgica católica.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4eee1",
    theme_color: "#2f3a5e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
