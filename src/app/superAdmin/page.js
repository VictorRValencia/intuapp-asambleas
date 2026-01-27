"use client";
import { React, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/headers/HeaderSuperAdmin";
import { useUser } from "@/context/UserContext";
import {
  UsersRound,
  HousePlus,
  CalendarClock,
  ChevronRight,
} from "lucide-react";

import WelcomeSection from "@/components/dashboard/WelcomeSection";
import StatCard from "@/components/dashboard/StatCard";
import SectionCard from "@/components/dashboard/SectionCard";
import ListItem from "@/components/dashboard/ListItem";

import { getOperatorsCount, getEntitiesCount } from "@/lib/stats";
import { getOperators } from "@/lib/operators";
import { getEntitiesByOperator, getEntityById } from "@/lib/entities";
import { getAllAssemblies } from "@/lib/assembly";

const SuperAdminPage = () => {
  const { user } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState({
    operators: 0,
    entities: 0,
  });
  const [operators, setOperators] = useState([]);
  const [operatorsWithEntities, setOperatorsWithEntities] = useState([]);
  const [assembliesWithDetails, setAssembliesWithDetails] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [ops, ents] = await Promise.all([
        getOperatorsCount(),
        getEntitiesCount(),
      ]);
      setStats({ operators: ops, entities: ents });
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchOperators = async () => {
      const ops = await getOperators();
      setOperators(ops);

      const opsWithEntities = await Promise.all(
        ops.map(async (op) => {
          const res = await getEntitiesByOperator(op.id);
          return {
            ...op,
            entitiesCount: res.success ? res.data.length : 0,
          };
        }),
      );
      setOperatorsWithEntities(opsWithEntities);
    };
    fetchOperators();
  }, []);

  useEffect(() => {
    const fetchAssemblies = async () => {
      const res = await getAllAssemblies(10);
      if (res.success) {
        const assembliesWithFullDetails = await Promise.all(
          res.data.map(async (assembly) => {
            const entityRes = await getEntityById(assembly.entityId);
            const entityData = entityRes.success ? entityRes.data : null;

            // Find operator for this entity
            let operatorName = "";
            if (entityData && entityData.operatorId) {
              const operator = operators.find(
                (op) => op.id === entityData.operatorId,
              );
              operatorName = operator ? operator.name : "Operador";
            }

            return {
              ...assembly,
              entityName: entityData ? entityData.name : "Entidad",
              operatorName,
            };
          }),
        );
        setAssembliesWithDetails(assembliesWithFullDetails);
      }
    };

    if (operators.length > 0) {
      fetchAssemblies();
    }
  }, [operators]);

  return (
    <div>
      <WelcomeSection userName={user?.name} />

      <section className="mt-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={UsersRound}
            label="Operadores Logísticos"
            value={stats.operators}
            iconColor="text-[#6470FF]"
            iconBgColor="bg-[#EEF3FF]"
          />
          <StatCard
            icon={HousePlus}
            label="Entidades en total"
            value={stats.entities}
            iconColor="text-[#6470FF]"
            iconBgColor="bg-[#EEF3FF]"
          />
          <StatCard
            icon={CalendarClock}
            label="Asambleas agendadas"
            value={assembliesWithDetails.length}
            iconColor="text-[#6470FF]"
            iconBgColor="bg-[#EEF3FF]"
          />
        </div>
      </section>

      <section className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Operators List */}
          <SectionCard
            title="Operadores Logísticos"
            viewAllHref="/superAdmin/operadores"
            viewAllText="Ver todos los Operadores"
          >
            {operatorsWithEntities.slice(0, 4).map((operator) => (
              <ListItem
                key={operator.id}
                title={operator.name}
                subtitle={`${operator.entitiesCount} Entidades`}
                overline={null}
                onClick={() =>
                  router.push(`/superAdmin/operadores/${operator.id}`)
                }
              />
            ))}
          </SectionCard>

          {/* Assemblies List */}
          <SectionCard
            title="Asambleas"
            viewAllHref="/superAdmin/asambleas"
            viewAllText="Ver todas las Asambleas"
          >
            {assembliesWithDetails.length > 0 ? (
              assembliesWithDetails.slice(0, 4).map((assembly) => {
                const getStatusInfo = () => {
                  if (
                    assembly.status === "started" ||
                    assembly.status === "registries_finalized"
                  ) {
                    return {
                      text: "En vivo",
                      color: "bg-red-100 text-red-600",
                      dot: true,
                    };
                  } else if (assembly.status === "finished") {
                    return {
                      text: assembly.date || "Finalizada",
                      color: "bg-gray-100 text-gray-600",
                      dot: false,
                    };
                  } else {
                    return {
                      text: assembly.date || "Por iniciar",
                      color: "bg-orange-100 text-orange-600",
                      dot: false,
                    };
                  }
                };

                const statusInfo = getStatusInfo();

                return (
                  <ListItem
                    key={assembly.id}
                    overline={assembly.operatorName || "Operador"}
                    title={`${assembly.entityName} - ${assembly.name}`}
                    subtitle={`${assembly.hour ? `${assembly.hour}` : ""} · ${
                      assembly.type || "Virtual"
                    }`}
                    status={statusInfo}
                    onClick={() =>
                      router.push(
                        `/superAdmin/operadores/${
                          assembly.operatorId || "unknown"
                        }/entity/${assembly.entityId}/assembly/${assembly.id}`,
                      )
                    }
                  />
                );
              })
            ) : (
              <div className="text-center py-12">
                <CalendarClock
                  size={64}
                  className="text-gray-300 mx-auto mb-4"
                />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No hay asambleas
                </h3>
                <p className="text-gray-500 text-sm">
                  Las asambleas se mostrarán aquí una vez que estén programadas.
                </p>
              </div>
            )}
          </SectionCard>
        </div>
      </section>
    </div>
  );
};

export default SuperAdminPage;
