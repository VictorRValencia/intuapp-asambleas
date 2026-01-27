"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  getEntityById,
  getAssemblyRegistriesList,
  updateRegistryStatus,
} from "@/lib/entities";
import { updateAssembly } from "@/lib/assembly";
import { collection, query, where } from "firebase/firestore";
import Loader from "@/components/basics/Loader";
import {
  User,
  Check,
  MapPin,
  Video,
  Copy,
  ArrowRight,
  ArrowLeft,
  Search,
  Building2,
  HelpCircle,
  AlertTriangle,
  X,
  LogOut,
} from "lucide-react";
import { toast } from "react-toastify";
import { QUESTION_STATUS, QUESTION_TYPES, submitVote } from "@/lib/questions";

import { createAssemblyUser, getAssemblyUser } from "@/lib/assemblyUser";
import AsambleistaLogin from "@/components/assemblies/AsambleistaLogin";
import AsambleistaDashboard from "@/components/assemblies/AsambleistaDashboard";
import QuestionItem from "@/components/dashboard/QuestionItem";
import RegistrationWizard from "@/components/assemblies/RegistrationWizard";

export default function AssemblyAccessPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [assembly, setAssembly] = useState(null);
  const [entity, setEntity] = useState(null);
  const [registries, setRegistries] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [userVotingPreference, setUserVotingPreference] = useState(null);
  const [regStep, setRegStep] = useState(0);

  // Data State for Wizard
  const [regDocument, setRegDocument] = useState("");
  const [userInfo, setUserInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [verificationQueue, setVerificationQueue] = useState([]);
  const [currentVerificationIndex, setCurrentVerificationIndex] = useState(0);
  const [verifiedRegistries, setVerifiedRegistries] = useState([]);
  const [currentRole, setCurrentRole] = useState("");
  const [currentFile, setCurrentFile] = useState(null);
  const [addAnotherDecision, setAddAnotherDecision] = useState(null);
  const [manualProp, setManualProp] = useState({ tower: "", unit: "" });

  useEffect(() => {
    const assemblyRef = doc(db, "assembly", id);
    const unsub = onSnapshot(assemblyRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setAssembly(data);
        if (data.entityId) {
          const res = await getEntityById(data.entityId);
          if (res.success) setEntity(res.data);
        }
      } else toast.error("Asamblea no encontrada");
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!entity?.assemblyRegistriesListId) return;
    const listRef = doc(
      db,
      "assemblyRegistriesList",
      entity.assemblyRegistriesListId,
    );
    return onSnapshot(listRef, (snap) => {
      if (snap.exists()) {
        const regs = Object.entries(snap.data().assemblyRegistries || {}).map(
          ([k, v]) => ({ id: k, ...v }),
        );
        setRegistries(regs);
      }
    });
  }, [entity]);

  useEffect(() => {
    if (!assembly?.questions?.length) return;
    const qRef = collection(db, "question");
    return onSnapshot(qRef, (snap) => {
      const qList = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(
          (q) =>
            assembly.questions.includes(q.id) &&
            !q.isDeleted &&
            (q.status === QUESTION_STATUS.LIVE ||
              q.status === QUESTION_STATUS.FINISHED),
        );
      setQuestions(qList);
    });
  }, [assembly?.questions]);

  const handleAccess = async (document) => {
    if (assembly.status === "create")
      return toast.info("Espera a que inicie la reunión");
    setLoading(true);
    try {
      const res = await getAssemblyUser(document, id);
      if (res.success) {
        setCurrentUser(res.data);
        return;
      }
      if (assembly.status === "registries_finalized")
        return toast.error("El registro ha finalizado");

      const found = registries.filter(
        (r) =>
          String(r.documento).trim().toLowerCase() ===
          String(document).trim().toLowerCase(),
      );

      if (
        found.length === 0 &&
        (assembly.accessMethod === "database_document" ||
          !assembly.accessMethod)
      ) {
        return toast.error("Documento no encontrado en base de datos");
      }

      setRegDocument(document);
      const queue = found.filter((r) => !r.registerInAssembly && !r.isDeleted);
      setVerificationQueue(queue);

      // Branching logic: If 2 or more properties, auto-mark as owner and skip step 3
      if (queue.length >= 2) {
        const autoVerified = queue.map((r) => ({
          registry: r,
          role: "owner",
          powerFile: null,
          isIdentified: true,
          isManual: false,
        }));
        setVerifiedRegistries(autoVerified);

        if (
          assembly.requireFullName ||
          assembly.requireEmail ||
          assembly.requirePhone
        ) {
          setRegStep(2);
        } else {
          setRegStep(4); // Skip to addition choice
        }
      } else {
        // Standard flow (0 or 1 property)
        if (
          assembly.requireFullName ||
          assembly.requireEmail ||
          assembly.requirePhone
        ) {
          setRegStep(2);
        } else if (queue.length > 0) {
          setRegStep(3);
        } else {
          setRegStep(4);
        }
      }
    } catch (e) {
      toast.error("Error de acceso");
    } finally {
      setLoading(false);
    }
  };

  const confirmCurrentVerification = () => {
    if (!currentRole) return toast.error("Selecciona tu participación");

    const newItem = {
      registry: verificationQueue[currentVerificationIndex] || {
        propiedad: manualProp.unit,
        grupo: manualProp.tower,
        coeficiente: 0,
        id: `manual_${Date.now()}`,
      },
      role: currentRole,
      powerFile: currentFile,
      isIdentified: regStep === 3,
      isManual: regStep === 5,
    };

    setVerifiedRegistries((p) => [...p, newItem]);

    // Cleanup for next item
    setCurrentRole("");
    setCurrentFile(null);
    setManualProp({ tower: "", unit: "" });

    if (
      regStep === 3 &&
      currentVerificationIndex < verificationQueue.length - 1
    ) {
      setCurrentVerificationIndex((p) => p + 1);
    } else {
      if (regStep === 3) {
        setRegStep(4);
      } else {
        setRegStep(6);
      }
    }
  };

  const removeVerifiedItem = (index) => {
    setVerifiedRegistries((p) => p.filter((_, i) => i !== index));
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      const finalRegistries = await Promise.all(
        verifiedRegistries.map(async (item) => {
          let url = null;
          if (item.powerFile) {
            const fileRef = ref(
              storage,
              `powers/${id}/${regDocument}/${item.registry.id}_${Date.now()}`,
            );
            await uploadBytes(fileRef, item.powerFile);
            url = await getDownloadURL(fileRef);
          }
          return {
            registryId: item.registry.id,
            role: item.role,
            powerUrl: url,
            propiedad: item.registry.propiedad,
            grupo: item.registry.grupo,
            coeficiente: item.registry.coeficiente,
          };
        }),
      );

      const userData = {
        assemblyId: id,
        document: regDocument,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        email: userInfo.email,
        phone: userInfo.phone,
        registries: finalRegistries,
        role: "Asambleista",
      };
      const res = await createAssemblyUser(userData);

      if (res.success) {
        if (entity?.assemblyRegistriesListId) {
          await Promise.all(
            finalRegistries.map((r) => {
              if (String(r.registryId).startsWith("manual_"))
                return Promise.resolve();
              return updateRegistryStatus(
                entity.assemblyRegistriesListId,
                r.registryId,
                true,
                { ...userData, powerUrl: r.powerUrl, role: r.role },
              );
            }),
          );
        }
        setCurrentUser({ ...userData, id: res.id });
        toast.success("Registro completo");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error en el registro");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !assembly)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  if (!assembly)
    return <div className="p-10 text-center">Asamblea no encontrada</div>;

  if (currentUser) {
    const userRegistryIds = (currentUser.registries || []).map(
      (r) => r.registryId,
    );
    const myRegistries = [
      ...registries.filter(
        (r) => userRegistryIds.includes(r.id) && !r.isDeleted,
      ),
      ...(currentUser.registries || [])
        .filter((r) => String(r.registryId).startsWith("manual_"))
        .map((r) => ({
          id: r.registryId,
          propiedad: r.propiedad,
          grupo: r.grupo,
          coeficiente: r.coeficiente || 0,
          isManual: true,
        })),
    ];
    return (
      <AsambleistaDashboard
        user={{ ...currentUser, myRegistries }}
        assembly={assembly}
        entity={entity}
        registries={registries}
        questions={questions}
        userVotingPreference={userVotingPreference}
        onSetVotingPreference={setUserVotingPreference}
        onLogout={() => {
          setCurrentUser(null);
          setRegStep(0);
        }}
        onJoinMeeting={() => {
          if (assembly?.meetLink)
            window.open(
              assembly.meetLink.includes("http")
                ? assembly.meetLink
                : `https://${assembly.meetLink}`,
              "_blank",
            );
          else toast.info("Sin link");
        }}
        renderQuestion={(q, p) => (
          <QuestionItem
            q={q}
            userRegistries={myRegistries}
            assembly={assembly}
            userVotingPreference={userVotingPreference}
            onSetVotingPreference={setUserVotingPreference}
            {...p}
          />
        )}
      />
    );
  }

  if (regStep === 0)
    return (
      <AsambleistaLogin
        assembly={assembly}
        entity={entity}
        onLogin={handleAccess}
        loading={loading}
      />
    );

  return (
    <RegistrationWizard
      regStep={regStep}
      setRegStep={setRegStep}
      assembly={assembly}
      userInfo={userInfo}
      setUserInfo={setUserInfo}
      regDocument={regDocument}
      setRegDocument={setRegDocument}
      onHandleAccess={handleAccess}
      verificationQueue={verificationQueue}
      currentVerificationIndex={currentVerificationIndex}
      setCurrentVerificationIndex={setCurrentVerificationIndex}
      currentRole={currentRole}
      setCurrentRole={setCurrentRole}
      currentFile={currentFile}
      setCurrentFile={setCurrentFile}
      confirmCurrentVerification={confirmCurrentVerification}
      verifiedRegistries={verifiedRegistries}
      removeVerifiedItem={removeVerifiedItem}
      manualProp={manualProp}
      setManualProp={setManualProp}
      registries={registries}
      handleFinalSubmit={handleFinalSubmit}
      loading={loading}
    />
  );
}
