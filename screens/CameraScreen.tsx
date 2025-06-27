import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { storage, db, auth } from '../lib/firebase';
import { useStore } from '../store/useStore';

interface CameraScreenProps {
  navigation: any;
}

function CameraScreen({ navigation }: CameraScreenProps) {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { userData, addSnap } = useStore();

  const handlePermissionRequest = async () => {
    try {
      setPermissionLoading(true);
      console.log('Requesting camera permission...');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = await requestPermission();
      console.log('Permission result:', result);
      
      if (!result.granted) {
        if (Platform.OS === 'web') {
          Alert.alert(
            'Camera Permission Required',
            'Please click "Allow" when your browser asks for camera access.',
            [
              { text: 'Try Again', onPress: handlePermissionRequest },
              { text: 'Go to Feed', onPress: () => navigation.navigate('Feed') }
            ]
          );
        } else {
          Alert.alert(
            'Camera Permission Required',
            'Please allow camera access in your device settings to take photos.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Go to Feed', onPress: () => navigation.navigate('Feed') }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Permission request error:', error);
      Alert.alert(
        'Permission Error',
        'Camera access failed. Try refreshing the page or using a different browser.',
        [
          { text: 'Refresh', onPress: () => {
            if (typeof window !== 'undefined' && window.location?.reload) {
              window.location.reload();
            } else {
              navigation.navigate('Feed');
            }
          }},
          { text: 'Go to Feed', onPress: () => navigation.navigate('Feed') }
        ]
      );
    } finally {
      setPermissionLoading(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.message}>Loading camera...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>📷 Camera Access Needed</Text>
          <Text style={styles.message}>
            SnapConnect needs camera access to let you take and share photos.
          </Text>
          <TouchableOpacity 
            onPress={handlePermissionRequest} 
            style={[styles.button, permissionLoading && styles.buttonDisabled]}
            disabled={permissionLoading}
          >
            <Text style={styles.buttonText}>
              {permissionLoading ? 'Requesting...' : 'Grant Camera Permission'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Feed')} 
            style={styles.skipButton}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        console.log('Taking picture...');
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        console.log('Picture taken:', photo);
        setCapturedImage(photo.uri);
        setShowCaptionModal(true);
      } catch (error) {
        console.error('Take picture error:', error);
        Alert.alert('Error', 'Failed to take picture. Please try again.');
      }
    }
  };

  const uploadSnap = async () => {
    if (!capturedImage || !auth?.currentUser || !userData) return;

    setUploading(true);
    try {
      // Temporary: use local image for demo
      const url = capturedImage;
      
      Alert.alert(
        'Info', 
        'Storage not available yet. This is a demo save - images will only show locally until Firebase Storage is set up.'
      );

      const snapData = {
        url,
        caption,
        owner: auth.currentUser.uid,
        interests: userData.interests,
        expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'snaps'), snapData);
      
      addSnap({
        id: docRef.id,
        ...snapData,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      Alert.alert('Success', 'Snap uploaded successfully! (Demo mode)');
      setShowCaptionModal(false);
      setCapturedImage(null);
      setCaption('');
      navigation.navigate('Feed');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload snap');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const suggestCaption = async () => {
    const suggestions = [
      "Living my best life! 📸",
      "Moments like these ✨",
      "Capturing the vibe 🌟",
      "Just another day 😊",
      "Making memories 💫"
    ];
    const randomCaption = suggestions[Math.floor(Math.random() * suggestions.length)];
    setCaption(randomCaption);
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
            <Text style={styles.flipText}>🔄</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.feedButton} 
            onPress={() => navigation.navigate('Feed')}
          >
            <Text style={styles.feedText}>📱</Text>
          </TouchableOpacity>
        </View>
      </CameraView>

      <Modal
        visible={showCaptionModal}
        animationType="slide"
        transparent={true}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            {capturedImage && (
              <Image source={{ uri: capturedImage }} style={styles.previewImage} />
            )}
            
            <Text style={styles.modalTitle}>Add a Caption</Text>
            
            <TextInput
              style={styles.captionInput}
              placeholder="What's happening?"
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={150}
            />
            
            <TouchableOpacity 
              style={styles.suggestButton} 
              onPress={suggestCaption}
            >
              <Text style={styles.suggestButtonText}>✨ Suggest Caption</Text>
            </TouchableOpacity>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCaptionModal(false);
                  setCapturedImage(null);
                  setCaption('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                onPress={uploadSnap}
                disabled={uploading}
              >
                <Text style={styles.uploadButtonText}>
                  {uploading ? 'Uploading...' : 'Share Snap'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 50,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipText: {
    fontSize: 20,
  },
  feedButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedText: {
    fontSize: 20,
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 20,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
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
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  captionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  suggestButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  suggestButtonText: {
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
  uploadButton: {
    backgroundColor: '#007AFF',
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  skipButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  skipButtonText: {
    color: '#333',
    fontWeight: '600',
  },
});

export default CameraScreen; 