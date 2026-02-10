import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII } from '../utils/theme';

interface FeedbackBarProps {
  onConfirm: () => void;
  onEdit: () => void;
  onSave?: () => void;
  visible: boolean;
  initialText?: string;
  onSubmitEdit?: (correctedText: string) => void;
}

export default function FeedbackBar({
  onConfirm,
  onEdit,
  onSave,
  visible,
  initialText = '',
  onSubmitEdit,
}: FeedbackBarProps) {
  const slideAnim = useRef(new Animated.Value(100)).current;
  const [modalVisible, setModalVisible] = useState(false);
  const [editedText, setEditedText] = useState(initialText);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 100,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [visible, slideAnim]);

  useEffect(() => {
    setEditedText(initialText);
    setSaved(false);
  }, [initialText]);

  const handleEditPress = () => {
    setModalVisible(true);
    onEdit();
  };

  const handleSubmitEdit = () => {
    if (onSubmitEdit) {
      onSubmitEdit(editedText);
    }
    setModalVisible(false);
  };

  const handleCancelEdit = () => {
    setEditedText(initialText);
    setModalVisible(false);
  };

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Pressable
          onPress={onConfirm}
          style={[styles.button, styles.confirmButton]}
          accessibilityLabel="Confirm decoded text is correct"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Correct</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (onSave && !saved) {
              onSave();
              setSaved(true);
            }
          }}
          style={[styles.button, styles.saveButton, saved && styles.saveButtonDone]}
          accessibilityLabel={saved ? "Phrase saved" : "Save phrase to favorites"}
          accessibilityRole="button"
          disabled={saved}
        >
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={18}
            color={COLORS.buttonText}
            style={styles.saveIcon}
          />
          <Text style={styles.buttonText}>{saved ? "Saved!" : "Save"}</Text>
        </Pressable>

        <Pressable
          onPress={handleEditPress}
          style={[styles.button, styles.editButton]}
          accessibilityLabel="Edit decoded text"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Edit</Text>
        </Pressable>
      </Animated.View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancelEdit}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Decoded Text</Text>

            <TextInput
              style={styles.textInput}
              value={editedText}
              onChangeText={setEditedText}
              multiline
              numberOfLines={4}
              autoFocus
              accessibilityLabel="Edit text input"
            />

            <View style={styles.modalButtons}>
              <Pressable
                onPress={handleCancelEdit}
                style={[styles.modalButton, styles.cancelButton]}
                accessibilityLabel="Cancel editing"
                accessibilityRole="button"
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSubmitEdit}
                style={[styles.modalButton, styles.submitButton]}
                accessibilityLabel="Submit edited text"
                accessibilityRole="button"
              >
                <Text style={styles.buttonText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: RADII.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  confirmButton: {
    backgroundColor: COLORS.success,
  },
  saveButton: {
    backgroundColor: COLORS.accentAlt,
    flexDirection: 'row',
  },
  saveButtonDone: {
    opacity: 0.7,
  },
  saveIcon: {
    marginRight: 4,
  },
  editButton: {
    backgroundColor: COLORS.accent,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.buttonText,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.sm,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: RADII.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
  },
  submitButton: {
    backgroundColor: COLORS.buttonPrimary,
  },
});
