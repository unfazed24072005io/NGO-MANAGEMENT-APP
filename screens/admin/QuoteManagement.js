// screens/admin/QuoteManagement.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Dimensions,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDoc,
  Timestamp 
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { Fonts } from '../../config/fonts';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

export default function QuoteManagement({ navigation }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  
  // Form states
  const [quoteImage, setQuoteImage] = useState(null);
  const [quoteText, setQuoteText] = useState('');
  const [author, setAuthor] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    setupRealtimeListener();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant gallery access to upload quotes');
    }
  };

  const setupRealtimeListener = () => {
    const q = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const quotesList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const startDate = data.startDate?.toDate?.() || new Date(data.startDate);
        const endDate = data.endDate?.toDate?.() || new Date(data.endDate);
        quotesList.push({ 
          id: doc.id, 
          ...data,
          startDate,
          endDate
        });
      });
      setQuotes(quotesList);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled) {
        const selected = result.assets[0];
        setQuoteImage(selected);
        setPreviewImage(selected.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (imageUri) => {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const storage = getStorage();
      const filename = `quotes/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleSaveQuote = async () => {
    if (!quoteText.trim()) {
      Alert.alert('Error', 'Please enter quote text');
      return;
    }

    if (!quoteImage) {
      Alert.alert('Error', 'Please select an image');
      return;
    }

    if (endDate < startDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    setUploading(true);

    try {
      const imageUrl = await uploadImage(quoteImage.uri);

      const quoteData = {
        text: quoteText.trim(),
        author: author.trim() || 'Unknown',
        imageUrl: imageUrl,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        isActive: isActive,
        createdBy: auth.currentUser?.uid || 'admin',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      if (isEditing && editingId) {
        const quoteRef = doc(db, 'quotes', editingId);
        await updateDoc(quoteRef, quoteData);
        Alert.alert('Success', 'Quote updated successfully');
      } else {
        await addDoc(collection(db, 'quotes'), quoteData);
        Alert.alert('Success', 'Quote added successfully');
      }

      resetForm();
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving quote:', error);
      Alert.alert('Error', 'Failed to save quote. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleEditQuote = (quote) => {
    setSelectedQuote(quote);
    setQuoteText(quote.text);
    setAuthor(quote.author || '');
    setStartDate(quote.startDate || new Date());
    setEndDate(quote.endDate || new Date());
    setIsActive(quote.isActive !== false);
    setIsEditing(true);
    setEditingId(quote.id);
    setPreviewImage(quote.imageUrl);
    setQuoteImage(quote.imageUrl);
    setModalVisible(true);
  };

  const handleDeleteQuote = async (quoteId) => {
    Alert.alert(
      'Delete Quote',
      'Are you sure you want to delete this quote?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'quotes', quoteId));
              Alert.alert('Success', 'Quote deleted successfully');
            } catch (error) {
              console.error('Error deleting quote:', error);
              Alert.alert('Error', 'Failed to delete quote');
            }
          }
        }
      ]
    );
  };

  const toggleQuoteStatus = async (quoteId, currentStatus) => {
    try {
      const quoteRef = doc(db, 'quotes', quoteId);
      await updateDoc(quoteRef, {
        isActive: !currentStatus,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error toggling quote status:', error);
      Alert.alert('Error', 'Failed to update quote status');
    }
  };

  const resetForm = () => {
    setQuoteText('');
    setAuthor('');
    setStartDate(new Date());
    setEndDate(new Date());
    setIsActive(true);
    setQuoteImage(null);
    setPreviewImage(null);
    setIsEditing(false);
    setEditingId(null);
    setSelectedQuote(null);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isQuoteActive = (quote) => {
    const now = new Date();
    const start = quote.startDate || new Date();
    const end = quote.endDate || new Date();
    return quote.isActive && now >= start && now <= end;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const QuoteCard = ({ quote }) => {
    const active = isQuoteActive(quote);

    return (
      <View style={[styles.quoteCard, !active && styles.quoteCardInactive]}>
        <Image source={{ uri: quote.imageUrl }} style={styles.quoteImage} />
        <View style={styles.quoteContent}>
          <Text style={[styles.quoteText, { fontSize: isSmallDevice ? 14 : 16 }]}>
            "{quote.text}"
          </Text>
          {quote.author && (
            <Text style={[styles.quoteAuthor, { fontSize: isSmallDevice ? 12 : 14 }]}>
              — {quote.author}
            </Text>
          )}
          <View style={styles.quoteMeta}>
            <View style={styles.dateInfo}>
              <MaterialIcons name="event" size={isSmallDevice ? 12 : 14} color="#6b7280" />
              <Text style={[styles.dateText, { fontSize: isSmallDevice ? 10 : 12 }]}>
                {formatDate(quote.startDate)} - {formatDate(quote.endDate)}
              </Text>
            </View>
            <View style={[styles.statusBadge, active ? styles.statusActive : styles.statusInactive]}>
              <Text style={[styles.statusText, active ? styles.statusTextActive : styles.statusTextInactive, { fontSize: isSmallDevice ? 9 : 11 }]}>
                {active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <View style={styles.quoteActions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleEditQuote(quote)}
            >
              <MaterialIcons name="edit" size={isSmallDevice ? 14 : 18} color="#ffffff" />
              <Text style={[styles.actionButtonText, { fontSize: isSmallDevice ? 10 : 12 }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.statusToggleButton]}
              onPress={() => toggleQuoteStatus(quote.id, active)}
            >
              <MaterialIcons 
                name={active ? "pause" : "play-arrow"} 
                size={isSmallDevice ? 14 : 18} 
                color="#ffffff" 
              />
              <Text style={[styles.actionButtonText, { fontSize: isSmallDevice ? 10 : 12 }]}>
                {active ? 'Deactivate' : 'Activate'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteQuote(quote.id)}
            >
              <MaterialIcons name="delete" size={isSmallDevice ? 14 : 18} color="#ffffff" />
              <Text style={[styles.actionButtonText, { fontSize: isSmallDevice ? 10 : 12 }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF7722" />
        <Text style={[styles.loadingText, { fontSize: isSmallDevice ? 13 : 14 }]}>Loading quotes...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Orange Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { fontSize: isSmallDevice ? 18 : 22 }]}>Quote Management</Text>
            </View>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => {
                resetForm();
                setModalVisible(true);
              }}
            >
              <MaterialIcons name="add" size={isSmallDevice ? 20 : 24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { fontSize: isSmallDevice ? 16 : 20 }]}>
              {quotes.length}
            </Text>
            <Text style={[styles.statLabel, { fontSize: isSmallDevice ? 10 : 12 }]}>Total Quotes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.statActive, { fontSize: isSmallDevice ? 16 : 20 }]}>
              {quotes.filter(q => isQuoteActive(q)).length}
            </Text>
            <Text style={[styles.statLabel, { fontSize: isSmallDevice ? 10 : 12 }]}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.statInactive, { fontSize: isSmallDevice ? 16 : 20 }]}>
              {quotes.filter(q => !isQuoteActive(q)).length}
            </Text>
            <Text style={[styles.statLabel, { fontSize: isSmallDevice ? 10 : 12 }]}>Inactive</Text>
          </View>
        </View>

        {/* Quotes List */}
        <FlatList
          data={quotes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <QuoteCard quote={item} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF7722']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="format-quote" size={44} color="#d1d5db" />
              <Text style={[styles.emptyStateText, { fontSize: isSmallDevice ? 15 : 16 }]}>No quotes yet</Text>
              <Text style={[styles.emptyStateSubtext, { fontSize: isSmallDevice ? 12 : 13 }]}>
                Tap the + button to add your first quote
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />

        {/* Add/Edit Quote Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            resetForm();
            setModalVisible(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { fontSize: isSmallDevice ? 18 : 20 }]}>
                  {isEditing ? 'Edit Quote' : 'Add New Quote'}
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    resetForm();
                    setModalVisible(false);
                  }}
                >
                  <MaterialIcons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Image Picker */}
                <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                  {previewImage ? (
                    <Image source={{ uri: previewImage }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <MaterialIcons name="add-photo-alternative" size={40} color="#9ca3af" />
                      <Text style={[styles.imagePickerText, { fontSize: isSmallDevice ? 12 : 13 }]}>
                        Tap to select image
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Quote Text */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { fontSize: isSmallDevice ? 13 : 14 }]}>Quote Text *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea, { fontSize: isSmallDevice ? 13 : 14 }]}
                    placeholder="Enter the quote..."
                    placeholderTextColor="#9ca3af"
                    value={quoteText}
                    onChangeText={setQuoteText}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                {/* Author */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { fontSize: isSmallDevice ? 13 : 14 }]}>Author (Optional)</Text>
                  <TextInput
                    style={[styles.textInput, { fontSize: isSmallDevice ? 13 : 14 }]}
                    placeholder="Enter author name..."
                    placeholderTextColor="#9ca3af"
                    value={author}
                    onChangeText={setAuthor}
                  />
                </View>

                {/* Start Date */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { fontSize: isSmallDevice ? 13 : 14 }]}>Start Date *</Text>
                  <TouchableOpacity 
                    style={styles.datePicker}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <MaterialIcons name="calendar-today" size={isSmallDevice ? 16 : 20} color="#6b7280" />
                    <Text style={[styles.datePickerText, { fontSize: isSmallDevice ? 13 : 14 }]}>
                      {formatDate(startDate)}
                    </Text>
                  </TouchableOpacity>
                  {showStartPicker && (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowStartPicker(false);
                        if (selectedDate) {
                          setStartDate(selectedDate);
                          if (endDate < selectedDate) {
                            setEndDate(selectedDate);
                          }
                        }
                      }}
                    />
                  )}
                </View>

                {/* End Date */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { fontSize: isSmallDevice ? 13 : 14 }]}>End Date *</Text>
                  <TouchableOpacity 
                    style={styles.datePicker}
                    onPress={() => setShowEndPicker(true)}
                  >
                    <MaterialIcons name="calendar-today" size={isSmallDevice ? 16 : 20} color="#6b7280" />
                    <Text style={[styles.datePickerText, { fontSize: isSmallDevice ? 13 : 14 }]}>
                      {formatDate(endDate)}
                    </Text>
                  </TouchableOpacity>
                  {showEndPicker && (
                    <DateTimePicker
                      value={endDate}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowEndPicker(false);
                        if (selectedDate) {
                          setEndDate(selectedDate);
                        }
                      }}
                    />
                  )}
                </View>

                {/* Active Switch */}
                <View style={styles.switchContainer}>
                  <Text style={[styles.inputLabel, { fontSize: isSmallDevice ? 13 : 14 }]}>Active Status</Text>
                  <TouchableOpacity 
                    style={[styles.switch, isActive && styles.switchActive]}
                    onPress={() => setIsActive(!isActive)}
                  >
                    <View style={[styles.switchThumb, isActive && styles.switchThumbActive]} />
                  </TouchableOpacity>
                </View>

                {/* Save Button */}
                <TouchableOpacity 
                  style={[styles.saveButton, uploading && styles.saveButtonDisabled]}
                  onPress={handleSaveQuote}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="save" size={20} color="#ffffff" />
                      <Text style={[styles.saveButtonText, { fontSize: isSmallDevice ? 14 : 16 }]}>
                        {isEditing ? 'Update Quote' : 'Add Quote'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontFamily: Fonts.Regular,
    color: '#6b7280',
    marginTop: 10,
  },
  headerCard: {
    backgroundColor: '#FF7722',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontFamily: Fonts.Bold,
    color: '#ffffff',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginTop: -20,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 80,
    marginTop: -50
  },
  statNumber: {
    fontFamily: Fonts.Bold,
    color: '#ffffff',
  },
  statActive: {
    color: '#10b981',
  },
  statInactive: {
    color: '#ef4444',
  },
  statLabel: {
    fontFamily: Fonts.Regular,
    color: '#ffffff',
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  quoteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quoteCardInactive: {
    opacity: 0.6,
  },
  quoteImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    backgroundColor: '#f3f4f6',
  },
  quoteContent: {
    padding: 16,
  },
  quoteText: {
    fontFamily: Fonts.Medium,
    color: '#1f2937',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  quoteAuthor: {
    fontFamily: Fonts.Regular,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'right',
  },
  quoteMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontFamily: Fonts.Regular,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#d1fae5',
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontFamily: Fonts.SemiBold,
  },
  statusTextActive: {
    color: '#065f46',
  },
  statusTextInactive: {
    color: '#991b1b',
  },
  quoteActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  editButton: {
    backgroundColor: '#FF7722',
  },
  statusToggleButton: {
    backgroundColor: '#f59e0b',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyStateText: {
    fontFamily: Fonts.SemiBold,
    color: '#1f2937',
  },
  emptyStateSubtext: {
    fontFamily: Fonts.Regular,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: Fonts.Bold,
    color: '#1f2937',
  },
  imagePicker: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  imagePickerText: {
    fontFamily: Fonts.Regular,
    color: '#6b7280',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: Fonts.SemiBold,
    color: '#1f2937',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fonts.Regular,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  datePickerText: {
    fontFamily: Fonts.Regular,
    color: '#1f2937',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 8,
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#d1d5db',
    padding: 2,
  },
  switchActive: {
    backgroundColor: '#FF7722',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF7722',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
  },
});