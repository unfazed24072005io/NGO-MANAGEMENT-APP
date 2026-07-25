import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, FlatList, Dimensions, ActivityIndicator, Image, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

const { width } = Dimensions.get('window');

export default function WorkingMemberCommission({ navigation }) {
  const [commissions, setCommissions] = useState([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [pendingCommission, setPendingCommission] = useState(0);
  const [paidCommission, setPaidCommission] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setupRealtimeListener();
    fetchTotalStats();
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
      default: return '#6b7280';
    }
  };

  const getCommissionTypeIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'registration': return 'person-add';
      case 'referral': return 'share';
      case 'bonus': return 'star';
      case 'performance': return 'trending-up';
      default: return 'attach-money';
    }
  };

  const getFilteredCommissions = () => {
    let filtered = commissions;
    
    if (filterType !== 'All') {
      filtered = filtered.filter(c => c.status?.toLowerCase() === filterType.toLowerCase());
    }
    
    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const StatCard = ({ label, count, icon, color }) => (
    <View style={[styles.statCard,]}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={18} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>₹{count.toLocaleString()}</Text>
      </View>
    </View>
  );

  const CommissionCard = ({ item }) => (
    <View style={styles.commissionCard}>
      <View style={styles.commissionHeader}>
        <View style={[styles.commissionIcon, { backgroundColor: getCommissionTypeColor(item.type) + '15' }]}>
          <MaterialIcons name={getCommissionTypeIcon(item.type)} size={20} color={getCommissionTypeColor(item.type)} />
        </View>
        <View style={styles.commissionInfo}>
          <Text style={styles.commissionTitle}>{item.title || item.type || 'Commission'}</Text>
          <Text style={styles.commissionDescription}>{item.description || 'No description'}</Text>
        </View>
        <View style={[styles.commissionStatus, { backgroundColor: item.status === 'paid' ? '#10b981' : '#f59e0b' }]}>
          <Text style={styles.commissionStatusText}>{item.status || 'pending'}</Text>
        </View>
      </View>
      <View style={styles.commissionFooter}>
        <Text style={styles.commissionAmount}>₹{item.amount?.toLocaleString() || 0}</Text>
        <Text style={styles.commissionDate}>
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
        </Text>
      </View>
    </View>
  );

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

  // Filter Chips
  filterContainer: {
    maxHeight: 40,
    marginVertical: 12,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterChipText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#ffffff',
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
  commissionDate: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#9ca3af',
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
  inviteButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  inviteButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
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