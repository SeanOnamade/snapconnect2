import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Button,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../lib/firebase';
import { deleteDoc, doc, addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import * as Clipboard from 'expo-clipboard';
import { theme } from '../theme/colors';

const { width, height } = Dimensions.get('window');

interface Snap {
  id: string;
  url: string;
  caption: string;
  owner: string;
  interests: string[];
  expiresAt: Date;
  createdAt: Date;
  ownerEmail?: string;
  ownerFirstName?: string;
}

interface SnapViewerScreenProps {
  snap: Snap;
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

export default function SnapViewerScreen({ snap, visible, onClose, navigation }: SnapViewerScreenProps) {
  const [replySuggestion, setReplySuggestion] = useState<string | null>(null);
  const [isLoadingReply, setIsLoadingReply] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditCaptionModal, setShowEditCaptionModal] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');
  const [isUpdatingCaption, setIsUpdatingCaption] = useState(false);

  const getQuickReply = async () => {
    setIsLoadingReply(true);
    try {
      const fn = httpsCallable(functions, 'quickReply');
      const { data } = await fn({ caption: snap.caption });
      setReplySuggestion(data as string);
      setShowReplyModal(true);
    } catch (error) {
      console.log('Error getting quick reply:', error);
      Alert.alert('Error', 'Failed to generate quick reply. Please try again.');
    } finally {
      setIsLoadingReply(false);
    }
  };

  const copyToClipboard = async () => {
    if (replySuggestion) {
      try {
        await Clipboard.setStringAsync(replySuggestion);
        Alert.alert('Copied!', 'Reply copied to clipboard');
        setShowReplyModal(false);
        setReplySuggestion(null);
      } catch (error) {
        console.log('Error copying to clipboard:', error);
        Alert.alert('Error', 'Failed to copy to clipboard');
      }
    }
  };

  const sendReply = async () => {
    if (!replySuggestion || !auth.currentUser) return;
    
    try {
      console.log('🚀 Sending reply notification:', {
        toUid: snap.owner,
        fromUid: auth.currentUser.uid,
        snapId: snap.id,
        text: replySuggestion,
      });
      
      // Create notification document
      const docRef = await addDoc(collection(db, 'notifications'), {
        toUid: snap.owner,
        fromUid: auth.currentUser.uid,
        snapId: snap.id,
        text: replySuggestion,
        createdAt: serverTimestamp(),
        seen: false
      });
      
      console.log('✅ Notification created with ID:', docRef.id);
      Alert.alert('Sent!', 'Your reply has been sent');
      setShowReplyModal(false);
      setReplySuggestion(null);
    } catch (error) {
      console.error('❌ Error sending reply:', error);
      Alert.alert('Error', 'Failed to send reply. Please try again.');
    }
  };

  const closeReplyModal = () => {
    setShowReplyModal(false);
    setReplySuggestion(null);
  };

  const handleEditTags = () => {
    onClose(); // Close the snap viewer first
    navigation.navigate('EditTags', {
      snapId: snap.id,
      tags: snap.interests,
    });
  };

  const handleEditCaption = () => {
    setEditedCaption(snap.caption);
    setShowEditCaptionModal(true);
  };

  const handleSaveCaption = async () => {
    if (isUpdatingCaption) return;
    
    setIsUpdatingCaption(true);
    try {
      await updateDoc(doc(db, "snaps", snap.id), {
        caption: editedCaption.trim()
      });
      
      Alert.alert(
        'Success!',
        'Caption updated successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowEditCaptionModal(false);
              // Update the snap object for immediate UI update
              snap.caption = editedCaption.trim();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error updating caption:', error);
      Alert.alert('Error', 'Failed to update caption. Please try again.');
    } finally {
      setIsUpdatingCaption(false);
    }
  };

  const handleCancelEditCaption = () => {
    setShowEditCaptionModal(false);
    setEditedCaption('');
  };

  const confirmDeleteSnap = () => {
    Alert.alert(
      'Delete Snap',
      'Are you sure you want to delete this snap? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteSnap },
      ]
    );
  };

  const deleteSnap = async () => {
    if (!snap.id) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'snaps', snap.id));
      Alert.alert('Success', 'Snap deleted successfully');
      onClose(); // Close the modal after successful deletion
    } catch (error) {
      console.error('Error deleting snap:', error);
      Alert.alert('Error', 'Failed to delete snap. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  const getTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h left`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m left`;
    } else {
      return 'Expired';
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={styles.container}>
          <LinearGradient
            colors={['#1e1b4b', '#312e81', '#3730a3']}
            style={styles.gradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Snap</Text>
              <View style={styles.headerRight} />
            </View>

            {/* Snap Content */}
            <View style={styles.snapContainer}>
              <Image source={{ uri: snap.url }} style={styles.snapImage} />
              
              {/* Snap Info Overlay */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.snapOverlay}
              >
                <View style={styles.snapInfo}>
                  <View style={styles.userInfo}>
                    <LinearGradient
                      colors={['#2dd4bf', '#14b8a6']}
                      style={styles.avatarPlaceholder}
                    >
                      <Text style={styles.avatarText}>
                        {(snap.ownerFirstName || snap.ownerEmail)?.[0]?.toUpperCase() || '?'}
                      </Text>
                    </LinearGradient>
                    <View style={styles.userDetails}>
                      <Text style={styles.ownerName}>{snap.ownerFirstName || snap.ownerEmail}</Text>
                      <Text style={styles.timeInfo}>
                        {getTimeAgo(snap.createdAt)} • {getTimeRemaining(snap.expiresAt)}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.caption}>{snap.caption}</Text>
                </View>
              </LinearGradient>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              {/* Quick Reply Button */}
              <TouchableOpacity
                style={styles.quickReplyButton}
                onPress={getQuickReply}
                disabled={isLoadingReply}
              >
                <LinearGradient
                  colors={isLoadingReply ? ['#9ca3af', '#6b7280'] : ['#8b5cf6', '#7c3aed']}
                  style={styles.quickReplyButtonGradient}
                >
                  {isLoadingReply ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.quickReplyButtonText}>✨ Quick Reply</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Edit and Delete buttons - only show for own snaps */}
              {auth.currentUser && snap.owner === auth.currentUser.uid && (
                <View style={styles.ownPostButtons}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={handleEditCaption}
                    disabled={isDeleting}
                  >
                    <LinearGradient
                      colors={['#8b5cf6', '#7c3aed']}
                      style={styles.editButtonGradient}
                    >
                      <Text style={styles.editButtonText}>📝 Edit Caption</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={handleEditTags}
                    disabled={isDeleting}
                  >
                    <LinearGradient
                      colors={['#00c2c7', '#14b8a6']}
                      style={styles.editButtonGradient}
                    >
                      <Text style={styles.editButtonText}>✏️ Edit Tags</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={confirmDeleteSnap}
                    disabled={isDeleting}
                  >
                    <LinearGradient
                      colors={isDeleting ? ['#9ca3af', '#6b7280'] : ['#ef4444', '#dc2626']}
                      style={styles.deleteButtonGradient}
                    >
                      {isDeleting ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </LinearGradient>
        </SafeAreaView>
      </Modal>

      {/* Reply Suggestion Modal */}
      <Modal
        visible={showReplyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeReplyModal}
      >
        <View style={styles.replyModalOverlay}>
          <View style={styles.replyModalContent}>
            <LinearGradient
              colors={['#1e1b4b', '#312e81']}
              style={styles.replyModalGradient}
            >
              {/* Close button */}
              <TouchableOpacity style={styles.replyModalCloseButton} onPress={closeReplyModal}>
                <Text style={styles.replyModalCloseText}>✕</Text>
              </TouchableOpacity>
              
              <Text style={styles.replyModalTitle}>Quick Reply Suggestion</Text>
              
              <View style={styles.replyTextContainer}>
                <Text style={styles.replyText}>{replySuggestion}</Text>
              </View>

              <View style={styles.replyModalButtons}>
                <TouchableOpacity
                  style={styles.replyModalButton}
                  onPress={sendReply}
                >
                  <LinearGradient
                    colors={['#2563eb', '#1d4ed8']}
                    style={styles.replyModalButtonGradient}
                  >
                    <Text style={styles.replyModalButtonText}>📤 Send Reply</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.replyModalButton}
                  onPress={copyToClipboard}
                >
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={styles.replyModalButtonGradient}
                  >
                    <Text style={styles.replyModalButtonText}>📋 Copy</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.replyModalButton}
                  onPress={closeReplyModal}
                >
                  <LinearGradient
                    colors={['#6b7280', '#4b5563']}
                    style={styles.replyModalButtonGradient}
                  >
                    <Text style={styles.replyModalButtonText}>Close</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Edit Caption Modal */}
      <Modal
        visible={showEditCaptionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelEditCaption}
      >
        <KeyboardAvoidingView
          style={styles.editCaptionModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.editCaptionModalContent}>
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed']}
              style={styles.editCaptionModalGradient}
            >
              {/* Header */}
              <View style={styles.editCaptionHeader}>
                <TouchableOpacity
                  style={styles.editCaptionCancelButton}
                  onPress={handleCancelEditCaption}
                >
                  <Text style={styles.editCaptionCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <Text style={styles.editCaptionTitle}>Edit Caption</Text>
                
                <TouchableOpacity
                  style={[styles.editCaptionSaveButton, isUpdatingCaption && styles.editCaptionSaveButtonDisabled]}
                  onPress={handleSaveCaption}
                  disabled={isUpdatingCaption}
                >
                  {isUpdatingCaption ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.editCaptionSaveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Content */}
              <View style={styles.editCaptionContent}>
                <Text style={styles.editCaptionInstruction}>
                  Edit your caption to better describe your snap
                </Text>
                
                <View style={styles.editCaptionInputContainer}>
                  <TextInput
                    style={styles.editCaptionInput}
                    placeholder="What's happening?"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    value={editedCaption}
                    onChangeText={setEditedCaption}
                    multiline
                    maxLength={150}
                    autoFocus
                  />
                  
                  {/* Character counter */}
                  <Text style={styles.editCaptionCharacterCounter}>
                    {editedCaption.length}/150
                  </Text>
                </View>
                
                <Text style={styles.editCaptionHint}>
                  💡 Tip: Keep it engaging and authentic
                </Text>
              </View>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButtonText: {
    color: theme.colors.neutral.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: theme.colors.neutral.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
  },
  snapContainer: {
    flex: 1,
    position: 'relative',
  },
  snapImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  snapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    justifyContent: 'flex-end',
  },
  snapInfo: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: theme.colors.neutral.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  ownerName: {
    color: theme.colors.neutral.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeInfo: {
    color: theme.colors.neutral.white,
    fontSize: 12,
    opacity: 0.8,
  },
  caption: {
    color: theme.colors.neutral.white,
    fontSize: 16,
    lineHeight: 24,
  },
  buttonContainer: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  quickReplyButton: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  quickReplyButtonGradient: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  quickReplyButtonText: {
    color: theme.colors.neutral.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Reply Modal Styles
  replyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  replyModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  replyModalGradient: {
    padding: theme.spacing.lg,
  },
  replyModalCloseButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: 30,
    height: 30,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  replyModalCloseText: {
    color: theme.colors.neutral.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  replyModalTitle: {
    color: theme.colors.neutral.white,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  replyTextContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  replyText: {
    color: theme.colors.neutral.white,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  replyModalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  replyModalButton: {
    flex: 1,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  replyModalButtonGradient: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  replyModalButtonText: {
    color: theme.colors.neutral.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Own Post Action Buttons
  ownPostButtons: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  editButton: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  editButtonGradient: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  editButtonText: {
    color: theme.colors.neutral.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButton: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  deleteButtonGradient: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  deleteButtonText: {
    color: theme.colors.neutral.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Edit Caption Modal Styles
  editCaptionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  editCaptionModalContent: {
    backgroundColor: theme.colors.neutral.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  editCaptionModalGradient: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  editCaptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  editCaptionCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  editCaptionCancelButtonText: {
    color: theme.colors.neutral.white,
    fontSize: 16,
    fontWeight: '600',
  },
  editCaptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.neutral.white,
    flex: 1,
    textAlign: 'center',
  },
  editCaptionSaveButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  editCaptionSaveButtonDisabled: {
    opacity: 0.6,
  },
  editCaptionSaveButtonText: {
    color: theme.colors.neutral.white,
    fontSize: 16,
    fontWeight: '600',
  },
  editCaptionContent: {
    gap: theme.spacing.md,
  },
  editCaptionInstruction: {
    fontSize: 16,
    color: theme.colors.neutral.white,
    textAlign: 'center',
    opacity: 0.9,
  },
  editCaptionInputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    position: 'relative',
  },
  editCaptionInput: {
    color: theme.colors.neutral.white,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editCaptionCharacterCounter: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    right: theme.spacing.sm,
    color: theme.colors.neutral.white,
    fontSize: 12,
    opacity: 0.7,
  },
  editCaptionHint: {
    fontSize: 14,
    color: theme.colors.neutral.white,
    textAlign: 'center',
    opacity: 0.7,
  },
}); 