import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
            const userDoc = await getDoc(doc(db, 'users', authUser.uid));
            if (userDoc.exists() && isMounted) {
              setUserData({
                uid: authUser.uid,
                email: authUser.email || '',
                interests: userDoc.data().interests || [],
              });
            }
          } catch (fetchError) {
            console.error('Error fetching user data:', fetchError);
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
