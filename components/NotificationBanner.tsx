import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme/colors';

interface Notification {
  id: string;
  to: string;
  from: string;
  snapId: string;
  message: string;
  createdAt: any;
  seen: boolean;
  fromUserEmail?: string;
  fromUserFirstName?: string;
}

interface NotificationBannerProps {
  notification: Notification | null;
  onDismiss: () => void;
}

export default function NotificationBanner({ notification, onDismiss }: NotificationBannerProps) {
  console.log('🎨 NotificationBanner render:', notification ? 'showing notification' : 'no notification');
  
  if (!notification) return null;

  const displayName = notification.fromUserFirstName || notification.fromUserEmail || 'Someone';
  
  console.log('📢 Displaying notification banner for:', displayName, 'Message:', notification.message);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#fb923c', '#2dd4bf']} // Orange to turquoise gradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              {displayName} replied to your snap:
            </Text>
            <Text style={styles.message} numberOfLines={2}>
              "{notification.message}"
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.dismissButton}
            onPress={onDismiss}
          >
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  gradient: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff', // white for red background
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: '#f0fdfa', // light teal-white for orange-turquoise gradient
    fontStyle: 'italic',
  },
  dismissButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    color: '#ffffff', // white for red background
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 