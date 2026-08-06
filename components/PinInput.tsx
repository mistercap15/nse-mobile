import React, { useEffect, useRef, useState } from "react";
import { Keyboard, Platform, StyleSheet, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Radius, Spacing, useColors } from "@/lib/theme";

// ─────────────────────────────────────────────────────────────────────────────
// Six-box PIN entry. One real TextInput is stretched invisibly OVER the six
// rendered boxes, so a tap anywhere on them lands on the input itself and the
// OS opens the keyboard natively.
//
// The obvious alternative — a 1×1 hidden input plus a Pressable calling
// focus() — cannot survive a dismissed keyboard: swiping down (iOS) or pressing
// back (Android) hides the keyboard WITHOUT blurring the field, and focus() is
// a no-op while RN believes the field is still focused, so the keyboard can
// never be summoned back. Letting the touch reach the native view sidesteps
// that entirely: tapping a focused input re-presents the IME by OS behaviour,
// with no state for us to get wrong.
// ─────────────────────────────────────────────────────────────────────────────

const LENGTH = 6;
const BOX_W = 44;
const BOX_H = 54;

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
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Clear the boxes when the attempt fails, so the next try starts fresh.
  useEffect(() => {
    if (error) setValue("");
  }, [error]);

  // Keep our idea of focus honest when the keyboard is dismissed, so the caret
  // ring doesn't imply the field is still taking input.
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidHide", () => setFocused(false));
    return () => sub.remove();
  }, []);

  // Open the keyboard on mount, once the screen has settled.
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
    <View style={styles.wrap}>
      <View style={styles.boxes}>
        {Array.from({ length: LENGTH }, (_, i) => {
          const filled = i < value.length;
          const isNext = focused && i === value.length;
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
      </View>

      {/* Invisible but real, and on top: this is the tap target. */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="password"
        secureTextEntry
        maxLength={LENGTH}
        editable={!disabled}
        caretHidden
        selectionColor="transparent"
        accessibilityLabel="Enter your six digit PIN"
        style={[StyleSheet.absoluteFill, styles.overlay]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "center", paddingVertical: Spacing.sm },
  boxes: { flexDirection: "row", gap: Spacing.sm, justifyContent: "center" },
  box: {
    width: BOX_W,
    height: BOX_H,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  // Transparent rather than opacity:0 — some Android builds skip touch
  // dispatch to fully transparent views, and the text must stay invisible
  // regardless since the boxes below are the real display.
  overlay: { color: "transparent", backgroundColor: "transparent", fontSize: 1 },
});
