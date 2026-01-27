"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAllAssemblies } from "@/lib/assembly";
import { getEntityById } from "@/lib/entities";
import { getOperators } from "@/lib/operators";
import AssembliesList from "@/components/assemblies/AssembliesList";

const AssembliesPage = () => {
  const router = useRouter();
  const [assemblies, setAssemblies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [assemblyRes, operatorsRes] = await Promise.all([
        getAllAssemblies(),
        getOperators(),
      ]);

      if (assemblyRes.success) {
        const assembliesWithDetails = await Promise.all(
          assemblyRes.data.map(async (assembly) => {
            const entityRes = await getEntityById(assembly.entityId);
            const entityData = entityRes.success ? entityRes.data : null;

            let operatorName = "Operador";
            let opId = entityData ? entityData.operatorId : null;

            if (entityData && entityData.operatorId && operatorsRes) {
              const operator = operatorsRes.find(
                (op) => op.id === entityData.operatorId
              );
              if (operator) operatorName = operator.name;
            }

            return {
              ...assembly,
              entityName: entityData ? entityData.name : "Entidad",
              operatorName,
              operatorId: opId,
            };
          })
        );
        setAssemblies(assembliesWithDetails);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <AssembliesList
      data={assemblies}
      loading={loading}
      onCreateClick={() => router.push("/superAdmin/operadores")}
      getDetailUrl={(a) =>
        `/superAdmin/operadores/${a.operatorId}/${a.entityId}/${a.id}`
      }
    />
  );
};

export default AssembliesPage;
