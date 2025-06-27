import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { useStore } from './store/useStore';

// Import screens
import AuthScreen from './screens/AuthScreen';
import CameraScreen from './screens/CameraScreen';
import FeedScreen from './screens/FeedScreen';

const Stack = createNativeStackNavigator();

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, setUser, setUserData } = useStore();

  useEffect(() => {
    let isMounted = true;

    const handleAuthStateChange = async (authUser: User | null) => {
      try {
        if (!isMounted) return;

        if (authUser) {
          setUser(authUser);
          
          // Fetch user data
          try {
            console.log('Fetching user data for UID:', authUser.uid);
            const userDoc = await getDoc(doc(db, 'users', authUser.uid));
            if (userDoc.exists() && isMounted) {
              console.log('User document found:', userDoc.data());
              setUserData({
                uid: authUser.uid,
                email: authUser.email || '',
                interests: userDoc.data().interests || [],
              });
            } else {
              console.log('User document does not exist, creating default userData');
              // Create default user data if document doesn't exist
              const defaultUserData = {
                uid: authUser.uid,
                email: authUser.email || '',
                interests: ['Photography', 'Technology'], // Default interests
              };
              setUserData(defaultUserData);
              
              // Optionally save to Firestore for future use
              try {
                await setDoc(doc(db, 'users', authUser.uid), {
                  interests: defaultUserData.interests,
                  email: authUser.email || '',
                  createdAt: new Date(),
                });
                console.log('Default user data saved to Firestore');
              } catch (saveError) {
                console.error('Error saving default user data:', saveError);
              }
            }
          } catch (fetchError) {
            console.error('Error fetching user data:', fetchError);
            // Even if Firestore fails, create minimal userData so the app works
            if (isMounted) {
              setUserData({
                uid: authUser.uid,
                email: authUser.email || '',
                interests: ['Photography'], // Minimal fallback
              });
            }
          }
        } else {
          if (isMounted) {
            setUser(null);
            setUserData(null);
          }
        }

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (authError) {
        console.error('Auth state change error:', authError);
        if (isMounted) {
          setError('Authentication failed');
          setIsLoading(false);
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [setUser, setUserData]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading SnapConnect...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.subText}>Please restart the app</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Feed" component={FeedScreen} />
            <Stack.Screen name="Camera" component={CameraScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default App;
