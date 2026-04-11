import { useRef, useState } from "react";
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
import { API_BASE } from "@/lib/api";

type Msg = { id: string; role: "user" | "assistant"; content: string };

export default function ChatScreen() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "Bonjour. Je suis JurisIA, ton avocat virtuel. Décris-moi ta situation juridique en quelques phrases, je t'oriente.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const userMsg: Msg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    const placeholderId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: placeholderId, role: "assistant", content: "…" },
    ]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/plain",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        let msg = "JurisIA est temporairement indisponible. Réessaie.";
        if (res.status === 401)
          msg = "Reconnecte-toi pour discuter avec JurisIA.";
        if (res.status === 429)
          msg = "Limite atteinte. Passe à Pro pour des messages illimités.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId ? { ...m, content: msg } : m
          )
        );
        return;
      }

      const fullText = await res.text();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? {
                ...m,
                content:
                  fullText && fullText.trim().length > 0
                    ? fullText
                    : "Réponse vide. Reformule ta question.",
              }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? {
                ...m,
                content:
                  "Connexion impossible. Vérifie ton réseau et réessaie.",
              }
            : m
        )
      );
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
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
          Avocat IA — 30 ans d'expérience
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
            disabled={loading || !input.trim()}
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
