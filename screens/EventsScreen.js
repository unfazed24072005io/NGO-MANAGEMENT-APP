// screens/EventsScreen.js
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '../config/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Fonts } from '../config/fonts';

export default function EventsScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const filters = ['All', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled'];

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
      applyFilters(eventsList, searchQuery, selectedFilter);
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
    applyFilters(events, text, selectedFilter);
  };

  const handleFilterPress = (filter) => {
    setSelectedFilter(filter);
    applyFilters(events, searchQuery, filter);
  };

  const showLoginModal = (event) => {
    setSelectedEvent(event);
    setLoginModalVisible(true);
  };

  const handleEventPress = (event) => {
    showLoginModal(event);
  };

  const handleRegister = (event) => {
    showLoginModal(event);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
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
    const statusColor = getStatusColor(event.status);
    const statusIcon = getStatusIcon(event.status);

    return (
      <TouchableOpacity 
        style={styles.eventCard}
        onPress={() => handleEventPress(event)}
        activeOpacity={0.8}
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
            <Text style={styles.eventTitle}>{event.title}</Text>
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
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.registerButton}
            onPress={() => handleRegister(event)}
          >
            <Text style={styles.registerButtonText}>Register Now</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const StatCard = ({ label, count, icon, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={18} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{count}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Events</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Events</Text>
        </View>

        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <MaterialIcons name="close" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.statsContainer}
          contentContainerStyle={styles.statsContent}
        >
          <StatCard label="Total" count={events.length} icon="event" color="#ffffff" />
          <StatCard label="Upcoming" count={events.filter(e => e.status === 'upcoming').length} icon="event" color="#ffffff" />
          <StatCard label="Ongoing" count={events.filter(e => e.status === 'ongoing').length} icon="play-circle" color="#ffffff" />
          <StatCard label="Completed" count={events.filter(e => e.status === 'completed').length} icon="check-circle" color="#ffffff" />
        </ScrollView>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterWrapper}
        contentContainerStyle={styles.filterContent}
      >
        
      </ScrollView>

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

      {/* Login Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={loginModalVisible}
        onRequestClose={() => setLoginModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <MaterialIcons name="lock" size={50} color="#3b82f6" />
            </View>
            <Text style={styles.modalTitle}>Login Required</Text>
            <Text style={styles.modalMessage}>
              Please login to register for events and participate
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setLoginModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalLoginButton]}
                onPress={() => {
                  setLoginModalVisible(false);
                  navigation.navigate('Login');
                }}
              >
                <Text style={styles.modalLoginText}>Login</Text>
              </TouchableOpacity>
            </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#ffffff',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: { 
    flex: 1, 
    fontFamily: Fonts.Regular,
    fontSize: 14, 
    color: '#1f2937' 
  },

  statsContainer: { 
    maxHeight: 80,
  },
  statsContent: { 
    gap: 10,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 8,
    minWidth: 70,
    width: 75,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: 70,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statContent: { 
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statLabel: { 
    fontFamily: Fonts.Regular,
    fontSize: 8, 
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  statValue: { 
    fontFamily: Fonts.Bold,
    fontSize: 14, 
    color: '#ffffff',
    textAlign: 'center',
  },
  statIcon: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 2,
  },

  filterWrapper: { 
    marginVertical: 12 
  },
  filterContent: { 
    paddingHorizontal: 16, 
    gap: 8 
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: { 
    backgroundColor: '#3b82f6', 
    borderColor: '#3b82f6' 
  },
  filterChipText: { 
    fontFamily: Fonts.SemiBold,
    fontSize: 13, 
    color: '#1f2937' 
  },
  filterChipTextActive: { 
    color: '#ffffff' 
  },

  listContent: { 
    paddingHorizontal: 16, 
    paddingBottom: 20 
  },
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
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
    flex: 1 
  },
  featuredBadge: { 
    paddingHorizontal: 4 
  },
  eventDescription: { 
    fontFamily: Fonts.Regular,
    fontSize: 13, 
    color: '#6b7280', 
    marginTop: 4 
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
    color: '#6b7280' 
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
    fontSize: 11 
  },
  capacityBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4 
  },
  capacityText: { 
    fontFamily: Fonts.Regular,
    fontSize: 12, 
    color: '#6b7280' 
  },
  
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  registerButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#ffffff',
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
    color: '#1f2937' 
  },
  emptyStateSubtext: { 
    fontFamily: Fonts.Regular,
    fontSize: 13, 
    color: '#6b7280' 
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Fonts.Regular,
    marginTop: 10,
    color: '#6b7280',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 30,
    width: '90%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#1f2937',
    marginBottom: 8,
  },
  modalMessage: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f3f4f6',
  },
  modalCancelText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#6b7280',
  },
  modalLoginButton: {
    backgroundColor: '#3b82f6',
  },
  modalLoginText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#ffffff',
  },
});