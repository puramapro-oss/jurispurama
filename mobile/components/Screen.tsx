import { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type ScrollViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  children: ReactNode;
  scroll?: boolean;
  edges?: ("top" | "bottom" | "left" | "right")[];
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
};

export function Screen({
  children,
  scroll = true,
  edges = ["top", "bottom", "left", "right"],
  contentContainerStyle,
}: Props) {
  return (
    <SafeAreaView
      edges={edges}
      style={{ flex: 1, backgroundColor: "#0A0A0F" }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              { padding: 20, paddingBottom: 80 },
              contentContainerStyle,
            ]}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, padding: 20 }}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
