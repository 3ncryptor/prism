import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GrauityProviders } from "@/lib/grauityProviders";
import { StyledComponentsRegistry } from "@/lib/styledComponentsRegistry";
import "./globals.css";
import "./grauity.scss";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prism",
  description:
    "Explainable resume-to-JD matching for university placement cells.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <StyledComponentsRegistry>
          <GrauityProviders>{children}</GrauityProviders>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
