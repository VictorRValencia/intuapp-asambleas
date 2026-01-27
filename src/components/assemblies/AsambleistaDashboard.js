import React, { useState } from "react";
import {
  Home,
  BarChart2,
  User,
  HelpCircle,
  Video,
  LogOut,
  Building2,
  Users,
  Check,
  Eye,
  AlertTriangle,
  Car,
  Store,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  ChevronDown,
  MessageCircle,
} from "lucide-react";
import QuestionCard from "../dashboard/QuestionCard";

const QUESTION_TYPES = {
  MULTIPLE: "MULTIPLE",
  UNIQUE: "UNIQUE",
  YES_NO: "YES_NO",
  OPEN: "OPEN",
};

const QUESTION_STATUS = {
  CREATED: "CREATED",
  LIVE: "LIVE",
  FINISHED: "FINISHED",
};

const NavItem = ({ id, icon: Icon, label, activeTab, setActiveTab }) => (
  <button
    onClick={() => setActiveTab(id)}
    className={`w-full flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${
      activeTab === id
        ? "bg-indigo-50 text-[#8B9DFF]"
        : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
    }`}
  >
    <Icon size={24} />
    <span className="text-[10px] font-bold uppercase tracking-wide">
      {label}
    </span>
  </button>
);

export default function AsambleistaDashboard({
  user,
  assembly,
  entity,
  registries,
  onJoinMeeting,
  onLogout,
  questions = [],
  renderQuestion,
  userVotingPreference,
  onSetVotingPreference,
}) {
  const [activeTab, setActiveTab] = useState("inicio");
  const [resultSubTab, setResultSubTab] = useState("global"); // 'global' | 'mine'
  const [openFaq, setOpenFaq] = useState(null);

  // Sort questions: Newest first (assuming ID or some timestamp, but array usually comes sorted or we reverse)
  // User wants newest first.
  const sortedQuestions = [...questions].reverse();

  // Helper to get total votes
  const getQuestionStats = (q) => {
    const totalVotes = Object.keys(q.answers || {}).length;
    // Group by answer
    const counts = {};
    Object.values(q.answers || {}).forEach((ans) => {
      // ans is { option: "..." } or { options: [...] } or { answerText: "..." }
      if (ans.option) {
        counts[ans.option] = (counts[ans.option] || 0) + 1;
      } else if (ans.options) {
        ans.options.forEach((o) => (counts[o] = (counts[o] || 0) + 1));
      }
      // Open text not easily charted
    });
    return { totalVotes, counts };
  };

  // Calculate Stats
  const registeredCount = registries.filter((r) => r.registerInAssembly).length;
  const totalCount = registries.length;
  // Coefficient sum
  const totalCoeff = registries.reduce(
    (acc, curr) => acc + parseFloat(curr.coeficiente || 0),
    0,
  );
  const registeredCoeff = registries
    .filter((r) => r.registerInAssembly)
    .reduce((acc, curr) => acc + parseFloat(curr.coeficiente || 0), 0);

  const quorumPercentage =
    totalCoeff > 0 ? (registeredCoeff / totalCoeff) * 100 : 0;

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans">
      {/* Sidebar */}
      <aside className="w-24 bg-white border-r border-gray-100 flex flex-col items-center py-8 z-20 fixed h-full left-0 top-0 overflow-y-auto hidden md:flex">
        <div className="mb-12">
          <div className="w-12 h-12 bg-[#8B9DFF] rounded-xl flex items-center justify-center text-white font-black text-xl">
            A
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full px-2 flex-1">
          <NavItem
            id="inicio"
            icon={Home}
            label="Inicio"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <NavItem
            id="resultados"
            icon={BarChart2}
            label="Resultados"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <NavItem
            id="perfil"
            icon={User}
            label="Perfil"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <NavItem
            id="ayuda"
            icon={HelpCircle}
            label="Ayuda"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>

        <div className="mt-auto pt-8">
          <button className="flex flex-col items-center gap-1 text-gray-300 hover:text-gray-500 transition">
            <Building2 size={24} />
            <span className="text-[8px] font-bold uppercase">IntuApp</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Bar (optional, hidden on desktop) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-2 flex justify-around z-50">
        <button
          onClick={() => setActiveTab("inicio")}
          className="p-2 text-[#8B9DFF]"
        >
          <Home size={24} />
        </button>
        <button
          onClick={() => setActiveTab("resultados")}
          className="p-2 text-gray-400"
        >
          <BarChart2 size={24} />
        </button>
        <button
          onClick={() => setActiveTab("perfil")}
          className="p-2 text-gray-400"
        >
          <User size={24} />
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-24 p-6 md:p-12 relative overflow-y-auto">
        {/* Top Header */}
        <div className="flex justify-between items-center mb-12">
          <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-400">
            <Home size={18} />
          </div>

          <button
            onClick={onLogout}
            className="bg-[#0E3C42] text-white pl-4 pr-1 py-1 rounded-full flex items-center gap-3 shadow-lg hover:shadow-xl transition-all"
          >
            <span className="text-sm font-bold tracking-widest font-mono">
              {user?.document || "User"}
            </span>
            <div className="w-8 h-8 rounded-full bg-[#1a5c63] flex items-center justify-center">
              <User size={14} />
            </div>
          </button>
        </div>

        {activeTab === "inicio" && (
          <div className="animate-in fade-in duration-500">
            {/* Welcome */}
            <h1 className="text-4xl font-extrabold text-[#0E3C42] mb-10">
              Hola, {user?.firstName || "Asambleísta"}!
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {/* Assembly Info Card */}
              <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 flex flex-col justify-between min-h-[220px] relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-indigo-50 to-transparent opacity-50 rounded-r-[32px]"></div>

                <div className="z-10">
                  <h2 className="text-2xl font-bold text-[#0E3C42] mb-1">
                    {assembly.name}
                  </h2>
                  <p className="text-gray-500 font-medium mb-6">
                    {entity?.name}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-gray-500 font-semibold">
                    <span>
                      {assembly.date} - {assembly.hour}
                    </span>
                  </div>
                </div>

                <div className="mt-8 z-10">
                  <span className="bg-[#E0E7FF] text-[#6366F1] px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center w-max gap-2">
                    <Video size={14} /> {assembly.type}
                  </span>
                </div>
              </div>

              {/* Join Call Card & Questions */}
              <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 flex flex-col justify-between min-h-[220px] max-h-[600px] overflow-y-auto">
                {questions && questions.length > 0 ? (
                  <div className="flex flex-col gap-6 w-full mb-6">
                    <h3 className="font-bold text-[#0E3C42] flex items-center gap-2">
                      <HelpCircle size={20} /> Votaciones
                    </h3>
                    {sortedQuestions.map((q) => (
                      <div key={q.id}>{renderQuestion(q)}</div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-indigo-50 rounded-2xl p-4 flex items-start gap-4 mb-6">
                    <div className="bg-[#8B9DFF] p-2 rounded-lg text-white shrink-0">
                      <Users size={20} />
                    </div>
                    <p className="text-sm text-[#0E3C42] font-medium leading-relaxed">
                      Las preguntas aparecerán aquí, una por una, cuando el
                      operador las active. O únete a la transmisión en vivo para
                      participar verbalmente.
                    </p>
                  </div>
                )}

                {/* Join Button */}
                {assembly.type !== "Presencial" && (
                  <div className="mt-auto pt-4 border-t border-gray-100">
                    <button
                      onClick={onJoinMeeting}
                      disabled={assembly.status !== "started"}
                      className={`w-full font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 ${
                        assembly.status === "started"
                          ? "bg-[#8B9DFF] hover:bg-[#7a8ce0] text-white shadow-indigo-100"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                      }`}
                    >
                      <Video size={20} /> Unirse a la videollamada / Votar
                    </button>
                    {assembly.status !== "started" && (
                      <p className="text-center text-xs text-gray-400 font-bold mt-2">
                        {assembly.status === "finished"
                          ? "La reunión ya finalizó"
                          : "La reunión no ha iniciado"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-xl font-bold text-[#0E3C42] mb-6">
              Asistencia
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quorum Card */}
              <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-[#0E3C42] mb-1">
                    Quórum
                  </h4>
                  <p className="text-4xl font-extrabold text-[#0E3C42] mb-1">
                    {quorumPercentage.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                    porcentaje de registrados
                  </p>
                </div>
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-[#8B9DFF]">
                  <BarChart2 size={24} />
                </div>
              </div>

              {/* Attendance Card */}
              <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-[#0E3C42] mb-1">
                    Asistencia
                  </h4>
                  <p className="text-4xl font-extrabold text-[#0E3C42] mb-1">
                    {registeredCount}{" "}
                    <span className="text-xl text-gray-300">
                      / {totalCount}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                    asambleístas registrados
                  </p>
                </div>
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-[#8B9DFF]">
                  <Users size={24} />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "resultados" && (
          <div className="animate-in fade-in duration-500">
            <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full max-w-2xl mx-auto mb-8">
              <button
                onClick={() => setResultSubTab("global")}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${
                  resultSubTab === "global"
                    ? "bg-white text-[#0E3C42] shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Resultados Globales
              </button>
              <button
                onClick={() => setResultSubTab("mine")}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${
                  resultSubTab === "mine"
                    ? "bg-white text-[#0E3C42] shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Gestionar votaciones
              </button>
            </div>

            {resultSubTab === "global" && (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-2xl font-black text-[#0E3C42]">
                    Resultados de la votación
                  </h2>
                  {assembly.status === "finished" && (
                    <span className="bg-indigo-50 text-[#8B9DFF] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                      Asamblea Finalizada
                    </span>
                  )}
                </div>

                {/* Show finished questions even if assembly not finished */}
                {(() => {
                  const questionsToShow =
                    assembly.status === "finished"
                      ? sortedQuestions
                      : sortedQuestions.filter(
                          (q) =>
                            q.status === QUESTION_STATUS.FINISHED ||
                            q.status === QUESTION_STATUS.LIVE,
                        );

                  if (
                    assembly.status !== "finished" &&
                    questionsToShow.length === 0
                  ) {
                    return (
                      <div className="bg-white p-12 rounded-[32px] border border-gray-100 shadow-sm text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-[#8B9DFF] mb-6">
                          <BarChart2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-[#0E3C42] mb-2">
                          Resultados Globales en Espera
                        </h3>
                        <p className="text-gray-400 max-w-xs mx-auto text-sm font-medium">
                          Los resultados aparecerán aquí a medida que el
                          administrador finalice cada votación.
                        </p>
                      </div>
                    );
                  }

                  if (
                    assembly.status === "finished" &&
                    sortedQuestions.length === 0
                  ) {
                    return (
                      <p className="text-gray-400 text-center py-12">
                        No hubo preguntas emitidas en esta asamblea.
                      </p>
                    );
                  }

                  if (questionsToShow.length === 0) return null;

                  return questionsToShow.map((q) => (
                    <QuestionCard
                      key={q.id}
                      q={q}
                      registries={registries}
                      isAdmin={false}
                    />
                  ));
                })()}
              </div>
            )}

            {resultSubTab === "mine" && (
              <div className="flex flex-col gap-6">
                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-bold text-[#0E3C42] mb-1">
                    Preferencia de Votación
                  </h3>
                  <p className="text-sm text-gray-500 mb-6 font-medium">
                    {assembly?.votingMode
                      ? "El modo de votación ha sido fijado por el administrador para esta asamblea."
                      : "Selecciona cómo quieres responder las votaciones de esta asamblea. Podrás cambiarlo en cualquier momento si no has votado."}
                  </p>

                  <div
                    className={`flex items-center gap-8 ${
                      assembly?.votingMode
                        ? "opacity-50 pointer-events-none"
                        : ""
                    }`}
                  >
                    <div
                      onClick={() => onSetVotingPreference?.("individual")}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          userVotingPreference === "individual" ||
                          assembly?.votingMode === "individual"
                            ? "bg-[#8B9DFF] border-[#8B9DFF]"
                            : "border-gray-300 bg-white group-hover:border-[#8B9DFF]"
                        }`}
                      >
                        {(userVotingPreference === "individual" ||
                          assembly?.votingMode === "individual") && (
                          <Check size={16} className="text-white" />
                        )}
                      </div>
                      <div>
                        <span
                          className={`block text-sm font-bold ${
                            userVotingPreference === "individual" ||
                            assembly?.votingMode === "individual"
                              ? "text-[#0E3C42]"
                              : "text-gray-400"
                          }`}
                        >
                          Votar individual
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                          Pregunta por propiedad
                        </span>
                      </div>
                    </div>

                    <div
                      onClick={() => onSetVotingPreference?.("block")}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          userVotingPreference === "block" ||
                          assembly?.votingMode === "block"
                            ? "bg-[#8B9DFF] border-[#8B9DFF]"
                            : "border-gray-300 bg-white group-hover:border-[#8B9DFF]"
                        }`}
                      >
                        {(userVotingPreference === "block" ||
                          assembly?.votingMode === "block") && (
                          <Check size={16} className="text-white" />
                        )}
                      </div>
                      <div>
                        <span
                          className={`block text-sm font-bold ${
                            userVotingPreference === "block" ||
                            assembly?.votingMode === "block"
                              ? "text-[#0E3C42]"
                              : "text-gray-400"
                          }`}
                        >
                          Votar en bloque
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                          Un solo voto para todas
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-[#0E3C42] mt-4">
                  Mis Respuestas
                </h2>
                {sortedQuestions.map((q) => {
                  const votesByProperty = user.myRegistries
                    .map((r) => ({
                      registry: r,
                      answer: q.answers?.[r.id],
                    }))
                    .filter((item) => item.answer);

                  // Group by the same answer object string representation
                  const groupedVotes = votesByProperty.reduce(
                    (acc, current) => {
                      const ansKey = JSON.stringify(current.answer);
                      if (!acc[ansKey]) {
                        acc[ansKey] = {
                          answer: current.answer,
                          properties: [],
                        };
                      }
                      acc[ansKey].properties.push(current.registry);
                      return acc;
                    },
                    {},
                  );

                  const groups = Object.values(groupedVotes);

                  return (
                    <div
                      key={q.id}
                      className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm"
                    >
                      <h3 className="text-lg font-bold text-[#0E3C42] mb-6">
                        {q.title}
                      </h3>

                      {groups.length > 0 ? (
                        <div className="flex flex-col gap-6">
                          {groups.map((group, idx) => {
                            let ansText = "";
                            if (group.answer.option)
                              ansText = group.answer.option;
                            if (group.answer.options)
                              ansText = group.answer.options.join(", ");
                            if (group.answer.answerText)
                              ansText = group.answer.answerText;

                            return (
                              <div
                                key={idx}
                                className="bg-gray-50 p-6 rounded-2xl border border-gray-100"
                              >
                                <div className="flex flex-wrap gap-2 mb-4">
                                  {group.properties.map((reg, rIdx) => (
                                    <span
                                      key={rIdx}
                                      className="bg-indigo-50 text-[#8B9DFF] text-[10px] font-black uppercase px-2 py-1 rounded-md border border-indigo-100"
                                    >
                                      {reg.tipo ? `${reg.tipo} - ` : ""}
                                      {reg.grupo ? `${reg.grupo} - ` : ""}
                                      {reg.propiedad}
                                    </span>
                                  ))}
                                </div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    Respuesta
                                  </span>
                                  <span className="bg-green-100 text-green-600 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                                    Votado
                                  </span>
                                </div>
                                <p className="text-xl font-black text-[#0E3C42]">
                                  {ansText}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-200 text-center">
                          <p className="text-sm font-bold text-gray-400">
                            No participaste en esta pregunta.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {activeTab === "ayuda" && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* HELP BANNER */}
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-[40px] p-10 md:p-16 mb-12 relative overflow-hidden shadow-xl shadow-indigo-100">
              {/* Abstract decorative shapes */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-300/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>

              <div className="relative z-10 max-w-2xl">
                <h2 className="text-4xl font-black text-white mb-4 leading-tight">
                  ¿Tienes algún problema?
                </h2>
                <p className="text-indigo-50 text-lg font-medium mb-10 opacity-90">
                  Estamos aquí para ayudarte, envíanos un mensaje para
                  asistencia rápida.
                </p>

                <button
                  onClick={() =>
                    window.open(
                      "https://api.whatsapp.com/send?phone=YOUR_NUMBER_HERE",
                      "_blank",
                    )
                  }
                  className="bg-white/20 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-white/30 transition shadow-lg active:scale-95"
                >
                  <MessageCircle size={22} className="fill-white/20" />
                  Escribenos
                </button>
              </div>

              {/* Illustration-like background element (Visual) */}
              <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden lg:block opacity-20">
                <HelpCircle size={180} className="text-white" />
              </div>
            </div>

            <h3 className="text-2xl font-black text-[#0E3C42] mb-8">
              Preguntas frecuentes
            </h3>

            <div className="flex flex-col gap-4">
              {/* FAQ 1 */}
              <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden transition-all duration-300">
                <button
                  onClick={() => setOpenFaq(openFaq === 1 ? null : 1)}
                  className="w-full px-8 py-6 flex justify-between items-center text-left hover:bg-gray-50 transition"
                >
                  <span className="text-lg font-bold text-[#4F46E5]">
                    ¿Cómo se vota?
                  </span>
                  <ChevronDown
                    size={20}
                    className={`text-[#4F46E5] transition-transform duration-300 ${
                      openFaq === 1 ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-500 ease-in-out ${
                    openFaq === 1 ? "max-h-[500px]" : "max-h-0"
                  }`}
                >
                  <div className="px-8 pb-8 text-gray-500 font-medium leading-relaxed border-t border-gray-50 pt-6">
                    <ol className="list-decimal pl-5 space-y-3">
                      <li>
                        El operador iniciará la votación de cada pregunta.
                      </li>
                      <li>La pregunta aparecerá en tu pantalla.</li>
                      <li>Selecciona tu respuesta.</li>
                      <li>
                        Pulsa el botón &quot;votar&quot; para registrar tu voto.
                      </li>
                      <li>
                        Si tienes hasta 4 representaciones, puedes votar por
                        cada propiedad o una sola vez para todas (según tu
                        elección inicial).
                      </li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* FAQ 2 */}
              <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden transition-all duration-300">
                <button
                  onClick={() => setOpenFaq(openFaq === 2 ? null : 2)}
                  className="w-full px-8 py-6 flex justify-between items-center text-left hover:bg-gray-50 transition"
                >
                  <span className="text-lg font-bold text-[#4F46E5]">
                    ¿Cómo edito mi registro?
                  </span>
                  <ChevronDown
                    size={20}
                    className={`text-[#4F46E5] transition-transform duration-300 ${
                      openFaq === 2 ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-500 ease-in-out ${
                    openFaq === 2 ? "max-h-[200px]" : "max-h-0"
                  }`}
                >
                  <div className="px-8 pb-8 text-gray-500 font-medium leading-relaxed border-t border-gray-50 pt-6">
                    No se puede editar. Debe solicitar al operador logistico la
                    eliminación para volver a registrarse.
                  </div>
                </div>
              </div>

              {/* FAQ 3 */}
              <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden transition-all duration-300">
                <button
                  onClick={() => setOpenFaq(openFaq === 3 ? null : 3)}
                  className="w-full px-8 py-6 flex justify-between items-center text-left hover:bg-gray-50 transition"
                >
                  <span className="text-lg font-bold text-[#4F46E5]">
                    Sobre los resultados de las votaciones
                  </span>
                  <ChevronDown
                    size={20}
                    className={`text-[#4F46E5] transition-transform duration-300 ${
                      openFaq === 3 ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-500 ease-in-out ${
                    openFaq === 3 ? "max-h-[800px]" : "max-h-0"
                  }`}
                >
                  <div className="px-8 pb-8 text-gray-500 font-medium leading-relaxed border-t border-gray-50 pt-6">
                    <p className="font-bold text-[#0E3C42] mb-4">
                      Los resultados emitidos en la plataforma se obtienen con
                      base en los coeficientes, según lo establecido en la Ley
                      675 de 2001:
                    </p>
                    <ul className="space-y-4">
                      <li className="flex gap-2">
                        <span className="font-bold text-gray-700 min-w-max">
                          •
                        </span>
                        <span>
                          <strong className="text-gray-700">
                            Artículo 37. Derecho al voto:
                          </strong>{" "}
                          &ldquo;El voto de cada propietario equivaldrá al
                          porcentaje del coeficiente de copropiedad del
                          respectivo bien privado.&ldquo;
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold text-gray-700 min-w-max">
                          •
                        </span>
                        <span>
                          <strong className="text-gray-700">
                            Artículo 45. Quórum y mayorías:
                          </strong>{" "}
                          &ldquo;Con excepción de los casos en que la ley o el
                          reglamento de propiedad horizontal exijan un quórum o
                          mayoría superior, y de las reuniones de segunda
                          convocatoria previstas en el artículo 41, la asamblea
                          general sesionará con un número plural de propietarios
                          de unidades privadas que representen más de la mitad
                          de los coeficientes de copropiedad, y tomará
                          decisiones con el voto favorable de la mitad más uno
                          de dichos coeficientes.&rdquo;
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "perfil" && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* PROFILE HEADER CARD */}
            <div className="max-w-2xl mx-auto bg-white rounded-[40px] p-10 shadow-xl shadow-indigo-100/20 border border-gray-100 flex flex-col items-center text-center relative overflow-hidden mb-12">
              {/* Decorative Background Blotches */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 opacity-60"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 opacity-60"></div>

              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-[#8B9DFF] mb-6 shadow-inner">
                <User size={48} strokeWidth={1.5} />
              </div>

              <h2 className="text-3xl font-black text-[#0E3C42] mb-1">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-gray-400 font-bold text-sm mb-10">
                Código de ingreso: {user?.document}
              </p>

              <div className="flex flex-wrap justify-center gap-4 w-full">
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 px-8 py-3.5 rounded-2xl border-2 border-gray-100 text-[#0E3C42] font-black text-sm hover:bg-gray-50 transition active:scale-95"
                >
                  <LogOut size={18} /> Cerrar sesión
                </button>
                {/* Certificado de participación - Hidden as requested */}
                {/* 
                <button className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#8B9DFF] text-white font-black text-sm shadow-lg shadow-indigo-100 hover:bg-[#7a8ce0] transition active:scale-95">
                  <FileText size={18} /> Certificado de participación
                </button> 
                */}
              </div>
            </div>

            {/* PROPERTIES SECTION */}
            <div className="bg-white rounded-[40px] p-10 shadow-sm border border-gray-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <h3 className="text-2xl font-black text-[#0E3C42]">
                  Propiedades
                </h3>

                <div className="relative min-w-[180px]">
                  <select className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 outline-none font-bold text-[#0E3C42] text-sm appearance-none cursor-pointer">
                    <option>Ordenar por</option>
                    <option>Nombre</option>
                    <option>Coeficiente</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ChevronRight size={16} className="rotate-90" />
                  </div>
                </div>
              </div>

              {/* COEFF BANNER */}
              <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center mb-10 border border-gray-100/50">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-2">
                  Coeficiente total
                </span>
                <span className="text-2xl font-black text-[#0E3C42] pr-2">
                  {user?.myRegistries
                    ?.reduce(
                      (acc, r) =>
                        acc +
                        parseFloat(
                          String(r.coeficiente || 0).replace(",", "."),
                        ),
                      0,
                    )
                    .toFixed(2)}
                  %
                </span>
              </div>

              {/* GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {user?.myRegistries?.map((reg, idx) => {
                  // Find the specific role for this property
                  const roleObj = user.registries?.find(
                    (r) => r.registryId === reg.id,
                  );
                  const isProxy =
                    roleObj?.role?.toLowerCase() === "proxy" ||
                    roleObj?.role?.toLowerCase() === "apoderado";

                  // Icon mapping
                  const type = (reg.tipo || "").toLowerCase();
                  let Icon = Building2;
                  if (type.includes("parqueadero") || type.includes("garaje"))
                    Icon = Car;
                  if (type.includes("local")) Icon = Store;

                  return (
                    <div
                      key={idx}
                      className="p-6 rounded-3xl bg-white border border-gray-100 hover:border-[#8B9FFD] transition shadow-sm hover:shadow-md group"
                    >
                      <div className="flex items-start gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50/50 flex items-center justify-center text-[#8B9DFF] group-hover:bg-[#8B9DFF] group-hover:text-white transition-all duration-300 shadow-sm">
                          <Icon size={24} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-[#0E3C42] mb-2 leading-tight">
                            {reg.tipo ? `${reg.tipo} - ` : ""}
                            {reg.grupo ? `${reg.grupo} - ` : ""}
                            {reg.propiedad}
                          </h4>
                          <div className="flex flex-wrap items-center gap-3">
                            <span
                              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                isProxy
                                  ? "bg-purple-50 text-purple-600"
                                  : "bg-teal-50 text-teal-600"
                              }`}
                            >
                              {isProxy ? "Apoderado" : "Propietario"}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400">
                              Coef:{" "}
                              <strong className="text-gray-600">
                                {reg.coeficiente}%
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PAGINATION (Visual) */}
              <div className="flex justify-center items-center gap-2">
                <button className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition">
                  <ChevronsLeft size={16} />
                </button>
                <button className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition">
                  <ChevronLeft size={16} />
                </button>
                <button className="w-10 h-10 rounded-xl bg-[#8B9DFF] flex items-center justify-center text-white font-black text-sm">
                  1
                </button>
                <button className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition font-bold text-sm">
                  2
                </button>
                <button className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition font-bold text-sm">
                  3
                </button>
                <span className="px-2 text-gray-300">...</span>
                <button className="w-24 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-[#0E3C42] transition font-bold text-xs uppercase tracking-widest gap-2">
                  Siguiente <ChevronRight size={14} />
                </button>
                <button className="w-24 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-[#0E3C42] transition font-bold text-xs uppercase tracking-widest gap-2">
                  Última <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab !== "inicio" && (
          <div className="pointer-events-none fixed inset-0 z-50">
            {sortedQuestions.map((q) => (
              <React.Fragment key={q.id}>
                {renderQuestion(q, { forceModalOnly: true })}
              </React.Fragment>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
