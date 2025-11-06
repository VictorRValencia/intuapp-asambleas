import { Red_Hat_Display , Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "react-toastify";

const redHat = Red_Hat_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata = {
  title: "Intuapp Asambleas",
  description: "Plataforma de gestión de asambleas y votaciones en línea",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={redHat.className}>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
