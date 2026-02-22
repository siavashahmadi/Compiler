import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { ExecutionResult } from '../types';

interface Props {
  result: ExecutionResult | null;
  isRunning: boolean;
  onClear: () => void;
}

export default function OutputConsole({ result, isRunning, onClear }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.5, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRunning]);

  useEffect(() => {
    if (result) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [result]);

  const hasError = result && (result.stderr || result.exitCode !== 0);
  const isEmpty = !result && !isRunning;

  const renderStatusDot = () => {
    if (isRunning) return null;
    if (!result) return null;
    const color = hasError ? Colors.consoleError : Colors.consoleSuccess;
    return <View style={[styles.statusDot, { backgroundColor: color }]} />;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {renderStatusDot()}
          {isRunning && (
            <Animated.View style={{ opacity: pulseAnim }}>
              <View style={[styles.statusDot, { backgroundColor: Colors.warning }]} />
            </Animated.View>
          )}
          <Text style={styles.headerTitle}>
            {isRunning ? 'Running...' : 'Output'}
          </Text>
          {result && (
            <View style={[
              styles.exitBadge,
              { backgroundColor: hasError ? Colors.danger + '22' : Colors.accentRun + '22' }
            ]}>
              <Text style={[
                styles.exitBadgeText,
                { color: hasError ? Colors.danger : Colors.consoleSuccess }
              ]}>
                exit {result.exitCode}
              </Text>
            </View>
          )}
        </View>

        {result && (
          <TouchableOpacity onPress={onClear} style={styles.clearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Console body */}
      <ScrollView
        ref={scrollRef}
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator
        indicatorStyle="white"
        keyboardShouldPersistTaps="handled"
      >
        {isEmpty && (
          <Text style={styles.placeholder}>
            Press Run to execute your code
          </Text>
        )}

        {isRunning && (
          <View style={styles.runningRow}>
            <ActivityIndicator size="small" color={Colors.warning} />
            <Text style={styles.runningText}>Executing on local runtime...</Text>
          </View>
        )}

        {result && (
          <>
            {/* Timestamp */}
            <Text style={styles.timestamp}>
              {new Date(result.executedAt).toLocaleTimeString()} · {result.language}
            </Text>

            {/* stdout */}
            {result.stdout ? (
              <Text style={styles.stdout} selectable>{result.stdout}</Text>
            ) : !result.stderr ? (
              <Text style={styles.noOutput}>(no output)</Text>
            ) : null}

            {/* stderr */}
            {result.stderr ? (
              <View style={styles.stderrBlock}>
                <Text style={styles.stderrLabel}>stderr</Text>
                <Text style={styles.stderr} selectable>{result.stderr}</Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.consoleBg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    maxHeight: 260,
    minHeight: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.bg1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    color: Colors.textMuted,
    fontSize: Typography.labelSize,
    fontFamily: Typography.mono,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  exitBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  exitBadgeText: {
    fontFamily: Typography.mono,
    fontSize: 11,
    fontWeight: '600',
  },
  clearBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearBtnText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: Typography.mono,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  placeholder: {
    color: Colors.textFaint,
    fontFamily: Typography.mono,
    fontSize: Typography.consoleSize,
    fontStyle: 'italic',
  },
  runningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  runningText: {
    color: Colors.warning,
    fontFamily: Typography.mono,
    fontSize: Typography.consoleSize,
    fontStyle: 'italic',
  },
  timestamp: {
    color: Colors.textFaint,
    fontFamily: Typography.mono,
    fontSize: 11,
    marginBottom: Spacing.sm,
  },
  stdout: {
    color: Colors.consoleText,
    fontFamily: Typography.mono,
    fontSize: Typography.consoleSize,
    lineHeight: 20,
  },
  noOutput: {
    color: Colors.textFaint,
    fontFamily: Typography.mono,
    fontSize: Typography.consoleSize,
    fontStyle: 'italic',
  },
  stderrBlock: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.danger + '11',
    borderLeftWidth: 2,
    borderLeftColor: Colors.danger,
    borderRadius: Radius.sm,
  },
  stderrLabel: {
    color: Colors.danger,
    fontFamily: Typography.mono,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  stderr: {
    color: Colors.danger,
    fontFamily: Typography.mono,
    fontSize: Typography.consoleSize,
    lineHeight: 20,
  },
});
