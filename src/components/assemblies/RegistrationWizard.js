"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getEntityById, updateRegistryStatus } from "@/lib/entities";
import { collection, query, where } from "firebase/firestore";
import Loader from "@/components/basics/Loader";
import {
  Check,
  Building2,
  Video,
  ArrowLeft,
  Trash2,
  UploadCloud,
  FileText,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  QUESTION_STATUS,
  QUESTION_TYPES,
  submitVote,
  submitBatchVotes,
} from "@/lib/questions";

// Components
import { createAssemblyUser, getAssemblyUser } from "@/lib/assemblyUser";
import AsambleistaLogin from "@/components/assemblies/AsambleistaLogin";
import AsambleistaDashboard from "@/components/assemblies/AsambleistaDashboard";

// --- Helper Components ---

const ProgressBar = ({ currentStep, totalSteps = 7 }) => (
  <div className="w-full h-2 bg-gray-100 rounded-full mb-8 overflow-hidden">
    <div
      className="h-full bg-[#8B9DFF] transition-all duration-500 ease-out"
      style={{ width: `${(currentStep / totalSteps) * 100}%` }}
    />
  </div>
);

const PropertyCardSimple = ({ registry }) => (
  <div className="p-4 rounded-2xl border border-blue-100 bg-white flex items-center gap-4 shadow-sm min-w-[200px]">
    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#8B9DFF] flex items-center justify-center shrink-0">
      <Building2 size={20} />
    </div>
    <div>
      <h4 className="font-bold text-[#0E3C42] text-sm">
        {registry.tipo ? `${registry.tipo} - ` : ""}
        {registry.propiedad || "Propiedad"}
      </h4>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-[10px] text-gray-400 font-medium">
          Coef:{" "}
          <strong className="text-gray-600">
            {registry.coeficiente || "0"}%
          </strong>
        </span>
      </div>
    </div>
  </div>
);

const QuestionItem = ({
  q,
  userRegistries = [],
  assembly,
  userVotingPreference,
  onSetVotingPreference,
  forceModalOnly = false,
}) => {
  // 1. Filter eligible registries
  const activeRegistries = userRegistries.filter(
    (reg) =>
      !reg.voteBlocked && !(assembly?.blockedVoters || []).includes(reg.id),
  );

  // Filter out those who have ALREADY voted in this specific question
  const registriesPending = activeRegistries.filter((r) => !q.answers?.[r.id]);

  const effectiveVoteBlocked = activeRegistries.length === 0;

  // 2. State
  // Mode priorities: 1. Assembly forced mode, 2. Single registry (always block), 3. User saved preference, 4. 'select'
  const [mode, setMode] = useState(() => {
    if (assembly?.votingMode) return assembly.votingMode;
    if (activeRegistries.length <= 1) return "block";
    return userVotingPreference || "select";
  });

  // Sync mode if assembly votingMode or userVotingPreference changes
  useEffect(() => {
    if (assembly?.votingMode) {
      setMode(assembly.votingMode);
    } else if (activeRegistries.length > 1) {
      if (userVotingPreference) {
        setMode(userVotingPreference);
      } else {
        setMode("select");
      }
    } else {
      setMode("block");
    }
  }, [assembly?.votingMode, userVotingPreference, activeRegistries.length]);

  // For Block Vote
  const [blockSelectedOptions, setBlockSelectedOptions] = useState([]);
  const [blockOpenAnswer, setBlockOpenAnswer] = useState("");
  const [blockSelectedOption, setBlockSelectedOption] = useState(null);

  // For Individual Vote: Map registryId -> answerObj
  const [individualVotes, setIndividualVotes] = useState({});

  const [selectedMode, setSelectedMode] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Check past votes to determine if "Has Voted" completely?
  // If ANY voted, we consider it "in progress" or "done"?
  // If ALL voted, it's done.
  const votedCount = activeRegistries.length - registriesPending.length;
  const isFullyVoted =
    activeRegistries.length > 0 && registriesPending.length === 0;

  // Effects
  useEffect(() => {
    if (activeRegistries.length === 1) setMode("block");
  }, [activeRegistries.length]);

  // Helpers
  const toggleBlockOption = (opt) => {
    if (blockSelectedOptions.includes(opt)) {
      setBlockSelectedOptions(blockSelectedOptions.filter((o) => o !== opt));
    } else {
      setBlockSelectedOptions([...blockSelectedOptions, opt]);
    }
  };

  const setIndividualVote = (regId, answer) => {
    setIndividualVotes((prev) => ({ ...prev, [regId]: answer }));
  };

  const hasVoted = votedCount > 0;

  if (q.status === QUESTION_STATUS.FINISHED && !hasVoted) return null;

  // Submit Handlers
  const submitBlockVote = async (answer) => {
    if (registriesPending.length === 0) {
      toast.info("Todas tus propiedades activas ya han votado.");
      return;
    }
    setIsSubmitting(true);

    // Construct votes for all active registries
    const votes = registriesPending.map((reg) => ({
      registryId: reg.id,
      answer,
    }));

    const res = await submitBatchVotes(q.id, votes);

    setIsSubmitting(false);
    if (res.success) setShowSuccess(true);
    else toast.error("Error al votar");
  };

  const submitIndividualVotes = async () => {
    setIsSubmitting(true);

    // Construct votes from the individualVotes map
    const votes = [];
    activeRegistries.forEach((reg) => {
      const ans = individualVotes[reg.id];
      if (ans) {
        votes.push({
          registryId: reg.id,
          answer: ans,
        });
      }
    });

    if (votes.length === 0) {
      setIsSubmitting(false);
      return;
    }

    const res = await submitBatchVotes(q.id, votes);

    setIsSubmitting(false);
    if (res.success) setShowSuccess(true);
    else toast.error("Error al votar");
  };

  // Renderers
  if (effectiveVoteBlocked) {
    if (forceModalOnly) return null;
    return (
      <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm opacity-60 mb-4">
        <h3 className="text-base font-bold text-[#0E3C42] mb-1">{q.title}</h3>
        <span className="bg-red-100 text-red-600 text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1 w-max mt-2">
          <AlertTriangle size={12} /> Bloqueado
        </span>
      </div>
    );
  }

  // Already Voted View (Static Card)
  if (isFullyVoted && !showSuccess) {
    if (forceModalOnly) return null;
    return (
      <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm transition-all hover:shadow-md mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#0E3C42] mb-1">{q.title}</h3>
          <p className="text-xs text-gray-400">Votación completada.</p>
        </div>
        <div className="bg-green-100 text-green-600 w-10 h-10 rounded-full flex items-center justify-center">
          <Check size={20} strokeWidth={3} />
        </div>
      </div>
    );
  }

  // --- BOTTOM SHEET INTERFACE ---
  // If not fully voted (or showing success), we show the Bottom Sheet.
  // We also show a "Mini Card" in the dashboard just in case they close the sheet (if we allow closing).
  // For this requirement, we'll force the sheet to be present if active.

  return (
    <>
      {/* Placeholder in Dashboard Stream (Optional, visual anchor) */}
      {!forceModalOnly && (
        <div className="bg-indigo-50/50 border border-[#8B9DFF]/30 p-6 rounded-[24px] mb-4 animate-pulse">
          <h3 className="text-base font-bold text-[#0E3C42] mb-1">{q.title}</h3>
          <p className="text-xs text-[#8B9DFF] font-bold">
            Votación en curso...
          </p>
        </div>
      )}

      {/* BOTTOM SHEET OVERLAY */}
      <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
        {/* Backdrop (Clicking outside could minimize, but for voting we usually keep it focused) */}
        <div className="absolute inset-0 bg-blue-950/50 pointer-events-auto" />

        {/* SHEET CONTENT */}
        <div className="bg-[#F8F9FA] w-full  mx-auto rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col max-h-[85vh] pointer-events-auto animate-in slide-in-from-bottom duration-500">
          {/* SUCCESS VIEW (Inside Sheet) */}

          {showSuccess ? (
            <div className="p-8 pb-12 text-center flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
              {/* Blobs */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-blue-200/50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-200/50 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

              <div className="w-16 h-16 bg-gradient-to-tr from-[#8B9DFF] to-indigo-500 rounded-full flex items-center justify-center mb-6 text-white shadow-lg shadow-indigo-200 z-10">
                <Check size={32} strokeWidth={4} />
              </div>
              <h3 className="text-2xl font-black text-[#0E3C42] mb-2 z-10">
                ¡Tu votación fue exitosa!
              </h3>
              <p className="text-sm text-gray-500 font-medium mb-8 max-w-xs z-10">
                Podrás ver tus votos y el resultado de las votaciones en la
                opción Resultados del menú inferior.
              </p>
              <button
                onClick={() => setShowSuccess(false)}
                className="w-full bg-[#0E3C42] text-white font-bold py-4 rounded-2xl shadow-xl active:scale-95 transition z-10"
              >
                Aceptar
              </button>
            </div>
          ) : (
            <>
              {/* Warning Banner for Individual Mode */}
              {mode === "individual" && (
                <div className="bg-orange-50 border-b border-orange-100 px-6 py-4 flex items-start gap-3 shrink-0">
                  <AlertTriangle
                    size={18}
                    className="text-orange-500 shrink-0 mt-0.5"
                  />
                  <p className="text-xs font-bold text-orange-700 leading-snug">
                    Recuerda que vas a votar individualmente por cada propiedad
                    que tienes.
                  </p>
                </div>
              )}

              {/* Header */}

              {/* BODY: SCROLLABLE CONTENT */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {/* SELECT MODE */}
                {mode === "select" && (
                  <div className="py-4">
                    <h3 className="text-xl font-extrabold text-[#0E3C42] mb-6 text-center leading-tight">
                      ¿Cómo quieres votar en esta asamblea?
                    </h3>

                    <div className="flex flex-col gap-4 mb-8">
                      {/* Individual Option */}
                      <button
                        onClick={() => setSelectedMode("individual")}
                        className={`w-full p-5 rounded-3xl border-2 transition-all text-start flex items-center gap-4 ${
                          selectedMode === "individual"
                            ? "border-[#8B9DFF] bg-indigo-50/30"
                            : "border-gray-100 bg-white"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            selectedMode === "individual"
                              ? "border-[#8B9DFF]"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedMode === "individual" && (
                            <div className="w-3.5 h-3.5 rounded-full bg-[#8B9DFF] shadow-sm animate-in zoom-in duration-300" />
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="block text-lg font-bold text-[#0E3C42]">
                            Individual
                          </span>
                          <span className="text-sm text-gray-500 font-medium leading-relaxed">
                            Responde cada pregunta por cada propiedad que
                            tengas.
                          </span>
                        </div>
                      </button>

                      {/* En Bloque Option */}
                      <button
                        onClick={() => setSelectedMode("block")}
                        className={`w-full p-5 rounded-3xl border-2 transition-all text-start flex items-center gap-4 ${
                          selectedMode === "block"
                            ? "border-[#8B9DFF] bg-indigo-50/30"
                            : "border-gray-100 bg-white"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            selectedMode === "block"
                              ? "border-[#8B9DFF]"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedMode === "block" && (
                            <div className="w-3.5 h-3.5 rounded-full bg-[#8B9DFF] shadow-sm animate-in zoom-in duration-300" />
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="block text-lg font-bold text-[#0E3C42]">
                            En bloque
                          </span>
                          <span className="text-sm text-gray-500 font-medium leading-relaxed">
                            Responde una sola vez y tu voto aplicará a todas tus
                            Representaciones.
                          </span>
                        </div>
                      </button>
                    </div>

                    <button
                      disabled={!selectedMode}
                      onClick={() => {
                        setMode(selectedMode);
                        if (onSetVotingPreference)
                          onSetVotingPreference(selectedMode);
                      }}
                      className={`w-full py-5 rounded-[24px] font-bold text-lg transition-all shadow-xl active:scale-[0.98] ${
                        selectedMode
                          ? "bg-[#8B9DFF] text-white shadow-[#8B9DFF]/20"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                      }`}
                    >
                      Continuar
                    </button>
                  </div>
                )}

                {mode != "select" && (
                  <div className="bg-white px-8 pt-6 pb-4 shrink-0 relative border-b border-gray-50">
                    {/* Back Button (Only if deep in flow) */}
                    {mode !== "select" && activeRegistries.length > 1 && (
                      <button
                        onClick={() => setMode("select")}
                        className="absolute right-6 top-6 w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-[#0E3C42] transition"
                      >
                        <ArrowLeft size={16} />
                      </button>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-indigo-50 text-[#8B9DFF] text-[10px] font-black uppercase px-2 py-1 rounded-md">
                        Pregunta
                      </div>
                      {votedCount > 0 && (
                        <span className="bg-orange-100 text-orange-600 text-[10px] font-black uppercase px-2 py-1 rounded-md">
                          Parcial ({votedCount}/{activeRegistries.length})
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-extrabold text-[#0E3C42] leading-tight">
                      {q.title}
                    </h3>
                  </div>
                )}
                {/* BLOCK VOTE MODE */}
                {mode === "block" && (
                  <div className="flex flex-col gap-3 py-2">
                    {(q.type === QUESTION_TYPES.UNIQUE ||
                      q.type === QUESTION_TYPES.YES_NO) && (
                      <>
                        {(q.type === QUESTION_TYPES.YES_NO
                          ? ["Sí", "No"]
                          : q.options
                        ).map((opt, i) => (
                          <button
                            key={i}
                            disabled={isSubmitting}
                            onClick={() => setBlockSelectedOption(opt)}
                            className={`w-full p-4 rounded-2xl border flex justify-between items-center group active:scale-[0.98] transition-all ${
                              blockSelectedOption === opt
                                ? "bg-indigo-50 border-[#8B9DFF]"
                                : "bg-white border-gray-100 hover:border-[#8B9FFD]"
                            }`}
                          >
                            <span className="font-bold text-[#0E3C42]">
                              {opt}
                            </span>
                            <div
                              className={`w-5 h-5 rounded-full border-2 transition-all ${
                                blockSelectedOption === opt
                                  ? "border-[#8B9DFF] bg-[#8B9DFF] flex items-center justify-center"
                                  : "border-gray-200"
                              }`}
                            >
                              {blockSelectedOption === opt && (
                                <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />
                              )}
                            </div>
                          </button>
                        ))}

                        <button
                          disabled={!blockSelectedOption || isSubmitting}
                          onClick={() =>
                            submitBlockVote({ option: blockSelectedOption })
                          }
                          className={`w-full py-5 rounded-[24px] font-bold text-lg transition-all shadow-xl mt-4 active:scale-[0.98] ${
                            blockSelectedOption
                              ? "bg-[#8B9DFF] text-white shadow-[#8B9DFF]/20"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                          }`}
                        >
                          Votar
                        </button>
                      </>
                    )}

                    {q.type === QUESTION_TYPES.MULTIPLE && (
                      <>
                        {q.options.map((opt, i) => (
                          <label
                            key={i}
                            className={`flex items-center gap-3 p-4 rounded-2xl border bg-white cursor-pointer transition-all ${
                              blockSelectedOptions.includes(opt)
                                ? "border-[#8B9DFF] ring-1 ring-[#8B9DFF]"
                                : "border-gray-100"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={blockSelectedOptions.includes(opt)}
                              onChange={() => toggleBlockOption(opt)}
                            />
                            <div
                              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                                blockSelectedOptions.includes(opt)
                                  ? "bg-[#8B9DFF] border-[#8B9DFF]"
                                  : "border-gray-200"
                              }`}
                            >
                              {blockSelectedOptions.includes(opt) && (
                                <Check size={14} className="text-white" />
                              )}
                            </div>
                            <span className="font-bold text-[#0E3C42] text-sm">
                              {opt}
                            </span>
                          </label>
                        ))}
                        <button
                          disabled={
                            blockSelectedOptions.length === 0 || isSubmitting
                          }
                          onClick={() =>
                            submitBlockVote({ options: blockSelectedOptions })
                          }
                          className="w-full bg-[#0E3C42] text-white font-bold py-4 rounded-2xl mt-2 mt-auto"
                        >
                          Confirmar Voto
                        </button>
                      </>
                    )}

                    {q.type === QUESTION_TYPES.OPEN && (
                      <>
                        <textarea
                          placeholder="Escribe tu respuesta..."
                          className="w-full bg-white border border-gray-200 rounded-2xl p-4 outline-none focus:border-[#8B9DFF] min-h-[120px]"
                          value={blockOpenAnswer}
                          onChange={(e) => setBlockOpenAnswer(e.target.value)}
                        />
                        <button
                          disabled={!blockOpenAnswer.trim() || isSubmitting}
                          onClick={() =>
                            submitBlockVote({ answerText: blockOpenAnswer })
                          }
                          className="w-full bg-[#0E3C42] text-white font-bold py-4 rounded-2xl mt-4"
                        >
                          Enviar Respuesta
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* INDIVIDUAL VOTE MODE */}
                {mode === "individual" && (
                  <div className="space-y-4 pb-20">
                    {activeRegistries.map((reg) => {
                      const savedVote = individualVotes[reg.id];
                      const label = reg.tipo
                        ? `${reg.tipo} - ${reg.propiedad}`
                        : reg.propiedad;

                      return (
                        <div
                          key={reg.id}
                          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
                        >
                          <h4 className="font-extrabold text-[#0E3C42] mb-3 text-sm flex items-center gap-2 border-b border-gray-50 pb-2">
                            <span className="w-2 h-2 rounded-full bg-[#8B9DFF]"></span>
                            {label}
                          </h4>

                          {q.type === QUESTION_TYPES.UNIQUE ||
                          q.type === QUESTION_TYPES.YES_NO ? (
                            <div className="flex flex-col gap-2">
                              {(q.type === QUESTION_TYPES.YES_NO
                                ? ["Sí", "No"]
                                : q.options
                              ).map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() =>
                                    setIndividualVote(reg.id, { option: opt })
                                  }
                                  className={`w-full p-3 rounded-xl border text-sm font-bold flex items-center justify-between transition-all ${
                                    savedVote?.option === opt
                                      ? "bg-[#E0E7FF] border-[#8B9DFF] text-[#0E3C42]"
                                      : "bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100"
                                  }`}
                                >
                                  {opt}
                                  {savedVote?.option === opt && (
                                    <div className="w-2 h-2 rounded-full bg-[#8B9DFF]"></div>
                                  )}
                                </button>
                              ))}
                            </div>
                          ) : q.type === QUESTION_TYPES.MULTIPLE ? (
                            <div className="flex flex-col gap-2">
                              {q.options.map((opt) => {
                                const isSelected =
                                  savedVote?.options?.includes(opt);
                                return (
                                  <label
                                    key={opt}
                                    className={`w-full p-3 rounded-xl border text-sm font-bold flex items-center gap-3 transition-all cursor-pointer ${
                                      isSelected
                                        ? "bg-[#E0E7FF] border-[#8B9DFF] text-[#0E3C42]"
                                        : "bg-gray-50 border-transparent text-gray-500"
                                    }`}
                                  >
                                    <div
                                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                                        isSelected
                                          ? "bg-[#8B9DFF] border-[#8B9DFF]"
                                          : "border-gray-300 bg-white"
                                      }`}
                                    >
                                      {isSelected && (
                                        <Check
                                          size={10}
                                          className="text-white"
                                        />
                                      )}
                                    </div>
                                    <input
                                      type="checkbox"
                                      className="hidden"
                                      checked={isSelected || false}
                                      onChange={() => {
                                        const current =
                                          savedVote?.options || [];
                                        const next = current.includes(opt)
                                          ? current.filter((o) => o !== opt)
                                          : [...current, opt];
                                        setIndividualVote(reg.id, {
                                          options: next,
                                        });
                                      }}
                                    />
                                    {opt}
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <textarea
                              placeholder="Tu respuesta..."
                              className="w-full bg-gray-50 rounded-xl p-3 text-sm min-h-[80px]"
                              value={savedVote?.answerText || ""}
                              onChange={(e) =>
                                setIndividualVote(reg.id, {
                                  answerText: e.target.value,
                                })
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer for Individual Mode (Button) */}
              {mode === "individual" && (
                <div className="p-6 bg-white border-t border-gray-50 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
                  <button
                    onClick={submitIndividualVotes}
                    disabled={
                      Object.keys(individualVotes).length <
                        activeRegistries.length || isSubmitting
                    }
                    className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                      Object.keys(individualVotes).length <
                      activeRegistries.length
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-[#8B9DFF] hover:bg-[#788ce0] text-white shadow-lg shadow-indigo-200"
                    }`}
                  >
                    {isSubmitting ? "Enviando..." : "Votar"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

// --- MAIN PAGE ---

export default function AssemblyAccessPage() {
  const { id } = useParams();
  const router = useRouter();

  // Basic State
  const [loading, setLoading] = useState(true);
  const [assembly, setAssembly] = useState(null);
  const [entity, setEntity] = useState(null);
  const [registries, setRegistries] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [userVotingPreference, setUserVotingPreference] = useState(null);

  // New Registration Wizard State Machine
  // 0: Search/Login
  // 1: Discovery (List Found)
  // 2: Verification Loop (By Index)
  // 3: Ask "Add Another?"
  // 4: Add Property Form
  // 5: Summary
  // 6: Terms
  const [regStep, setRegStep] = useState(0);

  // Data State
  const [regDocument, setRegDocument] = useState("");
  const [userInfo, setUserInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  // Queue for verifying properties found in step 1
  const [verificationQueue, setVerificationQueue] = useState([]);
  const [currentVerificationIndex, setCurrentVerificationIndex] = useState(0);

  // Final List of verified properties to submit
  // Item: { registry, role, powerFile, powerUrl }
  const [verifiedRegistries, setVerifiedRegistries] = useState([]);

  // Temp State for Verification Loop
  const [currentRole, setCurrentRole] = useState(""); // "" | 'owner' | 'proxy'
  const [currentFile, setCurrentFile] = useState(null);

  // Temp State for "Add Another?" Step
  const [addAnotherDecision, setAddAnotherDecision] = useState(null); // 'yes' | 'no'

  // Temp State for "Add Property Form"
  const [addPropType, setAddPropType] = useState("");
  const [addPropGroup, setAddPropGroup] = useState("");
  const [addPropRegistry, setAddPropRegistry] = useState(null);
  const [addPropRole, setAddPropRole] = useState("");
  const [addPropFile, setAddPropFile] = useState(null);

  // Load User & Data
  // Load User & Data - REMOVED PERSISTENCE
  /* useEffect(() => {
    const savedUser = localStorage.getItem(`assemblyUser_${id}`);
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, [id]); */

  // Check if user is blocked/deleted
  useEffect(() => {
    if (currentUser && registries.length > 0) {
      // Find my registries in the live list
      const myLiveRegistries = registries.filter(
        (r) =>
          currentUser.registries?.some((ur) => ur.registryId === r.id) ||
          (currentUser.registryId && r.id === currentUser.registryId),
      );

      // If I have registries but they are ALL deleted, kick me out.
      // Or if I have NO registries found (which shouldn't happen unless deleted entirely from DB)
      if (myLiveRegistries.length > 0) {
        const allDeleted = myLiveRegistries.every((r) => r.isDeleted);
        if (allDeleted) {
          toast.error("Has sido bloqueado de esta asamblea.");
          localStorage.removeItem(`assemblyUser_${id}`);
          setCurrentUser(null);
          setRegStep(0);
        }
      }
    }
  }, [registries, currentUser, id]);

  useEffect(() => {
    let unsubDetails = () => {};
    let unsubQuestions = () => {};

    const assemblyRef = doc(db, "assembly", id);
    const unsubAssembly = onSnapshot(assemblyRef, async (docSnap) => {
      if (docSnap.exists()) {
        const assemblyData = { id: docSnap.id, ...docSnap.data() };
        setAssembly(assemblyData);

        // If assembly is back to create mode (restarted), kick users out
        if (assemblyData.status === "create" && currentUser) {
          toast.info("La asamblea ha sido reiniciada.");
          localStorage.removeItem(`assemblyUser_${id}`);
          window.location.reload();
        }

        if (assemblyData.entityId) {
          const resEntity = await getEntityById(assemblyData.entityId);
          if (resEntity.success) {
            setEntity(resEntity.data);
            if (resEntity.data.assemblyRegistriesListId) {
              const listRef = doc(
                db,
                "assemblyRegistriesList",
                resEntity.data.assemblyRegistriesListId,
              );
              unsubDetails = onSnapshot(listRef, (listSnap) => {
                if (listSnap.exists()) {
                  const regs = Object.entries(
                    listSnap.data().assemblyRegistries || {},
                  ).map(([key, val]) => ({
                    id: key,
                    ...val,
                  }));
                  setRegistries(regs);
                }
              });
            }
          }
        }

        // Questions
        if (assemblyData.questions && assemblyData.questions.length > 0) {
          const qRef = collection(db, "question");
          unsubQuestions = onSnapshot(qRef, (qSnap) => {
            const qList = qSnap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter(
                (q) =>
                  assemblyData.questions.includes(q.id) &&
                  !q.isDeleted &&
                  (q.status === QUESTION_STATUS.LIVE ||
                    q.status === QUESTION_STATUS.FINISHED),
              );
            setQuestions(qList);
          });
        }
      } else {
        toast.error("Asamblea no encontrada");
      }
      setLoading(false);
    });

    return () => {
      unsubAssembly();
      unsubDetails();
      unsubQuestions();
    };
  }, [id]);

  /* --- HANDLERS --- */

  const handleAccess = async (document) => {
    if (assembly.status === "create") {
      return toast.info("Podrá ingresar cuando la reunión esté en curso");
    }

    setLoading(true);

    try {
      // 1. Check if user exists in AssemblyUser (Already Registered)
      const res = await getAssemblyUser(document, id);
      if (res.success) {
        // User exists -> Login
        setCurrentUser(res.data);
        localStorage.setItem(`assemblyUser_${id}`, JSON.stringify(res.data));
        toast.success("Bienvenido");
        setLoading(false);
        return;
      }

      // 2. User does NOT exist.
      // Check if registration is closed (registries_finalized).
      if (assembly.status === "registries_finalized") {
        setLoading(false);
        return toast.error(
          "El registro ha finalizado. Solo pueden ingresar usuarios registrados.",
        );
      }

      // 3. User does NOT exist AND Registration is Open. -> START REGISTRATION FLOW.
      setRegDocument(document);

      // Find all registries matching document in the uploaded Excel list
      const found = registries.filter(
        (r) =>
          String(r.documento).trim().toLowerCase() ===
          document.trim().toLowerCase(),
      );

      // ACCESS METHOD: 'free_document' vs 'database_document'
      const accessMethod = assembly.accessMethod || "database_document";

      // 3a. Validation for 'database_document'
      if (accessMethod === "database_document") {
        if (found.length === 0) {
          setLoading(false);
          return toast.error("Documento no asociado a ninguna propiedad.");
        }
        // Blocked check
        if (found.every((r) => r.isDeleted)) {
          setLoading(false);
          return toast.error("Estas bloqueado de esta asamblea");
        }
      } else {
        // 'free_document' blocked check
        if (found.length > 0 && found.every((r) => r.isDeleted)) {
          setLoading(false);
          return toast.error("Estas bloqueado de esta asamblea");
        }
      }

      // 3b. Check if properties are ALREADY CLAIMED by someone else
      // If ANY property associated with this document is already claimed (registerInAssembly === true)
      // and the current user trying to register is NOT the one who claimed it (checked by step 1),
      // we block them.
      const alreadyRegisteredProps = found.filter(
        (r) => r.registerInAssembly === true,
      );
      if (alreadyRegisteredProps.length > 0) {
        setLoading(false);
        return toast.error(
          "Una o más propiedades de este documento ya fueron registradas por otro usuario. Comuníquese con soporte.",
        );
      }

      // 3c. Prepare Verification Queue (Unclaimed valid properties)
      const availableToRegister = found.filter(
        (r) => !r.registerInAssembly && !r.isDeleted,
      );

      // Double check for database_document: must have items
      if (
        accessMethod === "database_document" &&
        availableToRegister.length === 0
      ) {
        setLoading(false);
        // This usually falls into "alreadyRegisteredProps" check above, but logically ensures we don't proceed with empty queue
        return toast.error(
          "No hay propiedades disponibles para registrar con este documento.",
        );
      }

      setVerificationQueue(availableToRegister);
      setVerifiedRegistries([]);
      setCurrentVerificationIndex(0);

      // Pre-fill info if available
      if (availableToRegister[0]) {
        setUserInfo((prev) => ({
          ...prev,
          firstName:
            availableToRegister[0].firstName ||
            availableToRegister[0].nombre ||
            "",
          lastName:
            availableToRegister[0].lastName ||
            availableToRegister[0].apellido ||
            "",
          email: availableToRegister[0].email || "",
          phone: availableToRegister[0].celular || "",
        }));
      } else {
        setUserInfo({ firstName: "", lastName: "", email: "", phone: "" });
      }

      // Determine Next Step
      if (
        assembly.requireFullName ||
        assembly.requireEmail ||
        assembly.requirePhone
      ) {
        setRegStep(1); // User Info
      } else {
        if (availableToRegister.length === 0) {
          // Free document with no matching properties -> Manual Add
          setRegStep(5);
        } else {
          setCurrentRole("");
          setRegStep(2); // Discovery
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Error al verificar acceso");
    } finally {
      setLoading(false);
    }
  };

  // STEP 1 Handler (User Info Submit)
  const handleUserInfoSubmit = () => {
    if (assembly.requireFullName && (!userInfo.firstName || !userInfo.lastName))
      return toast.error("Nombre y apellido son requeridos");
    if (assembly.requireEmail && !userInfo.email)
      return toast.error("Email es requerido");
    if (assembly.requirePhone && !userInfo.phone)
      return toast.error("Teléfono es requerido");

    // If we have properties to verify, go to Discovery(2)
    // If not, it means we are in free_document mode and need to add manually(5)
    if (verificationQueue.length > 0) {
      setRegStep(2); // Go to Discovery
    } else {
      setRegStep(5); // Go to Manual Add
    }
  };

  // STEP 2 -> 3 (Was 1 -> 2)
  const startVerificationLoop = () => {
    if (verificationQueue.length >= 2) {
      // Auto-verify all as owner
      const items = verificationQueue.map((reg) => ({
        registry: reg,
        role: "owner",
        powerFile: null,
        isManual: false,
      }));
      setVerifiedRegistries(items);
      checkAddAnotherConditions();
    } else {
      setCurrentVerificationIndex(0);
      setCurrentRole("");
      setCurrentFile(null);
      setRegStep(3);
    }
  };

  // STEP 3 Handler (Next Property) logic...

  // STEP 2 Handler (Next Property)
  const confirmCurrentVerification = () => {
    const currentReg = verificationQueue[currentVerificationIndex];
    if (currentRole === "proxy" && !currentFile) {
      // Optional file? Description says "no es obligatorio".
      // OK to proceed.
    }

    const newItem = {
      registry: currentReg,
      role: currentRole,
      powerFile: currentFile,
      isManual: false,
    };

    setVerifiedRegistries((prev) => [...prev, newItem]);

    // Check if more
    if (currentVerificationIndex < verificationQueue.length - 1) {
      // Next
      setCurrentVerificationIndex((prev) => prev + 1);
      setCurrentRole("owner");
      setCurrentFile(null);
    } else {
      // Done with queue
      checkAddAnotherConditions();
    }
  };

  const checkAddAnotherConditions = () => {
    // Check Config Limts
    // If canAddOtherRepresentatives is false -> Skip to Summary
    if (assembly.canAddOtherRepresentatives === false) {
      return setRegStep(6); // Summary (shifted)
    }

    // If powerLimit is set and reached -> Skip to Summary
    if (
      assembly.powerLimit &&
      verifiedRegistries.length >= parseInt(assembly.powerLimit)
    ) {
      return setRegStep(6);
    }

    setRegStep(4); // Ask Add Another
  };

  // STEP 4 Handler (Answer Yes/No) (Was 3)
  const handleAddAnotherDecision = () => {
    if (addAnotherDecision === "yes") {
      // Reset add form and go to 5 (Was 4)
      setAddPropType("");
      setAddPropRegistry(null);
      setAddPropRole("owner");
      setAddPropFile(null);
      setRegStep(5);
    } else if (addAnotherDecision === "no") {
      setRegStep(6); // Summary (Was 5)
    } else {
      toast.error("Selecciona una opción");
    }
  };

  // STEP 5 Handler (Confirm Manual Add) (Was 4)
  const confirmManualAdd = () => {
    if (!addPropRegistry) return toast.error("Selecciona una propiedad");
    // Check duplicate
    if (verifiedRegistries.some((r) => r.registry.id === addPropRegistry.id)) {
      return toast.error("Esta propiedad ya está en tu lista");
    }

    const newItem = {
      registry: addPropRegistry,
      role: addPropRole,
      powerFile: addPropFile,
      isManual: true,
    };

    setVerifiedRegistries((prev) => [...prev, newItem]);

    setRegStep(6); // Summary (Was 5)
  };

  const removeVerifiedItem = (index) => {
    const item = verifiedRegistries[index];
    if (item && !item.isManual) {
      return toast.error(
        "No puedes eliminar una propiedad identificada por tu documento.",
      );
    }
    const updated = verifiedRegistries.filter((_, i) => i !== index);
    setVerifiedRegistries(updated);
  };

  // --- HELPERS ---
  const alphanumericSort = (a, b) => {
    return a.toString().localeCompare(b.toString(), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  };

  // derived for manual add
  const availableTypes = useMemo(() => {
    const availableRegs = registries.filter((r) => !r.registerInAssembly);
    const types = new Set(availableRegs.map((r) => r.tipo || "Otro"));
    return Array.from(types).sort(alphanumericSort);
  }, [registries]);

  const hasMultipleTypes = useMemo(
    () => availableTypes.length > 1,
    [availableTypes],
  );
  const currentSingleType = useMemo(
    () => (!hasMultipleTypes ? availableTypes[0] : null),
    [hasMultipleTypes, availableTypes],
  );

  useEffect(() => {
    if (!hasMultipleTypes && currentSingleType) {
      setAddPropType(currentSingleType);
    }
  }, [hasMultipleTypes, currentSingleType]);

  const availableGroups = useMemo(() => {
    const typeToUse = addPropType || currentSingleType;
    if (!typeToUse) return [];
    const availableRegs = registries.filter(
      (r) => !r.registerInAssembly && (r.tipo || "Otro") === typeToUse,
    );

    const groupsSet = new Set(
      availableRegs.map((r) => r.grupo).filter((g) => g && g !== "-"),
    );

    // Check if there are properties without group
    const hasEmptyGroup = availableRegs.some(
      (r) => !r.grupo || r.grupo === "-",
    );

    const sortedGroups = Array.from(groupsSet).sort(alphanumericSort);
    if (hasEmptyGroup) {
      sortedGroups.push("Sin grupo");
    }

    return sortedGroups;
  }, [addPropType, currentSingleType, registries]);

  const filteredProperties = useMemo(() => {
    const typeToUse = addPropType || currentSingleType;
    if (!typeToUse) return [];
    return registries
      .filter((r) => {
        if (r.registerInAssembly) return false;
        const rType = r.tipo || "Otro";
        if (rType !== typeToUse) return false;

        if (addPropGroup) {
          if (addPropGroup === "Sin grupo") {
            return !r.grupo || r.grupo === "-";
          }
          return r.grupo === addPropGroup;
        }

        return true;
      })
      .sort((a, b) => alphanumericSort(a.propiedad, b.propiedad));
  }, [addPropType, addPropGroup, currentSingleType, registries]);

  // FINAL SUBMIT (Step 6)
  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      // 1. Upload files
      const finalRegistries = await Promise.all(
        verifiedRegistries.map(async (item) => {
          let url = null;
          if (item.powerFile) {
            const fileRef = ref(
              storage,
              `powers/${id}/${regDocument}/${item.registry.id}_${Date.now()}`,
            );
            await uploadBytes(fileRef, item.powerFile);
            url = await getDownloadURL(fileRef);
          }
          return {
            registryId: item.registry.id,
            role: item.role,
            powerUrl: url,
            propiedad: item.registry.propiedad,
            coeficiente: item.registry.coeficiente,
            regDocument: item.registry.documento, // original doc in registry
          };
        }),
      );

      const mainRegistry = verifiedRegistries[0]?.registry;

      const userData = {
        assemblyId: id,
        document: regDocument,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        email: userInfo.email,
        phone: userInfo.phone,
        registries: finalRegistries,
        registryId: mainRegistry?.id,
        role: "Asambleista",
      };

      const res = await createAssemblyUser(userData);

      if (res.success) {
        if (entity?.assemblyRegistriesListId) {
          await Promise.all(
            finalRegistries.map((r) =>
              updateRegistryStatus(
                entity.assemblyRegistriesListId,
                r.registryId,
                true,
                {
                  ...userData,
                  powerUrl: r.powerUrl,
                  role: r.role,
                },
              ),
            ),
          );
        }

        const fullUser = { ...userData, id: res.id };
        setCurrentUser(fullUser);
        // localStorage.setItem(`assemblyUser_${id}`, JSON.stringify(fullUser));
        toast.success("Registro completado");
        setRegStep(0);
      } else {
        toast.error("Error al crear usuario");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error en el proceso");
    }
    setLoading(false);
  };

  /* --- RENDER --- */

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  if (!assembly)
    return <div className="p-10 text-center">Asamblea no encontrada</div>;

  // DASHBOARD
  if (currentUser) {
    const userRegistryIds = (currentUser.registries || []).map(
      (r) => r.registryId,
    );
    if (
      currentUser.registryId &&
      !userRegistryIds.includes(currentUser.registryId)
    ) {
      userRegistryIds.push(currentUser.registryId);
    }
    const myRegistries = registries.filter(
      (r) => userRegistryIds.includes(r.id) && !r.isDeleted,
    );
    const dashboardUser = { ...currentUser, myRegistries };

    return (
      <AsambleistaDashboard
        user={dashboardUser}
        assembly={assembly}
        entity={entity}
        registries={registries}
        questions={questions}
        userVotingPreference={userVotingPreference}
        onSetVotingPreference={setUserVotingPreference}
        onLogout={() => {
          localStorage.removeItem(`assemblyUser_${id}`);
          setCurrentUser(null);
          setRegStep(0);
        }}
        onJoinMeeting={() => {
          if (assembly?.meetLink)
            window.open(
              assembly.meetLink.includes("http")
                ? assembly.meetLink
                : `https://${assembly.meetLink}`,
              "_blank",
            );
          else toast.info("Link no disponible");
        }}
        renderQuestion={(q, extraProps = {}) => (
          <QuestionItem
            q={q}
            userRegistries={myRegistries}
            assembly={assembly}
            userVotingPreference={userVotingPreference}
            onSetVotingPreference={setUserVotingPreference}
            {...extraProps}
          />
        )}
      />
    );
  }

  // WIZARD START
  if (regStep === 0) {
    return (
      <AsambleistaLogin
        assembly={assembly}
        entity={entity}
        onLogin={handleAccess}
        loading={loading}
      />
    );
  }

  // WIZARD FRAME
  return (
    <div className="min-h-screen bg-[#F4F7F9] flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-sm min-h-[600px] flex flex-col relative overflow-hidden">
        {/* Header */}
        <div className="p-8 pb-4 flex items-center gap-4">
          <button
            onClick={() => setRegStep((prev) => Math.max(0, prev - 1))}
            className="p-2 hover:bg-gray-50 rounded-xl transition"
          >
            <ArrowLeft size={20} className="text-gray-400" />
          </button>
          <div className="flex-1">
            <ProgressBar currentStep={regStep} />
          </div>
          <div className="bg-indigo-50 text-[#8B9DFF] px-3 py-1 rounded-full text-xs font-bold">
            Paso {regStep} de 6
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="flex-1 px-12 py-4 overflow-y-auto">
          {/* STEP 1: USER INFO */}
          {regStep === 1 && (
            <div className="flex flex-col items-center animate-in fade-in slide-in-from-right-8 w-full max-w-lg mx-auto">
              <h2 className="text-2xl font-black text-[#0E3C42] mb-2">
                Ingresa tus datos
              </h2>
              <p className="text-gray-400 text-sm mb-8 text-center">
                Completa la información requerida para el registro.
              </p>

              <div className="w-full flex flex-col gap-4 mb-8">
                {assembly.requireFullName && (
                  <>
                    <div className="flex flex-col">
                      <label className="text-xs font-bold text-[#0E3C42] mb-1">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        placeholder="Escribe aquí tu nombre"
                        value={userInfo.firstName}
                        onChange={(e) =>
                          setUserInfo({
                            ...userInfo,
                            firstName: e.target.value,
                          })
                        }
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 outline-none focus:border-[#8B9DFF]"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-bold text-[#0E3C42] mb-1">
                        Apellido *
                      </label>
                      <input
                        type="text"
                        placeholder="Escribe aquí tu apellido"
                        value={userInfo.lastName}
                        onChange={(e) =>
                          setUserInfo({ ...userInfo, lastName: e.target.value })
                        }
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 outline-none focus:border-[#8B9DFF]"
                      />
                    </div>
                  </>
                )}
                {assembly.requireEmail && (
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-[#0E3C42] mb-1">
                      Correo electrónico *
                    </label>
                    <input
                      type="email"
                      placeholder="ejemplo@correo.com"
                      value={userInfo.email}
                      onChange={(e) =>
                        setUserInfo({ ...userInfo, email: e.target.value })
                      }
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 outline-none focus:border-[#8B9DFF]"
                    />
                  </div>
                )}
                {assembly.requirePhone && (
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-[#0E3C42] mb-1">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      placeholder="Número de contacto"
                      value={userInfo.phone}
                      onChange={(e) =>
                        setUserInfo({ ...userInfo, phone: e.target.value })
                      }
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 outline-none focus:border-[#8B9DFF]"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={handleUserInfoSubmit}
                className="w-full bg-[#8B9DFF] hover:bg-[#7a8ce0] text-white font-bold py-4 rounded-2xl shadow-lg transition-all"
              >
                Continuar
              </button>
            </div>
          )}

          {/* STEP 2: DISCOVERY (Was 1) */}
          {regStep === 2 && (
            <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-8">
              <h2 className="text-2xl font-black text-[#0E3C42] mb-2">
                Propiedades identificadas
              </h2>
              <p className="text-gray-400 text-sm mb-8">
                Vas a representar las siguientes propiedades:
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 mb-10 w-full">
                {verificationQueue.map((reg, i) => (
                  <PropertyCardSimple key={i} registry={reg} />
                ))}
              </div>

              <button
                onClick={startVerificationLoop}
                className="w-full max-w-md bg-[#8B9DFF] hover:bg-[#7a8ce0] text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 transition-all"
              >
                Continuar
              </button>
            </div>
          )}

          {/* STEP 3: VERIFICATION LOOP (Was 2) */}
          {regStep === 3 && verificationQueue[currentVerificationIndex] && (
            <div className="flex flex-col items-center animate-in fade-in slide-in-from-right-8 w-full max-w-xl mx-auto">
              <h2 className="text-2xl font-black text-[#0E3C42] mb-2">
                Propiedades identificadas
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                Vas a representar las siguientes propiedades:
              </p>

              {/* Active Card */}
              <div className="mb-8 scale-110 transform transition-all">
                <PropertyCardSimple
                  registry={verificationQueue[currentVerificationIndex]}
                />
              </div>

              <div className="w-full bg-white text-left">
                <h3 className="font-bold text-[#0E3C42] mb-4">
                  Seleccione su participación
                </h3>

                <div className="flex flex-col gap-3 mb-6">
                  <label
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      currentRole === "owner"
                        ? "border-[#8B9DFF] bg-indigo-50/20"
                        : "border-gray-100"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        currentRole === "owner"
                          ? "border-[#8B9DFF]"
                          : "border-gray-300"
                      }`}
                    >
                      {currentRole === "owner" && (
                        <div className="w-2.5 h-2.5 bg-[#8B9DFF] rounded-full" />
                      )}
                    </div>
                    <span className="text-[#0E3C42] font-bold text-sm">
                      Como propietario
                    </span>
                    <input
                      type="radio"
                      className="hidden"
                      checked={currentRole === "owner"}
                      onChange={() => setCurrentRole("owner")}
                    />
                  </label>

                  <label
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      currentRole === "proxy"
                        ? "border-[#8B9DFF] bg-indigo-50/20"
                        : "border-gray-100"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        currentRole === "proxy"
                          ? "border-[#8B9DFF]"
                          : "border-gray-300"
                      }`}
                    >
                      {currentRole === "proxy" && (
                        <div className="w-2.5 h-2.5 bg-[#8B9DFF] rounded-full" />
                      )}
                    </div>
                    <span className="text-[#0E3C42] font-bold text-sm">
                      Como apoderado
                    </span>
                    <input
                      type="radio"
                      className="hidden"
                      checked={currentRole === "proxy"}
                      onChange={() => setCurrentRole("proxy")}
                    />
                  </label>

                  {/* Proxy Upload */}
                  {currentRole === "proxy" &&
                    assembly.type !== "Presencial" && (
                      <div className="mt-2 animate-in slide-in-from-top-2 fade-in">
                        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-gray-50 relative hover:border-[#8B9DFF] transition-all group">
                          <UploadCloud
                            className="text-gray-300 mb-2 group-hover:text-[#8B9DFF]"
                            size={24}
                          />
                          <p className="text-xs text-gray-400 font-bold mb-1">
                            Carta poder (Opcional)
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {currentFile
                              ? currentFile.name
                              : "Click para subir (PDF, Word)"}
                          </p>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) =>
                              e.target.files[0] &&
                              setCurrentFile(e.target.files[0])
                            }
                          />
                        </div>
                      </div>
                    )}
                </div>

                <button
                  onClick={confirmCurrentVerification}
                  disabled={!currentRole}
                  className={`w-full font-bold py-4 rounded-2xl shadow-lg transition-all ${
                    !currentRole
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-[#8B9DFF] hover:bg-[#7a8ce0] text-white shadow-[#8B9FFD]/20"
                  }`}
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: ASK ADD ANOTHER (Was 3) */}
          {regStep === 4 && (
            <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-8 w-full max-w-xl mx-auto pt-8">
              <h2 className="text-2xl font-black text-[#0E3C42] mb-2">
                ¿Quieres añadir otra propiedad?
              </h2>
              <p className="text-gray-400 text-sm mb-8">
                Marca si vas a representar a otra propiedad.
              </p>

              <div className="w-full flex flex-col gap-3 mb-8">
                <label
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    addAnotherDecision === "yes"
                      ? "border-[#8B9DFF] bg-blue-50"
                      : "border-gray-100"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      addAnotherDecision === "yes"
                        ? "border-[#8B9DFF]"
                        : "border-gray-300"
                    }`}
                  >
                    {addAnotherDecision === "yes" && (
                      <div className="w-2.5 h-2.5 bg-[#8B9DFF] rounded-full" />
                    )}
                  </div>
                  <span className="text-[#0E3C42] font-bold text-sm">
                    Sí, tengo otra propiedad
                  </span>
                  <input
                    type="radio"
                    className="hidden"
                    checked={addAnotherDecision === "yes"}
                    onChange={() => setAddAnotherDecision("yes")}
                  />
                </label>

                <label
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    addAnotherDecision === "no"
                      ? "border-[#8B9DFF] bg-blue-50"
                      : "border-gray-100"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      addAnotherDecision === "no"
                        ? "border-[#8B9DFF]"
                        : "border-gray-300"
                    }`}
                  >
                    {addAnotherDecision === "no" && (
                      <div className="w-2.5 h-2.5 bg-[#8B9DFF] rounded-full" />
                    )}
                  </div>
                  <span className="text-[#0E3C42] font-bold text-sm">
                    No, no voy a representar otra
                  </span>
                  <input
                    type="radio"
                    className="hidden"
                    checked={addAnotherDecision === "no"}
                    onChange={() => setAddAnotherDecision("no")}
                  />
                </label>
              </div>

              <button
                onClick={handleAddAnotherDecision}
                className="w-full bg-[#8B9DFF] hover:bg-[#7a8ce0] text-white font-bold py-4 rounded-2xl shadow-lg transition-all"
              >
                Continuar
              </button>
            </div>
          )}

          {/* STEP 5: MANUAL ADD FORM (Was 4) */}
          {regStep === 5 && (
            <div className="flex flex-col animate-in fade-in slide-in-from-right-8 w-full max-w-xl mx-auto">
              <h2 className="text-2xl font-black text-[#0E3C42] mb-6 text-center">
                Añade la propiedad adicional
              </h2>

              <div className="flex flex-col gap-5">
                {hasMultipleTypes && (
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-[#8B9DFF] uppercase mb-1 ml-1">
                      Tipo de propiedad *
                    </label>
                    <div className="relative">
                      <select
                        value={addPropType}
                        onChange={(e) => {
                          setAddPropType(e.target.value);
                          setAddPropGroup("");
                          setAddPropRegistry(null);
                        }}
                        className="w-full bg-gray-50 border-none rounded-xl p-4 outline-none font-bold text-[#0E3C42] appearance-none"
                      >
                        <option value="">Selecciona el tipo</option>
                        {availableTypes.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* LOGIC BASED ON TYPE */}
                {(addPropType || (!hasMultipleTypes && currentSingleType)) && (
                  <>
                    {/* SHOW GROUP IF APARTAMENTO OR LOCAL OR IF THERE ARE GROUPS */}
                    {(["apartamento", "local"].includes(
                      (addPropType || currentSingleType).toLowerCase(),
                    ) ||
                      availableGroups.length > 0) &&
                      (addPropType || currentSingleType).toLowerCase() !==
                        "casa" && (
                        <div className="flex flex-col animate-in fade-in slide-in-from-top-2">
                          <label className="text-[10px] font-black text-[#8B9DFF] uppercase mb-1 ml-1">
                            Grupo / Torre / Bloque *
                          </label>
                          <div className="relative">
                            <select
                              value={addPropGroup}
                              onChange={(e) => {
                                setAddPropGroup(e.target.value);
                                setAddPropRegistry(null);
                              }}
                              className="w-full bg-gray-50 border-none rounded-xl p-4 outline-none font-bold text-[#0E3C42] appearance-none"
                            >
                              <option value="">Selecciona el grupo</option>
                              {availableGroups.map((g) => (
                                <option key={g} value={g}>
                                  {g}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                    {/* SHOW PROPERTY IF (CASA) OR (GROUP SELECTED) OR (NO GROUPS AVAILABLE) */}
                    {((addPropType || currentSingleType).toLowerCase() ===
                      "casa" ||
                      addPropGroup ||
                      availableGroups.length === 0) && (
                      <div className="flex flex-col animate-in fade-in slide-in-from-top-2">
                        <label className="text-[10px] font-black text-[#8B9DFF] uppercase mb-1 ml-1">
                          Número de propiedad *
                        </label>
                        <div className="relative">
                          <select
                            value={addPropRegistry?.id || ""}
                            onChange={(e) =>
                              setAddPropRegistry(
                                filteredProperties.find(
                                  (r) => r.id === e.target.value,
                                ),
                              )
                            }
                            className="w-full bg-gray-50 border-none rounded-xl p-4 outline-none font-bold text-[#0E3C42] appearance-none disabled:opacity-50"
                          >
                            <option value="">Selecciona el número</option>
                            {filteredProperties.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.propiedad}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Role Selection */}
                {addPropRegistry && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="mt-4">
                      <h3 className="font-bold text-[#0E3C42] mb-3">
                        Seleccione su participación
                      </h3>
                      <div className="flex flex-col gap-3">
                        <label
                          className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            addPropRole === "owner"
                              ? "border-[#8B9DFF] bg-indigo-50/20"
                              : "border-gray-100"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              addPropRole === "owner"
                                ? "border-[#8B9DFF]"
                                : "border-gray-300"
                            }`}
                          >
                            {addPropRole === "owner" && (
                              <div className="w-2.5 h-2.5 bg-[#8B9DFF] rounded-full" />
                            )}
                          </div>
                          <span className="text-[#0E3C42] font-bold text-sm">
                            Como propietario
                          </span>
                          <input
                            type="radio"
                            className="hidden"
                            checked={addPropRole === "owner"}
                            onChange={() => setAddPropRole("owner")}
                          />
                        </label>

                        <label
                          className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            addPropRole === "proxy"
                              ? "border-[#8B9DFF] bg-indigo-50/20"
                              : "border-gray-100"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              addPropRole === "proxy"
                                ? "border-[#8B9DFF]"
                                : "border-gray-300"
                            }`}
                          >
                            {addPropRole === "proxy" && (
                              <div className="w-2.5 h-2.5 bg-[#8B9DFF] rounded-full" />
                            )}
                          </div>
                          <span className="text-[#0E3C42] font-bold text-sm">
                            Como apoderado
                          </span>
                          <input
                            type="radio"
                            className="hidden"
                            checked={addPropRole === "proxy"}
                            onChange={() => setAddPropRole("proxy")}
                          />
                        </label>
                      </div>

                      {addPropRole === "proxy" &&
                        assembly.type !== "Presencial" && (
                          <div className="mt-4 animate-in fade-in">
                            <h3 className="font-bold text-[#0E3C42] mb-2 text-sm">
                              Carta poder
                            </h3>
                            <p className="text-xs text-gray-400 mb-3">
                              Sube la carta poder que te autoriza
                            </p>
                            <div className="border-2 border-dashed border-[#8B9DFF]/30 bg-indigo-50/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center relative hover:bg-indigo-50/40 transition-colors">
                              <div className="w-12 h-12 bg-[#8B9DFF] rounded-xl flex items-center justify-center text-white mb-3 shadow-md">
                                <FileText size={24} />
                              </div>
                              <p className="font-bold text-[#0E3C42] text-sm">
                                Arrastra y suelta aquí o
                              </p>
                              <div className="bg-[#8B9DFF] text-white text-xs font-bold px-4 py-1.5 rounded-full mt-2 mb-2">
                                Selecciona el archivo
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1">
                                {addPropFile
                                  ? addPropFile.name
                                  : "El archivo debe ser formato PDF, JPG o PNG"}
                              </p>
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.jpg,.png"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) =>
                                  e.target.files[0] &&
                                  setAddPropFile(e.target.files[0])
                                }
                              />
                            </div>
                          </div>
                        )}
                    </div>

                    <button
                      onClick={confirmManualAdd}
                      disabled={!addPropRegistry || !addPropRole}
                      className={`w-full font-bold py-4 rounded-2xl shadow-lg mt-8 transition-all ${
                        !addPropRegistry || !addPropRole
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-[#8B9DFF] hover:bg-[#7a8ce0] text-white shadow-lg shadow-indigo-100"
                      }`}
                    >
                      Continuar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: SUMMARY (Was 5) */}
          {regStep === 6 && (
            <div className="flex flex-col animate-in fade-in slide-in-from-right-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-[#0E3C42] mb-1">
                  Propiedades identificadas
                </h2>
                <p className="text-gray-400 text-sm">
                  Vas a representar las siguientes propiedades:
                </p>
              </div>

              <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm mb-6">
                <h3 className="font-bold text-[#0E3C42] mb-6">
                  Información personal
                </h3>
                <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm mb-8">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-[#8B9DFF] font-black text-xl">
                    {userInfo.firstName?.charAt(0) || "U"}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0E3C42]">
                      {userInfo.firstName} {userInfo.lastName}
                    </h4>
                    <p className="text-xs text-gray-400 font-bold">
                      Código de ingreso:{" "}
                      <span className="text-gray-600 font-normal">
                        {regDocument}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[#0E3C42]">Propiedades</h3>
                  <button className="text-xs border border-gray-200 rounded-lg px-3 py-1 text-gray-400">
                    Ordenar por
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {verifiedRegistries.map((item, i) => (
                    <div
                      key={i}
                      className="border border-gray-100 p-4 rounded-2xl flex items-center gap-4 relative group hover:border-blue-200 transition-colors bg-gray-50"
                    >
                      <div className="w-10 h-10 bg-indigo-50 text-[#8B9DFF] rounded-xl flex items-center justify-center shrink-0">
                        <Building2 size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-[#0E3C42] text-sm">
                          {item.registry.propiedad}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                              item.role === "owner"
                                ? "bg-cyan-50 text-cyan-600"
                                : "bg-purple-50 text-purple-600"
                            }`}
                          >
                            {item.role === "owner"
                              ? "Propietario"
                              : "Apoderado"}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Coef: <strong>{item.registry.coeficiente}%</strong>
                          </span>
                        </div>
                      </div>
                      {item.isManual && (
                        <button
                          onClick={() => removeVerifiedItem(i)}
                          className="absolute top-2 right-2 p-1.5 bg-white text-gray-300 hover:text-red-500 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all border border-gray-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {/* Simple Badge for file */}
                      {item.powerFile && (
                        <div className="absolute bottom-2 right-2 text-gray-300">
                          <FileText size={14} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add another button */}
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => {
                      // Reset manual add and go to 4
                      setAddPropType("");
                      setAddPropRegistry(null);
                      setAddPropRole("owner");
                      setAddPropFile(null);
                      setRegStep(5); // Was 4
                    }}
                    className="border border-[#0E3C42] text-[#0E3C42] font-bold py-3 px-8 rounded-full text-sm hover:bg-gray-50 transition-all"
                  >
                    Añadir otra propiedad
                  </button>
                </div>
              </div>

              <button
                onClick={() => setRegStep(7)} // Terms is now 7
                className="w-full bg-[#8B9DFF] hover:bg-[#7a8ce0] text-white font-bold py-5 rounded-2xl shadow-lg transition-all"
              >
                Continuar
              </button>
            </div>
          )}

          {/* STEP 7: TERMS (Was 6) */}
          {regStep === 7 && (
            <div className="flex flex-col items-center text-center animate-in zoom-in duration-300 pt-10">
              <div className="w-24 h-24 bg-green-50 text-green-500 rounded-3xl flex items-center justify-center mb-8">
                <Check size={48} strokeWidth={4} />
              </div>

              <h2 className="text-3xl font-black text-[#0E3C42] mb-4">
                Términos y condiciones
              </h2>

              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-left mb-8 max-h-[200px] overflow-y-auto leading-relaxed text-sm text-gray-500 w-full max-w-lg">
                <p>
                  Al confirmar, declaras que toda la información suministrada es
                  veraz y corresponde a la realidad. Aceptas el tratamiento de
                  datos personales conforme a la política vigente para el
                  desarrollo de esta asamblea. El uso indebido de la identidad
                  de un propietario será sancionado.
                </p>
              </div>

              <button
                onClick={handleFinalSubmit}
                disabled={loading}
                className="w-full max-w-md bg-[#8B9DFF] hover:bg-[#7a8ce0] text-white font-bold py-5 rounded-2xl shadow-xl transition-all"
              >
                {loading ? "Procesando..." : "Aceptar e Ingresar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
