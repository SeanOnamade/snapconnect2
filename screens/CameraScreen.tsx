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
  Platform,
  ScrollView
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImageManipulator from 'expo-image-manipulator';

import { storage, db, auth } from '../lib/firebase';
import { useStore } from '../store/useStore';
import { generateAICaptions, generateAITags, CaptionSuggestion, TagSuggestion, AIResponse, AITagResponse } from '../services/openaiService';
import TagEditor from '../components/TagEditor';

interface CameraScreenProps {
  navigation: any;
}

function CameraScreen({ navigation }: CameraScreenProps) {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(false);
  
  // Filter states
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [showFilters, setShowFilters] = useState(false);
  
  // AI Caption states
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [captionSuggestions, setCaptionSuggestions] = useState<CaptionSuggestion[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // AI Tag states
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([]);
  const [aiTagError, setAiTagError] = useState<string | null>(null);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  
  const cameraRef = useRef<CameraView>(null);
  const { userData } = useStore();

  // Filter definitions
  const FILTERS = [
    { id: 'none', name: 'Original', emoji: '📷', description: 'No filter' },
    { id: 'vintage', name: 'Vintage', emoji: '📺', description: 'Classic sepia tone' },
    { id: 'cool', name: 'Cool', emoji: '❄️', description: 'Blue winter vibes' },
    { id: 'warm', name: 'Warm', emoji: '🔥', description: 'Golden hour glow' },
    { id: 'noir', name: 'Noir', emoji: '🎬', description: 'Black & white drama' },
    { id: 'cyberpunk', name: 'Cyber', emoji: '🌃', description: 'Neon city lights' },
    { id: 'dreamy', name: 'Dreamy', emoji: '☁️', description: 'Soft and ethereal' },
    { id: 'vibrant', name: 'Vibrant', emoji: '🌈', description: 'Pop of color' },
  ];

  // Render filter overlays
  const renderFilterOverlay = () => {
    switch (selectedFilter) {
      case 'vintage':
        return (
          <LinearGradient
            colors={['rgba(255,204,119,0.2)', 'rgba(139,69,19,0.3)']}
            style={styles.filterOverlay}
          />
        );
      
      case 'cool':
        return (
          <LinearGradient
            colors={['rgba(0,191,255,0.15)', 'rgba(30,144,255,0.25)']}
            style={styles.filterOverlay}
          />
        );
      
      case 'warm':
        return (
          <LinearGradient
            colors={['rgba(255,165,0,0.2)', 'rgba(255,69,0,0.15)']}
            style={styles.filterOverlay}
          />
        );
      
      case 'noir':
        return (
          <View style={[styles.filterOverlay, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
            <View style={styles.scanLines} />
          </View>
        );
      
      case 'cyberpunk':
        return (
          <View style={styles.filterOverlay}>
            <LinearGradient
              colors={['rgba(0,255,255,0.1)', 'rgba(255,0,255,0.1)', 'rgba(0,255,127,0.1)']}
              style={styles.filterOverlay}
            />
            <View style={styles.glitchLines} />
          </View>
        );
      
      case 'dreamy':
        return (
          <LinearGradient
            colors={['rgba(255,192,203,0.15)', 'rgba(221,160,221,0.2)', 'rgba(230,230,250,0.1)']}
            style={styles.filterOverlay}
          />
        );
      
      case 'vibrant':
        return (
          <View style={styles.filterOverlay}>
            <LinearGradient
              colors={['rgba(255,20,147,0.1)', 'rgba(0,206,209,0.1)', 'rgba(255,215,0,0.1)']}
              style={styles.filterOverlay}
            />
          </View>
        );
      
      default:
        return null;
    }
  };

  // Apply both geometric and color effects to captured images
  const applyImageEffect = async (imageUri: string, filterType: string): Promise<string> => {
    try {
      // Step 1: Apply geometric transformations with ImageManipulator
      let manipulatorActions: ImageManipulator.Action[] = [];
      
      switch (filterType) {
        case 'vintage':
          manipulatorActions = [
            { resize: { width: 1000 } },
            { rotate: 0.5 },
          ];
          break;
        case 'noir':
          manipulatorActions = [
            { resize: { width: 1000 } },
            { crop: { originX: 0, originY: 0, width: 1000, height: 1000 }},
          ];
          break;
        case 'cool':
          manipulatorActions = [
            { resize: { width: 1000 } },
            { crop: { originX: 25, originY: 25, width: 950, height: 950 }},
          ];
          break;
        case 'warm':
          manipulatorActions = [
            { resize: { width: 1200 } },
            { crop: { originX: 100, originY: 100, width: 1000, height: 1000 }},
          ];
          break;
        case 'vibrant':
          manipulatorActions = [{ resize: { width: 1200 } }];
          break;
        case 'dreamy':
          manipulatorActions = [
            { resize: { width: 1000 } },
            { rotate: -0.3 },
          ];
          break;
        case 'cyberpunk':
          manipulatorActions = [
            { resize: { width: 1000 } },
            { crop: { originX: 50, originY: 0, width: 900, height: 1000 }},
          ];
          break;
        default:
          manipulatorActions = [{ resize: { width: 1000 } }];
          break;
      }
      
      const geometricallyProcessed = await ImageManipulator.manipulateAsync(
        imageUri,
        manipulatorActions,
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      // Step 2: Apply color effects using platform-specific methods
      if (filterType !== 'none') {
        if (Platform.OS === 'web') {
          return await applyColorFilterWeb(geometricallyProcessed.uri, filterType);
        } else {
          return await applyColorFilterMobile(geometricallyProcessed.uri, filterType);
        }
      }
      
      return geometricallyProcessed.uri;
    } catch (error) {
      console.error('Image processing error:', error);
      return imageUri;
    }
  };

  // Canvas-based color filter application (web only)
  const applyColorFilterWeb = async (imageUri: string, filterType: string): Promise<string> => {
    if (typeof document === 'undefined') {
      return imageUri; // Not on web platform
    }
    
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new (window as any).Image() as HTMLImageElement;
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the original image
        ctx?.drawImage(img, 0, 0);
        
        if (!ctx) {
          resolve(imageUri);
          return;
        }
        
        // Apply color filters based on filter type
        switch (filterType) {
          case 'vintage':
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = 'rgba(255,204,119,0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = 'rgba(139,69,19,0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;
            
          case 'cool':
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = 'rgba(0,191,255,0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;
            
          case 'warm':
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = 'rgba(255,165,0,0.25)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;
            
          case 'noir':
            // Convert to grayscale
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
              const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
              data[i] = avg;     // red
              data[i + 1] = avg; // green
              data[i + 2] = avg; // blue
            }
            ctx.putImageData(imageData, 0, 0);
            break;
            
          case 'cyberpunk':
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = 'rgba(0,255,255,0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(255,0,255,0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;
            
          case 'dreamy':
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = 'rgba(255,192,203,0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;
            
          case 'vibrant':
            // Increase saturation by enhancing color channels
            const vibrantData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const vibrantPixels = vibrantData.data;
            for (let i = 0; i < vibrantPixels.length; i += 4) {
              vibrantPixels[i] = Math.min(255, vibrantPixels[i] * 1.2);     // red
              vibrantPixels[i + 1] = Math.min(255, vibrantPixels[i + 1] * 1.2); // green
              vibrantPixels[i + 2] = Math.min(255, vibrantPixels[i + 2] * 1.2); // blue
            }
            ctx.putImageData(vibrantData, 0, 0);
            break;
        }
        
        // Convert canvas to data URL
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataURL);
      };
      
      img.onerror = () => resolve(imageUri);
      img.src = imageUri;
    });
  };

  // Mobile color filter application using react-native-image-filter-kit
  const applyColorFilterMobile = async (imageUri: string, filterType: string): Promise<string> => {
    try {
      // Simple mobile processing (placeholder for future enhancement)
      if (filterType === 'none') {
        return imageUri;
      }

      // For now, apply basic processing with expo-image-manipulator
      // TODO: Implement full color matrix support when expo adds it
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [], // No transformations - just reprocess for consistency
        { 
          compress: filterType === 'vibrant' ? 0.7 : 0.8, // Lower compression for vibrant
          format: ImageManipulator.SaveFormat.JPEG
        }
      );

      return result.uri;
    } catch (error) {
      console.error('Mobile color filter error:', error);
      // Fallback to original image if filter fails
      return imageUri;
    }
  };



  // Helper function to clean up all modal states
  const resetModalStates = () => {
    setShowShareOptions(false);
    setShowCaptionModal(false);
    setCapturedImage(null);
    setCaption('');
    setTags([]);
    // Reset AI states
    setIsGeneratingCaption(false);
    setCaptionSuggestions([]);
    setSelectedSuggestionIndex(null);
    setAiError(null);
    setShowSuggestions(false);
    
    // Reset AI tag states
    setIsGeneratingTags(false);
    setTagSuggestions([]);
    setAiTagError(null);
    setShowTagSuggestions(false);
  };

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
        
        // Apply Level 2 image processing effects
        console.log('Applying filter:', selectedFilter);
        const processedImageUri = await applyImageEffect(photo.uri, selectedFilter);
        console.log('Filter applied, processed image:', processedImageUri);
        
        setCapturedImage(processedImageUri);
        setShowCaptionModal(true);
      } catch (error) {
        console.error('Take picture error:', error);
        Alert.alert('Error', 'Failed to take picture. Please try again.');
      }
    }
  };

  const uploadToFirebaseStorage = async (imageUri: string): Promise<string> => {
    try {
      // Convert image to blob for Firebase Storage upload
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Create a unique filename
      const filename = `snaps/${auth.currentUser?.uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      // Upload the blob to Firebase Storage
      console.log('Uploading to Firebase Storage...');
      await uploadBytes(storageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Upload successful! Download URL:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('Firebase Storage upload error:', error);
      // Don't throw error - let the fallback mechanism handle it
      throw error;
    }
  };

  const saveSnapToFirestore = async (imageUrl: string) => {
    if (!auth?.currentUser || !userData) return;

    try {
      const snapData = {
        url: imageUrl,
        caption,
        owner: auth.currentUser.uid,
        interests: tags.length ? tags.map(tag => tag.toLowerCase()) : ["misc"],
        expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: Timestamp.now(),
        ownerEmail: userData.email,
      };

      const docRef = await addDoc(collection(db, 'snaps'), snapData);
      
      console.log('Snap saved to Firestore successfully! ID:', docRef.id);
    } catch (error) {
      console.error('Firestore save error:', error);
      throw new Error('Failed to save snap to database');
    }
  };

  const shareToOtherApps = async () => {
    if (!capturedImage) return;

    setSharing(true);
    try {
      const shareableUri = capturedImage;
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      // Share the image
      await Sharing.shareAsync(shareableUri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Share your Snap',
      });

      console.log('Image shared successfully!');
      
      // Clean up all modal states after successful sharing
      resetModalStates();
    } catch (error) {
      console.error('Sharing error:', error);
      Alert.alert('Error', 'Failed to share image');
    } finally {
      setSharing(false);
    }
  };

  const uploadSnap = async () => {
    if (!capturedImage || !auth?.currentUser || !userData) {
      Alert.alert('Error', 'Missing required data for upload');
      return;
    }

    setUploading(true);
    try {
      let imageUrl = capturedImage;
      let uploadMethod = 'Local (Demo Mode)';

      // Try Firebase Storage first
      try {
        console.log('Attempting Firebase Storage upload...');
        imageUrl = await uploadToFirebaseStorage(capturedImage);
        uploadMethod = 'Firebase Storage';
        console.log('Firebase Storage upload successful!');
      } catch (storageError) {
        console.log('Firebase Storage not available, using local image for demo');
        console.error('Storage error details:', storageError);
        // Use local image URI as fallback
        imageUrl = capturedImage;
        uploadMethod = 'Local (Demo Mode)';
      }
      
      // Save snap data to Firestore (works with either Firebase Storage URL or local URI)
      await saveSnapToFirestore(imageUrl);

      // Note: Don't add to local state - the Firestore listener will automatically pick it up

      // Show success message based on upload method
      const successMessage = uploadMethod === 'Firebase Storage' 
        ? 'Snap uploaded to Firebase Storage successfully!'
        : 'Snap saved successfully! (Demo mode - using local image until Firebase Storage is configured)';

      Alert.alert('Success', successMessage, [
        {
          text: 'Go to Feed',
          onPress: () => {
            resetModalStates();
            navigation.navigate('Feed');
          }
        }
      ]);
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert(
        'Upload Error', 
        error instanceof Error ? error.message : 'Failed to save snap. Please try again.',
        [
          { text: 'Retry', onPress: uploadSnap },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setUploading(false);
    }
  };

  const handleShareSnap = () => {
    // Close caption modal and open share options modal
    setShowCaptionModal(false);
    setShowShareOptions(true);
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const suggestCaption = async () => {
    if (!capturedImage || isGeneratingCaption) return;
    
    setIsGeneratingCaption(true);
    setAiError(null);
    setCaptionSuggestions([]);
    setShowSuggestions(false);
    
    try {
      console.log('🤖 Generating AI captions...');
      const userInterests = userData?.interests || [];
      const response: AIResponse = await generateAICaptions(capturedImage, selectedFilter, userInterests);
      
      setCaptionSuggestions(response.suggestions);
      setShowSuggestions(true);
      
      // Auto-select the first suggestion
      if (response.suggestions.length > 0) {
        setSelectedSuggestionIndex(0);
        setCaption(response.suggestions[0].text);
      }
      
      console.log(`✨ Generated ${response.suggestions.length} suggestions with ${(response.confidence * 100).toFixed(0)}% confidence`);
      
    } catch (error: any) {
      console.error('AI Caption generation failed:', error);
      setAiError(error.message || 'Failed to generate AI suggestions');
      
      // Show fallback suggestions on error
      const fallbackSuggestions: CaptionSuggestion[] = [
        { text: "Capturing the moment ✨", mood: "casual", length: "short" },
        { text: "Life through my lens 📸", mood: "creative", length: "short" },
        { text: "Making memories that matter 💫", mood: "professional", length: "medium" },
        { text: "Vibes are immaculate today 😎", mood: "humorous", length: "short" }
      ];
      
      setCaptionSuggestions(fallbackSuggestions);
      setShowSuggestions(true);
      setSelectedSuggestionIndex(0);
      setCaption(fallbackSuggestions[0].text);
      
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  // Handle selecting a different AI suggestion
  const selectSuggestion = (index: number) => {
    if (captionSuggestions[index]) {
      setSelectedSuggestionIndex(index);
      setCaption(captionSuggestions[index].text);
    }
  };

  const suggestTags = async () => {
    if (!capturedImage || isGeneratingTags) return;
    
    setIsGeneratingTags(true);
    setAiTagError(null);
    setTagSuggestions([]);
    setShowTagSuggestions(false);
    
    try {
      console.log('🏷️ Generating AI tags...');
      const userInterests = userData?.interests || [];
      const response: AITagResponse = await generateAITags(capturedImage, selectedFilter, userInterests);
      
      setTagSuggestions(response.suggestions);
      setShowTagSuggestions(true);
      
      console.log(`✨ Generated ${response.suggestions.length} tag suggestions with ${(response.confidence * 100).toFixed(0)}% confidence`);
      
    } catch (error: any) {
      console.error('AI Tag generation failed:', error);
      setAiTagError(error.message || 'Failed to generate AI tag suggestions');
      
      // Show fallback suggestions on error
      const fallbackTagSuggestions: TagSuggestion[] = [
        { tag: "photography", relevance: "high", category: "activity" },
        { tag: "moment", relevance: "medium", category: "mood" },
        { tag: "creative", relevance: "medium", category: "style" },
        { tag: "memory", relevance: "medium", category: "mood" }
      ];
      
      setTagSuggestions(fallbackTagSuggestions);
      setShowTagSuggestions(true);
      
    } finally {
      setIsGeneratingTags(false);
    }
  };

  // Handle selecting an AI-suggested tag
  const selectTag = (tagSuggestion: TagSuggestion) => {
    const tagName = tagSuggestion.tag;
    if (!tags.includes(tagName)) {
      setTags([...tags, tagName]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Show static background if modals are open, otherwise show live camera */}
      {(showCaptionModal || showShareOptions) ? (
        <View style={[styles.camera, { backgroundColor: '#1a1a1a' }]}>
          {capturedImage && (
            <Image 
              source={{ uri: capturedImage }} 
              style={[styles.camera, { opacity: 0.3 }]}
              blurRadius={10}
            />
          )}
        </View>
      ) : (
        <CameraView 
          style={styles.camera} 
          facing={facing} 
          ref={cameraRef}
        />
      )}
      
      {/* Only show camera controls and filters when no modals are open */}
      {!(showCaptionModal || showShareOptions) && (
        <>
          {/* Filter Overlay */}
          {renderFilterOverlay()}
          

          
          {/* Filter Selection Panel */}
          {showFilters && (
            <View style={styles.filterPanel}>
              <Text style={styles.filterPanelTitle}>Choose Filter</Text>
              <View style={styles.filterGrid}>
                {FILTERS.map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      styles.filterOption,
                      selectedFilter === filter.id && styles.filterOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedFilter(filter.id);
                      setShowFilters(false);
                    }}
                  >
                    <Text style={styles.filterEmoji}>{filter.emoji}</Text>
                    <Text style={styles.filterName}>{filter.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          
          {/* Camera Controls */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
              <View style={styles.flipButtonInner}>
                <View style={styles.swapIcon}>
                  <View style={styles.swapCircle1} />
                  <View style={styles.swapCircle2} />
                  <View style={styles.swapArrow1} />
                  <View style={styles.swapArrow2} />
                </View>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.filterButtonBottom} 
              onPress={() => setShowFilters(!showFilters)}
            >
              <View style={styles.filterButtonInner}>
                <Text style={styles.filterButtonBottomText}>
                  {FILTERS.find(f => f.id === selectedFilter)?.emoji || '📷'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </>
      )}

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
            {/* X Button - Top Right */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={resetModalStates}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            {capturedImage && (
              <Image source={{ uri: capturedImage }} style={styles.previewImage} />
            )}
            
            <Text style={styles.modalTitle}>Add a Caption</Text>
            
            <View style={styles.captionInputContainer}>
              <TextInput
                style={styles.captionInput}
                placeholder="What's happening?"
                placeholderTextColor="#000"
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={150}
                ref={(ref) => {
                  if (ref) {
                    // Store reference for dismissing keyboard
                    (global as any).captionInputRef = ref;
                  }
                }}
              />
              
              {/* Checkmark button in top right of text input */}
              <TouchableOpacity
                style={styles.captionCheckmark}
                onPress={() => {
                  // Dismiss keyboard
                  if ((global as any).captionInputRef) {
                    (global as any).captionInputRef.blur();
                  }
                }}
              >
                <Text style={styles.captionCheckmarkText}>✓</Text>
              </TouchableOpacity>
              
              {/* Character counter */}
              <Text style={styles.characterCounter}>
                {caption.length}/150
              </Text>
            </View>
            
            <TagEditor
              tags={tags}
              onChange={setTags}
              placeholder="Add tags like #music, #food..."
            />
            
            {/* AI Suggestion Buttons */}
            <View style={styles.aiButtonsContainer}>
              <TouchableOpacity 
                style={[styles.suggestButton, styles.suggestButtonCaption, isGeneratingCaption && styles.suggestButtonDisabled]} 
                onPress={suggestCaption}
                disabled={isGeneratingCaption}
              >
                <Text style={styles.suggestButtonTextWhite}>
                  {isGeneratingCaption ? '🤖 Thinking...' : '✨ Caption'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.suggestButton, styles.suggestButtonTags, isGeneratingTags && styles.suggestButtonDisabled]} 
                onPress={suggestTags}
                disabled={isGeneratingTags}
              >
                <Text style={styles.suggestButtonTextWhite}>
                  {isGeneratingTags ? '🤖 Thinking...' : '🏷️ Tags'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* AI Error Display */}
            {aiError && (
              <View style={styles.aiErrorContainer}>
                <Text style={styles.aiErrorText}>⚠️ {aiError}</Text>
                <Text style={styles.aiErrorSubtext}>Using backup suggestions</Text>
              </View>
            )}

            {/* AI Tag Error Display */}
            {aiTagError && (
              <View style={styles.aiErrorContainer}>
                <Text style={styles.aiErrorText}>⚠️ {aiTagError}</Text>
                <Text style={styles.aiErrorSubtext}>Using backup tag suggestions</Text>
              </View>
            )}

            {/* AI Suggestions */}
            {showSuggestions && captionSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <View style={styles.suggestionsHeader}>
                  <Text style={styles.suggestionsTitle}>
                    🤖 AI Suggestions {aiError ? '(Backup)' : ''}
                  </Text>
                  <TouchableOpacity 
                    style={styles.dismissSuggestionsButton}
                    onPress={() => setShowSuggestions(false)}
                  >
                    <Text style={styles.dismissSuggestionsX}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView 
                  style={styles.suggestionsList}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={true}
                >
                  {captionSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.suggestionItem,
                        selectedSuggestionIndex === index && styles.suggestionItemSelected
                      ]}
                      onPress={() => selectSuggestion(index)}
                    >
                      <View style={styles.suggestionContent}>
                        <Text style={styles.suggestionText}>{suggestion.text}</Text>
                        <View style={styles.suggestionMeta}>
                          <Text style={styles.suggestionMood}>
                            {suggestion.mood === 'casual' ? '😊' : 
                             suggestion.mood === 'creative' ? '🎨' :
                             suggestion.mood === 'professional' ? '💼' : '😄'} {suggestion.mood}
                          </Text>
                          <Text style={styles.suggestionLength}>
                            {suggestion.length === 'short' ? '📝' : 
                             suggestion.length === 'medium' ? '📄' : '📰'} {suggestion.length}
                          </Text>
                        </View>
                      </View>
                      {selectedSuggestionIndex === index && (
                        <Text style={styles.selectedCheckmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* AI Tag Suggestions */}
            {showTagSuggestions && tagSuggestions.length > 0 && (
              <View style={styles.tagSuggestionsContainer}>
                <View style={styles.suggestionsHeader}>
                  <Text style={styles.tagSuggestionsTitle}>
                    🏷️ AI Tag Suggestions {aiTagError ? '(Backup)' : ''}
                  </Text>
                  <TouchableOpacity 
                    style={styles.dismissSuggestionsButton}
                    onPress={() => setShowTagSuggestions(false)}
                  >
                    <Text style={styles.dismissSuggestionsX}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView 
                  style={styles.tagSuggestionsScrollView}
                  contentContainerStyle={styles.tagSuggestionsList}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={true}
                >
                  {tagSuggestions.map((tagSuggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.tagSuggestionItem,
                        tags.includes(tagSuggestion.tag) && styles.tagSuggestionItemSelected
                      ]}
                      onPress={() => selectTag(tagSuggestion)}
                      disabled={tags.includes(tagSuggestion.tag)}
                    >
                      <Text style={styles.tagSuggestionText}>
                        #{tagSuggestion.tag}
                      </Text>
                      <View style={styles.tagSuggestionMeta}>
                        <Text style={styles.tagSuggestionCategory}>
                          {tagSuggestion.category === 'object' ? '📦' : 
                           tagSuggestion.category === 'mood' ? '😊' :
                           tagSuggestion.category === 'activity' ? '⚡' :
                           tagSuggestion.category === 'style' ? '🎨' : '📍'} {tagSuggestion.category}
                        </Text>
                      </View>
                      {tags.includes(tagSuggestion.tag) && (
                        <Text style={styles.selectedCheckmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            
            {/* Fixed buttons at bottom */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={resetModalStates}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.shareButton]}
                onPress={handleShareSnap}
              >
                <Text style={styles.shareButtonText}>Share Snap</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Share Options Modal */}
      <Modal
        visible={showShareOptions}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {capturedImage && (
              <Image source={{ uri: capturedImage }} style={styles.previewImage} />
            )}
            
            <Text style={styles.modalTitle}>How would you like to share?</Text>
            
            <View style={styles.shareOptionsContainer}>
              <TouchableOpacity
                style={[styles.shareOptionButton, styles.uploadToFeedButton]}
                onPress={uploadSnap}
                disabled={uploading}
              >
                <Text style={styles.shareOptionEmoji}>📱</Text>
                <Text style={styles.shareOptionText}>
                  {uploading ? 'Uploading...' : 'Share to Feed'}
                </Text>
                <Text style={styles.shareOptionSubtext}>Post to SnapConnect feed</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.shareOptionButton, styles.shareToAppsButton]}
                onPress={shareToOtherApps}
                disabled={sharing}
              >
                <Text style={styles.shareOptionEmoji}>📤</Text>
                <Text style={styles.shareOptionText}>
                  {sharing ? 'Sharing...' : 'Share to Apps'}
                </Text>
                <Text style={styles.shareOptionSubtext}>Share to other apps</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                // Go back to caption modal instead of closing everything
                setShowShareOptions(false);
                setShowCaptionModal(true);
              }}
            >
              <Text style={styles.cancelButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
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

  // Modern button styles
  flipButtonInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swapIcon: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swapCircle1: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#000',
    top: 2,
    left: 2,
  },
  swapCircle2: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#000',
    bottom: 2,
    right: 2,
  },
  swapArrow1: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#000',
    top: 1,
    right: 1,
  },
  swapArrow2: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#000',
    bottom: 1,
    left: 1,
  },
  filterButtonBottom: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonBottomText: {
    fontSize: 16,
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
  modalScrollContent: {
    flex: 1,
    marginBottom: 10,
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
  captionInputContainer: {
    position: 'relative',
    marginBottom: 25, // Increased for character counter spacing
  },
  captionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    paddingRight: 40, // Make room for checkmark
    minHeight: 80,
    textAlignVertical: 'top',
  },
  captionCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captionCheckmarkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  characterCounter: {
    position: 'absolute',
    bottom: -22,
    right: 4,
    fontSize: 12,
    color: '#666',
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
    marginTop: 15, // Increased slightly since no border padding
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
  // Share functionality styles
  shareButton: {
    backgroundColor: '#34D399',
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  shareOptionsContainer: {
    marginBottom: 20,
  },
  shareOptionButton: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  uploadToFeedButton: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  shareToAppsButton: {
    backgroundColor: '#f3e5f5',
    borderColor: '#9c27b0',
  },
  shareOptionEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  shareOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  shareOptionSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  // Filter overlay styles
  filterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  scanLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  glitchLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05,
  },
  // Filter UI styles
  filterButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  filterButtonText: {
    fontSize: 24,
  },
  filterPanel: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 15,
    padding: 20,
    zIndex: 10,
  },
  filterPanelTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  filterOption: {
    alignItems: 'center',
    padding: 10,
    margin: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 70,
  },
  filterOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  filterName: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  // AI Suggestion styles
  aiButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  suggestButtonCaption: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  suggestButtonTags: {
    flex: 1,
    backgroundColor: '#764ba2',
  },
  suggestButtonDisabled: {
    opacity: 0.6,
  },
  suggestButtonTextWhite: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  aiErrorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  aiErrorText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  aiErrorSubtext: {
    color: '#757575',
    fontSize: 12,
  },
  suggestionsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    maxHeight: 160,
    overflow: 'hidden',
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  dismissSuggestionsButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e5e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissSuggestionsX: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  suggestionsList: {
    maxHeight: 120,
  },
  suggestionItem: {
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  suggestionItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e3f2fd',
  },
  suggestionContent: {
    flex: 1,
    paddingRight: 6,
  },
  suggestionText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 1,
    fontWeight: '500',
    lineHeight: 14,
  },
  suggestionMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  suggestionMood: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  suggestionLength: {
    fontSize: 10,
    color: '#666',
  },
  selectedCheckmark: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // AI Tag Suggestion styles
  tagSuggestionsContainer: {
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    maxHeight: 160,
    overflow: 'hidden',
  },
  tagSuggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  tagSuggestionsScrollView: {
    maxHeight: 120,
  },
  tagSuggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagSuggestionItem: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 80,
  },
  tagSuggestionItemSelected: {
    backgroundColor: '#e0f2fe',
    borderColor: '#00c2c7',
  },
  tagSuggestionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  tagSuggestionMeta: {
    marginLeft: 4,
  },
  tagSuggestionCategory: {
    fontSize: 10,
    color: '#6b7280',
  },
  // Close button styles
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 16,
  },
});

export default CameraScreen; 