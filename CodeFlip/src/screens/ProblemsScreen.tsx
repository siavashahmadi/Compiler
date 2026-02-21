import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  Modal,
  Pressable,
} from 'react-native';
import { useStore } from '../store/useStore';
import { Problem } from '../types';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';

interface Props {
  onSelectProblem?: () => void; // called after selecting, e.g. to switch tab
}

export default function ProblemsScreen({ onSelectProblem }: Props) {
  const problems = useStore((s) => s.problems);
  const currentProblemId = useStore((s) => s.currentProblemId);
  const setCurrentProblem = useStore((s) => s.setCurrentProblem);
  const addProblem = useStore((s) => s.addProblem);
  const deleteProblem = useStore((s) => s.deleteProblem);
  const renameProblem = useStore((s) => s.renameProblem);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleAdd = () => {
    const title = newTitle.trim();
    if (!title) return;
    addProblem(title);
    setNewTitle('');
    setShowAddModal(false);
    onSelectProblem?.();
  };

  const handleSelect = (id: string) => {
    setCurrentProblem(id);
    onSelectProblem?.();
  };

  const handleLongPress = (problem: Problem) => {
    Alert.alert(problem.title, 'What would you like to do?', [
      {
        text: 'Rename',
        onPress: () => {
          setEditingId(problem.id);
          setEditTitle(problem.title);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete Problem', `Delete "${problem.title}"?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteProblem(problem.id) },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleRenameSubmit = () => {
    if (editingId && editTitle.trim()) {
      renameProblem(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const renderProblem = ({ item, index }: { item: Problem; index: number }) => {
    const isActive = item.id === currentProblemId;
    const isEditing = editingId === item.id;

    return (
      <TouchableOpacity
        style={[styles.problemRow, isActive && styles.problemRowActive]}
        onPress={() => handleSelect(item.id)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.problemIndex}>
          <Text style={styles.indexText}>{String(index + 1).padStart(2, '0')}</Text>
        </View>

        <View style={styles.problemInfo}>
          {isEditing ? (
            <TextInput
              style={styles.renameInput}
              value={editTitle}
              onChangeText={setEditTitle}
              onSubmitEditing={handleRenameSubmit}
              onBlur={handleRenameSubmit}
              autoFocus
              selectTextOnFocus
            />
          ) : (
            <Text style={[styles.problemTitle, isActive && styles.problemTitleActive]}>
              {item.title}
            </Text>
          )}
          <Text style={styles.problemMeta}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.problemBadges}>
          <View style={[styles.langBadge, { backgroundColor: Colors.typescript + '20' }]}>
            <Text style={[styles.langBadgeText, { color: Colors.typescript }]}>TS</Text>
          </View>
          <View style={[styles.langBadge, { backgroundColor: Colors.python + '20' }]}>
            <Text style={[styles.langBadgeText, { color: Colors.python }]}>PY</Text>
          </View>
        </View>

        {isActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Problems</Text>
          <Text style={styles.headerSub}>{problems.length} solution{problems.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Problem list */}
      <FlatList
        data={problems}
        keyExtractor={(item) => item.id}
        renderItem={renderProblem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
      />

      {/* Add problem modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>New Problem</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Binary Search"
              placeholderTextColor={Colors.textFaint}
              value={newTitle}
              onChangeText={setNewTitle}
              onSubmitEditing={handleAdd}
              autoFocus
              returnKeyType="done"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowAddModal(false); setNewTitle(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalAddBtn, !newTitle.trim() && styles.modalAddBtnDisabled]}
                onPress={handleAdd}
                disabled={!newTitle.trim()}
              >
                <Text style={styles.modalAddText}>Create</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Typography.mono,
    letterSpacing: -0.3,
  },
  headerSub: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: Typography.mono,
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: Colors.accentRun,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  addBtnText: {
    color: '#fff',
    fontFamily: Typography.mono,
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxl,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 56 + Spacing.md,
  },
  problemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bg1,
    position: 'relative',
  },
  problemRowActive: {
    backgroundColor: Colors.bg2,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.accent,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  problemIndex: {
    width: 44,
    alignItems: 'center',
  },
  indexText: {
    color: Colors.textFaint,
    fontFamily: Typography.mono,
    fontSize: 12,
  },
  problemInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  problemTitle: {
    color: Colors.textMuted,
    fontFamily: Typography.sans,
    fontSize: Typography.bodySize,
    fontWeight: '500',
  },
  problemTitleActive: {
    color: Colors.text,
    fontWeight: '600',
  },
  problemMeta: {
    color: Colors.textFaint,
    fontFamily: Typography.mono,
    fontSize: 11,
    marginTop: 2,
  },
  renameInput: {
    color: Colors.text,
    fontFamily: Typography.mono,
    fontSize: Typography.bodySize,
    borderBottomWidth: 1,
    borderBottomColor: Colors.accent,
    paddingVertical: 2,
  },
  problemBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  langBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  langBadgeText: {
    fontFamily: Typography.mono,
    fontSize: 10,
    fontWeight: '700',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    color: Colors.text,
    fontFamily: Typography.mono,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.lg,
  },
  modalInput: {
    backgroundColor: Colors.bg0,
    color: Colors.text,
    fontFamily: Typography.mono,
    fontSize: 14,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    color: Colors.textMuted,
    fontFamily: Typography.mono,
    fontSize: 14,
  },
  modalAddBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentRun,
    alignItems: 'center',
  },
  modalAddBtnDisabled: {
    opacity: 0.4,
  },
  modalAddText: {
    color: '#fff',
    fontFamily: Typography.mono,
    fontSize: 14,
    fontWeight: '600',
  },
});
