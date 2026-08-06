// screens/workingMember/WorkingMemberWallet.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Dimensions,
  Share,
  Platform,
  Animated
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { Fonts } from '../../config/fonts';
import { WalletService } from '../../services/WalletService';
import { getLevelDetails, getLevelByMemberCount } from '../../config/commissionLevels';
import { LevelUpdateService } from '../../services/LevelUpdateService';
import { CommissionService } from '../../services/CommissionService';

const { width } = Dimensions.get('window');

export default function WorkingMemberWallet({ navigation }) {
  const [walletData, setWalletData] = useState({
    balance: 0,
    totalEarned: 0,
    totalWithdrawn: 0,
    pendingCommission: 0,
    pendingWithdrawals: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0,
    donationCommissionTotal: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    bankName: ''
  });
  const [selectedTab, setSelectedTab] = useState('all');
  const [commissionSummary, setCommissionSummary] = useState({
    direct: 0,
    secondary: 0,
    donation: 0,
    directCount: 0,
    secondaryCount: 0,
    donationCount: 0
  });
  const [userData, setUserData] = useState(null);
  const [levelDetails, setLevelDetails] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [showCommissionBreakdown, setShowCommissionBreakdown] = useState(false);
  const [showLevelProgress, setShowLevelProgress] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    fetchUserData();
    setupRealtimeListener();
    fetchWalletData();
    fetchCommissionSummary();
    calculateMonthlyEarnings();
    fetchDonationCommissionTotal();
    animateIn();
  }, []);

  const animateIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true
    }).start();
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
        const level = data.level || 'I';
        setLevelDetails(getLevelDetails(level));
        setWalletData(prev => ({
          ...prev,
          donationCommissionTotal: data.totalDonationCommission || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const setupRealtimeListener = () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const q = query(
      collection(db, 'walletTransactions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactionsList = [];
      let totalEarned = 0;
      let pendingCommission = 0;
      let totalWithdrawn = 0;
      let pendingWithdrawals = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const transaction = { id: doc.id, ...data };
        
        if (data.createdAt?.toDate) {
          transaction.createdAt = data.createdAt.toDate();
        }
        
        const isDonation = data.description?.toLowerCase().includes('donation') || false;
        transaction.isDonation = isDonation;
        
        transactionsList.push(transaction);

        if (data.type === 'direct_commission' || data.type === 'secondary_commission') {
          if (data.status === 'pending' || data.status === 'partially_paid') {
            pendingCommission += data.amount || 0;
          } else if (data.status === 'completed' || data.status === 'paid') {
            totalEarned += data.amount || 0;
          }
        } else if (data.type === 'withdrawal') {
          if (data.status === 'completed') {
            totalWithdrawn += data.amount || 0;
          } else if (data.status === 'pending') {
            pendingWithdrawals += data.amount || 0;
          }
        }
      });

      setTransactions(transactionsList);
      setWalletData(prev => ({
        ...prev,
        totalEarned,
        pendingCommission,
        totalWithdrawn,
        pendingWithdrawals
      }));
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const fetchWalletData = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const wallet = await WalletService.getOrCreateWallet(userId);
      setWalletData(prev => ({
        ...prev,
        balance: wallet.balance || 0,
        totalEarned: wallet.totalEarned || 0,
        totalWithdrawn: wallet.totalWithdrawn || 0,
        pendingCommission: wallet.pendingCommission || 0
      }));
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    }
  };

  const fetchCommissionSummary = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const q = query(
        collection(db, 'walletTransactions'),
        where('userId', '==', userId),
        where('type', 'in', ['direct_commission', 'secondary_commission'])
      );

      const snapshot = await getDocs(q);
      let direct = 0;
      let secondary = 0;
      let donation = 0;
      let directCount = 0;
      let secondaryCount = 0;
      let donationCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const isDonation = data.description?.toLowerCase().includes('donation') || false;
        
        if (data.type === 'direct_commission') {
          if (data.status === 'completed' || data.status === 'paid') {
            if (isDonation) {
              donation += data.amount || 0;
              donationCount++;
            } else {
              direct += data.amount || 0;
              directCount++;
            }
          }
        } else if (data.type === 'secondary_commission') {
          if (data.status === 'completed' || data.status === 'paid') {
            secondary += data.amount || 0;
            secondaryCount++;
          }
        }
      });

      setCommissionSummary({ direct, secondary, donation, directCount, secondaryCount, donationCount });
    } catch (error) {
      console.error('Error fetching commission summary:', error);
    }
  };

  const fetchDonationCommissionTotal = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      const total = await CommissionService.getTotalDonationCommission(userId);
      setWalletData(prev => ({
        ...prev,
        donationCommissionTotal: total
      }));
    } catch (error) {
      console.error('Error fetching donation commission total:', error);
    }
  };

  const calculateMonthlyEarnings = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const q = query(
        collection(db, 'walletTransactions'),
        where('userId', '==', userId),
        where('type', 'in', ['direct_commission', 'secondary_commission']),
        where('status', 'in', ['completed', 'paid'])
      );

      const snapshot = await getDocs(q);
      let thisMonth = 0;
      let lastMonth = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt);
        if (createdAt >= startOfMonth) {
          thisMonth += data.amount || 0;
        } else if (createdAt >= startOfLastMonth && createdAt < startOfMonth) {
          lastMonth += data.amount || 0;
        }
      });

      setWalletData(prev => ({
        ...prev,
        thisMonthEarnings: thisMonth,
        lastMonthEarnings: lastMonth
      }));
    } catch (error) {
      console.error('Error calculating monthly earnings:', error);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(withdrawAmount) || parseFloat(withdrawAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (amount > walletData.balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    if (amount < 100) {
      Alert.alert('Error', 'Minimum withdrawal amount is ₹100');
      return;
    }

    if (!bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.accountHolderName) {
      Alert.alert('Error', 'Please fill all bank details');
      return;
    }

    setLoading(true);
    try {
      const userId = auth.currentUser?.uid;

      const result = await WalletService.processWithdrawal(
        userId,
        amount,
        {
          bankName: bankDetails.bankName || 'Bank Transfer',
          accountNumber: bankDetails.accountNumber,
          ifscCode: bankDetails.ifscCode,
          accountHolderName: bankDetails.accountHolderName,
          upiId: upiId
        }
      );

      if (result.success) {
        Alert.alert(
          '✅ Withdrawal Requested',
          `Your withdrawal request of ₹${amount.toLocaleString()} has been submitted successfully.\n\n` +
          `📅 Processing Time: 24-48 hours\n` +
          `💳 Amount: ₹${amount.toLocaleString()}\n` +
          `🏦 Account: ${bankDetails.accountNumber.slice(-4)}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setWithdrawModalVisible(false);
                setWithdrawAmount('');
                setUpiId('');
                setBankDetails({
                  accountNumber: '',
                  ifscCode: '',
                  accountHolderName: '',
                  bankName: ''
                });
                fetchWalletData();
                calculateMonthlyEarnings();
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to process withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    await fetchWalletData();
    await fetchCommissionSummary();
    await calculateMonthlyEarnings();
    await fetchDonationCommissionTotal();
    setRefreshing(false);
  };

  const getFilteredTransactions = () => {
    let filtered = transactions;

    if (selectedTab === 'credit') {
      filtered = filtered.filter(t =>
        t.type === 'direct_commission' || t.type === 'secondary_commission'
      );
    } else if (selectedTab === 'debit') {
      filtered = filtered.filter(t => t.type === 'withdrawal');
    }

    if (filterType === 'completed') {
      filtered = filtered.filter(t => t.status === 'completed' || t.status === 'paid');
    } else if (filterType === 'pending') {
      filtered = filtered.filter(t => t.status === 'pending' || t.status === 'partially_paid');
    }

    return filtered;
  };

  const getTransactionTypeColor = (type, isDonation = false) => {
    if (type === 'direct_commission') {
      return isDonation ? '#f59e0b' : '#8b5cf6';
    }
    if (type === 'secondary_commission') return '#10b981';
    if (type === 'withdrawal') return '#ef4444';
    return '#6b7280';
  };

  const getTransactionIcon = (type, isDonation = false) => {
    if (type === 'direct_commission') {
      return isDonation ? 'volunteer-activism' : 'person-add';
    }
    if (type === 'secondary_commission') return 'share';
    if (type === 'withdrawal') return 'arrow-upward';
    return 'receipt';
  };

  const getTransactionTitle = (type, isDonation = false) => {
    if (type === 'direct_commission') {
      return isDonation ? 'Donation Commission' : 'Direct Commission';
    }
    if (type === 'secondary_commission') return 'Secondary Commission';
    if (type === 'withdrawal') return 'Withdrawal';
    return 'Transaction';
  };

  const handleShare = async () => {
    try {
      const levelTitle = levelDetails?.title || 'N/A';
      const message = 
        `💰 My Wallet Summary\n\n` +
        `🏅 Level: ${levelTitle}\n` +
        `💵 Available Balance: ₹${walletData.balance.toLocaleString()}\n` +
        `📈 Total Earned: ₹${walletData.totalEarned.toLocaleString()}\n` +
        `⏳ Pending Commission: ₹${walletData.pendingCommission.toLocaleString()}\n` +
        `📊 This Month: ₹${walletData.thisMonthEarnings.toLocaleString()}\n` +
        `📉 Last Month: ₹${walletData.lastMonthEarnings.toLocaleString()}\n` +
        `❤️ Donation Commission: ₹${walletData.donationCommissionTotal.toLocaleString()}\n` +
        `📤 Withdrawn: ₹${walletData.totalWithdrawn.toLocaleString()}\n` +
        `🔄 Pending Withdrawals: ₹${walletData.pendingWithdrawals.toLocaleString()}\n\n` +
        `🚀 Keep referring more members to earn more!`;
      
      await Share.share({
        message: message,
        title: 'My Wallet Summary'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const StatCard = ({ label, value, icon, color, subtitle }) => (
    <View style={[styles.statCard]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color }]}>₹{value.toLocaleString()}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const TransactionItem = ({ item }) => {
    const isDonation = item.isDonation || false;
    const isCredit = item.type === 'direct_commission' || item.type === 'secondary_commission';
    const color = getTransactionTypeColor(item.type, isDonation);
    const icon = getTransactionIcon(item.type, isDonation);
    const title = getTransactionTitle(item.type, isDonation);
    
    let levelName = '';
    if (item.levelId && !isDonation) {
      const level = getLevelDetails(item.levelId);
      levelName = level?.title || '';
    }

    const statusColor = item.status === 'completed' || item.status === 'paid' ? '#10b981' :
                        item.status === 'pending' || item.status === 'partially_paid' ? '#f59e0b' : '#ef4444';
    const statusText = item.status === 'completed' || item.status === 'paid' ? 'Completed' :
                       item.status === 'pending' ? 'Pending' :
                       item.status === 'partially_paid' ? 'Partial' : 'Failed';

    return (
      <TouchableOpacity 
        style={[styles.transactionItem, isDonation && styles.donationTransaction]}
        activeOpacity={0.7}
      >
        <View style={styles.transactionLeft}>
          <View style={[styles.transactionIcon, { backgroundColor: color + '15' }]}>
            <MaterialIcons name={icon} size={18} color={color} />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionTitle}>
              {title}
              {levelName && !isDonation && ` (${levelName})`}
              {isDonation && ' ❤️'}
            </Text>
            <Text style={styles.transactionDescription} numberOfLines={1}>
              {item.description || (isCredit ? 'Commission earned' : 'Withdrawal')}
            </Text>
            <Text style={styles.transactionDate}>
              {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}
            </Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text style={[
            styles.transactionAmount,
            { color: isDonation ? '#f59e0b' : (isCredit ? '#10b981' : '#ef4444') }
          ]}>
            {isCredit ? '+' : '-'}₹{item.amount?.toLocaleString() || 0}
          </Text>
          <View style={[styles.transactionStatus, { backgroundColor: statusColor }]}>
            <Text style={styles.transactionStatusText}>{statusText}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const CommissionBreakdown = () => {
    if (!showCommissionBreakdown) return null;

    return (
      <Animated.View style={[styles.breakdownContainer, { opacity: fadeAnim }]}>
        <View style={styles.breakdownHeader}>
          <Text style={styles.breakdownTitle}>Commission Breakdown</Text>
          <TouchableOpacity onPress={() => setShowCommissionBreakdown(false)}>
            <MaterialIcons name="close" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <View style={styles.breakdownItem}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.breakdownDot, { backgroundColor: '#8b5cf6' }]} />
            <Text style={styles.breakdownLabel}>Direct Commission</Text>
          </View>
          <View style={styles.breakdownRight}>
            <Text style={styles.breakdownValue}>₹{commissionSummary.direct.toLocaleString()}</Text>
            <Text style={styles.breakdownCount}>({commissionSummary.directCount} txns)</Text>
          </View>
        </View>
        <View style={styles.breakdownItem}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.breakdownDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.breakdownLabel}>Secondary Commission</Text>
          </View>
          <View style={styles.breakdownRight}>
            <Text style={styles.breakdownValue}>₹{commissionSummary.secondary.toLocaleString()}</Text>
            <Text style={styles.breakdownCount}>({commissionSummary.secondaryCount} txns)</Text>
          </View>
        </View>
        <View style={styles.breakdownItem}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.breakdownDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.breakdownLabel}>Donation Commission</Text>
          </View>
          <View style={styles.breakdownRight}>
            <Text style={styles.breakdownValue}>₹{commissionSummary.donation.toLocaleString()}</Text>
            <Text style={styles.breakdownCount}>({commissionSummary.donationCount} txns)</Text>
          </View>
        </View>
        <View style={styles.breakdownTotal}>
          <Text style={styles.breakdownTotalLabel}>Total Commission</Text>
          <Text style={styles.breakdownTotalValue}>
            ₹{(commissionSummary.direct + commissionSummary.secondary + commissionSummary.donation).toLocaleString()}
          </Text>
        </View>
      </Animated.View>
    );
  };

  // Donation Commission Card
  const DonationCommissionCard = () => (
    <View style={styles.donationCard}>
      <View style={styles.donationCardHeader}>
        <View style={styles.donationCardIcon}>
          <MaterialIcons name="volunteer-activism" size={22} color="#f59e0b" />
        </View>
        <Text style={styles.donationCardTitle}>Donation Commission</Text>
      </View>
      <View style={styles.donationCardContent}>
        <Text style={styles.donationCardAmount}>
          ₹{walletData.donationCommissionTotal.toLocaleString()}
        </Text>
        <Text style={styles.donationCardSubtext}>
          Earned from members' donations
        </Text>
      </View>
    </View>
  );

  // Level Progress Card
  const LevelProgressCard = () => {
    if (!levelDetails || !userData) return null;

    const directCount = userData.directReferrals?.length || 0;
    const level = userData.level || 'I';
    
    const getNextLevel = (currentLevel) => {
      const levels = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
      const idx = levels.indexOf(currentLevel);
      if (idx < levels.length - 1) return levels[idx + 1];
      return null;
    };

    const nextLevel = getNextLevel(level);
    const nextLevelDetails = nextLevel ? getLevelDetails(nextLevel) : null;
    const progress = nextLevelDetails ? Math.min((directCount / nextLevelDetails.minMembers) * 100, 100) : 100;

    if (!showLevelProgress) return null;

    return (
      <Animated.View style={[styles.levelProgressCard, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.levelProgressClose}
          onPress={() => setShowLevelProgress(false)}
        >
          <MaterialIcons name="close" size={16} color="#6b7280" />
        </TouchableOpacity>
        
        <View style={styles.levelProgressHeader}>
          <View>
            <Text style={styles.levelProgressTitle}>Current Level</Text>
            <View style={styles.levelBadgeContainer}>
              <Text style={styles.levelBadgeEmoji}>{levelDetails.badge || '⭐'}</Text>
              <Text style={styles.levelProgressLevel}>{levelDetails.title}</Text>
            </View>
          </View>
          <View style={styles.levelCommissionRates}>
            <Text style={styles.levelRateText}>Direct: {levelDetails.directCommission}%</Text>
            <Text style={styles.levelRateText}>Secondary: {levelDetails.secondaryCommission}%</Text>
          </View>
        </View>

        {nextLevelDetails && (
          <>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: levelDetails.color }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(Math.min(progress, 100))}%</Text>
            </View>
            <View style={styles.nextLevelInfo}>
              <Text style={styles.nextLevelText}>
                {directCount} / {nextLevelDetails.minMembers} members needed for 
                <Text style={[styles.nextLevelHighlight, { color: nextLevelDetails.color }]}>
                  {nextLevelDetails.title}
                </Text>
                {directCount >= nextLevelDetails.minMembers && (
                  <Text style={styles.eligibleText}> ✅ Eligible for promotion!</Text>
                )}
              </Text>
            </View>
          </>
        )}
      </Animated.View>
    );
  };

  // Monthly Comparison Card
  const MonthlyComparison = () => (
    <View style={styles.monthlyComparisonCard}>
      <View style={styles.monthlyComparisonItem}>
        <Text style={styles.monthlyComparisonLabel}>This Month</Text>
        <Text style={[styles.monthlyComparisonValue, { color: '#10b981' }]}>
          ₹{walletData.thisMonthEarnings.toLocaleString()}
        </Text>
      </View>
      <View style={styles.monthlyComparisonDivider} />
      <View style={styles.monthlyComparisonItem}>
        <Text style={styles.monthlyComparisonLabel}>Last Month</Text>
        <Text style={[styles.monthlyComparisonValue, { color: '#8b5cf6' }]}>
          ₹{walletData.lastMonthEarnings.toLocaleString()}
        </Text>
      </View>
      <View style={styles.monthlyComparisonDivider} />
      <View style={styles.monthlyComparisonItem}>
        <Text style={styles.monthlyComparisonLabel}>Difference</Text>
        <Text style={[
          styles.monthlyComparisonValue,
          { color: walletData.thisMonthEarnings >= walletData.lastMonthEarnings ? '#10b981' : '#ef4444' }
        ]}>
          {walletData.thisMonthEarnings >= walletData.lastMonthEarnings ? '▲' : '▼'} 
          ₹{(walletData.thisMonthEarnings - walletData.lastMonthEarnings).toLocaleString()}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  const filteredTransactions = getFilteredTransactions();

  return (
    <View style={styles.container}>
      {/* Purple Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Wallet</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <MaterialIcons name="share" size={22} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <MaterialIcons name="refresh" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Card inside header */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>₹{walletData.balance.toLocaleString()}</Text>
          <View style={styles.balanceActions}>
            <TouchableOpacity
              style={[styles.withdrawButton, walletData.balance <= 0 && styles.withdrawButtonDisabled]}
              onPress={() => setWithdrawModalVisible(true)}
              disabled={walletData.balance <= 0}
            >
              <MaterialIcons name="payment" size={18} color="#ffffff" />
              <Text style={styles.withdrawButtonText}>Withdraw</Text>
            </TouchableOpacity>
            {walletData.balance > 0 && (
              <TouchableOpacity
                style={styles.withdrawAllButton}
                onPress={() => {
                  setWithdrawAmount(String(walletData.balance));
                  setWithdrawModalVisible(true);
                }}
              >
                <Text style={styles.withdrawAllText}>Withdraw All</Text>
              </TouchableOpacity>
            )}
          </View>
          {walletData.pendingWithdrawals > 0 && (
            <View style={styles.pendingWithdrawalBadge}>
              <MaterialIcons name="pending" size={14} color="#f59e0b" />
              <Text style={styles.pendingWithdrawalText}>
                {walletData.pendingWithdrawals} pending withdrawal{walletData.pendingWithdrawals > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <StatCard
          label="Total Earned"
          value={walletData.totalEarned}
          icon="attach-money"
          color="#10b981"
        />
        <StatCard
          label="This Month"
          value={walletData.thisMonthEarnings}
          icon="trending-up"
          color="#8b5cf6"
        />
        <StatCard
          label="Pending"
          value={walletData.pendingCommission}
          icon="pending"
          color="#f59e0b"
        />
        <StatCard
          label="Withdrawn"
          value={walletData.totalWithdrawn}
          icon="arrow-upward"
          color="#ef4444"
        />
      </View>

      {/* Donation Commission Card */}
      <DonationCommissionCard />

      {/* Monthly Comparison */}
      <MonthlyComparison />

      {/* Level Progress */}
      <LevelProgressCard />

      {/* Commission Summary */}
      <View style={styles.commissionSummaryWrapper}>
        <TouchableOpacity 
          style={styles.commissionSummaryHeader}
          onPress={() => setShowCommissionBreakdown(!showCommissionBreakdown)}
        >
          <View style={styles.commissionSummaryLeft}>
            <MaterialIcons name="receipt" size={20} color="#8b5cf6" />
            <Text style={styles.commissionSummaryTitle}>Commission Summary</Text>
          </View>
          <View style={styles.commissionSummaryRight}>
            <Text style={styles.commissionSummaryTotal}>
              ₹{(commissionSummary.direct + commissionSummary.secondary + commissionSummary.donation).toLocaleString()}
            </Text>
            <MaterialIcons 
              name={showCommissionBreakdown ? 'expand-less' : 'expand-more'} 
              size={24} 
              color="#6b7280" 
            />
          </View>
        </TouchableOpacity>
        {showCommissionBreakdown && <CommissionBreakdown />}
      </View>

      {/* Transaction History - FIXED SCROLLING */}
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Transaction History</Text>
          <View style={styles.historyControls}>
            <TouchableOpacity
              style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
              onPress={() => setFilterType('all')}
            >
              <Text style={[styles.filterText, filterType === 'all' && styles.filterTextActive]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filterType === 'completed' && styles.filterButtonActive]}
              onPress={() => setFilterType('completed')}
            >
              <Text style={[styles.filterText, filterType === 'completed' && styles.filterTextActive]}>Completed</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filterType === 'pending' && styles.filterButtonActive]}
              onPress={() => setFilterType('pending')}
            >
              <Text style={[styles.filterText, filterType === 'pending' && styles.filterTextActive]}>Pending</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, selectedTab === 'all' && styles.tabButtonActive]}
            onPress={() => setSelectedTab('all')}
          >
            <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, selectedTab === 'credit' && styles.tabButtonActive]}
            onPress={() => setSelectedTab('credit')}
          >
            <MaterialIcons name="arrow-downward" size={14} color={selectedTab === 'credit' ? '#8b5cf6' : '#6b7280'} />
            <Text style={[styles.tabText, selectedTab === 'credit' && styles.tabTextActive]}>Credits</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, selectedTab === 'debit' && styles.tabButtonActive]}
            onPress={() => setSelectedTab('debit')}
          >
            <MaterialIcons name="arrow-upward" size={14} color={selectedTab === 'debit' ? '#ef4444' : '#6b7280'} />
            <Text style={[styles.tabText, selectedTab === 'debit' && styles.tabTextActive]}>Debits</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ FIXED: FlatList with proper height for scrolling */}
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={({ item }) => <TransactionItem item={item} />}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8b5cf6']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="history" size={44} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No transactions yet</Text>
              <Text style={styles.emptyStateSubtext}>Earn commissions by registering members</Text>
            </View>
          }
          contentContainerStyle={styles.transactionList}
          style={styles.flatList}
        />
      </View>

      {/* Withdraw Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={withdrawModalVisible}
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdraw Funds</Text>
              <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                <View style={styles.modalBalanceContainer}>
                  <Text style={styles.modalBalanceLabel}>Available Balance</Text>
                  <Text style={styles.modalBalance}>₹{walletData.balance.toLocaleString()}</Text>
                  <Text style={styles.modalBalanceSub}>Minimum withdrawal: ₹100</Text>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Amount (₹) *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={withdrawAmount}
                    onChangeText={setWithdrawAmount}
                    placeholder="Enter amount to withdraw"
                    keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Account Holder Name *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={bankDetails.accountHolderName}
                    onChangeText={(text) => setBankDetails({ ...bankDetails, accountHolderName: text })}
                    placeholder="Enter account holder name"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Bank Name *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={bankDetails.bankName}
                    onChangeText={(text) => setBankDetails({ ...bankDetails, bankName: text })}
                    placeholder="Enter bank name"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Account Number *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={bankDetails.accountNumber}
                    onChangeText={(text) => setBankDetails({ ...bankDetails, accountNumber: text })}
                    placeholder="Enter account number"
                    keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>IFSC Code *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={bankDetails.ifscCode}
                    onChangeText={(text) => setBankDetails({ ...bankDetails, ifscCode: text.toUpperCase() })}
                    placeholder="Enter IFSC code"
                    autoCapitalize="characters"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>UPI ID (Optional)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={upiId}
                    onChangeText={setUpiId}
                    placeholder="Enter UPI ID (e.g., name@upi)"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleWithdraw}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <MaterialIcons name="check-circle" size={20} color="#ffffff" />
                      <Text style={styles.submitButtonText}>Request Withdrawal</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.termsContainer}>
                  <MaterialIcons name="info" size={16} color="#6b7280" />
                  <Text style={styles.termsText}>
                    Minimum withdrawal: ₹100. Processing time: 24-48 hours.
                  </Text>
                </View>
              </View>
            </ScrollView>
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

  // Purple Header
  headerCard: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: { padding: 4 },
  headerTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareButton: { padding: 4 },
  refreshButton: { padding: 4 },

  balanceCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  balanceLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  balanceAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 36,
    color: '#ffffff',
    marginVertical: 8,
  },
  balanceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  withdrawButtonDisabled: {
    opacity: 0.5,
  },
  withdrawButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },
  withdrawAllButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  withdrawAllText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#ffffff',
  },
  pendingWithdrawalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 4,
  },
  pendingWithdrawalText: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#ffffff',
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 6,
  },
  statCard: {
    flex: 1,
    minWidth: '22%',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
  },
  statLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
  },
  statSubtitle: {
    fontFamily: Fonts.Regular,
    fontSize: 8,
    color: '#9ca3af',
    marginTop: 1,
  },

  donationCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fef3c7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  donationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  donationCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donationCardTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
  },
  donationCardContent: {
    marginTop: 8,
  },
  donationCardAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 24,
    color: '#f59e0b',
  },
  donationCardSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },

  monthlyComparisonCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  monthlyComparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  monthlyComparisonLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#6b7280',
  },
  monthlyComparisonValue: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
    marginTop: 2,
  },
  monthlyComparisonDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 6,
  },

  levelProgressCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  levelProgressClose: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    zIndex: 1,
  },
  levelProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingRight: 20,
  },
  levelProgressTitle: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
  },
  levelBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  levelBadgeEmoji: {
    fontSize: 20,
  },
  levelProgressLevel: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
  },
  levelCommissionRates: {
    alignItems: 'flex-end',
  },
  levelRateText: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  progressText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#6b7280',
    minWidth: 36,
    textAlign: 'right',
  },
  nextLevelInfo: {
    marginTop: 6,
  },
  nextLevelText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  nextLevelHighlight: {
    fontFamily: Fonts.SemiBold,
  },
  eligibleText: {
    color: '#10b981',
    fontFamily: Fonts.SemiBold,
  },

  commissionSummaryWrapper: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  commissionSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  commissionSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commissionSummaryTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
  },
  commissionSummaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commissionSummaryTotal: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#10b981',
  },
  breakdownContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#1f2937',
  },
  breakdownRight: {
    alignItems: 'flex-end',
  },
  breakdownValue: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
  },
  breakdownCount: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#6b7280',
  },
  breakdownTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  breakdownTotalLabel: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
    color: '#1f2937',
  },
  breakdownTotalValue: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#10b981',
  },

  historySection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
  },
  historyControls: {
    flexDirection: 'row',
    gap: 4,
  },
  filterButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  filterButtonActive: {
    backgroundColor: '#8b5cf6',
  },
  filterText: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#ffffff',
    fontFamily: Fonts.SemiBold,
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 2,
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#1f2937',
  },

  flatList: {
    flex: 1,
    minHeight: 400,
  },
  transactionList: {
    paddingBottom: 20,
    flexGrow: 1,
  },

  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  donationTransaction: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
  },
  transactionDescription: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
  },
  transactionDate: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 15,
  },
  transactionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  transactionStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 9,
    color: '#ffffff',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyStateText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
  },
  emptyStateSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
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

  modalOverlay: {
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
    fontSize: 20,
    color: '#1f2937',
  },
  modalBody: {
    gap: 12,
  },
  modalBalanceContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalBalanceLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
  },
  modalBalance: {
    fontFamily: Fonts.Bold,
    fontSize: 24,
    color: '#1f2937',
    marginTop: 4,
  },
  modalBalanceSub: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  field: {
    marginBottom: 4,
  },
  fieldLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
    marginBottom: 4,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f9fafb',
    fontFamily: Fonts.Regular,
    color: '#1f2937',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
  },
  termsText: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
});