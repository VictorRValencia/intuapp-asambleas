'use client';
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { login, useAuth, resetPassword } from "@/lib/auth";

import CustomInput from "@/components/basics/CustomInput";
import CustomButton from "@/components/basics/CustomButton";
import CustomTitle from "@/components/basics/CustomTitle";
import CustomText from "@/components/basics/CustomText";

export default function LoginPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isResetMode, setIsResetMode] = useState(false);
  const [loadingRedirect, setLoadingRedirect] = useState(false);

  const redirectAccordingToRole = (role) => {
    const normalized = (role || "").toString().toLowerCase();
    if (["super-administrador", "super-admin", "superadmin", "super_admin", "superadmin"].includes(normalized.replace(/\s+/g, ''))) {
      router.push("/superAdmin");
    } else {
      router.push("/");
    }
  };

  const checkUserRoleByUid = async (userObj) => {
    if (!userObj?.uid) {
      router.push("/");
      return;
    }

    try {
      setLoadingRedirect(true);
      const res = await fetch(`/api/user-details?uid=${encodeURIComponent(userObj.uid)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        console.warn("No se pudo obtener user-details (por uid). Status:", res.status);
        router.push("/");
        return;
      }

      const data = await res.json();
      const role = data?.role ?? (data?.data && data.data.role) ?? null;
      redirectAccordingToRole(role);
    } catch (err) {
      console.error("Error al obtener user-details por uid:", err);
      toast.error("Error comprobando permisos. Serás redirigido a la página principal.");
      router.push("/");
    } finally {
      setLoadingRedirect(false);
    }
  };

  const checkUserRoleByEmail = async (userEmail) => {
    if (!userEmail) {
      router.push("/");
      return;
    }

    try {
      setLoadingRedirect(true);
      const res = await fetch(`/api/user-details?email=${encodeURIComponent(userEmail)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        console.warn("No se pudo obtener user-details (por email). Status:", res.status);
        router.push("/");
        return;
      }

      const data = await res.json();
      const role = data?.role ?? (data?.data && data.data.role) ?? null;
      redirectAccordingToRole(role);
    } catch (err) {
      console.error("Error al obtener user-details por email:", err);
      toast.error("Error comprobando permisos. Serás redirigido a la página principal.");
      router.push("/");
    } finally {
      setLoadingRedirect(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkUserRoleByUid(user);
    }
  }, [user]);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.warn("Por favor ingresa tu correo electrónico y contraseña.");
      return;
    }

    try {
      await login(email, password);
      await checkUserRoleByEmail(email);
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Correo o contraseña incorrectos.");
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.warn("Por favor ingresa tu correo electrónico.");
      return;
    }

    try {
      await resetPassword(email);
      toast.success("¡Correo de restablecimiento enviado!");
      setIsResetMode(false); 
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error("Error al enviar el correo. Verifica el correo ingresado.");
    }
  };

  return (
    <div id="login-container" className="bg-[#F3F6F9] w-full h-screen flex justify-center items-center">
      <div className="container flex flex-row justify-evenly items-center">
        <div>
          <CustomTitle level="h1" className="text-black text-4xl">
            {isResetMode ? "Restablecer contraseña" : "Bienvenido"}
          </CustomTitle>

          <CustomText>
            {isResetMode
              ? "Te enviaremos un enlace para restablecer tu contraseña."
              : "Accede a tu cuenta y disfruta de todos nuestros servicios."}
          </CustomText>

          <CustomInput
            label="Correo"
            type="email"
            placeholder="Escribe aquí tu correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-6"
          />

          {!isResetMode && (
            <CustomInput
              label="Contraseña"
              type="password"
              placeholder="Escribe aquí tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-4"
            />
          )}

          <CustomButton
            className={`w-full gap-2 opacity-100 rounded-full bg-[#94A2FF] py-3 px-lg mt-4 font-bold`}
            onClick={isResetMode ? handleResetPassword : handleLogin}
            disabled={loadingRedirect}
          >
            {loadingRedirect ? "Redirigiendo..." : (isResetMode ? "Restablecer contraseña" : "Iniciar sesión")}
          </CustomButton>

          <CustomText className="mt-8 text-center">
            {isResetMode
              ? "¿Ya recordaste tu contraseña?"
              : "¿Problemas para iniciar sesión?"}
          </CustomText>

          <div className="flex justify-center gap-5 mt-3">
            {isResetMode ? (
              <Link
                href="#"
                onClick={() => setIsResetMode(false)}
                className="text-blue-500 underline font-bold"
              >
                Volver al inicio de sesión
              </Link>
            ) : (
              <>
                <Link href="#" className="text-blue-500 underline font-bold">
                  Contactar Soporte
                </Link>
                <Link
                  href="#"
                  onClick={() => setIsResetMode(true)}
                  className="text-blue-500 underline font-bold"
                >
                  Solicitar contraseña
                </Link>
              </>
            )}
          </div>
        </div>

        <img src="/logos/login.png" alt="Login" className="w-[45%]" />
      </div>
    </div>
  );
}
