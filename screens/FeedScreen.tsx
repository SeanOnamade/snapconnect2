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
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { theme } from '../theme/colors';

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
}

export default function FeedScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSnap, setSelectedSnap] = useState<Snap | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const { snaps, setSnaps, userData, logout } = useStore();

  useEffect(() => {
    loadSnaps();
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
        
        // Get owner email
        let ownerEmail = 'Unknown';
        try {
          const userDoc = await getDoc(doc(db, 'users', data.owner));
          if (userDoc.exists()) {
            ownerEmail = userDoc.data().email || 'Unknown';
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

  const generateQuickReply = () => {
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      logout();
      navigation.replace('Auth');
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
                    {item.ownerEmail?.[0]?.toUpperCase() || '?'}
                  </Text>
                </LinearGradient>
                <View>
                  <Text style={styles.snapOwner}>{item.ownerEmail}</Text>
                  <Text style={styles.timeAgo}>{getTimeAgo(item.createdAt)}</Text>
                </View>
              </View>
              <View style={styles.timeRemainingContainer}>
                <LinearGradient
                  colors={['#fb923c', '#f97316']}
                  style={styles.timeRemainingBadge}
                >
                  <Text style={styles.timeRemaining}>⏰ {getTimeRemaining(item.expiresAt)}</Text>
                </LinearGradient>
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
              onPress={() => navigation.navigate('Camera')}
            >
              <LinearGradient
                colors={['#fb923c', '#f97316']}
                style={styles.headerButtonGradient}
              >
                <Text style={styles.headerButtonText}>📷</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
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
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => navigation.navigate('Camera')}
            >
              <LinearGradient
                colors={['#fb923c', '#f97316']}
                style={styles.emptyStateButtonGradient}
              >
                <Text style={styles.emptyStateButtonText}>📷 Take a Snap</Text>
              </LinearGradient>
            </TouchableOpacity>
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
                  <Image source={{ uri: selectedSnap.url }} style={styles.modalImage} />
                  <Text style={styles.modalCaption}>{selectedSnap.caption}</Text>
                  <Text style={styles.modalOwner}>by {selectedSnap.ownerEmail}</Text>
                  
                  <TextInput
                    style={styles.replyInput}
                    placeholder="Send a quick reply..."
                    placeholderTextColor={theme.colors.neutral.gray[400]}
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                    maxLength={100}
                  />
                  
                  <TouchableOpacity
                    style={styles.suggestReplyButton}
                    onPress={generateQuickReply}
                  >
                    <LinearGradient
                      colors={['#fb923c', '#f97316']}
                      style={styles.suggestReplyGradient}
                    >
                      <Text style={styles.suggestReplyText}>✨ Quick Reply</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <View style={styles.modalButtons}>
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
                  </View>
                </>
              )}
            </View>
          </LinearGradient>
        </View>
      </Modal>
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
  replyInput: {
    borderWidth: 2,
    borderColor: theme.colors.neutral.gray[200],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 16,
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
});