"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getEntityById, getAssemblyRegistriesList } from "@/lib/entities";
import { getAssemblyById, updateAssembly } from "@/lib/assembly";
import { toast } from "react-toastify";
import Loader from "@/components/basics/Loader";
import {
  Calendar,
  ChevronRight,
  Home,
  Search,
  AlertTriangle,
  X,
  Check,
} from "lucide-react";
import Link from "next/link";

const CheckIcon = () => (
  <svg
    className="w-3 h-3 text-white"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="4"
      d="M5 13l4 4L19 7"
    ></path>
  </svg>
);

const ManageAssemblyPage = () => {
  const { id, entityId } = useParams(); // id is operatorId
  const router = useRouter();
  const searchParams = useSearchParams();
  const assemblyId = searchParams.get("assemblyId");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [entityName, setEntityName] = useState("");

  // Registries State
  const [registries, setRegistries] = useState([]);
  const [registriesMap, setRegistriesMap] = useState({}); // To keep IDs
  const [blockedVoters, setBlockedVoters] = useState(new Set()); // Set of Registry IDs
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    hour: "08",
    minute: "00",
    ampm: "AM",
    type: "Virtual",
    meetLink: "",
    hasWppSupport: true,
    wppPhone: "",
    accessMethod: "database_document",
    requireFullName: false,
    requireEmail: true,
    requirePhone: false,
    canAddOtherRepresentatives: true,
    powerLimit: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!assemblyId) {
        toast.error("No se proporcionó ID de asamblea");
        router.push(`/superAdmin/operadores/${id}/${entityId}`);
        return;
      }

      if (entityId) {
        const res = await getEntityById(entityId);
        if (res.success) {
          setEntityName(res.data.name);
          // Fetch Registries if available
          if (res.data.assemblyRegistriesListId) {
            const resList = await getAssemblyRegistriesList(
              res.data.assemblyRegistriesListId
            );
            if (resList.success) {
              setRegistriesMap(resList.data);
              const regArray = Object.entries(resList.data).map(
                ([key, value]) => ({
                  id: key,
                  ...value,
                })
              );
              setRegistries(regArray);
            }
          }
        }
      }

      // Fetch Assembly Data
      const resAss = await getAssemblyById(assemblyId);
      if (resAss.success) {
        const data = resAss.data;
        // Parse time
        let hour = "08",
          minute = "00",
          ampm = "AM";
        if (data.hour) {
          const [time, period] = data.hour.split(" ");
          const [h, m] = time.split(":");
          hour = h;
          minute = m;
          ampm = period;
        }

        setFormData({
          name: data.name || "",
          date: data.date || "",
          hour,
          minute,
          ampm,
          type: data.type || "Virtual",
          meetLink: data.meetLink || "",
          hasWppSupport: data.hasWppSupport ?? true,
          wppPhone: data.wppPhone || "",
          accessMethod: data.accessMethod || "database_document",
          requireFullName: data.requireFullName ?? false,
          requireEmail: data.requireEmail ?? true,
          requirePhone: data.requirePhone ?? false,
          canAddOtherRepresentatives: data.canAddOtherRepresentatives ?? true,
          powerLimit: data.powerLimit || "",
        });
        if (data.blockedVoters) {
          setBlockedVoters(new Set(data.blockedVoters));
        }
      } else {
        toast.error("Error cargando datos de la asamblea");
      }

      setLoading(false);
    };
    fetchData();
  }, [entityId, assemblyId, id, router]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleVoteBlock = (registryId) => {
    setBlockedVoters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(registryId)) {
        newSet.delete(registryId);
      } else {
        newSet.add(registryId);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    // Basic Validation
    if (!formData.name)
      return toast.error("El nombre de la asamblea es requerido");
    if (!formData.date) return toast.error("La fecha es requerida");
    if (formData.type === "Virtual" && !formData.meetLink)
      return toast.error(
        "El link de videollamada es requerido para asambleas virtuales"
      );

    setSubmitting(true);

    const assemblyData = {
      name: formData.name,
      date: formData.date,
      hour: `${formData.hour}:${formData.minute} ${formData.ampm}`,
      type: formData.type,
      meetLink: formData.meetLink,
      hasWppSupport: formData.hasWppSupport,
      wppPhone: formData.wppPhone,
      accessMethod: formData.accessMethod,
      requireFullName: formData.requireFullName,
      requireEmail: formData.requireEmail,
      requirePhone: formData.requirePhone,
      canAddOtherRepresentatives: formData.canAddOtherRepresentatives,
      powerLimit: formData.powerLimit,
      blockedVoters: Array.from(blockedVoters), // Save blocked IDs
      updatedAt: new Date().toISOString(),
    };

    const res = await updateAssembly(assemblyId, assemblyData);

    if (res.success) {
      toast.success("Asamblea actualizada correctamente");
      // Redirect to Assembly Dashboard
      router.push(`/superAdmin/operadores/${id}/${entityId}/${assemblyId}`);
    } else {
      toast.error("Error al actualizar la asamblea");
    }
    setSubmitting(false);
  };

  // Pagination Logic
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#F8F9FB]">

      <div className="flex-1 p-8 w-full max-w-6xl mx-auto">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/superAdmin" className="hover:text-gray-600">
            <Home size={14} />
          </Link>
          <ChevronRight size={14} />
          <Link
            href={`/superAdmin/operadores/${id}`}
            className="hover:text-gray-600 underline"
          >
            Operadores logísticos
          </Link>
          <ChevronRight size={14} />
          <Link
            href={`/superAdmin/operadores/${id}/${entityId}`}
            className="hover:text-gray-600 underline"
          >
            {entityName}
          </Link>
          <ChevronRight size={14} />
          <span className="text-gray-800 font-medium">Gestionar asamblea</span>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0E3C42]">
            Gestionar Asamblea
          </h1>
          <p className="text-[#0E3C42] text-lg">En {entityName}</p>
        </div>

        {/* 1. Datos Asamblea */}
        <div className="bg-white rounded-3xl p-8 shadow-sm mb-6">
          <h2 className="text-xl font-bold text-[#0E3C42] mb-6">
            1. Datos Asamblea
          </h2>

          <div className="flex flex-col md:flex-row gap-6 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Nombre de la asamblea <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Escriba aqui un nombre descriptivo"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-[#8B9DFF] transition-colors text-sm"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
            </div>
            <div className="w-full md:w-64">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Fecha <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-[#8B9DFF] transition-colors text-sm text-gray-500"
                value={formData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Hora de inicio <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <input
                    type="text"
                    className="w-16 border border-gray-200 rounded-lg px-2 py-3 text-center text-xl font-medium outline-none focus:border-[#8B9DFF]"
                    value={formData.hour}
                    onChange={(e) => handleInputChange("hour", e.target.value)}
                    maxLength={2}
                  />
                  <span className="text-[10px] text-gray-400 mt-1">Hora</span>
                </div>
                <span className="text-xl font-bold mb-4">:</span>
                <div className="flex flex-col">
                  <input
                    type="text"
                    className="w-16 border border-gray-200 rounded-lg px-2 py-3 text-center text-xl font-medium outline-none focus:border-[#8B9DFF]"
                    value={formData.minute}
                    onChange={(e) =>
                      handleInputChange("minute", e.target.value)
                    }
                    maxLength={2}
                  />
                  <span className="text-[10px] text-gray-400 mt-1">Minuto</span>
                </div>
                <div className="flex flex-col gap-1 mb-4">
                  <button
                    onClick={() => handleInputChange("ampm", "AM")}
                    className={`px-2 py-1 text-xs font-bold rounded ${
                      formData.ampm === "AM"
                        ? "bg-[#8B9DFF] text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    AM
                  </button>
                  <button
                    onClick={() => handleInputChange("ampm", "PM")}
                    className={`px-2 py-1 text-xs font-bold rounded ${
                      formData.ampm === "PM"
                        ? "bg-[#8B9DFF] text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Type */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Tipo de asamblea <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col md:flex-row gap-4">
              {["Presencial", "Virtual", "Mixta"].map((type) => (
                <label
                  key={type}
                  className={`flex-1 flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    formData.type === type
                      ? "border-[#8B9DFF] bg-blue-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      formData.type === type
                        ? "border-[#8B9DFF]"
                        : "border-gray-300"
                    }`}
                  >
                    {formData.type === type && (
                      <div className="w-3 h-3 rounded-full bg-[#8B9DFF]" />
                    )}
                  </div>
                  <span
                    className={`font-semibold ${
                      formData.type === type
                        ? "text-[#0E3C42]"
                        : "text-gray-500"
                    }`}
                  >
                    {type}
                  </span>
                  <input
                    type="radio"
                    name="assemblyType"
                    className="hidden"
                    checked={formData.type === type}
                    onChange={() => handleInputChange("type", type)}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Link & Support */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Link de videollamada
              </label>
              <input
                type="text"
                placeholder="Pega el link de la llamada aqui"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-[#8B9DFF] transition-colors text-sm"
                value={formData.meetLink}
                onChange={(e) => handleInputChange("meetLink", e.target.value)}
              />
            </div>
            <div className="w-full md:w-auto">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ¿Vas a tener Soporte por WhatsApp?
              </label>
              <div className="flex gap-4">
                <label
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl border cursor-pointer transition-all ${
                    formData.hasWppSupport
                      ? "border-[#8B9DFF] bg-blue-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      formData.hasWppSupport
                        ? "border-[#8B9DFF]"
                        : "border-gray-300"
                    }`}
                  >
                    {formData.hasWppSupport && (
                      <div className="w-3 h-3 rounded-full bg-[#8B9DFF]" />
                    )}
                  </div>
                  <span className="font-semibold text-sm">Si</span>
                  <input
                    type="radio"
                    checked={formData.hasWppSupport}
                    onChange={() => handleInputChange("hasWppSupport", true)}
                    className="hidden"
                  />
                </label>
                <label
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl border cursor-pointer transition-all ${
                    !formData.hasWppSupport
                      ? "border-[#8B9DFF] bg-blue-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      !formData.hasWppSupport
                        ? "border-[#8B9DFF]"
                        : "border-gray-300"
                    }`}
                  >
                    {!formData.hasWppSupport && (
                      <div className="w-3 h-3 rounded-full bg-[#8B9DFF]" />
                    )}
                  </div>
                  <span className="font-semibold text-sm">No</span>
                  <input
                    type="radio"
                    checked={!formData.hasWppSupport}
                    onChange={() => handleInputChange("hasWppSupport", false)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Número de WhatsApp para Soporte{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Escriba aqui el número para soporte"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-[#8B9DFF] transition-colors text-sm"
                value={formData.wppPhone}
                onChange={(e) => handleInputChange("wppPhone", e.target.value)}
                disabled={!formData.hasWppSupport}
              />
            </div>
          </div>
        </div>

        {/* 2. Configuración de registro */}
        <div className="bg-white rounded-3xl p-8 shadow-sm mb-6">
          <h2 className="text-xl font-bold text-[#0E3C42] mb-6">
            2. Configuración de registro para asambleístas
          </h2>
          <p className="text-gray-500 mb-6">
            Defina cómo ingresarán los Asambleístas
          </p>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Método de Ingreso <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col md:flex-row gap-4">
              {[
                {
                  id: "database_document",
                  label: "Documento de la base de datos",
                },
              ].map((method) => (
                <label
                  key={method.id}
                  className={`flex-1 flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    formData.accessMethod === method.id
                      ? "border-[#8B9DFF] bg-blue-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      formData.accessMethod === method.id
                        ? "border-[#8B9DFF]"
                        : "border-gray-300"
                    }`}
                  >
                    {formData.accessMethod === method.id && (
                      <div className="w-3 h-3 rounded-full bg-[#8B9DFF]" />
                    )}
                  </div>
                  <span
                    className={`font-semibold ${
                      formData.accessMethod === method.id
                        ? "text-[#0E3C42]"
                        : "text-gray-500"
                    }`}
                  >
                    {method.label}
                  </span>
                  <input
                    type="radio"
                    name="accessMethod"
                    className="hidden"
                    checked={formData.accessMethod === method.id}
                    onChange={() =>
                      handleInputChange("accessMethod", method.id)
                    }
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Solicitar información adicional{" "}
              <span className="text-xs font-normal text-gray-400">
                (opcional)
              </span>
            </label>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Name */}
              <label
                className={`flex-1 flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  formData.requireFullName
                    ? "border-[#8B9DFF] bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center ${
                    formData.requireFullName
                      ? "border-[#8B9DFF] bg-[#8B9DFF]"
                      : "border-gray-300"
                  }`}
                >
                  {formData.requireFullName && <CheckIcon />}
                </div>
                <span
                  className={`font-semibold ${
                    formData.requireFullName
                      ? "text-[#0E3C42]"
                      : "text-gray-500"
                  }`}
                >
                  Nombre y apellido
                </span>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={formData.requireFullName}
                  onChange={() =>
                    handleInputChange(
                      "requireFullName",
                      !formData.requireFullName
                    )
                  }
                />
              </label>
              {/* Email */}
              <label
                className={`flex-1 flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  formData.requireEmail
                    ? "border-[#8B9DFF] bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center ${
                    formData.requireEmail
                      ? "border-[#8B9DFF] bg-[#8B9DFF]"
                      : "border-gray-300"
                  }`}
                >
                  {formData.requireEmail && <CheckIcon />}
                </div>
                <span
                  className={`font-semibold ${
                    formData.requireEmail ? "text-[#0E3C42]" : "text-gray-500"
                  }`}
                >
                  Correo electrónico
                </span>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={formData.requireEmail}
                  onChange={() =>
                    handleInputChange("requireEmail", !formData.requireEmail)
                  }
                />
              </label>
              {/* Phone */}
              <label
                className={`flex-1 flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  formData.requirePhone
                    ? "border-[#8B9DFF] bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center ${
                    formData.requirePhone
                      ? "border-[#8B9DFF] bg-[#8B9DFF]"
                      : "border-gray-300"
                  }`}
                >
                  {formData.requirePhone && <CheckIcon />}
                </div>
                <span
                  className={`font-semibold ${
                    formData.requirePhone ? "text-[#0E3C42]" : "text-gray-500"
                  }`}
                >
                  Número de teléfono
                </span>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={formData.requirePhone}
                  onChange={() =>
                    handleInputChange("requirePhone", !formData.requirePhone)
                  }
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              ¿El asambleísta puede añadir otras representaciones?{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label
                className={`w-40 flex items-center gap-3 px-6 py-3 rounded-xl border cursor-pointer transition-all ${
                  formData.canAddOtherRepresentatives
                    ? "border-[#8B9DFF] bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    formData.canAddOtherRepresentatives
                      ? "border-[#8B9DFF]"
                      : "border-gray-300"
                  }`}
                >
                  {formData.canAddOtherRepresentatives && (
                    <div className="w-3 h-3 rounded-full bg-[#8B9DFF]" />
                  )}
                </div>
                <span className="font-semibold text-sm">Si</span>
                <input
                  type="radio"
                  checked={formData.canAddOtherRepresentatives}
                  onChange={() =>
                    handleInputChange("canAddOtherRepresentatives", true)
                  }
                  className="hidden"
                />
              </label>
              <label
                className={`w-40 flex items-center gap-3 px-6 py-3 rounded-xl border cursor-pointer transition-all ${
                  !formData.canAddOtherRepresentatives
                    ? "border-[#8B9DFF] bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    !formData.canAddOtherRepresentatives
                      ? "border-[#8B9DFF]"
                      : "border-gray-300"
                  }`}
                >
                  {!formData.canAddOtherRepresentatives && (
                    <div className="w-3 h-3 rounded-full bg-[#8B9DFF]" />
                  )}
                </div>
                <span className="font-semibold text-sm">No</span>
                <input
                  type="radio"
                  checked={!formData.canAddOtherRepresentatives}
                  onChange={() =>
                    handleInputChange("canAddOtherRepresentatives", false)
                  }
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* 3. Poderes */}
        <div className="bg-white rounded-3xl p-8 shadow-sm mb-6">
          <h2 className="text-xl font-bold text-[#0E3C42] mb-6">3. Poderes</h2>
          <p className="text-gray-500 mb-6">
            Defina el número máximo de poderes que un propietario puede tener.
          </p>

          <div className="max-w-md">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Limite de Poderes por Propietario{" "}
              <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-[#8B9DFF] transition-colors text-sm bg-white"
              value={formData.powerLimit}
              onChange={(e) => handleInputChange("powerLimit", e.target.value)}
            >
              <option value="">Seleccionar límite</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="no_limit">Sin límite</option>
            </select>
          </div>
        </div>

        {/* 4. Restricción de voto */}
        <div className="bg-white rounded-3xl p-8 shadow-sm mb-12">
          <h2 className="text-xl font-bold text-[#0E3C42] mb-6">
            4. Restricción de voto
          </h2>
          <p className="text-gray-500 mb-4 text-sm">
            En este paso puede marcar a los asambleístas que no tendrán derecho
            a votar en esta asamblea, por ejemplo, propietarios con cuotas en
            mora u otras causales establecidas en el reglamento interno del
            conjunto.
          </p>

          {/* Alert Warning */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 relative">
            <button className="absolute top-2 right-2 text-orange-400 hover:text-orange-600">
              <X size={16} />
            </button>
            <div className="flex gap-3">
              <AlertTriangle
                className="text-orange-500 flex-shrink-0"
                size={20}
              />
              <div>
                <h4 className="font-bold text-orange-700 text-sm mb-1">
                  Importante
                </h4>
                <p className="text-orange-600 text-xs leading-relaxed">
                  La responsabilidad de definir a qué asambleístas se les
                  restringe el voto recae exclusivamente en el Operador
                  Logistico o en la administración o funcionario de la entidad.
                  IntuApp no valida las causales de restricción ni asume
                  responsabilidad legal por el uso de esta función.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Busca por torre, # de unidad privada o cédula"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-[#8B9DFF] text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-100 rounded-xl mb-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Item</th>
                  <th className="py-4 px-6">Tipo</th>
                  <th className="py-4 px-6">Grupo</th>
                  <th className="py-4 px-6">Propiedad</th>
                  <th className="py-4 px-6">Coeficiente</th>
                  <th className="py-4 px-6">Documento</th>
                  <th className="py-4 px-6 text-center">Restringir voto</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition text-sm"
                  >
                    <td className="py-4 px-6 text-gray-600">
                      {item.item || "-"}
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {item.tipo || "-"}
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {item.grupo || "-"}
                    </td>
                    <td className="py-4 px-6 text-[#0E3C42] font-semibold">
                      {item.propiedad || "-"}
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {item.coeficiente || "0"}%
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {item.documento || "-"}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => toggleVoteBlock(item.id)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          blockedVoters.has(item.id)
                            ? "bg-red-500"
                            : "bg-gray-200"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                            blockedVoters.has(item.id) ? "left-7" : "left-1"
                          }`}
                        ></div>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center text-sm text-gray-500">
            <p>
              Mostrando {currentItems.length} de {filteredRegistries.length}{" "}
              registros
            </p>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Anterior
              </button>
              <button
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() =>
              router.push(`/superAdmin/operadores/${id}/${entityId}`)
            }
            className="px-10 py-4 border border-gray-200 rounded-full font-bold text-[#0E3C42] hover:bg-white transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-10 py-4 bg-[#0E3C42] hover:bg-[#08282d] text-white rounded-full font-bold shadow-lg shadow-gray-200 transition flex items-center gap-2"
          >
            {submitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            Actualizar Asamblea
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageAssemblyPage;
