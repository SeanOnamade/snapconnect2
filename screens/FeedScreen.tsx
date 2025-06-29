import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  addDoc,
  doc,
  getDoc,
  deleteDoc,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { db, auth, storage, functions, userDocRef } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { useStore } from '../store/useStore';
import { theme } from '../theme/colors';
import SnapViewerScreen from './SnapViewerScreen';

const { width } = Dimensions.get('window');

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

export default function FeedScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSnap, setSelectedSnap] = useState<Snap | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [deletingSnap, setDeletingSnap] = useState<string | null>(null);
  const [unsubscribeSnaps, setUnsubscribeSnaps] = useState<(() => void) | null>(null);
  const [showSnapViewer, setShowSnapViewer] = useState(false);
  const [isLoadingQuickReply, setIsLoadingQuickReply] = useState(false);
  const { snaps, setSnaps, userData, logout } = useStore();

  useEffect(() => {
    const unsubscribe = loadSnaps();
    setUnsubscribeSnaps(() => unsubscribe);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const loadSnaps = () => {
    const snapsQuery = query(
      collection(db, 'snaps'),
      where('expiresAt', '>', Timestamp.now()),
      orderBy('expiresAt', 'desc')
    );

    const unsubscribe = onSnapshot(snapsQuery, async (snapshot) => {
      const snapsData: Snap[] = [];
      
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        
        // Get owner data
        let ownerEmail = 'Unknown';
        let ownerFirstName = '';
        try {
          const userDoc = await getDoc(doc(db, 'users', data.owner));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            ownerEmail = userData.email || 'Unknown';
            ownerFirstName = userData.firstName || '';
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }

        snapsData.push({
          id: docSnapshot.id,
          url: data.url,
          caption: data.caption,
          owner: data.owner,
          interests: data.interests || [],
          expiresAt: data.expiresAt.toDate(),
          createdAt: data.createdAt.toDate(),
          ownerEmail,
          ownerFirstName,
        });
      }
      
      setSnaps(snapsData);
    });

    return unsubscribe;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleSnapPress = (snap: Snap) => {
    setSelectedSnap(snap);
    setShowReplyModal(true);
  };

  const generateQuickReply = async () => {
    if (!selectedSnap) return;
    
    setIsLoadingQuickReply(true);
    try {
      const fn = httpsCallable(functions, 'quickReply');
      const { data } = await fn({ caption: selectedSnap.caption });
      setReplyText(data as string);
    } catch (error) {
      console.log('Error getting AI quick reply:', error);
      // Fallback to random reply
      const replies = [
        "Love this! 😍",
        "Amazing shot! 📸",
        "So cool! ✨",
        "Great vibe! 🔥",
        "This is awesome! 👏",
        "Perfect moment! 💫",
        "Incredible! 🌟",
        "Beautiful! 💕",
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      setReplyText(randomReply);
    } finally {
      setIsLoadingQuickReply(false);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedSnap || !auth.currentUser) return;

    setSendingReply(true);
    try {
      await addDoc(collection(db, 'replies'), {
        snapId: selectedSnap.id,
        from: auth.currentUser.uid,
        to: selectedSnap.owner,
        message: replyText.trim(),
        createdAt: Timestamp.now(),
      });

      Alert.alert('Success', 'Reply sent!');
      setShowReplyModal(false);
      setReplyText('');
      setSelectedSnap(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to send reply');
      console.error(error);
    } finally {
      setSendingReply(false);
    }
  };

  const confirmDeleteSnap = (snap: Snap) => {
    Alert.alert(
      'Delete Snap',
      'Are you sure you want to delete this snap? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteSnap(snap),
        },
      ]
    );
  };

  const deleteSnap = async (snap: Snap) => {
    if (!auth.currentUser || snap.owner !== auth.currentUser.uid) {
      Alert.alert('Error', 'You can only delete your own snaps');
      return;
    }

    setDeletingSnap(snap.id);
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'snaps', snap.id));

      // Delete from Firebase Storage if it's a Firebase Storage URL
      if (snap.url.includes('firebasestorage.googleapis.com')) {
        try {
          // Extract the file path from the URL
          const urlParts = snap.url.split('/o/')[1];
          if (urlParts) {
            const filePath = decodeURIComponent(urlParts.split('?')[0]);
            const storageRef = ref(storage, filePath);
            await deleteObject(storageRef);
            console.log('Image deleted from Firebase Storage');
          }
        } catch (storageError) {
          console.log('Could not delete from storage, but Firestore deletion succeeded:', storageError);
          // Continue - Firestore deletion succeeded, storage deletion is optional
        }
      }

      Alert.alert('Success', 'Snap deleted successfully!');
    } catch (error) {
      console.error('Error deleting snap:', error);
      Alert.alert('Error', 'Failed to delete snap. Please try again.');
    } finally {
      setDeletingSnap(null);
    }
  };

  const handleLogout = async () => {
    try {
      // Clean up Firestore listeners first to prevent permission errors
      if (unsubscribeSnaps) {
        unsubscribeSnaps();
        setUnsubscribeSnaps(null);
      }
      
      await signOut(auth);
      logout();
      // No need for manual navigation - App.tsx handles this automatically via auth state
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
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

  const renderSnapItem = ({ item }: { item: Snap }) => (
    <TouchableOpacity style={styles.snapCard} onPress={() => handleSnapPress(item)}>
      <View style={styles.snapContainer}>
        <Image source={{ uri: item.url }} style={styles.snapImage} />
        
        {/* Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.snapOverlay}
        >
          <View style={styles.snapContent}>
            <View style={styles.snapHeader}>
              <View style={styles.userInfo}>
                <LinearGradient
                  colors={['#2dd4bf', '#14b8a6']}
                  style={styles.avatarPlaceholder}
                >
                  <Text style={styles.avatarText}>
                    {(item.ownerFirstName || item.ownerEmail)?.[0]?.toUpperCase() || '?'}
                  </Text>
                </LinearGradient>
                <View>
                  <Text style={styles.snapOwner}>{item.ownerFirstName || item.ownerEmail}</Text>
                  <Text style={styles.timeAgo}>{getTimeAgo(item.createdAt)}</Text>
                </View>
              </View>
              <View style={styles.snapHeaderRight}>
                <View style={styles.timeRemainingContainer}>
                  <LinearGradient
                    colors={['#fb923c', '#f97316']}
                    style={styles.timeRemainingBadge}
                  >
                    <Text style={styles.timeRemaining}>⏰ {getTimeRemaining(item.expiresAt)}</Text>
                  </LinearGradient>
                </View>
                {/* Removed edit/delete buttons - now in modal only */}
              </View>
            </View>
            
            <Text style={styles.snapCaption}>{item.caption}</Text>
            
            <View style={styles.snapFooter}>
              <View style={styles.interestsTags}>
                {item.interests.slice(0, 3).map((interest, index) => (
                  <View key={index} style={styles.interestTag}>
                    <Text style={styles.interestTagText}>#{interest.toLowerCase()}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.replyButton}>
                <LinearGradient
                  colors={['#2dd4bf', '#14b8a6']}
                  style={styles.replyButtonGradient}
                >
                  <Text style={styles.replyButtonText}>💬</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#2dd4bf', '#14b8a6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>SnapConnect</Text>
            <Text style={styles.headerSubtitle}>📸 Moments that matter</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={() => setShowSettingsDropdown(!showSettingsDropdown)}
            >
              <View style={styles.headerButtonSecondary}>
                <Text style={styles.headerButtonTextSecondary}>⚙️</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Feed */}
      <FlatList
        data={snaps}
        renderItem={renderSnapItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feedContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#2dd4bf']}
            tintColor={'#2dd4bf'}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['#2dd4bf', '#fb923c']}
              style={styles.emptyStateIcon}
            >
              <Text style={styles.emptyStateEmoji}>📸</Text>
            </LinearGradient>
            <Text style={styles.emptyStateTitle}>No snaps yet!</Text>
            <Text style={styles.emptyStateText}>
              Take your first snap to get started
            </Text>
            <View style={styles.emptyStateButton}>
              <LinearGradient
                colors={['#fb923c', '#f97316']}
                style={styles.emptyStateButtonGradient}
              >
                <Text style={styles.emptyStateButtonText}>📷 Use Camera Tab Below</Text>
              </LinearGradient>
            </View>
          </View>
        }
      />

      {/* Reply Modal */}
      <Modal
        visible={showReplyModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              {selectedSnap && (
                <>
                  {/* Close button */}
                  <TouchableOpacity 
                    style={styles.modalCloseButton} 
                    onPress={() => {
                      setShowReplyModal(false);
                      setReplyText('');
                      setSelectedSnap(null);
                    }}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                  
                  <Image source={{ uri: selectedSnap.url }} style={styles.modalImage} />
                  <Text style={styles.modalCaption}>{selectedSnap.caption}</Text>
                  <Text style={styles.modalOwner}>by {selectedSnap.ownerEmail}</Text>
                  
                  {/* Only show reply input for other people's snaps */}
                  {!(auth.currentUser && selectedSnap.owner === auth.currentUser.uid) && (
                    <>
                      <View style={styles.replyInputContainer}>
                        <TextInput
                          style={styles.replyInput}
                          placeholder="Send a quick reply..."
                          placeholderTextColor={theme.colors.neutral.gray[400]}
                          value={replyText}
                          onChangeText={setReplyText}
                          multiline
                          maxLength={100}
                          ref={(ref) => {
                            if (ref) {
                              (global as any).replyInputRef = ref;
                            }
                          }}
                        />
                        
                        {/* Checkmark button to dismiss keyboard */}
                        <TouchableOpacity
                          style={styles.replyCheckmark}
                          onPress={() => {
                            // Dismiss keyboard
                            if ((global as any).replyInputRef) {
                              (global as any).replyInputRef.blur();
                            }
                          }}
                        >
                          <Text style={styles.replyCheckmarkText}>✓</Text>
                        </TouchableOpacity>
                      </View>
                      
                      <TouchableOpacity
                        style={styles.suggestReplyButton}
                        onPress={generateQuickReply}
                        disabled={isLoadingQuickReply}
                      >
                        <LinearGradient
                          colors={isLoadingQuickReply ? ['#9ca3af', '#6b7280'] : ['#fb923c', '#f97316']}
                          style={styles.suggestReplyGradient}
                        >
                          <Text style={styles.suggestReplyText}>
                            {isLoadingQuickReply ? '⏳ AI Thinking...' : '✨ AI Quick Reply'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </>
                  )}
                  
                  <View style={styles.modalButtons}>
                    {/* Show edit button for own snaps, cancel button for others */}
                    {auth.currentUser && selectedSnap && selectedSnap.owner === auth.currentUser.uid ? (
                      <TouchableOpacity
                        style={[styles.modalButton, styles.sendButtonContainer]}
                        onPress={() => {
                          setShowReplyModal(false);
                          setReplyText('');
                          setSelectedSnap(null);
                          navigation.navigate('EditTags', {
                            snapId: selectedSnap.id,
                            tags: selectedSnap.interests,
                          });
                        }}
                      >
                        <LinearGradient
                          colors={['#00c2c7', '#14b8a6']}
                          style={styles.sendButtonGradient}
                        >
                          <Text style={styles.sendButtonText}>✏️ Edit Tags</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.modalButton}
                        onPress={() => {
                          setShowReplyModal(false);
                          setReplyText('');
                          setSelectedSnap(null);
                        }}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* Show delete button for own snaps, send button for others */}
                    {auth.currentUser && selectedSnap && selectedSnap.owner === auth.currentUser.uid ? (
                      <TouchableOpacity
                        style={[styles.modalButton, styles.sendButtonContainer]}
                        onPress={() => {
                          setShowReplyModal(false);
                          setReplyText('');
                          setSelectedSnap(null);
                          confirmDeleteSnap(selectedSnap);
                        }}
                        disabled={deletingSnap === selectedSnap.id}
                      >
                        <LinearGradient
                          colors={deletingSnap === selectedSnap.id ? ['#9ca3af', '#6b7280'] : ['#ef4444', '#dc2626']}
                          style={styles.sendButtonGradient}
                        >
                          <Text style={styles.sendButtonText}>
                            {deletingSnap === selectedSnap.id ? 'Deleting...' : '🗑️ Delete'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.modalButton, styles.sendButtonContainer]}
                        onPress={sendReply}
                        disabled={sendingReply || !replyText.trim()}
                      >
                        <LinearGradient
                          colors={['#2dd4bf', '#14b8a6']}
                          style={styles.sendButtonGradient}
                        >
                          <Text style={styles.sendButtonText}>
                            {sendingReply ? 'Sending...' : 'Send'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </View>
          </LinearGradient>
        </View>
      </Modal>

      {/* Settings Dropdown */}
      {showSettingsDropdown && (
        <Modal
          visible={showSettingsDropdown}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowSettingsDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setShowSettingsDropdown(false)}
          >
            <View style={styles.dropdownContainer}>
              <View style={styles.dropdownContent}>
                <TouchableOpacity 
                  style={styles.dropdownItem}
                  onPress={() => {
                    setShowSettingsDropdown(false);
                    navigation.navigate('Settings');
                  }}
                >
                  <Text style={styles.dropdownItemText}>⚙️ Settings</Text>
                  <Text style={styles.dropdownItemSubtext}>Edit profile & favorites</Text>
                </TouchableOpacity>
                
                <View style={styles.dropdownDivider} />
                
                <TouchableOpacity 
                  style={styles.dropdownItem}
                  onPress={() => {
                    setShowSettingsDropdown(false);
                    handleLogout();
                  }}
                >
                  <Text style={[styles.dropdownItemText, styles.logoutText]}>🚪 Log Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Example usage of SnapViewerScreen component */}
      {selectedSnap && (
        <SnapViewerScreen
          snap={selectedSnap}
          visible={showSnapViewer}
          navigation={navigation}
          onClose={() => {
            setShowSnapViewer(false);
            setSelectedSnap(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral.gray[50],
  },
  header: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.neutral.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.neutral.white,
    opacity: 0.9,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  headerButton: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  headerButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonSecondary: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: theme.borderRadius.lg,
  },
  headerButtonText: {
    fontSize: 18,
  },
  headerButtonTextSecondary: {
    fontSize: 18,
  },
  feedContainer: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  snapCard: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.large,
  },
  snapContainer: {
    position: 'relative',
  },
  snapImage: {
    width: '100%',
    height: 400,
    backgroundColor: theme.colors.neutral.gray[200],
  },
  snapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
  },
  snapContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  snapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: theme.colors.neutral.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  snapOwner: {
    color: theme.colors.neutral.white,
    fontSize: 16,
    fontWeight: '600',
  },
  timeAgo: {
    color: theme.colors.neutral.white,
    fontSize: 12,
    opacity: 0.8,
  },
  timeRemainingContainer: {
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  timeRemainingBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  timeRemaining: {
    color: theme.colors.neutral.white,
    fontSize: 11,
    fontWeight: '600',
  },
  snapCaption: {
    color: theme.colors.neutral.white,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  snapFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  interestsTags: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    flex: 1,
  },
  interestTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  interestTagText: {
    color: theme.colors.neutral.white,
    fontSize: 11,
    fontWeight: '500',
  },
  replyButton: {
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  replyButtonGradient: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyButtonText: {
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl * 2,
    gap: theme.spacing.md,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyStateEmoji: {
    fontSize: 35,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.neutral.gray[800],
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.neutral.gray[600],
    textAlign: 'center',
    maxWidth: 250,
  },
  emptyStateButton: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginTop: theme.spacing.md,
  },
  emptyStateButtonGradient: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  emptyStateButtonText: {
    color: theme.colors.neutral.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  modalContent: {
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    width: '100%',
    maxHeight: '80%',
    gap: theme.spacing.md,
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: 30,
    height: 30,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  modalCloseText: {
    color: theme.colors.neutral.gray[600],
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.lg,
  },
  modalCaption: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: theme.colors.neutral.gray[800],
  },
  modalOwner: {
    fontSize: 14,
    color: theme.colors.neutral.gray[600],
    textAlign: 'center',
  },
  replyInputContainer: {
    position: 'relative',
  },
  replyInput: {
    borderWidth: 2,
    borderColor: theme.colors.neutral.gray[200],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    paddingRight: 40, // Make room for checkmark
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  replyCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyCheckmarkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  suggestReplyButton: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  suggestReplyGradient: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  suggestReplyText: {
    color: theme.colors.neutral.white,
    fontWeight: '600',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  modalButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.neutral.gray[100],
  },
  sendButtonContainer: {
    backgroundColor: 'transparent',
    padding: 0,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    width: '100%',
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.neutral.gray[700],
    fontWeight: '600',
    fontSize: 16,
  },
  sendButtonText: {
    color: theme.colors.neutral.white,
    fontWeight: '600',
    fontSize: 16,
  },
  // Dropdown styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: theme.spacing.md,
  },
  dropdownContainer: {
    backgroundColor: 'transparent',
  },
  dropdownContent: {
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xs,
    minWidth: 180,
    ...theme.shadows.large,
  },
  dropdownItem: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.neutral.gray[800],
  },
  dropdownItemSubtext: {
    fontSize: 12,
    color: theme.colors.neutral.gray[500],
    marginTop: 2,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: theme.colors.neutral.gray[200],
    marginVertical: theme.spacing.xs,
  },
  logoutText: {
    color: '#ef4444',
  },
  // Delete snap styles
  snapHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
});