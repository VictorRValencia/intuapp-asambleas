import React from "react";

const VoteBlockingSection = ({ registries, onToggleBlock }) => {
  return (
    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 flex flex-col mt-8 font-primary">
      <h3 className="text-xl font-bold text-[#0E3C42] mb-6">
        Bloqueo de Votos
      </h3>
      <p className="text-[#333333] mb-6 text-sm">
        Activa el bloqueo para impedir que una propiedad pueda votar, aunque
        esté registrada.
      </p>
      <div className="overflow-x-auto border border-gray-100 rounded-xl bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white border-b border-gray-100 text-xs font-bold text-gray-800 uppercase tracking-wider">
              <th className="py-4 px-6">Item</th>
              <th className="py-4 px-6">Tipo</th>
              <th className="py-4 px-6">Grupo</th>
              <th className="py-4 px-6">Propiedad</th>
              <th className="py-4 px-6">Documento</th>
              <th className="py-4 px-6 text-center">Bloquear Voto</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {registries
              .filter((r) => !r.isDeleted)
              .map((item, index) => (
                <tr
                  key={item.id || index}
                  className="border-b border-gray-50 hover:bg-gray-50 transition text-sm text-[#0E3C42]"
                >
                  <td className="py-4 px-6 text-gray-500 font-medium">
                    {item.item || "-"}
                  </td>
                  <td className="py-4 px-6 text-gray-500 font-medium">
                    {item.tipo || "-"}
                  </td>
                  <td className="py-4 px-6 text-gray-500 font-medium">
                    {item.grupo || "-"}
                  </td>
                  <td className="py-4 px-6 text-[#0E3C42] font-black uppercase">
                    {item.propiedad || "---"}
                  </td>
                  <td className="py-4 px-6 text-gray-500 font-medium">
                    {item.documento || "-"}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={item.voteBlocked || false}
                        onChange={() =>
                          onToggleBlock(item.id, item.voteBlocked)
                        }
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                    </label>
                  </td>
                </tr>
              ))}
            {registries.filter((r) => !r.isDeleted).length === 0 && (
              <tr>
                <td
                  colSpan="6"
                  className="py-12 text-center text-gray-400 italic"
                >
                  No hay propiedades para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VoteBlockingSection;
