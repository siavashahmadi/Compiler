import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore, useCurrentResult, useCurrentProblem } from '../store/useStore';
import CodeEditor from '../components/CodeEditor';
import OutputConsole from '../components/OutputConsole';
import LanguageTabs from '../components/LanguageTabs';
import RunButton from '../components/RunButton';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';

export default function EditorScreen() {
  const activeLanguage = useStore((s) => s.activeLanguage);
  const isRunning = useStore((s) => s.isRunning);
  const setActiveLanguage = useStore((s) => s.setActiveLanguage);
  const updateCode = useStore((s) => s.updateCode);
  const runCode = useStore((s) => s.runCode);
  const saveProblems = useStore((s) => s.saveProblems);
  const results = useStore((s) => s.results);
  const currentProblemId = useStore((s) => s.currentProblemId);

  const problem = useCurrentProblem();
  const result = useCurrentResult();

  const clearResult = useCallback(() => {
    const key = `${currentProblemId}_${activeLanguage}`;
    useStore.setState((s) => {
      const next = { ...s.results };
      delete next[key];
      return { results: next };
    });
  }, [currentProblemId, activeLanguage]);

  const code = activeLanguage === 'python' ? problem.python : problem.typescript;

  const pythonResultKey = `${currentProblemId}_python`;
  const tsResultKey = `${currentProblemId}_typescript`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Problem title bar */}
        <View style={styles.titleBar}>
          <Text style={styles.problemTitle} numberOfLines={1}>
            {problem.title}
          </Text>
          <RunButton onPress={runCode} isRunning={isRunning} />
        </View>

        {/* Language tabs */}
        <LanguageTabs
          active={activeLanguage}
          onChange={setActiveLanguage}
          pythonHasResult={!!results[pythonResultKey]}
          tsHasResult={!!results[tsResultKey]}
        />

        {/* Editor */}
        <View style={styles.editorContainer}>
          <CodeEditor
            key={`${problem.id}_${activeLanguage}`}
            value={code}
            onChange={updateCode}
            language={activeLanguage}
          />
        </View>

        {/* Output console */}
        <OutputConsole
          result={result}
          isRunning={isRunning}
          onClear={clearResult}
        />
      </KeyboardAvoidingView>
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
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bg1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  problemTitle: {
    color: Colors.text,
    fontFamily: Typography.mono,
    fontSize: Typography.titleSize,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.md,
  },
  editorContainer: {
    flex: 1,
  },
});
