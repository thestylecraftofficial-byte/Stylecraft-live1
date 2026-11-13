import type { Metadata } from "next";

// The form is reached only through a personal link, so it stays out of search results.
export const metadata: Metadata = { title: "Your style report · StyleCraft", robots: { index: false, follow: false } };

export default function StartLayout({ children }: { children: React.ReactNode }) { return children; }
