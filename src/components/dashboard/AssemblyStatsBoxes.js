import React from "react";

const AssemblyStatsBoxes = ({ registeredCount, totalCount, blockedCount }) => {
  return (
    <div className="flex gap-4 flex-1">
      {/* Box 1: Registered */}
      <div className="flex-1 bg-[#F9FBFF] border border-[#F0F4FF] rounded-[24px] p-5 flex flex-col justify-between shadow-sm min-h-[160px]">
        <div className="w-10 h-10 rounded-xl bg-[#E0E7FF] flex items-center justify-center mb-3">
          <img
            src="/logos/users/iconAssambleistaRegistrado.png"
            alt="Registrados"
            className="w-6 h-6 object-contain"
          />
        </div>
        <div>
          <h4 className="text-[28px] font-black text-[#0E3C42] leading-none mb-1">
            {registeredCount} / {totalCount}
          </h4>
          <p className="text-[12px] font-bold text-gray-400">
            asambleístas registrados
          </p>
        </div>
      </div>

      {/* Box 2: Blocked */}
      <div className="flex-1 bg-white border border-gray-50 rounded-[24px] p-5 flex flex-col justify-between relative shadow-sm min-h-[160px]">
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-2">
          <img
            src="/logos/users/iconAssambleistaRestringido.png"
            alt="Restringido"
            className="w-6 h-6 object-contain"
          />
        </div>
        <div>
          <h4 className="text-[28px] font-black text-[#0E3C42] leading-none mb-1">
            {blockedCount}
          </h4>
          <p className="text-[12px] font-bold text-gray-400">
            con restricción de voto
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssemblyStatsBoxes;
