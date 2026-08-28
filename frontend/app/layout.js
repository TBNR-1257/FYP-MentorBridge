import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SidebarProvider } from "@/lib/sidebar-context";
import { NotificationProvider } from "@/lib/notification-context";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "MentorBridge",
  description: "Volunteer mentoring platform connecting students with volunteer mentors.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <NotificationProvider>
            <SidebarProvider>
              <Navbar />
              <Sidebar />
              {children}
            </SidebarProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
