import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';

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
              backgroundColor: isActive ? '#E53E3E' : '#4A90D9',
              opacity: disabled ? 0.5 : 1,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.icon}>🗣️</Text>
        </Animated.View>
      </Pressable>
      <Text style={[styles.label, disabled && styles.labelDisabled]}>
        Hold to Speak
      </Text>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    fontSize: 48,
  },
  label: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  labelDisabled: {
    color: '#9CA3AF',
  },
});
