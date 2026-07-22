import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

const LENGTH = 6;

interface OtpInputProps {
  onComplete: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  onComplete,
  disabled = false,
  autoFocus = true,
}: OtpInputProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(autoFocus);
  const [cursorVisible, setCursorVisible] = useState(true);
  const inputRef = useRef<TextInput>(null);

  // Blink the cursor while focused
  useEffect(() => {
    if (!focused) return;
    const interval = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => {
      clearInterval(interval);
      setCursorVisible(true);
    };
  }, [focused]);

  const digits = value.split("");
  // Index of the next box to fill; clamp to last box when full
  const cursorAt = digits.length < LENGTH ? digits.length : LENGTH - 1;

  const handleChange = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, LENGTH);
    setValue(cleaned);
    if (cleaned.length === LENGTH) {
      onComplete(cleaned);
    }
  };

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      className="flex-row gap-2 justify-center"
      accessibilityRole="none"
    >
      {Array.from({ length: LENGTH }).map((_, i) => {
        const hasDigit = digits[i] !== undefined;
        const isCursor = focused && i === cursorAt && !hasDigit;
        const isHighlighted = hasDigit || (focused && i === cursorAt);

        return (
          <View
            key={i}
            className={[
              "w-11 h-14 rounded-xl border items-center justify-center",
              "bg-white dark:bg-bark-card",
              isHighlighted
                ? "border-brown-warm dark:border-umber"
                : "border-sand dark:border-[#4A354A]",
            ].join(" ")}
          >
            {hasDigit ? (
              <Text className="text-2xl font-bold text-brown-deep dark:text-offwhite">
                {digits[i]}
              </Text>
            ) : isCursor && cursorVisible ? (
              <View className="w-0.5 h-6 rounded-full bg-brown-warm dark:bg-umber" />
            ) : null}
          </View>
        );
      })}

      {/* Hidden input — captures all keyboard input including paste */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        maxLength={LENGTH}
        autoFocus={autoFocus}
        editable={!disabled}
        caretHidden
        accessibilityLabel="Enter verification code"
        style={{
          position: "absolute",
          opacity: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </Pressable>
  );
}
