import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Animated,
} from 'react-native';
import { useStore, useCurrentProblem } from '../store/useStore';
import CodeEditor from '../components/CodeEditor';
import OutputConsole from '../components/OutputConsole';
import RunButton from '../components/RunButton';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';
import { Language } from '../types';

type ViewMode = 'flip' | 'split';

const { width } = Dimensions.get('window');

export default function CompareScreen() {
  const problem = useCurrentProblem();
  const isRunning = useStore((s) => s.isRunning);
  const results = useStore((s) => s.results);
  const runBothLanguages = useStore((s) => s.runBothLanguages);
  const currentProblemId = useStore((s) => s.currentProblemId);

  const [viewMode, setViewMode] = useState<ViewMode>('flip');
  const [flipActive, setFlipActive] = useState<Language>('typescript');

  const pyResult = results[`${currentProblemId}_python`] ?? null;
  const tsResult = results[`${currentProblemId}_typescript`] ?? null;

  const activeResult = flipActive === 'python' ? pyResult : tsResult;

  const handleFlip = () => {
    setFlipActive((prev) => (prev === 'python' ? 'typescript' : 'python'));
  };

  const clearBothResults = () => {
    useStore.setState((s) => {
      const next = { ...s.results };
      delete next[`${currentProblemId}_python`];
      delete next[`${currentProblemId}_typescript`];
      return { results: next };
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.problemTitle} numberOfLines={1}>
          {problem.title}
        </Text>
        <View style={styles.headerActions}>
          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            {(['flip', 'split'] as ViewMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.modeBtn, viewMode === mode && styles.modeBtnActive]}
                onPress={() => setViewMode(mode)}
              >
                <Text style={[styles.modeBtnText, viewMode === mode && styles.modeBtnTextActive]}>
                  {mode === 'flip' ? '⟷ Flip' : '⊟ Split'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <RunButton onPress={runBothLanguages} isRunning={isRunning} label="Run Both" />
        </View>
      </View>

      {viewMode === 'flip' ? (
        /* ── Flip mode ── */
        <View style={styles.flex}>
          {/* Language switcher */}
          <View style={styles.flipSwitcher}>
            {(['typescript', 'python'] as Language[]).map((lang) => {
              const isActive = flipActive === lang;
              const color = lang === 'python' ? Colors.python : Colors.typescript;
              const label = lang === 'python' ? 'Python' : 'TypeScript';
              return (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.flipTab,
                    isActive && { borderBottomColor: color, borderBottomWidth: 2 },
                  ]}
                  onPress={() => setFlipActive(lang)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.langDot, { backgroundColor: color, opacity: isActive ? 1 : 0.3 }]} />
                  <Text style={[styles.flipTabText, { color: isActive ? color : Colors.textMuted }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={styles.flipBtn} onPress={handleFlip}>
              <Text style={styles.flipBtnText}>⟷</Text>
            </TouchableOpacity>
          </View>

          {/* Editor panel */}
          <View style={styles.flex}>
            <CodeEditor
              key={`compare_flip_${problem.id}_${flipActive}`}
              value={flipActive === 'python' ? problem.python : problem.typescript}
              onChange={() => {}} // read-only in compare mode
              language={flipActive}
              readOnly
            />
          </View>

          {/* Output for active language */}
          <OutputConsole
            result={activeResult}
            isRunning={isRunning}
            onClear={clearBothResults}
          />
        </View>
      ) : (
        /* ── Split mode (horizontal scroll) ── */
        <View style={styles.flex}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator
            style={styles.flex}
          >
            {/* Python panel */}
            <View style={[styles.splitPanel, { width }]}>
              <View style={styles.splitHeader}>
                <View style={[styles.langDot, { backgroundColor: Colors.python }]} />
                <Text style={[styles.splitHeaderText, { color: Colors.python }]}>Python</Text>
              </View>
              <View style={styles.flex}>
                <CodeEditor
                  key={`split_py_${problem.id}`}
                  value={problem.python}
                  onChange={() => {}}
                  language="python"
                  readOnly
                />
              </View>
              <OutputConsole result={pyResult} isRunning={isRunning} onClear={clearBothResults} />
            </View>

            {/* TypeScript panel */}
            <View style={[styles.splitPanel, { width }]}>
              <View style={styles.splitHeader}>
                <View style={[styles.langDot, { backgroundColor: Colors.typescript }]} />
                <Text style={[styles.splitHeaderText, { color: Colors.typescript }]}>TypeScript</Text>
              </View>
              <View style={styles.flex}>
                <CodeEditor
                  key={`split_ts_${problem.id}`}
                  value={problem.typescript}
                  onChange={() => {}}
                  language="typescript"
                  readOnly
                />
              </View>
              <OutputConsole result={tsResult} isRunning={isRunning} onClear={clearBothResults} />
            </View>
          </ScrollView>

          {/* Split mode hint */}
          <View style={styles.splitHint}>
            <Text style={styles.splitHintText}>← Swipe to see TypeScript →</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bg1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  problemTitle: {
    color: Colors.text,
    fontFamily: Typography.mono,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.bg0,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  modeBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  modeBtnActive: {
    backgroundColor: Colors.bg3,
  },
  modeBtnText: {
    color: Colors.textMuted,
    fontFamily: Typography.mono,
    fontSize: 12,
  },
  modeBtnTextActive: {
    color: Colors.text,
    fontWeight: '600',
  },
  // Flip mode
  flipSwitcher: {
    flexDirection: 'row',
    backgroundColor: Colors.bg1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  flipTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  langDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  flipTabText: {
    fontFamily: Typography.mono,
    fontSize: 13,
    fontWeight: '600',
  },
  flipBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  flipBtnText: {
    color: Colors.textMuted,
    fontSize: 16,
  },
  // Split mode
  splitPanel: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  splitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bg1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  splitHeaderText: {
    fontFamily: Typography.mono,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  splitHint: {
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    backgroundColor: Colors.bg1,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  splitHintText: {
    color: Colors.textFaint,
    fontFamily: Typography.mono,
    fontSize: 11,
  },
});
