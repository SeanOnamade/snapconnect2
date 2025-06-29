import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
}

interface FeedCardProps {
  snap: Snap;
  onPress?: (snap: Snap) => void;
}

export default function FeedCard({ snap, onPress }: FeedCardProps) {
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
                    {snap.ownerEmail?.[0]?.toUpperCase() || '?'}
                  </Text>
                </LinearGradient>
                <View>
                  <Text style={styles.snapOwner}>{snap.ownerEmail}</Text>
                  <Text style={styles.timeAgo}>{getTimeAgo(snap.createdAt)}</Text>
                </View>
              </View>
              <View style={styles.timeRemainingContainer}>
                <LinearGradient
                  colors={['#fb923c', '#f97316']}
                  style={styles.timeRemainingBadge}
                >
                  <Text style={styles.timeRemaining}>⏰ {getTimeRemaining(snap.expiresAt)}</Text>
                </LinearGradient>
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
}); 