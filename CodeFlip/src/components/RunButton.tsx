import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';

interface Props {
  onPress: () => void;
  isRunning: boolean;
  label?: string;
}

export default function RunButton({ onPress, isRunning, label = 'Run' }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.button, isRunning && styles.buttonRunning]}
        onPress={handlePress}
        disabled={isRunning}
        activeOpacity={0.85}
      >
        {isRunning ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.label}>Running...</Text>
          </>
        ) : (
          <>
            <Text style={styles.icon}>▶</Text>
            <Text style={styles.label}>{label}</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accentRun,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    shadowColor: Colors.accentRun,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonRunning: {
    backgroundColor: Colors.bg3,
    shadowOpacity: 0,
    elevation: 0,
  },
  icon: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
  },
  label: {
    color: '#fff',
    fontFamily: Typography.mono,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
