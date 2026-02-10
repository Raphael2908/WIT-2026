import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';

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
        return '#E53E3E';
      case 'processing':
        return '#6B7280';
      default:
        return '#9CA3AF';
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
      return <ActivityIndicator size="large" color="#FFFFFF" />;
    }
    return (
      <Text style={[styles.icon, status === 'recording' && styles.iconRecording]}>
        🎤
      </Text>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  icon: {
    fontSize: 36,
  },
  iconRecording: {
    color: '#FFFFFF',
  },
});
