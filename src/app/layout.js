import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "EV Tracker CRM",
  description: "Dashboard de Inteligência +EV",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="app-container">
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
