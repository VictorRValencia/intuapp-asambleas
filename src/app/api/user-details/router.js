import { NextResponse } from "next/server";
import { db } from "@/lib/firebase"; 
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");
    const email = searchParams.get("email");

    if (!uid && !email) {
      return NextResponse.json(
        { error: "Debes proporcionar uid o email." },
        { status: 400 }
      );
    }

    let userData = null;

    if (uid) {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        userData = { id: docSnap.id, ...docSnap.data() };
      }
    } else if (email) {
      // Buscar por correo electrónico
      const q = query(collection(db, "users"), where("email", "==", email));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        userData = { id: docSnap.id, ...docSnap.data() };
      }
    }

    if (!userData) {
      return NextResponse.json(
        { error: "Usuario no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: userData.id,
      name: userData.name || "",
      email: userData.email || "",
      role: userData.role || "usuario",
    });
  } catch (error) {
    console.error("Error en /api/user-details:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
