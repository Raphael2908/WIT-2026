import React, { useRef } from 'react';
import { View, Pressable, StyleSheet, Animated } from 'react-native';
import { COLORS, RADII } from '../utils/theme';

interface SpeakButtonProps {
  onPressIn: () => void;
  onPressOut: () => void;
  isActive: boolean;
  disabled: boolean;
}

export default function SpeakButton({
  onPressIn,
  onPressOut,
  isActive,
  disabled,
}: SpeakButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 1.1,
      useNativeDriver: true,
      friction: 5,
    }).start();
    onPressIn();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 1.0,
      useNativeDriver: true,
      friction: 5,
    }).start();
    onPressOut();
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityLabel="Hold to speak"
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        style={styles.pressableWrapper}
      >
        <Animated.View
          style={[
            styles.button,
            {
              backgroundColor: isActive ? COLORS.error : COLORS.accent,
              opacity: disabled ? 0.5 : 1,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.innerCircle} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressableWrapper: {
    minWidth: 120,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  innerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.buttonText,
    opacity: 0.6,
  },
});
