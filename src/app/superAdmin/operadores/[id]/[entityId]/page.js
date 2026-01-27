"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getEntityById,
  getAssemblyRegistriesList,
  updateAssemblyRegistriesList,
  createAssemblyRegistriesList,
  updateEntity,
  deleteEntity,
} from "@/lib/entities";
import { getEntityTypes } from "@/lib/masterData";
import { colombiaCities } from "@/lib/colombiaCities";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Loader from "@/components/basics/Loader";
import { toast } from "react-toastify";
import { usePageTitle } from "@/context/PageTitleContext";
import {
  Building2,
  Edit2,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  CloudUpload,
  Download,
  Upload,
  Bot,
  Check,
  X,
  Save,
  MapPin,
  Settings,
  Users,
  Plus,
  Video,
} from "lucide-react";
import { getAssemblyById } from "@/lib/assembly";

import EntityDatabaseManager from "@/components/entities/EntityDatabaseManager";
import Button from "@/components/basics/Button";

const EntityDetailPage = () => {
  const { id, entityId } = useParams();
  const router = useRouter();
  const { setSegmentTitle } = usePageTitle();
  const [loading, setLoading] = useState(true);
  const [entityData, setEntityData] = useState(null);
  const [assemblies, setAssemblies] = useState([]); // Changed from activeAssembly to assemblies array
  const [registries, setRegistries] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [entityTypes, setEntityTypes] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    nit: "",
    type: "",
    city: "",
    address: "",
  });

  // Assembly filters
  const [assemblySearchTerm, setAssemblySearchTerm] = useState("");
  const [assemblyTypeFilter, setAssemblyTypeFilter] = useState("");
  const [assemblyStatusFilter, setAssemblyStatusFilter] = useState("");

  const fetchEntityData = useCallback(async () => {
    if (!entityId) return;

    const res = await getEntityById(entityId);
    if (res.success) {
      setEntityData(res.data);
      setSegmentTitle(entityId, res.data.name);
      setFormData({
        name: res.data.name || "",
        nit: res.data.nit || "",
        type: res.data.type || "",
        city: res.data.city || "",
        address: res.data.address || "",
      });

      if (res.data.assemblyRegistriesListId) {
        const resList = await getAssemblyRegistriesList(
          res.data.assemblyRegistriesListId,
        );
        if (resList.success) {
          // Convert Map to Array
          const registriesArray = Object.values(resList.data);
          setRegistries(registriesArray);
        }
      }

      // Fetch all assemblies for this entity
      if (
        res.data.lastUpdateOwners &&
        Array.isArray(res.data.lastUpdateOwners)
      ) {
        const assemblyPromises = res.data.lastUpdateOwners.map((assemblyId) =>
          getAssemblyById(assemblyId),
        );
        const assemblyResults = await Promise.all(assemblyPromises);
        const fetchedAssemblies = assemblyResults
          .filter((result) => result.success)
          .map((result) => result.data);
        setAssemblies(fetchedAssemblies);
      } else if (res.data.lastUpdateOwners) {
        // Backward compatibility: if it's a single ID (string), convert to array
        const resAssembly = await getAssemblyById(res.data.lastUpdateOwners);
        if (resAssembly.success) {
          setAssemblies([resAssembly.data]);
        }
      }
    } else {
      toast.error("Error cargando entidad");
      router.push(`/superAdmin/operadores/${id}`);
    }
    setLoading(false);
  }, [entityId, id, router, setSegmentTitle]);

  const fetchEntityTypes = async () => {
    const res = await getEntityTypes();
    if (res.success) {
      setEntityTypes(res.data);
    }
  };

  useEffect(() => {
    fetchEntityData();
    fetchEntityTypes();
  }, [fetchEntityData]);

  const handleSaveEntity = async () => {
    setLoading(true);
    const res = await updateEntity(entityId, formData);
    if (res.success) {
      toast.success("Entidad actualizada correctamente");
      setIsEditing(false);
      fetchEntityData();
    } else {
      toast.error("Error al actualizar entidad");
    }
    setLoading(false);
  };

  const handleDeleteEntity = async () => {
    if (
      confirm(
        "¿Estás seguro de que deseas eliminar esta entidad? Esta acción no se puede deshacer.",
      )
    ) {
      setLoading(true);
      const res = await deleteEntity(entityId);
      if (res.success) {
        toast.success("Entidad eliminada correctamente");
        router.push(`/superAdmin/operadores/${id}`);
      } else {
        toast.error("Error al eliminar entidad");
        setLoading(false);
      }
    }
  };

  const getTypeNameInSpanish = (typeName) => {
    const translations = {
      Residential: "Residencial",
      Commercial: "Comercial",
      Mixed: "Mixto",
      "Horizontal Property": "Propiedad Horizontal",
    };
    return translations[typeName] || typeName;
  };

  const getTypeLabel = (typeIdOrName) => {
    const typeObj = entityTypes.find((t) => t.id === typeIdOrName);
    if (typeObj) {
      return getTypeNameInSpanish(typeObj.name);
    }
    return getTypeNameInSpanish(typeIdOrName);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader />
      </div>
    );
  }

  if (!entityData) return null;

  return (
    <div className="flex flex-col w-full">    
      <div className="flex flex-col gap-8 mx-15">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-[32px] font-bold text-[#0E3C42]">
            {entityData.name}
          </h1>
          <Button
            onClick={handleDeleteEntity}
            className="flex items-center gap-2 bg-[#94A2FF] !text-[#000000] hover:bg-[#7a8ce0] !font-bold px-6 py-3 font-semibold shadow-md transition"
          >
            <Trash2 size={20} />
            Eliminar Entidad
          </Button>
        </div>

        {/* Section 1: General Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#0E3C42]">
              Información General
            </h2>
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-[#94A2FF] !text-[#000000] hover:bg-[#7a8ce0] !font-bold px-6 py-3 font-semibold shadow-md transition"
              >
                <Edit2 size={16} />
                Editar información
              </Button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 border border-gray-300 text-gray-600 px-4 py-2 rounded-full font-medium text-sm hover:bg-gray-50"
                >
                  <X size={16} />
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEntity}
                  className="flex items-center gap-2 bg-[#6A7EFF] hover:bg-[#5b6ef0] text-white px-5 py-2 rounded-full font-medium shadow-sm transition text-sm"
                >
                  <Save size={16} />
                  Guardar
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <label className="text-sm text-gray-500 block mb-1">Nit</label>
              {isEditing ? (
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  value={formData.nit}
                  onChange={(e) =>
                    setFormData({ ...formData, nit: e.target.value })
                  }
                />
              ) : (
                <p className="font-semibold text-gray-800 text-lg">
                  {entityData.nit}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">
                Tipo entidad
              </label>
              {isEditing ? (
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                >
                  <option value="">Seleccionar</option>
                  {entityTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {getTypeNameInSpanish(type.name)}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="bg-indigo-100 text-[#000000] px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-1">
                  <Building2 size={14} />
                  {getTypeLabel(entityData.type)}
                </span>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">
                Asambleistas registrados
              </label>
              <p className="font-semibold text-gray-800 text-lg">
                {registries.length}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">Ciudad</label>
              {isEditing ? (
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                >
                  <option value="">Seleccionar</option>
                  {colombiaCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="font-semibold text-gray-800 text-lg">
                  {entityData.city}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">
                Dirección
              </label>
              {isEditing ? (
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              ) : (
                <p className="font-semibold text-gray-800 text-lg">
                  {entityData.address}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Asambleas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[22px] font-bold text-[#0E3C42]">Asambleas</h2>
            <Button
              onClick={() =>
                router.push(
                  `/superAdmin/operadores/${id}/${entityId}/crear-asamblea`,
                )
              }
              className="flex items-center gap-2 bg-[#94A2FF] !text-[#000000] hover:bg-[#7a8ce0] !font-bold px-6 py-3 font-semibold shadow-md transition"
            >
              <Plus size={20} />
              Crear Asamblea
            </Button>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2"
                size={20}
              />
              <input
                type="text"
                placeholder="Buscar asamblea por nombre"
                value={assemblySearchTerm}
                onChange={(e) => setAssemblySearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg outline-none focus:border-[#8B9DFF] transition"
              />
            </div>
            <select
              value={assemblyTypeFilter}
              onChange={(e) => setAssemblyTypeFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-[#8B9DFF] bg-white min-w-[140px] transition"
            >
              <option value="">Tipo</option>
              <option value="Virtual">Virtual</option>
              <option value="Presencial">Presencial</option>
              <option value="Mixta">Mixta</option>
            </select>
            <select
              value={assemblyStatusFilter}
              onChange={(e) => setAssemblyStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-[#8B9DFF] bg-white min-w-[140px] transition"
            >
              <option value="">Estado</option>
              <option value="created">Por iniciar</option>
              <option value="started">En vivo</option>
              <option value="finished">Finalizada</option>
            </select>
          </div>

          {/* Assemblies Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left border-collapse">
              <thead className="">
                <tr className="border-b border-gray-200">
                  <th className="py-4 px-6 font-bold text-[#242330] text-[16px]">
                    Nombre de la Asamblea
                  </th>
                  <th className="py-4 px-6 font-bold text-[#242330] text-[16px]">
                    Fecha
                  </th>
                  <th className="py-4 px-6 font-bold text-[#242330] text-[16px]">
                    Hora
                  </th>
                  <th className="py-4 px-6 font-bold text-[#242330] text-center text-[16px]">
                    Tipo
                  </th>
                  <th className="py-4 px-6 font-bold text-[#242330] text-center text-[16px]">
                    Estado
                  </th>
                  <th className="py-4 px-6 font-bold text-[#242330] text-center text-[16px]">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {assemblies.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="py-12 text-center text-gray-500 text-sm"
                    >
                      No hay asambleas creadas aún.
                    </td>
                  </tr>
                ) : (
                  assemblies
                    .filter((assembly) => {
                      const matchesSearch = assembly.name
                        ?.toLowerCase()
                        .includes(assemblySearchTerm.toLowerCase());
                      const matchesType =
                        !assemblyTypeFilter ||
                        assembly.type === assemblyTypeFilter;
                      const matchesStatus =
                        !assemblyStatusFilter ||
                        assembly.status === assemblyStatusFilter;
                      return matchesSearch && matchesType && matchesStatus;
                    })
                    .map((assembly) => {
                      const getStatusBadge = () => {
                        if (
                          assembly.status === "started" ||
                          assembly.status === "registries_finalized"
                        ) {
                          return {
                            text: "En vivo",
                            className: "bg-red-100 text-red-600",
                            dot: true,
                          };
                        } else if (assembly.status === "finished") {
                          return {
                            text: "Finalizada",
                            className: "bg-teal-100 text-teal-600",
                            dot: false,
                          };
                        } else {
                          return {
                            text: "Agendada",
                            className: "bg-orange-100 text-orange-600",
                            dot: false,
                          };
                        }
                      };

                      const statusBadge = getStatusBadge();

                      return (
                        <tr
                          key={assembly.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition"
                        >
                          <td className="py-4 px-6">
                            <span className="font-medium text-gray-900 text-[14px]">
                              {assembly.name}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-gray-600 text-[14px]">
                            {assembly.date || "-"}
                          </td>
                          <td className="py-4 px-6 text-gray-600 text-[14px]">
                            {assembly.hour || "-"}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="text-[14px] text-[#000000] font-bold inline-flex items-center border rounded-full px-2 py-1 gap-1 font-bold ">
                              {assembly.type === "Presencial" ? (
                                <>
                                  <Users size={14} />
                                  Presencial
                                </>
                              ) : assembly.type === "Virtual" ? (
                                <>
                                  <Video size={14} />
                                  Virtual
                                </>
                              ) : (
                                <>
                                  <Users size={14} />
                                  Mixta
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusBadge.className}`}
                            >
                              {statusBadge.dot && (
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                              )}
                              {statusBadge.text}
                            </span>
                          </td>
                          <td className="py-4 px-6 flex justify-center">
                            <button
                              onClick={() =>
                                router.push(
                                  `/superAdmin/operadores/${id}/${entityId}/${assembly.id}`,
                                )
                              }
                              className="w-10 h-10 rounded-full bg-[#8B9FFD] hover:bg-[#7a8ce0] flex items-center justify-center text-black transition shadow-md"
                              title="Ver asamblea"
                            >
                              <Eye size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Base de Datos de Asambleísta */}
        <EntityDatabaseManager
          entityData={entityData}
          registries={registries}
          onRefresh={fetchEntityData}
        />
      </div>
    </div>
  );
};

export default EntityDetailPage;
