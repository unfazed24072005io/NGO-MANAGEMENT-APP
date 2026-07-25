import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  Alert,
  FlatList,
  Image,
  Platform,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, query, where, doc, getDoc, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

const { width } = Dimensions.get('window');

export default function AdminDashboard({ navigation }) {
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalDonations: 0,
    totalOrders: 0,
    totalEvents: 0,
    pendingApprovals: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [recentMembers, setRecentMembers] = useState([]);
  const [recentDonations, setRecentDonations] = useState([]);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [fabModalVisible, setFabModalVisible] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchAdminName();
    fetchUserProfile();
    fetchRecentData();
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

  const fetchAdminName = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (userId) {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAdminName(docSnap.data().fullName || docSnap.data().name || 'Admin');
        }
      }
    } catch (error) {
      console.error('Error fetching admin name:', error);
    }
  };

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      const membersSnap = await getDocs(collection(db, 'users'));
      const members = membersSnap.docs.filter(doc => doc.data().role === 'member');
      
      const donationsSnap = await getDocs(collection(db, 'donations'));
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const eventsSnap = await getDocs(collection(db, 'events'));
      const pendingSnap = await getDocs(query(collection(db, 'users'), where('status', '==', 'pending')));

      setStats({
        totalMembers: members.length,
        totalDonations: donationsSnap.size,
        totalOrders: ordersSnap.size,
        totalEvents: eventsSnap.size,
        pendingApprovals: pendingSnap.size,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setRefreshing(false);
    }
  };

  const fetchRecentData = async () => {
    try {
      // Fetch recent members
      const membersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'member')));
      const members = [];
      membersSnap.forEach((doc) => {
        const data = doc.data();
        members.push({ id: doc.id, ...data });
      });
      members.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });
      setRecentMembers(members.slice(0, 5));

      // Fetch recent donations
      const donationsQuery = query(
        collection(db, 'donations'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const donationsSnap = await getDocs(donationsQuery);
      const donationsList = [];
      donationsSnap.forEach((doc) => {
        donationsList.push({ id: doc.id, ...doc.data() });
      });
      setRecentDonations(donationsList);
    } catch (error) {
      console.error('Error fetching recent data:', error);
    }
  };

  const onRefresh = async () => {
    await fetchDashboardData();
    await fetchRecentData();
  };

  const QuickActionButton = ({ title, icon, onPress }) => (
    <TouchableOpacity style={styles.quickActionButton} onPress={onPress}>
      <View style={styles.quickActionIconBg}>
        <MaterialIcons name={icon} size={28} color="#ffffff" />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  const StatCard = ({ title, value, icon, color }) => (
    <View style={[styles.statCard]}>
      <View style={styles.statContent}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <MaterialIcons name={icon} size={22} color={color} />
      </View>
    </View>
  );

  const RecentMemberItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.recentItem}
      onPress={() => navigation.navigate('Members')}
    >
      <View style={styles.recentItemLeft}>
        <View style={styles.recentItemIcon}>
          <MaterialIcons name="person" size={16} color="#3b82f6" />
        </View>
        <View>
          <Text style={styles.recentItemTitle}>{item.fullName || item.name || 'Unknown'}</Text>
          <Text style={styles.recentItemSubtitle}>{item.email}</Text>
        </View>
      </View>
      <Text style={styles.recentItemDate}>
        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
      </Text>
    </TouchableOpacity>
  );

  const RecentDonationItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.recentItem}
      onPress={() => navigation.navigate('Finance')}
    >
      <View style={styles.recentItemLeft}>
        <View style={[styles.recentItemIcon, { backgroundColor: '#ef444415' }]}>
          <MaterialIcons name="favorite" size={16} color="#ef4444" />
        </View>
        <View>
          <Text style={styles.recentItemTitle}>₹{item.amount?.toLocaleString() || 0}</Text>
          <Text style={styles.recentItemSubtitle}>{item.donorName || 'Anonymous'}</Text>
        </View>
      </View>
      <Text style={styles.recentItemDate}>
        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
      </Text>
    </TouchableOpacity>
  );

  const firstName = adminName?.split(' ')[0] || 'Admin';

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
              <Text style={styles.subGreeting}>Welcome to Admin Dashboard</Text>
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

          {/* Quick Actions - 4 buttons in a row */}
          <View style={styles.quickActionsRow}>
            <QuickActionButton 
              title="Members" 
              icon="people" 
              onPress={() => navigation.navigate('Members')}
            />
            <QuickActionButton 
              title="E-Commerce" 
              icon="shopping-cart" 
              onPress={() => navigation.navigate('E-Commerce')}
            />
            <QuickActionButton 
              title="Finance" 
              icon="attach-money" 
              onPress={() => navigation.navigate('Finance')}
            />
            <QuickActionButton 
              title="Events" 
              icon="event" 
              onPress={() => navigation.navigate('Events')}
            />
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <StatCard 
            title="Total Members" 
            value={stats.totalMembers} 
            icon="people" 
            color="#3b82f6" 
          />
          <StatCard 
            title="Total Donations" 
            value={stats.totalDonations} 
            icon="favorite" 
            color="#ef4444" 
          />
          <StatCard 
            title="Total Orders" 
            value={stats.totalOrders} 
            icon="shopping-bag" 
            color="#8b5cf6" 
          />
          <StatCard 
            title="Total Events" 
            value={stats.totalEvents} 
            icon="event" 
            color="#10b981" 
          />
          <StatCard 
            title="Pending Approvals" 
            value={stats.pendingApprovals} 
            icon="pending" 
            color="#f59e0b" 
          />
        </View>

        {/* Recent Members */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Members</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Members')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentMembers.length > 0 ? (
            recentMembers.map((item, index) => (
              <RecentMemberItem key={index} item={item} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No members found</Text>
            </View>
          )}
        </View>

        {/* Recent Donations */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Donations</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Finance')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentDonations.length > 0 ? (
            recentDonations.map((item, index) => (
              <RecentDonationItem key={index} item={item} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No donations found</Text>
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
                  navigation.navigate('NoticeComplaint');
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#3b82f6' }]}>
                  <MaterialIcons name="announcement" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>View Notices</Text>
                  <Text style={styles.modalItemSubtitle}>Manage all notices</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  navigation.navigate('NoticeComplaint');
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#ef4444' }]}>
                  <MaterialIcons name="report-problem" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>View Complaints</Text>
                  <Text style={styles.modalItemSubtitle}>Manage member complaints</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  navigation.navigate('NoticeComplaint');
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#f59e0b' }]}>
                  <MaterialIcons name="lightbulb" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>View Suggestions</Text>
                  <Text style={styles.modalItemSubtitle}>Manage member suggestions</Text>
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
    gap: 10,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  quickActionIconBg: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#2563eb',
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
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    width: '48%',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  statValue: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#eff6ff',
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

  // Floating Action Button
  fabButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
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
    maxHeight: '50%',
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