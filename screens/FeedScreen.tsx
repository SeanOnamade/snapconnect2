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
} from 'react-native';
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
    // The real-time listener will automatically update the data
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
    <TouchableOpacity style={styles.snapItem} onPress={() => handleSnapPress(item)}>
      <Image source={{ uri: item.url }} style={styles.snapImage} />
      <View style={styles.snapOverlay}>
        <View style={styles.snapHeader}>
          <Text style={styles.snapOwner}>{item.ownerEmail}</Text>
          <Text style={styles.timeAgo}>{getTimeAgo(item.createdAt)}</Text>
        </View>
        <Text style={styles.snapCaption}>{item.caption}</Text>
        <View style={styles.snapFooter}>
          <Text style={styles.timeRemaining}>{getTimeRemaining(item.expiresAt)}</Text>
          <View style={styles.interestsTags}>
            {item.interests.slice(0, 2).map((interest, index) => (
              <Text key={index} style={styles.interestTag}>
                #{interest.toLowerCase()}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SnapConnect</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Camera')}
          >
            <Text style={styles.headerButtonText}>📷</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
            <Text style={styles.headerButtonText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={snaps}
        renderItem={renderSnapItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feedContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No snaps yet!</Text>
            <Text style={styles.emptyStateText}>
              Take your first snap to get started
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => navigation.navigate('Camera')}
            >
              <Text style={styles.emptyStateButtonText}>📷 Take a Snap</Text>
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
          <View style={styles.modalContent}>
            {selectedSnap && (
              <>
                <Image source={{ uri: selectedSnap.url }} style={styles.modalImage} />
                <Text style={styles.modalCaption}>{selectedSnap.caption}</Text>
                <Text style={styles.modalOwner}>by {selectedSnap.ownerEmail}</Text>
                
                <TextInput
                  style={styles.replyInput}
                  placeholder="Send a quick reply..."
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                  maxLength={100}
                />
                
                <TouchableOpacity
                  style={styles.suggestReplyButton}
                  onPress={generateQuickReply}
                >
                  <Text style={styles.suggestReplyText}>✨ Quick Reply</Text>
                </TouchableOpacity>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowReplyModal(false);
                      setReplyText('');
                      setSelectedSnap(null);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.sendButton, sendingReply && styles.sendButtonDisabled]}
                    onPress={sendReply}
                    disabled={sendingReply || !replyText.trim()}
                  >
                    <Text style={styles.sendButtonText}>
                      {sendingReply ? 'Sending...' : 'Send'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 18,
  },
  feedContainer: {
    padding: 10,
  },
  snapItem: {
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  snapImage: {
    width: '100%',
    height: 300,
  },
  snapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 15,
  },
  snapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  snapOwner: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  timeAgo: {
    color: '#ddd',
    fontSize: 12,
  },
  snapCaption: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  snapFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeRemaining: {
    color: '#ddd',
    fontSize: 12,
  },
  interestsTags: {
    flexDirection: 'row',
    gap: 5,
  },
  interestTag: {
    color: '#ddd',
    fontSize: 11,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  emptyStateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 15,
  },
  modalCaption: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
    textAlign: 'center',
  },
  modalOwner: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  suggestReplyButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  suggestReplyText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: '#007AFF',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});