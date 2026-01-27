import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import {
  Download,
  Upload,
  Bot,
  FileSpreadsheet,
  Trash2,
  Check,
  Building2,
} from "lucide-react";

import CustomInput from "@/components/basics/CustomInput";
import { ExcelEditor } from "@/components/basics/ExcelEditor";
import Button from "@/components/basics/Button"; // Standardized button

import {
  validateExcelStructure,
  validateExcelTotals,
} from "@/lib/excelValidation";
import {
  createEntity,
  createEntityAdmin,
  createAssemblyRegistriesList,
} from "@/lib/entities";
import { getEntityTypes } from "@/lib/masterData";
import { colombiaCities } from "@/lib/colombiaCities";

export default function CreateEntityForm({
  operatorId,
  representativeId,
  onCancel,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [entityTypes, setEntityTypes] = useState([]);

  // Form State
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

  // Excel State
  const [excelData, setExcelData] = useState([]);
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [excelFileName, setExcelFileName] = useState("");

  useEffect(() => {
    const fetchTypes = async () => {
      const res = await getEntityTypes();
      if (res.success) {
        setEntityTypes(res.data);
      }
    };
    fetchTypes();
  }, []);

  const getTypeNameInSpanish = (typeName) => {
    const translations = {
      Residential: "Residencial",
      Commercial: "Comercial",
      Mixed: "Mixto",
      "Horizontal Property": "Propiedad Horizontal",
    };
    return translations[typeName] || typeName;
  };

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

      const rowValidation = validateExcelStructure(data);

      setExcelHeaders(headers);
      setExcelData(data);
      setExcelFileName(file.name);

      if (!rowValidation.valid) {
        toast.warn(
          <div>
            <p className="font-bold">Advertencia: Datos incompletos</p>
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

  const handleCreateEntity = async () => {
    // Validations
    if (!entityForm.name || !entityForm.type) {
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

    setLoading(true);

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
      setLoading(false);
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
      setLoading(false);
      return;
    }

    // 1. Create Assembly Registry List
    let assemblyRegistriesListId = null;
    if (excelData.length > 0) {
      const resRegistries = await createAssemblyRegistriesList(excelData);
      if (resRegistries.success) {
        assemblyRegistriesListId = resRegistries.id;
      } else {
        toast.error("Error al guardar la base de datos de asambleístas");
        setLoading(false);
        return;
      }
    }

    // 2. Create Entity Admin
    const adminData = {
      name: entityForm.adminName,
      email: entityForm.adminEmail,
      phone: entityForm.adminPhone,
      role: "admin_entity",
    };

    const resAdmin = await createEntityAdmin(adminData);

    if (!resAdmin.success) {
      toast.error("Error creando administrador de la entidad");
      setLoading(false);
      return;
    }

    // 3. Create Entity
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
      operatorId,
      representativeId,
    );

    if (resEntity.success) {
      toast.success("Entidad creada correctamente");
      if (onSuccess) onSuccess(resEntity);
    } else {
      toast.error("Error creando entidad");
    }
    setLoading(false);
  };

  return (
    <div className="gap-5 flex flex-col">
      <div className="bg-white rounded-xl shadow-sm p-8">
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
          <div className="flex flex-col gap-2">
            <label className="font-bold text-sm text-gray-700 block">
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
          <div className="flex flex-col gap-2">
            <label className="font-bold text-sm text-gray-700 block">
              Ciudad
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

        <div className="rounded-t border border-[#D3DAE0] mb-5"></div>

        <p className="text-[18px] text-[#000000] mb-2">
          Ingrese los detalles básicos del administrador o funcionario de la
          entidad:
        </p>

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
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="">
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
                <button
                  className="flex items-center gap-2 border border-[#0E3C42] text-[#0E3C42] px-4 py-2 rounded-full font-bold hover:bg-gray-50 transition"
                  onClick={() => {
                    // Trigger download logic or link to file
                    const link = document.createElement("a");
                    link.href = "/files/Plantilla_Asambleista_PH.xlsx";
                    link.download = "Plantilla_Asambleista_PH.xlsx";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
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
                  las columnas si es necesario. Si todo está bien, haga clic en
                  Crear Entidad para continuar
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
      </div>

      <div className="flex justify-end gap-4 mt-8">
        <Button variant="secondary" size="L" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="L"
          onClick={handleCreateEntity}
          disabled={loading}
        >
          {loading ? "Creando..." : "Crear Entidad"}
        </Button>
      </div>
    </div>
  );
}
