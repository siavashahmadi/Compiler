import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';
import { Language } from '../types';

interface Props {
  active: Language;
  onChange: (lang: Language) => void;
  pythonHasResult?: boolean;
  tsHasResult?: boolean;
}

const TABS: { lang: Language; label: string; color: string }[] = [
  { lang: 'typescript', label: 'TypeScript', color: Colors.typescript },
  { lang: 'python', label: 'Python', color: Colors.python },
];

export default function LanguageTabs({ active, onChange, pythonHasResult, tsHasResult }: Props) {
  return (
    <View style={styles.container}>
      {TABS.map(({ lang, label, color }) => {
        const isActive = active === lang;
        const hasResult = lang === 'python' ? pythonHasResult : tsHasResult;
        return (
          <TouchableOpacity
            key={lang}
            style={[styles.tab, isActive && { borderBottomColor: color, borderBottomWidth: 2 }]}
            onPress={() => onChange(lang)}
            activeOpacity={0.75}
          >
            <View style={styles.tabInner}>
              <View style={[styles.dot, { backgroundColor: color, opacity: isActive ? 1 : 0.3 }]} />
              <Text style={[styles.label, isActive ? { color } : { color: Colors.textMuted }]}>
                {label}
              </Text>
              {hasResult && <View style={styles.resultIndicator} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.bg1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontFamily: Typography.mono,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  resultIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.warning,
    marginLeft: 2,
  },
});
