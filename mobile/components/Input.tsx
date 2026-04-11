import { useState } from "react";
import { TextInput, View, Text, type TextInputProps } from "react-native";

type Props = TextInputProps & {
  label?: string;
  error?: string;
  testID?: string;
};

export function Input({ label, error, testID, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ width: "100%" }}>
      {label ? (
        <Text
          style={{
            color: "#9CA3AF",
            fontSize: 13,
            marginBottom: 6,
            fontWeight: "500",
          }}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        testID={testID}
        placeholderTextColor="#6B7280"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          {
            backgroundColor: "rgba(255,255,255,0.04)",
            borderWidth: 1,
            borderColor: error
              ? "#EF4444"
              : focused
                ? "#6D28D9"
                : "rgba(255,255,255,0.10)",
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 16,
            color: "#F5F5F7",
            fontSize: 16,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
