// screens/admin/WorkingMemberManagement.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Switch
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDoc, 
  setDoc,
  addDoc,
  Timestamp,
  runTransaction,
  increment
} from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Fonts } from '../../config/fonts';
import { getLevelDetails, getLevelByMemberCount, LEVELS } from '../../config/commissionLevels';
import { WalletService } from '../../services/WalletService';
import { CommissionService } from '../../services/CommissionService';
import { LevelUpdateService } from '../../services/LevelUpdateService';

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
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);
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
    type: 'direct',
    description: '',
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
        
        // Get level details
        const level = data.level || 'I';
        const levelDetails = getLevelDetails(level);
        member.levelTitle = levelDetails.title;
        member.levelColor = levelDetails.color;
        member.levelBadge = levelDetails.badge;
        member.directCommission = levelDetails.directCommission;
        member.secondaryCommission = levelDetails.secondaryCommission;
        
        // Count direct referrals
        const directReferrals = data.directReferrals || [];
        member.directReferralCount = directReferrals.length;
        member.directReferrals = directReferrals;
        
        // Get registered members count (for display compatibility)
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

        // Get wallet data
        try {
          const wallet = await WalletService.getOrCreateWallet(doc.id);
          member.walletBalance = wallet.balance || 0;
          member.totalEarned = wallet.totalEarned || 0;
          member.pendingCommission = wallet.pendingCommission || 0;
        } catch (error) {
          console.error('Error fetching wallet:', error);
          member.walletBalance = 0;
          member.totalEarned = 0;
          member.pendingCommission = 0;
        }

        // Check promotion eligibility based on new system
        const nextLevelId = getNextLevelId(level);
        if (nextLevelId) {
          const nextLevel = getLevelDetails(nextLevelId);
          const requiredMembers = nextLevel.minMembers;
          member.promotionEligible = directReferrals.length >= requiredMembers;
          member.membersNeededForPromotion = Math.max(0, requiredMembers - directReferrals.length);
        } else {
          member.promotionEligible = false;
          member.membersNeededForPromotion = 0;
        }

        member.promotionPending = data.promotionPending || false;
        
        // Get commission history
        const commissionQuery = query(
          collection(db, 'walletTransactions'),
          where('userId', '==', doc.id),
          where('type', 'in', ['direct_commission', 'secondary_commission']),
          orderBy('createdAt', 'desc')
        );
        const commissionSnap = await getDocs(commissionQuery);
        const history = [];
        commissionSnap.forEach((cDoc) => {
          history.push({ id: cDoc.id, ...cDoc.data() });
        });
        member.commissionHistory = history;

        membersList.push(member);
      }
      
      // Sort by total earned (highest first)
      membersList.sort((a, b) => (b.totalEarned || 0) - (a.totalEarned || 0));
      
      setWorkingMembers(membersList);
      applyFilters(membersList, search, filterStatus, filterLevel);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const getNextLevelId = (currentLevelId) => {
    const levels = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
    const currentIndex = levels.indexOf(currentLevelId);
    if (currentIndex < levels.length - 1) {
      return levels[currentIndex + 1];
    }
    return null;
  };

  const applyFilters = (data, searchText, status, level) => {
    let filtered = data;

    if (searchText) {
      filtered = filtered.filter(member =>
        member.fullName?.toLowerCase().includes(searchText.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchText.toLowerCase()) ||
        member.levelTitle?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (status !== 'all') {
      filtered = filtered.filter(member => member.status === status);
    }

    if (level !== 'All') {
      filtered = filtered.filter(member => member.levelTitle?.toLowerCase() === level.toLowerCase());
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
      const memberRef = doc(db, 'users', promotionData.memberId);
      
      await runTransaction(db, async (transaction) => {
        const memberDoc = await transaction.get(memberRef);
        if (!memberDoc.exists()) {
          throw new Error('Member not found');
        }

        // Update member level
        transaction.update(memberRef, {
          level: promotionData.newLevel,
          promotionPending: false,
          promotionDate: Timestamp.now(),
          updatedAt: Timestamp.now()
        });

        // Log promotion
        const promotionRef = doc(collection(db, 'promotions'));
        transaction.set(promotionRef, {
          memberId: promotionData.memberId,
          memberName: promotionData.memberName,
          fromLevel: promotionData.currentLevel,
          toLevel: promotionData.newLevel,
          date: Timestamp.now(),
          approvedBy: auth.currentUser?.uid,
          approvedByName: auth.currentUser?.displayName || 'Admin'
        });
      });

      Alert.alert('Success', `${promotionData.memberName} promoted to ${getLevelDetails(promotionData.newLevel).title}`);
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
      const amount = parseFloat(commissionData.amount);
      const memberRef = doc(db, 'users', commissionData.memberId);
      const memberDoc = await getDoc(memberRef);
      const memberData = memberDoc.data();

      // Add commission using WalletService
      await WalletService.addCommission(
        commissionData.memberId,
        amount,
        commissionData.type === 'direct' ? 'direct_commission' : 'secondary_commission',
        commissionData.description || `${commissionData.type} commission payment`,
        `admin_${Date.now()}`
      );

      Alert.alert('Success', `₹${amount} Commission added for ${commissionData.memberName}`);
      setCommissionModalVisible(false);
      resetCommissionForm();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const viewCommissionHistory = async (member) => {
    setSelectedMember(member);
    try {
      const q = query(
        collection(db, 'walletTransactions'),
        where('userId', '==', member.id),
        where('type', 'in', ['direct_commission', 'secondary_commission']),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const history = [];
      snapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() });
      });
      setCommissionHistory(history);
      setCommissionHistoryModalVisible(true);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const viewWallet = async (member) => {
    try {
      const wallet = await WalletService.getOrCreateWallet(member.id);
      setSelectedWallet({
        ...wallet,
        memberName: member.fullName || member.name,
        memberId: member.id
      });
      setWalletModalVisible(true);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const resetCommissionForm = () => {
    setCommissionData({
      memberId: '',
      memberName: '',
      amount: '',
      type: 'direct',
      description: '',
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
    return workingMembers.filter(m => m.levelTitle?.toLowerCase() === filter.toLowerCase()).length;
  };

  const getStatusCount = (status) => {
    if (status === 'all') return workingMembers.length;
    return workingMembers.filter(m => m.status === status).length;
  };

  const getLevelColor = (levelId) => {
    const details = getLevelDetails(levelId);
    return details.color || '#6b7280';
  };

  const getLevelIcon = (levelId) => {
    const icons = {
      'I': 'grade',
      'II': 'star-half',
      'III': 'star',
      'IV': 'stars',
      'V': 'military-tech',
      'VI': 'workspace-premium',
      'VII': 'emoji-events'
    };
    return icons[levelId] || 'circle';
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
    const levelDetails = getLevelDetails(member.level);

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
            <Text style={styles.statValue}>{member.directReferralCount || 0}</Text>
            <Text style={styles.statLabel}>Direct Members</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{member.totalEarned?.toLocaleString() || 0}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{member.pendingCommission?.toLocaleString() || 0}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={[styles.levelBadge, { backgroundColor: levelColor + '15' }]}>
            <MaterialIcons name={levelIcon} size={14} color={levelColor} />
            <Text style={[styles.levelBadgeText, { color: levelColor }]}>
              {levelDetails?.title?.toUpperCase() || 'N/A'}
            </Text>
          </View>
          <View style={styles.commissionInfo}>
            <Text style={styles.commissionRateText}>
              {member.directCommission || 0}% / {member.secondaryCommission || 0}%
            </Text>
          </View>
          {member.promotionEligible && (
            <View style={styles.promotionBadge}>
              <MaterialIcons name="stars" size={12} color="#10b981" />
              <Text style={styles.promotionText}>Eligible</Text>
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
                type: 'direct',
                description: '',
                status: 'pending'
              });
              setCommissionModalVisible(true);
            }}
          >
            <MaterialIcons name="attach-money" size={14} color="#ffffff" />
            <Text style={styles.actionButtonText}>Add Commission</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.historyButton]}
            onPress={() => viewCommissionHistory(member)}
          >
            <MaterialIcons name="history" size={14} color="#ffffff" />
            <Text style={styles.actionButtonText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.walletButton]}
            onPress={() => viewWallet(member)}
          >
            <MaterialIcons name="account-balance-wallet" size={14} color="#ffffff" />
            <Text style={styles.actionButtonText}>Wallet</Text>
          </TouchableOpacity>
          {member.promotionEligible && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.promoteButton]}
              onPress={() => {
                const nextLevelId = getNextLevelId(member.level);
                setPromotionData({
                  memberId: member.id,
                  memberName: member.fullName,
                  currentLevel: member.level,
                  newLevel: nextLevelId || member.level,
                  commissionRate: ''
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

  // Wallet Modal
  const WalletModal = () => {
    if (!selectedWallet) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={walletModalVisible}
        onRequestClose={() => setWalletModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Wallet Details</Text>
              <TouchableOpacity onPress={() => setWalletModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.walletSummary}>
              <Text style={styles.walletMemberName}>{selectedWallet.memberName}</Text>
              <View style={styles.walletBalanceContainer}>
                <Text style={styles.walletBalanceLabel}>Available Balance</Text>
                <Text style={styles.walletBalance}>₹{selectedWallet.balance?.toLocaleString() || 0}</Text>
              </View>
              <View style={styles.walletStats}>
                <View style={styles.walletStat}>
                  <Text style={styles.walletStatValue}>₹{selectedWallet.totalEarned?.toLocaleString() || 0}</Text>
                  <Text style={styles.walletStatLabel}>Total Earned</Text>
                </View>
                <View style={styles.walletStat}>
                  <Text style={styles.walletStatValue}>₹{selectedWallet.pendingCommission?.toLocaleString() || 0}</Text>
                  <Text style={styles.walletStatLabel}>Pending</Text>
                </View>
                <View style={styles.walletStat}>
                  <Text style={styles.walletStatValue}>₹{selectedWallet.totalWithdrawn?.toLocaleString() || 0}</Text>
                  <Text style={styles.walletStatLabel}>Withdrawn</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setWalletModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
          <Text style={styles.headerTitle}>Working Members</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <MaterialIcons name="refresh" size={24} color="#ffffff" />
          </TouchableOpacity>
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
            {Object.keys(LEVELS).map((key) => {
              const level = getLevelDetails(key);
              return (
                <StatCard 
                  key={key}
                  label={level.title} 
                  count={workingMembers.filter(m => m.level === key).length} 
                  icon="star" 
                  color="#ffffff"
                  active={filterLevel === level.title}
                  onPress={() => handleFilterLevel(level.title)}
                />
              );
            })}
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF7722']} />
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
                      {getLevelDetails(selectedMember.level)?.title?.toUpperCase() || 'N/A'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Performance</Text>
                  <View style={styles.detailStats}>
                    <View style={styles.detailStat}>
                      <Text style={styles.detailStatValue}>{selectedMember.directReferralCount || 0}</Text>
                      <Text style={styles.detailStatLabel}>Direct Members</Text>
                    </View>
                    <View style={styles.detailStat}>
                      <Text style={styles.detailStatValue}>₹{selectedMember.totalEarned?.toLocaleString() || 0}</Text>
                      <Text style={styles.detailStatLabel}>Total Earned</Text>
                    </View>
                    <View style={styles.detailStat}>
                      <Text style={styles.detailStatValue}>₹{selectedMember.pendingCommission?.toLocaleString() || 0}</Text>
                      <Text style={styles.detailStatLabel}>Pending Commission</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Commission Rates</Text>
                  <View style={styles.detailCommissionRow}>
                    <Text style={styles.detailLabel}>Direct Commission:</Text>
                    <Text style={styles.detailValue}>{selectedMember.directCommission || 0}%</Text>
                  </View>
                  <View style={styles.detailCommissionRow}>
                    <Text style={styles.detailLabel}>Secondary Commission:</Text>
                    <Text style={styles.detailValue}>{selectedMember.secondaryCommission || 0}%</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Direct Members</Text>
                  {selectedMember.directReferrals?.length === 0 ? (
                    <Text style={styles.detailEmptyText}>No direct members yet</Text>
                  ) : (
                    selectedMember.directReferrals?.map((memberId, index) => (
                      <View key={index} style={styles.registeredMemberItem}>
                        <Text style={styles.registeredMemberName}>
                          Member ID: {memberId.slice(0, 12)}...
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
                    <Text style={styles.detailLabel}>Level:</Text>
                    <Text style={styles.detailValue}>
                      {getLevelDetails(selectedMember.level)?.title || selectedMember.level}
                    </Text>
                  </View>
                  <View style={styles.detailStatusRow}>
                    <Text style={styles.detailLabel}>Wallet Balance:</Text>
                    <Text style={[styles.detailValue, { color: '#10b981' }]}>
                      ₹{selectedMember.walletBalance?.toLocaleString() || 0}
                    </Text>
                  </View>
                  {selectedMember.promotionEligible && (
                    <View style={styles.detailStatusRow}>
                      <Text style={styles.detailLabel}>Promotion:</Text>
                      <Text style={[styles.detailValue, { color: '#10b981' }]}>
                        Eligible ({selectedMember.membersNeededForPromotion || 0} more members needed)
                      </Text>
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
                {getLevelDetails(promotionData.currentLevel)?.title || promotionData.currentLevel}
              </Text>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>New Level</Text>
              <View style={styles.levelOptions}>
                {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'].map((level) => {
                  const levelDetails = getLevelDetails(level);
                  const isActive = promotionData.newLevel === level;
                  return (
                    <TouchableOpacity
                      key={level}
                      style={[styles.levelOption, isActive && styles.levelOptionActive]}
                      onPress={() => setPromotionData({...promotionData, newLevel: level})}
                    >
                      <MaterialIcons 
                        name={getLevelIcon(level)} 
                        size={16} 
                        color={isActive ? '#ffffff' : getLevelColor(level)} 
                      />
                      <Text style={[styles.levelOptionText, isActive && styles.levelOptionTextActive]}>
                        {levelDetails.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
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
              <Text style={styles.formLabel}>Type</Text>
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[styles.typeButton, commissionData.type === 'direct' && styles.typeButtonActive]}
                  onPress={() => setCommissionData({...commissionData, type: 'direct'})}
                >
                  <Text style={[styles.typeButtonText, commissionData.type === 'direct' && styles.typeButtonTextActive]}>
                    Direct
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, commissionData.type === 'secondary' && styles.typeButtonActive]}
                  onPress={() => setCommissionData({...commissionData, type: 'secondary'})}
                >
                  <Text style={[styles.typeButtonText, commissionData.type === 'secondary' && styles.typeButtonTextActive]}>
                    Secondary
                  </Text>
                </TouchableOpacity>
              </View>
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
              <Text style={styles.formLabel}>Status</Text>
              <View style={styles.statusToggle}>
                <TouchableOpacity
                  style={[styles.statusButton, commissionData.status === 'pending' && styles.statusButtonActive]}
                  onPress={() => setCommissionData({...commissionData, status: 'pending'})}
                >
                  <Text style={[styles.statusButtonText, commissionData.status === 'pending' && styles.statusButtonTextActive]}>
                    Pending
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusButton, commissionData.status === 'paid' && styles.statusButtonActive]}
                  onPress={() => setCommissionData({...commissionData, status: 'paid'})}
                >
                  <Text style={[styles.statusButtonText, commissionData.status === 'paid' && styles.statusButtonTextActive]}>
                    Paid
                  </Text>
                </TouchableOpacity>
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
              commissionHistory.map((item, index) => {
                const isDirect = item.type === 'direct_commission';
                return (
                  <View key={index} style={styles.historyItem}>
                    <View style={styles.historyHeader}>
                      <View>
                        <Text style={styles.historyAmount}>₹{item.amount?.toLocaleString() || 0}</Text>
                        <Text style={styles.historyType}>
                          {isDirect ? 'Direct' : 'Secondary'} Commission
                        </Text>
                      </View>
                      <View style={[styles.historyStatus, { 
                        backgroundColor: item.status === 'paid' || item.status === 'completed' ? '#10b981' : 
                                       item.status === 'pending' ? '#f59e0b' : '#ef4444' 
                      }]}>
                        <Text style={styles.historyStatusText}>
                          {item.status === 'paid' || item.status === 'completed' ? 'Paid' : 
                           item.status === 'pending' ? 'Pending' : 'Failed'}
                        </Text>
                      </View>
                    </View>
                    {item.description && (
                      <Text style={styles.historyDescription}>{item.description}</Text>
                    )}
                    <Text style={styles.historyDate}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}
                    </Text>
                  </View>
                );
              })
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

      {/* Wallet Modal */}
      <WalletModal />
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
  refreshButton: {
    padding: 4,
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
    backgroundColor: '#FFF5EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#FF7722',
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
  commissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commissionRateText: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#6b7280',
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
  walletButton: {
    backgroundColor: '#10b981',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  suspendButton: {
    backgroundColor: '#ef4444',
  },
  viewButton: {
    backgroundColor: '#FF7722',
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
    backgroundColor: '#FFF5EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailAvatarText: {
    fontFamily: Fonts.Bold,
    fontSize: 32,
    color: '#FF7722',
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
  detailCommissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
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
    backgroundColor: '#FF7722',
    borderColor: '#FF7722',
  },
  levelOptionText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
  },
  levelOptionTextActive: {
    color: '#ffffff',
  },
  typeToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  typeButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
  },
  typeButtonTextActive: {
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
    backgroundColor: '#FF7722',
    borderColor: '#FF7722',
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
  historyType: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
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
  emptyText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Wallet Modal
  walletSummary: {
    padding: 16,
  },
  walletMemberName: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  walletBalanceContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  walletBalanceLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
  },
  walletBalance: {
    fontFamily: Fonts.Bold,
    fontSize: 32,
    color: '#10b981',
    marginTop: 4,
  },
  walletStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  walletStat: {
    alignItems: 'center',
  },
  walletStatValue: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#1f2937',
  },
  walletStatLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
});