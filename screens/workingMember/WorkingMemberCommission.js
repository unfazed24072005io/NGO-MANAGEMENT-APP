import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, FlatList, Dimensions, ActivityIndicator, Image, TextInput, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

const { width } = Dimensions.get('window');

export default function WorkingMemberCommission({ navigation }) {
  const [commissions, setCommissions] = useState([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [pendingCommission, setPendingCommission] = useState(0);
  const [paidCommission, setPaidCommission] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [commissionSettings, setCommissionSettings] = useState({
    levels: [
      { id: 'I', name: 'ग्राहक', nameEn: 'Customer', percentage: 25 },
      { id: 'II', name: 'सेवक', nameEn: 'Servant / Worker', percentage: 35 },
      { id: 'III', name: 'प्रचारक', nameEn: 'Promoter', percentage: 40 },
      { id: 'IV', name: 'संयोजक', nameEn: 'Coordinator / Organizer', percentage: 42.5 },
      { id: 'V', name: 'मार्गदर्शक', nameEn: 'Guide / Mentor', percentage: 43.75 },
      { id: 'VI', name: 'संरक्षक', nameEn: 'Guardian / Protector', percentage: 44.5 },
      { id: 'VII', name: 'स्वामी', nameEn: 'Owner / Master', percentage: 45 }
    ],
    generalCommission: 10,
    starCommission: 5
  });

  useEffect(() => {
    fetchCommissionSettings();
    setupRealtimeListener();
    fetchUserProfile();
  }, []);

  const fetchCommissionSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'commission');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCommissionSettings({
          levels: data.levels || commissionSettings.levels,
          generalCommission: data.generalCommission || 10,
          starCommission: data.starCommission || 5
        });
      }
    } catch (error) {
      console.error('Error fetching commission settings:', error);
    }
  };

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
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const q = query(
      collection(db, 'commissions'),
      where('workingMemberId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commissionsList = [];
      let total = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        commissionsList.push({ id: doc.id, ...data });
        if (data.status === 'paid') {
          total += data.amount || 0;
        }
      });
      
      setCommissions(commissionsList);
      setTotalEarned(total);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const fetchTotalStats = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const q = query(
        collection(db, 'commissions'),
        where('workingMemberId', '==', userId)
      );

      const snapshot = await getDocs(q);
      let pending = 0, paid = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'pending') pending += data.amount || 0;
        else if (data.status === 'paid') paid += data.amount || 0;
      });

      setPendingCommission(pending);
      setPaidCommission(paid);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTotalStats();
    await fetchCommissionSettings();
    setRefreshing(false);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  const getCommissionTypeColor = (type) => {
    switch(type?.toLowerCase()) {
      case 'registration': return '#3b82f6';
      case 'referral': return '#10b981';
      case 'bonus': return '#f59e0b';
      case 'performance': return '#8b5cf6';
      case 'general': return '#6b7280';
      case 'star': return '#ec4899';
      default: return '#6b7280';
    }
  };

  const getCommissionTypeIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'registration': return 'person-add';
      case 'referral': return 'share';
      case 'bonus': return 'star';
      case 'performance': return 'trending-up';
      case 'general': return 'stars';
      case 'star': return 'star-border';
      default: return 'attach-money';
    }
  };

  const getFilteredCommissions = () => {
    let filtered = commissions;
    
    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  // Calculate commission based on membership level
  const calculateCommission = (amount, levelId, hasGeneralBonus = false, hasStarBonus = false) => {
    const level = commissionSettings.levels.find(l => l.id === levelId);
    if (!level) return { base: 0, generalBonus: 0, starBonus: 0, total: 0 };

    // Calculate base commission
    const baseCommission = (amount * level.percentage) / 100;
    
    // Calculate bonuses
    const generalBonus = hasGeneralBonus ? (amount * commissionSettings.generalCommission) / 100 : 0;
    const starBonus = hasStarBonus ? (amount * commissionSettings.starCommission) / 100 : 0;
    
    const total = baseCommission + generalBonus + starBonus;

    return {
      base: baseCommission,
      generalBonus: generalBonus,
      starBonus: starBonus,
      total: total,
      percentage: level.percentage,
      levelName: level.nameEn,
      levelId: level.id
    };
  };

  const StatCard = ({ label, count, icon, color }) => (
    <View style={[styles.statCard]}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={18} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>₹{count.toLocaleString()}</Text>
      </View>
    </View>
  );

  const CommissionCard = ({ item }) => {
    const color = getCommissionTypeColor(item.type);
    const icon = getCommissionTypeIcon(item.type);
    
    // Calculate commission details for display
    let commissionDetails = null;
    if (item.levelId) {
      commissionDetails = calculateCommission(
        item.baseAmount || item.amount, 
        item.levelId, 
        item.hasGeneralBonus, 
        item.hasStarBonus
      );
    }

    return (
      <TouchableOpacity 
        style={styles.commissionCard}
        onPress={() => {
          setSelectedCommission(item);
          setDetailModalVisible(true);
        }}
      >
        <View style={styles.commissionHeader}>
          <View style={[styles.commissionIcon, { backgroundColor: color + '15' }]}>
            <MaterialIcons name={icon} size={20} color={color} />
          </View>
          <View style={styles.commissionInfo}>
            <Text style={styles.commissionTitle}>{item.title || item.type || 'Commission'}</Text>
            <Text style={styles.commissionDescription} numberOfLines={1}>
              {item.description || 'No description'}
            </Text>
          </View>
          <View style={[styles.commissionStatus, { backgroundColor: item.status === 'paid' ? '#10b981' : '#f59e0b' }]}>
            <Text style={styles.commissionStatusText}>{item.status || 'pending'}</Text>
          </View>
        </View>
        
        <View style={styles.commissionFooter}>
          <View>
            <Text style={styles.commissionAmount}>₹{item.amount?.toLocaleString() || 0}</Text>
            {item.levelId && (
              <Text style={styles.commissionLevel}>
                {item.levelId} - {commissionSettings.levels.find(l => l.id === item.levelId)?.nameEn || ''}
              </Text>
            )}
          </View>
          <Text style={styles.commissionDate}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Commission Detail Modal
  const CommissionDetailModal = () => {
    if (!selectedCommission) return null;
    
    const color = getCommissionTypeColor(selectedCommission.type);
    const icon = getCommissionTypeIcon(selectedCommission.type);
    
    let commissionDetails = null;
    if (selectedCommission.levelId) {
      commissionDetails = calculateCommission(
        selectedCommission.baseAmount || selectedCommission.amount,
        selectedCommission.levelId,
        selectedCommission.hasGeneralBonus,
        selectedCommission.hasStarBonus
      );
    }

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Commission Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header Info */}
              <View style={styles.detailHeader}>
                <View style={[styles.detailIcon, { backgroundColor: color + '15' }]}>
                  <MaterialIcons name={icon} size={30} color={color} />
                </View>
                <View style={styles.detailTitleContainer}>
                  <Text style={styles.detailTitle}>{selectedCommission.title || selectedCommission.type}</Text>
                  <View style={[styles.detailStatus, { backgroundColor: selectedCommission.status === 'paid' ? '#10b981' : '#f59e0b' }]}>
                    <Text style={styles.detailStatusText}>{selectedCommission.status || 'pending'}</Text>
                  </View>
                </View>
              </View>

              {/* Commission Breakdown */}
              {commissionDetails && (
                <View style={styles.breakdownCard}>
                  <Text style={styles.breakdownTitle}>Commission Breakdown</Text>
                  
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Level</Text>
                    <Text style={styles.breakdownValue}>
                      {commissionDetails.levelId} - {commissionDetails.levelName}
                    </Text>
                  </View>
                  
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Base Amount</Text>
                    <Text style={styles.breakdownValue}>₹{selectedCommission.baseAmount?.toLocaleString() || selectedCommission.amount?.toLocaleString()}</Text>
                  </View>
                  
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Commission Rate</Text>
                    <Text style={styles.breakdownValue}>{commissionDetails.percentage}%</Text>
                  </View>
                  
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Base Commission</Text>
                    <Text style={styles.breakdownValue}>₹{commissionDetails.base.toLocaleString()}</Text>
                  </View>

                  {commissionDetails.generalBonus > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>General Bonus (10%)</Text>
                      <Text style={[styles.breakdownValue, { color: '#f59e0b' }]}>₹{commissionDetails.generalBonus.toLocaleString()}</Text>
                    </View>
                  )}

                  {commissionDetails.starBonus > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Star Bonus (5%)</Text>
                      <Text style={[styles.breakdownValue, { color: '#ec4899' }]}>₹{commissionDetails.starBonus.toLocaleString()}</Text>
                    </View>
                  )}

                  <View style={[styles.breakdownRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total Commission</Text>
                    <Text style={styles.totalValue}>₹{commissionDetails.total.toLocaleString()}</Text>
                  </View>
                </View>
              )}

              {/* Description */}
              {selectedCommission.description && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Description</Text>
                  <Text style={styles.detailSectionText}>{selectedCommission.description}</Text>
                </View>
              )}

              {/* Metadata */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Metadata</Text>
                <View style={styles.metadataRow}>
                  <Text style={styles.metadataLabel}>Commission ID</Text>
                  <Text style={styles.metadataValue}>{selectedCommission.id}</Text>
                </View>
                <View style={styles.metadataRow}>
                  <Text style={styles.metadataLabel}>Created</Text>
                  <Text style={styles.metadataValue}>
                    {selectedCommission.createdAt ? new Date(selectedCommission.createdAt).toLocaleString() : 'N/A'}
                  </Text>
                </View>
                {selectedCommission.updatedAt && (
                  <View style={styles.metadataRow}>
                    <Text style={styles.metadataLabel}>Updated</Text>
                    <Text style={styles.metadataValue}>
                      {new Date(selectedCommission.updatedAt).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading commissions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Blue Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Commissions</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileIcon}
            onPress={() => navigation.navigate('WorkingMemberProfile')}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
            ) : (
              <MaterialIcons name="person" size={28} color="#3b82f6" />
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar inside header */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search commissions..."
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

        {/* Stat Cards inside header */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.statsContainer}
          contentContainerStyle={styles.statsContent}
        >
          <StatCard label="Total Earned" count={totalEarned} icon="attach-money" color="#10b981" />
          <StatCard label="Pending" count={pendingCommission} icon="pending" color="#f59e0b" />
          <StatCard label="Paid" count={paidCommission} icon="check-circle" color="#3b82f6" />
        </ScrollView>
      </View>

      {/* Commissions List */}
      <FlatList
        data={getFilteredCommissions()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CommissionCard item={item} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="attach-money" size={44} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No commissions yet</Text>
            <Text style={styles.emptyStateSubtext}>Register members to earn commissions</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Detail Modal */}
      <CommissionDetailModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  },
  profileIcon: {
    width: 70,
    height: 70,
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
    width: 70,
    height: 70,
    borderRadius: 50,
  },

  // Search inside header
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

  // Stats inside header
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

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  commissionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  commissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commissionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  commissionInfo: {
    flex: 1,
  },
  commissionTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
  },
  commissionDescription: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  commissionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  commissionStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    color: '#ffffff',
  },
  commissionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  commissionAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#10b981',
  },
  commissionLevel: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#6b7280',
  },
  commissionDate: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#9ca3af',
  },

  // Modal Styles
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
  },

  // Detail View
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  detailTitleContainer: {
    flex: 1,
  },
  detailTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
  },
  detailStatus: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  detailStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#ffffff',
  },

  // Breakdown Card
  breakdownCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  breakdownTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
  },
  breakdownValue: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 4,
    paddingTop: 8,
  },
  totalLabel: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
    color: '#1f2937',
  },
  totalValue: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#10b981',
  },

  // Detail Sections
  detailSection: {
    marginBottom: 14,
  },
  detailSectionTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  detailSectionText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 22,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  metadataLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  metadataValue: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#1f2937',
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
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontFamily: Fonts.Regular,
    marginTop: 10,
    color: '#6b7280',
    fontSize: 14,
  },
});