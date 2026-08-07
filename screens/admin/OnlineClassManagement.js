// screens/admin/OnlineClassManagement.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal, ActivityIndicator, RefreshControl, FlatList, Image, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function OnlineClassManagement({ navigation }) {
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructor: '',
    category: '',
    date: '',
    time: '',
    duration: '',
    googleMeetLink: '',
    meetingId: '',
    password: '',
    capacity: '',
    registeredCount: 0,
    status: 'upcoming',
    image: null,
    recordingLink: '',
    materials: [],
    prerequisites: '',
    level: 'beginner'
  });

  useEffect(() => {
    setupRealtimeListener();
  }, []);

  const setupRealtimeListener = () => {
    const q = query(collection(db, 'onlineClasses'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classesList = [];
      snapshot.forEach((doc) => {
        classesList.push({ id: doc.id, ...doc.data() });
      });
      setClasses(classesList);
      applyFilters(classesList, searchQuery);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const applyFilters = (data, searchText) => {
    let filtered = data;
    if (searchText) {
      filtered = filtered.filter(cls =>
        cls.title?.toLowerCase().includes(searchText.toLowerCase()) ||
        cls.instructor?.toLowerCase().includes(searchText.toLowerCase()) ||
        cls.category?.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    setFilteredClasses(filtered);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFilters(classes, text);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.googleMeetLink) {
      Alert.alert('Error', 'Please fill all required fields (Title and Google Meet Link)');
      return;
    }

    setLoading(true);
    try {
      const data = {
        title: formData.title,
        description: formData.description || '',
        instructor: formData.instructor || 'N/A',
        category: formData.category || 'General',
        date: formData.date || new Date().toISOString().split('T')[0],
        time: formData.time || '10:00 AM',
        duration: formData.duration || '1 hour',
        googleMeetLink: formData.googleMeetLink,
        meetingId: formData.meetingId || '',
        password: formData.password || '',
        capacity: parseInt(formData.capacity) || 0,
        registeredCount: formData.registeredCount || 0,
        status: formData.status || 'upcoming',
        image: formData.image || null,
        recordingLink: formData.recordingLink || '',
        materials: formData.materials || [],
        prerequisites: formData.prerequisites || '',
        level: formData.level || 'beginner',
        updatedAt: new Date().toISOString()
      };

      if (editingClass) {
        await updateDoc(doc(db, 'onlineClasses', editingClass.id), data);
        Alert.alert('Success', 'Class updated successfully');
      } else {
        data.createdAt = new Date().toISOString();
        data.createdBy = auth.currentUser?.uid || 'admin';
        await addDoc(collection(db, 'onlineClasses'), data);
        Alert.alert('Success', 'Class created successfully');
      }

      setModalVisible(false);
      resetForm();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      'Delete Class',
      'Are you sure you want to delete this class?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'onlineClasses', id));
              Alert.alert('Success', 'Class deleted successfully');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await updateDoc(doc(db, 'onlineClasses', id), { 
        status, 
        updatedAt: new Date().toISOString() 
      });
      Alert.alert('Success', `Status updated to ${status}`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const openMeetLink = (link) => {
    if (link) {
      Linking.openURL(link).catch(() => {
        Alert.alert('Error', 'Could not open the meeting link');
      });
    } else {
      Alert.alert('No Link', 'Google Meet link not available for this class');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      instructor: '',
      category: '',
      date: '',
      time: '',
      duration: '',
      googleMeetLink: '',
      meetingId: '',
      password: '',
      capacity: '',
      registeredCount: 0,
      status: 'upcoming',
      image: null,
      recordingLink: '',
      materials: [],
      prerequisites: '',
      level: 'beginner'
    });
    setEditingClass(null);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'upcoming': return '#3b82f6';
      case 'live': return '#10b981';
      case 'completed': return '#6b7280';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getLevelColor = (level) => {
    switch(level) {
      case 'beginner': return '#10b981';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const StatCard = ({ label, count, icon, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statIconContainer}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <View style={styles.statTextContainer}>
        <Text style={styles.statCount}>{count}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  const ClassCard = ({ classItem }) => (
    <TouchableOpacity 
      style={styles.classCard}
      onPress={() => {
        setSelectedClass(classItem);
        setDetailModalVisible(true);
      }}
    >
      <View style={styles.classHeader}>
        <Text style={styles.classTitle} numberOfLines={1}>{classItem.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(classItem.status) + '15' }]}>
          <Text style={[styles.statusBadgeText, { color: getStatusColor(classItem.status) }]}>
            {classItem.status || 'upcoming'}
          </Text>
        </View>
      </View>

      <Text style={styles.classDescription} numberOfLines={2}>
        {classItem.description || 'No description'}
      </Text>

      <View style={styles.classDetails}>
        <View style={styles.classDetail}>
          <MaterialIcons name="person" size={14} color="#6b7280" />
          <Text style={styles.classDetailText}>{classItem.instructor}</Text>
        </View>
        <View style={styles.classDetail}>
          <MaterialIcons name="event" size={14} color="#6b7280" />
          <Text style={styles.classDetailText}>{classItem.date}</Text>
        </View>
        <View style={styles.classDetail}>
          <MaterialIcons name="access-time" size={14} color="#6b7280" />
          <Text style={styles.classDetailText}>{classItem.time}</Text>
        </View>
      </View>

      <View style={styles.classFooter}>
        <View style={[styles.levelBadge, { backgroundColor: getLevelColor(classItem.level) + '15' }]}>
          <Text style={[styles.levelBadgeText, { color: getLevelColor(classItem.level) }]}>
            {classItem.level || 'beginner'}
          </Text>
        </View>
        <View style={styles.capacityBadge}>
          <MaterialIcons name="people" size={14} color="#6b7280" />
          <Text style={styles.capacityText}>
            {classItem.registeredCount || 0}/{classItem.capacity || '∞'}
          </Text>
        </View>
      </View>

      <View style={styles.classActions}>
        {classItem.googleMeetLink && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.meetButton]}
            onPress={() => openMeetLink(classItem.googleMeetLink)}
          >
            <MaterialIcons name="video-call" size={14} color="#ffffff" />
            <Text style={styles.actionButtonText}>Join Meet</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => {
            setEditingClass(classItem);
            setFormData(classItem);
            setModalVisible(true);
          }}
        >
          <MaterialIcons name="edit" size={14} color="#ffffff" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(classItem.id)}
        >
          <MaterialIcons name="delete" size={14} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Online Classes</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => {
              resetForm();
              setModalVisible(true);
            }}
          >
            <MaterialIcons name="add" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search classes..."
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

        <View style={styles.statsContainer}>
          <StatCard 
            label="Total" 
            count={classes.length} 
            icon="video-library" 
            color="#FF7722" 
          />
          <StatCard 
            label="Upcoming" 
            count={classes.filter(c => c.status === 'upcoming').length} 
            icon="event" 
            color="#3b82f6" 
          />
          <StatCard 
            label="Live" 
            count={classes.filter(c => c.status === 'live').length} 
            icon="video-call" 
            color="#10b981" 
          />
        </View>
      </View>

      <FlatList
        data={filteredClasses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ClassCard classItem={item} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF7722']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="video-library" size={44} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No classes found</Text>
            <Text style={styles.emptyStateSubtext}>Create your first online class</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingClass ? 'Edit Class' : 'Create Class'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Class Title *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.title}
                onChangeText={(text) => setFormData({...formData, title: text})}
                placeholder="Enter class title"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Google Meet Link *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.googleMeetLink}
                onChangeText={(text) => setFormData({...formData, googleMeetLink: text})}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Meeting ID</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.meetingId}
                  onChangeText={(text) => setFormData({...formData, meetingId: text})}
                  placeholder="Meeting ID"
                />
              </View>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Password</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.password}
                  onChangeText={(text) => setFormData({...formData, password: text})}
                  placeholder="Meeting password"
                />
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({...formData, description: text})}
                placeholder="Enter class description"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Instructor</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.instructor}
                  onChangeText={(text) => setFormData({...formData, instructor: text})}
                  placeholder="Instructor name"
                />
              </View>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Category</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.category}
                  onChangeText={(text) => setFormData({...formData, category: text})}
                  placeholder="e.g., Yoga, Coding"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Date</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.date}
                  onChangeText={(text) => setFormData({...formData, date: text})}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Time</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.time}
                  onChangeText={(text) => setFormData({...formData, time: text})}
                  placeholder="10:00 AM"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Duration</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.duration}
                  onChangeText={(text) => setFormData({...formData, duration: text})}
                  placeholder="1 hour"
                />
              </View>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Capacity</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.capacity}
                  onChangeText={(text) => setFormData({...formData, capacity: text})}
                  placeholder="Max participants"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Level</Text>
                <View style={styles.levelContainer}>
                  {['beginner', 'intermediate', 'advanced'].map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[styles.levelOption, formData.level === level && styles.levelOptionActive]}
                      onPress={() => setFormData({...formData, level})}
                    >
                      <Text style={[styles.levelOptionText, formData.level === level && styles.levelOptionTextActive]}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Status</Text>
                <View style={styles.statusContainer}>
                  {['upcoming', 'live', 'completed', 'cancelled'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.statusOption, formData.status === status && styles.statusOptionActive]}
                      onPress={() => setFormData({...formData, status})}
                    >
                      <Text style={[styles.statusOptionText, formData.status === status && styles.statusOptionTextActive]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Prerequisites</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={formData.prerequisites}
                onChangeText={(text) => setFormData({...formData, prerequisites: text})}
                placeholder="Enter prerequisites"
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Recording Link</Text>
              <TextInput
                style={styles.formInput}
                value={formData.recordingLink}
                onChangeText={(text) => setFormData({...formData, recordingLink: text})}
                placeholder="Link to class recording"
              />
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSave} disabled={loading}>
              <Text style={styles.submitButtonText}>
                {loading ? 'Saving...' : editingClass ? 'Update Class' : 'Create Class'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            {selectedClass && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Class Details</Text>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                    <MaterialIcons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Title</Text>
                  <Text style={styles.detailValue}>{selectedClass.title}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{selectedClass.description || 'No description'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Instructor</Text>
                  <Text style={styles.detailValue}>{selectedClass.instructor}</Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={[styles.detailSection, { flex: 1 }]}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>{selectedClass.date}</Text>
                  </View>
                  <View style={[styles.detailSection, { flex: 1 }]}>
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>{selectedClass.time}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={[styles.detailSection, { flex: 1 }]}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>{selectedClass.duration}</Text>
                  </View>
                  <View style={[styles.detailSection, { flex: 1 }]}>
                    <Text style={styles.detailLabel}>Level</Text>
                    <Text style={[styles.detailValue, { color: getLevelColor(selectedClass.level) }]}>
                      {selectedClass.level || 'beginner'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Google Meet Link</Text>
                  <TouchableOpacity onPress={() => openMeetLink(selectedClass.googleMeetLink)}>
                    <Text style={[styles.detailValue, styles.linkText]}>
                      {selectedClass.googleMeetLink || 'Not available'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {selectedClass.meetingId && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Meeting ID</Text>
                    <Text style={styles.detailValue}>{selectedClass.meetingId}</Text>
                  </View>
                )}

                {selectedClass.password && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Password</Text>
                    <Text style={styles.detailValue}>{selectedClass.password}</Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Capacity</Text>
                  <Text style={styles.detailValue}>
                    {selectedClass.registeredCount || 0} / {selectedClass.capacity || '∞'} registered
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Prerequisites</Text>
                  <Text style={styles.detailValue}>{selectedClass.prerequisites || 'No prerequisites'}</Text>
                </View>

                {selectedClass.recordingLink && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Recording</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(selectedClass.recordingLink)}>
                      <Text style={[styles.detailValue, styles.linkText]}>Watch Recording</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.detailStatusBadge, { backgroundColor: getStatusColor(selectedClass.status) + '15' }]}>
                    <Text style={[styles.detailStatusText, { color: getStatusColor(selectedClass.status) }]}>
                      {selectedClass.status || 'upcoming'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailActions}>
                  {selectedClass.googleMeetLink && selectedClass.status !== 'completed' && (
                    <TouchableOpacity 
                      style={[styles.detailActionButton, styles.joinMeetButton]}
                      onPress={() => openMeetLink(selectedClass.googleMeetLink)}
                    >
                      <MaterialIcons name="video-call" size={16} color="#ffffff" />
                      <Text style={styles.detailActionText}>Join Meet</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={[styles.detailActionButton, styles.editDetailButton]}
                    onPress={() => {
                      setDetailModalVisible(false);
                      setEditingClass(selectedClass);
                      setFormData(selectedClass);
                      setModalVisible(true);
                    }}
                  >
                    <MaterialIcons name="edit" size={16} color="#ffffff" />
                    <Text style={styles.detailActionText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 8,
    borderRadius: 10,
    gap: 8,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statCount: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#ffffff',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  classCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  classTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  classDescription: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  classDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  classDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  classDetailText: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  classFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  levelBadgeText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  capacityText: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  classActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  meetButton: {
    backgroundColor: '#10b981',
  },
  editButton: {
    backgroundColor: '#FF7722',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 10,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
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
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formHalf: {
    width: '48%',
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
    textAlignVertical: 'center',
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  levelContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  levelOption: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelOptionActive: {
    backgroundColor: '#FF7722',
    borderColor: '#FF7722',
  },
  levelOptionText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  levelOptionTextActive: {
    color: '#ffffff',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
  },
  statusOptionActive: {
    backgroundColor: '#FF7722',
    borderColor: '#FF7722',
  },
  statusOptionText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statusOptionTextActive: {
    color: '#ffffff',
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
  detailSection: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
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
  linkText: {
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
  detailStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
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
  joinMeetButton: {
    backgroundColor: '#10b981',
  },
  editDetailButton: {
    backgroundColor: '#FF7722',
  },
  detailActionText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});