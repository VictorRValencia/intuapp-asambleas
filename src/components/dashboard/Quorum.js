import React from "react";

const Quorum = ({ percentage }) => {
  const size = 260; // Standard size from Operario
  const strokeWidth = 20; // Standard thickness
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Half circle
  const progress = (Math.min(percentage, 100) / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center">
      <svg
        width={size}
        height={size / 2 + 10}
        viewBox={`0 0 ${size} ${size / 2 + 5}`}
        className="overflow-visible"
      >
        <path
          d={`M ${strokeWidth / 2},${size / 2} A ${radius},${radius} 0 0 1 ${
            size - strokeWidth / 2
          },${size / 2}`}
          fill="none"
          stroke="#F3F4FB"
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
        />
        <path
          d={`M ${strokeWidth / 2},${size / 2} A ${radius},${radius} 0 0 1 ${
            size - strokeWidth / 2
          },${size / 2}`}
          fill="none"
          stroke="#4059FF"
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          strokeDasharray={`${progress} ${circumference}`}
          style={{ transition: "stroke-dasharray 1.2s ease-in-out" }}
        />
      </svg>
      <div className="absolute -bottom-1 text-center">
        <span className="text-[30px] font-black text-[#0E3C42] block leading-none">
          {percentage.toFixed(2)}%
        </span>
        <p className="text-[14px] font-bold text-gray-400 mt-2">
          Asambleístas registrados
        </p>
      </div>
    </div>
  );
};

export default Quorum;
