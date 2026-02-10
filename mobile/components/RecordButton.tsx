import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../utils/theme';

interface RecordButtonProps {
  onPressIn: () => void;
  onPressOut: () => void;
  status: 'idle' | 'recording' | 'processing';
}

export default function RecordButton({
  onPressIn,
  onPressOut,
  status,
}: RecordButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'recording') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  const getBackgroundColor = () => {
    switch (status) {
      case 'recording':
        return COLORS.error;
      case 'processing':
        return COLORS.textSecondary;
      default:
        return COLORS.accent;
    }
  };

  const getAccessibilityLabel = () => {
    switch (status) {
      case 'recording':
        return 'Recording, release to stop';
      case 'processing':
        return 'Processing recording';
      default:
        return 'Hold to record';
    }
  };

  const renderContent = () => {
    if (status === 'processing') {
      return <ActivityIndicator size="large" color={COLORS.buttonText} />;
    }
    return (
      <View style={[styles.recIndicator, status === 'recording' && styles.recIndicatorActive]} />
    );
  };

  return (
    <Pressable
      onPressIn={status === 'idle' ? onPressIn : undefined}
      onPressOut={status === 'recording' ? onPressOut : undefined}
      disabled={status === 'processing'}
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityRole="button"
      accessibilityState={{ disabled: status === 'processing' }}
      style={styles.pressableWrapper}
    >
      <Animated.View
        style={[
          styles.button,
          {
            backgroundColor: getBackgroundColor(),
            opacity: status === 'recording' ? pulseAnim : 1,
          },
        ]}
      >
        {renderContent()}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressableWrapper: {
    minWidth: 80,
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  recIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.buttonText,
    opacity: 0.6,
  },
  recIndicatorActive: {
    opacity: 1,
    backgroundColor: COLORS.buttonText,
  },
});
