import { fetch } from "expo/fetch";
import { API_BASE } from "./api";
import { readChatStream, type ChatStreamEvent } from "../../src/lib/chat-stream";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ChatRequest {
  message: string;
  caseId: string | null;
  accessToken: string;
  signal: AbortSignal;
  onEvent: (event: ChatStreamEvent) => void;
}

/** Use the same request and confirmed SSE protocol as the web conversation. */
export async function sendChatMessage(request: ChatRequest): Promise<void> {
  const { message, caseId, accessToken, signal, onEvent } = request;
  if (!message.trim() || message.length > 8000) {
    throw new Error("Ton message doit contenir entre 1 et 8 000 caractères.");
  }
  if (!accessToken) throw new Error("Reconnecte-toi pour discuter avec JurisIA.");
  if (caseId !== null && !UUID.test(caseId)) {
    throw new Error("Le dossier de cette conversation est invalide.");
  }
  if (signal.aborted) return;

  const response = await fetch(`${API_BASE}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ message, ...(caseId ? { caseId } : {}) }),
    signal,
  });

  if (signal.aborted) {
    await response.body?.cancel().catch(() => undefined);
    return;
  }
  if (!response.ok) {
    let message = "JurisIA est temporairement indisponible. Réessaie.";
    let body: { error?: unknown; caseId?: unknown } | null = null;
    if ([402, 429, 500].includes(response.status)) {
      try {
        body = await response.json();
      } catch {
        // The status remains authoritative when the response is not JSON.
      }
      if (signal.aborted) return;
    }
    if (response.status === 401) {
      message = "Reconnecte-toi pour discuter avec JurisIA.";
    } else if (response.status === 402 || response.status === 429) {
      message = "La limite de ton offre est atteinte. Consulte ton abonnement.";
    }
    if (typeof body?.error === "string" && body.error.trim() && body.error.length <= 1000) {
      message = body.error;
    }
    // Preserve the confirmed new dossier while keeping this request failed.
    // The next send remains an explicit user action, with this same identity.
    if (response.status === 500 && caseId === null && typeof body?.caseId === "string" && UUID.test(body.caseId)) {
      onEvent({ type: "case_created", caseId: body.caseId });
    }
    throw new Error(message);
  }
  if (!response.headers.get("content-type")?.toLowerCase().startsWith("text/event-stream") || !response.body) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("La réponse de JurisIA est invalide. Réessaie.");
  }

  let currentCaseId = caseId;
  await readChatStream(response.body, signal, (event) => {
    if (!event || typeof event !== "object") {
      throw new Error("La réponse de JurisIA est invalide. Réessaie.");
    }
    if (event.type === "error") {
      throw new Error(
        typeof event.error === "string" && event.error.length <= 1000
          ? event.error
          : "La réponse n’a pas pu être confirmée. Réessaie.",
      );
    }
    if (event.type === "case_created" || event.type === "done") {
      if (!event.caseId || !UUID.test(event.caseId) || (currentCaseId && currentCaseId !== event.caseId)) {
        throw new Error("Le dossier de la réponse ne correspond pas à cette conversation.");
      }
      currentCaseId = event.caseId;
    } else if (event.type !== "text" || typeof event.content !== "string") {
      throw new Error("La réponse de JurisIA est invalide. Réessaie.");
    }
    onEvent(event);
  });
}
