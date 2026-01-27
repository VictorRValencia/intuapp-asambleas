import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Button from "@/components/basics/Button";

export default function SectionCard({
  title,
  actionLabel,
  onAction,
  children,
  viewAllHref,
  viewAllText = "Ver todos",
  className = "",
  classButton = "",
  iconButton = null,
  contentClassName = "max-h-[500px]",
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[#0E3C42]">{title}</h2>
        {actionLabel && onAction && (
          <Button
            variant="primary"
            size="S"
            onClick={onAction}
            className={`${classButton} !text-sm !py-1.5 !px-4 !bg-[#94A2FF] !text-[#000000] !font-bold `}
            icon={iconButton}
          >
            {actionLabel}
          </Button>
        )}
      </div>

      <div
        className={`space-y-3 overflow-y-auto scrollbar-hide ${contentClassName}`}
      >
        {children}
      </div>

      {viewAllHref && (
        <div className="mt-6 text-center pt-2 ">
          <Link
            href={viewAllHref}
            className="text-[#6A7EFF] font-bold hover:underline inline-flex items-center gap-1 "
          >
            {viewAllText} <ArrowUpRight size={20} />
          </Link>
        </div>
      )}
    </div>
  );
}
