import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "StyleCraft",
  description: "Craft Your Style. Own Your Story.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Manrope:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>
        {children}
        <footer style={{ textAlign: "center", padding: "24px 16px", fontSize: 13 }}><a href="/privacy">Privacy notice</a></footer>
      </body>
    </html>
  );
}
