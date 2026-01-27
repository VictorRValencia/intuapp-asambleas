import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";

const COLLECTION_NAME = "usersAssemblyActive";

/**
 * Creates a new assembly user after verification.
 * @param {Object} userData - User data to store
 * @returns {Promise<{success: boolean, id?: string, error?: any}>}
 */
export async function createAssemblyUser(userData) {
  try {
    // Check if already exists for this assembly and document to avoid duplicates
    const q = query(
      collection(db, COLLECTION_NAME),
      where("document", "==", userData.document),
      where("assemblyId", "==", userData.assemblyId)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // Return existing user if already created
      return {
        success: true,
        id: snapshot.docs[0].id,
        data: snapshot.docs[0].data(),
      };
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...userData,
      createdAt: serverTimestamp(),
    });

    return {
      success: true,
      id: docRef.id,
      data: { ...userData, id: docRef.id },
    };
  } catch (error) {
    console.error("Error creating assembly user:", error);
    return { success: false, error };
  }
}

/**
 * Gets an assembly user by document and assembly ID.
 * @param {string} document - User document
 * @param {string} assemblyId - Assembly ID
 * @returns {Promise<{success: boolean, data?: Object, error?: any}>}
 */
export async function getAssemblyUser(document, assemblyId) {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("document", "==", document),
      where("assemblyId", "==", assemblyId)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { success: true, data: { id: doc.id, ...doc.data() } };
    }

    return { success: false, error: "User not found" };
  } catch (error) {
    console.error("Error getting assembly user:", error);
    return { success: false, error };
  }
}
/**
 * Deletes an assembly user record by document and assembly ID.
 * @param {string} document - User document
 * @param {string} assemblyId - Assembly ID
 * @returns {Promise<{success: boolean, error?: any}>}
 */
export async function deleteAssemblyUser(document, assemblyId) {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("document", "==", document),
      where("assemblyId", "==", assemblyId)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      await Promise.all(
        snapshot.docs.map((d) => deleteDoc(doc(db, COLLECTION_NAME, d.id)))
      );
      return { success: true };
    }

    return { success: false, error: "User not found" };
  } catch (error) {
    console.error("Error deleting assembly user:", error);
    return { success: false, error };
  }
}

/**
 * Deletes ALL assembly user records for a specific assembly.
 * @param {string} assemblyId - Assembly ID
 * @returns {Promise<{success: boolean, error?: any}>}
 */
export async function deleteAllAssemblyUsers(assemblyId) {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("assemblyId", "==", assemblyId)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      await Promise.all(
        snapshot.docs.map((d) => deleteDoc(doc(db, COLLECTION_NAME, d.id)))
      );
    }
    return { success: true };
  } catch (error) {
    console.error("Error deleting all assembly users:", error);
    return { success: false, error };
  }
}
