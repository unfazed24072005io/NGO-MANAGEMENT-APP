// screens/donation/DonationDashboard.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image, Modal, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, query, where, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';
import { getDonationHistory, getTotalDonations, getDonationCount } from '../../services/paymentService';

export default function DonationDashboard({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentDonations, setRecentDonations] = useState([]);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [fabModalVisible, setFabModalVisible] = useState(false);
  const [razorpayStats, setRazorpayStats] = useState({
    totalAmount: 0,
    count: 0,
  });
  const [stats, setStats] = useState({
    totalDonations: 0,
    donationCount: 0,
    livesImpacted: 0,
    campaignsJoined: 0
  });

  useEffect(() => {
    fetchUserData();
    fetchStats();
    fetchRecentDonations();
    loadRazorpayStats();
  }, []);

  const loadRazorpayStats = () => {
    const total = getTotalDonations();
    const count = getDonationCount();
    setRazorpayStats({
      totalAmount: total,
      count: count,
    });
  };

  const fetchUserData = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      const docRef = doc(db, 'donors', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        setProfilePhoto(data.profilePhoto || null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const donationsSnap = await getDocs(query(
        collection(db, 'donations'),
        where('donorId', '==', userId),
        where('status', '==', 'completed')
      ));
      
      let totalDonations = 0;
      let donationCount = 0;
      donationsSnap.forEach(doc => {
        const data = doc.data();
        totalDonations += data.amount || 0;
        donationCount++;
      });

      const razorpayTotal = getTotalDonations();
      const razorpayCount = getDonationCount();

      setStats({
        totalDonations: totalDonations + razorpayTotal,
        donationCount: donationCount + razorpayCount,
        livesImpacted: Math.floor((totalDonations + razorpayTotal) / 100) + donationCount + razorpayCount,
        campaignsJoined: Math.min(donationCount + razorpayCount, 5)
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentDonations = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const donationsQuery = query(
        collection(db, 'donations'),
        where('donorId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const donationsSnap = await getDocs(donationsQuery);
      const donationsList = [];
      donationsSnap.forEach(doc => {
        donationsList.push({ id: doc.id, ...doc.data() });
      });

      const razorpayHistory = getDonationHistory();
      const user = auth.currentUser;
      const userRazorpayDonations = razorpayHistory.filter(
        donation => donation.email === user?.email || donation.phone === user?.phoneNumber
      );
      
      const allDonations = [...donationsList, ...userRazorpayDonations];
      allDonations.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.timestamp);
        const dateB = new Date(b.createdAt || b.timestamp);
        return dateB - dateA;
      });

      setRecentDonations(allDonations.slice(0, 5));
    } catch (error) {
      console.error('Error fetching recent donations:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    await fetchStats();
    await fetchRecentDonations();
    loadRazorpayStats();
    setRefreshing(false);
  };

  const QuickActionButton = ({ title, icon, onPress, color }) => (
    <TouchableOpacity style={styles.quickActionButton} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIconBg, { backgroundColor: color || '#059669' }]}>
        <MaterialIcons name={icon} size={24} color="#ffffff" />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  const RecentItem = ({ item }) => (
    <View style={styles.recentItem}>
      <View style={styles.recentItemLeft}>
        <View style={[styles.recentItemIcon, { backgroundColor: item.paymentMethod === 'razorpay' ? '#3b82f615' : '#10b98115' }]}>
          <MaterialIcons 
            name={item.paymentMethod === 'razorpay' ? 'security' : 'favorite'} 
            size={16} 
            color={item.paymentMethod === 'razorpay' ? '#3b82f6' : '#10b981'} 
          />
        </View>
        <View>
          <Text style={styles.recentItemTitle}>₹{item.amount?.toLocaleString() || 0}</Text>
          <Text style={styles.recentItemSubtitle} numberOfLines={1}>
            {item.purpose || item.campaign || 'General Donation'}
            {item.paymentMethod === 'razorpay' && ' • Razorpay'}
          </Text>
        </View>
      </View>
      <Text style={styles.recentItemDate}>
        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 
         item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'N/A'}
      </Text>
    </View>
  );

  const quickActions = [
    {
      icon: 'favorite',
      label: 'Donate Now',
      color: '#10b981',
      onPress: () => navigation.navigate('Donate'),
    },
    {
      icon: 'receipt-long',
      label: 'My Donations',
      color: '#3b82f6',
      onPress: () => navigation.navigate('MyDonations'),
    },
    {
      icon: 'card-membership',
      label: 'Certificate',
      color: '#8b5cf6',
      onPress: () => navigation.navigate('Certificate'),
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const firstName = userData?.fullName?.split(' ')[0] || userData?.name?.split(' ')[0] || 'Donor';

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Green Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Hi, {firstName}</Text>
              <Text style={styles.subGreeting}>Thank you for making a difference!</Text>
            </View>
            <TouchableOpacity 
              style={styles.profileIcon}
              onPress={() => navigation.navigate('DonorProfile')}
              activeOpacity={0.7}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
              ) : (
                <MaterialIcons name="person" size={30} color="#10b981" />
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Actions - 4 buttons in a row */}
          <View style={styles.quickActionsRow}>
            {quickActions.map((action, index) => (
              <QuickActionButton 
                key={index}
                title={action.label} 
                icon={action.icon} 
                color={action.color}
                onPress={action.onPress}
              />
            ))}
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{stats.totalDonations.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Donated</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.donationCount}</Text>
            <Text style={styles.statLabel}>Donations</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.livesImpacted}</Text>
            <Text style={styles.statLabel}>Lives Impacted</Text>
          </View>
        </View>

        {/* Razorpay Stats */}
        {razorpayStats.count > 0 && (
          <View style={styles.razorpayCard}>
            <View style={styles.razorpayHeader}>
              <MaterialIcons name="security" size={20} color="#3b82f6" />
              <Text style={styles.razorpayTitle}>Razorpay Payments</Text>
            </View>
            <View style={styles.razorpayStats}>
              <View style={styles.razorpayStat}>
                <Text style={styles.razorpayStatValue}>{razorpayStats.count}</Text>
                <Text style={styles.razorpayStatLabel}>Transactions</Text>
              </View>
              <View style={styles.razorpayStatDivider} />
              <View style={styles.razorpayStat}>
                <Text style={styles.razorpayStatValue}>₹{razorpayStats.totalAmount.toLocaleString()}</Text>
                <Text style={styles.razorpayStatLabel}>Total Amount</Text>
              </View>
            </View>
          </View>
        )}

        {/* Recent Donations */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Donations</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MyDonations')} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentDonations.length > 0 ? (
            recentDonations.map((item, index) => (
              <RecentItem key={index} item={item} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="favorite-border" size={40} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No donations yet</Text>
              <Text style={styles.emptyStateSubtext}>Start your journey of giving</Text>
              <TouchableOpacity 
                style={styles.donateButton}
                onPress={() => navigation.navigate('Donate')}
                activeOpacity={0.7}
              >
                <Text style={styles.donateButtonText}>Make a Donation</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* FAB Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={fabModalVisible}
        onRequestClose={() => setFabModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setFabModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Quick Actions</Text>
              
              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  navigation.navigate('Donate');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#10b981' }]}>
                  <MaterialIcons name="favorite" size={22} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>Make a Donation</Text>
                  <Text style={styles.modalItemSubtitle}>Support a cause with Razorpay</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  navigation.navigate('MyDonations');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#3b82f6' }]}>
                  <MaterialIcons name="receipt" size={22} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>View Donations</Text>
                  <Text style={styles.modalItemSubtitle}>See your donation history</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  navigation.navigate('Certificate');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#8b5cf6' }]}>
                  <MaterialIcons name="verified" size={22} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>Certificate</Text>
                  <Text style={styles.modalItemSubtitle}>View your certificates</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setFabModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  headerCard: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#ffffff',
    marginBottom: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  subGreeting: {
    fontFamily: Fonts.Italic,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  profileIcon: {
    width: 70,
    height: 70,
    borderRadius: 40,
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
    borderRadius: 40,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  quickActionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    width: '30%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statValue: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  razorpayCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  razorpayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  razorpayTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  razorpayStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  razorpayStat: {
    alignItems: 'center',
    flex: 1,
  },
  razorpayStatValue: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#3b82f6',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  razorpayStatLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  razorpayStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e5e7eb',
  },
  recentSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 18,
    color: '#1f2937',
    letterSpacing: 0.5,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  viewAllText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#10b981',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  recentItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentItemTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  recentItemSubtitle: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  recentItemDate: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#9ca3af',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  emptyState: {
    paddingVertical: 30,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    gap: 8,
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
    color: '#9ca3af',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },
  donateButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  bottomSpacing: {
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalContent: {
    width: '100%',
  },
  modalTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  modalItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modalItemTextContainer: {
    flex: 1,
  },
  modalItemTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalItemSubtitle: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalCloseButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  modalCloseButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});