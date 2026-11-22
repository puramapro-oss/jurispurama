import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import { sendChatMessage } from "@/lib/chat";
import { useAuth } from "@/store/auth";

type Msg = { id: string; role: "user" | "assistant"; content: string; pending?: boolean };

export default function ChatScreen() {
  const ownerId = useAuth((state) => state.user?.id ?? null);
  // A different signed-in account must never inherit the previous conversation.
  return <ChatConversation key={ownerId ?? "signed-out"} ownerId={ownerId} />;
}

function ChatConversation({ ownerId }: { ownerId: string | null }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "Bonjour. Je suis JurisIA, ton assistant juridique. Décris-moi ta situation en quelques phrases pour préparer les points à vérifier.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Msg>>(null);
  const requestRef = useRef<AbortController | null>(null);
  const requestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const caseRef = useRef<string | null>(null);
  const messageSequence = useRef(0);

  useEffect(() => () => {
    requestRef.current?.abort();
    requestRef.current = null;
    if (requestTimeoutRef.current !== null) clearTimeout(requestTimeoutRef.current);
    requestTimeoutRef.current = null;
  }, []);

  function stop(message = "La réponse a été arrêtée.") {
    const request = requestRef.current;
    if (!request) return;
    request.abort();
    requestRef.current = null;
    if (requestTimeoutRef.current !== null) clearTimeout(requestTimeoutRef.current);
    requestTimeoutRef.current = null;
    if (useAuth.getState().user?.id !== ownerId) return;
    setLoading(false);
    setMessages((previous) => previous.filter((entry) => !entry.pending));
    setError(message);
  }

  async function send() {
    const text = input.trim();
    if (!text || requestRef.current || !ownerId) return;
    if (text.length > 8000) {
      setError("Ton message est limité à 8 000 caractères.");
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    const isActive = () => requestRef.current === controller
      && !controller.signal.aborted
      && useAuth.getState().user?.id === ownerId;
    const timeout = setTimeout(() => {
      if (requestRef.current === controller) {
        stop("Le délai de réponse est dépassé. Réessaie.");
      }
    }, 130_000);
    requestTimeoutRef.current = timeout;
    const sequence = ++messageSequence.current;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const userMsg: Msg = {
      id: `u-${sequence}`,
      role: "user",
      content: text,
    };
    const placeholderId = `a-${sequence}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: placeholderId, role: "assistant", content: "…", pending: true },
    ]);
    setInput("");
    setLoading(true);
    setError(null);
    let responseText = "";

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!isActive()) return;
      const token = data.session?.access_token;
      if (sessionError || !token || data.session?.user?.id !== ownerId) {
        throw new Error("Reconnecte-toi pour discuter avec JurisIA.");
      }
      await sendChatMessage({
        message: text,
        caseId: caseRef.current,
        accessToken: token,
        signal: controller.signal,
        onEvent(event) {
          if (!isActive()) {
            controller.abort();
            return;
          }
          if (event.type === "case_created" || event.type === "done") {
            caseRef.current = event.caseId!;
          }
          if (event.type === "text") {
            responseText += event.content!;
            setMessages((previous) => previous.map((message) => message.id === placeholderId
              ? { ...message, content: responseText, pending: false }
              : message));
          }
        },
      });
      if (isActive() && !responseText.trim()) {
        setMessages((previous) => previous.filter((message) => message.id !== placeholderId));
        setError("Aucune réponse exploitable n’a été reçue. Reformule ta question.");
      }
    } catch (failure) {
      if (!isActive()) return;
      if (!responseText) {
        setMessages((previous) => previous.filter((message) => message.id !== placeholderId));
      }
      setError(failure instanceof Error
        ? failure.message
        : "Connexion impossible. Vérifie ton réseau et réessaie.");
    } finally {
      clearTimeout(timeout);
      if (requestTimeoutRef.current === timeout) requestTimeoutRef.current = null;
      if (requestRef.current === controller) {
        const active = isActive();
        requestRef.current = null;
        if (active) setLoading(false);
      }
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0F" }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
        <Text style={{ color: "#C9A84C", fontSize: 12, letterSpacing: 2 }}>
          JURISIA
        </Text>
        <Text
          style={{ color: "#F5F5F7", fontSize: 22, fontWeight: "700" }}
        >
          Assistant juridique
        </Text>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <View
              style={{
                alignSelf:
                  item.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                backgroundColor:
                  item.role === "user"
                    ? "#6D28D9"
                    : "rgba(255,255,255,0.05)",
                borderColor: "rgba(255,255,255,0.06)",
                borderWidth: item.role === "user" ? 0 : 1,
                borderRadius: 16,
                padding: 14,
              }}
            >
              <Text
                style={{
                  color: item.role === "user" ? "#fff" : "#F5F5F7",
                  fontSize: 15,
                  lineHeight: 22,
                }}
              >
                {item.content}
              </Text>
            </View>
          )}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
        />
        {loading && (
          <Pressable testID="chat-cancel" accessibilityRole="button" accessibilityLabel="Arrêter la réponse"
            onPress={() => stop()} style={{ paddingHorizontal: 16, paddingVertical: 12, minHeight: 44 }}>
            <Text style={{ color: "#C9A84C" }}>Arrêter la réponse</Text>
          </Pressable>
        )}
        {error && (
          <Text testID="chat-error" accessibilityRole="alert" style={{ color: "#FCA5A5", paddingHorizontal: 16, paddingBottom: 8 }}>
            {error}{messages[messages.length - 1]?.role === "assistant" ? " Le texte reçu reste à confirmer." : ""}
          </Text>
        )}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 8,
            paddingHorizontal: 16,
            paddingBottom: 12,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.06)",
            backgroundColor: "#0A0A0F",
          }}
        >
          <TextInput
            testID="chat-input"
            value={input}
            onChangeText={setInput}
            placeholder="Décris ta situation juridique…"
            placeholderTextColor="#6B7280"
            multiline
            maxLength={8000}
            accessibilityLabel="Message à JurisIA"
            style={{
              flex: 1,
              maxHeight: 120,
              minHeight: 44,
              backgroundColor: "rgba(255,255,255,0.04)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
              color: "#F5F5F7",
              fontSize: 15,
            }}
          />
          <Pressable
            testID="chat-send"
            onPress={send}
            disabled={!ownerId || loading || !input.trim()}
            accessibilityRole="button"
            accessibilityLabel="Envoyer à JurisIA"
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: input.trim() ? "#6D28D9" : "rgba(255,255,255,0.06)",
              alignItems: "center",
              justifyContent: "center",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Send color="#fff" size={18} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
