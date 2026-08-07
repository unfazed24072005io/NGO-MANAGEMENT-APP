// screens/workingMember/WorkingMemberDashboard.js
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
import { collection, getDocs, query, where, doc, getDoc, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';
import { 
  getLevelDetails, 
  getLevelProgress,
  isEligibleForPromotion,
  getPromotionRequirements 
} from '../../config/commissionLevels';
import { WalletService } from '../../services/WalletService';
import { CommissionService } from '../../services/CommissionService';
import { LevelUpdateService } from '../../services/LevelUpdateService';

// Helper functions for dynamic levels
const getLevelBadge = (levelId) => {
  const badges = {
    'I': '⭐',
    'II': '🌟',
    'III': '💫',
    'IV': '✨',
    'V': '🌟',
    'VI': '⭐',
    'VII': '👑'
  };
  return badges[levelId] || '⭐';
};

const getLevelColor = (levelId) => {
  const colors = {
    'I': '#8b5cf6',
    'II': '#3b82f6',
    'III': '#10b981',
    'IV': '#f59e0b',
    'V': '#ef4444',
    'VI': '#8b5cf6',
    'VII': '#fbbf24'
  };
  return colors[levelId] || '#8b5cf6';
};

export default function WorkingMemberDashboard({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [fabModalVisible, setFabModalVisible] = useState(false);
  const [pendingApplications, setPendingApplications] = useState(0);
  const [levelDetails, setLevelDetails] = useState(null);
  const [levelProgress, setLevelProgress] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const [promotionData, setPromotionData] = useState(null);
  const [totalDonations, setTotalDonations] = useState(0);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalCommission: 0,
    pendingCommission: 0,
    totalOrders: 0,
    donationCommission: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    fetchUserData();
    setupRealtimeListener();
    fetchStats();
    fetchRecentActivities();
    fetchPendingApplications();
    fetchPromotionProgress();
  }, []);

  const setupRealtimeListener = () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, async (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUserData(data);
        setProfilePhoto(data.profilePhoto || null);
        
        const level = data.level || 'I';
        
        try {
          const settingsRef = doc(db, 'settings', 'commission');
          const settingsSnap = await getDoc(settingsRef);
          let dynamicLevels = null;
          
          if (settingsSnap.exists()) {
            const settingsData = settingsSnap.data();
            if (settingsData.levels) {
              dynamicLevels = settingsData.levels;
            }
          }
          
          let details;
          let nextLevelData = null;
          let nextLevelId = null;
          let nextLevelMinDonations = 0;
          
          if (dynamicLevels) {
            const levelData = dynamicLevels.find(l => l.id === level);
            if (levelData) {
              details = {
                ...levelData,
                title: levelData.name,
                badge: getLevelBadge(level),
                color: getLevelColor(level)
              };
              const currentIndex = dynamicLevels.findIndex(l => l.id === level);
              if (currentIndex !== -1 && currentIndex < dynamicLevels.length - 1) {
                nextLevelData = dynamicLevels[currentIndex + 1];
                nextLevelId = nextLevelData.id;
                nextLevelMinDonations = levelData.donationsRequiredForPromotion || 0;
              }
            } else {
              details = getLevelDetails(level);
              const nextLevel = getLevelDetails(level).nextLevel;
              if (nextLevel) {
                nextLevelId = nextLevel;
                nextLevelMinDonations = getLevelDetails(nextLevel).minDonations || 0;
              }
            }
          } else {
            details = getLevelDetails(level);
            const nextLevel = getLevelDetails(level).nextLevel;
            if (nextLevel) {
              nextLevelId = nextLevel;
              nextLevelMinDonations = getLevelDetails(nextLevel).minDonations || 0;
            }
          }
          
          if (nextLevelData) {
            details.nextLevelData = nextLevelData;
          }
          setLevelDetails(details);
          
          const donations = await CommissionService.getTotalDonationsByMember(userId);
          setTotalDonations(donations);
          
          const progress = {
            progress: nextLevelMinDonations > 0 ? Math.min((donations / nextLevelMinDonations) * 100, 100) : 100,
            nextLevel: nextLevelId,
            nextLevelTitle: nextLevelData ? nextLevelData.name : (nextLevelId ? getLevelDetails(nextLevelId)?.title || nextLevelId : null),
            remainingDonations: nextLevelMinDonations > 0 ? Math.max(0, nextLevelMinDonations - donations) : 0,
            donationProgress: nextLevelMinDonations > 0 ? (donations / nextLevelMinDonations) * 100 : 100,
            requiredDonations: nextLevelMinDonations
          };
          setLevelProgress(progress);
          
          const isEligible = nextLevelMinDonations > 0 && donations >= nextLevelMinDonations;
          setPromotionData({ isEligible });
          
          try {
            const wallet = await WalletService.getOrCreateWallet(userId);
            setWalletData(wallet);
          } catch (error) {
            console.error('Error fetching wallet:', error);
          }
        } catch (error) {
          console.error('Error fetching dynamic levels:', error);
          const details = getLevelDetails(level);
          setLevelDetails(details);
          const donations = await CommissionService.getTotalDonationsByMember(userId);
          setTotalDonations(donations);
          const progress = getLevelProgress(level, donations);
          setLevelProgress(progress);
          const isEligible = isEligibleForPromotion(level, donations);
          setPromotionData({ isEligible });
        }
      }
    });

    return () => unsubscribe();
  };

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
        
        const level = data.level || 'I';
        console.log('🔍 Current Level:', level);
        
        try {
          const settingsRef = doc(db, 'settings', 'commission');
          const settingsSnap = await getDoc(settingsRef);
          let dynamicLevels = null;
          
          if (settingsSnap.exists()) {
            const settingsData = settingsSnap.data();
            console.log('🔍 Settings Data:', settingsData);
            if (settingsData.levels) {
              dynamicLevels = settingsData.levels;
              console.log('🔍 Dynamic Levels:', dynamicLevels);
            }
          }
          
          let details;
          let nextLevelData = null;
          let nextLevelId = null;
          let nextLevelMinDonations = 0;
          
          if (dynamicLevels) {
            const levelData = dynamicLevels.find(l => l.id === level);
            console.log('🔍 Level Data Found:', levelData);
            
            if (levelData) {
              details = {
                ...levelData,
                title: levelData.name,
                badge: getLevelBadge(level),
                color: getLevelColor(level)
              };
              const currentIndex = dynamicLevels.findIndex(l => l.id === level);
              console.log('🔍 Current Index:', currentIndex);
              
              if (currentIndex !== -1 && currentIndex < dynamicLevels.length - 1) {
                nextLevelData = dynamicLevels[currentIndex + 1];
                nextLevelId = nextLevelData.id;
                nextLevelMinDonations = levelData.donationsRequiredForPromotion || 0;
                console.log('🔍 Next Level Data:', nextLevelData);
                console.log('🔍 Donations Required for Promotion:', nextLevelMinDonations);
              }
            } else {
              details = getLevelDetails(level);
              const nextLevel = getLevelDetails(level).nextLevel;
              if (nextLevel) {
                nextLevelId = nextLevel;
                nextLevelMinDonations = getLevelDetails(nextLevel).minDonations || 0;
              }
            }
          } else {
            details = getLevelDetails(level);
            const nextLevel = getLevelDetails(level).nextLevel;
            if (nextLevel) {
              nextLevelId = nextLevel;
              nextLevelMinDonations = getLevelDetails(nextLevel).minDonations || 0;
            }
          }
          
          if (nextLevelData) {
            details.nextLevelData = nextLevelData;
          }
          setLevelDetails(details);
          
          const donations = await CommissionService.getTotalDonationsByMember(userId);
          setTotalDonations(donations);
          console.log('🔍 Total Donations:', donations);
          console.log('🔍 Next Level Min Donations (final):', nextLevelMinDonations);
          
          const progress = {
            progress: nextLevelMinDonations > 0 ? Math.min((donations / nextLevelMinDonations) * 100, 100) : 100,
            nextLevel: nextLevelId,
            nextLevelTitle: nextLevelData ? nextLevelData.name : (nextLevelId ? getLevelDetails(nextLevelId)?.title || nextLevelId : null),
            remainingDonations: nextLevelMinDonations > 0 ? Math.max(0, nextLevelMinDonations - donations) : 0,
            donationProgress: nextLevelMinDonations > 0 ? (donations / nextLevelMinDonations) * 100 : 100,
            requiredDonations: nextLevelMinDonations
          };
          console.log('🔍 Progress Object:', progress);
          setLevelProgress(progress);
          
          const isEligible = nextLevelMinDonations > 0 && donations >= nextLevelMinDonations;
          setPromotionData({ isEligible });
          
          try {
            const wallet = await WalletService.getOrCreateWallet(userId);
            setWalletData(wallet);
          } catch (error) {
            console.error('Error fetching wallet:', error);
          }
        } catch (error) {
          console.error('Error fetching dynamic levels:', error);
          const details = getLevelDetails(level);
          setLevelDetails(details);
          const donations = await CommissionService.getTotalDonationsByMember(userId);
          setTotalDonations(donations);
          const progress = getLevelProgress(level, donations);
          setLevelProgress(progress);
          const isEligible = isEligibleForPromotion(level, donations);
          setPromotionData({ isEligible });
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPromotionProgress = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      const progress = await LevelUpdateService.getPromotionProgress(userId);
      if (progress) {
        setPromotionData(progress);
      }
    } catch (error) {
      console.error('Error fetching promotion progress:', error);
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
        collection(db, 'walletTransactions'),
        where('userId', '==', userId),
        where('type', 'in', ['direct_commission', 'secondary_commission'])
      ));

      let totalCommission = 0;
      let pendingCommission = 0;
      let donationCommission = 0;
      
      commissionsSnap.forEach(doc => {
        const data = doc.data();
        if (data.status === 'paid' || data.status === 'completed') {
          totalCommission += data.amount || 0;
          if (data.description?.toLowerCase().includes('donation')) {
            donationCommission += data.amount || 0;
          }
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
        donationCommission
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
    await fetchPromotionProgress();
    setRefreshing(false);
  };

  const QuickActionButton = ({ title, icon, onPress, badge }) => (
    <TouchableOpacity style={styles.quickActionButton} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.quickActionIconBg}>
        <MaterialIcons name={icon} size={24} color="#ffffff" />
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
        <MaterialIcons name={icon} size={20} color={color} />
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

  const LevelProgressBar = () => {
    if (!levelProgress || !levelDetails) return null;

    const progress = levelProgress.progress || 0;
    const nextLevel = levelProgress.nextLevel;
    const remainingDonations = levelProgress.remainingDonations || 0;
    const donationProgress = levelProgress.donationProgress || 0;

    const isEligible = promotionData?.isEligible || false;
    const requiredDonations = levelProgress.requiredDonations || 0;
    const nextLevelTitle = levelProgress.nextLevelTitle || 'Next Level';

    return (
      <View style={styles.levelCard}>
        <View style={styles.levelHeader}>
          <View style={styles.levelBadgeContainer}>
            <Text style={styles.levelBadgeEmoji}>{levelDetails.badge || '⭐'}</Text>
            <Text style={styles.levelTitle}>{levelDetails.title}</Text>
          </View>
          <View style={styles.levelCommissionContainer}>
            <Text style={styles.levelCommissionText}>
              {levelDetails.directCommission}% Direct
            </Text>
            {levelDetails.secondaryCommission > 0 && (
              <Text style={styles.levelCommissionSubtext}>
                +{levelDetails.secondaryCommission}% Secondary
              </Text>
            )}
          </View>
        </View>

        {nextLevel && requiredDonations > 0 ? (
          <>
            <View style={styles.progressSection}>
              <View style={styles.progressLabelContainer}>
                <Text style={styles.progressLabel}>Donations Progress</Text>
                <Text style={styles.progressPercentage}>
                  {Math.round(Math.min(donationProgress, 100))}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { 
                  width: `${Math.min(donationProgress, 100)}%`, 
                  backgroundColor: '#f59e0b' 
                }]} />
              </View>
              <Text style={styles.progressSubtext}>
                ₹{totalDonations.toLocaleString()} / ₹{requiredDonations.toLocaleString()} 
                needed for {nextLevelTitle}
              </Text>
            </View>
          </>
        ) : nextLevel && requiredDonations === 0 ? (
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>No donation target set for next level</Text>
          </View>
        ) : null}

        {nextLevel ? (
          <View style={styles.nextLevelInfo}>
            <Text style={styles.nextLevelText}>
              {remainingDonations > 0 ? `₹${remainingDonations.toLocaleString()} more in donations needed` : '🎉 Ready for promotion!'}
              {' to reach '}
              <Text style={[styles.nextLevelHighlight, { color: levelDetails.color }]}>
                {nextLevelTitle}
              </Text>
            </Text>
            {isEligible && (
              <View style={styles.eligibleBadge}>
                <MaterialIcons name="stars" size={16} color="#10b981" />
                <Text style={styles.eligibleText}>Eligible for Promotion!</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.maxLevelContainer}>
            <MaterialIcons name="emoji-events" size={20} color="#fbbf24" />
            <Text style={styles.maxLevelText}>🎉 You've reached the highest level!</Text>
          </View>
        )}

        <View style={styles.memberCountContainer}>
          <View style={styles.memberCountItem}>
            <Text style={styles.memberCountNumber}>{userData?.directReferrals?.length || 0}</Text>
            <Text style={styles.memberCountLabel}>Direct Members</Text>
          </View>
          <View style={styles.memberCountDivider} />
          <View style={styles.memberCountItem}>
            <Text style={styles.memberCountNumber}>{stats.totalMembers}</Text>
            <Text style={styles.memberCountLabel}>Total Members</Text>
          </View>
          <View style={styles.memberCountDivider} />
          <View style={styles.memberCountItem}>
            <Text style={[styles.memberCountNumber, { color: '#f59e0b' }]}>
              ₹{totalDonations.toLocaleString()}
            </Text>
            <Text style={styles.memberCountLabel}>Total Donations</Text>
          </View>
        </View>
      </View>
    );
  };

  const WalletCard = () => {
    if (!walletData) return null;

    return (
      <TouchableOpacity 
        style={styles.walletCard}
        onPress={() => navigation.navigate('Wallet')}
        activeOpacity={0.7}
      >
        <View style={styles.walletHeader}>
          <View style={styles.walletHeaderLeft}>
            <MaterialIcons name="account-balance-wallet" size={20} color="#10b981" />
            <Text style={styles.walletTitle}>Wallet</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
        </View>
        <View style={styles.walletContent}>
          <View style={styles.walletBalance}>
            <Text style={styles.walletBalanceLabel}>Available Balance</Text>
            <Text style={styles.walletBalanceAmount}>₹{walletData.balance?.toLocaleString() || 0}</Text>
          </View>
          <View style={styles.walletStats}>
            <View style={styles.walletStat}>
              <Text style={styles.walletStatValue}>₹{walletData.totalEarned?.toLocaleString() || 0}</Text>
              <Text style={styles.walletStatLabel}>Total Earned</Text>
            </View>
            <View style={styles.walletStatDivider} />
            <View style={styles.walletStat}>
              <Text style={styles.walletStatValue}>₹{walletData.pendingCommission?.toLocaleString() || 0}</Text>
              <Text style={styles.walletStatLabel}>Pending</Text>
            </View>
            {walletData.donationCommission > 0 && (
              <>
                <View style={styles.walletStatDivider} />
                <View style={styles.walletStat}>
                  <Text style={[styles.walletStatValue, { color: '#f59e0b' }]}>
                    ₹{walletData.donationCommission?.toLocaleString() || 0}
                  </Text>
                  <Text style={styles.walletStatLabel}>❤️ Donations</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
              onPress={() => navigation.navigate('WorkingMemberProfile')}
              activeOpacity={0.7}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
              ) : (
                <MaterialIcons name="person" size={28} color="#8b5cf6" />
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
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
              onPress={() => navigation.navigate('Wallet')}
            />
          </View>
        </View>

        {/* Level Progress Card - Donation Only */}
        <LevelProgressBar />

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

        {/* Wallet Card */}
        <WalletCard />

        {/* Recent Activities */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Registrations</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Members')} activeOpacity={0.7}>
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
                  navigation.navigate('WorkingMemberApplications');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#8b5cf6' }]}>
                  <MaterialIcons name="handshake" size={22} color="#ffffff" />
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
                  navigation.navigate('WorkingMemberEvents');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#3b82f6' }]}>
                  <MaterialIcons name="event" size={22} color="#ffffff" />
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
                  navigation.navigate('Wallet');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#10b981' }]}>
                  <MaterialIcons name="account-balance-wallet" size={22} color="#ffffff" />
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
                  navigation.navigate('WorkingMemberNotice');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#8b5cf6' }]}>
                  <MaterialIcons name="announcement" size={22} color="#ffffff" />
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
                  navigation.navigate('WorkingMemberComplaint');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#ef4444' }]}>
                  <MaterialIcons name="report-problem" size={22} color="#ffffff" />
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
                  navigation.navigate('WorkingMemberSuggestion');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#f59e0b' }]}>
                  <MaterialIcons name="lightbulb" size={22} color="#ffffff" />
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
                  navigation.navigate('WorkingMemberCompany');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.modalItemIcon, { backgroundColor: '#10b981' }]}>
                  <MaterialIcons name="business" size={22} color="#ffffff" />
                </View>
                <View style={styles.modalItemTextContainer}>
                  <Text style={styles.modalItemTitle}>Company Info</Text>
                  <Text style={styles.modalItemSubtitle}>View company details</Text>
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
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  subGreeting: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  profileIcon: {
    width: 64,
    height: 64,
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
    width: 64,
    height: 64,
    borderRadius: 40,
  },
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
    width: 38,
    height: 38,
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
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  quickActionText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 9,
    marginTop: 3,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  // Level Card (Donation ONLY)
  levelCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  levelBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelBadgeEmoji: {
    fontSize: 22,
  },
  levelTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  levelCommissionContainer: {
    alignItems: 'flex-end',
  },
  levelCommissionText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#10b981',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  levelCommissionSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#8b5cf6',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  progressSection: {
    marginBottom: 8,
  },
  progressLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  progressLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  progressPercentage: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  nextLevelInfo: {
    marginTop: 4,
    marginBottom: 10,
  },
  nextLevelText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  nextLevelHighlight: {
    fontFamily: Fonts.SemiBold,
  },
  eligibleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  eligibleText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#10b981',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  maxLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 10,
    paddingVertical: 6,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  maxLevelText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#92400e',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  memberCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  memberCountItem: {
    alignItems: 'center',
  },
  memberCountNumber: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  memberCountLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  memberCountDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
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
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statValue: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Wallet Card
  walletCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  walletContent: {
    gap: 8,
  },
  walletBalance: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  walletBalanceLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  walletBalanceAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 24,
    color: '#10b981',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  walletStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  walletStat: {
    alignItems: 'center',
  },
  walletStatValue: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  walletStatLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  walletStatDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
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
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  viewAllText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#8b5cf6',
    includeFontPadding: false,
    textAlignVertical: 'center',
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
    flex: 1,
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
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  activityItemSubtitle: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  activityItemDate: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#9ca3af',
    includeFontPadding: false,
    textAlignVertical: 'center',
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
    includeFontPadding: false,
    textAlignVertical: 'center',
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
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalCloseButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    marginTop: 8,
  },
  modalCloseButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});