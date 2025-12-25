import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
    weight: ['100', '300', '400', '500', '700', '900'],
    subsets: ['latin'],
    variable: '--font-noto',
    display: 'swap',
});

export const metadata: Metadata = {
    title: "DailyPort - Secure Local Stock Analysis",
    description: "Secure, local-first stock analysis combining the safety of local API storage with the convenience of web-based tools.",
};

import { ThemeProvider } from "@/context/ThemeContext";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <body
                className={`${notoSansKr.className} antialiased bg-background text-foreground transition-colors duration-300`}
            >
                <ThemeProvider>
                    <main className="min-h-screen">
                        {children}
                    </main>
                </ThemeProvider>
            </body>
        </html>
    );
}
