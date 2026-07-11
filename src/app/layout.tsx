import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Providers } from "./providers";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-fondo text-texto font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
