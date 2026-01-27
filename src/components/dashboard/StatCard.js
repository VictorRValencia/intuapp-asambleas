import React from "react";

export default function StatCard({
  icon: Icon,
  label,
  value,
  iconBgColor = "bg-[#EEF3FF]",
  iconColor = "text-[#6470FF]",
  width = "",
}) {
  return (
    <div
      className={`${width} bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 py-4 px-6`}
    >
      <div
        className={` rounded-lg ${iconBgColor} flex justify-center items-center text-center`}
      >
        {Icon && <Icon size={32} className={iconColor} />}
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-[#0F2537]">{value}</p>
      </div>
    </div>
  );
}
