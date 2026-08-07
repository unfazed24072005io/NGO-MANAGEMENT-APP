import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image, Modal, ActivityIndicator, Switch, RefreshControl, FlatList, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, storage } from '../../config/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Fonts } from '../../config/fonts';

const screenWidth = Dimensions.get('window').width;
const FILTERS = ['All', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled'];

export default function EventsManagement({ navigation }) {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date(),
    time: '',
    location: '',
    venue: '',
    category: '',
    capacity: '',
    registeredCount: 0,
    image: null,
    status: 'upcoming',
    featured: false,
    organizer: '',
    contactEmail: '',
    contactPhone: '',
    agenda: [],
    speakers: [],
    tags: []
  });

  useEffect(() => {
    setupRealtimeListener();
  }, []);

  const setupRealtimeListener = () => {
    const q = query(collection(db, 'events'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        eventsList.push({ 
          id: doc.id, 
          ...data,
          date: data.date?.toDate?.() || new Date(data.date)
        });
      });
      setEvents(eventsList);
      applyFilters(eventsList, searchQuery, filterStatus);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const applyFilters = (data, searchText, filter) => {
    let filtered = data;

    if (searchText) {
      filtered = filtered.filter(event =>
        event.title?.toLowerCase().includes(searchText.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchText.toLowerCase()) ||
        event.category?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (filter !== 'All') {
      filtered = filtered.filter(event => event.status === filter.toLowerCase());
    }

    setFilteredEvents(filtered);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFilters(events, text, filterStatus);
  };

  const handleFilterPress = (filter) => {
    setFilterStatus(filter);
    applyFilters(events, searchQuery, filter);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your gallery');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setFormData({ ...formData, image: base64Image });
    }
  };

  const handleSaveEvent = async () => {
    if (!formData.title || !formData.date || !formData.location) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const eventData = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formData.time || '10:00 AM',
        location: formData.location,
        venue: formData.venue || formData.location,
        category: formData.category || 'General',
        capacity: parseInt(formData.capacity) || 0,
        registeredCount: formData.registeredCount || 0,
        image: formData.image,
        status: formData.status || 'upcoming',
        featured: formData.featured || false,
        organizer: formData.organizer || 'NGO Team',
        contactEmail: formData.contactEmail || '',
        contactPhone: formData.contactPhone || '',
        agenda: formData.agenda || [],
        speakers: formData.speakers || [],
        tags: formData.tags || [],
        updatedAt: new Date().toISOString()
      };

      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id), eventData);
        Alert.alert('Success', 'Event updated successfully');
      } else {
        eventData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'events'), eventData);
        Alert.alert('Success', 'Event created successfully');
      }

      setModalVisible(false);
      resetForm();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'events', eventId));
              Alert.alert('Success', 'Event deleted successfully');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: new Date(),
      time: '',
      location: '',
      venue: '',
      category: '',
      capacity: '',
      registeredCount: 0,
      image: null,
      status: 'upcoming',
      featured: false,
      organizer: '',
      contactEmail: '',
      contactPhone: '',
      agenda: [],
      speakers: [],
      tags: []
    });
    setEditingEvent(null);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getFilterCount = (filter) => {
    if (filter === 'All') return events.length;
    return events.filter(event => event.status === filter.toLowerCase()).length;
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'upcoming': return '#FF7722';
      case 'ongoing': return '#10b981';
      case 'completed': return '#6b7280';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'upcoming': return 'event';
      case 'ongoing': return 'play-circle';
      case 'completed': return 'check-circle';
      case 'cancelled': return 'cancel';
      default: return 'event';
    }
  };

  const StatCard = ({ label, count, icon, color, active, onPress }) => (
    <TouchableOpacity 
      style={[styles.statCard, active && styles.statCardActive]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.statIconCircle, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statType} numberOfLines={1}>{label}</Text>
      <Text style={[styles.statCount, { color }]}>{count}</Text>
    </TouchableOpacity>
  );

  const EventCard = ({ event }) => {
    const statusColor = getStatusColor(event.status);
    const statusIcon = getStatusIcon(event.status);
    
    return (
      <TouchableOpacity 
        style={styles.eventCard}
        onPress={() => {
          setSelectedEvent(event);
          setEventModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        {event.image ? (
          <Image source={{ uri: event.image }} style={styles.eventImage} />
        ) : (
          <View style={styles.eventImagePlaceholder}>
            <MaterialIcons name="event" size={40} color="#9ca3af" />
          </View>
        )}
        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
            {event.featured && (
              <View style={styles.featuredBadge}>
                <MaterialIcons name="star" size={16} color="#f59e0b" />
              </View>
            )}
          </View>
          <Text style={styles.eventDescription} numberOfLines={2}>
            {event.description || 'No description'}
          </Text>
          <View style={styles.eventDetails}>
            <View style={styles.eventDetailItem}>
              <MaterialIcons name="event" size={14} color="#6b7280" />
              <Text style={styles.eventDetail}>{event.date?.toLocaleDateString?.() || 'N/A'}</Text>
            </View>
            <View style={styles.eventDetailItem}>
              <MaterialIcons name="location-on" size={14} color="#6b7280" />
              <Text style={styles.eventDetail}>{event.location || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.eventFooter}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <MaterialIcons name={statusIcon} size={12} color={statusColor} />
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {event.status || 'upcoming'}
              </Text>
            </View>
            <View style={styles.capacityBadge}>
              <MaterialIcons name="people" size={12} color="#6b7280" />
              <Text style={styles.eventCapacity}>
                {event.registeredCount || 0}/{event.capacity || '∞'}
              </Text>
            </View>
          </View>
          <View style={styles.eventActions}>
            <TouchableOpacity 
              style={[styles.eventActionButton, styles.editButton]}
              onPress={() => {
                setEditingEvent(event);
                setFormData(event);
                setModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="edit" size={14} color="#ffffff" />
              <Text style={styles.eventActionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.eventActionButton, styles.deleteButton]}
              onPress={() => handleDeleteEvent(event.id)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="delete" size={14} color="#ffffff" />
              <Text style={styles.eventActionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Saffron Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Events</Text>
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => {
              resetForm();
              setModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="add" size={18} color="#ffffff" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar inside header */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={18} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={handleSearch}
            textAlignVertical="center"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <MaterialIcons name="close" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Stat Cards inside header */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.statsContainer}
          contentContainerStyle={styles.statsContent}
        >
          <StatCard 
            label="Total" 
            count={events.length} 
            icon="event" 
            color="#ffffff" 
            active={filterStatus === 'All'}
            onPress={() => handleFilterPress('All')}
          />
          <StatCard 
            label="Upcoming" 
            count={events.filter(e => e.status === 'upcoming').length} 
            icon="event" 
            color="#ffffff"
            active={filterStatus === 'Upcoming'}
            onPress={() => handleFilterPress('Upcoming')}
          />
          <StatCard 
            label="Ongoing" 
            count={events.filter(e => e.status === 'ongoing').length} 
            icon="play-circle" 
            color="#ffffff"
            active={filterStatus === 'Ongoing'}
            onPress={() => handleFilterPress('Ongoing')}
          />
          <StatCard 
            label="Completed" 
            count={events.filter(e => e.status === 'completed').length} 
            icon="check-circle" 
            color="#ffffff"
            active={filterStatus === 'Completed'}
            onPress={() => handleFilterPress('Completed')}
          />
          <StatCard 
            label="Cancelled" 
            count={events.filter(e => e.status === 'cancelled').length} 
            icon="cancel" 
            color="#ffffff"
            active={filterStatus === 'Cancelled'}
            onPress={() => handleFilterPress('Cancelled')}
          />
        </ScrollView>
      </View>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventCard event={item} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF7722']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="event-busy" size={44} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No events found</Text>
            <Text style={styles.emptyStateSubtext}>Create your first event</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Add/Edit Event Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingEvent ? 'Edit Event' : 'Create Event'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Event Image</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage} activeOpacity={0.7}>
                <MaterialIcons name="photo-library" size={20} color="#FF7722" />
                <Text style={styles.uploadButtonText}>
                  {formData.image ? 'Change Image' : 'Upload Image'}
                </Text>
              </TouchableOpacity>
              {formData.image && (
                <Image source={{ uri: formData.image }} style={styles.imagePreview} />
              )}
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Event Title *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.title}
                onChangeText={(text) => setFormData({...formData, title: text})}
                placeholder="Enter event title"
                textAlignVertical="center"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({...formData, description: text})}
                placeholder="Enter event description"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Date *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.date?.toLocaleDateString?.() || ''}
                  placeholder="MM/DD/YYYY"
                  textAlignVertical="center"
                />
              </View>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Time</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.time}
                  onChangeText={(text) => setFormData({...formData, time: text})}
                  placeholder="10:00 AM"
                  textAlignVertical="center"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Location *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.location}
                  onChangeText={(text) => setFormData({...formData, location: text})}
                  placeholder="Enter location"
                  textAlignVertical="center"
                />
              </View>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Venue</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.venue}
                  onChangeText={(text) => setFormData({...formData, venue: text})}
                  placeholder="Enter venue"
                  textAlignVertical="center"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Category</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.category}
                  onChangeText={(text) => setFormData({...formData, category: text})}
                  placeholder="e.g., Workshop"
                  textAlignVertical="center"
                />
              </View>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Capacity</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.capacity}
                  onChangeText={(text) => setFormData({...formData, capacity: text})}
                  placeholder="Max attendees"
                  keyboardType="numeric"
                  textAlignVertical="center"
                />
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Organizer</Text>
              <TextInput
                style={styles.formInput}
                value={formData.organizer}
                onChangeText={(text) => setFormData({...formData, organizer: text})}
                placeholder="Enter organizer name"
                textAlignVertical="center"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Contact Email</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.contactEmail}
                  onChangeText={(text) => setFormData({...formData, contactEmail: text})}
                  placeholder="Email"
                  keyboardType="email-address"
                  textAlignVertical="center"
                />
              </View>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Contact Phone</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.contactPhone}
                  onChangeText={(text) => setFormData({...formData, contactPhone: text})}
                  placeholder="Phone"
                  keyboardType="phone-pad"
                  textAlignVertical="center"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Status</Text>
                <View style={styles.statusOptions}>
                  {['upcoming', 'ongoing', 'completed', 'cancelled'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.statusOption, formData.status === status && styles.statusOptionActive]}
                      onPress={() => setFormData({...formData, status})}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.statusOptionText, formData.status === status && styles.statusOptionTextActive]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Featured</Text>
                <View style={styles.switchContainer}>
                  <Switch
                    value={formData.featured}
                    onValueChange={(value) => setFormData({...formData, featured: value})}
                    trackColor={{ false: '#767577', true: '#f59e0b' }}
                    thumbColor={formData.featured ? '#ffffff' : '#f4f3f4'}
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSaveEvent} disabled={loading} activeOpacity={0.7}>
              <Text style={styles.submitButtonText}>
                {loading ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Event Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={eventModalVisible}
        onRequestClose={() => setEventModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.detailModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Event Details</Text>
              <TouchableOpacity onPress={() => setEventModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedEvent && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedEvent.image && (
                  <Image source={{ uri: selectedEvent.image }} style={styles.detailImage} />
                )}
                
                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>Title</Text>
                  <Text style={styles.detailValue}>{selectedEvent.title}</Text>
                </View>

                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{selectedEvent.description || 'No description'}</Text>
                </View>

                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>Date & Time</Text>
                  <Text style={styles.detailValue}>
                    {selectedEvent.date?.toLocaleDateString?.() || 'N/A'} at {selectedEvent.time || 'N/A'}
                  </Text>
                </View>

                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{selectedEvent.location}</Text>
                </View>

                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>Venue</Text>
                  <Text style={styles.detailValue}>{selectedEvent.venue || 'N/A'}</Text>
                </View>

                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{selectedEvent.category || 'General'}</Text>
                </View>

                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>Capacity</Text>
                  <Text style={styles.detailValue}>
                    {selectedEvent.registeredCount || 0} / {selectedEvent.capacity || '∞'} registered
                  </Text>
                </View>

                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>Organizer</Text>
                  <Text style={styles.detailValue}>{selectedEvent.organizer || 'N/A'}</Text>
                </View>

                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>Contact</Text>
                  <Text style={styles.detailValue}>
                    {selectedEvent.contactEmail || 'N/A'}
                    {selectedEvent.contactPhone ? ` • ${selectedEvent.contactPhone}` : ''}
                  </Text>
                </View>

                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.detailStatusBadge, { 
                    backgroundColor: getStatusColor(selectedEvent.status) + '15'
                  }]}>
                    <Text style={[styles.detailStatusText, { color: getStatusColor(selectedEvent.status) }]}>
                      {selectedEvent.status || 'upcoming'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailActions}>
                  <TouchableOpacity 
                    style={[styles.detailActionButton, styles.detailEditButton]}
                    onPress={() => {
                      setEventModalVisible(false);
                      setEditingEvent(selectedEvent);
                      setFormData(selectedEvent);
                      setModalVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="edit" size={16} color="#ffffff" />
                    <Text style={styles.detailActionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.detailActionButton, styles.detailDeleteButton]}
                    onPress={() => {
                      setEventModalVisible(false);
                      handleDeleteEvent(selectedEvent.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="delete" size={16} color="#ffffff" />
                    <Text style={styles.detailActionText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf8f3',
  },

  // Saffron Header
  headerCard: {
    backgroundColor: '#FF7722',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  addButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 13,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Search inside header
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Stats inside header
  statsContainer: {
    maxHeight: 70,
    marginBottom: 8,
  },
  statsContent: {
    gap: 8,
    alignItems: 'center',
    paddingVertical: 2,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 6,
    minWidth: 70,
    width: 75,
    alignItems: 'center',
    justifyContent: 'center',
    height: 62,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statCardActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderColor: '#ffffff',
  },
  statIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  statType: {
    fontFamily: Fonts.Regular,
    fontSize: 8,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statCount: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // List Content
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 4,
  },

  // Event Card
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  eventImagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventContent: {
    padding: 14,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  featuredBadge: {
    paddingHorizontal: 8,
  },
  eventDescription: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  eventDetails: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  eventDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventDetail: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventCapacity: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  eventActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    gap: 4,
  },
  editButton: {
    backgroundColor: '#FF7722',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  eventActionText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 11,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyStateText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  emptyStateSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  detailModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  formField: {
    marginBottom: 12,
  },
  formLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f9fafb',
    fontFamily: Fonts.Regular,
    includeFontPadding: false,
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formHalf: {
    width: '48%',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5EB',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD4B3',
    borderStyle: 'dashed',
    gap: 8,
  },
  uploadButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#FF7722',
    fontSize: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 8,
    resizeMode: 'cover',
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  statusOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 2,
  },
  statusOptionActive: {
    backgroundColor: '#FF7722',
    borderColor: '#FF7722',
  },
  statusOptionText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statusOptionTextActive: {
    color: '#ffffff',
  },
  switchContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 4,
  },
  submitButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  detailImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
    resizeMode: 'cover',
  },
  detailField: {
    marginBottom: 12,
  },
  detailLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  detailValue: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  detailStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  detailActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  detailEditButton: {
    backgroundColor: '#FF7722',
  },
  detailDeleteButton: {
    backgroundColor: '#ef4444',
  },
  detailActionText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});