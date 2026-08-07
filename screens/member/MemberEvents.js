import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image, Modal, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, addDoc, doc, query, where, orderBy, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function MemberEvents({ navigation }) {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [registeredEventIds, setRegisteredEventIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);

  const filters = ['All', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled'];

  useEffect(() => {
    setupRealtimeListener();
    fetchRegisteredEvents();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfilePhoto(data.profilePhoto || null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

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
      applyFilters(eventsList, searchQuery, selectedFilter);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const fetchRegisteredEvents = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const regSnap = await getDocs(query(
        collection(db, 'eventRegistrations'),
        where('memberId', '==', userId),
        where('status', '==', 'confirmed')
      ));
      
      const ids = [];
      regSnap.forEach((doc) => {
        ids.push(doc.data().eventId);
      });
      setRegisteredEventIds(ids);
    } catch (error) {
      console.error('Error fetching registered events:', error);
    }
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
    applyFilters(events, text, selectedFilter);
  };

  const handleFilterPress = (filter) => {
    setSelectedFilter(filter);
    applyFilters(events, searchQuery, filter);
  };

  const handleRegister = async (event) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    if (registeredEventIds.includes(event.id)) {
      Alert.alert('Already Registered', 'You have already registered for this event');
      return;
    }

    if (event.capacity && event.registeredCount >= event.capacity) {
      Alert.alert('Event Full', 'This event has reached maximum capacity');
      return;
    }

    setRegistering(true);
    try {
      await addDoc(collection(db, 'eventRegistrations'), {
        eventId: event.id,
        memberId: userId,
        eventTitle: event.title,
        eventDate: event.date,
        eventLocation: event.location,
        registeredAt: new Date().toISOString(),
        status: 'confirmed'
      });

      await updateDoc(doc(db, 'events', event.id), {
        registeredCount: (event.registeredCount || 0) + 1
      });

      setRegisteredEventIds([...registeredEventIds, event.id]);
      Alert.alert('Success', `You have successfully registered for ${event.title}`);
      setDetailModalVisible(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async (event) => {
    Alert.alert(
      'Cancel Registration',
      `Are you sure you want to cancel registration for ${event.title}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const userId = auth.currentUser?.uid;
              const regSnap = await getDocs(query(
                collection(db, 'eventRegistrations'),
                where('eventId', '==', event.id),
                where('memberId', '==', userId)
              ));

              regSnap.forEach(async (doc) => {
                await updateDoc(doc.ref, { status: 'cancelled' });
              });

              setRegisteredEventIds(registeredEventIds.filter(id => id !== event.id));
              await updateDoc(doc(db, 'events', event.id), {
                registeredCount: Math.max((event.registeredCount || 0) - 1, 0)
              });

              Alert.alert('Success', 'Registration cancelled');
              setDetailModalVisible(false);
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRegisteredEvents();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'upcoming': return '#3b82f6';
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

  const EventCard = ({ event }) => {
    const isRegistered = registeredEventIds.includes(event.id);
    const statusColor = getStatusColor(event.status);
    const statusIcon = getStatusIcon(event.status);
    const isFull = event.capacity && event.registeredCount >= event.capacity;

    return (
      <TouchableOpacity 
        style={styles.eventCard}
        onPress={() => {
          setSelectedEvent(event);
          setDetailModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        {event.image ? (
          <Image source={{ uri: event.image }} style={styles.eventImage} />
        ) : (
          <View style={styles.eventImagePlaceholder}>
            <MaterialIcons name="event" size={36} color="#9ca3af" />
          </View>
        )}
        
        {isRegistered && (
          <View style={styles.registeredBadge}>
            <MaterialIcons name="check-circle" size={14} color="#ffffff" />
            <Text style={styles.registeredBadgeText}>Registered</Text>
          </View>
        )}

        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
            {event.featured && (
              <View style={styles.featuredBadge}>
                <MaterialIcons name="star" size={14} color="#f59e0b" />
              </View>
            )}
          </View>

          <Text style={styles.eventDescription} numberOfLines={2}>
            {event.description || 'No description'}
          </Text>

          <View style={styles.eventDetails}>
            <View style={styles.eventDetailItem}>
              <MaterialIcons name="event" size={14} color="#6b7280" />
              <Text style={styles.eventDetailText}>
                {event.date?.toLocaleDateString?.() || 'N/A'}
              </Text>
            </View>
            <View style={styles.eventDetailItem}>
              <MaterialIcons name="location-on" size={14} color="#6b7280" />
              <Text style={styles.eventDetailText}>{event.location || 'N/A'}</Text>
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
              <MaterialIcons name="people" size={14} color="#6b7280" />
              <Text style={styles.capacityText}>
                {event.registeredCount || 0}/{event.capacity || '∞'}
                {isFull && <Text style={styles.fullText}> (Full)</Text>}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const StatCard = ({ label, count, icon, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={16} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{count}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Blue Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
              <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Events</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileIcon}
            onPress={() => navigation.navigate('MemberProfile')}
            activeOpacity={0.7}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
            ) : (
              <MaterialIcons name="person" size={26} color="#3b82f6" />
            )}
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
            <TouchableOpacity onPress={() => handleSearch('')} activeOpacity={0.7}>
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
          <StatCard label="Total" count={events.length} icon="event" color="#ffffff" />
          <StatCard label="Upcoming" count={events.filter(e => e.status === 'upcoming').length} icon="event" color="#ffffff" />
          <StatCard label="Registered" count={registeredEventIds.length} icon="check-circle" color="#ffffff" />
          <StatCard label="Ongoing" count={events.filter(e => e.status === 'ongoing').length} icon="play-circle" color="#ffffff" />
        </ScrollView>
      </View>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventCard event={item} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="event-busy" size={44} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No events found</Text>
            <Text style={styles.emptyStateSubtext}>Check back later for upcoming events</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Event Detail Modal */}
      <Modal animationType="slide" transparent={true} visible={detailModalVisible} onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Event Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)} activeOpacity={0.7}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedEvent && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedEvent.image && <Image source={{ uri: selectedEvent.image }} style={styles.detailImage} />}

                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>{selectedEvent.title}</Text>
                  <View style={styles.detailStatusRow}>
                    <View style={[styles.detailStatusBadge, { backgroundColor: getStatusColor(selectedEvent.status) + '15' }]}>
                      <Text style={[styles.detailStatusText, { color: getStatusColor(selectedEvent.status) }]}>
                        {selectedEvent.status || 'upcoming'}
                      </Text>
                    </View>
                    {selectedEvent.featured && (
                      <View style={styles.detailFeaturedBadge}>
                        <MaterialIcons name="star" size={14} color="#f59e0b" />
                        <Text style={styles.detailFeaturedText}>Featured</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{selectedEvent.description || 'No description'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Date & Time</Text>
                  <Text style={styles.detailValue}>
                    {selectedEvent.date?.toLocaleDateString?.() || 'N/A'} at {selectedEvent.time || 'N/A'}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{selectedEvent.location}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Venue</Text>
                  <Text style={styles.detailValue}>{selectedEvent.venue || 'N/A'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{selectedEvent.category || 'General'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Capacity</Text>
                  <Text style={styles.detailValue}>
                    {selectedEvent.registeredCount || 0} / {selectedEvent.capacity || '∞'} registered
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Organizer</Text>
                  <Text style={styles.detailValue}>{selectedEvent.organizer || 'N/A'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Contact</Text>
                  <Text style={styles.detailValue}>
                    {selectedEvent.contactEmail || 'N/A'}
                    {selectedEvent.contactPhone ? ` • ${selectedEvent.contactPhone}` : ''}
                  </Text>
                </View>

                <View style={styles.detailActions}>
                  {registeredEventIds.includes(selectedEvent.id) ? (
                    <TouchableOpacity style={[styles.detailActionButton, styles.unregisterButton]} onPress={() => handleUnregister(selectedEvent)} activeOpacity={0.7}>
                      <MaterialIcons name="cancel" size={20} color="#ffffff" />
                      <Text style={styles.detailActionText}>Cancel Registration</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={[styles.detailActionButton, 
                        (selectedEvent.capacity && selectedEvent.registeredCount >= selectedEvent.capacity) 
                          ? styles.disabledButton 
                          : styles.registerButton
                      ]}
                      onPress={() => handleRegister(selectedEvent)}
                      disabled={registering || (selectedEvent.capacity && selectedEvent.registeredCount >= selectedEvent.capacity)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="event" size={20} color="#ffffff" />
                      <Text style={styles.detailActionText}>
                        {registering ? 'Registering...' : 
                         (selectedEvent.capacity && selectedEvent.registeredCount >= selectedEvent.capacity) 
                          ? 'Event Full' : 'Register Now'}
                      </Text>
                    </TouchableOpacity>
                  )}
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
    backgroundColor: '#f8fafc' 
  },
  
  // Blue Header Card
  headerCard: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    fontSize: 22,
    color: '#ffffff',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  profileIcon: {
    width: 64,
    height: 64,
    borderRadius: 50,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 50,
  },

  // Search inside header
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
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
    maxHeight: 72,
  },
  statsContent: { 
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 6,
    minWidth: 65,
    width: 70,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: 62,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderLeftWidth: 3,
  },
  statContent: { 
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  statLabel: { 
    fontFamily: Fonts.Regular,
    fontSize: 7, 
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statValue: { 
    fontFamily: Fonts.Bold,
    fontSize: 13, 
    color: '#ffffff',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statIcon: { 
    width: 22, 
    height: 22, 
    borderRadius: 11, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 1,
  },

  // List
  listContent: { 
    paddingHorizontal: 16, 
    paddingBottom: 20,
    paddingTop: 4,
  },
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    position: 'relative',
    marginTop: 6,
  },
  eventImage: { 
    width: '100%', 
    height: 150, 
    resizeMode: 'cover' 
  },
  eventImagePlaceholder: { 
    width: '100%', 
    height: 150, 
    backgroundColor: '#f3f4f6', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  registeredBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  registeredBadgeText: { 
    fontFamily: Fonts.SemiBold,
    color: '#ffffff', 
    fontSize: 10,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  eventContent: { 
    padding: 14 
  },
  eventHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
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
    paddingHorizontal: 4 
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
    gap: 16 
  },
  eventDetailItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4 
  },
  eventDetailText: { 
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
    borderTopColor: '#f3f4f6' 
  },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 3, 
    borderRadius: 12, 
    gap: 4 
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
    gap: 4 
  },
  capacityText: { 
    fontFamily: Fonts.Regular,
    fontSize: 12, 
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  fullText: { 
    color: '#ef4444', 
    fontFamily: Fonts.SemiBold 
  },
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingTop: 60, 
    gap: 12 
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
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    padding: 16 
  },
  modalContent: { 
    backgroundColor: '#ffffff', 
    borderRadius: 16, 
    padding: 20, 
    maxHeight: '85%' 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  modalTitle: { 
    fontFamily: Fonts.Bold,
    fontSize: 20, 
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  detailImage: { 
    width: '100%', 
    height: 200, 
    borderRadius: 8, 
    marginBottom: 16, 
    resizeMode: 'cover' 
  },
  detailSection: { 
    marginBottom: 12 
  },
  detailTitle: { 
    fontFamily: Fonts.Bold,
    fontSize: 18, 
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  detailStatusRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginTop: 8 
  },
  detailStatusBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  detailStatusText: { 
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  detailFeaturedBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fef3c7', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 12, 
    gap: 4 
  },
  detailFeaturedText: { 
    fontFamily: Fonts.SemiBold,
    fontSize: 11, 
    color: '#f59e0b',
    includeFontPadding: false,
    textAlignVertical: 'center',
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
  detailActions: { 
    marginTop: 16, 
    paddingTop: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#f3f4f6' 
  },
  detailActionButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 12, 
    borderRadius: 8, 
    gap: 8 
  },
  registerButton: { 
    backgroundColor: '#3b82f6' 
  },
  unregisterButton: { 
    backgroundColor: '#ef4444' 
  },
  disabledButton: { 
    backgroundColor: '#9ca3af' 
  },
  detailActionText: { 
    fontFamily: Fonts.SemiBold,
    color: '#ffffff', 
    fontSize: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});