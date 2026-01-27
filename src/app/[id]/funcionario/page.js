"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { getEntityById } from "@/lib/entities";
import Loader from "@/components/basics/Loader";
import {
  Users,
  UserCheck,
  HelpCircle,
  Search,
  ChevronRight,
  AlertTriangle,
  Info,
  ExternalLink,
  ShieldCheck,
  Trophy,
  History,
  X,
  LogOut,
  Trash2,
  Video,
  Calendar,
} from "lucide-react";
import { toast } from "react-toastify";
import { deleteAssemblyUser, getAssemblyUser } from "@/lib/assemblyUser";
import { updateRegistryStatus } from "@/lib/entities";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import Quorum from "@/components/dashboard/Quorum";
import AssemblyStatsBoxes from "@/components/dashboard/AssemblyStatsBoxes";
import AttendanceTable from "@/components/dashboard/AttendanceTable";
import VoteBlockingSection from "@/components/dashboard/VoteBlockingSection";

const FuncionarioPage = () => {
  const { id: assemblyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [assembly, setAssembly] = useState(null);
  const [entity, setEntity] = useState(null);
  const [registries, setRegistries] = useState([]);
  const [activeTab, setActiveTab] = useState("Asambleistas"); // Asambleistas, Info
  const [tableFilter, setTableFilter] = useState("Registrados"); // Registrados, Pendientes
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Stats
  const [quorum, setQuorum] = useState(0);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);

  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [registryToDelete, setRegistryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const assemblyRef = doc(db, "assembly", assemblyId);
    const unsub = onSnapshot(assemblyRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setAssembly(data);

        if (data.entityId) {
          const resEntity = await getEntityById(data.entityId);
          if (resEntity.success) {
            setEntity(resEntity.data);

            if (resEntity.data.assemblyRegistriesListId) {
              const listRef = doc(
                db,
                "assemblyRegistriesList",
                resEntity.data.assemblyRegistriesListId,
              );
              onSnapshot(listRef, (listSnap) => {
                if (listSnap.exists()) {
                  const regsMap = listSnap.data().assemblyRegistries || {};
                  const regs = Object.entries(regsMap).map(
                    ([regId, regData]) => ({
                      id: regId,
                      ...regData,
                    }),
                  );
                  setRegistries(regs);

                  const registered = regs.filter(
                    (r) => r.registerInAssembly === true,
                  );
                  const totalCoef = regs.reduce(
                    (acc, r) => acc + parseFloat(r.coeficiente || 0),
                    0,
                  );
                  const regCoef = registered.reduce(
                    (acc, r) => acc + parseFloat(r.coeficiente || 0),
                    0,
                  );

                  setRegisteredCount(registered.length);
                  setBlockedCount(
                    regs.filter((r) => r.voteBlocked === true).length,
                  );
                  setQuorum(totalCoef > 0 ? (regCoef / totalCoef) * 100 : 0);
                }
              });
            }
          }
        }
      } else {
        toast.error("Asamblea no encontrada");
      }
      setLoading(false);
    });

    return () => unsub();
  }, [assemblyId]);

  const handleToggleVoteBlock = async (registryId, currentBlocked) => {
    // Usually funcionarios don't edit, but we'll show toast if they try or just sync UI
    toast.info(
      "Modulo de consulta: Solo el operador puede modificar restricciones.",
    );
  };

  const handleDeleteRegistration = async () => {
    if (!registryToDelete) return;

    setIsDeleting(true);
    try {
      const document = registryToDelete.documento;

      // 1. Get the assembly user record to find all registries
      const resUser = await getAssemblyUser(document, assemblyId);

      if (resUser.success) {
        const userData = resUser.data;
        const userRegistries = userData.registries || [];

        // 2. Liberate all registries in the list
        if (entity?.assemblyRegistriesListId) {
          await Promise.all(
            userRegistries.map((r) =>
              updateRegistryStatus(
                entity.assemblyRegistriesListId,
                r.registryId,
                false,
              ),
            ),
          );
        }

        // 3. Delete the assembly user record
        const resDel = await deleteAssemblyUser(document, assemblyId);
        if (resDel.success) {
          toast.success(
            "Registro eliminado y propiedad liberada correctamente.",
          );
        } else {
          toast.error("Error al eliminar el registro de usuario.");
        }
      } else {
        // If user record not found, at least try to liberate this specific registry
        if (entity?.assemblyRegistriesListId && registryToDelete.id) {
          await updateRegistryStatus(
            entity.assemblyRegistriesListId,
            registryToDelete.id,
            false,
          );
          toast.success(
            "Propiedad liberada (Registro de usuario no encontrado).",
          );
        }
      }
    } catch (error) {
      console.error("Error in handleDeleteRegistration:", error);
      toast.error("Ocurrió un error al intentar eliminar el registro.");
    }
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    setRegistryToDelete(null);
  };

  if (loading || !assembly) return <Loader />;

  const filteredRegistries = registries.filter((r) => {
    const isReg =
      tableFilter === "Registrados"
        ? r.registerInAssembly === true
        : r.registerInAssembly !== true;
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      String(r.propiedad || "")
        .toLowerCase()
        .includes(search) ||
      String(r.documento || "")
        .toLowerCase()
        .includes(search) ||
      String(r.grupo || "")
        .toLowerCase()
        .includes(search);
    return isReg && matchesSearch;
  });

  const totalPages = Math.ceil(filteredRegistries.length / itemsPerPage);
  const currentItems = filteredRegistries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col font-sans">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-100 py-3 px-10 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src="/logos/assambly/iconLogo.png" alt="Logo" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-[#0E3C42] uppercase tracking-[0.2em]">
            Invitado| <span className="text-gray-400">Administrador</span>
          </span>
          <div className="w-9 h-9 bg-indigo-50 rounded-full flex items-center justify-center text-[#8B9DFF] border border-indigo-100 shadow-sm">
            <Users size={18} />
          </div>
        </div>
      </header>

      <main className="mx-15">
        {/* ASSEMBLY INFO */}
        <div className="my-8 p-5">
          <div className="">
            <div className=" flex justify-between items-start mb-4">
              <div className="w-full flex justify-between">
                <h1 className="text-[32px] font-bold text-[#0E3C42] mb-1">
                  {assembly.name}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-600">
              <p className="text-gray-500 font-medium text-[20px]">
                {entity.name}
              </p>
              <div className="flex items-center font-medium bg-[#FFF] px-3 py-1 rounded-full gap-2">
                <Calendar size={18} className="text-[#0E3C42]" />
                <span className="font-semibold">
                  {assembly.date} - {assembly.hour}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full">
                <Video size={18} className="" />
                <span className="font-bold text-xs uppercase">
                  {assembly.type}
                </span>
              </div>
              <div>
                <span
                  className={`px-3 py-1 rounded-full font-bold text-xs uppercase flex items-center gap-1 ${
                    assembly.status === "finished"
                      ? "bg-[#B8EAF0] text-[#0E3C42]"
                      : "bg-red-100 text-red-500"
                  }`}
                >
                  {assembly.status === "started" && (
                    <span className="w-2 h-2 rounded-full bg-red-500 "></span>
                  )}
                  {assembly.status === "create" ? (
                    <span className="rounded-full bg-[#FFEDDD] text-[#C53F00]">
                      {" "}
                      Agendada
                    </span>
                  ) : assembly.status === "started" ? (
                    <span className="rounded-full bg-[#FFEDDD] text-[#930002]">
                      {" "}
                      En vivo
                    </span>
                  ) : assembly.status === "registries_finalized" ? (
                    "Registros Cerrados"
                  ) : (
                    "Finalizada"
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TOP CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6  mb-10">
          {/* QUORUM CARD */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-[19px] font-bold text-[#0E3C42]">Quórum</h3>
              <div className="w-5 h-5 rounded-full bg-[#0E3C42] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                !
              </div>
            </div>

            <div className="flex flex-col items-center justify-center flex-1 relative py-2">
              <Quorum percentage={quorum} />
              <div className="flex w-full max-w-[280px] justify-between text-[11px] font-black text-gray-300 mt-2">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* ASAMBLEISTAS STATS CARDS */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex flex-col gap-6">
            <h3 className="text-[19px] font-bold text-[#0E3C42] mb-0">
              Asambleístas
            </h3>
            <AssemblyStatsBoxes
              registeredCount={registeredCount}
              totalCount={registries.length}
              blockedCount={blockedCount}
            />
          </div>
        </div>

        {/* TABS - MATCHING IMAGE AESTHETICS */}
        <div className="bg-[#E0E7FF]/20 p-2 rounded-full flex gap-1 mb-10 max-w-2xl mx-auto border border-[#E0E7FF]/40">
          <button
            onClick={() => setActiveTab("Asambleistas")}
            className={`flex-1 py-3.5 px-8 rounded-full font-black text-xs uppercase tracking-[0.1em] transition-all duration-300 ${
              activeTab === "Asambleistas"
                ? "bg-[#8B9DFF] text-white shadow-[0_8px_20px_rgba(139,157,255,0.4)]"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Asambleístas
          </button>
          <button
            onClick={() => setActiveTab("Sobre IntuApp")}
            className={`flex-1 py-3.5 px-8 rounded-full font-black text-xs uppercase tracking-[0.1em] transition-all duration-300 ${
              activeTab === "Sobre IntuApp"
                ? "bg-[#8B9DFF] text-white shadow-[0_8px_20px_rgba(139,157,255,0.4)]"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Sobre IntuApp
          </button>
        </div>

        {/* CONTENT SECTION */}
        {activeTab === "Asambleistas" ? (
          <>
            <AttendanceTable
              registries={registries}
              activeTab={tableFilter}
              setActiveTab={setTableFilter}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              assemblyType={assembly.type}
              showActions={false}
              mode="funcionario"
              onAction={(item, type) => {
                if (type === "delete") {
                  setRegistryToDelete(item);
                  setShowDeleteConfirm(true);
                }
              }}
            />
          </>
        ) : (
          /* TAB 2: SOBRE INTUAPP */
          <div className="mx-15 animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-10">
            {/* HERO GRADIENT CARD */}
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-10">
              {/* HERO GRADIENT CARD */}
              <div className="bg-gradient-to-br from-[#80D9D1] via-[#8B9DFF] to-[#6372FF] rounded-[48px] p-16 text-white relative overflow-hidden shadow-[0_20px_50px_rgba(139,157,255,0.3)]">
                {/* Decorative background shapes */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-[80px]" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-[80px]" />

                {/* Blobs */}
                <div
                  className="absolute rounded-full blur-[50px]"
                  style={{
                    left: "-50px",
                    top: "0px",
                    width: "300px",
                    height: "100px",
                    background: "#94A2FF40",
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

                {/* Header */}
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="text-white font-black text-[56px] tracking-tighter flex items-center gap-3 mb-4 drop-shadow-lg">
                    <div className="w-16 h-16 rounded-full border-[8px] border-white flex items-center justify-center shadow-lg">
                      <div className="w-3.5 h-3.5 bg-white rounded-full" />
                    </div>
                    intuapp
                  </div>
                  <h3 className="text-2xl font-black opacity-95 tracking-tight italic">
                    Lo complejo hecho simple
                  </h3>
                </div>

                {/* GRID FEATURES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 mt-16 max-w-5xl mx-auto">
                  {/* Card 1 */}
                  <div className="bg-white rounded-[32px] p-10 shadow-lg border border-black/5 hover:shadow-xl transition-shadow">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-[#6372FF] shadow-sm">
                        <ShieldCheck size={24} strokeWidth={2.5} />
                      </div>
                      <h4 className="font-black uppercase tracking-[0.2em] text-[13px] text-[#0E3C42]">
                        Nuestra Misión
                      </h4>
                    </div>
                    <p className="text-[15px] leading-relaxed text-[#4B5563] font-semibold">
                      Creamos herramientas funcionales con un enfoque intuitivo
                      para simplificar lo complejo. Nuestro objetivo es hacer
                      que la gestión de asambleas sea accesible y eficiente para
                      todos.
                    </p>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-white rounded-[32px] p-10 shadow-lg border border-black/5 hover:shadow-xl transition-shadow">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-[#6372FF] shadow-sm">
                        <Trophy size={24} strokeWidth={2.5} />
                      </div>
                      <h4 className="font-black uppercase tracking-[0.2em] text-[13px] text-[#0E3C42]">
                        Experiencia
                      </h4>
                    </div>
                    <p className="text-[15px] leading-relaxed text-[#4B5563] font-semibold">
                      Más de 10 años de experiencia en la gestión de asambleas.
                    </p>
                    <div className="mt-3 flex flex-col gap-1 text-[13px] text-[#6B7280] uppercase tracking-wide font-semibold">
                      <span>• 500+ asambleas exitosas</span>
                      <span>• Miles de Asambleístas satisfechos</span>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-white rounded-[32px] p-10 shadow-lg border border-black/5 hover:shadow-xl transition-shadow">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-[#6372FF] shadow-sm">
                        <HelpCircle size={24} strokeWidth={2.5} />
                      </div>
                      <h4 className="font-black uppercase tracking-[0.2em] text-[13px] text-[#0E3C42]">
                        ¿Qué hacemos?
                      </h4>
                    </div>
                    <p className="text-[15px] leading-relaxed text-[#4B5563] font-semibold">
                      Somos una herramienta que facilita y dinamiza el proceso
                      de registros y votaciones en las asambleas.
                    </p>
                  </div>

                  {/* Card 4 */}
                  <div className="bg-white rounded-[32px] p-10 shadow-lg border border-black/5 hover:shadow-xl transition-shadow">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-[#6372FF] shadow-sm">
                        <History size={24} strokeWidth={2.5} />
                      </div>
                      <h4 className="font-black uppercase tracking-[0.2em] text-[13px] text-[#0E3C42]">
                        Nuestro Rol
                      </h4>
                    </div>
                    <p className="text-[15px] leading-relaxed text-[#4B5563] font-semibold">
                      Somos la herramienta tecnológica que facilita el proceso,
                      no el operador logístico que realiza tu asamblea.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* LEGAL INFO BOXES - MATCHING DESIGN */}
            <div className="bg-[#FFF4E5] border border-orange-100 rounded-[40px] p-10 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-orange-400/20" />
              <button className="absolute top-8 right-8 text-orange-300 opacity-40 hover:opacity-100 transition">
                <X size={20} />
              </button>
              <div className="flex gap-8">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-md flex-shrink-0 group-hover:rotate-12 transition-transform">
                  <AlertTriangle size={28} strokeWidth={2.5} />
                </div>
                <div className="space-y-6">
                  <h4 className="font-black text-orange-950 text-xs uppercase tracking-[0.2em]">
                    Sobre el resultado de las votaciones
                  </h4>
                  <p className="text-orange-900/80 text-[13px] font-black leading-relaxed">
                    Los resultados emitidos en la plataforma se obtienen con
                    base en los coeficientes, según lo establecido en la Ley 675
                    de 2001:
                  </p>
                  <ul className="space-y-4 text-orange-900/70 text-[12px] font-bold">
                    <li className="flex gap-4">
                      <div className="w-2 h-2 bg-orange-400 rounded-full mt-1.5 flex-shrink-0" />
                      <span>
                        <b className="text-orange-950 px-1 font-black">
                          Artículo 37. Derecho al voto:
                        </b>{" "}
                        &ldquo;El voto de cada propietario equivaldrá al
                        porcentaje del coeficiente de copropiedad del respectivo
                        bien privado.&rdquo;
                      </span>
                    </li>
                    <li className="flex gap-4">
                      <div className="w-2 h-2 bg-orange-400 rounded-full mt-1.5 flex-shrink-0" />
                      <span>
                        <b className="text-orange-950 px-1 font-black">
                          Artículo 45. Quórum y mayorías:
                        </b>{" "}
                        &ldquo;Con excepción de los casos en que la ley o el
                        reglamento de propiedad horizontal exijan un quórum o
                        mayoría superior, y de las reuniones de segunda
                        convocatoria previstas en el artículo 41, la asamblea
                        general sesionará con un número plural de propietarios
                        de unidades privadas que representen más de la mitad de
                        los coeficientes de copropiedad, y tomará decisiones con
                        el voto favorable de la mitad más uno de dichos
                        coeficientes.&rdquo;
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-[#F5F7FF] border border-indigo-100 rounded-[40px] p-10 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#8B9DFF]/20" />
              <button className="absolute top-8 right-8 text-[#8B9DFF] opacity-40 hover:opacity-100 transition">
                <X size={20} />
              </button>
              <div className="flex gap-8">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#8B9DFF] shadow-md flex-shrink-0 group-hover:-rotate-12 transition-transform">
                  <Info size={28} strokeWidth={2.5} />
                </div>
                <div className="space-y-4">
                  <h4 className="font-black text-[#0E3C42] text-xs uppercase tracking-[0.2em]">
                    Importante
                  </h4>
                  <ul className="space-y-3 text-indigo-900/60 text-[12px] font-bold list-disc pl-6 leading-relaxed">
                    <li>
                      <span className="font-black text-[#0E3C42]">Intuapp</span>{" "}
                      es una herramienta tecnológica de apoyo: facilita la
                      realización de las asambleas, pero no ejerce control ni
                      supervisión sobre su desarrollo.
                    </li>
                    <li>
                      Intuapp no determina la aprobación ni la validez de las
                      decisiones.
                    </li>
                    <li>
                      No se aplica regla de tres ni se crea un nuevo 100%,
                      porque la Ley indica que las decisiones deben tomarse con
                      los coeficientes presentes en la asamblea.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="py-12 border-t border-gray-100 bg-white/50 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="text-[#8B9DFF] font-black text-xl tracking-tighter opacity-30 grayscale filter">
            intuapp
          </div>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
            IntuApp - Todos los derechos reservados &copy; 2025
          </p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes gauge-fill {
          from {
            stroke-dashoffset: 282;
          }
          to {
            stroke-dashoffset: var(--offset);
          }
        }
      `}</style>
    </div>
  );
};

export default FuncionarioPage;
