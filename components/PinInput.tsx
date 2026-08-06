import React, { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Radius, Spacing, useColors } from "@/lib/theme";

// ─────────────────────────────────────────────────────────────────────────────
// Six-box PIN entry. A single hidden TextInput drives six rendered boxes — that
// keeps the OS keyboard, paste and autofill behaving normally while still
// looking like discrete digits. Auto-submits on the sixth digit.
//
// Re-focusing needs care: dismissing the keyboard (swipe-down on iOS, back
// button on Android) hides it WITHOUT blurring the field, and TextInput.focus()
// is a no-op while RN thinks the field is already focused. Left alone, the
// keyboard can never be summoned back. Two things keep the two in sync:
// a keyboardDidHide listener that blurs for real, and a blur→focus cycle on tap
// as a backstop.
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
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Clear the boxes when the attempt fails, so the next try starts fresh.
  useEffect(() => {
    if (error) setValue("");
  }, [error]);

  // The keyboard going away must also mean "not focused", or the next tap's
  // focus() is swallowed as redundant.
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidHide", () => {
      if (inputRef.current?.isFocused()) inputRef.current.blur();
      setFocused(false);
    });
    return () => sub.remove();
  }, []);

  const focusInput = useCallback(() => {
    if (disabled) return;
    const input = inputRef.current;
    if (!input) return;
    if (input.isFocused()) {
      // Already focused as far as RN is concerned but the keyboard is down —
      // bounce the focus so the OS is asked to present it again.
      input.blur();
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      input.focus();
    }
  }, [disabled]);

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
    <Pressable
      onPress={focusInput}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel="Enter your six digit PIN"
      // Generous target: the boxes are small, and this is the only way back to
      // the keyboard once it's been dismissed.
      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
    >
      <View style={styles.boxes} pointerEvents="none">
        {Array.from({ length: LENGTH }, (_, i) => {
          const filled = i < value.length;
          // Only mark the caret position while actually focused, so a dismissed
          // keyboard doesn't leave a box looking like it's accepting input.
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
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: Spacing.sm },
  boxes: { flexDirection: "row", gap: Spacing.sm, justifyContent: "center" },
  box: {
    width: 44,
    height: 54,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  // Kept on-screen but invisible: a display:none input can't hold focus in RN.
  hidden: { position: "absolute", opacity: 0, width: 1, height: 1 },
});
