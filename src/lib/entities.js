import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  deleteDoc,
} from "firebase/firestore";

// Helper to standardized registry row data fields with fuzzy matching
const mapRegistryRow = (row) => {
  const findValue = (possibleKeys) => {
    // 1. Try exact matches first
    for (const key of possibleKeys) {
      if (row[key] !== undefined && row[key] !== null) return String(row[key]);
    }
    // 2. Try case-insensitive matches
    const rowKeys = Object.keys(row);
    for (const pKey of possibleKeys) {
      const lowerPKey = pKey.toLowerCase();
      const match = rowKeys.find((rk) => rk.toLowerCase() === lowerPKey);
      if (match) return String(row[match]);
    }
    return "";
  };

  return {
    item: findValue(["Item", "Item :", "No.", "ID"]),
    tipo: findValue([
      "Tipo",
      "Tipo Si es apartamento , casa, local, parqueadero, deposito",
      "Clase",
      "Uso",
    ]),
    grupo: findValue([
      "Grupo",
      "Grupo Número la torre, bloque, manzana, interior",
      "Torre",
      "Bloque",
      "Interior",
      "Manzana",
      "Etapa",
    ]),
    propiedad: findValue([
      "Propiedad",
      "Propiedad o nombre del asociado",
      "# propiedad",
      "Apartamento",
      "Apto",
      "Casa",
      "Unidad",
      "Unidad Privada",
      "Número",
      "Inmueble",
      "Local",
      "Oficina",
    ]),
    coeficiente:
      findValue([
        "Coeficiente",
        "Coeficiente o % de participación",
        "Participación",
        "%",
        "Cof",
      ]) || "0",
    numeroVotos:
      findValue([
        "Número de Votos",
        "Número de Votos que representa",
        "Número de Votos que representa :",
        "Votos",
        "Cant. Votos",
      ]) || "1",
    documento: findValue([
      "Documento",
      "Documento (cedula o codigo único",
      "Cedula",
      "Identificación",
      "NIT",
      "CC",
    ]),
    voteBlocked: row.voteBlocked !== undefined ? row.voteBlocked : false,
    registerInAssembly:
      row.registerInAssembly !== undefined ? row.registerInAssembly : false,
  };
};

// 1. Create Entity Admin
export async function createEntityAdmin(adminData) {
  try {
    const docRef = await addDoc(collection(db, "admin"), {
      ...adminData,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating entity admin:", error);
    return { success: false, error };
  }
}

export async function createEntity(
  entityData,
  adminId,
  operatorId,
  representativeId,
) {
  try {
    const entityRef = await addDoc(collection(db, "entity"), {
      ...entityData,
      lastUpdateOwners: [adminId], // Store admin ID
      operatorId: operatorId, // Link to operator (optional but good for reverse lookup)
      createdAt: serverTimestamp(),
    });

    // B. Update Operator (User or Representative) with Entity ID
    // Assuming we link it to the User document of the operator
    const userRef = doc(db, "user", operatorId);
    await updateDoc(userRef, {
      entities: arrayUnion(entityRef.id),
    });

    if (representativeId) {
      const repRef = doc(db, "representative-operator", representativeId);
      await updateDoc(repRef, {
        entities: arrayUnion(entityRef.id),
      });
    }

    return { success: true, id: entityRef.id };
  } catch (error) {
    console.error("Error creating entity:", error);
    return { success: false, error };
  }
}

export async function getEntitiesByOperator(operatorId) {
  try {
    const q = query(
      collection(db, "entity"),
      where("operatorId", "==", operatorId),
    );
    const querySnapshot = await getDocs(q);
    const entities = [];
    querySnapshot.forEach((doc) => {
      entities.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: entities };
  } catch (error) {
    console.error("Error fetching entities:", error);
    return { success: false, error };
  }
}

export async function createAssemblyRegistriesList(registriesData) {
  try {
    const assemblyRegistries = {};
    registriesData.forEach((row) => {
      const randomId = doc(collection(db, "temp")).id;
      assemblyRegistries[randomId] = mapRegistryRow(row);
    });

    const docRef = await addDoc(collection(db, "assemblyRegistriesList"), {
      assemblyRegistries,
      createdAt: serverTimestamp(),
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating assembly registries list:", error);
    return { success: false, error };
  }
}

export async function getEntityById(entityId) {
  try {
    const docRef = doc(db, "entity", entityId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: "Entity not found" };
    }
  } catch (error) {
    console.error("Error fetching entity:", error);
    return { success: false, error };
  }
}

export async function getAssemblyRegistriesList(listId) {
  try {
    const docRef = doc(db, "assemblyRegistriesList", listId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { success: true, data: docSnap.data().assemblyRegistries };
    } else {
      return { success: false, error: "List not found" };
    }
  } catch (error) {
    console.error("Error fetching assembly registries list:", error);
    return { success: false, error };
  }
}

export async function updateAssemblyRegistriesList(listId, newData) {
  try {
    const docRef = doc(db, "assemblyRegistriesList", listId);

    const newRegistries = {};
    newData.forEach((row) => {
      const randomId = doc(collection(db, "temp")).id;
      newRegistries[randomId] = mapRegistryRow(row);
    });

    await updateDoc(docRef, {
      assemblyRegistries: newRegistries,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating assembly registries list:", error);
    return { success: false, error };
  }
}

export async function updateEntity(entityId, entityData) {
  try {
    const entityRef = doc(db, "entity", entityId);
    await updateDoc(entityRef, {
      ...entityData,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating entity:", error);
    return { success: false, error };
  }
}

export async function deleteEntity(entityId) {
  try {
    await deleteDoc(doc(db, "entity", entityId));
    return { success: true };
  } catch (error) {
    console.error("Error deleting entity:", error);
    return { success: false, error };
  }
}
export async function updateRegistryStatus(
  listId,
  registryId,
  status,
  additionalData = {},
) {
  try {
    const docRef = doc(db, "assemblyRegistriesList", listId);
    const updates = {
      [`assemblyRegistries.${registryId}.registerInAssembly`]: status,
    };

    if (status) {
      if (additionalData.firstName)
        updates[`assemblyRegistries.${registryId}.firstName`] =
          additionalData.firstName;
      if (additionalData.lastName)
        updates[`assemblyRegistries.${registryId}.lastName`] =
          additionalData.lastName;
      if (additionalData.email)
        updates[`assemblyRegistries.${registryId}.email`] =
          additionalData.email;
      if (additionalData.phone)
        updates[`assemblyRegistries.${registryId}.phone`] =
          additionalData.phone;
      if (additionalData.powerUrl)
        updates[`assemblyRegistries.${registryId}.powerUrl`] =
          additionalData.powerUrl;
      if (additionalData.role)
        updates[`assemblyRegistries.${registryId}.role`] = additionalData.role;
      if (additionalData.document)
        updates[`assemblyRegistries.${registryId}.userDocument`] =
          additionalData.document;
    } else {
      updates[`assemblyRegistries.${registryId}.firstName`] = "";
      updates[`assemblyRegistries.${registryId}.lastName`] = "";
      updates[`assemblyRegistries.${registryId}.email`] = "";
      updates[`assemblyRegistries.${registryId}.phone`] = "";
      updates[`assemblyRegistries.${registryId}.powerUrl`] = "";
      updates[`assemblyRegistries.${registryId}.role`] = "";
      updates[`assemblyRegistries.${registryId}.userDocument`] = "";
    }

    await updateDoc(docRef, updates);
    return { success: true };
  } catch (error) {
    console.error("Error updating registry status:", error);
    return { success: false, error };
  }
}

export async function resetAssemblyRegistries(listId) {
  try {
    const docRef = doc(db, "assemblyRegistriesList", listId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return { success: false, error: "List not found" };

    const registries = docSnap.data().assemblyRegistries || {};
    const updatedRegistries = {};

    Object.keys(registries).forEach((key) => {
      const reg = { ...registries[key] };
      delete reg.firstName;
      delete reg.lastName;
      delete reg.email;
      delete reg.phone;
      delete reg.role;
      delete reg.powerUrl;
      delete reg.userDocument;

      updatedRegistries[key] = {
        ...reg,
        registerInAssembly: false,
      };
    });

    await updateDoc(docRef, {
      assemblyRegistries: updatedRegistries,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error resetting registries:", error);
    return { success: false, error };
  }
}

export async function toggleVoteBlock(listId, registryId, isBlocked) {
  try {
    const docRef = doc(db, "assemblyRegistriesList", listId);
    await updateDoc(docRef, {
      [`assemblyRegistries.${registryId}.voteBlocked`]: isBlocked,
    });
    return { success: true };
  } catch (error) {
    console.error("Error toggling vote block:", error);
    return { success: false, error };
  }
}

export async function toggleRegistryDeletion(listId, registryId, isDeleted) {
  try {
    const docRef = doc(db, "assemblyRegistriesList", listId);
    await updateDoc(docRef, {
      [`assemblyRegistries.${registryId}.isDeleted`]: isDeleted,
      [`assemblyRegistries.${registryId}.registerInAssembly`]: isDeleted
        ? false
        : false,
    });
    return { success: true };
  } catch (error) {
    console.error("Error toggling registry deletion:", error);
    return { success: false, error };
  }
}

export async function getTypeEntities(typeId) {
  try {
    const docRef = doc(db, "type-entity", String(typeId));
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: "Type entity not found" };
    }
  } catch (error) {
    console.error("Error fetching type entity:", error);
    return { success: false, error };
  }
}

export async function getEntityTypes() {
  try {
    const querySnapshot = await getDocs(collection(db, "type-entity"));
    const types = [];
    querySnapshot.forEach((doc) => {
      types.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: types };
  } catch (error) {
    console.error("Error fetching entity types:", error);
    return { success: false, error };
  }
}
