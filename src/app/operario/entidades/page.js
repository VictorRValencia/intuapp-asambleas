"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import EntitiesList from "@/components/entities/EntitiesList";
import Button from "@/components/basics/Button";
import {
  getEntitiesByOperator,
  getAssemblyRegistriesList,
} from "@/lib/entities";
import { getAllAssemblies } from "@/lib/assembly";
import { Plus } from "lucide-react";

export default function OperarioEntidadesPage() {
  const { user } = useUser();
  const router = useRouter();
  const [entities, setEntities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEntities = async () => {
      if (!user?.uid) return;
      try {
        // 1. Fetch Entities
        const entityRes = await getEntitiesByOperator(user.uid);
        if (!entityRes.success) return;
        const rawEntities = entityRes.data;

        // 2. Fetch All Assemblies
        const assemblyRes = await getAllAssemblies();
        const allAssemblies = assemblyRes.success ? assemblyRes.data : [];

        // 3. Enrich Entities
        const enrichedEntities = await Promise.all(
          rawEntities.map(async (e) => {
            // Filter assemblies for this entity
            const entityAssemblies = allAssemblies.filter(
              (a) => a.entityId === e.id,
            );

            // Find Active Assembly
            const activeAssembly = entityAssemblies.find(
              (a) => a.status === "started",
            );

            // Find Next Assembly (Earliest non-finished, non-started?)
            // Or just any non-finished sorted by date
            const futureAssemblies = entityAssemblies
              .filter((a) => a.status !== "finished" && a.status !== "started")
              .sort((a, b) => new Date(a.date) - new Date(b.date));
            const nextAssembly = futureAssemblies[0] || null;

            // Fetch Registries count if list ID exists
            let asambleistasCount = 0;
            if (e.assemblyRegistriesListId) {
              const listRes = await getAssemblyRegistriesList(
                e.assemblyRegistriesListId,
              );
              if (listRes.success && listRes.data) {
                asambleistasCount = Object.keys(listRes.data).length;
              }
            }

            return {
              ...e,
              asambleistasCount,
              nextAssembly: nextAssembly
                ? { date: nextAssembly.date, time: nextAssembly.hour }
                : null,
              activeAssembly: activeAssembly
                ? {
                    name: activeAssembly.name,
                    startedAgo: "",
                    id: activeAssembly.id,
                  } // include id
                : null,
              hasAssemblies: entityAssemblies.length > 0,
            };
          }),
        );

        setEntities(enrichedEntities);
      } catch (error) {
        console.error("Error fetching entities", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEntities();
  }, [user]);

  return (
    <div className="px-15">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-[#0E3C42]">Entidades</h1>
        <Button
          variant="primary"
          size="M"
          className="!text-sm !py-3 !px-4 !bg-[#94A2FF] !text-[#000000] !font-bold"
          onClick={() => router.push("/operario/crear-entidad")}
        >
          <Plus size={18} /> Crear Entidad
        </Button>
      </div>

      <EntitiesList
        entities={entities}
        onManageEntity={(e) => router.push(`/operario/${e.id}`)}
        onCreateAssembly={(e) =>
          router.push(`/operario/${e.id}/crear-asamblea`)
        }
        onViewAssembly={(e) =>
          router.push(`/operario/${e.id}/${e.activeAssembly.id}`)
        }
      />
    </div>
  );
}
