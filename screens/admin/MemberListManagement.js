import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal, Image, ActivityIndicator, Platform, RefreshControl, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '../../config/firebase';
import { collection, getDocs, updateDoc, doc, deleteDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Fonts } from '../../config/fonts';

const FILTERS = ['All', 'Admin', 'Working Member', 'Member'];

export default function MemberListManagement({ navigation }) {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setupRealtimeListener();
  }, []);

  const setupRealtimeListener = () => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const membersList = [];
      snapshot.forEach((doc) => {
        membersList.push({ id: doc.id, ...doc.data() });
      });
      setMembers(membersList);
      applyFilters(membersList, search, activeFilter, statusFilter);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const applyFilters = (data, searchText, filter, status) => {
    let filtered = data;

    if (searchText) {
      filtered = filtered.filter(member =>
        member.fullName?.toLowerCase().includes(searchText.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchText.toLowerCase()) ||
        member.phone?.includes(searchText)
      );
    }

    if (filter !== 'All') {
      const roleMap = {
        'Admin': 'admin',
        'Working Member': 'workingMember',
        'Member': 'member'
      };
      filtered = filtered.filter(member => member.role === roleMap[filter]);
    }

    if (status !== 'all') {
      filtered = filtered.filter(member => member.status === status);
    }

    setFilteredMembers(filtered);
  };

  const handleSearch = (text) => {
    setSearch(text);
    applyFilters(members, text, activeFilter, statusFilter);
  };

  const handleFilterPress = (filter) => {
    setActiveFilter(filter);
    applyFilters(members, search, filter, statusFilter);
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    applyFilters(members, search, activeFilter, status);
  };

  const handleDelete = async (id) => {
    Alert.alert(
      'Delete Member',
      'Are you sure you want to delete this member? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', id));
              Alert.alert('Success', 'Member deleted successfully');
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
      await updateDoc(doc(db, 'users', id), { 
        status, 
        updatedAt: new Date().toISOString() 
      });
      Alert.alert('Success', `Status updated to ${status}`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleRoleUpdate = async (id, role) => {
    Alert.alert(
      'Update Role',
      `Are you sure you want to change role to ${role}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', id), { 
                role, 
                updatedAt: new Date().toISOString() 
              });
              Alert.alert('Success', `Role updated to ${role}`);
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'suspended': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'admin': return '#FF7722';
      case 'workingMember': return '#f59e0b';
      case 'member': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getFilterCount = (filter) => {
    if (filter === 'All') return members.length;
    const roleMap = {
      'Admin': 'admin',
      'Working Member': 'workingMember',
      'Member': 'member'
    };
    return members.filter(m => m.role === roleMap[filter]).length;
  };

  const getStatusCount = (status) => {
    if (status === 'all') {
      return members.filter(m => m.role === 'member' || m.role === 'workingMember').length;
    }
    return members.filter(m => (m.role === 'member' || m.role === 'workingMember') && m.status === status).length;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
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

  const StatusFilterChip = ({ label, count, active, onPress }) => (
    <TouchableOpacity
      style={[styles.statusChip, active && styles.activeStatusChip]}
      onPress={onPress}
    >
      <Text style={[styles.statusChipText, active && styles.activeStatusChipText]}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  const MemberCard = ({ member }) => (
    <TouchableOpacity 
      style={styles.memberCard}
      onPress={() => {
        setSelectedMember(member);
        setModalVisible(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.memberHeader}>
        <View style={styles.memberInfo}>
          <View style={styles.avatarContainer}>
            {member.profilePhoto ? (
              <Image source={{ uri: member.profilePhoto }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {member.fullName?.charAt(0) || '?'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>{member.fullName || 'Unknown'}</Text>
            <Text style={styles.memberEmail}>{member.email}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(member.status) + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(member.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(member.status) }]}>
            {member.status || 'pending'}
          </Text>
        </View>
      </View>

      <View style={styles.memberDetailsRow}>
        <View style={styles.detailItem}>
          <MaterialIcons name="phone" size={14} color="#6b7280" />
          <Text style={styles.detailValue}>{member.phone || 'N/A'}</Text>
        </View>
        <View style={styles.detailItem}>
          <MaterialIcons name="person" size={14} color="#6b7280" />
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(member.role) + '15' }]}>
            <Text style={[styles.roleBadgeText, { color: getRoleColor(member.role) }]}>
              {member.role === 'workingMember' ? 'Working' : member.role || 'member'}
            </Text>
          </View>
        </View>
        <View style={styles.detailItem}>
          <MaterialIcons name="calendar-today" size={14} color="#6b7280" />
          <Text style={styles.detailValue}>
            {member.createdAt ? new Date(member.createdAt?.seconds * 1000 || member.createdAt).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => {
            setSelectedMember(member);
            setModalVisible(true);
          }}
        >
          <MaterialIcons name="visibility" size={14} color="#ffffff" />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
        {member.status !== 'active' && member.role !== 'admin' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleStatusUpdate(member.id, 'active')}
          >
            <MaterialIcons name="check-circle" size={14} color="#ffffff" />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
        )}
        {member.status !== 'suspended' && member.status !== 'active' && member.role !== 'admin' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.suspendButton]}
            onPress={() => handleStatusUpdate(member.id, 'suspended')}
          >
            <MaterialIcons name="block" size={14} color="#ffffff" />
            <Text style={styles.actionButtonText}>Suspend</Text>
          </TouchableOpacity>
        )}
        {member.status === 'suspended' && member.role !== 'admin' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.reactivateButton]}
            onPress={() => handleStatusUpdate(member.id, 'active')}
          >
            <MaterialIcons name="refresh" size={14} color="#ffffff" />
            <Text style={styles.actionButtonText}>Reactivate</Text>
          </TouchableOpacity>
        )}
        {member.role !== 'admin' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(member.id)}
          >
            <MaterialIcons name="delete" size={14} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Saffron Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Member List</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Bar inside header */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search members..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={handleSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <MaterialIcons name="close" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Chips inside header */}
        <View style={styles.statusFilterRow}>
          <StatusFilterChip
            label="All"
            count={getStatusCount('all')}
            active={statusFilter === 'all'}
            onPress={() => handleStatusFilter('all')}
          />
          <StatusFilterChip
            label="Active"
            count={getStatusCount('active')}
            active={statusFilter === 'active'}
            onPress={() => handleStatusFilter('active')}
          />
          <StatusFilterChip
            label="Pending"
            count={getStatusCount('pending')}
            active={statusFilter === 'pending'}
            onPress={() => handleStatusFilter('pending')}
          />
          <StatusFilterChip
            label="Suspended"
            count={getStatusCount('suspended')}
            active={statusFilter === 'suspended'}
            onPress={() => handleStatusFilter('suspended')}
          />
        </View>

        {/* Stat Cards inside header */}
        <View style={styles.statsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScrollContent}>
            <StatCard 
              label="All" 
              count={members.length} 
              icon="people" 
              color="#ffffff" 
              active={activeFilter === 'All'}
              onPress={() => handleFilterPress('All')}
            />
            <StatCard 
              label="Admin" 
              count={getFilterCount('Admin')} 
              icon="shield" 
              color="#ffffff"
              active={activeFilter === 'Admin'}
              onPress={() => handleFilterPress('Admin')}
            />
            <StatCard 
              label="Working" 
              count={getFilterCount('Working Member')} 
              icon="work" 
              color="#ffffff"
              active={activeFilter === 'Working Member'}
              onPress={() => navigation.navigate('WorkingMemberList')}
            />
            <StatCard 
              label="Member" 
              count={getFilterCount('Member')} 
              icon="person" 
              color="#ffffff"
              active={activeFilter === 'Member'}
              onPress={() => handleFilterPress('Member')}
            />
          </ScrollView>
        </View>
      </View>

      {/* Member List */}
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MemberCard member={item} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF7722']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <MaterialIcons name="people" size={44} color="#D1D5DB" />
            <Text style={styles.emptyText}>No members found</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Member Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Member Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedMember && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalProfileSection}>
                  {selectedMember.profilePhoto ? (
                    <Image source={{ uri: selectedMember.profilePhoto }} style={styles.modalAvatar} />
                  ) : (
                    <View style={styles.modalAvatarPlaceholder}>
                      <Text style={styles.modalAvatarText}>
                        {selectedMember.fullName?.charAt(0) || '?'}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.modalName}>{selectedMember.fullName || 'Unknown'}</Text>
                  <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedMember.status) + '15' }]}>
                    <Text style={[styles.modalStatusText, { color: getStatusColor(selectedMember.status) }]}>
                      {selectedMember.status || 'pending'}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalInfoSection}>
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalInfoLabel}>Email</Text>
                    <Text style={styles.modalInfoValue}>{selectedMember.email}</Text>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalInfoLabel}>Phone</Text>
                    <Text style={styles.modalInfoValue}>{selectedMember.phone || 'N/A'}</Text>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalInfoLabel}>Address</Text>
                    <Text style={styles.modalInfoValue}>{selectedMember.address || 'N/A'}</Text>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalInfoLabel}>Role</Text>
                    <View style={[styles.modalRoleBadge, { backgroundColor: getRoleColor(selectedMember.role) + '15' }]}>
                      <Text style={[styles.modalRoleText, { color: getRoleColor(selectedMember.role) }]}>
                        {selectedMember.role === 'workingMember' ? 'Working Member' : selectedMember.role || 'member'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalInfoLabel}>Joined</Text>
                    <Text style={styles.modalInfoValue}>
                      {selectedMember.createdAt ? new Date(selectedMember.createdAt?.seconds * 1000 || selectedMember.createdAt).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                  {selectedMember.aadharFront && (
                    <View style={styles.modalInfoItem}>
                      <Text style={styles.modalInfoLabel}>Aadhar</Text>
                      <View style={styles.modalImageRow}>
                        {selectedMember.aadharFront && (
                          <Image source={{ uri: selectedMember.aadharFront }} style={styles.modalThumbnail} />
                        )}
                        {selectedMember.aadharBack && (
                          <Image source={{ uri: selectedMember.aadharBack }} style={styles.modalThumbnail} />
                        )}
                      </View>
                    </View>
                  )}
                  {selectedMember.panCard && (
                    <View style={styles.modalInfoItem}>
                      <Text style={styles.modalInfoLabel}>PAN Card</Text>
                      <Image source={{ uri: selectedMember.panCard }} style={styles.modalThumbnail} />
                    </View>
                  )}
                </View>

                <View style={styles.modalActions}>
                  {selectedMember.role !== 'admin' && (
                    <>
                      <TouchableOpacity 
                        style={[styles.modalActionButton, styles.modalApproveButton]}
                        onPress={() => {
                          handleStatusUpdate(selectedMember.id, 'active');
                          setModalVisible(false);
                        }}
                      >
                        <MaterialIcons name="check-circle" size={16} color="#ffffff" />
                        <Text style={styles.modalActionText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.modalActionButton, styles.modalRoleButton]}
                        onPress={() => {
                          const newRole = selectedMember.role === 'member' ? 'workingMember' : 'member';
                          handleRoleUpdate(selectedMember.id, newRole);
                          setModalVisible(false);
                        }}
                      >
                        <MaterialIcons name="swap-horiz" size={16} color="#ffffff" />
                        <Text style={styles.modalActionText}>
                          {selectedMember.role === 'member' ? 'Make Working' : 'Make Member'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.modalActionButton, styles.modalDeleteButton]}
                        onPress={() => {
                          handleDelete(selectedMember.id);
                          setModalVisible(false);
                        }}
                      >
                        <MaterialIcons name="delete" size={16} color="#ffffff" />
                        <Text style={styles.modalActionText}>Delete</Text>
                      </TouchableOpacity>
                    </>
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
  },

  // Search inside header
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

  // Status Filter Chips inside header
  statusFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statusChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  activeStatusChip: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  statusChipText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  activeStatusChipText: {
    color: '#FF7722',
  },

  // Stats inside header
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

  // List Content
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  // Member Card
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#FF7722',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1F2937',
  },
  memberEmail: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
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
  statusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
  },
  memberDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailValue: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6B7280',
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'flex-end',
    gap: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  viewButton: {
    backgroundColor: '#FF7722',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  suspendButton: {
    backgroundColor: '#F59E0B',
  },
  reactivateButton: {
    backgroundColor: '#06B6D4',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#FFFFFF',
    fontSize: 10,
  },

  // Empty State
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: Fonts.Regular,
    fontSize: 15,
    color: '#6B7280',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: '90%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#000',
  },
  modalProfileSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  modalAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarText: {
    fontFamily: Fonts.Bold,
    fontSize: 32,
    color: '#FF7722',
  },
  modalName: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#1F2937',
    marginTop: 8,
  },
  modalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  modalStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
  },
  modalInfoSection: {
    marginBottom: 16,
  },
  modalInfoItem: {
    marginBottom: 8,
  },
  modalInfoLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  modalInfoValue: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1F2937',
  },
  modalRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  modalRoleText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
  },
  modalImageRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modalThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  modalApproveButton: {
    backgroundColor: '#10B981',
  },
  modalRoleButton: {
    backgroundColor: '#FF7722',
  },
  modalDeleteButton: {
    backgroundColor: '#EF4444',
  },
  modalActionText: {
    fontFamily: Fonts.SemiBold,
    color: '#FFFFFF',
    fontSize: 12,
  },
});