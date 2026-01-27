import React, { useState } from "react";
import { User, LogIn, AlertTriangle, Video } from "lucide-react";
import { toast } from "react-toastify";

export default function AsambleistaLogin({
  assembly,
  entity,
  onLogin,
  loading,
}) {
  const [step, setStep] = useState(0); // 0: Welcome, 1: Input
  const [document, setDocument] = useState("");

  const isActive =
    assembly.status === "started" || assembly.status === "registries_finalized";
  const isFinalized = assembly.status === "finished";

  const handleContinue = () => {
    if (!document.trim()) return toast.error("Ingresa tu documento");
    // Basic validation to match "Only numbers" warning visual, though we handle clean up in logic usually
    if (!/^\d+$/.test(document)) {
      // Optional: strict check or just warn
      // toast.warn("Solo números, sin puntos ni espacios");
    }
    onLogin(document);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-0 md:p-10 bg-[#F8F9FB] font-sans">
      <div className="w-full max-w-[1100px] bg-white rounded-none md:rounded-[40px] overflow-hidden flex flex-col md:flex-row h-screen md:h-[680px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] relative">
        {step === 1 ? (
          /* STEP 1: CENTERED INPUT VIEW */
          <div className="w-full h-full flex items-center justify-center p-6 md:p-16 relative bg-white">
            {/* Background Decorative Blobs */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-50/30 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>

            <div className="w-full max-w-sm flex flex-col items-center relative z-10">
              <h1 className="text-[32px] font-bold text-[#0E3C42] mb-12 tracking-tight text-center">
                Ingresa tu Documento
              </h1>

              <div className="w-full flex flex-col gap-2 mb-6">
                <label className="text-[13px] font-bold text-[#3D3D3D] ml-0.5">
                  Documento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  className="w-full bg-white border border-[#EBEBEB] rounded-xl p-4 outline-none focus:border-[#94A2FF] font-medium text-[#0E3C42] text-lg placeholder:text-gray-300 transition-all shadow-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleContinue();
                  }}
                />
              </div>

              <div className="w-full bg-[#FFEFEB] border border-[#FFDAD3] rounded-xl p-3.5 flex items-center gap-3 text-[#3D3D3D] text-[13px] font-bold mb-8">
                <AlertTriangle size={18} className="text-[#FF7E4E] shrink-0" />
                Solo números, sin puntos ni espacios
              </div>

              <button
                onClick={handleContinue}
                disabled={loading}
                className="w-full bg-[#94A2FF] hover:bg-[#8594ff] text-white font-bold py-4.5 rounded-[24px] shadow-lg shadow-[#94A2FF]/20 transition-all flex items-center justify-center gap-3 text-lg"
              >
                {loading ? (
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Continuar"
                )}
              </button>

              <div className="mt-20 text-center">
                <p className="text-[#3D3D3D] text-[14px] font-medium">
                  ¿Problemas con tu documento?
                </p>
                <button className="text-[#6372FF] font-black text-[14px] hover:underline mt-1 underline-offset-4">
                  Contactar Soporte
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* STEP 0: WELCOME SPLIT VIEW */
          <>
            {/* Left Side Content */}
            <div className="w-full md:w-[48%] p-8 md:p-16 flex flex-col justify-center relative bg-white overflow-visible">
              <div className="w-full max-w-[420px] mx-auto flex flex-col gap-10">
                <div>
                  <h1 className="text-[42px] font-bold text-[#0E3C42] mb-1 tracking-tight">
                    Hola, asambleísta!
                  </h1>
                  <p className="text-[#3D3D3D] text-[15px] font-medium opacity-90">
                    Accede a tu cuenta y disfruta de todos nuestros servicios.
                  </p>
                </div>

                {/* Assembly Info Card */}
                <div className="bg-white border border-[#F0F0F0] rounded-[24px] p-7 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="font-bold text-[#0E3C42] text-[18px] mb-1.5 leading-tight">
                      {assembly.name}
                    </h3>
                    <p className="text-[13px] text-[#8C8C8C] font-medium mb-3">
                      {entity?.name}
                    </p>
                    <p className="text-[13px] text-[#3D3D3D] font-bold mb-5">
                      {assembly.date} - {assembly.hour}
                    </p>

                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-2 bg-[#EEF2FF] text-[#6372FF] px-3.5 py-1.5 rounded-full">
                        <Video size={14} className="fill-[#6372FF]/20" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">
                          {assembly.type}
                        </span>
                      </div>
                      {isFinalized && (
                        <div className="inline-flex items-center gap-2 bg-[#B8EAF0] text-[#0E3C42] px-3.5 py-1.5 rounded-full">
                          <span className="text-[11px] font-bold uppercase tracking-wider">
                            Finalizada
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {isFinalized ? (
                  <div className="bg-white border border-[#F0F0F0] p-6 rounded-[24px] flex gap-4 items-center shadow-sm">
                    <div className="w-12 h-12 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-[#6372FF] shrink-0">
                      <LogIn size={24} />
                    </div>
                    <p className="text-[#0E3C42] font-bold text-base">
                      Esta asamblea ha finalizado.
                    </p>
                  </div>
                ) : (
                  <>
                    {isActive ? (
                      <div className="flex flex-col gap-4">
                        <button
                          onClick={() => setStep(1)}
                          className="w-full bg-[#94A2FF] hover:bg-[#8594ff] text-white font-bold py-5 rounded-[24px] shadow-xl shadow-[#94A2FF]/25 transition-all flex items-center justify-center gap-3 text-lg"
                        >
                          <User size={20} className="fill-white/10" />
                          Ingresar
                        </button>

                        {assembly.status === "registries_finalized" && (
                          <div className="bg-[#FFF2E5] border border-[#FFE0D9] p-4 rounded-xl flex gap-3 items-start">
                            <AlertTriangle
                              className="text-[#BF1D08] shrink-0 mt-0.5"
                              size={18}
                            />
                            <div className="flex flex-col gap-0.5">
                              <p className="text-[#3D3D3D] font-black text-[13px] leading-tight">
                                Registro finalizado!
                              </p>
                              <p className="text-[#3D3D3D] text-[11px] font-medium leading-normal opacity-70">
                                Gracias por querer participar en esta asamblea,
                                pero el registro de los asambleístas ha
                                finalizado. Comunícate con tu administrador o
                                funcionario si tienes alguna duda.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-orange-50/80 border border-orange-100 p-6 rounded-[24px] flex gap-4 items-start">
                        <AlertTriangle
                          className="text-orange-400 shrink-0"
                          size={24}
                        />
                        <div className="flex flex-col gap-1">
                          <p className="text-orange-950 font-bold text-base leading-tight">
                            ¡Próximamente!
                          </p>
                          <p className="text-orange-800/70 text-sm font-medium leading-relaxed">
                            La asamblea iniciará pronto.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right Side - Brand View */}
            <div className="flex-1 bg-gradient-to-br from-[#EEF8F9] via-[#F2F6FF] to-[#E9EFFF] flex flex-col items-center justify-center p-12 relative overflow-hidden">
              {/* Logo & Slogan */}
              <div
                className="absolute rounded-full blur-[50px]"
                style={{
                  left: "-90px",
                  top: "0px",
                  width: "200px",
                  height: "200px",
                  background: "#94A2FF80",
                  transform: "rotate(8deg)",
                }}
              />
              <div
                className="absolute rounded-full blur-[20px]"
                style={{
                  left: "100px",
                  bottom: "-40px",
                  width: "90px",
                  height: "90px",
                  background: "#ABE7E580",
                  transform: "rotate(-128.32deg)",
                }}
              />
              <div
                className="absolute rounded-full blur-[20px]"
                style={{
                  right: "20px",
                  top: "-90px",
                  width: "203px",
                  height: "143px",
                  background: "#ABE7E580",
                  transform: "rotate(20deg)",
                }}
              />
              <div
                className="absolute rounded-full blur-[20px]"
                style={{
                  right: "-10px",
                  bottom: "-10px",
                  width: "70px",
                  height: "70px",
                  background: "#94A2FF80",
                  transform: "rotate(45deg)",
                }}
              />
              <div className="z-10 flex flex-col items-center gap-2">
                <div className="flex items-center gap-5">
                  {/* Custom CSS Logo Icon (Stylized A/Stack) */}
                  <img src="/logos/assambly/iconLoginAssambly.png" alt="Logo" />
                </div>
                <p className="text-[#0E3C42] font-semibold text-[22px] tracking-tight opacity-90 mt-[-10px]">
                  Lo complejo hecho simple
                </p>
              </div>

              {/* Decorative elements to match the gradient feel */}
              <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-white/30 rounded-full blur-[80px]"></div>
              <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-100/30 rounded-full blur-[80px]"></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
