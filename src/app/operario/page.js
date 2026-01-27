"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { Building2, CalendarClock, QrCode, Settings } from "lucide-react";

import WelcomeSection from "@/components/dashboard/WelcomeSection";
import StatCard from "@/components/dashboard/StatCard";
import SectionCard from "@/components/dashboard/SectionCard";
import ListItem from "@/components/dashboard/ListItem";
import HelpFullBanner from "@/components/dashboard/HelpFullBanner";
import Button from "@/components/basics/Button";
import { Plus, CalendarDays, X, Download } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { getEntitiesByOperator, getEntityTypes } from "@/lib/entities";
import { getAllAssemblies } from "@/lib/assembly";

export default function OperarioPage() {
  const { user } = useUser();
  const router = useRouter();

  const [entities, setEntities] = useState([]);
  const [assemblies, setAssemblies] = useState([]);
  const [entityTypes, setEntityTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedAssemblyForQr, setSelectedAssemblyForQr] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;

      try {
        const typesRes = await getEntityTypes();
        const typesList = typesRes.success ? typesRes.data : [];
        setEntityTypes(typesList);

        const entityRes = await getEntitiesByOperator(user.uid);
        let myEntities = entityRes.success ? entityRes.data : [];

        myEntities = myEntities.map((e) => {
          const typeInfo = typesList.find(
            (t) => String(t.id) === String(e.type),
          );
          return {
            ...e,
            typeName: typeInfo
              ? typeInfo.name
              : e.type || "Propiedad Horizontal",
          };
        });
        setEntities(myEntities);

        // 3. Get Assemblies for these entities
        const assemblyRes = await getAllAssemblies();
        let myAssemblies = [];
        if (assemblyRes.success) {
          const entityIds = new Set(myEntities.map((e) => e.id));
          // Filter assemblies belonging to my entities
          myAssemblies = assemblyRes.data.filter((a) =>
            entityIds.has(a.entityId),
          );

          // Add entity names to assemblies for display
          myAssemblies = myAssemblies.map((a) => {
            const entity = myEntities.find((e) => e.id === a.entityId);
            return {
              ...a,
              entityName: entity ? entity.name : "Unknown Entity",
              typeName: entity ? entity.typeName : "Propiedad Horizontal",
            };
          });
        }
        setAssemblies(myAssemblies);

        const entitiesWithNext = myEntities.map((entity) => {
          const entityAssemblies = myAssemblies.filter(
            (a) => a.entityId === entity.id && a.status !== "finished",
          );
          const next = entityAssemblies.sort((a, b) =>
            (a.date || "").localeCompare(b.date || ""),
          )[0];

          return {
            ...entity,
            nextAssembly: next ? { date: next.date, time: next.hour } : null,
          };
        });
        setEntities(entitiesWithNext);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const openQrModal = (assembly) => {
    setSelectedAssemblyForQr(assembly);
    setIsQrModalOpen(true);
  };

  const downloadQR = () => {
    const canvas = document.getElementById("qr-gen-dashboard");
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `assembly_qr_${selectedAssemblyForQr?.entityName}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  return (
    <div>
      <section className="mt-8 mx-9">
        <WelcomeSection userName={user?.name} />
      </section>

      <section className="mt-8 mx-9">
        <div className="flex flex-start gap-6 mb-8">
          <StatCard
            icon={Building2}
            label="Total Entidades"
            value={entities.length}
            iconColor="text-[#6470FF]"
            iconBgColor="bg-[#EEF3FF]"
            width="w-full h-auto sm:w-[264px] sm:h-[104px] md:w-[304px] md:h-[104px]"
          />
          <StatCard
            icon={CalendarClock}
            label="Asambleas agendadas"
            value={assemblies.length}
            iconColor="text-[#6470FF]"
            iconBgColor="bg-[#EEF3FF]"
            width="w-full h-auto sm:w-[264px] sm:h-[104px] md:w-[304px] md:h-[104px]"
          />
        </div>
      </section>

      <section className="mx-9 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          <SectionCard
            title="Entidades"
            className="h-fit"
            actionLabel="Crear Entidad"
            onAction={() => router.push("/operario/crear-entidad")}
            viewAllHref="/operario/entidades"
            viewAllText="Ver todas las Entidades"
            classButton="!text-sm !py-3 !px-4 !bg-[#94A2FF] !text-[#000000] !font-bold"
            iconButton={Plus}
            contentClassName="max-h-[380px]" // Limit to approx 4 items
          >
            {entities.map((entity) => (
              <ListItem
                key={entity.id}
                icon={Building2}
                entity={entity}
                showNextAssembly={true}
                onClick={() => router.push(`/operario/${entity.id}`)}
              />
            ))}
            {entities.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                No hay entidades.
              </p>
            )}
          </SectionCard>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          <SectionCard
            title="Asambleas en curso"
            className="h-fit"
            contentClassName="max-h-[380px]" // Limit to approx 4 items
          >
            {assemblies.filter((a) => a.status === "started").length > 0 ? (
              assemblies
                .filter((a) => a.status === "started")
                .map((assembly) => (
                  <ListItem
                    key={assembly.id}
                    title={`${assembly.entityName} · Asambleas Ordinaria`}
                    subtitle={`Inició hace...`}
                    status={{
                      text: "En vivo",
                      color: "bg-red-100 text-red-600",
                      dot: true,
                    }}
                    onClick={() =>
                      router.push(
                        `/operario/${assembly.entityId}/${assembly.id}`,
                      )
                    }
                  />
                ))
            ) : (
              <div className="flex items-center justify-center border border-[#94A2FF] bg-[#EEF0FF] rounded-xl p-4 h-full">
                <p className=" text-center py-2 font-bold text-[16px]">
                  No hay asambleas en curso.
                </p>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Próximas Asambleas"
            className="h-fit"
            viewAllHref="/operario/asambleas"
            viewAllText="Ver entidades con asambleas"
            classButton="!text-sm !py-3 !px-4 !bg-[#94A2FF] !text-[#000000] !font-bold"
            contentClassName="max-h-[460px]" // Limit to approx 3 items (they are taller)
          >
            {assemblies.filter(
              (a) => a.status !== "started" && a.status !== "finished",
            ).length > 0 ? (
              assemblies
                .filter(
                  (a) => a.status !== "started" && a.status !== "finished",
                )
                .map((assembly) => (
                  <div
                    key={assembly.id}
                    className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm mb-4 last:mb-0"
                  >
                    <ListItem
                      title={assembly.entityName}
                      subtitle={`${assembly.hour || "00:00"} · ${
                        assembly.type || "Presencial"
                      }`}
                      status={{
                        text: assembly.date || "Fecha pendiente",
                        color: "bg-[#B8EAF0] text-[#0E3C42]",
                        dot: false,
                        icon: CalendarDays,
                      }}
                      isAssamblea
                      className="!border-0 !p-0 !shadow-none mb-4 cursor-default hover:shadow-none"
                      onClick={() => {}} // Non-clickable here as buttons handle actions
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => openQrModal(assembly)}
                        className="px-4 py-2 border border-[#0E3C42]  rounded-l-3xl rounded-r-3xl hover:bg-gray-50 !text-[#000000] transition-colors"
                      >
                        <QrCode size={18} />
                      </button>
                      <Button
                        variant="primary"
                        size="M"
                        className="flex-1 flex items-center gap-2 justify-center !py-2 !text-[#000000] font-bold"
                        onClick={() =>
                          router.push(
                            `/operario/${assembly.entityId}/${assembly.id}`,
                          )
                        }
                      >
                        <Settings size={16} /> Gestionar
                      </Button>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                No hay próximas asambleas.
              </p>
            )}
          </SectionCard>
        </div>
      </section>
      <HelpFullBanner />

      {/* QR MODAL */}
      {isQrModalOpen && selectedAssemblyForQr && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] p-10 max-w-sm w-full relative animate-in zoom-in duration-300">
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 p-2 bg-gray-50 rounded-full transition"
            >
              <X size={20} />
            </button>
            <div className="text-center">
              <h3 className="text-2xl font-black text-[#0E3C42] mb-2">
                Código QR
              </h3>
              <p className="text-gray-400 text-sm mb-8">
                Escanea para acceder a la asamblea: <br />
                <span className="font-bold text-[#0E3C42]">
                  {selectedAssemblyForQr.entityName}
                </span>
              </p>

              <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-gray-100 inline-block mb-8">
                <QRCodeCanvas
                  id="qr-gen-dashboard"
                  value={`${window.location.origin}/${selectedAssemblyForQr.id}`}
                  size={200}
                  level={"H"}
                  includeMargin={true}
                />
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={downloadQR}
                  className="bg-[#8B9DFF] text-white font-bold py-4 rounded-2xl hover:bg-[#7a8ce0] transition flex items-center justify-center gap-2"
                >
                  <Download size={20} /> Descargar Imagen
                </button>
                <button
                  onClick={() => setIsQrModalOpen(false)}
                  className="text-gray-400 font-bold py-2 text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
