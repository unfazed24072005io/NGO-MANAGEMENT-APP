import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function NoticesScreen({ navigation }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    status: 'active',
    targetAudience: 'all'
  });

  useEffect(() => {
    setupRealtimeListeners();
  }, []);

  const setupRealtimeListeners = () => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'notices'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const noticesList = [];
        snapshot.forEach((doc) => {
          noticesList.push({ id: doc.id, ...doc.data() });
        });
        setNotices(noticesList);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  };

  const handleSave = async () => {
    if (!formData.title || !formData.description) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const data = {
        title: formData.title,
        description: formData.description,
        category: formData.category || 'General',
        priority: formData.priority || 'medium',
        status: formData.status || 'active',
        targetAudience: formData.targetAudience || 'all',
        updatedAt: new Date().toISOString()
      };

      if (editingItem) {
        await updateDoc(doc(db, 'notices', editingItem.id), data);
        Alert.alert('Success', 'Notice updated successfully');
      } else {
        data.createdAt = new Date().toISOString();
        data.createdBy = auth.currentUser?.uid || 'admin';
        data.createdByName = auth.currentUser?.displayName || 'Admin';
        await addDoc(collection(db, 'notices'), data);
        Alert.alert('Success', 'Notice created successfully');
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
      'Delete',
      'Are you sure you want to delete this notice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'notices', id));
              Alert.alert('Success', 'Notice deleted successfully');
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
      await updateDoc(doc(db, 'notices', id), { 
        status, 
        updatedAt: new Date().toISOString() 
      });
      Alert.alert('Success', `Status updated to ${status}`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      priority: 'medium',
      status: 'active',
      targetAudience: 'all'
    });
    setEditingItem(null);
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

  const getFilteredItems = () => {
    let items = notices;
    if (filterStatus !== 'All') {
      items = items.filter(item => item.status === filterStatus.toLowerCase());
    }
    if (searchQuery) {
      items = items.filter(item => 
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return items;
  };

  const StatCard = ({ label, count, icon, color, active, onPress }) => (
    <TouchableOpacity 
      style={[styles.statCard, active && styles.statCardActive]} 
      onPress={onPress}
    >
      <View style={[styles.statIconCircle, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statType}>{label}</Text>
      <Text style={[styles.statCount, { color }]}>{count}</Text>
    </TouchableOpacity>
  );

  const NoticeCard = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const priorityColor = getPriorityColor(item.priority);
    
    return (
      <TouchableOpacity 
        style={styles.itemCard}
        onPress={() => {
          setSelectedItem(item);
          setDetailModalVisible(true);
        }}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleContainer}>
            <View style={[styles.itemIcon, { backgroundColor: statusColor + '15' }]}>
              <MaterialIcons name="announcement" size={20} color={statusColor} />
            </View>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
          </View>
          <View style={[styles.itemStatusBadge, { backgroundColor: statusColor + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.itemStatusText, { color: statusColor }]}>{item.status || 'active'}</Text>
          </View>
        </View>

        <Text style={styles.itemDescription} numberOfLines={2}>{item.description}</Text>

        <View style={styles.itemFooter}>
          <View style={styles.itemMeta}>
            <View style={styles.metaTag}>
              <MaterialIcons name="folder" size={12} color="#6b7280" />
              <Text style={styles.itemCategory}>{item.category || 'General'}</Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '15' }]}>
              <MaterialIcons name="flag" size={12} color={priorityColor} />
              <Text style={[styles.priorityText, { color: priorityColor }]}>
                {item.priority || 'medium'}
              </Text>
            </View>
          </View>
          <Text style={styles.itemDate}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
          </Text>
        </View>

        <View style={styles.itemActions}>
          <TouchableOpacity 
            style={[styles.itemActionButton, styles.itemEditButton]}
            onPress={() => {
              setEditingItem(item);
              setFormData({...item});
              setModalVisible(true);
            }}
          >
            <MaterialIcons name="edit" size={14} color="#ffffff" />
            <Text style={styles.itemActionText}>Edit</Text>
          </TouchableOpacity>
          {item.status === 'active' ? (
            <TouchableOpacity 
              style={[styles.itemActionButton, styles.itemCloseButton]}
              onPress={() => handleStatusUpdate(item.id, 'closed')}
            >
              <MaterialIcons name="lock" size={14} color="#ffffff" />
              <Text style={styles.itemActionText}>Close</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.itemActionButton, styles.itemReopenButton]}
              onPress={() => handleStatusUpdate(item.id, 'active')}
            >
              <MaterialIcons name="lock-open" size={14} color="#ffffff" />
              <Text style={styles.itemActionText}>Reopen</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.itemActionButton, styles.itemDeleteButton]}
            onPress={() => handleDelete(item.id)}
          >
            <MaterialIcons name="delete" size={14} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notices</Text>
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => {
              resetForm();
              setModalVisible(true);
            }}
          >
            <MaterialIcons name="add" size={20} color="#ffffff" />
            <Text style={styles.addButtonText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notices..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScrollContent}>
            <StatCard 
              label="Total" 
              count={notices.length} 
              icon="list" 
              color="#ffffff" 
              active={filterStatus === 'All'}
              onPress={() => setFilterStatus('All')}
            />
            <StatCard 
              label="Active" 
              count={notices.filter(i => i.status === 'active').length} 
              icon="check-circle" 
              color="#ffffff"
              active={filterStatus === 'Active'}
              onPress={() => setFilterStatus('Active')}
            />
            <StatCard 
              label="Closed" 
              count={notices.filter(i => i.status === 'closed').length} 
              icon="lock" 
              color="#ffffff"
              active={filterStatus === 'Closed'}
              onPress={() => setFilterStatus('Closed')}
            />
          </ScrollView>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={getFilteredItems()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NoticeCard item={item} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="announcement" size={44} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No notices</Text>
            <Text style={styles.emptyStateSubtext}>Create a notice to inform members</Text>
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
                {editingItem ? 'Edit' : 'Create'} Notice
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Title *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.title}
                onChangeText={(text) => setFormData({...formData, title: text})}
                placeholder="Enter notice title"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Description *</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({...formData, description: text})}
                placeholder="Enter notice description"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Category</Text>
              <TextInput
                style={styles.formInput}
                value={formData.category}
                onChangeText={(text) => setFormData({...formData, category: text})}
                placeholder="e.g., General, Technical, Event"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Priority</Text>
              <View style={styles.priorityContainer}>
                {['low', 'medium', 'high'].map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[styles.priorityButton, formData.priority === priority && styles.priorityButtonActive]}
                    onPress={() => setFormData({...formData, priority})}
                  >
                    <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(priority) }]} />
                    <Text style={[styles.priorityButtonText, formData.priority === priority && styles.priorityButtonTextActive]}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Status</Text>
              <View style={styles.statusContainer}>
                {['active', 'closed'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statusButton, formData.status === status && styles.statusButtonActive]}
                    onPress={() => setFormData({...formData, status})}
                  >
                    <Text style={[styles.statusButtonText, formData.status === status && styles.statusButtonTextActive]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSave} disabled={loading}>
              <Text style={styles.submitButtonText}>
                {loading ? 'Saving...' : editingItem ? 'Update Notice' : 'Create Notice'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Detail View Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.detailModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notice Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailTitle}>{selectedItem.title}</Text>
                  <View style={styles.detailStatusRow}>
                    <View style={[styles.detailStatusBadge, { backgroundColor: getStatusColor(selectedItem.status) + '15' }]}>
                      <Text style={[styles.detailStatusText, { color: getStatusColor(selectedItem.status) }]}>
                        {selectedItem.status || 'active'}
                      </Text>
                    </View>
                    <View style={[styles.detailPriorityBadge, { backgroundColor: getPriorityColor(selectedItem.priority) + '15' }]}>
                      <MaterialIcons name="flag" size={14} color={getPriorityColor(selectedItem.priority)} />
                      <Text style={[styles.detailPriorityText, { color: getPriorityColor(selectedItem.priority) }]}>
                        {selectedItem.priority || 'medium'}
                      </Text>
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
                  <Text style={styles.detailValue}>
                    {selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleString() : 'N/A'}
                  </Text>
                </View>

                <View style={styles.detailActions}>
                  <TouchableOpacity 
                    style={[styles.detailActionButton, styles.detailEditButton]}
                    onPress={() => {
                      setDetailModalVisible(false);
                      setEditingItem(selectedItem);
                      setFormData({...selectedItem});
                      setModalVisible(true);
                    }}
                  >
                    <MaterialIcons name="edit" size={16} color="#ffffff" />
                    <Text style={styles.detailActionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.detailActionButton, styles.detailDeleteButton]}
                    onPress={() => {
                      setDetailModalVisible(false);
                      handleDelete(selectedItem.id);
                    }}
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
    backgroundColor: '#f8fafc',
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
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  statsWrapper: {
    marginBottom: 4,
  },
  statsScrollContent: {
    gap: 10,
    alignItems: 'center',
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 6,
    minWidth: 70,
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    height: 55,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statCardActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderColor: '#ffffff',
  },
  statIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statType: {
    fontFamily: Fonts.Regular,
    fontSize: 8,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  statCount: {
    fontFamily: Fonts.Bold,
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  itemStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  itemStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
  },
  itemDescription: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemCategory: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  priorityText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
  },
  itemDate: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#9ca3af',
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 4,
  },
  itemActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  itemEditButton: {
    backgroundColor: '#3b82f6',
  },
  itemCloseButton: {
    backgroundColor: '#6b7280',
  },
  itemReopenButton: {
    backgroundColor: '#06b6d4',
  },
  itemDeleteButton: {
    backgroundColor: '#ef4444',
  },
  itemActionText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 10,
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
  },
  emptyStateSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
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
    maxHeight: '80%',
  },
  detailModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
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
  },
  formField: {
    marginBottom: 12,
  },
  formLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
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
  formTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  priorityButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
  },
  priorityButtonTextActive: {
    color: '#ffffff',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  statusButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#6b7280',
  },
  statusButtonTextActive: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
  },
  detailHeader: {
    marginBottom: 16,
  },
  detailTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#1f2937',
  },
  detailStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  detailStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
  },
  detailPriorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  detailPriorityText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
  },
  detailSection: {
    marginBottom: 12,
  },
  detailLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 8,
  },
  detailActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  detailEditButton: {
    backgroundColor: '#3b82f6',
  },
  detailDeleteButton: {
    backgroundColor: '#ef4444',
  },
  detailActionText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 12,
  },
});