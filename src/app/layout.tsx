import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { Providers } from "./providers";
import { ScriptTema } from "@/shared/tema/script-tema";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  // Pesos del design system "Magenta audaz": cuerpo 500, label 600, H3/botón 700,
  // display 800 (400 disponible como regular del DS).
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Lizzy & Stephy · Extensiones",
  description: "Tienda de extensiones de cabello 100% natural.",
};

// Barra del navegador móvil a juego con --color-fondo-pagina de cada tema.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f070c" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: ScriptTema escribe data-tema en el <html>
    // antes de hidratar, así que el atributo no coincide con el del servidor.
    <html lang="es" className={`${poppins.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <ScriptTema />
      </head>
      <body className="min-h-full flex flex-col bg-fondo-pagina text-texto font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
