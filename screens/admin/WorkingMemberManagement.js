import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal, Image, ActivityIndicator, RefreshControl, FlatList, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, updateDoc, doc, deleteDoc, query, where, orderBy, onSnapshot, getDoc, addDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Fonts } from '../../config/fonts';

const FILTERS = ['All', 'Bronze', 'Silver', 'Gold', 'Platinum'];

export default function WorkingMemberManagement() {
  const navigation = useNavigation();
  const [workingMembers, setWorkingMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLevel, setFilterLevel] = useState('All');
  const [promotionModalVisible, setPromotionModalVisible] = useState(false);
  const [commissionModalVisible, setCommissionModalVisible] = useState(false);
  const [commissionHistoryModalVisible, setCommissionHistoryModalVisible] = useState(false);
  const [commissionHistory, setCommissionHistory] = useState([]);
  const [promotionData, setPromotionData] = useState({
    memberId: '',
    memberName: '',
    currentLevel: '',
    newLevel: '',
    commissionRate: ''
  });
  const [commissionData, setCommissionData] = useState({
    memberId: '',
    memberName: '',
    amount: '',
    description: '',
    period: 'monthly',
    status: 'pending'
  });

  useEffect(() => {
    setupRealtimeListener();
  }, []);

  const setupRealtimeListener = () => {
    const q = query(collection(db, 'users'), where('role', '==', 'workingMember'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const membersList = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const member = { id: doc.id, ...data };
        
        const registeredQuery = query(
          collection(db, 'users'), 
          where('registeredBy', '==', doc.id)
        );
        const registeredSnap = await getDocs(registeredQuery);
        member.registeredMembers = registeredSnap.size;
        member.registeredMembersList = [];
        registeredSnap.forEach((regDoc) => {
          member.registeredMembersList.push({ id: regDoc.id, ...regDoc.data() });
        });

        let totalDonations = 0;
        for (const regMember of member.registeredMembersList) {
          const donationsQuery = query(
            collection(db, 'donations'),
            where('memberId', '==', regMember.id),
            where('status', '==', 'completed')
          );
          const donationsSnap = await getDocs(donationsQuery);
          donationsSnap.forEach((don) => {
            totalDonations += don.data().amount || 0;
          });
        }
        member.totalDonations = totalDonations;
        member.commissionEarned = totalDonations * 0.1;
        member.commissionRate = data.commissionRate || 10;

        if (totalDonations >= 50000) {
          member.level = 'platinum';
        } else if (totalDonations >= 25000) {
          member.level = 'gold';
        } else if (totalDonations >= 10000) {
          member.level = 'silver';
        } else {
          member.level = 'bronze';
        }

        member.promotionEligible = totalDonations >= 50000 && data.level !== 'platinum';
        member.promotionPending = data.promotionPending || false;
        member.commissionHistory = data.commissionHistory || [];

        membersList.push(member);
      }
      
      setWorkingMembers(membersList);
      applyFilters(membersList, search, filterStatus, filterLevel);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const applyFilters = (data, searchText, status, level) => {
    let filtered = data;

    if (searchText) {
      filtered = filtered.filter(member =>
        member.fullName?.toLowerCase().includes(searchText.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (status !== 'all') {
      filtered = filtered.filter(member => member.status === status);
    }

    if (level !== 'All') {
      filtered = filtered.filter(member => member.level === level.toLowerCase());
    }

    setFilteredMembers(filtered);
  };

  const handleSearch = (text) => {
    setSearch(text);
    applyFilters(workingMembers, text, filterStatus, filterLevel);
  };

  const handleFilterStatus = (status) => {
    setFilterStatus(status);
    applyFilters(workingMembers, search, status, filterLevel);
  };

  const handleFilterLevel = (level) => {
    setFilterLevel(level);
    applyFilters(workingMembers, search, filterStatus, level);
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

  const handlePromotion = async () => {
    if (!promotionData.memberId || !promotionData.newLevel) {
      Alert.alert('Error', 'Please select a level');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', promotionData.memberId), {
        level: promotionData.newLevel,
        promotionPending: false,
        promotionDate: new Date().toISOString(),
        commissionRate: parseFloat(promotionData.commissionRate) || 10,
        updatedAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'promotions'), {
        memberId: promotionData.memberId,
        memberName: promotionData.memberName,
        fromLevel: promotionData.currentLevel,
        toLevel: promotionData.newLevel,
        date: new Date().toISOString(),
        approvedBy: auth.currentUser?.uid,
        approvedByName: auth.currentUser?.displayName || 'Admin'
      });

      Alert.alert('Success', `${promotionData.memberName} promoted to ${promotionData.newLevel}`);
      setPromotionModalVisible(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleAddCommission = async () => {
    if (!commissionData.memberId || !commissionData.amount) {
      Alert.alert('Error', 'Please select a member and enter amount');
      return;
    }

    try {
      const commission = {
        amount: parseFloat(commissionData.amount),
        description: commissionData.description || 'Commission payment',
        period: commissionData.period || 'monthly',
        status: commissionData.status || 'pending',
        date: new Date().toISOString(),
        memberName: commissionData.memberName
      };

      await addDoc(collection(db, 'commissions'), {
        memberId: commissionData.memberId,
        memberName: commissionData.memberName,
        amount: parseFloat(commissionData.amount),
        description: commissionData.description || 'Commission payment',
        period: commissionData.period || 'monthly',
        status: commissionData.status || 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const memberRef = doc(db, 'users', commissionData.memberId);
      const memberDoc = await getDoc(memberRef);
      const existingHistory = memberDoc.data()?.commissionHistory || [];
      
      await updateDoc(memberRef, {
        commissionHistory: [...existingHistory, commission],
        updatedAt: new Date().toISOString()
      });

      Alert.alert('Success', `₹${commissionData.amount} Commission added for ${commissionData.memberName}`);
      setCommissionModalVisible(false);
      resetCommissionForm();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const viewCommissionHistory = async (member) => {
    setSelectedMember(member);
    try {
      const memberRef = doc(db, 'users', member.id);
      const memberDoc = await getDoc(memberRef);
      const history = memberDoc.data()?.commissionHistory || [];
      setCommissionHistory(history);
      setCommissionHistoryModalVisible(true);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const resetCommissionForm = () => {
    setCommissionData({
      memberId: '',
      memberName: '',
      amount: '',
      description: '',
      period: 'monthly',
      status: 'pending'
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getFilterCount = (filter) => {
    if (filter === 'All') return workingMembers.length;
    return workingMembers.filter(m => m.level === filter.toLowerCase()).length;
  };

  const getStatusCount = (status) => {
    if (status === 'all') return workingMembers.length;
    return workingMembers.filter(m => m.status === status).length;
  };

  const getLevelColor = (level) => {
    switch(level) {
      case 'platinum': return '#8b5cf6';
      case 'gold': return '#f59e0b';
      case 'silver': return '#9ca3af';
      case 'bronze': return '#cd7f32';
      default: return '#6b7280';
    }
  };

  const getLevelIcon = (level) => {
    switch(level) {
      case 'platinum': return 'stars';
      case 'gold': return 'star';
      case 'silver': return 'star-half';
      case 'bronze': return 'grade';
      default: return 'circle';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'suspended': return '#ef4444';
      default: return '#6b7280';
    }
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

  const WorkingMemberCard = ({ member }) => {
    const levelColor = getLevelColor(member.level);
    const levelIcon = getLevelIcon(member.level);
    const statusColor = getStatusColor(member.status);

    return (
      <TouchableOpacity 
        style={styles.memberCard}
        onPress={() => {
          setSelectedMember(member);
          setDetailModalVisible(true);
        }}
      >
        <View style={styles.cardHeader}>
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
            <View>
              <Text style={styles.memberName}>{member.fullName || 'Unknown'}</Text>
              <Text style={styles.memberEmail}>{member.email}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {member.status || 'pending'}
            </Text>
          </View>
        </View>

        <View style={styles.cardStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{member.registeredMembers || 0}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{member.totalDonations?.toLocaleString() || 0}</Text>
            <Text style={styles.statLabel}>Donations</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{member.commissionEarned?.toLocaleString() || 0}</Text>
            <Text style={styles.statLabel}>Commission</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={[styles.levelBadge, { backgroundColor: levelColor + '15' }]}>
            <MaterialIcons name={levelIcon} size={14} color={levelColor} />
            <Text style={[styles.levelBadgeText, { color: levelColor }]}>
              {member.level?.toUpperCase() || 'N/A'}
            </Text>
          </View>
          {member.promotionEligible && (
            <View style={styles.promotionBadge}>
              <MaterialIcons name="stars" size={12} color="#10b981" />
              <Text style={styles.promotionText}>Eligible</Text>
            </View>
          )}
          {member.promotionPending && (
            <View style={styles.pendingBadge}>
              <MaterialIcons name="pending" size={12} color="#f59e0b" />
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.commissionButton]}
            onPress={() => {
              setCommissionData({
                memberId: member.id,
                memberName: member.fullName || member.name || 'Unknown',
                amount: '',
                description: '',
                period: 'monthly',
                status: 'pending'
              });
              setCommissionModalVisible(true);
            }}
          >
            <MaterialIcons name="attach-money" size={14} color="#ffffff" />
            <Text style={styles.actionButtonText}>Commission</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.historyButton]}
            onPress={() => viewCommissionHistory(member)}
          >
            <MaterialIcons name="history" size={14} color="#ffffff" />
            <Text style={styles.actionButtonText}>History</Text>
          </TouchableOpacity>
          {member.promotionEligible && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.promoteButton]}
              onPress={() => {
                setPromotionData({
                  memberId: member.id,
                  memberName: member.fullName,
                  currentLevel: member.level,
                  newLevel: member.level === 'bronze' ? 'silver' :
                           member.level === 'silver' ? 'gold' : 'platinum',
                  commissionRate: member.level === 'bronze' ? '15' :
                                 member.level === 'silver' ? '20' : '25'
                });
                setPromotionModalVisible(true);
              }}
            >
              <MaterialIcons name="stars" size={14} color="#ffffff" />
              <Text style={styles.actionButtonText}>Promote</Text>
            </TouchableOpacity>
          )}
          {member.status !== 'active' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleStatusUpdate(member.id, 'active')}
            >
              <MaterialIcons name="check-circle" size={14} color="#ffffff" />
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
          )}
          {member.status === 'active' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.suspendButton]}
              onPress={() => handleStatusUpdate(member.id, 'suspended')}
            >
              <MaterialIcons name="block" size={14} color="#ffffff" />
              <Text style={styles.actionButtonText}>Suspend</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => {
              setSelectedMember(member);
              setDetailModalVisible(true);
            }}
          >
            <MaterialIcons name="visibility" size={14} color="#ffffff" />
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Working Members</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Bar inside header */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search working members..."
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
            active={filterStatus === 'all'}
            onPress={() => handleFilterStatus('all')}
          />
          <StatusFilterChip
            label="Active"
            count={getStatusCount('active')}
            active={filterStatus === 'active'}
            onPress={() => handleFilterStatus('active')}
          />
          <StatusFilterChip
            label="Pending"
            count={getStatusCount('pending')}
            active={filterStatus === 'pending'}
            onPress={() => handleFilterStatus('pending')}
          />
          <StatusFilterChip
            label="Suspended"
            count={getStatusCount('suspended')}
            active={filterStatus === 'suspended'}
            onPress={() => handleFilterStatus('suspended')}
          />
        </View>

        {/* Level Stat Cards inside header */}
        <View style={styles.statsWrapper}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.statsScrollContent}
            style={{ flexGrow: 0 }}
          >
            <StatCard 
              label="All" 
              count={workingMembers.length} 
              icon="people" 
              color="#ffffff" 
              active={filterLevel === 'All'}
              onPress={() => handleFilterLevel('All')}
            />
            <StatCard 
              label="Bronze" 
              count={workingMembers.filter(m => m.level === 'bronze').length} 
              icon="grade" 
              color="#ffffff"
              active={filterLevel === 'Bronze'}
              onPress={() => handleFilterLevel('Bronze')}
            />
            <StatCard 
              label="Silver" 
              count={workingMembers.filter(m => m.level === 'silver').length} 
              icon="star-half" 
              color="#ffffff"
              active={filterLevel === 'Silver'}
              onPress={() => handleFilterLevel('Silver')}
            />
            <StatCard 
              label="Gold" 
              count={workingMembers.filter(m => m.level === 'gold').length} 
              icon="star" 
              color="#ffffff"
              active={filterLevel === 'Gold'}
              onPress={() => handleFilterLevel('Gold')}
            />
            <StatCard 
              label="Platinum" 
              count={workingMembers.filter(m => m.level === 'platinum').length} 
              icon="stars" 
              color="#ffffff"
              active={filterLevel === 'Platinum'}
              onPress={() => handleFilterLevel('Platinum')}
            />
          </ScrollView>
        </View>
      </View>

      {/* Members List */}
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <WorkingMemberCard member={item} />}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="work" size={44} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>No working members found</Text>
            <Text style={styles.emptyStateSubtext}>Working members will appear here</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        style={styles.flatList}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      />

      {/* Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Working Member Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedMember && (
              <>
                <View style={styles.detailProfile}>
                  {selectedMember.profilePhoto ? (
                    <Image source={{ uri: selectedMember.profilePhoto }} style={styles.detailAvatar} />
                  ) : (
                    <View style={styles.detailAvatarPlaceholder}>
                      <Text style={styles.detailAvatarText}>
                        {selectedMember.fullName?.charAt(0) || '?'}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.detailName}>{selectedMember.fullName}</Text>
                  <Text style={styles.detailEmail}>{selectedMember.email}</Text>
                  <View style={[styles.detailLevelBadge, { backgroundColor: getLevelColor(selectedMember.level) + '15' }]}>
                    <MaterialIcons name={getLevelIcon(selectedMember.level)} size={16} color={getLevelColor(selectedMember.level)} />
                    <Text style={[styles.detailLevelText, { color: getLevelColor(selectedMember.level) }]}>
                      {selectedMember.level?.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Performance</Text>
                  <View style={styles.detailStats}>
                    <View style={styles.detailStat}>
                      <Text style={styles.detailStatValue}>{selectedMember.registeredMembers || 0}</Text>
                      <Text style={styles.detailStatLabel}>Members</Text>
                    </View>
                    <View style={styles.detailStat}>
                      <Text style={styles.detailStatValue}>₹{selectedMember.totalDonations?.toLocaleString() || 0}</Text>
                      <Text style={styles.detailStatLabel}>Donations</Text>
                    </View>
                    <View style={styles.detailStat}>
                      <Text style={styles.detailStatValue}>₹{selectedMember.commissionEarned?.toLocaleString() || 0}</Text>
                      <Text style={styles.detailStatLabel}>Commission</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Registered Members</Text>
                  {selectedMember.registeredMembersList?.length === 0 ? (
                    <Text style={styles.detailEmptyText}>No members registered yet</Text>
                  ) : (
                    selectedMember.registeredMembersList?.map((member, index) => (
                      <View key={index} style={styles.registeredMemberItem}>
                        <Text style={styles.registeredMemberName}>
                          {member.fullName || 'Unknown'}
                        </Text>
                        <Text style={styles.registeredMemberDetail}>
                          {member.email}
                        </Text>
                      </View>
                    ))
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Status</Text>
                  <View style={styles.detailStatusRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={[styles.detailStatusBadge, { backgroundColor: getStatusColor(selectedMember.status) + '15' }]}>
                      <Text style={[styles.detailStatusText, { color: getStatusColor(selectedMember.status) }]}>
                        {selectedMember.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailStatusRow}>
                    <Text style={styles.detailLabel}>Commission Rate:</Text>
                    <Text style={styles.detailValue}>{selectedMember.commissionRate || 10}%</Text>
                  </View>
                  {selectedMember.promotionPending && (
                    <View style={styles.detailStatusRow}>
                      <Text style={styles.detailLabel}>Promotion:</Text>
                      <Text style={styles.detailPendingText}>Pending</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setDetailModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Promotion Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={promotionModalVisible}
        onRequestClose={() => setPromotionModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Promote Working Member</Text>
              <TouchableOpacity onPress={() => setPromotionModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.promotionInfo}>
              <Text style={styles.promotionLabel}>Member</Text>
              <Text style={styles.promotionValue}>{promotionData.memberName}</Text>
            </View>

            <View style={styles.promotionInfo}>
              <Text style={styles.promotionLabel}>Current Level</Text>
              <Text style={styles.promotionValue}>
                {promotionData.currentLevel?.toUpperCase()}
              </Text>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>New Level</Text>
              <View style={styles.levelOptions}>
                {['bronze', 'silver', 'gold', 'platinum'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[styles.levelOption, promotionData.newLevel === level && styles.levelOptionActive]}
                    onPress={() => setPromotionData({...promotionData, newLevel: level})}
                  >
                    <MaterialIcons 
                      name={getLevelIcon(level)} 
                      size={16} 
                      color={promotionData.newLevel === level ? '#ffffff' : getLevelColor(level)} 
                    />
                    <Text style={[styles.levelOptionText, promotionData.newLevel === level && styles.levelOptionTextActive]}>
                      {level.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Commission Rate (%)</Text>
              <TextInput
                style={styles.formInput}
                value={promotionData.commissionRate}
                onChangeText={(text) => setPromotionData({...promotionData, commissionRate: text})}
                keyboardType="numeric"
                placeholder="Enter commission rate"
              />
            </View>

            <TouchableOpacity style={styles.promoteConfirmButton} onPress={handlePromotion}>
              <MaterialIcons name="stars" size={20} color="#ffffff" />
              <Text style={styles.promoteConfirmText}>Confirm Promotion</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Commission Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={commissionModalVisible}
        onRequestClose={() => setCommissionModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Commission</Text>
              <TouchableOpacity onPress={() => setCommissionModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.commissionInfo}>
              <Text style={styles.commissionLabel}>Member</Text>
              <Text style={styles.commissionValue}>{commissionData.memberName}</Text>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Amount *</Text>
              <TextInput
                style={styles.formInput}
                value={commissionData.amount}
                onChangeText={(text) => setCommissionData({...commissionData, amount: text})}
                placeholder="Enter commission amount"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={commissionData.description}
                onChangeText={(text) => setCommissionData({...commissionData, description: text})}
                placeholder="Enter description"
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Period</Text>
              <View style={styles.periodToggle}>
                {['monthly', 'quarterly', 'yearly', 'one-time'].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[styles.periodButton, commissionData.period === period && styles.periodButtonActive]}
                    onPress={() => setCommissionData({...commissionData, period: period})}
                  >
                    <Text style={[styles.periodButtonText, commissionData.period === period && styles.periodButtonTextActive]}>
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Status</Text>
              <View style={styles.statusToggle}>
                {['pending', 'paid', 'cancelled'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statusButton, commissionData.status === status && styles.statusButtonActive]}
                    onPress={() => setCommissionData({...commissionData, status: status})}
                  >
                    <Text style={[styles.statusButtonText, commissionData.status === status && styles.statusButtonTextActive]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleAddCommission}>
              <MaterialIcons name="add" size={20} color="#ffffff" />
              <Text style={styles.submitButtonText}>Add Commission</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Commission History Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={commissionHistoryModalVisible}
        onRequestClose={() => setCommissionHistoryModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Commission History</Text>
              <TouchableOpacity onPress={() => setCommissionHistoryModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.historyMemberName}>{selectedMember?.fullName}</Text>

            {commissionHistory.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="attach-money" size={44} color="#D1D5DB" />
                <Text style={styles.emptyText}>No commission history</Text>
              </View>
            ) : (
              commissionHistory.map((item, index) => (
                <View key={index} style={styles.historyItem}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyAmount}>₹{item.amount}</Text>
                    <View style={[styles.historyStatus, { 
                      backgroundColor: item.status === 'paid' ? '#10b981' : 
                                     item.status === 'pending' ? '#f59e0b' : '#ef4444' 
                    }]}>
                      <Text style={styles.historyStatusText}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.historyDescription}>{item.description || 'No description'}</Text>
                  <Text style={styles.historyDate}>{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</Text>
                  <Text style={styles.historyPeriod}>Period: {item.period}</Text>
                </View>
              ))
            )}

            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setCommissionHistoryModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
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
    backgroundColor: '#f8fafc',
  },

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
    color: '#3b82f6',
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

  // List
  flatList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  // Member Card
  memberCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
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
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#3b82f6',
  },
  memberName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
  },
  memberEmail: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
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
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#1f2937',
  },
  statLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  levelBadgeText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
  },
  promotionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  promotionText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    color: '#10b981',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  pendingText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    color: '#f59e0b',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 4,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  promoteButton: {
    backgroundColor: '#f59e0b',
  },
  commissionButton: {
    backgroundColor: '#8b5cf6',
  },
  historyButton: {
    backgroundColor: '#06b6d4',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  suspendButton: {
    backgroundColor: '#ef4444',
  },
  viewButton: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 9,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
    flex: 1,
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
  detailProfile: {
    alignItems: 'center',
    marginBottom: 16,
  },
  detailAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  detailAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailAvatarText: {
    fontFamily: Fonts.Bold,
    fontSize: 32,
    color: '#3b82f6',
  },
  detailName: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#1f2937',
    marginTop: 8,
  },
  detailEmail: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
  },
  detailLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  detailLevelText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#1f2937',
    marginBottom: 8,
  },
  detailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailStatValue: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
  },
  detailStatLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
  },
  registeredMemberItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  registeredMemberName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
  },
  registeredMemberDetail: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  detailEmptyText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 10,
  },
  detailStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  detailLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    width: 120,
  },
  detailValue: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
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
  detailPendingText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#f59e0b',
  },
  closeButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },
  promotionInfo: {
    marginBottom: 12,
  },
  promotionLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  promotionValue: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
  },
  commissionInfo: {
    marginBottom: 12,
  },
  commissionLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  commissionValue: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
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
    height: 60,
    textAlignVertical: 'top',
  },
  levelOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  levelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4,
  },
  levelOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  levelOptionText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
  },
  levelOptionTextActive: {
    color: '#ffffff',
  },
  periodToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  periodButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#6b7280',
  },
  periodButtonTextActive: {
    color: '#ffffff',
  },
  statusToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  statusButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
  },
  statusButtonTextActive: {
    color: '#ffffff',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  submitButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
  },
  promoteConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  promoteConfirmText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
  },
  historyMemberName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  historyItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#1f2937',
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  historyStatusText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 10,
  },
  historyDescription: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  historyDate: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  historyPeriod: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});