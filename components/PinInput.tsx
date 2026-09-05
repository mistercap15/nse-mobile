import React, { useEffect, useRef, useState } from "react";
import { Keyboard, StyleSheet, TextInput, View } from "react-native";
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
const BOX_W = 46;
const BOX_H = 58;

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
      onComplete(digits);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.boxes}>
        {Array.from({ length: LENGTH }, (_, i) => {
          const filled = i < value.length;
          const isNext = focused && i === value.length;

          // The active box is marked by its BORDER only. It previously also got
          // an accent fill, an accent caret and an accent glow — four cues at
          // once, which made one box read as a solid blue tile next to five
          // white ones. The border alone is enough to say "input lands here".
          const border = error ? c.red : isNext ? c.accent : filled ? c.soft : c.border;

          return (
            <View
              key={i}
              style={[
                styles.box,
                {
                  backgroundColor: error ? c.redBg : c.card,
                  borderColor: border,
                  borderWidth: isNext ? 2 : 1.5,
                  opacity: disabled ? 0.45 : 1,
                },
              ]}
            >
              {filled ? (
                <View style={[styles.dot, { backgroundColor: error ? c.red : c.text }]} />
              ) : (
                // Same quiet dash whether or not this is the next box — the
                // border already carries that information.
                <View style={[styles.placeholder, { backgroundColor: c.border }]} />
              )}
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
        // Deliberately NOT secureTextEntry. The field is invisible and the dots
        // below are our own rendering, so it bought no masking — while making
        // Android treat this as a password field, which is where the caret,
        // selection highlight and autofill chrome came from.
        maxLength={LENGTH}
        editable={!disabled}
        // These four are belt-and-braces; opacity:0 on the style is what
        // actually hides the field. caretHidden and selectionColor were tried
        // on their own and did NOT suppress the caret or the blue selection
        // highlight on Samsung's IME.
        caretHidden
        selectionColor="transparent"
        underlineColorAndroid="transparent"
        importantForAutofill="no"
        autoComplete="off"
        // Long-press would otherwise raise a paste/select menu over the boxes.
        contextMenuHidden
        accessibilityLabel="Enter your six digit PIN"
        style={[StyleSheet.absoluteFill, styles.overlay]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "center", paddingVertical: Spacing.sm },
  boxes: { flexDirection: "row", gap: 10, justifyContent: "center" },
  box: {
    width: BOX_W,
    height: BOX_H,
    borderRadius: Radius.md + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 11, height: 11, borderRadius: 6 },
  placeholder: { width: 8, height: 2, borderRadius: 1, opacity: 0.7 },
  // opacity:0, not just a transparent colour. A transparent *colour* only hides
  // the glyphs — the caret, the selection highlight and the IME's composing
  // background still paint, which is the blue slab that kept appearing over the
  // first box. opacity:0 hides the view outright while it still receives
  // touches, so tapping continues to open the keyboard natively.
  overlay: { opacity: 0, fontSize: 1 },
});
