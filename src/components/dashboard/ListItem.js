import React from "react";
import { ChevronRight } from "lucide-react";

export default function ListItem({
  overline, // Top small text
  title, // Main text
  subtitle, // Bottom text
  entity, // Entity object (alternative to title/subtitle)
  status, // { text, color, dot }
  onClick,
  isAssamblea,
  showNextAssembly = false,
  icon: Icon, // Optional left icon
  className = "",
}) {
  const getEntityTypeIcon = () => {
    const typeLabel = (entity?.typeName || entity?.type || "").toLowerCase();

    if (typeLabel.includes("cooperativa"))
      return "/logos/type/iconCooperativa.png";
    if (typeLabel.includes("empresa")) return "/logos/type/iconEmpresa.png";
    if (
      typeLabel.includes("propiedad") ||
      typeLabel.includes("horizontal") ||
      typeLabel.includes("residencial")
    )
      return "/logos/type/iconPropiedad.png";
    if (typeLabel.includes("sindicato")) return "/logos/type/iconSindicato.png";

    return null;
  };

  const formatDate = (dateString) => {
    if (!dateString || typeof dateString !== "string") return dateString;

    // Matches YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return dateString;

    try {
      const months = [
        "Ene",
        "Feb",
        "Mar",
        "Abr",
        "May",
        "Jun",
        "Jul",
        "Ago",
        "Sep",
        "Oct",
        "Nov",
        "Dic",
      ];
      const [, month, day] = dateString.split("-");
      const monthIndex = parseInt(month, 10) - 1;
      return `${parseInt(day, 10)} ${months[monthIndex]}`;
    } catch (e) {
      return dateString;
    }
  };

  const typeIconPath = getEntityTypeIcon();
  const displayStatusText = formatDate(status?.text);

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-gray-200 rounded-xl p-3 shadow-md hover:shadow-lg transition-shadow cursor-pointer group flex items-center justify-between ${className}`}
    >
      <div className="flex items-center gap-4 flex-1">
        {(typeIconPath || Icon) && (
          <div className="w-14 h-14 rounded-xl
 bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 overflow-hidden">
            {typeIconPath ? (
              <img
                src={typeIconPath}
                alt="Entity Type"
                className="w-10 h-10 object-contain"
              />
            ) : (
              <Icon size={32} />
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {overline && (
            <p className="text-xs text-gray-500 truncate">{overline}</p>
          )}

          <h3 className="text-[18px] font-bold text-[#0E3C42] truncate leading-tight">
            {entity?.name || title}
          </h3>

          {(entity?.typeName || entity?.type || subtitle) && (
            <p className="text-[14px]  truncate">
              {entity?.typeName || entity?.type || subtitle}
              {showNextAssembly && (
                <>
                  {entity?.nextAssembly?.date ? (
                    <>
                      {" "}
                      · Próxima asamblea: {formatDate(entity.nextAssembly.date)}
                    </>
                  ) : (
                    <> · Sin asambleas programadas</>
                  )}
                </>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 pl-2">
        {status && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5  ${
              status.color || "bg-gray-100 text-gray-600"
            }`}
          >
            {status.icon && (
              <span className="rounded-full ">
                <status.icon size={16} />
              </span>
            )}
            {displayStatusText}
          </span>
        )}

        {!isAssamblea && (
          <ChevronRight
            size={20}
            className=" group-hover:text-[#6A7EFF] transition-colors"
          />
        )}
      </div>
    </div>
  );
}
