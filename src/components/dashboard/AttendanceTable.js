import React, { useState } from "react";
import {
  Search,
  Download,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const AttendanceTable = ({
  registries,
  activeTab,
  setActiveTab,
  searchTerm,
  setSearchTerm,
  onAction,
  assemblyType,
  showActions = true,
  mode = "operator",
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filteredItems = registries
    .filter((item) => {
      if (activeTab === "Registrados")
        return item.registerInAssembly === true && !item.isDeleted;
      if (activeTab === "Pendientes")
        return item.registerInAssembly !== true && !item.isDeleted;
      if (activeTab === "Registros eliminados") return item.isDeleted === true;
      return false;
    })
    .filter((item) => {
      const search = searchTerm.toLowerCase();
      return (
        String(item.propiedad || "")
          .toLowerCase()
          .includes(search) ||
        String(item.documento || "")
          .toLowerCase()
          .includes(search) ||
        String(item.grupo || "")
          .toLowerCase()
          .includes(search)
      );
    });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const currentItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const availableTabs =
    mode === "funcionario"
      ? ["Registrados", "Pendientes"]
      : ["Registrados", "Pendientes", "Registros eliminados"];

  return (
    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 flex flex-col font-primary">
      <div className="flex flex-col gap-5 mb-6">
        <h3 className="text-xl font-bold text-[#0E3C42]">Asistencia</h3>
        <div className="flex gap-2">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setCurrentPage(1);
              }}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                activeTab === tab
                  ? "bg-[#E0E7FF] text-black shadow-sm"
                  : "bg-transparent text-gray-400 hover:bg-gray-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[#333333] mb-6 text-sm">
        Aquí puedes ver a los Asambleistas que ya se registraron.
      </p>

      <div className="flex gap-4 mb-8">
        <div className="flex-1 relative group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Busca por torre, # de unidad privada o cédula"
            className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-sm font-medium text-[#0E3C42] outline-none focus:border-[#8B9DFF] transition-all"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <select className="border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-[#8B9DFF] bg-white min-w-[140px] text-sm text-gray-600 font-bold">
          <option>Ver todos</option>
        </select>
      </div>

      <div className="overflow-x-auto border border-gray-100 rounded-xl bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white border-b border-gray-100 text-xs font-bold text-gray-800 uppercase tracking-wider">
              <th className="py-4 px-6">Item</th>
              <th className="py-4 px-6">Tipo</th>
              <th className="py-4 px-6">Grupo</th>
              <th className="py-4 px-6">Propiedad</th>
              <th className="py-4 px-6">Coeficiente</th>
              <th className="py-4 px-6">Votos</th>
              <th className="py-4 px-6">Documento</th>
              {activeTab !== "Pendientes" && <th className="py-4 px-6">Rol</th>}
              {assemblyType !== "Presencial" && activeTab !== "Pendientes" && (
                <th className="py-4 px-6">Poder</th>
              )}
              {mode === "funcionario" ? (
                <th className="py-4 px-6">Voto Bloqueado</th>
              ) : (
                showActions && <th className="py-4 px-6 text-center">Acción</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white">
            {currentItems.map((item, idx) => (
              <tr
                key={item.id || idx}
                className="border-b border-gray-50 hover:bg-gray-50 transition text-sm text-[#0E3C42]"
              >
                <td className="py-4 px-6 text-gray-500 font-medium">
                  {item.item || "-"}
                </td>
                <td className="py-4 px-6 text-gray-500 font-medium">
                  {item.tipo || "-"}
                </td>
                <td className="py-4 px-6 text-gray-500 font-medium">
                  {item.grupo || "-"}
                </td>
                <td className="py-4 px-6 text-[#0E3C42] font-black uppercase">
                  {item.propiedad || "---"}
                </td>
                <td className="py-4 px-6 text-gray-500 font-medium">
                  {item.coeficiente || "0"}%
                </td>
                <td className="py-4 px-6 text-gray-500 font-medium">
                  {item.numeroVotos || "1"}
                </td>
                <td className="py-4 px-6 text-gray-500 font-medium">
                  {item.documento || "-"}
                </td>
                {activeTab !== "Pendientes" && (
                  <td className="py-4 px-6">
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${
                        item.role === "owner"
                          ? "bg-cyan-50 text-cyan-600"
                          : "bg-purple-50 text-purple-600"
                      }`}
                    >
                      {item.role === "owner" ? "Propietario" : "Apoderado"}
                    </span>
                  </td>
                )}
                {assemblyType !== "Presencial" &&
                  activeTab !== "Pendientes" && (
                    <td className="py-4 px-6">
                      {item.powerUrl ? (
                        <a
                          href={item.powerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#8B9DFF] hover:underline flex items-center gap-1 font-bold text-xs"
                        >
                          <Download size={14} /> Ver Poder
                        </a>
                      ) : (
                        <span className="text-gray-300 italic opacity-50">
                          —
                        </span>
                      )}
                    </td>
                  )}
                {mode === "funcionario" ? (
                  <td className="py-4 px-6">
                    <span
                      className={`font-bold ${
                        item.voteBlocked ? "text-red-500" : "text-green-500"
                      }`}
                    >
                      {item.voteBlocked ? "Sí" : "No"}
                    </span>
                  </td>
                ) : (
                  showActions && (
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {activeTab !== "Registros eliminados" ? (
                          <button
                            onClick={() => onAction(item, "delete")}
                            title="Mover a eliminados"
                            className="p-2 rounded-lg transition bg-red-50 text-red-500 hover:bg-red-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => onAction(item, "restore")}
                            title="Restaurar"
                            className="p-2 rounded-lg transition bg-green-50 text-green-500 hover:bg-green-100"
                          >
                            <RefreshCw size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )
                )}
              </tr>
            ))}
            {currentItems.length === 0 && (
              <tr>
                <td
                  colSpan="10"
                  className="py-16 text-center text-gray-300 font-bold italic"
                >
                  No se encontraron registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="p-2 text-gray-400 hover:text-[#0E3C42] disabled:opacity-30"
          >
            <ChevronLeft size={20} />
          </button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                currentPage === i + 1
                  ? "bg-[#D9E9E9] text-[#0E3C42] shadow-sm"
                  : "bg-gray-50 text-gray-400 hover:bg-gray-100"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-2 text-gray-400 hover:text-[#0E3C42] disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AttendanceTable;
