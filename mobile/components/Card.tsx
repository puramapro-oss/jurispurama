import { Pressable, View, type ViewProps } from "react-native";
import type { ReactNode } from "react";

type Props = ViewProps & {
  children: ReactNode;
  onPress?: () => void;
  testID?: string;
};

export function Card({ children, onPress, testID, style, ...rest }: Props) {
  const inner = (
    <View
      testID={testID}
      {...rest}
      style={[
        {
          backgroundColor: "rgba(255,255,255,0.04)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.06)",
          borderRadius: 16,
          padding: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      {inner}
    </Pressable>
  );
}
