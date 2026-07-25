import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function MemberComplaint({ navigation }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium'
  });

  useEffect(() => {
    setupRealtimeListener();
  }, []);

  const setupRealtimeListener = () => {
    const userId = auth.currentUser?.uid;
    const unsubscribe = onSnapshot(
      query(collection(db, 'complaints'), where('createdBy', '==', userId), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const complaintsList = [];
        snapshot.forEach((doc) => {
          complaintsList.push({ id: doc.id, ...doc.data() });
        });
        setComplaints(complaintsList);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'complaints'), {
        title: formData.title,
        description: formData.description,
        category: formData.category || 'General',
        priority: formData.priority || 'medium',
        status: 'pending',
        type: 'complaint',
        createdBy: auth.currentUser?.uid,
        createdByName: auth.currentUser?.displayName || 'Member',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      Alert.alert('Success', 'Your complaint has been submitted');
      setModalVisible(false);
      resetForm();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      priority: 'medium'
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'resolved': return '#3b82f6';
      case 'closed': return '#6b7280';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const ComplaintCard = ({ item }) => (
    <TouchableOpacity style={styles.complaintCard} onPress={() => { setSelectedItem(item); setDetailModalVisible(true); }}>
      <View style={styles.complaintHeader}>
        <View style={[styles.complaintIcon, { backgroundColor: getPriorityColor(item.priority) + '15' }]}>
          <MaterialIcons name="report-problem" size={20} color={getPriorityColor(item.priority)} />
        </View>
        <Text style={styles.complaintTitle} numberOfLines={1}>{item.title}</Text>
        <View style={[styles.complaintStatus, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <Text style={[styles.complaintStatusText, { color: getStatusColor(item.status) }]}>{item.status || 'pending'}</Text>
        </View>
      </View>
      <Text style={styles.complaintDescription} numberOfLines={2}>{item.description}</Text>
      <View style={styles.complaintFooter}>
        <Text style={styles.complaintCategory}>📂 {item.category || 'General'}</Text>
        <View style={styles.priorityBadge}>
          <MaterialIcons name="flag" size={12} color={getPriorityColor(item.priority)} />
          <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>{item.priority || 'medium'}</Text>
        </View>
        <Text style={styles.complaintDate}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Complaints</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setModalVisible(true); }}>
            <MaterialIcons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={complaints}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ComplaintCard item={item} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="report-problem" size={44} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No complaints</Text>
            <Text style={styles.emptyStateSubtext}>Submit a complaint to get help</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => { resetForm(); setModalVisible(true); }}>
              <Text style={styles.emptyButtonText}>Submit Complaint</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Submit Complaint Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Complaint</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Title *</Text>
              <TextInput style={styles.formInput} value={formData.title} onChangeText={(text) => setFormData({...formData, title: text})} placeholder="Enter title" />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Description *</Text>
              <TextInput style={[styles.formInput, styles.formTextArea]} value={formData.description} onChangeText={(text) => setFormData({...formData, description: text})} placeholder="Describe your issue" multiline numberOfLines={4} />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Category</Text>
              <TextInput style={styles.formInput} value={formData.category} onChangeText={(text) => setFormData({...formData, category: text})} placeholder="e.g., General, Technical, Event" />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Priority</Text>
              <View style={styles.priorityContainer}>
                {['low', 'medium', 'high'].map((priority) => (
                  <TouchableOpacity key={priority} style={[styles.priorityButton, formData.priority === priority && styles.priorityButtonActive]} onPress={() => setFormData({...formData, priority})}>
                    <Text style={[styles.priorityButtonText, formData.priority === priority && styles.priorityButtonTextActive]}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
              <Text style={styles.submitButtonText}>{loading ? 'Submitting...' : 'Submit'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal animationType="slide" transparent={true} visible={detailModalVisible} onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complaint Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>{selectedItem.title}</Text>
                  <View style={styles.detailStatusRow}>
                    <View style={[styles.detailStatusBadge, { backgroundColor: getStatusColor(selectedItem.status) + '15' }]}>
                      <Text style={[styles.detailStatusText, { color: getStatusColor(selectedItem.status) }]}>{selectedItem.status || 'pending'}</Text>
                    </View>
                    <View style={[styles.detailPriorityBadge, { backgroundColor: getPriorityColor(selectedItem.priority) + '15' }]}>
                      <Text style={[styles.detailPriorityText, { color: getPriorityColor(selectedItem.priority) }]}>{selectedItem.priority}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{selectedItem.description}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{selectedItem.category || 'General'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Created</Text>
                  <Text style={styles.detailValue}>{selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleString() : 'N/A'}</Text>
                </View>

                {selectedItem.status === 'resolved' && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Resolution</Text>
                    <Text style={styles.detailValue}>This complaint has been resolved</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  // Blue Header
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 4 },
  headerTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  addButton: { padding: 4 },

  listContent: { paddingHorizontal: 16, paddingBottom: 20 },

  complaintCard: { 
    backgroundColor: '#ffffff', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: '#e5e7eb' 
  },
  complaintHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 4 
  },
  complaintIcon: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  complaintTitle: { 
    fontFamily: Fonts.SemiBold,
    fontSize: 14, 
    color: '#1f2937', 
    flex: 1 
  },
  complaintStatus: { 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 10 
  },
  complaintStatusText: { 
    fontFamily: Fonts.SemiBold,
    fontSize: 10 
  },
  complaintDescription: { 
    fontFamily: Fonts.Regular,
    fontSize: 13, 
    color: '#6b7280', 
    marginLeft: 40 
  },
  complaintFooter: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 8, 
    marginLeft: 40, 
    paddingTop: 8, 
    borderTopWidth: 1, 
    borderTopColor: '#f3f4f6', 
    gap: 12 
  },
  complaintCategory: { 
    fontFamily: Fonts.Regular,
    fontSize: 11, 
    color: '#6b7280' 
  },
  priorityBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4 
  },
  priorityText: { 
    fontFamily: Fonts.SemiBold,
    fontSize: 11 
  },
  complaintDate: { 
    fontFamily: Fonts.Regular,
    fontSize: 11, 
    color: '#9ca3af', 
    marginLeft: 'auto' 
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
  emptyButton: { 
    backgroundColor: '#3b82f6', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 8 
  },
  emptyButtonText: { 
    fontFamily: Fonts.SemiBold,
    color: '#ffffff', 
    fontSize: 14 
  },

  // Modals
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
    color: '#1f2937' 
  },

  formField: { marginBottom: 12 },
  formLabel: { 
    fontFamily: Fonts.SemiBold,
    fontSize: 14, 
    color: '#1f2937', 
    marginBottom: 4 
  },
  formInput: { 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    borderRadius: 8, 
    padding: 10, 
    fontSize: 14, 
    backgroundColor: '#f9fafb',
    fontFamily: Fonts.Regular,
  },
  formTextArea: { height: 100, textAlignVertical: 'top' },

  priorityContainer: { flexDirection: 'row', gap: 8 },
  priorityButton: { 
    flex: 1, 
    paddingVertical: 8, 
    borderRadius: 6, 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    alignItems: 'center' 
  },
  priorityButtonActive: { 
    backgroundColor: '#3b82f6', 
    borderColor: '#3b82f6' 
  },
  priorityButtonText: { 
    fontFamily: Fonts.SemiBold,
    fontSize: 12, 
    color: '#6b7280' 
  },
  priorityButtonTextActive: { color: '#ffffff' },

  submitButton: { 
    backgroundColor: '#10b981', 
    paddingVertical: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 12 
  },
  submitButtonText: { 
    fontFamily: Fonts.SemiBold,
    color: '#ffffff', 
    fontSize: 16 
  },

  // Detail Modal
  detailSection: { marginBottom: 12 },
  detailTitle: { 
    fontFamily: Fonts.Bold,
    fontSize: 18, 
    color: '#1f2937' 
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
    fontSize: 12 
  },
  detailPriorityBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  detailPriorityText: { 
    fontFamily: Fonts.SemiBold,
    fontSize: 12 
  },
  detailLabel: { 
    fontFamily: Fonts.SemiBold,
    fontSize: 12, 
    color: '#6b7280', 
    marginBottom: 2 
  },
  detailValue: { 
    fontFamily: Fonts.Regular,
    fontSize: 14, 
    color: '#1f2937' 
  },
});