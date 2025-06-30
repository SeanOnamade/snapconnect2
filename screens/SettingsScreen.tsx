import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, Alert, SafeAreaView, TouchableOpacity } from "react-native";
import { onSnapshot, setDoc, query, where, getCountFromServer, collection, Timestamp } from "firebase/firestore";
import { LinearGradient } from 'expo-linear-gradient';
import { httpsCallable } from 'firebase/functions';
import { auth, userDocRef, functions, db } from "../lib/firebase";
import TagEditor from "../components/TagEditor";

export default function SettingsScreen({ navigation }: any) {
  const uid = auth.currentUser?.uid!;
  const [firstName, setFirstName] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [snapCount, setSnapCount] = useState<number>(0);
  const [activeSnapCount, setActiveSnapCount] = useState<number>(0);

  // Load user profile data
  useEffect(() => {
    const unsub = onSnapshot(userDocRef(uid), doc => {
      const data = doc.data();
      if (data) {
        setFirstName(data.firstName || "");
        // Load user interests (ensure lowercase and limit to 5)
        const existingInterests = data.interests || [];
        setInterests(existingInterests.slice(0, 5).map((i: string) => i.toLowerCase()));
      }
    });
    return unsub;
  }, [uid]);

  // Fetch snap counts
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      // Get lifetime snap count
      const lifetimeQuery = query(collection(db, "snaps"), where("owner", "==", uid));
      getCountFromServer(lifetimeQuery).then(
        c => setSnapCount(c.data().count)
      ).catch(error => {
        console.error("Error fetching lifetime snap count:", error);
      });

      // Get active snap count (non-expired)
      const activeQuery = query(
        collection(db, "snaps"), 
        where("owner", "==", uid),
        where("expiresAt", ">", Timestamp.now())
      );
      getCountFromServer(activeQuery).then(
        c => setActiveSnapCount(c.data().count)
      ).catch(error => {
        console.error("Error fetching active snap count:", error);
      });
    }
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(
        userDocRef(uid),
        { 
          firstName: firstName.trim(), 
          interests: interests.slice(0, 5).map(i => i.toLowerCase()) // Ensure max 5 interests and lowercase
        },
        { merge: true }
      );
      Alert.alert("Success!", "Your settings have been saved.");
      navigation.goBack();
    } catch (error) {
      console.error("Error saving settings:", error);
      Alert.alert("Error", "Failed to save settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInterestsChange = (newTags: string[]) => {
    if (newTags.length <= 5) {
      setInterests(newTags);
    } else {
      Alert.alert("Limit Reached", "You can select up to 5 interests.");
    }
  };

  const runMigration = async () => {
    Alert.alert(
      "Consolidate Data",
      "This will merge favorites and interests into one field and convert to lowercase. This should only be run once. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Run Migration",
          style: "destructive",
          onPress: async () => {
            try {
                             const migrate = httpsCallable(functions, "migrateInterestsToLowercase");
              const result = await migrate();
              const data = result.data as { message: string; updated: { users: number; snaps: number } };
              Alert.alert("Migration Complete", data.message);
            } catch (error) {
              console.error("Migration error:", error);
              Alert.alert("Migration Failed", "Please try again or check the console.");
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#00c2c7', '#14b8a6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your first name"
            value={firstName}
            onChangeText={setFirstName}
            maxLength={50}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            Your Interests ({interests.length}/5)
          </Text>
          <Text style={styles.sublabel}>
            These will appear first in Discover and be highlighted
          </Text>
          <TagEditor
            tags={interests}
            onChange={handleInterestsChange}
            placeholder="Add interest and press Enter"
          />
          <Text style={{marginTop: 24, fontSize: 16}}>
            📈 Snaps posted: <Text style={{fontWeight: "600"}}>{snapCount}</Text>
          </Text>
          <Text style={{marginTop: 8, fontSize: 16}}>
            ⚡ Active snaps: <Text style={{fontWeight: "600"}}>{activeSnapCount}</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? "Saving..." : "Save Settings"}
          </Text>
        </TouchableOpacity>

        {/* Developer Migration Button - Remove after migration is complete */}
        <TouchableOpacity
          style={styles.migrationButton}
          onPress={runMigration}
        >
          <Text style={styles.migrationButtonText}>
            🔧 Consolidate Interests Data (Developer)
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 50, // Balance the back button
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  label: {
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 8,
    color: '#374151',
  },
  sublabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  saveButton: {
    backgroundColor: '#00c2c7',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  migrationButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  migrationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
}); 