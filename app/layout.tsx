import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";
import Provider from "@/util/Provider";
import { Inter } from "next/font/google";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wedin",
  description: "Organize your wedding with Wedin",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased sm:min-h-[100vh]`}>
        <SessionProvider session={session}>
          <Toaster />
          <Provider>{children}</Provider>
        </SessionProvider>
      </body>
    </html>
  );
}
