"use client";

import { useState, useEffect, useRef } from "react";

import { useParams, useRouter } from "next/navigation";
import {
  getEntityById,
  getAssemblyRegistriesList,
  resetAssemblyRegistries,
  toggleVoteBlock,
} from "@/lib/entities";
import * as XLSX from "xlsx";

import {
  getAssemblyById,
  updateAssembly,
  toggleAssemblyVoteBlock,
} from "@/lib/assembly";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot } from "firebase/firestore";
import Loader from "@/components/basics/Loader";
import TopBar from "@/components/ui/TopBar";
import { usePageTitle } from "@/context/PageTitleContext";
import {
  Calendar,
  MapPin,
  Video,
  Copy,
  QrCode,
  Download,
  Trash2,
  Search,
  User,
  Users,
  BarChart2,
  Edit2,
  AlertTriangle,
  X,
  Plus,
  HelpCircle,
  Play,
  Square,
  RefreshCw,
  Lock,
  Unlock,
  Eye,
} from "lucide-react";
import {
  createQuestion,
  updateQuestionStatus,
  deleteQuestion,
  QUESTION_TYPES,
  QUESTION_STATUS,
  resetAllQuestionsAnswers,
  finishAllLiveQuestions,
} from "@/lib/questions";
import { toast } from "react-toastify";
import { QRCodeCanvas } from "qrcode.react";
import Quorum from "@/components/dashboard/Quorum";

const AssemblyDashboardPage = () => {
  const { id, entityId, assemblyId } = useParams();
  const { setSegmentTitle } = usePageTitle();
  const [loading, setLoading] = useState(true);
  const [assembly, setAssembly] = useState(null);
  const [entity, setEntity] = useState(null);
  const [registries, setRegistries] = useState([]);

  // Stats
  const [quorum, setQuorum] = useState(0);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);

  // UI State
  const [publicUrl, setPublicUrl] = useState("");
  const [activeTab, setActiveTab] = useState("Registrados"); // Registrados, Pendientes, Eliminados
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [mainTab, setMainTab] = useState("Asambleistas"); // Asambleistas, Votaciones
  const [questions, setQuestions] = useState([]);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    title: "",
    type: QUESTION_TYPES.UNIQUE,
    minimumVotes: 1,
    options: ["", ""],
  });
  const [viewingVotersFor, setViewingVotersFor] = useState(null);
  const [modalSearchTerm, setModalSearchTerm] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/${assemblyId}`;
      setTimeout(() => setPublicUrl(url), 0);
    }

    const assemblyRef = doc(db, "assembly", assemblyId);
    const unsub = onSnapshot(assemblyRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setAssembly(data);
        setSegmentTitle(assemblyId, data.name);

        // Auto-update status if time passed
        if (data.status === "create" && data.date && data.hour) {
          const now = new Date();
          const [year, month, day] = data.date.split("-").map(Number);
          const match = data.hour.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i);
          if (match) {
            let h = parseInt(match[1]);
            const m = parseInt(match[2]);
            const ampm = match[3].toUpperCase();
            if (ampm === "PM" && h < 12) h += 12;
            if (ampm === "AM" && h === 12) h = 0;
            const assemblyDateTime = new Date(year, month - 1, day, h, m);

            if (now >= assemblyDateTime) {
              updateAssembly(assemblyId, { status: "started" });
            }
          }
        }
      } else {
        toast.error("Asamblea no encontrada");
      }
      setLoading(false);
    });

    return () => unsub();
  }, [assemblyId]);

  useEffect(() => {
    if (
      assembly &&
      assembly.status === "create" &&
      assembly.date &&
      assembly.hour
    ) {
      const checkStatus = async () => {
        const now = new Date();
        const [year, month, day] = assembly.date.split("-").map(Number);
        const match = assembly.hour.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i);
        if (match) {
          let h = parseInt(match[1]);
          const m = parseInt(match[2]);
          const ampm = match[3].toUpperCase();
          if (ampm === "PM" && h < 12) h += 12;
          if (ampm === "AM" && h === 12) h = 0;
          const assemblyDateTime = new Date(year, month - 1, day, h, m);

          if (now >= assemblyDateTime) {
            await updateAssembly(assemblyId, { status: "started" });
          }
        }
      };

      const interval = setInterval(checkStatus, 30000); // Check every 30s
      checkStatus(); // Initial check
      return () => clearInterval(interval);
    }
  }, [assembly, assemblyId]);

  useEffect(() => {
    if (!assembly?.entityId) return;

    let unsubRegs = () => {};

    const setupRegistries = async () => {
      const resEntity = await getEntityById(assembly.entityId);
      if (resEntity.success) {
        setEntity(resEntity.data);
        setSegmentTitle(entityId, resEntity.data.name);
        if (resEntity.data.assemblyRegistriesListId) {
          const listRef = doc(
            db,
            "assemblyRegistriesList",
            resEntity.data.assemblyRegistriesListId
          );
          unsubRegs = onSnapshot(listRef, (listSnap) => {
            if (listSnap.exists()) {
              const regsMap = listSnap.data().assemblyRegistries || {};
              const regs = Object.entries(regsMap).map(([regId, data]) => ({
                id: regId,
                ...data,
              }));
              setRegistries(regs);

              const registeredRegs = regs.filter(
                (r) => r.registerInAssembly === true
              );
              const totalC = regs.reduce(
                (acc, item) => acc + parseFloat(item.coeficiente || 0),
                0
              );
              const regC = registeredRegs.reduce(
                (acc, item) => acc + parseFloat(item.coeficiente || 0),
                0
              );

              setRegisteredCount(registeredRegs.length);
              setBlockedCount(
                regs.filter((r) => r.voteBlocked === true).length
              );
              setQuorum(totalC > 0 ? (regC / totalC) * 100 : 0);
            }
          });
        }
      }
    };

    setupRegistries();
    return () => unsubRegs();
  }, [assembly?.entityId]);

  useEffect(() => {
    if (!assembly?.questions || assembly.questions.length === 0) {
      // Use setTimeout to avoid synchronous state update during render/effect cycle
      setTimeout(() => {
        if (questions.length > 0) setQuestions([]);
      }, 0);
      return;
    }

    const qRef = collection(db, "question");
    const unsub = onSnapshot(qRef, (qSnap) => {
      const qList = qSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((q) => assembly.questions.includes(q.id) && !q.isDeleted);
      setQuestions(qList);
    });

    return () => unsub();
  }, [assembly?.questions, questions.length]);

  const handleAddQuestion = async () => {
    if (!newQuestion.title) return toast.error("El título es requerido");

    let questionToSave = { ...newQuestion };
    if (newQuestion.type === QUESTION_TYPES.YES_NO) {
      questionToSave.options = ["Sí", "No"];
    } else if (newQuestion.type === QUESTION_TYPES.OPEN) {
      questionToSave.options = [];
    } else {
      if (newQuestion.options.some((o) => !o.trim()))
        return toast.error("Todas las opciones deben estar llenas");
    }

    const res = await createQuestion(assemblyId, questionToSave);

    if (res.success) {
      toast.success("Pregunta creada");
      setShowAddQuestion(false);
      setNewQuestion({
        title: "",
        type: QUESTION_TYPES.UNIQUE,
        minimumVotes: 1,
        options: ["", ""],
      });
    } else {
      toast.error("Error al crear la pregunta");
    }
  };

  const toggleQuestionStatus = async (qId, currentStatus) => {
    let nextStatus = currentStatus;
    if (currentStatus === QUESTION_STATUS.CREATED)
      nextStatus = QUESTION_STATUS.LIVE;
    else if (currentStatus === QUESTION_STATUS.LIVE)
      nextStatus = QUESTION_STATUS.FINISHED;
    else if (currentStatus === QUESTION_STATUS.FINISHED)
      nextStatus = QUESTION_STATUS.LIVE;

    const res = await updateQuestionStatus(qId, nextStatus);
    if (res.success) {
      toast.success(`Pregunta actualizada a ${nextStatus}`);
    }
  };

  const handleRestartAssembly = async () => {
    if (
      confirm(
        "¿Seguro que quieres volver a iniciar la asamblea? Esto reseteará la asistencia de todos."
      )
    ) {
      if (entity?.assemblyRegistriesListId) {
        setLoading(true);
        const res = await resetAssemblyRegistries(
          entity.assemblyRegistriesListId
        );
        if (!res.success) {
          toast.error("Error al resetear registros");
          setLoading(false);
          return;
        }
      }

      // Reset questions
      if (assembly?.questions && assembly.questions.length > 0) {
        await resetAllQuestionsAnswers(assembly.questions);
      }

      await updateStatus("create");
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      if (newStatus === "finished") {
        if (assembly?.questions && assembly.questions.length > 0) {
          await finishAllLiveQuestions(assembly.questions);
        }
      }
      const res = await updateAssembly(assemblyId, { status: newStatus });
      if (res.success) {
        toast.success(`Estado actualizado a: ${newStatus}`);
      }
    } catch (error) {
      toast.error("Error actualizando estado");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  };

  const handleToggleVoteBlock = async (registryId, currentBlocked) => {
    const res = await toggleAssemblyVoteBlock(
      assemblyId,
      registryId,
      !currentBlocked
    );
    if (res.success) {
      toast.success(currentBlocked ? "Voto habilitado" : "Voto bloqueado");
    } else {
      toast.error("Error al actualizar estado");
    }
  };

  const exportToExcel = () => {
    const data = [];

    // Summary
    data.push(["RESUMEN DE ASAMBLEA"]);
    data.push(["Nombre", assembly?.name || ""]);
    data.push(["Total Registrados", registeredCount]);
    data.push([
      "Participación Promedio",
      `${(
        (questions.reduce(
          (acc, q) =>
            acc + Object.keys(q.answers || {}).length / (registeredCount || 1),
          0
        ) /
          (questions.length || 1)) *
        100
      ).toFixed(1)}%`,
    ]);
    data.push([
      "Votos Totales",
      questions.reduce(
        (acc, q) => acc + Object.keys(q.answers || {}).length,
        0
      ),
    ]);
    data.push([]);

    // Attendance Details
    data.push(["DETALLE DE ASISTENCIA"]);
    data.push([
      "Tipo",
      "Grupo",
      "Propiedad",
      "Coeficiente",
      "Documento",
      "Nombre Completo",
      "Email",
      "Teléfono",
      "Estado Registro",
    ]);
    registries.forEach((reg) => {
      data.push([
        reg.tipo || "",
        reg.grupo || "",
        reg.propiedad || "",
        reg.coeficiente || "0",
        reg.documento || "",
        reg.firstName || reg.lastName
          ? `${reg.firstName || ""} ${reg.lastName || ""}`.trim()
          : "",
        reg.email || "",
        reg.phone || "",
        reg.registerInAssembly ? "Registrado" : "Pendiente",
      ]);
    });
    data.push([]);

    // Questions
    questions.forEach((q, idx) => {
      const totalQVotes = Object.keys(q.answers || {}).length;
      data.push([`PREGUNTA ${idx + 1}: ${q.title}`]);
      data.push(["Estado", q.status]);
      data.push(["Total Votos", totalQVotes]);
      data.push([
        "Participación",
        `${
          registeredCount > 0
            ? ((totalQVotes / registeredCount) * 100).toFixed(1)
            : 0
        }%`,
      ]);

      data.push([
        "Opción",
        "Votos",
        "Porcentaje (Votantes)",
        "Porcentaje (Asamblea)",
      ]);
      q.options.forEach((opt) => {
        const votes = Object.values(q.answers || {}).filter((a) => {
          if (a.option === opt) return true;
          if (Array.isArray(a.options) && a.options.includes(opt)) return true;
          return false;
        }).length;
        const pV =
          totalQVotes > 0 ? ((votes / totalQVotes) * 100).toFixed(1) : "0";
        const pA =
          registeredCount > 0
            ? ((votes / registeredCount) * 100).toFixed(1)
            : "0";
        data.push([opt, votes, `${pV}%`, `${pA}%`]);
      });

      if (q.type === QUESTION_TYPES.OPEN) {
        data.push(["Respuestas de texto:"]);
        Object.values(q.answers || {}).forEach((a) => {
          data.push([a.answerText || a.option || ""]);
        });
      }
      data.push([]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resultados");
    XLSX.writeFile(
      workbook,
      `Resultados_Asamblea_${assembly?.name || "export"}.xlsx`
    );
  };

  const downloadQR = () => {
    const canvas = document.getElementById("qr-gen");
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `assembly_qr_${assembly.name}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader />
      </div>
    );
  }

  if (!assembly || !entity) return null;

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#F8F9FB] pb-12">
      <div className="hidden">
        <TopBar pageTitle={`Tablero Asamblea - ${assembly.name}`} />
      </div>

      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 mb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[#0E3C42] mb-1">
                {assembly.name}
              </h1>
              <p className="text-gray-500 font-medium text-lg">{entity.name}</p>
            </div>
            <button
              onClick={() =>
                router.push(
                  `/superAdmin/operadores/${id}/entity/${entityId}/crear-asamblea?edit=${assemblyId}`
                )
              }
              className="bg-[#8B9DFF] hover:bg-[#7a8ce0] text-white px-5 py-2 rounded-full font-medium shadow-sm transition text-sm flex items-center gap-2"
            >
              <Edit2 size={16} />
              Editar configuración
            </button>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-[#0E3C42]" />
              <span className="font-semibold">
                {assembly.date} - {assembly.hour}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Video size={18} className="text-[#8B9DFF]" />
              <span className="bg-indigo-50 text-[#8B9DFF] px-3 py-1 rounded-full font-bold text-xs uppercase">
                {assembly.type}
              </span>
            </div>
            <div>
              <span
                className={`px-3 py-1 rounded-full font-bold text-xs uppercase flex items-center gap-1 ${
                  assembly.status === "finished"
                    ? "bg-gray-100 text-gray-500"
                    : "bg-red-100 text-red-500"
                }`}
              >
                {assembly.status !== "finished" && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                )}
                {assembly.status === "create"
                  ? "Por iniciar"
                  : assembly.status === "started"
                  ? "En vivo"
                  : assembly.status === "registries_finalized"
                  ? "Registros Cerrados"
                  : "Finalizada"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
        {/* Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Asambleistas Access */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-[#0E3C42] mb-4">
              Acceso a Asambleistas
            </h3>
            <div className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  className="w-full border border-gray-200 rounded-lg pl-4 pr-10 py-3 text-sm text-gray-600 bg-gray-50 outline-none"
                />
                <button
                  onClick={() => copyToClipboard(publicUrl)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0E3C42]"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-semibold text-[#0E3C42] hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <div className="hidden">
                  <QRCodeCanvas
                    id="qr-gen"
                    value={publicUrl}
                    size={256}
                    level={"H"}
                  />
                </div>
                <QrCode size={16} /> Ver QR
              </button>
              <button
                onClick={downloadQR}
                className="flex-1 bg-[#8B9DFF] text-white rounded-lg py-2 text-sm font-semibold hover:bg-[#7a8ce0] flex items-center justify-center gap-2"
              >
                <Download size={16} /> Descargar QR
              </button>
            </div>
          </div>

          {/* Admin Access (Placeholder) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-[#0E3C42] mb-1">
              Acceso al administrador o funcionario
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Aquí podrá ver la asistencia en tiempo real.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  readOnly
                  value={`${publicUrl}/funcionario`} // Mock
                  className="w-full border border-gray-200 rounded-lg pl-4 pr-10 py-3 text-sm text-gray-600 bg-gray-50 outline-none"
                />
                <button
                  onClick={() => copyToClipboard(`${publicUrl}/funcionario`)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0E3C42]"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {assembly.status === "create" ? (
            <button
              onClick={() => updateStatus("started")}
              className="py-3 rounded-full bg-[#E0F7FA] text-[#0E3C42] font-bold text-sm hover:bg-[#b2ebf2] transition flex items-center justify-center gap-2"
            >
              <Video size={18} /> Iniciar asamblea
            </button>
          ) : assembly.status === "finished" ? (
            <button
              onClick={handleRestartAssembly}
              className="py-3 rounded-full bg-green-100 text-green-700 font-bold text-sm hover:bg-green-200 transition flex items-center justify-center gap-2"
            >
              <Play size={18} /> Reiniciar asamblea
            </button>
          ) : (
            <button className="py-3 rounded-full bg-gray-200 text-gray-400 font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2">
              Asamblea{" "}
              {assembly.status === "started"
                ? "en curso"
                : assembly.status === "registries_finalized"
                ? "con registros cerrados"
                : "finalizada"}
            </button>
          )}

          <button
            onClick={() =>
              updateStatus(
                assembly.status === "registries_finalized"
                  ? "started"
                  : "registries_finalized"
              )
            }
            disabled={
              assembly.status === "finished" || assembly.status === "create"
            }
            className={`py-3 rounded-full font-bold text-sm transition flex items-center justify-center gap-2 ${
              assembly.status === "registries_finalized"
                ? "bg-orange-100 text-[#FF9F43]"
                : "bg-[#FFF4E5] text-[#FF9F43] hover:bg-[#ffeac2]"
            } ${
              assembly.status === "finished" || assembly.status === "create"
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            <Users size={18} />{" "}
            {assembly.status === "registries_finalized"
              ? "Activar registros"
              : "Finalizar registros"}
          </button>

          <button
            onClick={() => updateStatus("finished")}
            disabled={assembly.status === "finished"}
            className={`py-3 rounded-full font-bold text-sm transition flex items-center justify-center gap-2 ${
              assembly.status === "finished"
                ? "bg-red-50 text-red-300"
                : "bg-[#FFE5E5] text-[#FF4343] hover:bg-[#ffcdd2]"
            } ${
              assembly.status === "finished"
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            <AlertTriangle size={18} /> Finalizar asamblea
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full max-w-2xl mx-auto">
          <button
            onClick={() => setMainTab("Asambleistas")}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${
              mainTab === "Asambleistas"
                ? "bg-white text-[#0E3C42] shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Gestionar asambleístas
          </button>
          <button
            onClick={() => setMainTab("Votaciones")}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${
              mainTab === "Votaciones"
                ? "bg-white text-[#0E3C42] shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Gestionar votaciones
          </button>
        </div>

        {mainTab === "Asambleistas" ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Quorum */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-[#0E3C42]">Quórum</h3>
                  <div className="w-5 h-5 rounded-full bg-[#0E3C42] text-white flex items-center justify-center text-xs font-bold">
                    !
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center py-4 relative">
                  <Quorum percentage={quorum} />
                  <div className="flex w-full justify-between px-8 text-xs text-gray-400 mt-2">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Asambleístas Stats */}
              <div className="col-span-1 md:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-around">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#8B9DFF] flex items-center justify-center mx-auto mb-3">
                    <Users size={24} />
                  </div>
                  <h4 className="text-2xl font-bold text-[#0E3C42]">
                    {registeredCount} / {registries.length}
                  </h4>
                  <p className="text-sm text-gray-500">
                    asambleístas registrados
                  </p>
                </div>
                <div className="h-16 w-[1px] bg-gray-100"></div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
                    <User size={24} />
                  </div>
                  <h4 className="text-2xl font-bold text-[#0E3C42]">
                    {blockedCount}
                  </h4>
                  <p className="text-sm text-gray-500">
                    con restricción de voto
                  </p>
                </div>
              </div>
            </div>

            {/* Assistance Table Section */}
            <div>
              <h3 className="text-xl font-bold text-[#0E3C42] mb-6">
                Asistencia
              </h3>
              <div className="flex gap-2 mb-6">
                {["Registrados", "Pendientes", "Registros eliminados"].map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-5 py-2 rounded-full text-sm font-bold transition ${
                        activeTab === tab
                          ? "bg-[#E0E7FF] text-[#0E3C42]"
                          : "bg-transparent text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {tab}
                    </button>
                  )
                )}
              </div>

              <p className="text-gray-500 mb-4 text-sm">
                Aquí puedes ver a los Asambleistas que ya se registraron.
              </p>

              <div className="flex gap-4 mb-6">
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
                <select className="border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-[#8B9DFF] bg-white min-w-[120px] text-sm text-gray-600">
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
                      <th className="py-4 px-6 text-center">Bloquear</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {registries
                      .filter((item) => {
                        // Filter by Tab
                        if (activeTab === "Registrados")
                          return item.registerInAssembly === true;
                        if (activeTab === "Pendientes")
                          return item.registerInAssembly !== true;
                        return false; // For deleted or others
                      })
                      .filter((item) => {
                        // Filter by Search
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
                      })
                      .map((item, index) => (
                        <tr
                          key={index}
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
                          <td className="py-4 px-6 text-gray-800 font-medium">
                            {item.propiedad || "-"}
                          </td>
                          <td className="py-4 px-6 text-gray-600">
                            {item.coeficiente || "0"}%
                          </td>
                          <td className="py-4 px-6 text-gray-600">
                            {item.numeroVotos || "1"}
                          </td>
                          <td className="py-4 px-6 text-gray-600">
                            {item.documento || "-"}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() =>
                                  handleToggleVoteBlock(
                                    item.id,
                                    (assembly?.blockedVoters || []).includes(
                                      item.id
                                    )
                                  )
                                }
                                title={
                                  item.voteBlocked ? "Desbloquear" : "Bloquear"
                                }
                                className={`p-2 rounded-lg transition ${
                                  item.voteBlocked
                                    ? "bg-red-50 text-red-500 hover:bg-red-100"
                                    : "text-gray-400 hover:text-[#0E3C42] hover:bg-gray-100"
                                }`}
                              >
                                {(assembly?.blockedVoters || []).includes(
                                  item.id
                                ) ? (
                                  <Lock size={16} />
                                ) : (
                                  <Unlock size={16} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {registries.length === 0 && (
                      <tr>
                        <td
                          colSpan="8"
                          className="py-12 text-center text-gray-400"
                        >
                          {activeTab === "Registrados"
                            ? "No hay asambleistas registrados aún."
                            : "No hay datos."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* VOTACIONES VIEW */
          <div className="flex flex-col gap-6">
            {/* HEADER VOTACIONES */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-[#0E3C42]">
                  Gestión de Votaciones
                </h3>
                <p className="text-gray-400 text-sm">
                  Crea y monitorea las preguntas de la asamblea.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={exportToExcel}
                  className="px-6 py-3 rounded-2xl bg-green-50 text-green-600 font-bold text-sm flex items-center gap-2 hover:bg-green-100 transition shadow-sm"
                >
                  <Download size={18} /> Exportar Reporte
                </button>
                <button
                  onClick={() => setShowAddQuestion(true)}
                  className="px-6 py-3 rounded-2xl bg-[#8B9DFF] text-white font-bold text-sm flex items-center gap-2 hover:bg-[#7a8ce0] transition shadow-lg shadow-indigo-100"
                >
                  <Plus size={18} /> Nueva Pregunta
                </button>
              </div>
            </div>

            {showAddQuestion && (
              <div className="bg-white p-8 rounded-[32px] border-2 border-[#8B9DFF] shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black text-[#0E3C42]">
                    Crear pregunta
                  </h3>
                  <button
                    onClick={() => setShowAddQuestion(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="md:col-span-1">
                    <label className="text-xs font-black text-[#8B9DFF] uppercase mb-2 block">
                      Título de la pregunta *
                    </label>
                    <input
                      type="text"
                      placeholder="Escribe aquí la pregunta"
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 outline-none focus:ring-2 ring-indigo-100"
                      value={newQuestion.title}
                      onChange={(e) =>
                        setNewQuestion({
                          ...newQuestion,
                          title: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-xs font-black text-[#8B9DFF] uppercase mb-2 block">
                      Tipo de encuesta *
                    </label>
                    <select
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 outline-none focus:ring-2 ring-indigo-100"
                      value={newQuestion.type}
                      onChange={(e) =>
                        setNewQuestion({ ...newQuestion, type: e.target.value })
                      }
                    >
                      <option value={QUESTION_TYPES.UNIQUE}>
                        Selección única
                      </option>
                      <option value={QUESTION_TYPES.MULTIPLE}>
                        Selección múltiple
                      </option>
                      <option value={QUESTION_TYPES.YES_NO}>Sí / No</option>
                      <option value={QUESTION_TYPES.OPEN}>Abierta</option>
                    </select>
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-xs font-black text-[#8B9DFF] uppercase mb-2 block">
                      Mínimo de votos *
                    </label>
                    <select
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 outline-none focus:ring-2 ring-indigo-100"
                      value={newQuestion.minimumVotes}
                      onChange={(e) =>
                        setNewQuestion({
                          ...newQuestion,
                          minimumVotes: parseInt(e.target.value),
                        })
                      }
                    >
                      {[1, 2, 3, 4, 5].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {(newQuestion.type === QUESTION_TYPES.UNIQUE ||
                  newQuestion.type === QUESTION_TYPES.MULTIPLE) && (
                  <div className="mb-10">
                    <label className="text-xs font-black text-[#8B9DFF] uppercase mb-4 block">
                      Opciones
                    </label>
                    <div className="flex flex-col gap-3">
                      {newQuestion.options.map((opt, idx) => (
                        <div key={idx} className="flex gap-2">
                          <div className="flex-1 bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-indigo-200"></div>
                            <input
                              type="text"
                              placeholder={`Opción ${idx + 1}`}
                              className="bg-transparent border-none outline-none w-full text-sm"
                              value={opt}
                              onChange={(e) => {
                                const opts = [...newQuestion.options];
                                opts[idx] = e.target.value;
                                setNewQuestion({
                                  ...newQuestion,
                                  options: opts,
                                });
                              }}
                            />
                          </div>
                          {newQuestion.options.length > 2 && (
                            <button
                              onClick={() => {
                                const opts = newQuestion.options.filter(
                                  (_, i) => i !== idx
                                );
                                setNewQuestion({
                                  ...newQuestion,
                                  options: opts,
                                });
                              }}
                              className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition"
                            >
                              <Trash2 size={20} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() =>
                        setNewQuestion({
                          ...newQuestion,
                          options: [...newQuestion.options, ""],
                        })
                      }
                      className="mt-4 text-[#8B9DFF] font-bold text-sm flex items-center gap-2 hover:opacity-80 transition"
                    >
                      <Plus size={16} /> Añadir opción
                    </button>
                  </div>
                )}

                {newQuestion.type === QUESTION_TYPES.YES_NO && (
                  <div className="mb-10 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
                    <p className="text-sm font-medium text-[#0E3C42]">
                      Esta pregunta tendrá las opciones:{" "}
                      <span className="font-bold">Sí</span> y{" "}
                      <span className="font-bold">No</span>.
                    </p>
                  </div>
                )}

                {newQuestion.type === QUESTION_TYPES.OPEN && (
                  <div className="mb-10 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
                    <p className="text-sm font-medium text-[#0E3C42]">
                      Esta pregunta permitirá a los usuarios escribir una
                      respuesta libre.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowAddQuestion(false)}
                    className="px-8 py-3 rounded-full font-bold text-gray-400 hover:bg-gray-50 transition"
                  >
                    Borrar
                  </button>
                  <button
                    onClick={handleAddQuestion}
                    className="px-10 py-3 rounded-full bg-[#8B9DFF] text-white font-bold shadow-lg shadow-indigo-100 hover:bg-[#7a8ce0] transition"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            )}

            {/* PARTICIPATION SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex flex-col items-center">
                <span className="text-gray-400 text-xs font-black uppercase mb-2">
                  Total Registrados
                </span>
                <span className="text-4xl font-black text-[#0E3C42]">
                  {registeredCount}
                </span>
              </div>
              <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex flex-col items-center">
                <span className="text-gray-400 text-xs font-black uppercase mb-2">
                  Participación Promedio
                </span>
                <span className="text-4xl font-black text-[#8B9DFF]">
                  {questions.length > 0
                    ? (
                        (questions.reduce(
                          (acc, q) =>
                            acc +
                            Object.keys(q.answers || {}).length /
                              (registeredCount || 1),
                          0
                        ) /
                          questions.length) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </span>
                <div className="w-full h-2 bg-gray-50 rounded-full mt-4 overflow-hidden">
                  <div
                    className="h-full bg-[#8B9DFF] transition-all duration-1000"
                    style={{
                      width: `${
                        questions.length > 0
                          ? (questions.reduce(
                              (acc, q) =>
                                acc +
                                Object.keys(q.answers || {}).length /
                                  (registeredCount || 1),
                              0
                            ) /
                              questions.length) *
                            100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex flex-col items-center">
                <span className="text-gray-400 text-xs font-black uppercase mb-2">
                  Votos Totales Emitidos
                </span>
                <span className="text-4xl font-black text-[#0E3C42]">
                  {questions.reduce(
                    (acc, q) => acc + Object.keys(q.answers || {}).length,
                    0
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {questions.map((q) => {
                const totalVotes = Object.keys(q.answers || {}).length;
                const quorumVoting =
                  registeredCount > 0
                    ? (totalVotes / registeredCount) * 100
                    : 0;

                return (
                  <div
                    key={q.id}
                    className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <h4 className="text-xl font-black text-[#0E3C42] max-w-xl">
                        {q.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase ${
                            q.status === QUESTION_STATUS.CREATED
                              ? "bg-gray-100 text-gray-500"
                              : q.status === QUESTION_STATUS.LIVE
                              ? "bg-red-100 text-red-500 animate-pulse"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {q.status === QUESTION_STATUS.CREATED
                            ? "Sin iniciar"
                            : q.status === QUESTION_STATUS.LIVE
                            ? "En vivo"
                            : "Finalizada"}
                        </span>
                        <button
                          onClick={() => setViewingVotersFor(q)}
                          className="p-2 text-gray-400 hover:text-indigo-500 transition"
                          title="Ver votantes"
                        >
                          <Eye size={20} />
                        </button>
                        <button
                          onClick={() => deleteQuestion(q.id)}
                          className="p-2 text-gray-300 hover:text-red-500 transition"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-8 bg-orange-50/50 p-4 rounded-2xl border border-orange-100/50">
                      <p className="text-sm font-bold text-orange-700">
                        Quórum de votación: {quorumVoting.toFixed(1)}%
                      </p>
                      <HelpCircle size={16} className="text-orange-300" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                      {q.type !== QUESTION_TYPES.OPEN ? (
                        q.options.map((opt, i) => {
                          const answers = q.answers || {};
                          const votesForOpt = Object.values(answers).filter(
                            (a) => {
                              if (
                                (q.type === QUESTION_TYPES.UNIQUE ||
                                  q.type === QUESTION_TYPES.YES_NO) &&
                                a.option === opt
                              )
                                return true;
                              if (
                                q.type === QUESTION_TYPES.MULTIPLE &&
                                Array.isArray(a.options) &&
                                a.options.includes(opt)
                              )
                                return true;
                              return false;
                            }
                          ).length;

                          // Calculate relative to TOTAL registered people (Participation weight)
                          const percent =
                            registeredCount > 0
                              ? (votesForOpt / registeredCount) * 100
                              : 0;
                          // For tooltip or info, calculate relative to actual VOTERS
                          const percentOfVoters =
                            totalVotes > 0
                              ? (votesForOpt / totalVotes) * 100
                              : 0;

                          return (
                            <div
                              key={i}
                              className="bg-gray-50 rounded-2xl p-5 border border-transparent hover:border-indigo-100 transition relative overflow-hidden group"
                              title={`${percentOfVoters.toFixed(
                                1
                              )}% de los votantes`}
                            >
                              <div
                                className="absolute left-0 top-0 bottom-0 bg-indigo-50 transition-all duration-500 ease-out"
                                style={{ width: `${percent}%` }}
                              ></div>
                              <div className="relative flex justify-between items-center z-10">
                                <span className="font-bold text-[#0E3C42] text-sm">
                                  {opt}
                                </span>
                                <div className="text-right">
                                  <p className="text-xs font-black text-[#8B9DFF]">
                                    {percent.toFixed(0)}%
                                  </p>
                                  <p className="text-[10px] text-gray-400">
                                    {votesForOpt} votos
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-full bg-gray-50 rounded-2xl p-6 border border-gray-100 max-h-60 overflow-y-auto">
                          <p className="text-xs font-black text-gray-400 uppercase mb-4">
                            Respuestas de texto:
                          </p>
                          <div className="flex flex-col gap-3">
                            {Object.values(q.answers || {}).map((a, idx) => (
                              <div
                                key={idx}
                                className="bg-white p-4 rounded-xl border border-gray-100 text-sm text-[#0E3C42] font-medium italic"
                              >
                                &ldquo;{a.answerText || a.option}&rdquo;
                              </div>
                            ))}
                            {Object.keys(q.answers || {}).length === 0 && (
                              <p className="text-sm text-gray-400 italic">
                                No hay respuestas aún
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-50">
                      <div className="flex items-center gap-3 bg-indigo-50/50 px-4 py-3 rounded-2xl">
                        <BarChart2 size={18} className="text-[#8B9DFF]" />
                        <p className="text-xs font-bold text-[#8B9DFF]">
                          Resultados calculados sobre los {registeredCount}{" "}
                          registrados.
                        </p>
                      </div>
                      <button
                        onClick={() => toggleQuestionStatus(q.id, q.status)}
                        className={`px-8 py-4 rounded-full font-black text-sm flex items-center gap-2 transition shadow-lg ${
                          q.status === QUESTION_STATUS.CREATED
                            ? "bg-[#0E3C42] text-white hover:bg-black"
                            : q.status === QUESTION_STATUS.LIVE
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "bg-orange-100 text-[#FF9F43] hover:bg-orange-200"
                        }`}
                      >
                        {q.status === QUESTION_STATUS.CREATED ? (
                          <Play size={18} />
                        ) : q.status === QUESTION_STATUS.LIVE ? (
                          <Square size={18} />
                        ) : (
                          <RefreshCw size={18} />
                        )}
                        {q.status === QUESTION_STATUS.CREATED
                          ? "Iniciar votación"
                          : q.status === QUESTION_STATUS.LIVE
                          ? "Finalizar votación"
                          : "Retomar votación"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* QR MODAL */}
      {isQrModalOpen && (
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
                Escanea para acceder a la asamblea
              </p>

              <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-gray-100 inline-block mb-8">
                <QRCodeCanvas
                  value={publicUrl}
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
      {/* VOTERS MODAL */}
      {viewingVotersFor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] p-12 max-w-5xl w-full max-h-[90vh] flex flex-col relative animate-in zoom-in duration-300 shadow-2xl">
            <button
              onClick={() => setViewingVotersFor(null)}
              className="absolute top-8 right-8 text-gray-300 hover:text-gray-600 transition"
            >
              <X size={24} />
            </button>
            <div className="mb-10 text-center md:text-left">
              <h3 className="text-[38px] font-black text-[#0E3C42] mb-3 leading-tight tracking-tighter">
                Votantes
              </h3>
              <p className="text-gray-400 text-base font-medium max-w-2xl">
                Aquí puedes ver el listado de los asambleístas que votaron en la
                pregunta:{" "}
                <span className="font-extrabold text-[#0E3C42]">
                  {viewingVotersFor.title}
                </span>
              </p>
            </div>

            {/* Modal Search */}
            <div className="relative mb-8 group">
              <Search
                className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#8B9DFF] transition-all"
                size={20}
              />
              <input
                type="text"
                placeholder="Busca por grupo, # de unidad privada, documento o nombre"
                className="w-full bg-[#F9FAFB] border border-gray-100 outline-none rounded-[20px] py-4 px-16 text-[14px] font-bold text-[#0E3C42] placeholder:text-gray-300 focus:bg-white focus:ring-[4px] ring-indigo-50/50 transition-all shadow-sm"
                value={modalSearchTerm}
                onChange={(e) => setModalSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 mb-6">
              <span className="text-[12px] font-bold text-gray-400">
                Total de asambleístas que votaron:
              </span>
              <span className="bg-[#ABE7E5] text-[#0E3C42] px-3 py-0.5 rounded-full text-xs font-black">
                {Object.keys(viewingVotersFor.answers || {}).length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-1 custom-scrollbar rounded-2xl border border-gray-50">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-gray-100 text-[11px] font-black text-gray-300 uppercase tracking-widest">
                    <th className="py-5 px-6 italic">Tipo</th>
                    <th className="py-5 px-6 italic">Grupo</th>
                    <th className="py-5 px-6 italic"># propiedad</th>
                    <th className="py-5 px-6 italic">Coeficiente</th>
                    <th className="py-5 px-6 italic">Documento</th>
                    <th className="py-5 px-6 italic">Respuesta</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50 text-[13px] font-bold text-[#0E3C42] uppercase">
                  {Object.entries(viewingVotersFor.answers || {})
                    .filter(([regId, answer]) => {
                      const reg = registries.find((r) => r.id === regId);
                      const search = modalSearchTerm.toLowerCase();
                      if (!search) return true;
                      return (
                        reg?.propiedad?.toLowerCase().includes(search) ||
                        reg?.documento?.toLowerCase().includes(search) ||
                        reg?.grupo?.toLowerCase().includes(search) ||
                        answer.option?.toLowerCase().includes(search) ||
                        answer.options?.some((o) =>
                          o.toLowerCase().includes(search)
                        )
                      );
                    })
                    .map(([regId, answer]) => {
                      const reg = registries.find((r) => r.id === regId);
                      return (
                        <tr
                          key={regId}
                          className="hover:bg-indigo-50/20 transition group"
                        >
                          <td className="py-5 px-6 text-gray-400">
                            {reg?.tipo || "—"}
                          </td>
                          <td className="py-5 px-6 text-gray-400">
                            {reg?.grupo || "—"}
                          </td>
                          <td className="py-5 px-6 font-black">
                            {reg?.propiedad || "—"}
                          </td>
                          <td className="py-5 px-6 text-[#8B9FFD]">
                            {reg?.coeficiente || "0"}%
                          </td>
                          <td className="py-5 px-6 text-gray-400">
                            {reg?.documento || "—"}
                          </td>
                          <td className="py-5 px-6">
                            <span className="bg-indigo-50 text-[#8B9FFD] px-4 py-1.5 rounded-full text-[11px] font-black">
                              {answer.option ||
                                answer.options?.join(", ") ||
                                (answer.answerText ? "Resp. Abierta" : "—")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  {Object.keys(viewingVotersFor.answers || {}).length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
                        className="py-24 text-center text-gray-400 font-bold italic"
                      >
                        No hay votos registrados para esta pregunta.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-10 flex justify-center">
              <button
                onClick={() => setViewingVotersFor(null)}
                className="w-full max-w-sm py-4 rounded-2xl bg-[#8B9DFF] text-white font-black text-lg shadow-lg shadow-indigo-100 hover:bg-[#7a8ce0] hover:scale-[1.02] transform transition-all active:scale-95"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssemblyDashboardPage;
