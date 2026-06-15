import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POS Tickets",
  description: "Sistema POS com backoffice, relatórios diários e impressão de tickets."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
