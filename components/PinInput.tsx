import React, { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Radius, Spacing, useColors } from "@/lib/theme";

// ─────────────────────────────────────────────────────────────────────────────
// Six-box PIN entry. A single hidden TextInput drives six rendered boxes — that
// keeps the OS keyboard, paste and autofill behaving normally while still
// looking like discrete digits. Auto-submits on the sixth digit.
// ─────────────────────────────────────────────────────────────────────────────

const LENGTH = 6;

export function PinInput({
  onComplete,
  disabled,
  error,
}: {
  onComplete: (pin: string) => void;
  disabled?: boolean;
  error?: boolean;
}) {
  const c = useColors();
  const [value, setValue] = useState("");
  const inputRef = useRef<TextInput>(null);

  // Clear the boxes when the attempt fails, so the next try starts fresh.
  useEffect(() => {
    if (error) setValue("");
  }, [error]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const handleChange = (text: string) => {
    if (disabled) return;
    const digits = text.replace(/\D/g, "").slice(0, LENGTH);
    setValue(digits);
    if (digits.length === LENGTH) {
      if (Platform.OS !== "web") Haptics.selectionAsync();
      onComplete(digits);
    }
  };

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={styles.wrap}>
      {Array.from({ length: LENGTH }, (_, i) => {
        const filled = i < value.length;
        const isNext = i === value.length;
        return (
          <View
            key={i}
            style={[
              styles.box,
              {
                backgroundColor: c.card,
                borderColor: error ? c.red : isNext ? c.accent : c.border,
                opacity: disabled ? 0.5 : 1,
              },
            ]}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: filled ? (error ? c.red : c.text) : "transparent",
              }}
            />
          </View>
        );
      })}

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        textContentType="password"
        secureTextEntry
        maxLength={LENGTH}
        editable={!disabled}
        caretHidden
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", gap: Spacing.sm, justifyContent: "center" },
  box: {
    width: 44,
    height: 54,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  // Kept on-screen but invisible: a display:none input can't hold focus on RN.
  hidden: { position: "absolute", opacity: 0, width: 1, height: 1 },
});
