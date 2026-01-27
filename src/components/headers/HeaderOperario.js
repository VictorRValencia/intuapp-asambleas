"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Building2, Calendar, LogOut } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { logout } from "@/lib/auth";
import { toast } from "react-toastify";

const navItems = [
  { href: "/operario", label: "Inicio", icon: <Home size={20} /> },
  {
    href: "/operario/entidades",
    label: "Entidades",
    icon: <Building2 size={20} />,
  }
];

export default function HeaderOperario() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Sesión cerrada correctamente.");
      router.push("/login");
    } catch (error) {
      toast.error("Error al cerrar sesión.");
    }
  };

  return (
    <aside className="h-screen w-20 sm:w-24 bg-white border-r border-gray-200 flex flex-col items-center py-6 justify-between shadow-sm flex-shrink-0">
      {/* LOGO + NAV */}
      <div className="flex flex-col items-center space-y-10 w-full">
        {/* LOGO */}
        <div className="flex flex-col items-center w-full px-2">
          <img
            src="/logos/logo-header.png"
            alt="Logo"
            className="h-10 mb-2 object-contain"
          />
          <div className="w-12 h-[1px] bg-gray-200 mt-0"></div>
        </div>

        {/* NAV */}
        <nav className="flex flex-col items-center gap-8 mt-1">
          {navItems.map(({ href, label, icon }) => {
            const isActive =
              href === "/operario"
                ? pathname === href
                : pathname === href || pathname.startsWith(href + "/");
            const activeClass = isActive
              ? "text-blue-600 bg-blue-50 rounded-xl py-2 px-3"
              : "text-gray-700 hover:text-blue-500";

            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center text-sm font-medium transition-colors ${activeClass}`}
              >
                <div className="mb-1">{icon}</div>
                <span className="text-xs">{label}</span>
              </Link>
            );
          })}

          {/* LOGOUT moved to top nav */}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center text-gray-700 hover:text-red-500 transition-colors"
          >
            <div className="mb-1">
              <LogOut size={20} />
            </div>
            <span className="text-xs">Salir</span>
          </button>
        </nav>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex flex-col items-center w-full mb-2">
        {/* AYUDA BUTTON */}
        <a
          href="https://wa.me/573005199651"
          target="_blank"
          rel="noopener noreferrer"
          className="relative w-20 h-20 rounded-xl overflow-hidden flex flex-col items-center justify-center group shadow-sm transition-transform hover:scale-105"
        >
          {/* Blobs background */}
          <div
            className="absolute rounded-full blur-[20px] opacity-60"
            style={{
              left: "-10px",
              top: "-10px",
              width: "40px",
              height: "40px",
              background: "#94A2FF",
            }}
          />
          <div
            className="absolute rounded-full blur-[15px] opacity-50"
            style={{
              right: "-5px",
              top: "-5px",
              width: "35px",
              height: "35px",
              background: "#ABE7E5",
            }}
          />
          <div
            className="absolute rounded-full blur-[15px] opacity-40"
            style={{
              left: "-5px",
              bottom: "-5px",
              width: "35px",
              height: "35px",
              background: "#94A2FF",
            }}
          />
          <div
            className="absolute rounded-full blur-[20px] opacity-50"
            style={{
              right: "-10px",
              bottom: "-10px",
              width: "40px",
              height: "40px",
              background: "#ABE7E5",
            }}
          />

          <span className="relative z-10 text-[14px] font-bold text-[#0E3C42] mb-1">
            ¿Ayuda?
          </span>
          <div className="relative z-10 p-3 bg-[#94A2FF] rounded-full flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
            <FaWhatsapp size={20} className="text-[#000000]" />
          </div>
        </a>
      </div>
    </aside>
  );
}
