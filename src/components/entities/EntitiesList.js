"use client";
import React, { useState } from "react";
import { Search, LayoutGrid, List, Plus, Settings } from "lucide-react";
import EntityCard from "./EntityCard";
import Button from "@/components/basics/Button";

export default function EntitiesList({
  entities = [],
  onCreateEntity,
  onManageEntity,
  onCreateAssembly,
  onViewAssembly,
}) {
  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");

  const filteredEntities = entities.filter((entity) => {
    const matchesSearch = entity.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType =
      !filterType || String(entity.type) === String(filterType);
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full md:w-[400px] relative group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder="Busca por nombre"
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-4 focus:ring-indigo-50/50 focus:border-indigo-400 transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Type Filter */}
          <select
            className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-bold text-[#0E3C42] focus:outline-none focus:border-indigo-400 bg-white min-w-[140px] appearance-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 1rem center",
              backgroundSize: "1em",
            }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">Tipo</option>
            <option value="1">Residencial</option>
            <option value="2">Empresarial</option>
            <option value="3">Sindicato</option>
            <option value="4">Cooperativa</option>
          </select>

          {/* Sort */}
          <select
            className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-bold text-[#0E3C42] focus:outline-none focus:border-indigo-400 bg-white min-w-[140px] appearance-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 1rem center",
              backgroundSize: "1em",
            }}
          >
            <option>Ordenar por</option>
            <option>Nombre (A-Z)</option>
            <option>Más recientes</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center bg-[#EEF2FF] rounded-xl p-1.5 ml-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                viewMode === "grid"
                  ? "bg-white shadow-sm text-indigo-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutGrid size={18} />
              <span className="hidden sm:inline">Vista tarjetas</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                viewMode === "list"
                  ? "bg-white shadow-sm text-indigo-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <List size={18} />
              <span className="hidden sm:inline">Vista lista</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid or List Content */}
      {filteredEntities.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEntities.map((entity) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                onManage={onManageEntity}
                onCreateAssembly={onCreateAssembly}
                onViewAssembly={onViewAssembly}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[13px] font-bold text-[#0E3C42] uppercase tracking-wider bg-gray-50/50">
                    <th className="py-5 px-8">Tipo</th>
                    <th className="py-5 px-4 text-center">Nombre</th>
                    <th className="py-5 px-4 text-center">Asambleístas</th>
                    <th className="py-5 px-4 text-center">Ubicación</th>
                    <th className="py-5 px-4 text-center">Próxima asamblea</th>
                    <th className="py-5 px-4 text-center">Hora</th>
                    <th className="py-5 px-8 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntities.map((entity) => {
                    const typeMapping = {
                      1: "/logos/type/iconPropiedad.png",
                      2: "/logos/type/iconEmpresa.png",
                      3: "/logos/type/iconSindicato.png",
                      4: "/logos/type/iconCooperativa.png",
                    };
                    const typeIcon = typeMapping[String(entity.type)];

                    const formatDate = (dateString) => {
                      if (!dateString || typeof dateString !== "string")
                        return dateString;
                      try {
                        const months = [
                          "Ene",
                          "Feb",
                          "Mar",
                          "Abr",
                          "May",
                          "Jun",
                          "Jul",
                          "Ago",
                          "Sep",
                          "Oct",
                          "Nov",
                          "Dic",
                        ];
                        const [, month, day] = dateString.split("-");
                        return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]}`;
                      } catch (e) {
                        return dateString;
                      }
                    };

                    return (
                      <tr
                        key={entity.id}
                        className="border-b border-gray-50 last:border-none hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="py-4 px-8">
                          <div className="w-10 h-10 rounded-full bg-[#EEF2FF] flex items-center justify-center shrink-0">
                            {typeIcon ? (
                              <img
                                src={typeIcon}
                                alt="Type"
                                className="w-6 h-6 object-contain"
                              />
                            ) : (
                              <LayoutGrid
                                size={18}
                                className="text-indigo-400"
                              />
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 w-[220px]">
                          <span className="font-bold text-[#0E3C42] text-sm leading-tight block">
                            {entity.name}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-sm font-medium text-gray-600">
                            {entity.asambleistasCount || 0}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center max-w-[200px]">
                          <span className="text-sm text-gray-500 truncate block">
                            {entity.address || "S/D"}, {entity.city || ""}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {entity.activeAssembly ? (
                            <span className="inline-flex items-center gap-1.5 bg-[#FACCCD] text-[#930002] px-3 py-1 rounded-full text-[11px] font-bold">
                              <span className="w-1.5 h-1.5 bg-[#930002] rounded-full animate-pulse" />
                              En vivo
                            </span>
                          ) : !entity.hasAssemblies ? (
                            <span className="text-xs font-bold text-gray-400">
                              No hay
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-[#0E3C42]">
                              {formatDate(entity.nextAssembly?.date)}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-sm font-medium text-gray-600">
                            {entity.activeAssembly
                              ? `Inició hace ${entity.activeAssembly.startedAgo || "30 min"}`
                              : entity.nextAssembly?.time || "-"}
                          </span>
                        </td>
                        <td className="py-4 px-8">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() =>
                                entity.activeAssembly
                                  ? onViewAssembly && onViewAssembly(entity)
                                  : onCreateAssembly && onCreateAssembly(entity)
                              }
                              className="w-10 h-10 rounded-full border-2 border-[#0E3C42] flex items-center justify-center text-[#0E3C42] hover:bg-[#0E3C42] hover:text-white transition-all shadow-sm"
                              title={
                                entity.activeAssembly
                                  ? "Ver Asamblea"
                                  : "Crear Asamblea"
                              }
                            >
                              {entity.activeAssembly ? (
                                <Search size={18} />
                              ) : (
                                <Plus size={18} />
                              )}
                            </button>
                            <button
                              onClick={() =>
                                onManageEntity && onManageEntity(entity)
                              }
                              className="w-10 h-10 rounded-full bg-[#94A2FF] flex items-center justify-center text-[#0E3C42] hover:opacity-80 transition-all shadow-sm"
                              title="Gestionar"
                            >
                              <Settings size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination UI */}
            <div className="p-6 bg-gray-50/30 flex justify-end">
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 rounded-full bg-[#ABE7E5] text-[#0E3C42] font-black text-sm flex items-center justify-center">
                  1
                </button>
                <button className="w-10 h-10 rounded-full hover:bg-gray-100 text-gray-400 font-bold text-sm flex items-center justify-center">
                  2
                </button>
                <button className="w-10 h-10 rounded-full hover:bg-gray-100 text-gray-400 font-bold text-sm flex items-center justify-center">
                  3
                </button>
                <span className="text-gray-300 px-1">...</span>
                <button className="px-4 py-2 hover:text-indigo-600 text-gray-800 font-bold text-sm flex items-center gap-1">
                  Siguiente &gt;
                </button>
                <button className="px-4 py-2 hover:text-indigo-600 text-gray-400 font-bold text-sm">
                  Última &gt;|
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-12 bg-white rounded-[32px] border border-gray-100 border-dashed">
          <p className="text-gray-500 font-medium">
            No se encontraron entidades.
          </p>
          {onCreateEntity && (
            <Button
              variant="primary"
              size="M"
              className="mt-4 !bg-[#94A2FF] !text-[#000000] !font-bold"
              onClick={onCreateEntity}
            >
              Crear nueva entidad
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
