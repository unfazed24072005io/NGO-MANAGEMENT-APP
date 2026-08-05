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
  runTransaction,
  Timestamp,
  increment
} from 'firebase/firestore';
import { Fonts } from '../../config/fonts';
import { CommissionService } from '../../services/CommissionService';
import { WalletService } from '../../services/WalletService';
import { getLevelDetails, LEVELS } from '../../config/commissionLevels';

const { width } = Dimensions.get('window');

export default function CommissionManagement({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [commissionData, setCommissionData] = useState(null);
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [payoutModalVisible, setPayoutModalVisible] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNote, setPayoutNote] = useState('');
  const [stats, setStats] = useState({
    totalWorkingMembers: 0,
    totalCommissionPaid: 0,
    pendingCommission: 0,
    totalPayoutsThisMonth: 0,
    topEarners: []
  });
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [levelModalVisible, setLevelModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [selectedWorkingMember, setSelectedWorkingMember] = useState(null);
  const [memberPayoutModalVisible, setMemberPayoutModalVisible] = useState(false);
  const [memberPayoutAmount, setMemberPayoutAmount] = useState('');
  const [editingLevelIndex, setEditingLevelIndex] = useState(null);
  
  const [formData, setFormData] = useState({
    levels: [
      { 
        id: 'I', 
        name: 'Customer', 
        directCommission: 25, 
        secondaryCommission: 0, 
        minMembers: 0, 
        maxMembers: 4,
        membersRequiredForPromotion: 5
      },
      { 
        id: 'II', 
        name: 'Executive', 
        directCommission: 35, 
        secondaryCommission: 10, 
        minMembers: 5, 
        maxMembers: 9,
        membersRequiredForPromotion: 10
      },
      { 
        id: 'III', 
        name: 'Manager', 
        directCommission: 40, 
        secondaryCommission: 5, 
        minMembers: 10, 
        maxMembers: 24,
        membersRequiredForPromotion: 25
      },
      { 
        id: 'IV', 
        name: 'Coordinator', 
        directCommission: 42.5, 
        secondaryCommission: 2.5, 
        minMembers: 25, 
        maxMembers: 49,
        membersRequiredForPromotion: 50
      },
      { 
        id: 'V', 
        name: 'Guide', 
        directCommission: 43.75, 
        secondaryCommission: 1.25, 
        minMembers: 50, 
        maxMembers: 99,
        membersRequiredForPromotion: 100
      },
      { 
        id: 'VI', 
        name: 'Leader', 
        directCommission: 44.5, 
        secondaryCommission: 0.75, 
        minMembers: 100, 
        maxMembers: 199,
        membersRequiredForPromotion: 200
      },
      { 
        id: 'VII', 
        name: 'Crown', 
        directCommission: 45, 
        secondaryCommission: 0.50, 
        minMembers: 200, 
        maxMembers: Infinity,
        membersRequiredForPromotion: Infinity
      }
    ],
    registrationFee: 1000,
    minWithdrawal: 100,
    maxWithdrawal: 100000,
    autoPromotionEnabled: true,
    promotionNotificationEnabled: true,
    autoPayoutEnabled: false,
    payoutThreshold: 500,
    lastUpdated: null
  });

  useEffect(() => {
    fetchCommissionData();
    fetchStats();
    setupPendingPayoutsListener();
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
      const usersQuery = query(collection(db, 'users'), where('role', '==', 'workingMember'));
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
    let parsedValue = value;
    if (field === 'directCommission' || field === 'secondaryCommission') {
      parsedValue = parseFloat(value) || 0;
    } else if (field === 'minMembers' || field === 'maxMembers' || field === 'membersRequiredForPromotion') {
      if (value === '∞' || value === '') {
        parsedValue = Infinity;
      } else {
        parsedValue = parseInt(value) || 0;
      }
    }
    setSelectedLevel({ ...selectedLevel, [field]: parsedValue });
  };

  const saveLevelChanges = () => {
    if (!selectedLevel || editingLevelIndex === null) return;
    
    const newLevels = [...formData.levels];
    newLevels[editingLevelIndex] = selectedLevel;
    setFormData({ ...formData, levels: newLevels });
    setLevelModalVisible(false);
    setEditingLevelIndex(null);
    Alert.alert('Success', 'Level updated successfully');
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

  const PayoutCard = ({ item }) => {
    const [userName, setUserName] = useState('Loading...');
    
    useEffect(() => {
      const fetchUser = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', item.userId));
          if (userDoc.exists()) {
            setUserName(userDoc.data().name || 'Unknown');
          }
        } catch (error) {
          console.error('Error fetching user:', error);
        }
      };
      fetchUser();
    }, [item.userId]);

    const isDirect = item.type === 'direct_commission';

    return (
      <View style={styles.payoutCard}>
        <View style={styles.payoutHeader}>
          <View style={styles.payoutUser}>
            <View style={[styles.payoutIcon, { backgroundColor: isDirect ? '#8b5cf615' : '#10b98115' }]}>
              <MaterialIcons 
                name={isDirect ? 'person-add' : 'share'} 
                size={18} 
                color={isDirect ? '#8b5cf6' : '#10b981'} 
              />
            </View>
            <View>
              <Text style={styles.payoutUserName}>{userName}</Text>
              <Text style={styles.payoutType}>{isDirect ? 'Direct Commission' : 'Secondary Commission'}</Text>
            </View>
          </View>
          <View style={styles.payoutAmountContainer}>
            <Text style={styles.payoutAmount}>₹{item.amount?.toLocaleString() || 0}</Text>
            <Text style={styles.payoutDate}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.payoutButton}
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
        <Text style={styles.topEarnerLevel}>Level {item.level || 'I'} • {item.directReferrals || 0} members</Text>
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

  // ============ Edit Modals ============
  const LevelEditModal = () => {
    if (!selectedLevel) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={levelModalVisible}
        onRequestClose={() => setLevelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Level: {selectedLevel.id}</Text>
              <TouchableOpacity onPress={() => setLevelModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Level Name</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={selectedLevel.name}
                    onChangeText={(text) => updateLevelField('name', text)}
                    placeholder="Enter level name"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Direct Commission (%)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={String(selectedLevel.directCommission)}
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
                    value={String(selectedLevel.secondaryCommission)}
                    onChangeText={(text) => updateLevelField('secondaryCommission', text)}
                    keyboardType="numeric"
                    placeholder="Enter secondary commission"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Min Members</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={String(selectedLevel.minMembers)}
                    onChangeText={(text) => updateLevelField('minMembers', text)}
                    keyboardType="numeric"
                    placeholder="Enter min members"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Max Members</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={String(selectedLevel.maxMembers === Infinity ? '∞' : selectedLevel.maxMembers)}
                    onChangeText={(text) => updateLevelField('maxMembers', text)}
                    placeholder="Enter max members (∞ for unlimited)"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Members Required for Promotion</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={String(selectedLevel.membersRequiredForPromotion === Infinity ? '∞' : selectedLevel.membersRequiredForPromotion)}
                    onChangeText={(text) => updateLevelField('membersRequiredForPromotion', text)}
                    placeholder="Enter members required (∞ for no promotion)"
                    placeholderTextColor="#9ca3af"
                  />
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

        {/* Membership Levels Table - EDITABLE */}
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
            <Text style={[styles.tableHeaderText, styles.membersCol]}>Promotion</Text>
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
              <Text style={[styles.tableCell, styles.membersCol]}>
                {level.membersRequiredForPromotion === Infinity ? '∞' : level.membersRequiredForPromotion}
              </Text>
              <View style={styles.editIconContainer}>
                <MaterialIcons name="edit" size={16} color="#FF7722" />
              </View>
            </TouchableOpacity>
          ))}

          <View style={styles.editHint}>
            <MaterialIcons name="tap" size={16} color="#FF7722" />
            <Text style={styles.editHintText}>Tap any level to edit</Text>
          </View>
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
              <Text style={styles.settingLabel}>Payout Threshold</Text>
              <Text style={styles.settingValue}>₹{formData.payoutThreshold}</Text>
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

  // Header
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

  // Stats
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

  // Card
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

  // Table
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
    width: '26%',
  },
  percentageCol: {
    width: '16%',
    alignItems: 'flex-end',
  },
  membersCol: {
    width: '22%',
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
  editIconContainer: {
    width: '8%',
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

  // Payout Cards
  payoutCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  payoutButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#ffffff',
  },

  // Top Earners
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

  // Settings
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

  // Empty State
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

  // Update Info
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

  versionContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  versionText: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#9ca3af',
  },

  // Modal
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

  // Payout Summary
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

  // Member Info
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

  // Level Edit
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

  // Switches
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

  // Save Button
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