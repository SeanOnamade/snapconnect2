import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../lib/firebase';
import { theme } from '../theme/colors';

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

interface FeedCardProps {
  snap: Snap;
  onPress?: (snap: Snap) => void;
}

export default function FeedCard({ snap, onPress }: FeedCardProps) {
  const navigation = useNavigation();
  const currentUser = auth.currentUser;

  const handleEditTags = () => {
    // @ts-ignore - Navigation types not fully configured
    navigation.navigate('EditTags', {
      snapId: snap.id,
      tags: snap.interests,
    });
  };
  const getTimeAgo = (date: any) => {
    const now = new Date();
    // Convert Firestore Timestamp to Date if needed
    const dateObj = date?.toDate ? date.toDate() : date;
    if (!dateObj) return 'Unknown';
    
    const diffMs = now.getTime() - dateObj.getTime();
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

  const getTimeRemaining = (expiresAt: any) => {
    const now = new Date();
    // Convert Firestore Timestamp to Date if needed
    const dateObj = expiresAt?.toDate ? expiresAt.toDate() : expiresAt;
    if (!dateObj) return 'Unknown';
    
    const diffMs = dateObj.getTime() - now.getTime();
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
    <TouchableOpacity 
      style={styles.snapCard} 
      onPress={() => onPress?.(snap)}
      activeOpacity={0.95}
    >
      <View style={styles.snapContainer}>
        <Image source={{ uri: snap.url }} style={styles.snapImage} />
        
        {/* Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.snapOverlay}
        >
          <View style={styles.snapContent}>
            <View style={styles.snapHeader}>
              <View style={styles.userInfo}>
                <LinearGradient
                  colors={['#00c2c7', '#14b8a6']}
                  style={styles.avatarPlaceholder}
                >
                  <Text style={styles.avatarText}>
                    {(snap.ownerFirstName || snap.ownerEmail)?.[0]?.toUpperCase() || '?'}
                  </Text>
                </LinearGradient>
                <View>
                  <Text style={styles.snapOwner}>{snap.ownerFirstName || snap.ownerEmail}</Text>
                  <Text style={styles.timeAgo}>{getTimeAgo(snap.createdAt)}</Text>
                </View>
              </View>
              <View style={styles.headerActions}>
                {/* Edit button for user's own snaps */}
                {currentUser?.uid === snap.owner && (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={handleEditTags}
                  >
                    <Text style={styles.editIcon}>✏️</Text>
                  </TouchableOpacity>
                )}
                
                <View style={styles.timeRemainingContainer}>
                  <LinearGradient
                    colors={['#fb923c', '#f97316']}
                    style={styles.timeRemainingBadge}
                  >
                    <Text style={styles.timeRemaining}>⏰ {getTimeRemaining(snap.expiresAt)}</Text>
                  </LinearGradient>
                </View>
              </View>
            </View>
            
            <Text style={styles.snapCaption}>{snap.caption}</Text>
            
            <View style={styles.snapFooter}>
              <View style={styles.interestsTags}>
                {snap.interests.slice(0, 3).map((interest, index) => (
                  <View key={index} style={styles.interestTag}>
                    <Text style={styles.interestTagText}>#{interest.toLowerCase()}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.replyButton}>
                <LinearGradient
                  colors={['#00c2c7', '#14b8a6']}
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
}

const styles = StyleSheet.create({
  snapCard: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
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
  // Edit functionality styles
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    fontSize: 14,
  },
}); 