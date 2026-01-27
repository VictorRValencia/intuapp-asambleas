import React from "react";
import {
  Building2,
  AlertTriangle,
  Info,
  Plus,
  Eye,
  Settings,
} from "lucide-react";
import Button from "@/components/basics/Button";

export default function EntityCard({
  entity,
  onManage,
  onCreateAssembly,
  onViewAssembly,
}) {
  const {
    name,
    address = "Sin dirección",
    city = "Sin ciudad",
    asambleistasCount = 20,
    nextAssembly, // { date: '15 Oct', time: '3:30 PM' }
    activeAssembly, // { name: 'Asamblea Ordinaria', startedAgo: '30 minutos' }
    hasAssemblies = false,
    pendingDb = false,
  } = entity;

  return (
    <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm flex flex-col h-full hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-bold text-[#0E3C42] text-xl leading-tight flex-1 mr-4">
          {name}
        </h3>
        <div className="w-10 h-10 rounded-full bg-[#EEF2FF] flex items-center justify-center shrink-0 overflow-hidden">
          <Building2 className="text-indigo-500" size={20} />
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-1 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-400 text-[15px]">
            Asambleistas:
          </span>
          <span className="font-bold text-[#0E3C42] text-[15px]">
            {asambleistasCount}
          </span>
        </div>
        <div className="flex items-start gap-2 text-sm text-gray-400">
          <span className="font-medium whitespace-nowrap text-[15px]">
            Ubicación:
          </span>
          <span className="font-bold text-[#0E3C42] text-[15px] line-clamp-1">
            {address}, {city}
          </span>
        </div>
      </div>

      {/* Assembly Info Section - Priority based */}
      <div className="mb-4 flex flex-col gap-3">
        {activeAssembly ? (
          <div className="bg-[#EEF2FF] border border-[#D5DAFF] rounded-xl p-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-[#000000]">
                {activeAssembly.name}
              </span>
              <span className="font-normal text-[11px] text-gray-500">
                Inició hace {activeAssembly.startedAgo || "pocos minutos"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#FACCCD] text-[#930002] px-2 py-0.5 rounded-full text-[11px] font-bold">
              <span className="w-1.5 h-1.5 bg-[#930002] rounded-full animate-pulse"></span>
              En vivo
            </div>
          </div>
        ) : nextAssembly ? (
          <div className="pt-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-medium text-[15px]">
                Próxima asamblea:
              </span>
              <span className="text-[#0E3C42] font-bold text-[15px]">
                {nextAssembly.date}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-medium text-[15px]">
                Hora:
              </span>
              <span className="text-[#0E3C42] font-bold text-[15px]">
                {nextAssembly.time}
              </span>
            </div>
          </div>
        ) : !hasAssemblies ? (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center gap-3">
            <Info size={16} className="text-gray-400" />
            <span className="text-[13px] font-bold text-gray-400 italic">
              Esta entidad no tiene asambleas creadas
            </span>
          </div>
        ) : null}

        {pendingDb && !activeAssembly && (
          <div className="bg-orange-50 border border-orange-100 rounded-lg p-2.5 flex items-start gap-2 text-[11px] text-orange-800">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>
              <span className="font-bold">Base de datos pendiente</span> · Sube
              la BD
            </span>
          </div>
        )}
      </div>

      {/* Footer Buttons */}
      <div className="flex gap-3 mt-auto pt-2">
        <button
          onClick={() =>
            activeAssembly
              ? onViewAssembly && onViewAssembly(entity)
              : onCreateAssembly && onCreateAssembly(entity)
          }
          className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-[#0E3C42] rounded-full text-[#0E3C42] font-bold text-xs hover:bg-gray-50 transition-all active:scale-95 whitespace-nowrap"
        >
          {activeAssembly ? <Eye size={16} /> : <Plus size={16} />}
          {activeAssembly ? "Ver Asamblea" : "Crear Asamblea"}
        </button>

        <button
          onClick={() => onManage && onManage(entity)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#94A2FF] rounded-full text-[#0E3C42] font-extrabold text-xs hover:opacity-90 transition-all active:scale-95 shadow-sm"
        >
          <Settings size={16} />
          Gestionar
        </button>
      </div>
    </div>
  );
}
