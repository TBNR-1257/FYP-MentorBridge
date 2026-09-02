// Student Name: Bryan Wong Tze Hern
// Student ID: TP086538

import { Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SidebarProvider } from "@/lib/sidebar-context";
import { NotificationProvider } from "@/lib/notification-context";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata = {
  title: "MentorBridge",
  description: "Volunteer mentoring platform connecting students with volunteer mentors.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <NotificationProvider>
            <SidebarProvider>
              <Navbar />
              <Sidebar />
              {children}
              <Footer />
            </SidebarProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
