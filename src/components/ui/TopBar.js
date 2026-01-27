"use client";
import React, { useState, useEffect } from "react";

import { useUser } from "@/context/UserContext";
import { CircleUserRound } from "lucide-react";
import Breadcrumbs from "./Breadcrumbs";

export default function TopBar({ pageTitle = null, overrides = {} }) {
  const { user } = useUser();
  const [roleName, setRoleName] = React.useState("...");

  React.useEffect(() => {
    const fetchRole = () => {
      if (user?.role) {
        const roles = {
          1: "Super Administrador",
          2: "Administrador",
          3: "Operario Asambleista",
          4: "Usuario Asambleista",
        };
        const name = roles[user.role] || "Cargando...";
        setRoleName(name);
      }
    };
    fetchRole();
  }, [user?.role]);

  return (
    <div className="w-full flex items-center justify-between px-15 pt-8 border-b border-transparent">
      <div className="flex items-center bg-white py-2 px-4 rounded-3xl">
        <Breadcrumbs overrides={overrides} pageTitle={pageTitle} />
      </div>

      <div className="flex items-center gap-4 bg-white py-2 px-4 rounded-md">
        <div className="text-xs flex gap-1 items-center">
          <strong>{user?.name || "..."}</strong> |
          <span className="text-gray-800 font-medium">{roleName || "..."}</span>
          <div className="bg-[#ABE7E5] rounded-3xl p-1">
            <CircleUserRound size={20} />
          </div>
        </div>
      </div>
    </div>
  );
}
