import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

// Create Assembly
export async function createAssembly(assemblyData, entityId) {
  try {
    const docRef = await addDoc(collection(db, "assembly"), {
      ...assemblyData,
      entityId: entityId,
      status: "create", // Initial status
      createdAt: serverTimestamp(),
    });

    // Update Entity - add assembly ID to array
    const entityRef = doc(db, "entity", entityId);
    await updateDoc(entityRef, {
      lastUpdateOwners: arrayUnion(docRef.id),
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating assembly:", error);
    return { success: false, error };
  }
}

// Get Assembly by ID
export async function getAssemblyById(assemblyId) {
  try {
    const docRef = doc(db, "assembly", assemblyId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: "Assembly not found" };
    }
  } catch (error) {
    console.error("Error fetching assembly:", error);
    return { success: false, error };
  }
}
// Update Assembly
export async function updateAssembly(assemblyId, assemblyData) {
  try {
    const docRef = doc(db, "assembly", assemblyId);
    await updateDoc(docRef, {
      ...assemblyData,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating assembly:", error);
    return { success: false, error };
  }
}

// Toggle Assembly-specific vote block
export async function toggleAssemblyVoteBlock(
  assemblyId,
  registryId,
  isBlocked,
) {
  try {
    const docRef = doc(db, "assembly", assemblyId);
    await updateDoc(docRef, {
      blockedVoters: isBlocked
        ? arrayUnion(registryId)
        : arrayRemove(registryId),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error toggling assembly vote block:", error);
    return { success: false, error };
  }
}

// Get all assemblies (optionally with a limit)
export async function getAllAssemblies(limitCount = null) {
  try {
    const assemblyCol = collection(db, "assembly");
    let q = query(assemblyCol, orderBy("createdAt", "desc"));

    if (limitCount) {
      q = query(assemblyCol, orderBy("createdAt", "desc"), limit(limitCount));
    }

    const snapshot = await getDocs(q);
    const assemblies = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, data: assemblies };
  } catch (error) {
    console.error("Error fetching assemblies:", error);
    return { success: false, error };
  }
}

// Delete Assembly (Cascade)
export async function deleteAssembly(assemblyId) {
  try {
    const assemblyRef = doc(db, "assembly", assemblyId);
    const assemblySnap = await getDoc(assemblyRef);

    if (!assemblySnap.exists()) {
      return { success: false, error: "Assembly not found" };
    }

    const assemblyData = assemblySnap.data();

    // 1. Delete all Questions
    if (assemblyData.questions && Array.isArray(assemblyData.questions)) {
      const deletePromises = assemblyData.questions.map((qId) =>
        deleteDoc(doc(db, "question", qId)),
      );
      await Promise.all(deletePromises);
    }

    // 2. Remove reference from Entity
    if (assemblyData.entityId) {
      const entityRef = doc(db, "entity", assemblyData.entityId);
      // We diligently try to remove it, but if entity doesn't exist, ignore
      try {
        await updateDoc(entityRef, {
          lastUpdateOwners: arrayRemove(assemblyId),
        });
      } catch (err) {
        console.warn(
          "Could not update entity reference, maybe entity is gone:",
          err,
        );
      }
    }

    // 3. Delete Assembly
    await deleteDoc(assemblyRef);

    return { success: true };
  } catch (error) {
    console.error("Error deleting assembly:", error);
    return { success: false, error };
  }
}
