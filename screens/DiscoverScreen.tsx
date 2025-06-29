import React, { useState, useEffect } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, SafeAreaView, TouchableOpacity, Modal, Alert, TextInput } from "react-native";
import { collection, query, where, orderBy, Timestamp, onSnapshot, getDocs, doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { uniq } from "lodash";
import * as Clipboard from "expo-clipboard";
import { auth, db, userDocRef, functions } from "../lib/firebase";
import FeedCard from "../components/FeedCard";
import { theme } from '../theme/colors';
import { useStore } from '../store/useStore';

interface Snap {
  id: string;
  url: string;
  caption: string;
  owner: string;
  interests: string[];
  expiresAt: any; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
  ownerEmail?: string;
  ownerFirstName?: string;
}

export default function DiscoverScreen({ navigation }: any) {
  const [selected, setSelected] = useState<string>("");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [search, setSearch] = useState<string>("");
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [loadingIdea, setLoadingIdea] = useState(false);
  const { logout } = useStore();

  // Fetch distinct tags from all snaps
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "snaps"),
      snap => {
        const everyTag = snap.docs.flatMap(d => (d.data().interests ?? []));
        // Normalize all tags to lowercase and remove duplicates
        const normalizedTags = everyTag.map(tag => tag.toLowerCase());
        setAllTags(uniq(normalizedTags).sort());  // alphabetical
      }
    );
    return () => unsub();
  }, []);

  // Fetch user interests
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    
    const unsub = onSnapshot(userDocRef(uid), doc => {
      const data = doc.data();
      setUserInterests(data?.interests || []);
    });
    return unsub;
  }, []);

  // Set initial selected tag to first available tag (user interests first, then others)
  useEffect(() => {
    if (!selected && allTags.length) {
      const displayTags = [...userInterests, ...allTags.filter(t => !userInterests.includes(t))];
      setSelected(displayTags[0]);
    }
  }, [allTags, userInterests]);

  useEffect(() => {
    const fetchSnaps = async () => {
      setLoading(true);
      try {
        // Simple query to get all non-expired snaps - no composite index needed
        const q = query(
          collection(db, "snaps"),
          where("expiresAt", ">", Timestamp.now())
        );
        
        const querySnapshot = await getDocs(q);
        const allSnaps: Snap[] = [];
        
        for (const docSnapshot of querySnapshot.docs) {
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

          allSnaps.push({
            id: docSnapshot.id,
            url: data.url,
            caption: data.caption,
            owner: data.owner,
            interests: data.interests || [],
            expiresAt: data.expiresAt,
            createdAt: data.createdAt,
            ownerEmail,
            ownerFirstName,
          });
        }
        
        // Filter by selected interest client-side (case-insensitive)
        const filteredSnaps = allSnaps.filter(snap => {
          if (!snap.interests || !selected) return false;
          
          // Normalize both sides to lowercase for comparison
          const normalizedInterests = snap.interests.map(interest => interest.toLowerCase());
          const normalizedSelected = selected.toLowerCase();
          
          // Check if any normalized interest contains the selected term
          return normalizedInterests.some(interest => 
            interest.includes(normalizedSelected)
          );
        });
        
        // Sort locally by expiresAt descending
        filteredSnaps.sort((a, b) => {
          const aTime = a.expiresAt?.toDate?.() || new Date(0);
          const bTime = b.expiresAt?.toDate?.() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        });
        
        setSnaps(filteredSnaps);
      } catch (error) {
        console.error("Error fetching snaps:", error);
        setSnaps([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSnaps();
  }, [selected]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      logout();
      // No need for manual navigation - App.tsx handles this automatically via auth state
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  async function getIdea() {
    try {
      setLoadingIdea(true);
      const fn = httpsCallable(functions, "suggestPostIdea");
      const { data } = await fn({ favorites: userInterests });   // userInterests already in state
      setLoadingIdea(false);
      Alert.alert(
        "Post Idea",
        data as string,
        [
          { text: "Copy", onPress: () => Clipboard.setStringAsync(data as string) },
          { text: "Close", style: "cancel" }
        ]
      );
    } catch (e) {
      setLoadingIdea(false);
      Alert.alert("Error", String(e));
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#00c2c7', '#14b8a6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Discover</Text>
            <Text style={styles.headerSubtitle}>🔍 Find new content by interest</Text>
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

      {/* Content */}
      <FlatList
        ListHeaderComponent={
          <>
            <Pressable
              onPress={getIdea}
              style={{alignSelf:"center", marginTop:4, marginBottom:8, 
                      paddingHorizontal:16, paddingVertical:8, borderRadius:20,
                      backgroundColor:"#00c2c7"}}>
              {loadingIdea
                ? <ActivityIndicator color="#fff" />
                : <Text style={{color:"#fff",fontWeight:"600"}}>🎨 Inspire Me</Text>}
            </Pressable>

            <View style={{padding:12}}>
              <TextInput
                placeholder="Search tags…"
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={() => {
                  if (search.trim()) {
                    const searchTerm = search.trim().toLowerCase();
                    // Try to find exact match first, then partial match
                    const exactMatch = allTags.find(tag => tag.toLowerCase() === searchTerm);
                    const partialMatch = allTags.find(tag => tag.toLowerCase().includes(searchTerm));
                    
                    setSelected(exactMatch || partialMatch || searchTerm);
                    setSearch("");
                  }
                }}
                style={styles.searchBox}
                returnKeyType="search"
              />
            </View>

            <View style={styles.chipRow}>
              {/* Show user interests first, then other tags */}
              {[...userInterests, ...allTags.filter(t => !userInterests.includes(t))].map(tag => (
                <Pressable
                  key={tag}
                  onPress={() => setSelected(tag)}
                  style={[
                    styles.chip,
                    userInterests.includes(tag) && styles.favoriteChip,
                    selected === tag && styles.chipSelected
                  ]}>
                  <Text style={selected === tag ? styles.chipTextSel : styles.chipText}>
                    #{tag}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        }
        data={snaps}
        keyExtractor={item => item.id}
        renderItem={({item}) => <FeedCard snap={item} />}
        ListEmptyComponent={
          loading
          ? <ActivityIndicator size="large" style={{marginTop:40}} />
          : <Text style={styles.empty}>Be first to post for #{selected}!</Text>
        }
        contentContainerStyle={styles.feedContainer}
      />

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.neutral.gray[50]
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
  headerButtonText: {
    fontSize: 18,
  },
  headerButtonSecondary: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: theme.borderRadius.lg,
  },
  headerButtonTextSecondary: {
    fontSize: 18,
  },
  feedContainer: {
    padding: theme.spacing.md,
  },
  chipRow: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    marginBottom: theme.spacing.md,
  },
  chip: { 
    paddingHorizontal: 14, 
    paddingVertical: 6, 
    borderRadius: 16, 
    backgroundColor: "#e5e7eb", 
    marginRight: 8, 
    marginBottom: 8 
  },
  favoriteChip: {
    borderWidth: 2,
    borderColor: "#00c2c7",
    backgroundColor: "#f0fdfa",
  },
  chipSelected: { 
    backgroundColor: "#00c2c7" 
  },
  chipText: { 
    color: "#374151", 
    fontWeight: "600" 
  },
  chipTextSel: { 
    color: "#fff", 
    fontWeight: "600" 
  },
  empty: { 
    textAlign: "center", 
    marginTop: 40, 
    color: "#6b7280",
    fontSize: 16,
  },
  // Settings dropdown styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  dropdownContainer: {
    marginTop: 100, // Adjust based on header height
    marginRight: theme.spacing.md,
  },
  dropdownContent: {
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.lg,
    minWidth: 200,
    ...theme.shadows.large,
  },
  dropdownItem: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral.gray[800],
    marginBottom: theme.spacing.xs,
  },
  dropdownItemSubtext: {
    fontSize: 12,
    color: theme.colors.neutral.gray[500],
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: theme.colors.neutral.gray[200],
    marginHorizontal: theme.spacing.md,
  },
  logoutText: {
    color: '#ef4444',
  },
  searchBox: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 8
  },
}); 