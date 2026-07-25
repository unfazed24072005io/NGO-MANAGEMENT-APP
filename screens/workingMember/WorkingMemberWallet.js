import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, FlatList, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function WorkingMemberWallet({ navigation }) {
  const [walletData, setWalletData] = useState({
    balance: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    pendingWithdrawals: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    setupRealtimeListener();
    fetchWalletData();
  }, []);

  const setupRealtimeListener = () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    // Listen for wallet transactions
    const q = query(
      collection(db, 'walletTransactions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactionsList = [];
      let balance = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        transactionsList.push({ id: doc.id, ...data });
        if (data.type === 'credit' && data.status === 'completed') {
          balance += data.amount || 0;
        } else if (data.type === 'debit' && data.status === 'completed') {
          balance -= data.amount || 0;
        }
      });
      
      setTransactions(transactionsList);
      setWalletData(prev => ({ ...prev, balance }));
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const fetchWalletData = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Fetch wallet summary
      const walletRef = doc(db, 'wallets', userId);
      const walletSnap = await getDoc(walletRef);
      
      if (walletSnap.exists()) {
        const data = walletSnap.data();
        setWalletData(prev => ({
          ...prev,
          totalDeposited: data.totalDeposited || 0,
          totalWithdrawn: data.totalWithdrawn || 0,
          pendingWithdrawals: data.pendingWithdrawals || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(withdrawAmount) || parseFloat(withdrawAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (parseFloat(withdrawAmount) > walletData.balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    if (!upiId) {
      Alert.alert('Error', 'Please enter your UPI ID');
      return;
    }

    setLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      const userEmail = auth.currentUser?.email;

      // Create withdrawal request
      await addDoc(collection(db, 'withdrawalRequests'), {
        userId: userId,
        userEmail: userEmail,
        amount: parseFloat(withdrawAmount),
        upiId: upiId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Update wallet pending withdrawals
      await updateDoc(doc(db, 'wallets', userId), {
        pendingWithdrawals: (walletData.pendingWithdrawals || 0) + parseFloat(withdrawAmount)
      });

      Alert.alert(
        'Withdrawal Requested',
        `Your withdrawal request of ₹${parseFloat(withdrawAmount).toLocaleString()} has been submitted. It will be processed within 24-48 hours.`,
        [
          { text: 'OK', onPress: () => {
            setWithdrawModalVisible(false);
            setWithdrawAmount('');
            setUpiId('');
          }}
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
    setRefreshing(false);
  };

  const getTransactionTypeColor = (type) => {
    return type === 'credit' ? '#10b981' : '#ef4444';
  };

  const getTransactionIcon = (type) => {
    return type === 'credit' ? 'arrow-downward' : 'arrow-upward';
  };

  const StatCard = ({ label, value, icon, color }) => (
    <View style={[styles.statCard, { backgroundColor: color + '10' }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <MaterialIcons name={icon} size={22} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color }]}>₹{value.toLocaleString()}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  const TransactionItem = ({ item }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View style={[styles.transactionIcon, { backgroundColor: getTransactionTypeColor(item.type) + '15' }]}>
          <MaterialIcons name={getTransactionIcon(item.type)} size={16} color={getTransactionTypeColor(item.type)} />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionTitle}>{item.title || item.type || 'Transaction'}</Text>
          <Text style={styles.transactionDescription}>{item.description || 'No description'}</Text>
          <Text style={styles.transactionDate}>
            {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}
          </Text>
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[
          styles.transactionAmount,
          { color: item.type === 'credit' ? '#10b981' : '#ef4444' }
        ]}>
          {item.type === 'credit' ? '+' : '-'}₹{item.amount?.toLocaleString() || 0}
        </Text>
        <View style={[styles.transactionStatus, { backgroundColor: item.status === 'completed' ? '#10b981' : '#f59e0b' }]}>
          <Text style={styles.transactionStatusText}>{item.status || 'pending'}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Wallet</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <MaterialIcons name="refresh" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>₹{walletData.balance.toLocaleString()}</Text>
        <TouchableOpacity 
          style={styles.withdrawButton}
          onPress={() => setWithdrawModalVisible(true)}
          disabled={walletData.balance <= 0}
        >
          <MaterialIcons name="payment" size={20} color="#ffffff" />
          <Text style={styles.withdrawButtonText}>Withdraw</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <StatCard 
          label="Total Deposited" 
          value={walletData.totalDeposited} 
          icon="arrow-downward" 
          color="#10b981" 
        />
        <StatCard 
          label="Total Withdrawn" 
          value={walletData.totalWithdrawn} 
          icon="arrow-upward" 
          color="#ef4444" 
        />
        <StatCard 
          label="Pending Withdrawals" 
          value={walletData.pendingWithdrawals} 
          icon="pending" 
          color="#f59e0b" 
        />
      </View>

      {/* Transaction History */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Transaction History</Text>
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TransactionItem item={item} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="history" size={36} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No transactions yet</Text>
            </View>
          }
          scrollEnabled={false}
        />
      </View>

      <View style={{ height: 20 }} />

      {/* Withdraw Modal - Would be implemented with a proper modal */}

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

            <View style={styles.modalBody}>
              <Text style={styles.modalBalance}>Available Balance: ₹{walletData.balance.toLocaleString()}</Text>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Amount (₹) *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>UPI ID *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="Enter UPI ID (e.g., name@upi)"
                />
              </View>

              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleWithdraw}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Request Withdrawal</Text>
                )}
              </TouchableOpacity>
            </View>
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

  // Blue Header
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 4 },
  headerTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: { padding: 4 },

  balanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  balanceLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
  },
  balanceAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 36,
    color: '#1f2937',
    marginVertical: 8,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  withdrawButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  statCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
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

  historySection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  historyTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 10,
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
    fontSize: 14,
    color: '#1f2937',
  },
  transactionDescription: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
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
    paddingVertical: 20,
    gap: 8,
  },
  emptyStateText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
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

  // Modal styles
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
  modalBalance: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    textAlign: 'center',
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
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
  },
});