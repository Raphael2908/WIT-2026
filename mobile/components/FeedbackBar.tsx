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

interface FeedbackBarProps {
  onConfirm: () => void;
  onEdit: () => void;
  visible: boolean;
  initialText?: string;
  onSubmitEdit?: (correctedText: string) => void;
}

export default function FeedbackBar({
  onConfirm,
  onEdit,
  visible,
  initialText = '',
  onSubmitEdit,
}: FeedbackBarProps) {
  const slideAnim = useRef(new Animated.Value(100)).current;
  const [modalVisible, setModalVisible] = useState(false);
  const [editedText, setEditedText] = useState(initialText);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 100,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [visible, slideAnim]);

  useEffect(() => {
    setEditedText(initialText);
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
          <Text style={styles.buttonText}>✓ Correct</Text>
        </Pressable>

        <Pressable
          onPress={handleEditPress}
          style={[styles.button, styles.editButton]}
          accessibilityLabel="Edit decoded text"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>✎ Edit</Text>
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  confirmButton: {
    backgroundColor: '#10B981',
  },
  editButton: {
    backgroundColor: '#3B82F6',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
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
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#6B7280',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
  },
});
