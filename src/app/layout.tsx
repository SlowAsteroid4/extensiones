import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "800"],
});

export const metadata: Metadata = {
  title: "Extensiones",
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
        {children}
      </body>
    </html>
  );
}
