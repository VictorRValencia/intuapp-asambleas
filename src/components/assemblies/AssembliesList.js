"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Eye,
  Grid3x3,
  List,
  ChevronLeft,
  ChevronRight,
  Video,
  Users,
} from "lucide-react";
import Button from "@/components/basics/Button";
import Loader from "@/components/basics/Loader";

export default function AssembliesList({
  data = [],
  loading = false,
  onCreateClick,
  getDetailUrl,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [assemblyStatusFilter, setAssemblyStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);

  const filteredAssemblies = useMemo(() => {
    let filtered = [...data];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.entityName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.operatorName?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Filter by type
    if (typeFilter && typeFilter !== "all") {
      filtered = filtered.filter((a) => a.type === typeFilter);
    }

    // Filter by status
    if (assemblyStatusFilter && assemblyStatusFilter !== "all") {
      filtered = filtered.filter((a) => a.status === assemblyStatusFilter);
    }

    // Sort
    if (sortBy === "date") {
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortBy === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "status") {
      const statusOrder = { started: 1, create: 2, finished: 3 };
      filtered.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    }

    return filtered;
  }, [searchTerm, typeFilter, assemblyStatusFilter, sortBy, data]);

  const getStatusBadge = (status) => {
    if (status === "started" || status === "registries_finalized") {
      return {
        text: "En vivo",
        className: "bg-red-100 text-red-600",
        dot: true,
      };
    } else if (status === "finished") {
      return {
        text: "Finalizada",
        className: "bg-green-100 text-green-600",
        dot: false,
      };
    } else {
      return {
        text: "Próxima",
        className: "bg-orange-100 text-orange-600",
        dot: false,
      };
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAssemblies.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredAssemblies.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#0E3C42]">Asambleas</h1>
          </div>
          <Button
            onClick={onCreateClick}
            icon={Plus}
            className="flex items-center gap-2 bg-[#94A2FF] !text-[#000000] hover:bg-[#7a8ce0] !font-bold px-6 py-3 font-semibold shadow-md transition"
          >
            Crear Asamblea
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Busca por nombre"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-[#8B9DFF] transition"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-[#8B9DFF] transition bg-white"
            >
              <option value="">Tipo</option>
              <option value="all">Todos</option>
              <option value="Virtual">Virtual</option>
              <option value="Presencial">Presencial</option>
              <option value="Mixta">Mixta</option>
            </select>

            {/* Status Filter */}
            <select
              value={assemblyStatusFilter}
              onChange={(e) => setAssemblyStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-[#8B9DFF] transition bg-white"
            >
              <option value="">Estado</option>
              <option value="all">Todos</option>
              <option value="create">Próxima</option>
              <option value="started">En vivo</option>
              <option value="finished">Finalizada</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-[#8B9DFF] transition bg-white"
            >
              <option value="date">Ordenar por</option>
              <option value="date">Fecha</option>
              <option value="name">Nombre</option>
              <option value="status">Estado</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                  viewMode === "grid"
                    ? "bg-white text-[#8B9DFF] shadow-sm"
                    : "text-gray-500"
                }`}
              >
                <Grid3x3 size={18} />
                <span className="hidden sm:inline">Vista tarjetas</span>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                  viewMode === "list"
                    ? "bg-white text-[#8B9DFF] shadow-sm"
                    : "text-gray-500"
                }`}
              >
                <List size={18} />
                <span className="hidden sm:inline">Vista lista</span>
              </button>
            </div>
          </div>
        </div>

        {/* Assemblies Grid/List */}
        {currentItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No se encontraron asambleas</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {currentItems.map((assembly) => {
              const statusBadge = getStatusBadge(assembly.status);

              return (
                <div
                  key={assembly.id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col"
                >
                  <h3 className="text-xl font-bold text-[#0E3C42] mb-4 line-clamp-2 min-h-[56px]">
                    {assembly.name}
                  </h3>

                  <div className="space-y-2 mb-4 flex-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Operador:</span>{" "}
                      {assembly.operatorName}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Entidad:</span>{" "}
                      {assembly.entityName}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Próxima asamblea:</span>{" "}
                      {assembly.date || "Por definir"}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Hora:</span>{" "}
                      {assembly.hour || "Por definir"}
                    </p>
                  </div>

                  {/* Badges */}
                  <div className="flex gap-2 mb-6 flex-wrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        assembly.type === "Presencial"
                          ? "bg-[#0E3C42] text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {assembly.type === "Presencial" ? (
                        <Users size={12} className="inline mr-1" />
                      ) : (
                        <Video size={12} className="inline mr-1" />
                      )}
                      {assembly.type || "Virtual"}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${statusBadge.className}`}
                    >
                      {statusBadge.dot && (
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      )}
                      {statusBadge.text}
                    </span>
                  </div>

                  {/* Action Button */}
                  <a
                    href={getDetailUrl ? getDetailUrl(assembly) : "#"}
                    className="w-full bg-[#8B9DFF] hover:bg-[#7a8ce0] text-black  py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 transition flex items-center justify-center gap-2"
                  >
                    <Eye size={18} />
                    Ver Asamblea
                  </a>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">
                      Asamblea
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">
                      Operador
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">
                      Entidad
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">
                      Fecha
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentItems.map((assembly) => {
                    const statusBadge = getStatusBadge(assembly.status);

                    return (
                      <tr
                        key={assembly.id}
                        className="hover:bg-gray-50 transition"
                      >
                        <td className="px-6 py-4">
                          <p className="font-semibold text-[#0E3C42]">
                            {assembly.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {assembly.type}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {assembly.operatorName}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {assembly.entityName}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {assembly.date} - {assembly.hour}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit ${statusBadge.className}`}
                          >
                            {statusBadge.dot && (
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                            )}
                            {statusBadge.text}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <a
                            href={getDetailUrl ? getDetailUrl(assembly) : "#"}
                            className="text-[#8B9DFF] hover:text-[#7a8ce0] font-semibold flex items-center gap-1"
                          >
                            <Eye size={16} />
                            Ver
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            <Button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg border transition ${
                currentPage === 1
                  ? "border-gray-200 text-black cursor-not-allowed"
                  : "border-gray-300 text-black hover:bg-gray-50"
              }`}
            >
              <ChevronLeft size={20} />
            </Button>

            {[...Array(totalPages)].map((_, index) => {
              const pageNumber = index + 1;
              if (
                pageNumber === 1 ||
                pageNumber === totalPages ||
                (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNumber}
                    onClick={() => paginate(pageNumber)}
                    className={`w-10 h-10 rounded-lg border transition ${
                      currentPage === pageNumber
                        ? "bg-[#8B9DFF] text-white border-[#8B9DFF]"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              } else if (
                pageNumber === currentPage - 2 ||
                pageNumber === currentPage + 2
              ) {
                return (
                  <span key={pageNumber} className="text-gray-400">
                    ...
                  </span>
                );
              }
              return null;
            })}

            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg border transition ${
                currentPage === totalPages
                  ? "border-gray-200 text-gray-400 cursor-not-allowed"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
