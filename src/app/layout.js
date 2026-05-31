import "./globals.css";
import AppContent from "./AppContent";
import { AuthProvider } from "../context/AuthContext";

export const metadata = {
  title: "OddsSentry PRO",
  description: "Dashboard de Inteligência +EV",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <AppContent>{children}</AppContent>
        </AuthProvider>
      </body>
    </html>
  );
}
