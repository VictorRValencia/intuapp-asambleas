'use client'
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

import { useAuth, logout } from "@/lib/auth";

import { useRouter } from "next/navigation";
import CustomButton from "@/components/basics/CustomButton";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);


    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(true);
            if (!user) {
                router.push("/login");
            } else {
                setLoading(false);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [user, router]);


    const handleLogout = async () => {
        try {
            await logout();
            router.push("/login");
        } catch (error) {
            toast.error("¡Error al cerrar sesión!");
        }
    };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 sm:items-start">
        <CustomButton onClick={handleLogout} className="w-full gap-2 opacity-100 rounded-full bg-[#94A2FF] py-3 px-lg mt-4 font-bold">Cerrar sesión</CustomButton>
      </main>
    </div>
  );
}
