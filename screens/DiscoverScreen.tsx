import React, { useState, useEffect } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, SafeAreaView, TouchableOpacity, Modal, Alert, TextInput } from "react-native";
import { collection, query, where, orderBy, Timestamp, onSnapshot, getDocs } from "firebase/firestore";
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { uniq } from "lodash";
import { auth, db } from "../lib/firebase";
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
}

export default function DiscoverScreen({ navigation }: any) {
  const [selected, setSelected] = useState<string>("");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [search, setSearch] = useState<string>("");
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const { logout } = useStore();

  // Fetch distinct tags from all snaps
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "snaps"),
      snap => {
        const everyTag = snap.docs.flatMap(d => (d.data().interests ?? []));
        setAllTags(uniq(everyTag).sort());  // alphabetical
      }
    );
    return () => unsub();
  }, []);

  // Set initial selected tag to first available tag
  useEffect(() => {
    if (!selected && allTags.length) setSelected(allTags[0]);
  }, [allTags]);

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
        const allSnaps = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Snap));
        
        // Filter by selected interest client-side (case-insensitive)
        const filteredSnaps = allSnaps.filter(snap => {
          if (!snap.interests || !selected) return false;
          
          // Case-insensitive search that checks if any interest contains the selected term
          return snap.interests.some(interest => 
            interest.toLowerCase().includes(selected.toLowerCase())
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
              {allTags.map(tag => (
                <Pressable
                  key={tag}
                  onPress={() => setSelected(tag)}
                  style={[
                    styles.chip,
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
                    Alert.alert('Settings', 'Settings feature coming soon!');
                  }}
                >
                  <Text style={styles.dropdownItemText}>⚙️ Settings</Text>
                  <Text style={styles.dropdownItemSubtext}>Coming soon</Text>
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