"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getOperatorById,
  updateOperator,
  deleteOperator,
} from "@/lib/operators";
import Loader from "@/components/basics/Loader";
import CustomInput from "@/components/basics/CustomInput";
import { toast } from "react-toastify";
import TopBar from "@/components/ui/TopBar";
import {
  createEntity,
  createEntityAdmin,
  getEntitiesByOperator,
  createAssemblyRegistriesList,
  getAssemblyRegistriesList,
} from "@/lib/entities";
import { getAllAssemblies } from "@/lib/assembly";
import * as XLSX from "xlsx";

import { usePageTitle } from "@/context/PageTitleContext";
import { colombiaCities } from "@/lib/colombiaCities";
import { getEntityTypes } from "@/lib/masterData";
import {
  validateExcelStructure,
  validateExcelTotals,
} from "@/lib/excelValidation";
import { ExcelEditor } from "@/components/basics/ExcelEditor";
import {
  Building2,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Bot,
  Download,
  Upload,
  Search,
  LayoutGrid,
  List,
  Settings,
  FileSpreadsheet,
  Check,
} from "lucide-react";

import EntitiesList from "@/components/entities/EntitiesList";
import Button from "@/components/basics/Button";

const OperatorDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const { setSegmentTitle, setVirtualSegments } = usePageTitle();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [operatorData, setOperatorData] = useState(null);

  const [entities, setEntities] = useState([]);
  const [showEntityForm, setShowEntityForm] = useState(false);
  const [entityLoading, setEntityLoading] = useState(false);
  const [entityTypes, setEntityTypes] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState("cards");

  const [entityForm, setEntityForm] = useState({
    name: "",
    nit: "",
    type: "",
    city: "",
    address: "",
    adminName: "",
    adminEmail: "",
    adminPhone: "",
  });

  const [excelData, setExcelData] = useState([]);
  const [excelHeaders, setExcelHeaders] = useState([]); // Store headers to preserve order
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [excelFileName, setExcelFileName] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    nit: "",
    city: "",
    email: "",
    password: "",
    representativeName: "",
    representativeEmail: "",
    representativePhone: "",
  });

  const fetchOperatorAndEntities = useCallback(async () => {
    if (!id) return;

    const res = await getOperatorById(id);
    if (res.success) {
      setOperatorData(res.data);
      setSegmentTitle(id, res.data.name);

      setFormData({
        name: res.data.name || "",
        nit: res.data.nit || "",
        city: res.data.city || "",
        email: res.data.email || "",
        representativeName: res.data.representative?.nameRepresentative || "",
        representativeEmail: res.data.representative?.emailRepresentative || "",
        representativePhone: res.data.representative?.phoneRepresentative || "",
      });

      const resEntities = await getEntitiesByOperator(id);
      if (resEntities.success) {
        const rawEntities = resEntities.data;

        // Fetch All Assemblies to find active/next ones
        const assemblyRes = await getAllAssemblies();
        const allAssemblies = assemblyRes.success ? assemblyRes.data : [];

        // Enrich Entities
        const enrichedEntities = await Promise.all(
          rawEntities.map(async (e) => {
            const entityAssemblies = allAssemblies.filter(
              (a) => a.entityId === e.id,
            );

            const activeAssembly = entityAssemblies.find(
              (a) => a.status === "started",
            );

            const futureAssemblies = entityAssemblies
              .filter((a) => a.status !== "finished" && a.status !== "started")
              .sort((a, b) => new Date(a.date) - new Date(b.date));
            const nextAssembly = futureAssemblies[0] || null;

            let asambleistasCount = 0;
            if (e.assemblyRegistriesListId) {
              const listRes = await getAssemblyRegistriesList(
                e.assemblyRegistriesListId,
              );
              if (listRes.success && listRes.data) {
                asambleistasCount = Object.keys(listRes.data).length;
              }
            }

            return {
              ...e,
              asambleistasCount,
              nextAssembly: nextAssembly
                ? { date: nextAssembly.date, time: nextAssembly.hour }
                : null,
              activeAssembly: activeAssembly
                ? { name: activeAssembly.name, startedAgo: "" }
                : null,
              hasAssemblies: entityAssemblies.length > 0,
            };
          }),
        );

        setEntities(enrichedEntities);
      }
    } else {
      toast.error("Error cargando operador");
      router.push("/superAdmin/operadores");
    }
    setLoading(false);
  }, [id, router, setSegmentTitle]);

  const fetchEntityTypes = async () => {
    const res = await getEntityTypes();
    if (res.success) {
      setEntityTypes(res.data);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchOperatorAndEntities();
      await fetchEntityTypes();
    };
    init();
  }, [fetchOperatorAndEntities]);

  useEffect(() => {
    if (showEntityForm) {
      setVirtualSegments([{ label: "Crear Entidad" }]);
    } else {
      setVirtualSegments([]);
      // Use a timeout or a different effect to avoid synchronous state update during render/cleanup
      setTimeout(() => {
        setExcelData([]);
        setExcelHeaders([]);
        setExcelFileName("");
      }, 0);
    }
    return () => setVirtualSegments([]);
  }, [showEntityForm, setVirtualSegments]);

  const handleFileUpload = (e) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];

      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rawData.length === 0) {
        toast.error("El archivo está vacío");
        return;
      }
      const headers = rawData[0];

      const data = XLSX.utils.sheet_to_json(ws);

      // Step 3 Validation: "Cuando se monte valide que no falte ni coeficientes ni valores..."
      // We check for row integrity here. If partial errors, we warn but allow loading so they can fix.
      const rowValidation = validateExcelStructure(data);

      setExcelHeaders(headers);
      setExcelData(data);
      setExcelFileName(file.name);

      if (!rowValidation.valid) {
        toast.warn(
          <div>
            <p className="font-bold">Advertencia: Datos incompletos</p>
            <p className="text-sm">
              Se detectaron registros vacíos o columnas faltantes. Por favor
              corríjalos en el paso 4 antes de crear la entidad.
            </p>
            <ul className="list-disc pl-4 text-xs max-h-20 overflow-y-auto mt-2 text-yellow-800">
              {rowValidation.errors.slice(0, 3).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {rowValidation.errors.length > 3 && <li>...</li>}
            </ul>
          </div>,
          { autoClose: 10000 },
        );
      } else {
        toast.success("Archivo cargado. Verifique los datos en el paso 4.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSave = async () => {
    setLoading(true);
    const userData = {
      name: formData.name,
      nit: formData.nit,
      city: formData.city,
      email: formData.email,
    };
    if (formData.password) userData.password = formData.password;

    const representativeData = {
      nameRepresentative: formData.representativeName,
      emailRepresentative: formData.representativeEmail,
      phoneRepresentative: formData.representativePhone,
    };

    const res = await updateOperator(
      id,
      operatorData.representativeId,
      userData,
      representativeData,
    );

    if (res.success) {
      toast.success("Información actualizada correctamente");
      setIsEditing(false);
      fetchOperatorAndEntities();
    } else {
      toast.error("Error al actualizar");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (
      confirm(
        "¿Estás seguro de que deseas eliminar este operador? Esta acción no se puede deshacer.",
      )
    ) {
      setLoading(true);
      const res = await deleteOperator(id, operatorData.representativeId);
      if (res.success) {
        toast.success("Operador eliminado correctamente");
        router.push("/superAdmin/operadores");
      } else {
        toast.error("Error al eliminar operador");
        setLoading(false);
      }
    }
  };

  const handleCreateEntity = async () => {
    // Validations - Only required: name, type, city, and excel database
    if (!entityForm.name || !entityForm.type || !entityForm.city) {
      toast.warn(
        "Por favor complete los campos obligatorios: Nombre de la entidad, Tipo de entidad y Ciudad",
      );
      return;
    }

    if (excelData.length === 0) {
      toast.warn(
        "Debe cargar la base de datos de asambleístas para crear la entidad.",
      );
      return;
    }

    setEntityLoading(true);

    const structureVal = validateExcelStructure(excelData);
    if (!structureVal.valid) {
      toast.error(
        <div>
          <p className="font-bold">Error en estructura de datos:</p>
          <ul className="list-disc pl-4 text-sm max-h-40 overflow-y-auto">
            {structureVal.errors.slice(0, 10).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>,
      );
      setEntityLoading(false);
      return;
    }

    const totalVal = validateExcelTotals(excelData);
    if (!totalVal.valid) {
      toast.error(
        <div>
          <p className="font-bold">Error en coeficientes:</p>
          <ul className="list-disc pl-4 text-sm">
            {totalVal.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>,
      );
      setEntityLoading(false);
      return;
    }

    let assemblyRegistriesListId = null;
    if (excelData.length > 0) {
      const resRegistries = await createAssemblyRegistriesList(excelData);
      if (resRegistries.success) {
        assemblyRegistriesListId = resRegistries.id;
      } else {
        toast.error("Error al guardar la base de datos de asambleístas");
        setEntityLoading(false);
        return;
      }
    }

    const adminData = {
      name: entityForm.adminName,
      email: entityForm.adminEmail,
      phone: entityForm.adminPhone,
      role: "admin_entity",
    };

    const resAdmin = await createEntityAdmin(adminData);

    if (!resAdmin.success) {
      toast.error("Error creando administrador de la entidad");
      setEntityLoading(false);
      return;
    }

    const entityData = {
      name: entityForm.name,
      nit: entityForm.nit,
      type: entityForm.type,
      city: entityForm.city,
      address: entityForm.address,
      databaseStatus: "done",
      assemblyRegistriesListId: assemblyRegistriesListId,
    };

    const resEntity = await createEntity(
      entityData,
      resAdmin.id,
      id,
      operatorData.representativeId,
    );

    if (resEntity.success) {
      toast.success("Entidad creada correctamente");
      setShowEntityForm(false);
      setEntityForm({
        name: "",
        nit: "",
        type: "",
        city: "",
        address: "",
        adminName: "",
        adminEmail: "",
        adminPhone: "",
      });
      setExcelData([]);
      setExcelHeaders([]);
      setExcelFileName("");
      fetchOperatorAndEntities();
    } else {
      toast.error("Error creando entidad");
    }
    setEntityLoading(false);
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

  const filteredAndSortedEntities = entities
    .filter((entity) => {
      const matchesSearch = entity.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesType =
        filterType === "" ||
        entity.type === filterType ||
        entityTypes.find((t) => t.id === filterType)?.name === entity.type;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "type") return a.type.localeCompare(b.type);
      return 0;
    });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader />
      </div>
    );
  }

  if (!operatorData) return null;

  if (showEntityForm) {
    return (
      <div className="p-8 flex flex-col gap-8 w-full max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-[32px] font-bold text-[#0E3C42]">
            Crear Entidad
          </h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-[#0E3C42] mb-1">
            1. Datos de la Entidad
          </h2>
          <p className="text-gray-500 mb-6">
            Ingrese los detalles básicos de la unidad privada:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <CustomInput
              label="Nombre de la entidad *"
              value={entityForm.name}
              onChange={(e) =>
                setEntityForm({ ...entityForm, name: e.target.value })
              }
              placeholder="Escribe aquí el nombre"
            />
            <CustomInput
              label="Nit"
              value={entityForm.nit}
              onChange={(e) =>
                setEntityForm({ ...entityForm, nit: e.target.value })
              }
              placeholder="Escribe aquí el Nit"
            />
            <div>
              <label className="font-medium text-sm text-gray-700 mb-1 block">
                Tipo de entidad *
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-500 bg-white"
                value={entityForm.type}
                onChange={(e) =>
                  setEntityForm({ ...entityForm, type: e.target.value })
                }
              >
                <option value="">Selecciona aquí el tipo</option>
                {entityTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {getTypeNameInSpanish(type.name)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="font-medium text-sm text-gray-700 mb-1 block">
                Ciudad *
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-blue-500 bg-white"
                value={entityForm.city}
                onChange={(e) =>
                  setEntityForm({ ...entityForm, city: e.target.value })
                }
              >
                <option value="">Selecciona aquí la ciudad</option>
                {colombiaCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
            <CustomInput
              label="Dirección"
              value={entityForm.address}
              onChange={(e) =>
                setEntityForm({ ...entityForm, address: e.target.value })
              }
              placeholder="Escribe aquí la dirección"
            />
          </div>

          <h2 className="text-xl font-bold text-[#0E3C42] mb-1">
            Ingrese los detalles básicos del administrador
          </h2>
          <p className="text-gray-500 mb-6">o funcionario de la entidad:</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <CustomInput
              label="Nombre"
              value={entityForm.adminName}
              onChange={(e) =>
                setEntityForm({ ...entityForm, adminName: e.target.value })
              }
              placeholder="Escribe aquí el nombre"
            />
            <CustomInput
              label="Correo"
              value={entityForm.adminEmail}
              onChange={(e) =>
                setEntityForm({ ...entityForm, adminEmail: e.target.value })
              }
              placeholder="Escribe aquí el correo"
            />
            <CustomInput
              label="Número de celular"
              value={entityForm.adminPhone}
              onChange={(e) =>
                setEntityForm({ ...entityForm, adminPhone: e.target.value })
              }
              placeholder="Escribe aquí el número"
            />
          </div>

          <div className="border-t border-gray-200 pt-8 mt-8">
            <h2 className="text-xl font-bold text-[#0E3C42] mb-2">
              2. Cargar Base de Datos de Asambleísta{" "}
              <span className="text-red-500 font-normal text-lg">*</span>
            </h2>
            <p className="text-gray-500 mb-6">
              Es obligatorio cargar la base de datos para crear la entidad.
            </p>

            <div className="flex flex-col gap-6">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[#ABE7E5] flex items-center justify-center text-[#0E3C42] font-bold shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-gray-600 mb-3">
                    Descargue la plantilla y llénela con la información de los
                    asambleístas.
                  </p>
                  <button className="flex items-center gap-2 border border-[#0E3C42] text-[#0E3C42] px-4 py-2 rounded-full font-medium hover:bg-gray-50 transition">
                    <Download size={18} />
                    Descargar Plantilla Excel
                  </button>
                </div>
              </div>

              <div className="flex gap-4 items-center">
                <div className="w-8 h-8 rounded-full bg-[#ABE7E5] flex items-center justify-center text-[#0E3C42] font-bold shrink-0">
                  2
                </div>
                <p className="text-gray-600">
                  Guarde el archivo en formato Excel (.xlsx).
                </p>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[#ABE7E5] flex items-center justify-center text-[#0E3C42] font-bold shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-gray-600 mb-4">
                    Cargue solo esa plantilla diligenciada. Otros formatos no
                    serán aceptados.
                  </p>

                  <div className="flex gap-6 flex-col lg:flex-row">
                    <div className="flex-1 flex flex-col gap-4">
                      {/* Upload Box */}
                      <div className="border-2 border-dashed border-[#94A2FF] bg-[#F5F7FF] rounded-xl p-8 flex flex-col items-center justify-center text-center min-h-[200px] relative">
                        <input
                          type="file"
                          accept=".xlsx, .xls"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="bg-[#6A7EFF] p-2 rounded-lg text-white mb-3">
                          <Upload size={24} />
                        </div>
                        <p className="font-bold text-[#0E3C42] mb-2">
                          Arrastra y suelta aquí o
                        </p>
                        <button className="bg-[#8B9DFF] text-white px-6 py-2 rounded-full font-bold hover:bg-[#7a8ce0] transition pointer-events-none">
                          Selecciona el archivo
                        </button>
                        <p className="text-xs text-gray-500 mt-4 max-w-xs">
                          Debe usar la misma plantilla descargada anteriormente.
                          Si usa otro archivo, el sistema no reconocerá la
                          información
                        </p>
                      </div>

                      {/* File Card (if file uploaded) */}
                      {excelFileName && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 shrink-0">
                              <FileSpreadsheet size={24} />
                            </div>
                            <div>
                              <p className="font-bold text-[#0E3C42] text-sm">
                                {excelFileName}
                              </p>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-green-500 w-full rounded-full"></div>
                                </div>
                                <div className="bg-green-100 text-green-700 rounded-full p-0.5">
                                  <Check size={12} strokeWidth={3} />
                                </div>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setExcelData([]);
                              setExcelHeaders([]);
                              setExcelFileName("");
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-500 transition"
                            title="Eliminar archivo"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="w-full lg:w-80 bg-gradient-to-br from-[#E0E7FF] to-[#F0F9FF] rounded-xl p-6 flex flex-col justify-center relative overflow-hidden">
                      <div className="flex items-center gap-3 mb-2 relative z-10">
                        <div className="bg-[#0E3C42] p-1.5 rounded-lg text-white">
                          <Bot size={20} />
                        </div>
                        <h3 className="font-bold text-[#0E3C42]">
                          Asistente Inteligente
                        </h3>
                      </div>
                      <p className="text-sm text-[#0E3C42]/80 mb-4 relative z-10">
                        Si necesita ayuda, use el Asistente Inteligente para
                        organizar y cargar los datos paso a paso.
                      </p>
                      <button className="bg-[#8B9DFF] text-white w-full py-2 rounded-full font-bold hover:bg-[#7a8ce0] transition relative z-10">
                        Activar Asistente IA
                      </button>
                      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/30 rounded-full blur-xl"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-start pt-4 border-t border-gray-100">
                <div className="w-8 h-8 rounded-full bg-[#ABE7E5] flex items-center justify-center text-[#0E3C42] font-bold shrink-0">
                  4
                </div>
                <div className="w-full">
                  <p className="text-gray-600 mb-4">
                    Verifique que los datos son correctos y edite los nombres de
                    las columnas si es necesario. Si todo está bien, haga clic
                    en Crear Entidad para continuar
                  </p>

                  {excelData.length > 0 && (
                    <div className="mt-4 animate-in fade-in duration-300">
                      <ExcelEditor
                        data={excelData}
                        setData={setExcelData}
                        headers={excelHeaders}
                        setHeaders={setExcelHeaders}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <button
              onClick={() => setShowEntityForm(false)}
              className="px-6 py-3 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateEntity}
              disabled={entityLoading}
              className="px-6 py-3 rounded-full bg-[#6A7EFF] hover:bg-[#5b6ef0] text-white shadow-md font-medium"
            >
              {entityLoading ? "Creando..." : "Crear Entidad"}
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col ">
      <div className="hidden">
        <TopBar pageTitle={operatorData.name} />
      </div>

      <div className=" flex flex-col gap-8 mx-15">
        <div className="flex items-center justify-between">
          <h1 className="text-[32px] font-bold text-[#0E3C42]">
            {operatorData.name}
          </h1>
          <Button
            variant="primary"
            size="M"
            className="!text-sm !py-3 !px-4 !bg-[#94A2FF] !text-[#000000] !font-bold"
            onClick={handleDelete}
          >
            <Trash2 size={20} />
            Eliminar Operador
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#0E3C42]">
              Información General
            </h2>
            {!isEditing ? (
              <Button
                variant="primary"
                size="M"
                className="!text-sm !py-3 !px-4 !bg-[#94A2FF] !text-[#000000] !font-bold"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 size={16} />
                Editar información
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="M"
                  className="!text-sm !py-3 !px-4 !bg-[#94A2FF] !text-[#000000] !font-bold"
                  onClick={() => setIsEditing(false)}
                >
                  <X size={16} />
                  Cancelar
                </Button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-[#6A7EFF] hover:bg-[#5b6ef0] text-white px-5 py-2 rounded-full font-medium shadow-sm transition text-sm"
                >
                  <Save size={16} />
                  Guardar
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 border-b border-gray-100 pb-8">
            <div>
              <label className="text-sm text-gray-500 block mb-1">
                Nombre del Operador
              </label>
              {isEditing ? (
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              ) : (
                <p className="font-semibold text-gray-800 text-lg">
                  {operatorData.name}
                </p>
              )}
            </div>
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
                  {operatorData.nit || "N/A"}
                </p>
              )}
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
                  {operatorData.city || "N/A"}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">
                Correo de acceso
              </label>
              {isEditing ? (
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              ) : (
                <p className="font-semibold text-gray-800 text-lg">
                  {operatorData.email}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">
                Contraseña de acceso
              </label>
              {isEditing ? (
                <input
                  type="password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="Nueva contraseña (opcional)"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              ) : (
                <p className="font-semibold text-gray-800 text-lg">********</p>
              )}
            </div>
          </div>

          <h2 className="text-xl font-bold text-[#0E3C42] mb-6">
            Datos del representante legal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 border-b border-gray-100 pb-8">
            <div>
              <label className="text-sm text-gray-500 block mb-1">Nombre</label>
              {isEditing ? (
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  value={formData.representativeName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      representativeName: e.target.value,
                    })
                  }
                />
              ) : (
                <p className="font-semibold text-gray-800 text-lg">
                  {operatorData.representative?.nameRepresentative || "N/A"}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">Correo</label>
              {isEditing ? (
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  value={formData.representativeEmail}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      representativeEmail: e.target.value,
                    })
                  }
                />
              ) : (
                <p className="font-semibold text-gray-800 text-lg">
                  {operatorData.representative?.emailRepresentative || "N/A"}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">
                Número de celular
              </label>
              {isEditing ? (
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  value={formData.representativePhone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      representativePhone: e.target.value,
                    })
                  }
                />
              ) : (
                <p className="font-semibold text-gray-800 text-lg">
                  {operatorData.representative?.phoneRepresentative || "N/A"}
                </p>
              )}
            </div>
          </div>

          {/* Section 3: Entities */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[24px] font-bold text-[#0E3C42]">Entidades</h2>
            <Button
              variant="primary"
              size="M"
              className="!text-sm !py-3 !px-4 !bg-[#94A2FF] !text-[#000000] !font-bold"
              onClick={() => setShowEntityForm(true)}
            >
              <Plus size={18} /> Crear Entidad
            </Button>
          </div>

          <EntitiesList
            entities={entities}
            onManageEntity={(entity) =>
              router.push(`/superAdmin/operadores/${id}/${entity.id}`)
            }
            onCreateEntity={() => setShowEntityForm(true)}
          />
        </div>
      </div>
    </div>
  );
};

export default OperatorDetailPage;
