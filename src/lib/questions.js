import { db } from "./firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  arrayUnion,
  getDoc,
} from "firebase/firestore";

export const QUESTION_TYPES = {
  MULTIPLE: "MULTIPLE",
  UNIQUE: "UNIQUE",
  YES_NO: "YES_NO",
  OPEN: "OPEN",
};

export const QUESTION_STATUS = {
  CREATED: "CREATED",
  LIVE: "LIVE",
  CANCELED: "CANCELED",
  FINISHED: "FINISHED",
};

/**
 * Creates a new question and links it to an assembly
 */
export async function createQuestion(assemblyId, questionData) {
  try {
    const questionRef = await addDoc(collection(db, "question"), {
      ...questionData,
      status: QUESTION_STATUS.CREATED,
      isDeleted: false,
      answers: {}, // Map of registryId -> answer data
      createdAt: serverTimestamp(),
    });

    // Link to assembly
    const assemblyRef = doc(db, "assembly", assemblyId);
    await updateDoc(assemblyRef, {
      questions: arrayUnion(questionRef.id),
    });

    return { success: true, id: questionRef.id };
  } catch (error) {
    console.error("Error creating question:", error);
    return { success: false, error };
  }
}

/**
 * Updates an existing question
 */
export async function updateQuestion(questionId, questionData) {
  try {
    const questionRef = doc(db, "question", questionId);
    await updateDoc(questionRef, questionData);
    return { success: true };
  } catch (error) {
    console.error("Error updating question:", error);
    return { success: false, error };
  }
}

/**
 * Updates question status
 */
export async function updateQuestionStatus(questionId, status) {
  try {
    const questionRef = doc(db, "question", questionId);
    await updateDoc(questionRef, { status });
    return { success: true };
  } catch (error) {
    console.error("Error updating question status:", error);
    return { success: false, error };
  }
}

/**
 * Submits a vote for a question
 * registryId: unique identifier for the voter
 * answerData: the chosen option(s) or text
 */
export async function submitVote(questionId, registryId, answerData) {
  try {
    const questionRef = doc(db, "question", questionId);

    // We update the answers map. RegistryId is the key to ensure uniqueness.
    await updateDoc(questionRef, {
      [`answers.${registryId}`]: {
        ...answerData,
        votedAt: new Date().toISOString(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error submitting vote:", error);
    return { success: false, error };
  }
}

/**
 * Submits multiple votes for a question in a single operation
 * votes: Array of { registryId, answer }
 */
export async function submitBatchVotes(questionId, votes) {
  try {
    const questionRef = doc(db, "question", questionId);
    const updates = {};
    const timestamp = new Date().toISOString();

    votes.forEach((v) => {
      updates[`answers.${v.registryId}`] = {
        ...v.answer,
        votedAt: timestamp,
      };
    });

    await updateDoc(questionRef, updates);

    return { success: true };
  } catch (error) {
    console.error("Error submitting batch votes:", error);
    return { success: false, error };
  }
}

export async function deleteQuestion(questionId) {
  try {
    const questionRef = doc(db, "question", questionId);
    await updateDoc(questionRef, { isDeleted: true });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export async function resetAllQuestionsAnswers(questionIds) {
  try {
    const batchPromises = questionIds.map((id) => {
      const qRef = doc(db, "question", id);
      return updateDoc(qRef, {
        answers: {},
        status: QUESTION_STATUS.CREATED,
      });
    });
    await Promise.all(batchPromises);
    return { success: true };
  } catch (error) {
    console.error("Error resetting questions:", error);
    return { success: false, error };
  }
}

export async function finishAllLiveQuestions(questionIds) {
  try {
    const batchPromises = questionIds.map(async (id) => {
      const qRef = doc(db, "question", id);
      const qSnap = await getDoc(qRef);
      if (qSnap.exists() && qSnap.data().status === QUESTION_STATUS.LIVE) {
        return updateDoc(qRef, {
          status: QUESTION_STATUS.FINISHED,
        });
      }
    });
    await Promise.all(batchPromises);
    return { success: true };
  } catch (error) {
    console.error("Error finishing questions:", error);
    return { success: false, error };
  }
}
