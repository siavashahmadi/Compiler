import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { ExecutionResult } from '../types';

interface Props {
  result: ExecutionResult | null;
  isRunning: boolean;
  onClear: () => void;
}

export default function OutputConsole({ result, isRunning, onClear }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const expandedScrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [expanded, setExpanded] = useState(false);

  // Pulse animation while running
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

  // Scroll to bottom on new result
  useEffect(() => {
    if (result) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
      setTimeout(() => expandedScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [result]);

  // Auto-open expanded view when a new result arrives
  useEffect(() => {
    if (result && !isRunning) {
      setExpanded(true);
    }
  }, [result?.executedAt]);

  const handleClear = useCallback(() => {
    onClear();
    setExpanded(false);
  }, [onClear]);

  const hasError = result && (result.stderr || result.exitCode !== 0);
  const isEmpty = !result && !isRunning;
  const canExpand = !!result || isRunning;

  // Shared sub-elements
  const statusDot = isRunning ? (
    <Animated.View style={{ opacity: pulseAnim }}>
      <View style={[styles.statusDot, { backgroundColor: Colors.warning }]} />
    </Animated.View>
  ) : result ? (
    <View style={[styles.statusDot, { backgroundColor: hasError ? Colors.consoleError : Colors.consoleSuccess }]} />
  ) : null;

  const exitBadge = result ? (
    <View style={[styles.exitBadge, { backgroundColor: hasError ? Colors.danger + '22' : Colors.accentRun + '22' }]}>
      <Text style={[styles.exitBadgeText, { color: hasError ? Colors.danger : Colors.consoleSuccess }]}>
        exit {result.exitCode}
      </Text>
    </View>
  ) : null;

  // Output content — horizontal scroll for long lines only in modal
  const outputBody = (isModal: boolean) => (
    <>
      {isEmpty && (
        <Text style={styles.placeholder}>Press Run to execute your code</Text>
      )}

      {isRunning && (
        <View style={styles.runningRow}>
          <ActivityIndicator size="small" color={Colors.warning} />
          <Text style={styles.runningText}>Executing on local runtime...</Text>
        </View>
      )}

      {result && (
        <>
          <Text style={styles.timestamp}>
            {new Date(result.executedAt).toLocaleTimeString()} · {result.language}
          </Text>

          {result.stdout ? (
            isModal ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.hScroll}
                scrollEventThrottle={16}
              >
                <Text style={styles.stdout} selectable>{result.stdout}</Text>
              </ScrollView>
            ) : (
              <Text style={styles.stdout} selectable>{result.stdout}</Text>
            )
          ) : !result.stderr ? (
            <Text style={styles.noOutput}>(no output)</Text>
          ) : null}

          {result.stderr ? (
            <View style={styles.stderrBlock}>
              <Text style={styles.stderrLabel}>stderr</Text>
              {isModal ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.hScroll}
                  scrollEventThrottle={16}
                >
                  <Text style={styles.stderr} selectable>{result.stderr}</Text>
                </ScrollView>
              ) : (
                <Text style={styles.stderr} selectable>{result.stderr}</Text>
              )}
            </View>
          ) : null}
        </>
      )}
    </>
  );

  return (
    <>
      {/* ── Collapsed console ── */}
      <View style={styles.container}>
        <View style={styles.header}>
          {/* Left side: tap area to expand */}
          <TouchableOpacity
            style={styles.headerLeft}
            onPress={() => canExpand && setExpanded(true)}
            disabled={!canExpand}
            activeOpacity={0.6}
          >
            {statusDot}
            <Text style={styles.headerTitle}>
              {isRunning ? 'Running...' : 'Output'}
            </Text>
            {exitBadge}
            {canExpand && <Text style={styles.expandArrow}>↗</Text>}
          </TouchableOpacity>

          {/* Right side: clear button */}
          {result && (
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator
          indicatorStyle="white"
          keyboardShouldPersistTaps="handled"
        >
          {outputBody(false)}
        </ScrollView>
      </View>

      {/* ── Expanded modal ── */}
      <Modal
        visible={expanded}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
        onRequestClose={() => setExpanded(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          {/* Drag handle */}
          <View style={styles.dragHandleRow}>
            <View style={styles.dragHandle} />
          </View>

          {/* Modal header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              {statusDot}
              <Text style={[styles.headerTitle, styles.modalTitle]}>Output</Text>
              {exitBadge}
            </View>
            <View style={styles.modalHeaderRight}>
              {result && (
                <TouchableOpacity
                  onPress={handleClear}
                  style={styles.clearBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setExpanded(false)} style={styles.doneBtn}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Modal body — full height, horizontal scroll for long lines */}
          <ScrollView
            ref={expandedScrollRef}
            style={styles.modalBody}
            contentContainerStyle={[styles.bodyContent, styles.modalBodyContent]}
            showsVerticalScrollIndicator
            indicatorStyle="white"
            keyboardShouldPersistTaps="handled"
          >
            {outputBody(true)}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // ── Collapsed ──
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
    flex: 1,
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
  expandArrow: {
    color: Colors.textFaint,
    fontSize: 14,
    marginLeft: Spacing.xs,
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
  hScroll: {
    marginBottom: Spacing.xs,
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

  // ── Modal ──
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.bg1,
  },
  dragHandleRow: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 15,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  doneBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accent + '22',
    borderWidth: 1,
    borderColor: Colors.accent + '55',
  },
  doneBtnText: {
    color: Colors.accent,
    fontSize: 13,
    fontFamily: Typography.mono,
    fontWeight: '600',
  },
  modalBody: {
    flex: 1,
    backgroundColor: Colors.consoleBg,
  },
  modalBodyContent: {
    paddingBottom: 40,
  },
});
