// screens/admin/CommissionManagement.js
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
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
  FlatList,
  Platform
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
import { PayoutService } from '../../services/PayoutService';
import { 
  getLevelDetails, 
  LEVELS,
  getLevelByDonations,
  isEligibleForPromotion,
  getPromotionRequirements
} from '../../config/commissionLevels';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

// ============ LevelEditModal Component ============
const LevelEditModal = memo(({ 
  visible, 
  selectedLevel, 
  onClose, 
  onUpdateField, 
  onSave,
  saving,
  isSmallDevice,
  formDataLevels
}) => {
  if (!selectedLevel) return null;

  const nextLevelIndex = formDataLevels.findIndex(l => l.id === selectedLevel.id) + 1;
  const nextLevel = nextLevelIndex < formDataLevels.length ? formDataLevels[nextLevelIndex] : null;

  const getDisplayValue = (value) => {
    if (value === Infinity) return '∞';
    if (value === '' || value === null || value === undefined) return '';
    return String(value);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { fontSize: isSmallDevice ? 16 : 18 }]}>Edit Level: {selectedLevel.id}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalBody}>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { fontSize: isSmallDevice ? 12 : 13 }]}>Level Name</Text>
                <TextInput
                  style={[styles.fieldInput, { fontSize: isSmallDevice ? 13 : 14 }]}
                  value={selectedLevel.name || ''}
                  onChangeText={(text) => onUpdateField('name', text)}
                  placeholder="Enter level name"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { fontSize: isSmallDevice ? 12 : 13 }]}>Direct Commission (%)</Text>
                <TextInput
                  style={[styles.fieldInput, { fontSize: isSmallDevice ? 13 : 14 }]}
                  value={getDisplayValue(selectedLevel.directCommission)}
                  onChangeText={(text) => onUpdateField('directCommission', text)}
                  keyboardType="numeric"
                  placeholder="Enter direct commission"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { fontSize: isSmallDevice ? 12 : 13 }]}>Secondary Commission (%)</Text>
                <TextInput
                  style={[styles.fieldInput, { fontSize: isSmallDevice ? 13 : 14 }]}
                  value={getDisplayValue(selectedLevel.secondaryCommission)}
                  onChangeText={(text) => onUpdateField('secondaryCommission', text)}
                  keyboardType="numeric"
                  placeholder="Enter secondary commission"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.sectionDivider}>
                <Text style={[styles.sectionDividerText, { fontSize: isSmallDevice ? 13 : 14 }]}>💰 Donation Requirements</Text>
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { fontSize: isSmallDevice ? 12 : 13 }]}>Min Donations (₹)</Text>
                <TextInput
                  style={[styles.fieldInput, { fontSize: isSmallDevice ? 13 : 14 }]}
                  value={getDisplayValue(selectedLevel.minDonations)}
                  onChangeText={(text) => onUpdateField('minDonations', text)}
                  keyboardType="numeric"
                  placeholder="Enter min donations"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { fontSize: isSmallDevice ? 12 : 13 }]}>Max Donations (₹)</Text>
                <TextInput
                  style={[styles.fieldInput, { fontSize: isSmallDevice ? 13 : 14 }]}
                  value={getDisplayValue(selectedLevel.maxDonations)}
                  onChangeText={(text) => onUpdateField('maxDonations', text)}
                  placeholder="Enter max donations (∞ for unlimited)"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { fontSize: isSmallDevice ? 12 : 13 }]}>Donations Required for Promotion (₹)</Text>
                <TextInput
                  style={[styles.fieldInput, { fontSize: isSmallDevice ? 13 : 14 }]}
                  value={getDisplayValue(selectedLevel.donationsRequiredForPromotion)}
                  onChangeText={(text) => onUpdateField('donationsRequiredForPromotion', text)}
                  placeholder="Enter donations required (∞ for no promotion)"
                  placeholderTextColor="#9ca3af"
                />
                {nextLevel && (
                  <Text style={[styles.helperText, { fontSize: isSmallDevice ? 10 : 11 }]}>
                    Next level ({nextLevel.name}) requires ₹{nextLevel.minDonations?.toLocaleString()} in donations
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.updateLevelButton}
                onPress={onSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={[styles.updateLevelButtonText, { fontSize: isSmallDevice ? 14 : 16 }]}>Update Level</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

// ============ Main Component ============
export default function CommissionManagement({ navigation }) {
  // ============ ALL HOOKS AT THE TOP ============
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
  const [payoutLogs, setPayoutLogs] = useState([]);
  const [showPayoutLogs, setShowPayoutLogs] = useState(false);
  
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

  // ============ useEffect Hooks ============
  useEffect(() => {
    fetchCommissionData();
    fetchStats();
    setupPendingPayoutsListener();
    fetchDonationCommissionStats();
    fetchPendingPromotions();
    fetchPayoutLogs();
  }, []);

  // ============ useCallback Hooks ============
  const updateLevelField = useCallback((field, value) => {
    if (!selectedLevel) return;
    
    setSelectedLevel(prev => {
      const updated = { ...prev };
      
      if (field === 'name') {
        updated.name = value;
        return updated;
      }
      
      if (value === '∞') {
        updated[field] = Infinity;
        return updated;
      }
      
      if (value === '' || value === null || value === undefined) {
        updated[field] = '';
        return updated;
      }
      
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        updated[field] = numValue;
      } else {
        updated[field] = value;
      }
      
      return updated;
    });
  }, [selectedLevel]);

  const getDisplayValue = useCallback((value) => {
    if (value === Infinity) return '∞';
    if (value === '' || value === null || value === undefined) return '';
    return String(value);
  }, []);

  // ============ Functions ============
  const setupPendingPayoutsListener = () => {
    const q = query(
      collection(db, 'walletTransactions'),
      where('type', 'in', ['direct_commission', 'secondary_commission', 'donation_commission']),
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
        if (data.type === 'direct_commission' || data.type === 'secondary_commission' || data.type === 'donation_commission') {
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
      
      const settingsRef = doc(db, 'settings', 'commission');
      const settingsSnap = await getDoc(settingsRef);
      let dynamicLevels = null;
      
      if (settingsSnap.exists()) {
        const settingsData = settingsSnap.data();
        if (settingsData.levels) {
          dynamicLevels = settingsData.levels;
        }
      }
      
      const levelsToUse = dynamicLevels || formData.levels;
      console.log('📊 Levels to use:', levelsToUse);
      
      const usersQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['working', 'workingMember'])
      );
      const usersSnap = await getDocs(usersQuery);
      
      const promotions = [];
      
      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        const donations = await CommissionService.getTotalDonationsByMember(userId);
        
        const currentLevel = userData.level || 'I';
        const currentLevelIndex = levelsToUse.findIndex(l => l.id === currentLevel);
        const currentLevelData = currentLevelIndex !== -1 ? levelsToUse[currentLevelIndex] : null;
        
        if (!currentLevelData) {
          console.log(`⚠️ Level ${currentLevel} not found in levels data`);
          continue;
        }
        
        const nextLevelIndex = currentLevelIndex + 1;
        const nextLevel = nextLevelIndex < levelsToUse.length ? levelsToUse[nextLevelIndex] : null;
        
        if (!nextLevel) {
          console.log(`⚠️ No next level for ${currentLevel}`);
          continue;
        }
        
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
      
      promotions.sort((a, b) => b.progress - a.progress);
      
      setPendingPromotions(promotions);
      console.log(`✅ Found ${promotions.length} pending promotions`);
      
    } catch (error) {
      console.error('Error fetching pending promotions:', error);
    }
  };

  const fetchPayoutLogs = async () => {
    try {
      const logs = await PayoutService.getAllPayoutLogs(20);
      setPayoutLogs(logs);
    } catch (error) {
      console.error('Error fetching payout logs:', error);
    }
  };

  const approvePromotion = (memberId, nextLevel) => {
    console.log('🔍 approvePromotion called with:', { memberId, nextLevel });
    
    if (!memberId || !nextLevel) {
      Alert.alert('Error', 'Missing member ID or level');
      return;
    }

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

  // ============ PAYOUT FUNCTIONS USING PayoutService ============
  
  const processPayout = async () => {
    if (!selectedPayout) return;
    
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const amount = parseFloat(payoutAmount);
    const maxAmount = selectedPayout.amount || 0;

    if (amount > maxAmount) {
      Alert.alert('Error', `Amount cannot exceed pending commission of ₹${maxAmount.toLocaleString()}`);
      return;
    }

    Alert.alert(
      'Confirm Payout',
      `Are you sure you want to process ₹${amount.toLocaleString()} payout?\n\nThis will add the amount to the member's wallet balance.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Process Payout',
          onPress: async () => {
            setSaving(true);
            try {
              const result = await PayoutService.processCommissionPayout(
                selectedPayout.id,
                amount,
                selectedPayout.userId
              );
              
              if (result.success) {
                Alert.alert('Success', `₹${amount.toLocaleString()} has been added to member's wallet`);
                setPayoutModalVisible(false);
                setSelectedPayout(null);
                setPayoutAmount('');
                setPayoutNote('');
                await fetchStats();
                await fetchDonationCommissionStats();
                await fetchPayoutLogs();
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to process payout');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const processAllPayouts = async () => {
    if (pendingPayouts.length === 0) {
      Alert.alert('Info', 'No pending payouts to process');
      return;
    }

    const totalAmount = pendingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

    Alert.alert(
      'Process All Payouts',
      `Are you sure you want to process all ${pendingPayouts.length} pending payouts?\n\nTotal: ₹${totalAmount.toLocaleString()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Process All',
          onPress: async () => {
            setSaving(true);
            try {
              const payouts = pendingPayouts.map(p => ({
                transactionId: p.id,
                memberId: p.userId,
                amount: p.amount || 0
              }));
              
              const results = await PayoutService.processBulkPayouts(payouts);
              
              Alert.alert(
                'Bulk Payout Complete',
                `✅ Successful: ${results.success.length}\n❌ Failed: ${results.failed.length}`
              );
              
              if (results.failed.length > 0) {
                console.log('Failed payouts:', results.failed);
              }
              
              await fetchStats();
              await fetchDonationCommissionStats();
              await fetchPayoutLogs();
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to process bulk payouts');
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

    const amount = parseFloat(memberPayoutAmount);

    Alert.alert(
      'Confirm Payout',
      `Are you sure you want to pay ₹${amount.toLocaleString()} to ${selectedWorkingMember.name}?\n\nThis will add the amount to their wallet.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            setSaving(true);
            try {
              const result = await PayoutService.processPayout(
                selectedWorkingMember.id,
                amount,
                'manual_payout',
                `Manual payout by admin`
              );
              
              if (result.success) {
                Alert.alert('Success', `₹${amount.toLocaleString()} paid to ${selectedWorkingMember.name}`);
                setMemberPayoutModalVisible(false);
                setSelectedWorkingMember(null);
                setMemberPayoutAmount('');
                await fetchStats();
                await fetchDonationCommissionStats();
                await fetchPayoutLogs();
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to process payout');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  // ============ END OF PAYOUT FUNCTIONS ============

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCommissionData();
    await fetchStats();
    await fetchDonationCommissionStats();
    await fetchPendingPromotions();
    await fetchPayoutLogs();
    setRefreshing(false);
  };

  const openLevelEditor = (index) => {
    setEditingLevelIndex(index);
    setSelectedLevel({ ...formData.levels[index] });
    setLevelModalVisible(true);
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

  const levelEditModal = useMemo(() => (
    <LevelEditModal
      visible={levelModalVisible}
      selectedLevel={selectedLevel}
      onClose={() => {
        setLevelModalVisible(false);
        setEditingLevelIndex(null);
        setSelectedLevel(null);
      }}
      onUpdateField={updateLevelField}
      onSave={saveLevelChanges}
      saving={saving}
      isSmallDevice={isSmallDevice}
      formDataLevels={formData.levels}
    />
  ), [levelModalVisible, selectedLevel, updateLevelField, saveLevelChanges, saving, formData.levels]);

  // ============ Components ============
  const StatCard = ({ label, value, icon, color }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <MaterialIcons name={icon} size={isSmallDevice ? 16 : 20} color={color} />
      </View>
      <Text style={[styles.statValue, { fontSize: isSmallDevice ? 11 : 13 }]}>{value}</Text>
      <Text style={[styles.statLabel, { fontSize: isSmallDevice ? 7 : 8 }]}>{label}</Text>
    </View>
  );

  const DonationStatsCard = () => (
    <View style={styles.donationStatsCard}>
      <View style={styles.donationStatsHeader}>
        <MaterialIcons name="volunteer-activism" size={isSmallDevice ? 16 : 20} color="#f59e0b" />
        <Text style={[styles.donationStatsTitle, { fontSize: isSmallDevice ? 12 : 14 }]}>Donation Commission Stats</Text>
      </View>
      <View style={styles.donationStatsGrid}>
        <View style={styles.donationStatItem}>
          <Text style={[styles.donationStatValue, { fontSize: isSmallDevice ? 14 : 18 }]}>
            ₹{donationStats.totalDonationCommission.toLocaleString()}
          </Text>
          <Text style={[styles.donationStatLabel, { fontSize: isSmallDevice ? 9 : 11 }]}>Total Commission</Text>
        </View>
        <View style={styles.donationStatDivider} />
        <View style={styles.donationStatItem}>
          <Text style={[styles.donationStatValue, { fontSize: isSmallDevice ? 14 : 18 }]}>
            ₹{donationStats.totalDonations.toLocaleString()}
          </Text>
          <Text style={[styles.donationStatLabel, { fontSize: isSmallDevice ? 9 : 11 }]}>Total Donations</Text>
        </View>
        <View style={styles.donationStatDivider} />
        <View style={styles.donationStatItem}>
          <Text style={[styles.donationStatValue, { fontSize: isSmallDevice ? 14 : 18 }]}>
            {donationStats.totalTransactions}
          </Text>
          <Text style={[styles.donationStatLabel, { fontSize: isSmallDevice ? 9 : 11 }]}>Transactions</Text>
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
    const isDonation = item.type === 'donation_commission' || item.isDonation === true;
    const isSecondary = item.type === 'secondary_commission';

    return (
      <View style={[styles.payoutCard, isDonation && styles.donationPayoutCard]}>
        <View style={styles.payoutHeader}>
          <View style={styles.payoutUser}>
            <View style={[styles.payoutIcon, { 
              backgroundColor: isDonation ? '#fef3c7' : (isDirect ? '#8b5cf615' : '#10b98115') 
            }]}>
              <MaterialIcons 
                name={isDonation ? 'volunteer-activism' : (isDirect ? 'person-add' : 'share')} 
                size={isSmallDevice ? 14 : 18} 
                color={isDonation ? '#f59e0b' : (isDirect ? '#8b5cf6' : '#10b981')} 
              />
            </View>
            <View>
              <Text style={[styles.payoutUserName, { fontSize: isSmallDevice ? 11 : 13 }]}>{userName}</Text>
              <Text style={[styles.payoutType, { fontSize: isSmallDevice ? 9 : 10 }]}>
                {isDonation ? 'Donation Commission' : (isDirect ? 'Direct Commission' : 'Secondary Commission')}
              </Text>
            </View>
          </View>
          <View style={styles.payoutAmountContainer}>
            <Text style={[styles.payoutAmount, isDonation && styles.donationAmount, { fontSize: isSmallDevice ? 12 : 14 }]}>
              ₹{item.amount?.toLocaleString() || 0}
            </Text>
            <Text style={[styles.payoutDate, { fontSize: isSmallDevice ? 9 : 10 }]}>
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
          <MaterialIcons name="payment" size={isSmallDevice ? 12 : 16} color="#ffffff" />
          <Text style={[styles.payoutButtonText, { fontSize: isSmallDevice ? 10 : 11 }]}>Process Payout</Text>
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
      <Text style={[styles.topEarnerRank, { fontSize: isSmallDevice ? 11 : 13 }]}>#{index + 1}</Text>
      <View style={styles.topEarnerInfo}>
        <Text style={[styles.topEarnerName, { fontSize: isSmallDevice ? 11 : 13 }]}>{item.name || 'Unknown'}</Text>
        <Text style={[styles.topEarnerLevel, { fontSize: isSmallDevice ? 9 : 10 }]}>Level {item.level || 'I'}</Text>
        {item.donationCommission > 0 && (
          <Text style={[styles.topEarnerDonation, { fontSize: isSmallDevice ? 9 : 10 }]}>
            ❤️ Donation Comm: ₹{item.donationCommission.toLocaleString()}
          </Text>
        )}
        {item.totalDonationsFromMembers > 0 && (
          <Text style={[styles.topEarnerTotalDonations, { fontSize: isSmallDevice ? 9 : 10 }]}>
            💰 Total Donations: ₹{item.totalDonationsFromMembers.toLocaleString()}
          </Text>
        )}
      </View>
      <View style={styles.topEarnerRight}>
        <Text style={[styles.topEarnerAmount, { fontSize: isSmallDevice ? 11 : 13 }]}>
          ₹{item.totalEarned?.toLocaleString() || 0}
        </Text>
        <TouchableOpacity
          style={styles.payNowButton}
          onPress={() => {
            setSelectedWorkingMember(item);
            setMemberPayoutAmount('');
            setMemberPayoutModalVisible(true);
          }}
        >
          <Text style={[styles.payNowText, { fontSize: isSmallDevice ? 9 : 10 }]}>Pay</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

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
              <Text style={[styles.modalTitle, { fontSize: isSmallDevice ? 16 : 18 }]}>Edit Commission Settings</Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { fontSize: isSmallDevice ? 12 : 13 }]}>Registration Fee (₹)</Text>
                  <TextInput
                    style={[styles.fieldInput, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={String(formData.registrationFee)}
                    onChangeText={(text) => setFormData({ ...formData, registrationFee: parseFloat(text) || 0 })}
                    keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { fontSize: isSmallDevice ? 12 : 13 }]}>Min Withdrawal (₹)</Text>
                  <TextInput
                    style={[styles.fieldInput, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={String(formData.minWithdrawal)}
                    onChangeText={(text) => setFormData({ ...formData, minWithdrawal: parseFloat(text) || 0 })}
                    keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { fontSize: isSmallDevice ? 12 : 13 }]}>Max Withdrawal (₹)</Text>
                  <TextInput
                    style={[styles.fieldInput, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={String(formData.maxWithdrawal)}
                    onChangeText={(text) => setFormData({ ...formData, maxWithdrawal: parseFloat(text) || 0 })}
                    keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { fontSize: isSmallDevice ? 12 : 13 }]}>Payout Threshold (₹)</Text>
                  <TextInput
                    style={[styles.fieldInput, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={String(formData.payoutThreshold)}
                    onChangeText={(text) => setFormData({ ...formData, payoutThreshold: parseFloat(text) || 0 })}
                    keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.sectionDivider}>
                  <Text style={[styles.sectionDividerText, { fontSize: isSmallDevice ? 13 : 14 }]}>💝 Donation Commission</Text>
                </View>

                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { fontSize: isSmallDevice ? 12 : 13 }]}>Donation Commission Rate (%)</Text>
                  <TextInput
                    style={[styles.fieldInput, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={String(formData.donationCommissionRate)}
                    onChangeText={(text) => setFormData({ ...formData, donationCommissionRate: parseFloat(text) || 0 })}
                    keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                  <Text style={[styles.helperText, { fontSize: isSmallDevice ? 10 : 11 }]}>
                    Percentage of donation amount given as commission
                  </Text>
                </View>

                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: isSmallDevice ? 13 : 14 }]}>Auto Promotion</Text>
                  <TouchableOpacity
                    style={[styles.switch, formData.autoPromotionEnabled && styles.switchActive]}
                    onPress={() => setFormData({ ...formData, autoPromotionEnabled: !formData.autoPromotionEnabled })}
                  >
                    <View style={[styles.switchThumb, formData.autoPromotionEnabled && styles.switchThumbActive]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: isSmallDevice ? 13 : 14 }]}>Auto Payout</Text>
                  <TouchableOpacity
                    style={[styles.switch, formData.autoPayoutEnabled && styles.switchActive]}
                    onPress={() => setFormData({ ...formData, autoPayoutEnabled: !formData.autoPayoutEnabled })}
                  >
                    <View style={[styles.switchThumb, formData.autoPayoutEnabled && styles.switchThumbActive]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { fontSize: isSmallDevice ? 13 : 14 }]}>Donation Commission</Text>
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
                      <Text style={[styles.saveButtonText, { fontSize: isSmallDevice ? 14 : 16 }]}>Save All Settings</Text>
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

  // ============ RENDER ============
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF7722" />
        <Text style={[styles.loadingText, { fontSize: isSmallDevice ? 13 : 14 }]}>Loading Commission Settings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Saffron Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontSize: isSmallDevice ? 18 : 20 }]}>Commission Management</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setSettingsModalVisible(true)}
              >
                <MaterialIcons name="settings" size={isSmallDevice ? 18 : 22} color="#ffffff" />
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
              <MaterialIcons name="payment" size={isSmallDevice ? 16 : 20} color="#FF7722" />
              <Text style={[styles.sectionTitle, { fontSize: isSmallDevice ? 13 : 15 }]}>
                Pending Payouts ({pendingPayouts.length})
              </Text>
              {pendingPayouts.length > 0 && (
                <TouchableOpacity
                  style={styles.processAllButton}
                  onPress={processAllPayouts}
                  disabled={saving}
                >
                  <Text style={[styles.processAllText, { fontSize: isSmallDevice ? 10 : 11 }]}>Process All</Text>
                </TouchableOpacity>
              )}
            </View>

            {pendingPayouts.length > 0 ? (
              pendingPayouts.map((item) => (
                <PayoutCard key={item.id} item={item} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="check-circle" size={isSmallDevice ? 28 : 32} color="#10b981" />
                <Text style={[styles.emptyStateText, { fontSize: isSmallDevice ? 13 : 14 }]}>No pending payouts</Text>
                <Text style={[styles.emptyStateSubtext, { fontSize: isSmallDevice ? 10 : 11 }]}>All commissions have been paid</Text>
              </View>
            )}
          </View>

          {/* Pending Promotions Section */}
          {pendingPromotions.length > 0 && (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="stars" size={isSmallDevice ? 16 : 20} color="#fbbf24" />
                <Text style={[styles.sectionTitle, { fontSize: isSmallDevice ? 13 : 15 }]}>
                  Pending Promotions ({pendingPromotions.length})
                </Text>
              </View>

              {pendingPromotions.map((item) => (
                <View key={item.id} style={styles.promotionCard}>
                  <View style={styles.promotionHeader}>
                    <View style={styles.promotionUser}>
                      <View style={styles.promotionAvatar}>
                        <Text style={[styles.promotionAvatarText, { fontSize: isSmallDevice ? 14 : 16 }]}>
                          {item.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.promotionName, { fontSize: isSmallDevice ? 11 : 13 }]}>{item.name}</Text>
                        <Text style={[styles.promotionDetails, { fontSize: isSmallDevice ? 10 : 11 }]}>
                          Level {item.currentLevel} → Level {item.nextLevel} ({item.nextLevelName})
                        </Text>
                        <Text style={[styles.promotionDonations, { fontSize: isSmallDevice ? 10 : 11 }]}>
                          ₹{item.totalDonations.toLocaleString()} / ₹{item.requiredDonations.toLocaleString()} donations
                        </Text>
                      </View>
                    </View>
                    <View style={styles.promotionProgressContainer}>
                      <Text style={[styles.promotionProgressText, { fontSize: isSmallDevice ? 12 : 14 }]}>
                        {Math.round(item.progress)}%
                      </Text>
                    </View>
                  </View>

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
                      <MaterialIcons name="close" size={isSmallDevice ? 12 : 16} color="#ef4444" />
                      <Text style={[styles.promotionRejectText, { fontSize: isSmallDevice ? 10 : 12 }]}>Reject</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.promotionActionButton, styles.promotionApproveButton]}
                      onPress={() => approvePromotion(item.id, item.nextLevel)}
                      disabled={saving}
                    >
                      <MaterialIcons name="check" size={isSmallDevice ? 12 : 16} color="#ffffff" />
                      <Text style={[styles.promotionApproveText, { fontSize: isSmallDevice ? 10 : 12 }]}>Approve</Text>
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
                <MaterialIcons name="emoji-events" size={isSmallDevice ? 16 : 20} color="#fbbf24" />
                <Text style={[styles.sectionTitle, { fontSize: isSmallDevice ? 13 : 15 }]}>Top Earners</Text>
                <Text style={[styles.sectionSubtitle, { fontSize: isSmallDevice ? 9 : 10 }]}>Tap to pay</Text>
              </View>
              {stats.topEarners.map((item, index) => (
                <TopEarnerItem key={item.id} item={item} index={index} />
              ))}
            </View>
          )}

          {/* Membership Levels Table */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="workspace-premium" size={isSmallDevice ? 16 : 20} color="#FF7722" />
              <Text style={[styles.sectionTitle, { fontSize: isSmallDevice ? 13 : 15 }]}>Levels & Commission</Text>
              <TouchableOpacity 
                style={styles.editHintButton}
                onPress={() => Alert.alert('Edit Levels', 'Tap on any level row to edit its details')}
              >
                <MaterialIcons name="info-outline" size={isSmallDevice ? 14 : 18} color="#FF7722" />
              </TouchableOpacity>
            </View>

            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { fontSize: isSmallDevice ? 9 : 10 }]}>Level</Text>
              <Text style={[styles.tableHeaderText, { fontSize: isSmallDevice ? 9 : 10 }]}>Type</Text>
              <Text style={[styles.tableHeaderText, { fontSize: isSmallDevice ? 9 : 10 }]}>Direct</Text>
              <Text style={[styles.tableHeaderText, { fontSize: isSmallDevice ? 9 : 10 }]}>Secondary</Text>
              <Text style={[styles.tableHeaderText, { fontSize: isSmallDevice ? 9 : 10 }]}>Donations Req</Text>
            </View>

            {formData.levels.map((level, index) => (
              <TouchableOpacity 
                key={level.id} 
                style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven, styles.tableRowTouchable]}
                onPress={() => openLevelEditor(index)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tableCell, styles.levelCol, styles.levelBadge, { fontSize: isSmallDevice ? 10 : 11 }]}>
                  {level.id}
                </Text>
                <Text style={[styles.tableCell, styles.nameCol, { fontSize: isSmallDevice ? 10 : 11 }]}>
                  {level.name}
                </Text>
                <Text style={[styles.tableCell, styles.percentageCol, styles.commissionText, { fontSize: isSmallDevice ? 10 : 11 }]}>
                  {level.directCommission}%
                </Text>
                <Text style={[styles.tableCell, styles.percentageCol, styles.secondaryText, { fontSize: isSmallDevice ? 10 : 11 }]}>
                  {level.secondaryCommission}%
                </Text>
                <Text style={[styles.tableCell, styles.donationsCol, styles.donationText, { fontSize: isSmallDevice ? 10 : 11 }]}>
                  {level.donationsRequiredForPromotion === Infinity ? '∞' : `₹${(level.donationsRequiredForPromotion || 0).toLocaleString()}`}
                </Text>
                <View style={styles.editIconContainer}>
                  <MaterialIcons name="edit" size={isSmallDevice ? 12 : 16} color="#FF7722" />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Settings */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="settings" size={isSmallDevice ? 16 : 20} color="#6b7280" />
              <Text style={[styles.sectionTitle, { fontSize: isSmallDevice ? 13 : 15 }]}>Quick Settings</Text>
              <TouchableOpacity 
                style={styles.editButtonSmall}
                onPress={() => setSettingsModalVisible(true)}
              >
                <MaterialIcons name="edit" size={isSmallDevice ? 12 : 16} color="#FF7722" />
              </TouchableOpacity>
            </View>
            <View style={styles.settingsGrid}>
              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, { fontSize: isSmallDevice ? 9 : 10 }]}>Registration Fee</Text>
                <Text style={[styles.settingValue, { fontSize: isSmallDevice ? 11 : 13 }]}>₹{formData.registrationFee}</Text>
              </View>
              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, { fontSize: isSmallDevice ? 9 : 10 }]}>Min Withdrawal</Text>
                <Text style={[styles.settingValue, { fontSize: isSmallDevice ? 11 : 13 }]}>₹{formData.minWithdrawal}</Text>
              </View>
              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, { fontSize: isSmallDevice ? 9 : 10 }]}>Auto Promotion</Text>
                <Text style={[styles.settingValue, { fontSize: isSmallDevice ? 11 : 13, color: formData.autoPromotionEnabled ? '#10b981' : '#ef4444' }]}>
                  {formData.autoPromotionEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, { fontSize: isSmallDevice ? 9 : 10 }]}>Donation Commission</Text>
                <Text style={[styles.settingValue, { fontSize: isSmallDevice ? 11 : 13, color: formData.donationCommissionEnabled ? '#10b981' : '#ef4444' }]}>
                  {formData.donationCommissionEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
          </View>

          {commissionData?.lastUpdated && (
            <View style={styles.updateInfo}>
              <MaterialIcons name="update" size={isSmallDevice ? 12 : 14} color="#9ca3af" />
              <Text style={[styles.updateText, { fontSize: isSmallDevice ? 10 : 11 }]}>
                Last updated: {new Date(commissionData.lastUpdated).toLocaleString()}
              </Text>
            </View>
          )}

          <View style={styles.versionContainer}>
            <Text style={[styles.versionText, { fontSize: isSmallDevice ? 9 : 10 }]}>NGO App v1.0.0</Text>
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
                <Text style={[styles.modalTitle, { fontSize: isSmallDevice ? 16 : 18 }]}>Process Payout</Text>
                <TouchableOpacity onPress={() => setPayoutModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.payoutSummary}>
                  <Text style={[styles.payoutSummaryLabel, { fontSize: isSmallDevice ? 11 : 12 }]}>Pending Commission</Text>
                  <Text style={[styles.payoutSummaryValue, { fontSize: isSmallDevice ? 18 : 22 }]}>
                    ₹{selectedPayout?.amount?.toLocaleString() || 0}
                  </Text>
                </View>

                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { fontSize: isSmallDevice ? 12 : 13 }]}>Amount to Pay (₹)</Text>
                  <TextInput
                    style={[styles.fieldInput, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={payoutAmount}
                    onChangeText={setPayoutAmount}
                    placeholder="Enter amount"
                    keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { fontSize: isSmallDevice ? 12 : 13 }]}>Note (Optional)</Text>
                  <TextInput
                    style={[styles.fieldInput, styles.textArea, { fontSize: isSmallDevice ? 13 : 14 }]}
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
                      <Text style={[styles.submitButtonText, { fontSize: isSmallDevice ? 14 : 15 }]}>Process Payout</Text>
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
                <MaterialIcons name="stars" size={isSmallDevice ? 24 : 28} color="#fbbf24" />
                <Text style={[styles.confirmModalTitle, { fontSize: isSmallDevice ? 18 : 20 }]}>Approve Promotion</Text>
              </View>
              
              <View style={styles.confirmModalBody}>
                <Text style={[styles.confirmModalText, { fontSize: isSmallDevice ? 13 : 14 }]}>
                  Are you sure you want to promote this member to
                </Text>
                <Text style={[styles.confirmModalLevel, { fontSize: isSmallDevice ? 24 : 28 }]}>
                  Level {pendingApproveData?.nextLevel}
                </Text>
                <Text style={[styles.confirmModalSubtext, { fontSize: isSmallDevice ? 11 : 12 }]}>
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
                  <Text style={[styles.confirmModalCancelText, { fontSize: isSmallDevice ? 13 : 14 }]}>Cancel</Text>
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
                      <MaterialIcons name="check" size={isSmallDevice ? 14 : 18} color="#ffffff" />
                      <Text style={[styles.confirmModalApproveText, { fontSize: isSmallDevice ? 13 : 14 }]}>Approve</Text>
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
                <Text style={[styles.modalTitle, { fontSize: isSmallDevice ? 16 : 18 }]}>Pay Working Member</Text>
                <TouchableOpacity onPress={() => setMemberPayoutModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberInfoName, { fontSize: isSmallDevice ? 14 : 16 }]}>
                    {selectedWorkingMember?.name || 'Unknown'}
                  </Text>
                  <Text style={[styles.memberInfoLevel, { fontSize: isSmallDevice ? 11 : 12 }]}>
                    Level {selectedWorkingMember?.level || 'I'}
                  </Text>
                  <Text style={[styles.memberInfoEarned, { fontSize: isSmallDevice ? 12 : 13 }]}>
                    Total Earned: ₹{selectedWorkingMember?.totalEarned?.toLocaleString() || 0}
                  </Text>
                  {selectedWorkingMember?.donationCommission > 0 && (
                    <Text style={[styles.memberInfoDonation, { fontSize: isSmallDevice ? 11 : 12 }]}>
                      ❤️ Donation Commission: ₹{selectedWorkingMember.donationCommission.toLocaleString()}
                    </Text>
                  )}
                  {selectedWorkingMember?.totalDonationsFromMembers > 0 && (
                    <Text style={[styles.memberInfoTotalDonations, { fontSize: isSmallDevice ? 11 : 12 }]}>
                      💰 Total Donations: ₹{selectedWorkingMember.totalDonationsFromMembers.toLocaleString()}
                    </Text>
                  )}
                </View>

                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { fontSize: isSmallDevice ? 12 : 13 }]}>Amount to Pay (₹)</Text>
                  <TextInput
                    style={[styles.fieldInput, { fontSize: isSmallDevice ? 13 : 14 }]}
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
                      <Text style={[styles.submitButtonText, { fontSize: isSmallDevice ? 14 : 15 }]}>Pay Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Level Edit Modal */}
        {levelEditModal}

        {/* Settings Edit Modal */}
        <SettingsEditModal />
      </View>
    </SafeAreaView>
  );
}

// ============ Styles ============
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fdf8f3',
  },
  container: {
    flex: 1,
    backgroundColor: '#fdf8f3',
  },
  headerCard: {
    backgroundColor: '#FF7722',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 50,
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
    color: '#1f2937',
  },
  statLabel: {
    fontFamily: Fonts.Regular,
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
    color: '#f59e0b',
  },
  donationStatLabel: {
    fontFamily: Fonts.Regular,
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
    color: '#1f2937',
    flex: 1,
  },
  sectionSubtitle: {
    fontFamily: Fonts.Regular,
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
    color: '#92400e',
  },
  editButtonSmall: {
    padding: 2,
  },
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
    color: '#f59e0b',
  },
  promotionName: {
    fontFamily: Fonts.SemiBold,
    color: '#1f2937',
  },
  promotionDetails: {
    fontFamily: Fonts.Regular,
    color: '#6b7280',
  },
  promotionDonations: {
    fontFamily: Fonts.Regular,
    color: '#f59e0b',
    marginTop: 2,
  },
  promotionProgressContainer: {
    alignItems: 'flex-end',
  },
  promotionProgressText: {
    fontFamily: Fonts.Bold,
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
    color: '#ffffff',
  },
  promotionRejectText: {
    fontFamily: Fonts.SemiBold,
    color: '#ef4444',
  },
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
    color: '#1f2937',
  },
  payoutType: {
    fontFamily: Fonts.Regular,
    color: '#6b7280',
  },
  payoutAmountContainer: {
    alignItems: 'flex-end',
  },
  payoutAmount: {
    fontFamily: Fonts.Bold,
    color: '#10b981',
  },
  donationAmount: {
    color: '#f59e0b',
  },
  payoutDate: {
    fontFamily: Fonts.Regular,
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
    color: '#FF7722',
    width: 30,
  },
  topEarnerInfo: {
    flex: 1,
  },
  topEarnerName: {
    fontFamily: Fonts.SemiBold,
    color: '#1f2937',
  },
  topEarnerLevel: {
    fontFamily: Fonts.Regular,
    color: '#6b7280',
  },
  topEarnerDonation: {
    fontFamily: Fonts.Regular,
    color: '#f59e0b',
    marginTop: 2,
  },
  topEarnerTotalDonations: {
    fontFamily: Fonts.Regular,
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
    color: '#6b7280',
  },
  settingValue: {
    fontFamily: Fonts.SemiBold,
    color: '#1f2937',
    marginTop: 2,
  },
  helperText: {
    fontFamily: Fonts.Regular,
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
    color: '#1f2937',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  emptyStateText: {
    fontFamily: Fonts.SemiBold,
    color: '#1f2937',
  },
  emptyStateSubtext: {
    fontFamily: Fonts.Regular,
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
    color: '#9ca3af',
  },
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
    color: '#1f2937',
  },
  confirmModalBody: {
    alignItems: 'center',
    marginBottom: 24,
  },
  confirmModalText: {
    fontFamily: Fonts.Regular,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmModalLevel: {
    fontFamily: Fonts.Bold,
    color: '#f59e0b',
    marginVertical: 8,
  },
  confirmModalSubtext: {
    fontFamily: Fonts.Regular,
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
    color: '#6b7280',
  },
  confirmModalApproveText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
  },
  versionContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  versionText: {
    fontFamily: Fonts.Regular,
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
    color: '#1f2937',
    marginBottom: 4,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
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
    color: '#6b7280',
  },
  payoutSummaryValue: {
    fontFamily: Fonts.Bold,
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
    color: '#1f2937',
  },
  memberInfoLevel: {
    fontFamily: Fonts.Regular,
    color: '#6b7280',
    marginTop: 2,
  },
  memberInfoEarned: {
    fontFamily: Fonts.SemiBold,
    color: '#10b981',
    marginTop: 4,
  },
  memberInfoDonation: {
    fontFamily: Fonts.SemiBold,
    color: '#f59e0b',
    marginTop: 2,
  },
  memberInfoTotalDonations: {
    fontFamily: Fonts.SemiBold,
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
  },
});