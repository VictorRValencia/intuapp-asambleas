import React from "react";
import {
  Play,
  RotateCcw as RefreshCw,
  Check,
  X,
  Edit2,
  Trash2,
  FileText,
} from "lucide-react";
import Button from "@/components/basics/Button";

export const QUESTION_STATUS = {
  CREATED: "CREATED",
  LIVE: "LIVE",
  CANCELED: "CANCELED",
  FINISHED: "FINISHED",
};

export const QUESTION_TYPES = {
  MULTIPLE: "MULTIPLE",
  UNIQUE: "UNIQUE",
  YES_NO: "YES_NO",
  OPEN: "OPEN",
};

const QuestionCard = ({
  q,
  registries = [],
  isAdmin = false,
  onEdit,
  onDelete,
  onToggleStatus,
  onCancel,
  onViewVoters,
}) => {
  const parseCoef = (val) =>
    parseFloat(String(val || 0).replace(",", ".")) || 0;

  // Total Coefficient of ALL properties (Registered + Not Registered)
  const totalCoef = registries.reduce(
    (acc, r) => acc + parseCoef(r.coeficiente),
    0,
  );

  const answers = q.answers || {};
  const votersIds = Object.keys(answers);
  const totalVotedCoef = votersIds.reduce((acc, regId) => {
    const reg = registries.find((r) => r.id === regId);
    return acc + parseCoef(reg?.coeficiente);
  }, 0);
  const totalVotesCount = votersIds.length;

  // Quorum: Based on TOTAL Coefficient (Voted Coef / Total Coef)
  const quorumVoting = totalCoef > 0 ? (totalVotedCoef / totalCoef) * 100 : 0;

  const shouldShowResults = isAdmin || q.status === QUESTION_STATUS.FINISHED;

  return (
    <div className="bg-white rounded-[24px] p-8 border border-gray-100 shadow-sm relative overflow-hidden font-primary group">
      {/* Top Decorative Line */}
      <div className="absolute top-0 left-0 w-full h-[6px] bg-[#D1D8FF]"></div>

      <div className="flex justify-between items-start mb-4">
        <h4 className="text-[20px] font-bold text-[#0E3C42] max-w-xl leading-tight">
          {q.title}
        </h4>
        {isAdmin && (
          <button
            onClick={() => onEdit?.(q)}
            className="w-9 h-9 bg-[#94A2FF] text-white rounded-full flex items-center justify-center hover:bg-[#8391ff] transition shadow-lg shrink-0"
          >
            <Edit2 size={16} fill="white" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mb-8">
        {shouldShowResults ? (
          <div className="flex items-center gap-2">
            <p className="text-[16px] font-bold text-[#3D3D3D]">
              Quórum de votación: {totalVotedCoef.toFixed(2)}%
            </p>
            <div className="w-5 h-5 rounded-full bg-[#0E3C42] text-white flex items-center justify-center text-[10px] font-black">
              !
            </div>
          </div>
        ) : (
          <div></div>
        )}

        <div className="flex items-center gap-4">
          <span
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-2 ${
              q.status === QUESTION_STATUS.CREATED
                ? "bg-[#FFF2E5] text-[#C53F00]"
                : q.status === QUESTION_STATUS.LIVE
                  ? "bg-[#D1F7F9] text-[#1F6C72]"
                  : q.status === QUESTION_STATUS.CANCELED
                    ? "bg-[#FFEFEB] text-[#BF1D08]"
                    : "bg-[#F3F4FB] text-[#636b77]"
            }`}
          >
            {q.status === QUESTION_STATUS.LIVE && (
              <FileText size={12} className="fill-[#1F6C72]/20" />
            )}
            {q.status === QUESTION_STATUS.CANCELED && (
              <X size={12} strokeWidth={3} />
            )}
            {q.status === QUESTION_STATUS.CREATED
              ? "Sin iniciar"
              : q.status === QUESTION_STATUS.LIVE
                ? "Votación activa"
                : q.status === QUESTION_STATUS.CANCELED
                  ? "Votación cancelada"
                  : "Finalizada"}
          </span>
          {isAdmin &&
            (q.status === QUESTION_STATUS.LIVE ||
              q.status === QUESTION_STATUS.FINISHED ||
              q.status === QUESTION_STATUS.CANCELED) && (
              <button
                onClick={() => onViewVoters?.(q)}
                className="text-[#6372FF] font-bold text-sm underline underline-offset-2 hover:text-indigo-800 transition"
              >
                Ver votantes
              </button>
            )}
        </div>
      </div>

      {shouldShowResults && (
        <div className="grid grid-cols-1 gap-6 mb-8 border border-[#F5F5F5] rounded-[20px] p-6 bg-white shadow-inner shadow-zinc-50/50">
          {q.type !== QUESTION_TYPES.OPEN ? (
            q.options?.map((opt, i) => {
              const isCreated = q.status === QUESTION_STATUS.CREATED;

              const votesForOpt = Object.entries(answers).filter(([_, a]) => {
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
              });

              const votesForOptCount = votesForOpt.length;
              const votesForOptCoef = votesForOpt.reduce((acc, [regId, _]) => {
                const reg = registries.find((r) => r.id === regId);
                return acc + parseCoef(reg?.coeficiente);
              }, 0);

              const displayPercentage = votesForOptCoef.toFixed(2);
              const barWidth =
                totalVotedCoef > 0
                  ? (votesForOptCoef / totalVotedCoef) * 100
                  : 0;

              return (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <span className="font-bold text-[#5F5F5F] text-[15px]">
                      {opt}
                    </span>
                    {!isCreated && (
                      <span className="text-[14px] font-bold text-[#333]">
                        {displayPercentage}% ({votesForOptCount} votos)
                      </span>
                    )}
                  </div>
                  <div
                    className={`w-full h-3 rounded-full overflow-hidden relative ${isCreated ? "bg-[#F5F5F5]" : "bg-[#F2F4F7]"}`}
                  >
                    {!isCreated && (
                      <div
                        className="h-full bg-[#1F6B6C] transition-all duration-700 ease-out rounded-full"
                        style={{ width: `${barWidth}%` }}
                      ></div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full font-bold">
              <p className="text-xs font-black text-gray-400 uppercase mb-4 tracking-wider">
                Respuestas de texto:
              </p>
              <div className="flex flex-col gap-3">
                {Object.values(answers).map((a, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-[#0E3C42] font-medium leading-relaxed"
                  >
                    &ldquo;{a.answerText || a.option}&rdquo;
                  </div>
                ))}
                {Object.keys(answers).length === 0 && (
                  <p className="text-sm text-gray-400 italic font-medium px-2">
                    No hay respuestas aún
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {shouldShowResults &&
        (q.status === QUESTION_STATUS.LIVE ||
          q.status === QUESTION_STATUS.FINISHED) && (
          <div className="mb-8 flex items-center gap-3 bg-[#EEF2FF] p-4 rounded-xl border border-[#E0E7FF] text-[#0E3C42]">
            <div className="w-5 h-5 rounded-full bg-[#0E3C42] text-white flex items-center justify-center">
              <span className="text-[12px] font-black italic">i</span>
            </div>
            <p className="text-[12px] font-bold opacity-90">
              Resultados calculados sobre el 100% de la entidad, no en
              porcentajes reescalados.
            </p>
          </div>
        )}

      {q.status === QUESTION_STATUS.CANCELED && (
        <div className="mb-8 flex items-center gap-3 bg-[#FFEFEB] p-4 rounded-xl border border-[#FFDAD3] text-[#BF1D08]">
          <div className="w-5 h-5 rounded-md bg-[#BF1D08] text-white flex items-center justify-center rotate-45 shrink-0">
            <span className="text-[10px] font-black -rotate-45">!</span>
          </div>
          <p className="text-[12px] font-black">
            Esta votación fue cancelada y los votos no serán tomados en cuenta
          </p>
        </div>
      )}

      {isAdmin && (
        <div className="flex flex-col md:flex-row items-center justify-end gap-3 pt-4">
          {q.status === QUESTION_STATUS.LIVE && (
            <button
              onClick={() => onCancel?.(q.id)}
              className="px-6 py-2.5 bg-[#FFEFEB] hover:bg-[#ffd8d1] text-[#BF1D08] font-bold rounded-full transition-all border border-transparent text-sm flex items-center gap-2"
            >
              <X size={16} strokeWidth={3} />
              Cancelar votación
            </button>
          )}

          <button
            onClick={() => onToggleStatus?.(q.id, q.status)}
            className={`px-8 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 shadow-sm ${
              q.status === QUESTION_STATUS.CREATED
                ? "bg-[#D9F7F5] text-[#1F6C72] hover:bg-[#cbf1ef]"
                : q.status === QUESTION_STATUS.LIVE
                  ? "bg-[#FFF2E5] text-[#C13D00] hover:bg-[#ffe6cc]"
                  : "bg-[#F3F4FB] text-[#3D3D3D] hover:bg-[#e9ebf5]"
            } ${q.status === QUESTION_STATUS.CANCELED ? "hidden" : ""}`}
          >
            {q.status === QUESTION_STATUS.CREATED ? (
              <>
                <Play size={14} className="fill-[#1F6C72]" />
                Iniciar votación
              </>
            ) : q.status === QUESTION_STATUS.LIVE ? (
              <>
                <Check size={16} strokeWidth={3} />
                Finalizar Votación
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                Retomar votación
              </>
            )}
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="absolute top-2 right-12">
          <button
            onClick={() => onDelete?.(q.id)}
            className="p-2 text-gray-300 hover:text-rose-500 transition opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;
