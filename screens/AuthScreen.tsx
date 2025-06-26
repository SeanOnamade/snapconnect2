import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { theme } from '../theme/colors';

const { width, height } = Dimensions.get('window');

const INTERESTS = [
  'Photography', 'Music', 'Sports', 'Travel', 'Food', 'Art', 'Technology',
  'Fitness', 'Movies', 'Books', 'Gaming', 'Fashion', 'Nature', 'Dance'
];

export default function AuthScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        // Store user interests after signup
        await setDoc(doc(db, 'users', result.user.uid), {
          interests: selectedInterests,
          email: email,
          createdAt: new Date(),
        });
        Alert.alert('Success', 'Account created successfully!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigation.replace('Camera');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  return (
          <LinearGradient
        colors={['#2dd4bf', '#fb923c']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#ffffff', '#ccfbf1']}
                style={styles.logoCircle}
              >
                <Text style={styles.logoEmoji}>📸</Text>
              </LinearGradient>
              <Text style={styles.title}>SnapConnect</Text>
              <Text style={styles.subtitle}>Share moments that disappear ✨</Text>
            </View>
          </View>

          {/* Main Card */}
          <View style={styles.card}>
            <LinearGradient
              colors={['#ffffffF0', '#ffffffE0']}
              style={styles.cardGradient}
            >
              <View style={styles.cardContent}>
                {/* Toggle Buttons */}
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      !isSignUp && styles.toggleButtonActive
                    ]}
                    onPress={() => setIsSignUp(false)}
                  >
                    <Text style={[
                      styles.toggleText,
                      !isSignUp && styles.toggleTextActive
                    ]}>
                      Sign In
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      isSignUp && styles.toggleButtonActive
                    ]}
                    onPress={() => setIsSignUp(true)}
                  >
                    <Text style={[
                      styles.toggleText,
                      isSignUp && styles.toggleTextActive
                    ]}>
                      Sign Up
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Form */}
                <View style={styles.form}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      placeholderTextColor={theme.colors.neutral.gray[400]}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor={theme.colors.neutral.gray[400]}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>

                  {/* Interests Section */}
                  {isSignUp && (
                    <View style={styles.interestsSection}>
                      <Text style={styles.interestsTitle}>What interests you? 🎯</Text>
                      <Text style={styles.interestsSubtitle}>
                        Select topics to personalize your feed
                      </Text>
                      <View style={styles.interestsGrid}>
                        {INTERESTS.map((interest) => (
                          <TouchableOpacity
                            key={interest}
                            style={[
                              styles.interestTag,
                              selectedInterests.includes(interest) && styles.selectedInterest
                            ]}
                            onPress={() => toggleInterest(interest)}
                          >
                            <Text style={[
                              styles.interestText,
                              selectedInterests.includes(interest) && styles.selectedInterestText
                            ]}>
                              {interest}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Action Button */}
                  <TouchableOpacity
                    style={[styles.actionButton, loading && styles.actionButtonDisabled]}
                    onPress={handleAuth}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={loading ? 
                        ['#94a3b8', '#64748b'] :
                        ['#2dd4bf', '#0d9488']
                      }
                      style={styles.actionButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.actionButtonText}>
                        {loading ? 'Loading...' : (isSignUp ? '🎉 Create Account' : '🚀 Sign In')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Made with ❤️ for sharing special moments
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.medium,
  },
  logoEmoji: {
    fontSize: 35,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.neutral.white,
    marginBottom: theme.spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.neutral.white,
    opacity: 0.9,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  card: {
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.large,
    marginBottom: theme.spacing.lg,
  },
  cardGradient: {
    borderRadius: theme.borderRadius.xl,
    padding: 2,
  },
  cardContent: {
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.xl - 2,
    padding: theme.spacing.lg,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.neutral.gray[100],
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    marginBottom: theme.spacing.lg,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.neutral.white,
    ...theme.shadows.small,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral.gray[600],
  },
  toggleTextActive: {
    color: theme.colors.primary[600],
  },
  form: {
    gap: theme.spacing.md,
  },
  inputContainer: {
    gap: theme.spacing.xs,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral.gray[700],
    marginLeft: 4,
  },
  input: {
    borderWidth: 2,
    borderColor: theme.colors.neutral.gray[200],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: 16,
    backgroundColor: theme.colors.neutral.gray[50],
  },
  interestsSection: {
    marginTop: theme.spacing.md,
  },
  interestsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.neutral.gray[800],
    marginBottom: theme.spacing.xs,
  },
  interestsSubtitle: {
    fontSize: 14,
    color: theme.colors.neutral.gray[600],
    marginBottom: theme.spacing.md,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  interestTag: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 2,
    borderColor: theme.colors.neutral.gray[300],
    backgroundColor: theme.colors.neutral.white,
  },
  selectedInterest: {
    backgroundColor: theme.colors.secondary[400],
    borderColor: theme.colors.secondary[400],
  },
  interestText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral.gray[700],
  },
  selectedInterestText: {
    color: theme.colors.neutral.white,
  },
  actionButton: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginTop: theme.spacing.md,
    ...theme.shadows.medium,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonGradient: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  actionButtonText: {
    color: theme.colors.neutral.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  footerText: {
    color: theme.colors.neutral.white,
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'center',
  },
}); 