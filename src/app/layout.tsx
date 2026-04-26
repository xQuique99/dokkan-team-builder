import SessionWrapper from "../components/SessionWrapper";
import "./globals.css";

export const metadata = {
  title: "Dokkan Team Builder",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <SessionWrapper>
          {children}
        </SessionWrapper>
      </body>
    </html>
  );
}
