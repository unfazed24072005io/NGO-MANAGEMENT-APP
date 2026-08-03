import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, query, where, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function WorkingMemberDashboard({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [fabModalVisible, setFabModalVisible] = useState(false);
  const [pendingApplications, setPendingApplications] = useState(0);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalCommission: 0,
    pendingCommission: 0,
    totalOrders: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    fetchUserData();
    fetchStats();
    fetchRecentActivities();
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

      const membersSnap = await getDocs(query(
        collection(db, 'registeredMembers'),
        where('workingMemberId', '==', userId)
      ));

      const commissionsSnap = await getDocs(query(
        collection(db, 'commissions'),
        where('workingMemberId', '==', userId)
      ));

      let totalCommission = 0;
      let pendingCommission = 0;
      commissionsSnap.forEach(doc => {
        const data = doc.data();
        if (data.status === 'paid') {
          totalCommission += data.amount || 0;
        } else {
          pendingCommission += data.amount || 0;
        }
      });

      const ordersSnap = await getDocs(query(
        collection(db, 'orders'),
        where('memberId', '==', userId)
      ));

      setStats({
        totalMembers: membersSnap.size,
        totalCommission,
        pendingCommission,
        totalOrders: ordersSnap.size,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const membersQuery = query(
        collection(db, 'registeredMembers'),
        where('workingMemberId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      
      const membersSnap = await getDocs(membersQuery);
      const activitiesList = [];
      membersSnap.forEach(doc => {
        const data = doc.data();
        activitiesList.push({
          id: doc.id,
          title: `${data.fullName || 'New Member'} registered`,
          description: data.email || '',
          type: 'member',
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });
      setRecentActivities(activitiesList);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    await fetchStats();
    await fetchRecentActivities();
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

  const StatCard = ({ title, value, icon, color }) => (
    <View style={styles.statCard}>
      <View style={styles.statContent}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <MaterialIcons name={icon} size={22} color={color} />
      </View>
    </View>
  );

  const ActivityItem = ({ item }) => (
    <View style={styles.activityItem}>
      <View style={styles.activityItemLeft}>
        <View style={[styles.activityItemIcon, { backgroundColor: item.type === 'member' ? '#3b82f615' : '#10b98115' }]}>
          <MaterialIcons 
            name={item.type === 'member' ? 'person-add' : 'event'} 
            size={16} 
            color={item.type === 'member' ? '#3b82f6' : '#10b981'} 
          />
        </View>
        <View>
          <Text style={styles.activityItemTitle}>{item.title || 'Activity'}</Text>
          <Text style={styles.activityItemSubtitle}>{item.description || ''}</Text>
        </View>
      </View>
      <Text style={styles.activityItemDate}>
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

  const firstName = userData?.fullName?.split(' ')[0] || userData?.name?.split(' ')[0] || 'Working Member';

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8b5cf6']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Purple Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Hi, {firstName}</Text>
              <Text style={styles.subGreeting}>Welcome to Working Member Dashboard</Text>
            </View>
            <TouchableOpacity 
              style={styles.profileIcon}
              onPress={() => navigation.navigate('Profile')}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
              ) : (
                <MaterialIcons name="person" size={30} color="#8b5cf6" />
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Actions - Navigate to Tab Screens */}
          <View style={styles.quickActionsRow}>
            <QuickActionButton 
              title="Members" 
              icon="people" 
              onPress={() => navigation.navigate('Members')}
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
              title="Wallet" 
              icon="account-balance-wallet" 
              onPress={() => navigation.navigate('Profile', { screen: 'WorkingMemberWallet' })}
            />
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <StatCard 
            title="Members" 
            value={stats.totalMembers} 
            icon="people" 
            color="#8b5cf6" 
          />
          <StatCard 
            title="Commission" 
            value={`₹${stats.totalCommission.toLocaleString()}`} 
            icon="attach-money" 
            color="#10b981" 
          />
          <StatCard 
            title="Pending" 
            value={`₹${stats.pendingCommission.toLocaleString()}`} 
            icon="pending" 
            color="#f59e0b" 
          />
          <StatCard 
            title="Orders" 
            value={stats.totalOrders} 
            icon="shopping-bag" 
            color="#3b82f6" 
          />
        </View>

        {/* Recent Activities */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Registrations</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Members')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentActivities.length > 0 ? (
            recentActivities.map((item, index) => (
              <ActivityItem key={index} item={item} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No recent registrations</Text>
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
                <View style={[styles.modalItemIcon, { backgroundColor: '#8b5cf6' }]}>
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
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  navigation.navigate('Profile', { screen: 'WorkingMemberWallet' });
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#10b981' }]}>
                  <MaterialIcons name="account-balance-wallet" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>Wallet</Text>
                  <Text style={styles.modalItemSubtitle}>View your wallet balance</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  navigation.navigate('Profile', { screen: 'WorkingMemberNotice' });
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
                  navigation.navigate('Profile', { screen: 'WorkingMemberComplaint' });
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
                  navigation.navigate('Profile', { screen: 'WorkingMemberSuggestion' });
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#f59e0b' }]}>
                  <MaterialIcons name="lightbulb" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>Submit Suggestion</Text>
                  <Text style={styles.modalItemSubtitle}>Share your ideas</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  setFabModalVisible(false);
                  navigation.navigate('Company');
                }}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#10b981' }]}>
                  <MaterialIcons name="business" size={24} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>Company Info</Text>
                  <Text style={styles.modalItemSubtitle}>View company details</Text>
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
  // Purple Header Card
  headerCard: {
    backgroundColor: '#8b5cf6',
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
    backgroundColor: '#7c3aed',
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
    borderColor: '#8b5cf6',
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
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    color: '#8b5cf6',
  },
  activityItem: {
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
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activityItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityItemTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
  },
  activityItemSubtitle: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  activityItemDate: {
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
    marginTop: 8,
  },
  modalCloseButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#6b7280',
  },
});