import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function SuggestionsScreen({ navigation }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setupRealtimeListeners();
  }, []);

  const setupRealtimeListeners = () => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'suggestions'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const suggestionsList = [];
        snapshot.forEach((doc) => {
          suggestionsList.push({ id: doc.id, ...doc.data() });
        });
        setSuggestions(suggestionsList);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  };

  const handleDelete = async (id) => {
    Alert.alert(
      'Delete',
      'Are you sure you want to delete this suggestion?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'suggestions', id));
              Alert.alert('Success', 'Suggestion deleted successfully');
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
      await updateDoc(doc(db, 'suggestions', id), { 
        status, 
        updatedAt: new Date().toISOString() 
      });
      Alert.alert('Success', `Status updated to ${status}`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
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
      case 'resolved': return '#FF7722';
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
    let items = suggestions;
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

  const SuggestionCard = ({ item }) => {
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
              <MaterialIcons name="lightbulb" size={20} color={statusColor} />
            </View>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
          </View>
          <View style={[styles.itemStatusBadge, { backgroundColor: statusColor + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.itemStatusText, { color: statusColor }]}>{item.status || 'pending'}</Text>
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
          {item.status === 'pending' && (
            <TouchableOpacity 
              style={[styles.itemActionButton, styles.itemResolveButton]}
              onPress={() => handleStatusUpdate(item.id, 'resolved')}
            >
              <MaterialIcons name="check-circle" size={14} color="#ffffff" />
              <Text style={styles.itemActionText}>Resolve</Text>
            </TouchableOpacity>
          )}
          {item.status === 'resolved' && (
            <TouchableOpacity 
              style={[styles.itemActionButton, styles.itemReopenButton]}
              onPress={() => handleStatusUpdate(item.id, 'pending')}
            >
              <MaterialIcons name="refresh" size={14} color="#ffffff" />
              <Text style={styles.itemActionText}>Reopen</Text>
            </TouchableOpacity>
          )}
          {item.status !== 'rejected' && (
            <TouchableOpacity 
              style={[styles.itemActionButton, styles.itemRejectButton]}
              onPress={() => handleStatusUpdate(item.id, 'rejected')}
            >
              <MaterialIcons name="block" size={14} color="#ffffff" />
              <Text style={styles.itemActionText}>Reject</Text>
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
      {/* Saffron Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Suggestions</Text>
          <View style={styles.placeholderButton} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search suggestions..."
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
              count={suggestions.length} 
              icon="list" 
              color="#ffffff" 
              active={filterStatus === 'All'}
              onPress={() => setFilterStatus('All')}
            />
            <StatCard 
              label="Pending" 
              count={suggestions.filter(i => i.status === 'pending').length} 
              icon="pending" 
              color="#ffffff"
              active={filterStatus === 'Pending'}
              onPress={() => setFilterStatus('Pending')}
            />
            <StatCard 
              label="Resolved" 
              count={suggestions.filter(i => i.status === 'resolved').length} 
              icon="done" 
              color="#ffffff"
              active={filterStatus === 'Resolved'}
              onPress={() => setFilterStatus('Resolved')}
            />
            <StatCard 
              label="Rejected" 
              count={suggestions.filter(i => i.status === 'rejected').length} 
              icon="block" 
              color="#ffffff"
              active={filterStatus === 'Rejected'}
              onPress={() => setFilterStatus('Rejected')}
            />
          </ScrollView>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={getFilteredItems()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SuggestionCard item={item} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF7722']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="lightbulb" size={44} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No suggestions</Text>
            <Text style={styles.emptyStateSubtext}>Suggestions from members will appear here</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

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
              <Text style={styles.modalTitle}>Suggestion Details</Text>
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
                        {selectedItem.status || 'pending'}
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

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Created By</Text>
                  <Text style={styles.detailValue}>{selectedItem.createdByName || 'Anonymous'}</Text>
                </View>

                <View style={styles.detailActions}>
                  {selectedItem.status === 'pending' && (
                    <TouchableOpacity 
                      style={[styles.detailActionButton, styles.detailResolveButton]}
                      onPress={() => {
                        setDetailModalVisible(false);
                        handleStatusUpdate(selectedItem.id, 'resolved');
                      }}
                    >
                      <MaterialIcons name="check-circle" size={16} color="#ffffff" />
                      <Text style={styles.detailActionText}>Resolve</Text>
                    </TouchableOpacity>
                  )}
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
  },
  placeholderButton: {
    width: 40,
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
  itemResolveButton: {
    backgroundColor: '#FF7722',
  },
  itemReopenButton: {
    backgroundColor: '#06b6d4',
  },
  itemRejectButton: {
    backgroundColor: '#ef4444',
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
  detailResolveButton: {
    backgroundColor: '#FF7722',
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