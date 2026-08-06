// screens/admin/CommissionManagement.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
  FlatList
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  getDocs,
  where,
  orderBy,
  limit,
  onSnapshot,
addDoc,
  runTransaction,
  Timestamp,
  increment
} from 'firebase/firestore';
import { Fonts } from '../../config/fonts';
import { CommissionService } from '../../services/CommissionService';
import { WalletService } from '../../services/WalletService';
import { 
  getLevelDetails, 
  LEVELS,
  getLevelByDonations,
  isEligibleForPromotion,
  getPromotionRequirements
} from '../../config/commissionLevels';

const { width } = Dimensions.get('window');

export default function CommissionManagement({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [commissionData, setCommissionData] = useState(null);
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [pendingPromotions, setPendingPromotions] = useState([]);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [payoutModalVisible, setPayoutModalVisible] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNote, setPayoutNote] = useState('');
  const [stats, setStats] = useState({
    totalWorkingMembers: 0,
    totalCommissionPaid: 0,
    pendingCommission: 0,
    totalPayoutsThisMonth: 0,
    topEarners: [],
    totalDonationCommission: 0
  });
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [levelModalVisible, setLevelModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [selectedWorkingMember, setSelectedWorkingMember] = useState(null);
  const [memberPayoutModalVisible, setMemberPayoutModalVisible] = useState(false);
const [promotionConfirmVisible, setPromotionConfirmVisible] = useState(false);
const [pendingApproveData, setPendingApproveData] = useState(null);
  const [memberPayoutAmount, setMemberPayoutAmount] = useState('');
  const [editingLevelIndex, setEditingLevelIndex] = useState(null);
  const [donationStats, setDonationStats] = useState({
    totalDonationCommission: 0,
    totalDonations: 0,
    totalTransactions: 0
  });
  
  const [formData, setFormData] = useState({
    levels: [
      { 
        id: 'I', 
        name: 'Customer', 
        directCommission: 25, 
        secondaryCommission: 10, 
        minDonations: 0,
        maxDonations: 9999,
        donationsRequiredForPromotion: 10000
      },
      { 
        id: 'II', 
        name: 'Executive', 
        directCommission: 35, 
        secondaryCommission: 5, 
        minDonations: 10000,
        maxDonations: 24999,
        donationsRequiredForPromotion: 25000
      },
      { 
        id: 'III', 
        name: 'Manager', 
        directCommission: 40, 
        secondaryCommission: 2.5, 
        minDonations: 25000,
        maxDonations: 49999,
        donationsRequiredForPromotion: 50000
      },
      { 
        id: 'IV', 
        name: 'Coordinator', 
        directCommission: 42.5, 
        secondaryCommission: 1.25, 
        minDonations: 50000,
        maxDonations: 99999,
        donationsRequiredForPromotion: 100000
      },
      { 
        id: 'V', 
        name: 'Guide', 
        directCommission: 43.75, 
        secondaryCommission: 1.25, 
        minDonations: 100000,
        maxDonations: 249999,
        donationsRequiredForPromotion: 250000
      },
      { 
        id: 'VI', 
        name: 'Leader', 
        directCommission: 44.5, 
        secondaryCommission: 0.75, 
        minDonations: 250000,
        maxDonations: 499999,
        donationsRequiredForPromotion: 500000
      },
      { 
        id: 'VII', 
        name: 'Crown', 
        directCommission: 45, 
        secondaryCommission: 0.50, 
        minDonations: 500000,
        maxDonations: Infinity,
        donationsRequiredForPromotion: Infinity
      }
    ],
    registrationFee: 1000,
    minWithdrawal: 100,
    maxWithdrawal: 100000,
    autoPromotionEnabled: true,
    promotionNotificationEnabled: true,
    autoPayoutEnabled: false,
    payoutThreshold: 500,
    donationCommissionEnabled: true,
    donationCommissionRate: 25,
    lastUpdated: null
  });

  useEffect(() => {
    fetchCommissionData();
    fetchStats();
    setupPendingPayoutsListener();
    fetchDonationCommissionStats();
    fetchPendingPromotions();
  }, []);

  const setupPendingPayoutsListener = () => {
    const q = query(
      collection(db, 'walletTransactions'),
      where('type', 'in', ['direct_commission', 'secondary_commission']),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const payouts = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        payouts.push({ id: doc.id, ...data });
      });
      setPendingPayouts(payouts);
    });

    return () => unsubscribe();
  };

  const fetchCommissionData = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'commission');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCommissionData(data);
        setFormData({
          levels: data.levels || formData.levels,
          registrationFee: data.registrationFee || 1000,
          minWithdrawal: data.minWithdrawal || 100,
          maxWithdrawal: data.maxWithdrawal || 100000,
          autoPromotionEnabled: data.autoPromotionEnabled !== undefined ? data.autoPromotionEnabled : true,
          promotionNotificationEnabled: data.promotionNotificationEnabled !== undefined ? data.promotionNotificationEnabled : true,
          autoPayoutEnabled: data.autoPayoutEnabled !== undefined ? data.autoPayoutEnabled : false,
          payoutThreshold: data.payoutThreshold || 500,
          donationCommissionEnabled: data.donationCommissionEnabled !== undefined ? data.donationCommissionEnabled : true,
          donationCommissionRate: data.donationCommissionRate || 25,
          lastUpdated: data.lastUpdated || null
        });
      } else {
        await setDoc(doc(db, 'settings', 'commission'), formData);
      }
    } catch (error) {
      console.error('Error fetching commission data:', error);
      Alert.alert('Error', 'Failed to load commission data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['working', 'workingMember'])
      );
      const usersSnap = await getDocs(usersQuery);
      const workingMembers = usersSnap.size;

      const transactionsQuery = query(collection(db, 'walletTransactions'));
      const transactionsSnap = await getDocs(transactionsQuery);
      let totalPaid = 0;
      let pending = 0;

      transactionsSnap.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'direct_commission' || data.type === 'secondary_commission') {
          if (data.status === 'completed' || data.status === 'paid') {
            totalPaid += data.amount || 0;
          } else if (data.status === 'pending') {
            pending += data.amount || 0;
          }
        }
      });

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const monthQuery = query(
        collection(db, 'walletTransactions'),
        where('type', '==', 'withdrawal'),
        where('status', '==', 'completed'),
        where('createdAt', '>=', startOfMonth)
      );
      const monthSnap = await getDocs(monthQuery);
      let totalPayoutsThisMonth = 0;
      monthSnap.forEach((doc) => {
        totalPayoutsThisMonth += doc.data().amount || 0;
      });

      const topEarners = await CommissionService.getTopEarners(5);

      setStats({
        totalWorkingMembers: workingMembers,
        totalCommissionPaid: totalPaid,
        pendingCommission: pending,
        totalPayoutsThisMonth,
        topEarners
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchDonationCommissionStats = async () => {
    try {
      console.log('📊 Fetching donation commission stats...');
      
      const q = query(
        collection(db, 'commissionLogs'),
        where('type', '==', 'donation_commission')
      );
      
      const snapshot = await getDocs(q);
      let totalDonationCommission = 0;
      let totalDonations = 0;
      let count = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        totalDonationCommission += data.commissionAmount || 0;
        totalDonations += data.donationAmount || 0;
        count++;
      });
      
      setDonationStats({
        totalDonationCommission,
        totalDonations,
        totalTransactions: count
      });
      
      const topEarners = await CommissionService.getTopEarners(5);
      setStats(prev => ({
        ...prev,
        topEarners
      }));
      
    } catch (error) {
      console.error('Error fetching donation stats:', error);
    }
  };

  const fetchPendingPromotions = async () => {
  try {
    console.log('📊 Fetching pending promotions...');
    
    // Get the latest levels from Firestore
    const settingsRef = doc(db, 'settings', 'commission');
    const settingsSnap = await getDoc(settingsRef);
    let dynamicLevels = null;
    
    if (settingsSnap.exists()) {
      const settingsData = settingsSnap.data();
      if (settingsData.levels) {
        dynamicLevels = settingsData.levels;
      }
    }
    
    // If no dynamic levels, use formData.levels
    const levelsToUse = dynamicLevels || formData.levels;
    console.log('📊 Levels to use:', levelsToUse);
    
    // Get all working members
    const usersQuery = query(
      collection(db, 'users'),
      where('role', 'in', ['working', 'workingMember'])
    );
    const usersSnap = await getDocs(usersQuery);
    
    const promotions = [];
    
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Get total donations from this working member's registered members
      const donations = await CommissionService.getTotalDonationsByMember(userId);
      
      // Get current level
      const currentLevel = userData.level || 'I';
      
      // Find the current level in the dynamic levels
      const currentLevelIndex = levelsToUse.findIndex(l => l.id === currentLevel);
      const currentLevelData = currentLevelIndex !== -1 ? levelsToUse[currentLevelIndex] : null;
      
      if (!currentLevelData) {
        console.log(`⚠️ Level ${currentLevel} not found in levels data`);
        continue;
      }
      
      // Get next level
      const nextLevelIndex = currentLevelIndex + 1;
      const nextLevel = nextLevelIndex < levelsToUse.length ? levelsToUse[nextLevelIndex] : null;
      
      if (!nextLevel) {
        console.log(`⚠️ No next level for ${currentLevel}`);
        continue;
      }
      
      // ✅ Check if eligible based on donationsRequiredForPromotion from current level
      const donationsRequired = currentLevelData.donationsRequiredForPromotion || 0;
      const isEligible = donations >= donationsRequired;
      
      console.log(`📊 ${userData.fullName}: Level ${currentLevel}, Donations: ₹${donations}, Required: ₹${donationsRequired}, Eligible: ${isEligible}`);
      
      if (isEligible) {
        promotions.push({
          id: userId,
          name: userData.fullName || userData.name || 'Unknown',
          currentLevel: currentLevel,
          nextLevel: nextLevel.id,
          nextLevelName: nextLevel.name,
          totalDonations: donations,
          requiredDonations: donationsRequired,
          progress: Math.min((donations / (donationsRequired || 1)) * 100, 100),
          email: userData.email || '',
          phone: userData.phone || '',
          joinedDate: userData.createdAt || new Date().toISOString()
        });
      }
    }
    
    // Sort by progress (highest first)
    promotions.sort((a, b) => b.progress - a.progress);
    
    setPendingPromotions(promotions);
    console.log(`✅ Found ${promotions.length} pending promotions`);
    
  } catch (error) {
    console.error('Error fetching pending promotions:', error);
  }
};

  const approvePromotion = (memberId, nextLevel) => {
  console.log('🔍 approvePromotion called with:', { memberId, nextLevel });
  
  if (!memberId || !nextLevel) {
    Alert.alert('Error', 'Missing member ID or level');
    return;
  }

  // Show custom modal instead of Alert
  setPendingApproveData({ memberId, nextLevel });
  setPromotionConfirmVisible(true);
};
const confirmApprovePromotion = async () => {
  if (!pendingApproveData) return;
  
  const { memberId, nextLevel } = pendingApproveData;
  console.log('✅ Confirming promotion for:', memberId, 'to:', nextLevel);
  
  setSaving(true);
  setPromotionConfirmVisible(false);
  
  try {
    console.log('📝 Updating user level...');
    const userRef = doc(db, 'users', memberId);
    await updateDoc(userRef, {
      level: nextLevel,
      promotedAt: new Date().toISOString(),
      promotionApprovedBy: auth.currentUser?.uid || 'admin',
      updatedAt: new Date().toISOString()
    });
    console.log('✅ User level updated');

    console.log('📝 Creating promotion log...');
    const promotionLogRef = collection(db, 'promotionLogs');
    await addDoc(promotionLogRef, {
      userId: memberId,
      newLevel: nextLevel,
      approvedBy: auth.currentUser?.uid || 'admin',
      approvedAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      status: 'approved'
    });
    console.log('✅ Promotion log created');

    Alert.alert('Success', `Member promoted to Level ${nextLevel} successfully`);
    await fetchPendingPromotions();
    await fetchStats();
    
  } catch (error) {
    console.error('❌ Error approving promotion:', error);
    Alert.alert('Error', error.message || 'Failed to approve promotion');
  } finally {
    setSaving(false);
    setPendingApproveData(null);
  }
};

  const rejectPromotion = async (memberId) => {
  Alert.alert(
    'Reject Promotion',
    'Are you sure you want to reject this promotion?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            console.log('📝 Rejecting promotion for:', memberId);
            
            // Log rejection - using addDoc
            const rejectionRef = collection(db, 'promotionLogs');
            await addDoc(rejectionRef, {
              userId: memberId,
              status: 'rejected',
              rejectedBy: auth.currentUser?.uid || 'admin',
              rejectedAt: new Date().toISOString(),
              timestamp: new Date().toISOString()
            });
            
            Alert.alert('Success', 'Promotion rejected');
            await fetchPendingPromotions();
            
          } catch (error) {
            console.error('Error rejecting promotion:', error);
            Alert.alert('Error', error.message || 'Failed to reject promotion');
          } finally {
            setSaving(false);
          }
        }
      }
    ]
  );
};

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        levels: formData.levels,
        registrationFee: formData.registrationFee,
        minWithdrawal: formData.minWithdrawal,
        maxWithdrawal: formData.maxWithdrawal,
        autoPromotionEnabled: formData.autoPromotionEnabled,
        promotionNotificationEnabled: formData.promotionNotificationEnabled,
        autoPayoutEnabled: formData.autoPayoutEnabled,
        payoutThreshold: formData.payoutThreshold,
        donationCommissionEnabled: formData.donationCommissionEnabled,
        donationCommissionRate: formData.donationCommissionRate,
        lastUpdated: new Date().toISOString(),
        updatedBy: auth.currentUser?.uid || 'admin'
      };

      await setDoc(doc(db, 'settings', 'commission'), data);
      Alert.alert('Success', 'Commission settings updated successfully');
      setEditing(false);
      setSettingsModalVisible(false);
      setLevelModalVisible(false);
      fetchCommissionData();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const processPayout = async () => {
    if (!selectedPayout) return;
    
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (parseFloat(payoutAmount) > selectedPayout.amount) {
      Alert.alert('Error', 'Amount exceeds pending commission');
      return;
    }

    setSaving(true);
    try {
      const transactionRef = doc(db, 'walletTransactions', selectedPayout.id);
      
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(transactionRef);
        if (!docSnap.exists()) {
          throw new Error('Transaction not found');
        }

        transaction.update(transactionRef, {
          status: 'completed',
          paidAt: Timestamp.now(),
          paidAmount: parseFloat(payoutAmount),
          note: payoutNote || 'Commission payout processed',
          updatedAt: Timestamp.now()
        });

        const walletRef = doc(db, 'wallets', selectedPayout.userId);
        const walletSnap = await transaction.get(walletRef);
        if (walletSnap.exists()) {
          transaction.update(walletRef, {
            balance: increment(parseFloat(payoutAmount)),
            totalEarned: increment(parseFloat(payoutAmount)),
            pendingCommission: increment(-parseFloat(payoutAmount)),
            updatedAt: Timestamp.now()
          });
        }
      });

      Alert.alert('Success', 'Commission payout processed successfully');
      setPayoutModalVisible(false);
      setSelectedPayout(null);
      setPayoutAmount('');
      setPayoutNote('');
      fetchStats();
    } catch (error) {
      console.error('Error processing payout:', error);
      Alert.alert('Error', error.message || 'Failed to process payout');
    } finally {
      setSaving(false);
    }
  };

  const processAllPayouts = async () => {
    if (pendingPayouts.length === 0) {
      Alert.alert('Info', 'No pending payouts to process');
      return;
    }

    Alert.alert(
      'Process All Payouts',
      `Are you sure you want to process all ${pendingPayouts.length} pending payouts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Process All',
          onPress: async () => {
            setSaving(true);
            try {
              let processed = 0;
              let failed = 0;

              for (const payout of pendingPayouts) {
                try {
                  const transactionRef = doc(db, 'walletTransactions', payout.id);
                  
                  await runTransaction(db, async (transaction) => {
                    const docSnap = await transaction.get(transactionRef);
                    if (!docSnap.exists()) return;

                    transaction.update(transactionRef, {
                      status: 'completed',
                      paidAt: Timestamp.now(),
                      paidAmount: payout.amount,
                      note: 'Bulk payout processed',
                      updatedAt: Timestamp.now()
                    });

                    const walletRef = doc(db, 'wallets', payout.userId);
                    const walletSnap = await transaction.get(walletRef);
                    if (walletSnap.exists()) {
                      transaction.update(walletRef, {
                        balance: increment(payout.amount),
                        totalEarned: increment(payout.amount),
                        pendingCommission: increment(-payout.amount),
                        updatedAt: Timestamp.now()
                      });
                    }
                  });
                  processed++;
                } catch (error) {
                  console.error('Error processing payout:', error);
                  failed++;
                }
              }

              Alert.alert(
                'Bulk Payout Complete',
                `Processed: ${processed}\nFailed: ${failed}`
              );
              fetchStats();
            } catch (error) {
              Alert.alert('Error', error.message);
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const processMemberPayout = async () => {
    if (!selectedWorkingMember) return;
    
    if (!memberPayoutAmount || parseFloat(memberPayoutAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      const q = query(
        collection(db, 'walletTransactions'),
        where('userId', '==', selectedWorkingMember.id),
        where('type', 'in', ['direct_commission', 'secondary_commission']),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);
      
      let totalPending = 0;
      const transactions = [];
      snapshot.forEach((doc) => {
        totalPending += doc.data().amount || 0;
        transactions.push({ id: doc.id, ...doc.data() });
      });

      if (parseFloat(memberPayoutAmount) > totalPending) {
        Alert.alert('Error', `Amount exceeds pending commission of ₹${totalPending}`);
        setSaving(false);
        return;
      }

      let processed = 0;
      let remainingAmount = parseFloat(memberPayoutAmount);

      for (const transaction of transactions) {
        if (remainingAmount <= 0) break;
        
        const amountToPay = Math.min(transaction.amount, remainingAmount);
        const transactionRef = doc(db, 'walletTransactions', transaction.id);
        
        await runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(transactionRef);
          if (!docSnap.exists()) return;

          if (amountToPay >= transaction.amount) {
            transaction.update(transactionRef, {
              status: 'completed',
              paidAt: Timestamp.now(),
              paidAmount: amountToPay,
              note: `Payout to ${selectedWorkingMember.name}`,
              updatedAt: Timestamp.now()
            });
          } else {
            transaction.update(transactionRef, {
              amount: transaction.amount - amountToPay,
              status: 'partially_paid',
              updatedAt: Timestamp.now()
            });
            
            const newTransactionRef = doc(collection(db, 'walletTransactions'));
            transaction.set(newTransactionRef, {
              ...transaction,
              id: newTransactionRef.id,
              amount: amountToPay,
              status: 'completed',
              paidAt: Timestamp.now(),
              paidAmount: amountToPay,
              note: `Partial payout to ${selectedWorkingMember.name}`,
              updatedAt: Timestamp.now()
            });
          }
        });
        
        remainingAmount -= amountToPay;
        processed++;
      }

      const walletRef = doc(db, 'wallets', selectedWorkingMember.id);
      await updateDoc(walletRef, {
        balance: increment(parseFloat(memberPayoutAmount)),
        totalEarned: increment(parseFloat(memberPayoutAmount)),
        pendingCommission: increment(-parseFloat(memberPayoutAmount)),
        updatedAt: Timestamp.now()
      });

      Alert.alert(
        'Success',
        `₹${parseFloat(memberPayoutAmount).toLocaleString()} paid to ${selectedWorkingMember.name}`
      );
      
      setMemberPayoutModalVisible(false);
      setSelectedWorkingMember(null);
      setMemberPayoutAmount('');
      fetchStats();
    } catch (error) {
      console.error('Error processing member payout:', error);
      Alert.alert('Error', error.message || 'Failed to process payout');
    } finally {
      setSaving(false);
    }
  };

  const onRefresh = async () => {
  setRefreshing(true);
  await fetchCommissionData();
  await fetchStats();
  await fetchDonationCommissionStats();
  await fetchPendingPromotions();
  setRefreshing(false);
};

  // ============ Level Edit Functions ============
  const openLevelEditor = (index) => {
    setEditingLevelIndex(index);
    setSelectedLevel({ ...formData.levels[index] });
    setLevelModalVisible(true);
  };

  const updateLevelField = (field, value) => {
    if (!selectedLevel) return;
    
    const updatedLevel = { ...selectedLevel };
    
    if (field === 'name') {
      updatedLevel.name = value;
      setSelectedLevel(updatedLevel);
      return;
    }
    
    if (value === '∞') {
      updatedLevel[field] = Infinity;
      setSelectedLevel(updatedLevel);
      return;
    }
    
    if (value === '' || value === null || value === undefined) {
      updatedLevel[field] = '';
      setSelectedLevel(updatedLevel);
      return;
    }
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      updatedLevel[field] = numValue;
    } else {
      updatedLevel[field] = value;
    }
    
    setSelectedLevel(updatedLevel);
  };

  const saveLevelChanges = async () => {
    if (!selectedLevel || editingLevelIndex === null) return;
    
    setSaving(true);
    try {
      const level = { ...selectedLevel };
      const numericFields = ['directCommission', 'secondaryCommission', 'minDonations', 'maxDonations', 'donationsRequiredForPromotion'];
      
      for (const field of numericFields) {
        if (level[field] === '' || level[field] === null || level[field] === undefined) {
          level[field] = 0;
        }
        if (typeof level[field] === 'string' && level[field] !== '∞') {
          level[field] = parseFloat(level[field]) || 0;
        }
      }
      
      const newLevels = [...formData.levels];
      newLevels[editingLevelIndex] = level;
      
      setFormData(prev => ({
        ...prev,
        levels: newLevels
      }));
      
      setCommissionData(prev => ({
        ...prev,
        levels: newLevels,
        lastUpdated: new Date().toISOString()
      }));
      
      const docRef = doc(db, 'settings', 'commission');
      await updateDoc(docRef, {
        levels: newLevels,
        lastUpdated: new Date().toISOString()
      });
      
      setLevelModalVisible(false);
      setEditingLevelIndex(null);
      setSelectedLevel(null);
      
      Alert.alert('Success', 'Level updated successfully');
      await fetchCommissionData();
      
    } catch (error) {
      console.error('Error saving level:', error);
      Alert.alert('Error', error.message || 'Failed to save level');
    } finally {
      setSaving(false);
    }
  };

  // ============ Stats Components ============
  const StatCard = ({ label, value, icon, color }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  // Donation Stats Card
  const DonationStatsCard = () => (
    <View style={styles.donationStatsCard}>
      <View style={styles.donationStatsHeader}>
        <MaterialIcons name="volunteer-activism" size={20} color="#f59e0b" />
        <Text style={styles.donationStatsTitle}>Donation Commission Stats</Text>
      </View>
      <View style={styles.donationStatsGrid}>
        <View style={styles.donationStatItem}>
          <Text style={styles.donationStatValue}>₹{donationStats.totalDonationCommission.toLocaleString()}</Text>
          <Text style={styles.donationStatLabel}>Total Commission</Text>
        </View>
        <View style={styles.donationStatDivider} />
        <View style={styles.donationStatItem}>
          <Text style={styles.donationStatValue}>₹{donationStats.totalDonations.toLocaleString()}</Text>
          <Text style={styles.donationStatLabel}>Total Donations</Text>
        </View>
        <View style={styles.donationStatDivider} />
        <View style={styles.donationStatItem}>
          <Text style={styles.donationStatValue}>{donationStats.totalTransactions}</Text>
          <Text style={styles.donationStatLabel}>Transactions</Text>
        </View>
      </View>
    </View>
  );

  const PayoutCard = ({ item }) => {
    const [userName, setUserName] = useState('Loading...');
    
    useEffect(() => {
      const fetchUser = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', item.userId));
          if (userDoc.exists()) {
            setUserName(userDoc.data().fullName || userDoc.data().name || 'Unknown');
          }
        } catch (error) {
          console.error('Error fetching user:', error);
        }
      };
      fetchUser();
    }, [item.userId]);

    const isDirect = item.type === 'direct_commission';
    const isDonation = item.description?.toLowerCase().includes('donation') || false;

    return (
      <View style={[styles.payoutCard, isDonation && styles.donationPayoutCard]}>
        <View style={styles.payoutHeader}>
          <View style={styles.payoutUser}>
            <View style={[styles.payoutIcon, { backgroundColor: isDonation ? '#fef3c7' : (isDirect ? '#8b5cf615' : '#10b98115') }]}>
              <MaterialIcons 
                name={isDonation ? 'volunteer-activism' : (isDirect ? 'person-add' : 'share')} 
                size={18} 
                color={isDonation ? '#f59e0b' : (isDirect ? '#8b5cf6' : '#10b981')} 
              />
            </View>
            <View>
              <Text style={styles.payoutUserName}>{userName}</Text>
              <Text style={styles.payoutType}>
                {isDonation ? 'Donation Commission' : (isDirect ? 'Direct Commission' : 'Secondary Commission')}
              </Text>
            </View>
          </View>
          <View style={styles.payoutAmountContainer}>
            <Text style={[styles.payoutAmount, isDonation && styles.donationAmount]}>₹{item.amount?.toLocaleString() || 0}</Text>
            <Text style={styles.payoutDate}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.payoutButton, isDonation && styles.donationPayoutButton]}
          onPress={() => {
            setSelectedPayout(item);
            setPayoutAmount(String(item.amount || 0));
            setPayoutModalVisible(true);
          }}
        >
          <MaterialIcons name="payment" size={16} color="#ffffff" />
          <Text style={styles.payoutButtonText}>Process Payout</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const TopEarnerItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.topEarnerItem}
      onPress={() => {
        setSelectedWorkingMember(item);
        setMemberPayoutModalVisible(true);
      }}
    >
      <Text style={styles.topEarnerRank}>#{index + 1}</Text>
      <View style={styles.topEarnerInfo}>
        <Text style={styles.topEarnerName}>{item.name || 'Unknown'}</Text>
        <Text style={styles.topEarnerLevel}>Level {item.level || 'I'}</Text>
        {item.donationCommission > 0 && (
          <Text style={styles.topEarnerDonation}>❤️ Donation Comm: ₹{item.donationCommission.toLocaleString()}</Text>
        )}
        {item.totalDonationsFromMembers > 0 && (
          <Text style={styles.topEarnerTotalDonations}>💰 Total Donations: ₹{item.totalDonationsFromMembers.toLocaleString()}</Text>
        )}
      </View>
      <View style={styles.topEarnerRight}>
        <Text style={styles.topEarnerAmount}>₹{item.totalEarned?.toLocaleString() || 0}</Text>
        <TouchableOpacity
          style={styles.payNowButton}
          onPress={() => {
            setSelectedWorkingMember(item);
            setMemberPayoutAmount('');
            setMemberPayoutModalVisible(true);
          }}
        >
          <Text style={styles.payNowText}>Pay</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const LevelEditModal = () => {
    if (!selectedLevel) return null;

    const nextLevelIndex = formData.levels.findIndex(l => l.id === selectedLevel.id) + 1;
    const nextLevel = nextLevelIndex < formData.levels.length ? formData.levels[nextLevelIndex] : null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={levelModalVisible}
        onRequestClose={() => {
          setLevelModalVisible(false);
          setEditingLevelIndex(null);
          setSelectedLevel(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Level: {selectedLevel.id}</Text>
              <TouchableOpacity onPress={() => {
                setLevelModalVisible(false);
                setEditingLevelIndex(null);
                setSelectedLevel(null);
              }}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Level Name</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={selectedLevel.name || ''}
                    onChangeText={(text) => updateLevelField('name', text)}
                    placeholder="Enter level name"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Direct Commission (%)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={selectedLevel.directCommission !== undefined && selectedLevel.directCommission !== null ? String(selectedLevel.directCommission) : ''}
                    onChangeText={(text) => updateLevelField('directCommission', text)}
                    keyboardType="numeric"
                    placeholder="Enter direct commission"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Secondary Commission (%)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={selectedLevel.secondaryCommission !== undefined && selectedLevel.secondaryCommission !== null ? String(selectedLevel.secondaryCommission) : ''}
                    onChangeText={(text) => updateLevelField('secondaryCommission', text)}
                    keyboardType="numeric"
                    placeholder="Enter secondary commission"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionDividerText}>💰 Donation Requirements</Text>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Min Donations (₹)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={selectedLevel.minDonations !== undefined && selectedLevel.minDonations !== null ? String(selectedLevel.minDonations) : ''}
                    onChangeText={(text) => updateLevelField('minDonations', text)}
                    keyboardType="numeric"
                    placeholder="Enter min donations"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Max Donations (₹)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={selectedLevel.maxDonations === Infinity ? '∞' : (selectedLevel.maxDonations !== undefined && selectedLevel.maxDonations !== null ? String(selectedLevel.maxDonations) : '')}
                    onChangeText={(text) => updateLevelField('maxDonations', text)}
                    placeholder="Enter max donations (∞ for unlimited)"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Donations Required for Promotion (₹)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={selectedLevel.donationsRequiredForPromotion === Infinity ? '∞' : (selectedLevel.donationsRequiredForPromotion !== undefined && selectedLevel.donationsRequiredForPromotion !== null ? String(selectedLevel.donationsRequiredForPromotion) : '')}
                    onChangeText={(text) => updateLevelField('donationsRequiredForPromotion', text)}
                    placeholder="Enter donations required (∞ for no promotion)"
                    placeholderTextColor="#9ca3af"
                  />
                  {nextLevel && (
                    <Text style={styles.helperText}>
                      Next level ({nextLevel.name}) requires ₹{nextLevel.minDonations?.toLocaleString()} in donations
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.updateLevelButton}
                  onPress={saveLevelChanges}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.updateLevelButtonText}>Update Level</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const SettingsEditModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '95%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Commission Settings</Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Registration Fee (₹)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={String(formData.registrationFee)}
                    onChangeText={(text) => setFormData({ ...formData, registrationFee: parseFloat(text) || 0 })}
                    keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Min Withdrawal (₹)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={String(formData.minWithdrawal)}
                    onChangeText={(text) => setFormData({ ...formData, minWithdrawal: parseFloat(text) || 0 })}
                    keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Max Withdrawal (₹)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={String(formData.maxWithdrawal)}
                    onChangeText={(text) => setFormData({ ...formData, maxWithdrawal: parseFloat(text) || 0 })}
                    keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Payout Threshold (₹)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={String(formData.payoutThreshold)}
                    onChangeText={(text) => setFormData({ ...formData, payoutThreshold: parseFloat(text) || 0 })}
                    keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionDividerText}>💝 Donation Commission</Text>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Donation Commission Rate (%)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={String(formData.donationCommissionRate)}
                    onChangeText={(text) => setFormData({ ...formData, donationCommissionRate: parseFloat(text) || 0 })}
                    keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                  <Text style={styles.helperText}>Percentage of donation amount given as commission</Text>
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Auto Promotion</Text>
                  <TouchableOpacity
                    style={[styles.switch, formData.autoPromotionEnabled && styles.switchActive]}
                    onPress={() => setFormData({ ...formData, autoPromotionEnabled: !formData.autoPromotionEnabled })}
                  >
                    <View style={[styles.switchThumb, formData.autoPromotionEnabled && styles.switchThumbActive]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Auto Payout</Text>
                  <TouchableOpacity
                    style={[styles.switch, formData.autoPayoutEnabled && styles.switchActive]}
                    onPress={() => setFormData({ ...formData, autoPayoutEnabled: !formData.autoPayoutEnabled })}
                  >
                    <View style={[styles.switchThumb, formData.autoPayoutEnabled && styles.switchThumbActive]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Donation Commission</Text>
                  <TouchableOpacity
                    style={[styles.switch, formData.donationCommissionEnabled && styles.switchActive]}
                    onPress={() => setFormData({ ...formData, donationCommissionEnabled: !formData.donationCommissionEnabled })}
                  >
                    <View style={[styles.switchThumb, formData.donationCommissionEnabled && styles.switchThumbActive]} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <MaterialIcons name="save" size={20} color="#ffffff" />
                      <Text style={styles.saveButtonText}>Save All Settings</Text>
                    </>
                  )}
                </TouchableOpacity>
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
        <ActivityIndicator size="large" color="#FF7722" />
        <Text style={styles.loadingText}>Loading Commission Settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Saffron Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Commission Management</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setSettingsModalVisible(true)}
            >
              <MaterialIcons name="settings" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF7722']} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Working Members"
            value={stats.totalWorkingMembers}
            icon="people"
            color="#8b5cf6"
          />
          <StatCard
            label="Total Paid"
            value={`₹${stats.totalCommissionPaid.toLocaleString()}`}
            icon="attach-money"
            color="#10b981"
          />
          <StatCard
            label="Pending"
            value={`₹${stats.pendingCommission.toLocaleString()}`}
            icon="pending"
            color="#f59e0b"
          />
          <StatCard
            label="Payouts This Month"
            value={`₹${stats.totalPayoutsThisMonth.toLocaleString()}`}
            icon="payment"
            color="#FF7722"
          />
        </View>

        {/* Donation Stats Card */}
        <DonationStatsCard />

        {/* Pending Payouts Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="payment" size={20} color="#FF7722" />
            <Text style={styles.sectionTitle}>Pending Payouts ({pendingPayouts.length})</Text>
            {pendingPayouts.length > 0 && (
              <TouchableOpacity
                style={styles.processAllButton}
                onPress={processAllPayouts}
                disabled={saving}
              >
                <Text style={styles.processAllText}>Process All</Text>
              </TouchableOpacity>
            )}
          </View>

          {pendingPayouts.length > 0 ? (
            pendingPayouts.map((item) => (
              <PayoutCard key={item.id} item={item} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="check-circle" size={32} color="#10b981" />
              <Text style={styles.emptyStateText}>No pending payouts</Text>
              <Text style={styles.emptyStateSubtext}>All commissions have been paid</Text>
            </View>
          )}
        </View>

        {/* Pending Promotions Section */}
        {pendingPromotions.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="stars" size={20} color="#fbbf24" />
              <Text style={styles.sectionTitle}>Pending Promotions ({pendingPromotions.length})</Text>
            </View>

            {pendingPromotions.map((item) => (
              <View key={item.id} style={styles.promotionCard}>
                <View style={styles.promotionHeader}>
                  <View style={styles.promotionUser}>
                    <View style={styles.promotionAvatar}>
                      <Text style={styles.promotionAvatarText}>
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.promotionName}>{item.name}</Text>
                      <Text style={styles.promotionDetails}>
                        Level {item.currentLevel} → Level {item.nextLevel} ({item.nextLevelName})
                      </Text>
                      <Text style={styles.promotionDonations}>
                        ₹{item.totalDonations.toLocaleString()} / ₹{item.requiredDonations.toLocaleString()} donations
                      </Text>
                    </View>
                  </View>
                  <View style={styles.promotionProgressContainer}>
                    <Text style={styles.promotionProgressText}>
                      {Math.round(item.progress)}%
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.promotionProgressBar}>
                  <View 
                    style={[
                      styles.promotionProgressFill, 
                      { width: `${Math.min(item.progress, 100)}%` }
                    ]} 
                  />
                </View>

                <View style={styles.promotionActions}>
                  <TouchableOpacity
                    style={[styles.promotionActionButton, styles.promotionRejectButton]}
                    onPress={() => rejectPromotion(item.id)}
                    disabled={saving}
                  >
                    <MaterialIcons name="close" size={16} color="#ef4444" />
                    <Text style={styles.promotionRejectText}>Reject</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.promotionActionButton, styles.promotionApproveButton]}
                    onPress={() => approvePromotion(item.id, item.nextLevel)}
                    disabled={saving}
                  >
                    <MaterialIcons name="check" size={16} color="#ffffff" />
                    <Text style={styles.promotionApproveText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Top Earners */}
        {stats.topEarners.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="emoji-events" size={20} color="#fbbf24" />
              <Text style={styles.sectionTitle}>Top Earners</Text>
              <Text style={styles.sectionSubtitle}>Tap to pay</Text>
            </View>
            {stats.topEarners.map((item, index) => (
              <TopEarnerItem key={item.id} item={item} index={index} />
            ))}
          </View>
        )}

        {/* Membership Levels Table */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="workspace-premium" size={20} color="#FF7722" />
            <Text style={styles.sectionTitle}>Levels & Commission</Text>
            <TouchableOpacity 
              style={styles.editHintButton}
              onPress={() => Alert.alert('Edit Levels', 'Tap on any level row to edit its details')}
            >
              <MaterialIcons name="info-outline" size={18} color="#FF7722" />
            </TouchableOpacity>
          </View>

          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.levelCol]}>Level</Text>
            <Text style={[styles.tableHeaderText, styles.nameCol]}>Type</Text>
            <Text style={[styles.tableHeaderText, styles.percentageCol]}>Direct</Text>
            <Text style={[styles.tableHeaderText, styles.percentageCol]}>Secondary</Text>
            <Text style={[styles.tableHeaderText, styles.donationsCol]}>Donations Req</Text>
          </View>

          {formData.levels.map((level, index) => (
            <TouchableOpacity 
              key={level.id} 
              style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven, styles.tableRowTouchable]}
              onPress={() => openLevelEditor(index)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tableCell, styles.levelCol, styles.levelBadge]}>
                {level.id}
              </Text>
              <Text style={[styles.tableCell, styles.nameCol]}>
                {level.name}
              </Text>
              <Text style={[styles.tableCell, styles.percentageCol, styles.commissionText]}>
                {level.directCommission}%
              </Text>
              <Text style={[styles.tableCell, styles.percentageCol, styles.secondaryText]}>
                {level.secondaryCommission}%
              </Text>
              <Text style={[styles.tableCell, styles.donationsCol, styles.donationText]}>
                {level.donationsRequiredForPromotion === Infinity ? '∞' : `₹${(level.donationsRequiredForPromotion || 0).toLocaleString()}`}
              </Text>
              <View style={styles.editIconContainer}>
                <MaterialIcons name="edit" size={16} color="#FF7722" />
              </View>
            </TouchableOpacity>
          ))}

        </View>

        {/* Quick Settings */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="settings" size={20} color="#6b7280" />
            <Text style={styles.sectionTitle}>Quick Settings</Text>
            <TouchableOpacity 
              style={styles.editButtonSmall}
              onPress={() => setSettingsModalVisible(true)}
            >
              <MaterialIcons name="edit" size={16} color="#FF7722" />
            </TouchableOpacity>
          </View>
          <View style={styles.settingsGrid}>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Registration Fee</Text>
              <Text style={styles.settingValue}>₹{formData.registrationFee}</Text>
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Min Withdrawal</Text>
              <Text style={styles.settingValue}>₹{formData.minWithdrawal}</Text>
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Auto Promotion</Text>
              <Text style={[styles.settingValue, { color: formData.autoPromotionEnabled ? '#10b981' : '#ef4444' }]}>
                {formData.autoPromotionEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Donation Commission</Text>
              <Text style={[styles.settingValue, { color: formData.donationCommissionEnabled ? '#10b981' : '#ef4444' }]}>
                {formData.donationCommissionEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
        </View>

        {commissionData?.lastUpdated && (
          <View style={styles.updateInfo}>
            <MaterialIcons name="update" size={14} color="#9ca3af" />
            <Text style={styles.updateText}>
              Last updated: {new Date(commissionData.lastUpdated).toLocaleString()}
            </Text>
          </View>
        )}

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>NGO App v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Payout Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={payoutModalVisible}
        onRequestClose={() => setPayoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Process Payout</Text>
              <TouchableOpacity onPress={() => setPayoutModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.payoutSummary}>
                <Text style={styles.payoutSummaryLabel}>Pending Commission</Text>
                <Text style={styles.payoutSummaryValue}>₹{selectedPayout?.amount?.toLocaleString() || 0}</Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Amount to Pay (₹)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={payoutAmount}
                  onChangeText={setPayoutAmount}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Note (Optional)</Text>
                <TextInput
                  style={[styles.fieldInput, styles.textArea]}
                  value={payoutNote}
                  onChangeText={setPayoutNote}
                  placeholder="Add a note"
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, saving && styles.submitButtonDisabled]}
                onPress={processPayout}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={20} color="#ffffff" />
                    <Text style={styles.submitButtonText}>Process Payout</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
{/* Promotion Confirmation Modal */}
<Modal
  animationType="fade"
  transparent={true}
  visible={promotionConfirmVisible}
  onRequestClose={() => {
    setPromotionConfirmVisible(false);
    setPendingApproveData(null);
  }}
>
  <View style={styles.modalOverlay}>
    <View style={styles.confirmModalContent}>
      <View style={styles.confirmModalHeader}>
        <MaterialIcons name="stars" size={28} color="#fbbf24" />
        <Text style={styles.confirmModalTitle}>Approve Promotion</Text>
      </View>
      
      <View style={styles.confirmModalBody}>
        <Text style={styles.confirmModalText}>
          Are you sure you want to promote this member to
        </Text>
        <Text style={styles.confirmModalLevel}>
          Level {pendingApproveData?.nextLevel}
        </Text>
        <Text style={styles.confirmModalSubtext}>
          This action will update the member's level and grant them new commission rates.
        </Text>
      </View>

      <View style={styles.confirmModalActions}>
        <TouchableOpacity
          style={[styles.confirmModalButton, styles.confirmModalCancelButton]}
          onPress={() => {
            setPromotionConfirmVisible(false);
            setPendingApproveData(null);
          }}
        >
          <Text style={styles.confirmModalCancelText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.confirmModalButton, styles.confirmModalApproveButton]}
          onPress={confirmApprovePromotion}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <MaterialIcons name="check" size={18} color="#ffffff" />
              <Text style={styles.confirmModalApproveText}>Approve</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
      {/* Member Payout Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={memberPayoutModalVisible}
        onRequestClose={() => setMemberPayoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pay Working Member</Text>
              <TouchableOpacity onPress={() => setMemberPayoutModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.memberInfo}>
                <Text style={styles.memberInfoName}>{selectedWorkingMember?.name || 'Unknown'}</Text>
                <Text style={styles.memberInfoLevel}>Level {selectedWorkingMember?.level || 'I'}</Text>
                <Text style={styles.memberInfoEarned}>
                  Total Earned: ₹{selectedWorkingMember?.totalEarned?.toLocaleString() || 0}
                </Text>
                {selectedWorkingMember?.donationCommission > 0 && (
                  <Text style={styles.memberInfoDonation}>
                    ❤️ Donation Commission: ₹{selectedWorkingMember.donationCommission.toLocaleString()}
                  </Text>
                )}
                {selectedWorkingMember?.totalDonationsFromMembers > 0 && (
                  <Text style={styles.memberInfoTotalDonations}>
                    💰 Total Donations: ₹{selectedWorkingMember.totalDonationsFromMembers.toLocaleString()}
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Amount to Pay (₹)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={memberPayoutAmount}
                  onChangeText={setMemberPayoutAmount}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, saving && styles.submitButtonDisabled]}
                onPress={processMemberPayout}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="payment" size={20} color="#ffffff" />
                    <Text style={styles.submitButtonText}>Pay Now</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Level Edit Modal */}
      <LevelEditModal />

      {/* Settings Edit Modal */}
      <SettingsEditModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf8f3',
  },

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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fdf8f3',
  },
  loadingText: {
    fontFamily: Fonts.Regular,
    marginTop: 10,
    color: '#6b7280',
    fontSize: 14,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 6,
  },
  statCard: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontFamily: Fonts.Bold,
    fontSize: 13,
    color: '#1f2937',
  },
  statLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
  },

  donationStatsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#fef3c7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  donationStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  donationStatsTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
  },
  donationStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  donationStatItem: {
    alignItems: 'center',
  },
  donationStatValue: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#f59e0b',
  },
  donationStatLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  donationStatDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#1f2937',
    flex: 1,
  },
  sectionSubtitle: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#9ca3af',
  },
  processAllButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  processAllText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#ffffff',
  },
  editHintButton: {
    padding: 2,
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    color: '#4b5563',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#f9fafb',
  },
  tableRowTouchable: {
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
  },
  tableCell: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#1f2937',
  },
  levelCol: {
    width: '12%',
  },
  nameCol: {
    width: '28%',
  },
  percentageCol: {
    width: '18%',
    alignItems: 'flex-end',
  },
  donationsCol: {
    width: '30%',
    alignItems: 'flex-end',
  },
  levelBadge: {
    fontFamily: Fonts.Bold,
    color: '#FF7722',
  },
  commissionText: {
    fontFamily: Fonts.Bold,
    color: '#10b981',
  },
  secondaryText: {
    fontFamily: Fonts.Regular,
    color: '#8b5cf6',
  },
  donationText: {
    fontFamily: Fonts.SemiBold,
    color: '#f59e0b',
  },
  editIconContainer: {
    width: '6%',
    alignItems: 'center',
  },
  editHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    backgroundColor: '#fef3c7',
    borderRadius: 6,
  },
  editHintText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#92400e',
  },
  editButtonSmall: {
    padding: 2,
  },

  // Promotion Cards
  promotionCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  promotionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  promotionUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  promotionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promotionAvatarText: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#f59e0b',
  },
  promotionName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
  },
  promotionDetails: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
  },
  promotionDonations: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#f59e0b',
    marginTop: 2,
  },
  promotionProgressContainer: {
    alignItems: 'flex-end',
  },
  promotionProgressText: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
    color: '#f59e0b',
  },
  promotionProgressBar: {
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  promotionProgressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 3,
  },
  promotionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  promotionActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  promotionApproveButton: {
    backgroundColor: '#10b981',
  },
  promotionRejectButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  promotionApproveText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#ffffff',
  },
  promotionRejectText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#ef4444',
  },

  // Payout Cards
  payoutCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  donationPayoutCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  payoutUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payoutIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payoutUserName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
  },
  payoutType: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#6b7280',
  },
  payoutAmountContainer: {
    alignItems: 'flex-end',
  },
  payoutAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
    color: '#10b981',
  },
  donationAmount: {
    color: '#f59e0b',
  },
  payoutDate: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#9ca3af',
  },
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  donationPayoutButton: {
    backgroundColor: '#f59e0b',
  },
  payoutButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#ffffff',
  },

  topEarnerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  topEarnerRank: {
    fontFamily: Fonts.Bold,
    fontSize: 13,
    color: '#FF7722',
    width: 30,
  },
  topEarnerInfo: {
    flex: 1,
  },
  topEarnerName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
  },
  topEarnerLevel: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#6b7280',
  },
  topEarnerDonation: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#f59e0b',
    marginTop: 2,
  },
  topEarnerTotalDonations: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#10b981',
    marginTop: 2,
  },
  topEarnerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topEarnerAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 13,
    color: '#10b981',
  },
  payNowButton: {
    backgroundColor: '#FF7722',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  payNowText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    color: '#ffffff',
  },

  settingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  settingItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    padding: 8,
  },
  settingLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#6b7280',
  },
  settingValue: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
    marginTop: 2,
  },
  helperText: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  sectionDivider: {
    marginTop: 12,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  sectionDividerText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  emptyStateText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
  },
  emptyStateSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
  },

  updateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  updateText: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#9ca3af',
  },
// Add to styles object
confirmModalContent: {
  backgroundColor: '#ffffff',
  borderRadius: 20,
  padding: 24,
  width: '90%',
  maxWidth: 400,
  alignSelf: 'center',
},
confirmModalHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  marginBottom: 16,
},
confirmModalTitle: {
  fontFamily: Fonts.Bold,
  fontSize: 20,
  color: '#1f2937',
},
confirmModalBody: {
  alignItems: 'center',
  marginBottom: 24,
},
confirmModalText: {
  fontFamily: Fonts.Regular,
  fontSize: 14,
  color: '#6b7280',
  textAlign: 'center',
  marginBottom: 8,
},
confirmModalLevel: {
  fontFamily: Fonts.Bold,
  fontSize: 28,
  color: '#f59e0b',
  marginVertical: 8,
},
confirmModalSubtext: {
  fontFamily: Fonts.Regular,
  fontSize: 12,
  color: '#9ca3af',
  textAlign: 'center',
  marginTop: 4,
},
confirmModalActions: {
  flexDirection: 'row',
  gap: 10,
},
confirmModalButton: {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  gap: 6,
},
confirmModalCancelButton: {
  backgroundColor: '#f3f4f6',
  borderWidth: 1,
  borderColor: '#e5e7eb',
},
confirmModalApproveButton: {
  backgroundColor: '#10b981',
},
confirmModalCancelText: {
  fontFamily: Fonts.SemiBold,
  fontSize: 14,
  color: '#6b7280',
},
confirmModalApproveText: {
  fontFamily: Fonts.SemiBold,
  fontSize: 14,
  color: '#ffffff',
},
  versionContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  versionText: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#9ca3af',
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
    fontSize: 18,
    color: '#1f2937',
  },
  modalBody: {
    gap: 12,
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
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 15,
  },

  payoutSummary: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 4,
  },
  payoutSummaryLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  payoutSummaryValue: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#10b981',
    marginTop: 2,
  },

  memberInfo: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 4,
  },
  memberInfoName: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#1f2937',
  },
  memberInfoLevel: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  memberInfoEarned: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#10b981',
    marginTop: 4,
  },
  memberInfoDonation: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 2,
  },
  memberInfoTotalDonations: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#10b981',
    marginTop: 2,
  },

  updateLevelButton: {
    backgroundColor: '#FF7722',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  updateLevelButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  switchLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#d1d5db',
    padding: 2,
  },
  switchActive: {
    backgroundColor: '#10b981',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
  },
});