"use client";

import React, { useState } from "react";
import { Edit2, CloudUpload, Search, Trash2 } from "lucide-react";
import Button from "@/components/basics/Button";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  updateAssemblyRegistriesList,
  createAssemblyRegistriesList,
} from "@/lib/entities";
import { validateExcelData } from "@/lib/excelValidation";
import ExcelPreviewModal from "@/components/modals/ExcelPreviewModal";

const EntityDatabaseManager = ({ entityData, registries, onRefresh }) => {
  // Pagination & Search
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  // Excel Upload State
  const [excelData, setExcelData] = useState([]);
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [excelFileName, setExcelFileName] = useState("");
  const [uploading, setUploading] = useState(false);

  // --- Handlers ---

  const handleFileUpload = (e) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];

      // Get headers
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rawData.length === 0) {
        toast.error("El archivo está vacío");
        return;
      }
      const headers = rawData[0];
      const data = XLSX.utils.sheet_to_json(ws);

      // Validate immediately
      const validation = validateExcelData(data);
      if (!validation.valid) {
        toast.error(
          <div>
            <p className="font-bold">Errores en el archivo:</p>
            <ul className="list-disc pl-4 text-sm max-h-40 overflow-y-auto">
              {validation.errors.slice(0, 10).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {validation.errors.length > 10 && (
                <li>... y {validation.errors.length - 10} más.</li>
              )}
            </ul>
          </div>,
          { autoClose: 10000 }
        );
        e.target.value = "";
        return;
      }

      setExcelHeaders(headers);
      setExcelData(data);
      setExcelFileName(file.name);
      setShowPreviewModal(true);
    };
    reader.readAsBinaryString(file);
  };

  const handleUpdateDatabase = async () => {
    setUploading(true);
    try {
      if (entityData.assemblyRegistriesListId) {
        // Update existing list
        const res = await updateAssemblyRegistriesList(
          entityData.assemblyRegistriesListId,
          excelData
        );
        if (res.success) {
          toast.success("Base de datos actualizada correctamente");
        } else {
          toast.error("Error al actualizar la base de datos");
        }
      } else {
        // Create new list
        const res = await createAssemblyRegistriesList(excelData);
        if (res.success) {
          // Link to entity
          const entityRef = doc(db, "entity", entityData.id);
          await updateDoc(entityRef, {
            assemblyRegistriesListId: res.id,
            databaseStatus: "done",
          });
          toast.success("Base de datos creada y vinculada correctamente");
        } else {
          toast.error("Error al crear la base de datos");
        }
      }
      setShowPreviewModal(false);
      setExcelData([]);
      setExcelFileName("");
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error updating database:", error);
      toast.error("Ocurrió un error inesperado");
    }
    setUploading(false);
  };

  const handleDeleteRegistry = async (itemToDelete) => {
    // Check if property is currently registered in an assembly
    if (itemToDelete.registerInAssembly) {
      return toast.error(
        "No se puede eliminar una propiedad que ya tiene un registro de asambleísta activo. Por favor, elimine primero el registro desde la gestión de la asamblea."
      );
    }

    if (confirm("¿Estás seguro de eliminar este registro?")) {
      try {
        const updatedList = registries.filter((r) => r !== itemToDelete);

        const res = await updateAssemblyRegistriesList(
          entityData.assemblyRegistriesListId,
          updatedList
        );

        if (res.success) {
          toast.success("Registro eliminado correctamente");
          if (onRefresh) onRefresh();
        } else {
          toast.error("Error al eliminar el registro");
        }
      } catch (error) {
        console.error("Error deleting registry:", error);
        toast.error("Error al eliminar el registro");
      }
    }
  };

  // --- Filtering & Pagination ---
  const filteredRegistries = registries.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return Object.values(item).some((val) =>
      String(val).toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredRegistries.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRegistries.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[#0E3C42]">
          Base de Datos de Asambleísta
        </h2>
        <div className="flex gap-4">
          <Button
            variant="secondary"
            size="S"
            onClick={() => {
              if (registries.length > 0) {
                setExcelData(registries);
                setExcelHeaders(Object.keys(registries[0]));
                setExcelFileName(`Base de datos actual - ${entityData.name}`);
                setShowPreviewModal(true);
              } else {
                toast.info(
                  "No hay datos para editar. Cargue un archivo primero."
                );
              }
            }}
            icon={Edit2}
          >
            Editar Base de Datos
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <Button variant="primary" size="S" icon={CloudUpload} className="flex items-center gap-2 bg-[#94A2FF] !text-[#000000] hover:bg-[#7a8ce0] !font-bold px-6 py-3 font-semibold shadow-md transition">
              Actualizar Base de Datos
            </Button>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        La siguiente base de datos fue cargada el{" "}
        <span className="bg-[#ABE7E5] text-[#0E3C42] px-2 py-0.5 rounded text-xs font-bold">
          20/Jul/2025 {/* Hardcoded placeholder per request/source */}
        </span>
      </p>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Buscar"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <select className="border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 bg-white min-w-[120px]">
          <option>Tipo</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200 text-sm text-gray-800">
              <th className="py-3 px-4 font-bold">Item</th>
              <th className="py-3 px-4 font-bold">Tipo</th>
              <th className="py-3 px-4 font-bold">Grupo</th>
              <th className="py-3 px-4 font-bold">Propiedad</th>
              <th className="py-3 px-4 font-bold">Coeficiente</th>
              <th className="py-3 px-4 font-bold">Votos</th>
              <th className="py-3 px-4 font-bold">Documento</th>
              <th className="py-3 px-4 font-bold">Acción</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((reg, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors text-sm"
                >
                  <td className="py-4 px-4 text-gray-700">
                    {reg.item || reg.Item || "-"}
                  </td>
                  <td className="py-4 px-4 text-gray-700">
                    {reg.tipo || reg.Tipo || "-"}
                  </td>
                  <td className="py-4 px-4 text-gray-700">
                    {reg.grupo || reg.Grupo || "-"}
                  </td>
                  <td className="py-4 px-4 text-gray-700 font-medium">
                    {reg.propiedad || reg.Propiedad || "-"}
                  </td>
                  <td className="py-4 px-4 text-gray-700">
                    {reg.coeficiente || reg.Coeficiente || "0.00"}%
                  </td>
                  <td className="py-4 px-4 text-gray-700">
                    {reg.numeroVotos || reg.NumeroVotos || "1"}
                  </td>
                  <td className="py-4 px-4 text-gray-700">
                    {reg.documento || reg.Documento || "-"}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button
                      className="text-gray-400 hover:text-red-500 transition"
                      onClick={() => handleDeleteRegistry(reg)}
                      title="Eliminar registro"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-500">
                  No se encontraron registros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-end mt-4">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              &lt; Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => paginate(i + 1)}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  currentPage === i + 1
                    ? "bg-[#ABE7E5] text-[#0E3C42]"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              Siguiente &gt;
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      <ExcelPreviewModal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setExcelData([]);
          setExcelHeaders([]);
          setExcelFileName("");
        }}
        data={excelData}
        setData={setExcelData}
        headers={excelHeaders}
        fileName={excelFileName}
        onAccept={handleUpdateDatabase}
        uploading={uploading}
      />
    </div>
  );
};

export default EntityDatabaseManager;
