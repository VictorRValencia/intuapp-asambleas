"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import CreateEntityForm from "@/components/entities/CreateEntityForm";
import TopBar from "@/components/ui/TopBar";
import Loader from "@/components/basics/Loader";
import { getOperatorById } from "@/lib/operators";

export default function CreateEntityPage() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [operatorData, setOperatorData] = useState(null);

  useEffect(() => {
    const fetchOperatorData = async () => {
      if (!user?.uid) return;

      // Since user role 3 (Operario) is the operator, user.uid should be the operator ID.
      // We need to fetch the operator doc to getting representativeID if needed or verify existence.
      // Assuming getOperatorById works with user.uid
      const res = await getOperatorById(user.uid);
      if (res.success) {
        setOperatorData(res.data);
      } else {
        // Fallback if operator doc not found or error, just use basic user info
        console.warn("Operator data not found for user", user.uid);
      }
      setLoading(false);
    };

    fetchOperatorData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div className="hidden">
        <TopBar pageTitle="Crear Nueva Entidad" />
      </div>

      <div className="py-5 px-15 flex flex-col gap-8 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-[32px] font-bold text-[#0E3C42]">
            Crear Entidad
          </h1>
        </div>

        <CreateEntityForm
          operatorId={user.uid}
          representativeId={operatorData?.representativeId || null}
          onCancel={() => router.back()}
          onSuccess={(res) => router.push(`/operario/${res.id}`)}
        />
      </div>
    </div>
  );
}
