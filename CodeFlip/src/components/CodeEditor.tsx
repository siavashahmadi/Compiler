import React, { useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  Text,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputScrollEventData,
} from 'react-native';
import { Colors, Typography, Spacing } from '../constants/theme';

interface Props {
  value: string;
  onChange: (text: string) => void;
  language: 'python' | 'typescript';
  readOnly?: boolean;
}

export default function CodeEditor({ value, onChange, language, readOnly = false }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  const lines = value.split('\n');
  const lineCount = Math.max(lines.length, 1);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<TextInputScrollEventData>) => {
      // Keep outer scroll in sync if needed
    },
    []
  );

  return (
    <View style={styles.container}>
      {/* Language badge */}
      <View style={[styles.badge, { backgroundColor: language === 'python' ? Colors.python + '22' : Colors.typescript + '22' }]}>
        <Text style={[styles.badgeText, { color: language === 'python' ? Colors.python : Colors.typescript }]}>
          {language === 'python' ? 'PY' : 'TS'}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={true}
        indicatorStyle="white"
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        horizontal={false}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEventThrottle={16}>
          <View style={styles.editorRow}>
            {/* Line numbers */}
            <View style={styles.lineNumbers} pointerEvents="none">
              {Array.from({ length: lineCount }, (_, i) => (
                <Text key={i} style={styles.lineNumber}>
                  {i + 1}
                </Text>
              ))}
            </View>

            {/* Code input */}
            <TextInput
              style={styles.codeInput}
              value={value}
              onChangeText={onChange}
              multiline
              scrollEnabled={false}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              keyboardType="default"
              editable={!readOnly}
              onScroll={handleScroll}
              textAlignVertical="top"
              selectionColor={Colors.accent}
              cursorColor={Colors.accent}
              placeholderTextColor={Colors.textFaint}
              placeholder={`// Start coding...`}
            />
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg0,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    zIndex: 10,
  },
  badgeText: {
    fontFamily: Typography.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  editorRow: {
    flexDirection: 'row',
    minHeight: '100%',
    paddingBottom: 120, // breathing room below last line
  },
  lineNumbers: {
    width: 44,
    paddingTop: Spacing.md,
    paddingLeft: Spacing.sm,
    alignItems: 'flex-end',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    backgroundColor: Colors.bg1,
  },
  lineNumber: {
    fontFamily: Typography.mono,
    fontSize: Typography.editorSize,
    lineHeight: 22,
    color: Colors.textFaint,
    paddingRight: Spacing.sm,
    minWidth: 28,
    textAlign: 'right',
  },
  codeInput: {
    flex: 1,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    fontFamily: Typography.mono,
    fontSize: Typography.editorSize,
    lineHeight: 22,
    color: Colors.text,
    backgroundColor: Colors.bg0,
    minWidth: 600, // allow horizontal scroll for long lines
  },
});
