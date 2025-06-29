import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../lib/firebase';
import { theme } from '../theme/colors';
import TagEditor from '../components/TagEditor';

interface EditTagsModalProps {
  route?: {
    params?: {
      snapId: string;
      tags: string[];
    };
  };
  navigation?: any;
}

export default function EditTagsModal({ route, navigation }: EditTagsModalProps) {
  const snapId = route?.params?.snapId || '';
  const initialTags = route?.params?.tags || [];
  const [localTags, setLocalTags] = useState<string[]>(initialTags);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSave = async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      const finalTags = localTags.length ? localTags : ["misc"];
      
      await updateDoc(doc(db, "snaps", snapId), {
        interests: finalTags
      });
      
              Alert.alert(
          'Success!',
          'Tags updated successfully',
          [
            {
              text: 'OK',
              onPress: () => navigation?.goBack()
            }
          ]
        );
    } catch (error) {
      console.error('Error updating tags:', error);
      Alert.alert('Error', 'Failed to update tags. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    navigation?.goBack();
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.modalContent}>
          {/* Header */}
          <LinearGradient
            colors={['#00c2c7', '#14b8a6']}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <Text style={styles.headerTitle}>Edit Tags</Text>
              
              <TouchableOpacity
                style={[styles.saveButton, isUpdating && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.instruction}>
              Add or remove tags to help others discover your snap
            </Text>
            
            <TagEditor
              tags={localTags}
              onChange={setLocalTags}
              placeholder="Add tags like #music, #food..."
            />
            
            <Text style={styles.hint}>
              💡 Tip: Use relevant tags to make your snap discoverable
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: theme.colors.neutral.white,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.neutral.white,
    flex: 1,
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: theme.colors.neutral.white,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: theme.colors.neutral.white,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  instruction: {
    fontSize: 16,
    color: theme.colors.neutral.gray[700],
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: theme.colors.neutral.gray[500],
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
}); 