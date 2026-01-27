import React from "react";
import Button from "@/components/basics/Button";
import { FaWhatsapp } from "react-icons/fa";

export default function HelpFullBanner({ className = "" }) {
  return (
    <div className="mt-8 mx-9 rounded-3xl overflow-hidden relative py-2">
      {/* Abstract Blobs */}
      <div
        className="absolute rounded-full blur-[50px]"
        style={{
          left: "-50px",
          top: "0px",
          width: "300px",
          height: "100px",
          background: "#94A2FF80",
          transform: "rotate(310deg)",
        }}
      />
      <div
        className="absolute rounded-full blur-[20px]"
        style={{
          left: "200px",
          top: "0",
          width: "500px",
          height: "200px",
          background: "#ABE7E540",
          transform: "rotate(14deg)",
        }}
      />
      <div
        className="absolute rounded-full blur-[20px]"
        style={{
          right: "200px",
          top: "100px",
          width: "500px",
          height: "200px",
          background: "#94A2FF40",
          transform: "rotate(335deg)",
        }}
      />
      <div
        className="absolute rounded-full blur-[20px]"
        style={{
          right: "20px",
          top: "30px",
          width: "300px",
          height: "200px",
          background: "#ABE7E540",
          transform: "rotate(157deg)",
        }}
      />
      <div className="relative z-10 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <img
          src="/logos/decorations/figureTwo.png"
          className="absolute bottom-0 right-2 w-28 md:w-50 pointer-events-none select-none"
          alt="decoration"
        />
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-[#0E3C42] mb-1">
            ¿Necesitas ayuda?
          </h1>
          <div className="flex gap-4 mt-4">
            <Button
              variant="secondary"
              size="M"
              className="!bg-transparent border-[#0E3C42] text-[#0E3C42] font-bold flex items-center gap-2"
              icon={FaWhatsapp}
              onClick={() => window.open("https://wa.me/57317124294", "_blank")}
            >
              Escríbenos
            </Button>
          </div>
        </div>

        {/* Decorative elements (C badges) - Mocked for visual similarity */}
        <div className="flex gap-[-10px]">
          {/* You can add more complex graphics here if needed */}
        </div>
      </div>
    </div>
  );
}
