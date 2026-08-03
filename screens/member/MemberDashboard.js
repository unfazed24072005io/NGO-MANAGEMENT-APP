import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, FlatList, Image, Platform, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, query, where, doc, getDoc, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function MemberDashboard({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentDonations, setRecentDonations] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [fabModalVisible, setFabModalVisible] = useState(false);
  const [pendingApplications, setPendingApplications] = useState(0);
  const [stats, setStats] = useState({
    totalDonations: 0,
    eventsAttended: 0,
    certificates: 0,
    orders: 0
  });

  useEffect(() => {
    fetchUserData();
    fetchStats();
    fetchRecentData();
    fetchPendingApplications();
  }, []);

  const fetchUserData = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      const docRef = doc(db, 'users', userId);
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

  const fetchPendingApplications = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const appsQuery = query(
        collection(db, 'serviceApplications'),
        where('userId', '==', userId),
        where('status', '==', 'pending')
      );
      const appsSnap = await getDocs(appsQuery);
      setPendingApplications(appsSnap.size);
    } catch (error) {
      console.error('Error fetching pending applications:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const donationsSnap = await getDocs(query(
        collection(db, 'donations'),
        where('memberId', '==', userId),
        where('status', '==', 'completed')
      ));
      let totalDonations = 0;
      donationsSnap.forEach(doc => {
        totalDonations += doc.data().amount || 0;
      });

      const eventsSnap = await getDocs(query(
        collection(db, 'eventRegistrations'),
        where('memberId', '==', userId)
      ));

      const certSnap = await getDocs(query(
        collection(db, 'certificates'),
        where('memberId', '==', userId)
      ));

      const ordersSnap = await getDocs(query(
        collection(db, 'orders'),
        where('memberId', '==', userId)
      ));

      setStats({
        totalDonations,
        eventsAttended: eventsSnap.size,
        certificates: certSnap.size,
        orders: ordersSnap.size
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentData = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const donationsQuery = query(
        collection(db, 'donations'),
        where('memberId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const donationsSnap = await getDocs(donationsQuery);
      const donationsList = [];
      donationsSnap.forEach(doc => {
        donationsList.push({ id: doc.id, ...doc.data() });
      });
      setRecentDonations(donationsList);

      const ordersQuery = query(
        collection(db, 'orders'),
        where('memberId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const ordersSnap = await getDocs(ordersQuery);
      const ordersList = [];
      ordersSnap.forEach(doc => {
        ordersList.push({ id: doc.id, ...doc.data() });
      });
      setRecentOrders(ordersList);
    } catch (error) {
      console.error('Error fetching recent data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    await fetchStats();
    await fetchRecentData();
    await fetchPendingApplications();
    setRefreshing(false);
  };

  const QuickActionButton = ({ title, icon, onPress, badge }) => (
    <TouchableOpacity style={styles.quickActionButton} onPress={onPress}>
      <View style={styles.quickActionIconBg}>
        <MaterialIcons name={icon} size={28} color="#ffffff" />
        {badge > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  const RecentItem = ({ item, type }) => (
    <View style={styles.recentItem}>
      <View style={styles.recentItemLeft}>
        <View style={[styles.recentItemIcon, { backgroundColor: type === 'donation' ? '#ef444415' : '#8b5cf615' }]}>
          <MaterialIcons 
            name={type === 'donation' ? 'favorite' : 'shopping-bag'} 
            size={16} 
            color={type === 'donation' ? '#ef4444' : '#8b5cf6'} 
          />
        </View>
        <View>
          <Text style={styles.recentItemTitle}>
            {type === 'donation' ? `₹${item.amount?.toLocaleString() || 0}` : item.productName || 'Order'}
          </Text>
          <Text style={styles.recentItemSubtitle}>
            {type === 'donation' ? item.purpose || 'Donation' : `Order #${item.id?.slice(-6) || 'N/A'}`}
          </Text>
        </View>
      </View>
      <Text style={styles.recentItemDate}>
        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const firstName = userData?.fullName?.split(' ')[0] || userData?.name?.split(' ')[0] || 'Member';

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Blue Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Hi, {firstName}</Text>
              <Text style={styles.subGreeting}>Let's start spreading goodness...</Text>
            </View>
            <TouchableOpacity 
              style={styles.profileIcon}
              onPress={() => navigation.navigate('Profile')}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
              ) : (
                <MaterialIcons name="person" size={30} color="#3b82f6" />
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Actions - Navigate to Tab Screens */}
          <View style={styles.quickActionsRow}>
            <QuickActionButton 
              title="Donate" 
              icon="favorite" 
              onPress={() => navigation.navigate('Donate')}
            />
            <QuickActionButton 
              title="Shop" 
              icon="shopping-cart" 
              onPress={() => navigation.navigate('Shop')}
            />
            <QuickActionButton 
              title="Events" 
              icon="event" 
              onPress={() => navigation.navigate('Events')}
            />
            <QuickActionButton 
              title="Profile" 
              icon="person" 
              onPress={() => navigation.navigate('Profile')}
            />
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialIcons name="favorite" size={22} color="#ef4444" />
            <Text style={styles.statValue}>₹{stats.totalDonations.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Donations</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="event" size={22} color="#8b5cf6" />
            <Text style={styles.statValue}>{stats.eventsAttended}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="verified" size={22} color="#10b981" />
            <Text style={styles.statValue}>{stats.certificates}</Text>
            <Text style={styles.statLabel}>Certificates</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="shopping-bag" size={22} color="#f59e0b" />
            <Text style={styles.statValue}>{stats.orders}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
        </View>

        {/* Recent Donations */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Donations</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Donate')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentDonations.length > 0 ? (
            recentDonations.map((item, index) => (
              <RecentItem key={index} item={item} type="donation" />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No recent donations</Text>
            </View>
          )}
        </View>

        {/* Recent Orders */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Profile', { screen: 'MyOrders' })}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.length > 0 ? (
            recentOrders.map((item, index) => (
              <RecentItem key={index} item={item} type="order" />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No recent orders</Text>
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
                  navigation.navigate('Applications');
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#3b82f6' }]}>
                  <MaterialIcons name="handshake" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>Applications</Text>
                  <Text style={styles.modalItemSubtitle}>Apply for services & competitions</Text>
                </View>
                {pendingApplications > 0 && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>{pendingApplications}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  navigation.navigate('Profile', { screen: 'MemberCertificate' });
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#10b981' }]}>
                  <MaterialIcons name="verified" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>Certificates</Text>
                  <Text style={styles.modalItemSubtitle}>View your certificates</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  navigation.navigate('Profile', { screen: 'MemberNotice' });
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#8b5cf6' }]}>
                  <MaterialIcons name="announcement" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>View Notices</Text>
                  <Text style={styles.modalItemSubtitle}>Check latest updates</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  navigation.navigate('Profile', { screen: 'MemberComplaint' });
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#ef4444' }]}>
                  <MaterialIcons name="report-problem" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>Submit Complaint</Text>
                  <Text style={styles.modalItemSubtitle}>Report an issue</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  navigation.navigate('Company');
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#f59e0b' }]}>
                  <MaterialIcons name="business" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>Company Info</Text>
                  <Text style={styles.modalItemSubtitle}>View company details</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  navigation.navigate('Events');
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#3b82f6' }]}>
                  <MaterialIcons name="event" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>Events</Text>
                  <Text style={styles.modalItemSubtitle}>View upcoming events</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setFabModalVisible(false)}
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
  },
  // Blue Header Card
  headerCard: {
    backgroundColor: '#3b82f6',
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
  },
  subGreeting: {
    fontFamily: Fonts.Italic,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
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
  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  quickActionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  badgeText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 9,
    color: '#ffffff',
  },
  quickActionText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 9,
    marginTop: 3,
    textAlign: 'center',
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statValue: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#1f2937',
    marginTop: 4,
  },
  statLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#6b7280',
  },
  // Recent Section
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
  },
  viewAllText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#3b82f6',
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
  },
  recentItemSubtitle: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  recentItemDate: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#9ca3af',
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },
  emptyStateText: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#9ca3af',
  },
  bottomSpacing: {
    height: 20,
  },

  // FAB Modal
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
  },
  modalItemSubtitle: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  pendingBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pendingBadgeText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#ffffff',
  },
  modalCloseButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  modalCloseButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#6b7280',
  },
});