import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal, ActivityIndicator, Dimensions, RefreshControl, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '../../config/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Fonts } from '../../config/fonts';

const screenWidth = Dimensions.get('window').width;
const FILTERS = ['All', 'Donation', 'Commission'];

export default function FinancesManagement({ navigation }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [commissionModalVisible, setCommissionModalVisible] = useState(false);
  const [workingMembers, setWorkingMembers] = useState([]);
  const [donationModalVisible, setDonationModalVisible] = useState(false);
  const [commissionData, setCommissionData] = useState({
    memberId: '',
    memberName: '',
    amount: '',
    description: '',
    period: 'monthly',
    status: 'pending'
  });
  const [donationData, setDonationData] = useState({
    donorName: '',
    donorEmail: '',
    amount: '',
    phone: '',
    purpose: '',
    paymentMethod: 'razorpay',
    status: 'completed'
  });
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalCommission: 0,
    totalDonors: 0,
    pendingCommission: 0,
    monthlyDonations: [],
    monthlyCommission: [],
    donationData: [],
    commissionData: [],
    topDonors: []
  });

  useEffect(() => {
    setupRealtimeListener();
    fetchWorkingMembers();
  }, []);

  const setupRealtimeListener = () => {
  const qDonations = query(collection(db, 'donations'), orderBy('createdAt', 'desc'));
  const unsubscribeDonations = onSnapshot(qDonations, (snapshot) => {
    const donationsList = [];
    let totalDonations = 0;
    let totalDonors = 0;
    const donorSet = new Set();

    snapshot.forEach((doc) => {
      const data = doc.data();
      const donation = { id: doc.id, ...data, type: 'donation' };
      donationsList.push(donation);
      totalDonations += data.amount || 0;
      if (data.donorEmail || data.donorName) {
        donorSet.add(data.donorEmail || data.donorName);
      }
    });
    totalDonors = donorSet.size;

    const monthlyDonations = new Array(12).fill(0);
    donationsList.forEach(t => {
      if (t.createdAt) {
        const month = new Date(t.createdAt).getMonth();
        monthlyDonations[month] += t.amount || 0;
      }
    });

    const donorMap = {};
    donationsList.forEach(d => {
      const key = d.donorEmail || d.donorName || 'Anonymous';
      if (!donorMap[key]) donorMap[key] = 0;
      donorMap[key] += d.amount || 0;
    });
    const topDonors = Object.entries(donorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    setStats(prev => ({
      ...prev,
      totalDonations: totalDonations,
      totalDonors: totalDonors,
      monthlyDonations: monthlyDonations,
      donationData: donationsList,
      topDonors: topDonors
    }));

    // Use a separate variable for the all transactions
    setStats(prevStats => {
      const allTransactions = [...donationsList, ...prevStats.commissionData];
      setTransactions(allTransactions);
      applyFilters(allTransactions, searchQuery, filterType);
      setLoading(false);
      return prevStats;
    });
  });

  const qCommissions = query(collection(db, 'commissions'), orderBy('createdAt', 'desc'));
  const unsubscribeCommissions = onSnapshot(qCommissions, (snapshot) => {
    const commissionsList = [];
    let totalCommission = 0;
    let pendingCommission = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const commission = { id: doc.id, ...data, type: 'commission' };
      commissionsList.push(commission);
      totalCommission += data.amount || 0;
      if (data.status === 'pending') {
        pendingCommission += data.amount || 0;
      }
    });

    const monthlyCommission = new Array(12).fill(0);
    commissionsList.forEach(t => {
      if (t.createdAt) {
        const month = new Date(t.createdAt).getMonth();
        monthlyCommission[month] += t.amount || 0;
      }
    });

    setStats(prev => ({
      ...prev,
      totalCommission: totalCommission,
      pendingCommission: pendingCommission,
      monthlyCommission: monthlyCommission,
      commissionData: commissionsList
    }));

    // Use a separate variable for the all transactions
    setStats(prevStats => {
      const allTransactions = [...prevStats.donationData, ...commissionsList];
      setTransactions(allTransactions);
      applyFilters(allTransactions, searchQuery, filterType);
      return prevStats;
    });
  });

  return () => {
    unsubscribeDonations();
    unsubscribeCommissions();
  };
};

  const applyFilters = (data, searchText, filter) => {
    let filtered = data;

    if (searchText) {
      filtered = filtered.filter(t =>
        t.donorName?.toLowerCase().includes(searchText.toLowerCase()) ||
        t.memberName?.toLowerCase().includes(searchText.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchText.toLowerCase()) ||
        t.purpose?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (filter === 'Donation') {
      filtered = filtered.filter(t => t.type === 'donation');
    } else if (filter === 'Commission') {
      filtered = filtered.filter(t => t.type === 'commission');
    }

    setFilteredTransactions(filtered);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFilters(transactions, text, filterType);
  };

  const handleFilterPress = (filter) => {
    setFilterType(filter);
    applyFilters(transactions, searchQuery, filter);
  };

  const fetchWorkingMembers = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'workingMember'));
      const snapshot = await getDocs(q);
      const members = [];
      snapshot.forEach((doc) => {
        members.push({ id: doc.id, ...doc.data() });
      });
      setWorkingMembers(members);
    } catch (error) {
      console.error('Error fetching working members:', error);
    }
  };

  const handleAddDonation = async () => {
    if (!donationData.donorName || !donationData.amount) {
      Alert.alert('Error', 'Please fill donor name and amount');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'donations'), {
        donorName: donationData.donorName,
        donorEmail: donationData.donorEmail || '',
        amount: parseFloat(donationData.amount),
        phone: donationData.phone || '',
        purpose: donationData.purpose || 'General Donation',
        paymentMethod: donationData.paymentMethod || 'razorpay',
        status: donationData.status || 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      Alert.alert('Success', 'Donation added successfully');
      setDonationModalVisible(false);
      resetDonationForm();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCommissionPayment = async () => {
    if (!commissionData.memberId || !commissionData.amount) {
      Alert.alert('Error', 'Please select a member and enter amount');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'commissions'), {
        memberId: commissionData.memberId,
        memberName: commissionData.memberName,
        amount: parseFloat(commissionData.amount),
        description: commissionData.description || 'Commission payment',
        period: commissionData.period || 'monthly',
        status: commissionData.status || 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      Alert.alert('Success', `₹${commissionData.amount} Commission added for ${commissionData.memberName}`);
      setCommissionModalVisible(false);
      resetCommissionForm();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetDonationForm = () => {
    setDonationData({
      donorName: '',
      donorEmail: '',
      amount: '',
      phone: '',
      purpose: '',
      paymentMethod: 'razorpay',
      status: 'completed'
    });
  };

  const resetCommissionForm = () => {
    setCommissionData({
      memberId: '',
      memberName: '',
      amount: '',
      description: '',
      period: 'monthly',
      status: 'pending'
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getFilterCount = (filter) => {
    if (filter === 'All') return transactions.length;
    return transactions.filter(t => t.type === filter.toLowerCase()).length;
  };

  const formatCurrency = (amount) => {
    return '₹' + amount.toLocaleString('en-IN');
  };

  const StatCard = ({ label, count, icon, color, active, onPress }) => (
    <TouchableOpacity 
      style={[styles.statCard, active && styles.statCardActive]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.statIconCircle, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statType} numberOfLines={1}>{label}</Text>
      <Text style={[styles.statCount, { color }]}>{count}</Text>
    </TouchableOpacity>
  );

  const TransactionCard = ({ transaction }) => {
    const isDonation = transaction.type === 'donation';
    const color = isDonation ? '#FF7722' : '#f97316';
    const icon = isDonation ? 'volunteer-activism' : 'attach-money';
    const name = isDonation ? transaction.donorName : transaction.memberName;
    const purpose = isDonation ? transaction.purpose : transaction.description;
    
    return (
      <View style={[styles.transactionCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
        <View style={styles.transactionHeader}>
          <View style={[styles.transactionIconContainer, { backgroundColor: color + '15' }]}>
            <MaterialIcons name={icon} size={18} color={color} />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionCategory}>{isDonation ? 'Donation' : 'Commission'}</Text>
            <Text style={styles.transactionName} numberOfLines={1}>{name || 'Anonymous'}</Text>
            {purpose && <Text style={styles.transactionDescription} numberOfLines={1}>{purpose}</Text>}
          </View>
          <Text style={[styles.transactionAmount, { color }]}>
            {formatCurrency(transaction.amount)}
          </Text>
        </View>
        <View style={styles.transactionFooter}>
          <Text style={styles.transactionDate}>
            {transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : 'N/A'}
          </Text>
          <View style={[styles.transactionStatusBadge, {
            backgroundColor: transaction.status === 'completed' ? '#10b981' :
                            transaction.status === 'pending' ? '#f59e0b' : '#ef4444'
          }]}>
            <Text style={styles.transactionStatusText}>{transaction.status || 'completed'}</Text>
          </View>
        </View>
      </View>
    );
  };

  // Fix: Add SafeAreaView wrapper or ensure navigation is properly passed
  return (
    <View style={styles.container}>
      {/* Saffron Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Finances</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={[styles.addButton, styles.commissionButton]} 
              onPress={() => {
                fetchWorkingMembers();
                setCommissionModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="attach-money" size={16} color="#ffffff" />
              <Text style={styles.addButtonText}>Commission</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs inside header */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]} 
            onPress={() => setActiveTab('overview')}
            activeOpacity={0.7}
          >
            <MaterialIcons name="dashboard" size={16} color={activeTab === 'overview' ? '#ffffff' : 'rgba(255,255,255,0.7)'} />
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'transactions' && styles.activeTab]} 
            onPress={() => setActiveTab('transactions')}
            activeOpacity={0.7}
          >
            <MaterialIcons name="list" size={16} color={activeTab === 'transactions' ? '#ffffff' : 'rgba(255,255,255,0.7)'} />
            <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>Transactions</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'reports' && styles.activeTab]} 
            onPress={() => setActiveTab('reports')}
            activeOpacity={0.7}
          >
            <MaterialIcons name="assessment" size={16} color={activeTab === 'reports' ? '#ffffff' : 'rgba(255,255,255,0.7)'} />
            <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>Reports</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar inside header - only for Transactions tab */}
        {activeTab === 'transactions' && (
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={18} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search transactions..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={handleSearch}
              textAlignVertical="center"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <MaterialIcons name="close" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Stat Cards inside header - only for Transactions tab */}
        {activeTab === 'transactions' && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.statsContainer}
            contentContainerStyle={styles.statsContent}
          >
            <StatCard 
              label="Total" 
              count={transactions.length} 
              icon="list" 
              color="#ffffff" 
              active={filterType === 'All'}
              onPress={() => handleFilterPress('All')}
            />
            <StatCard 
              label="Donations" 
              count={transactions.filter(t => t.type === 'donation').length} 
              icon="volunteer-activism" 
              color="#ffffff"
              active={filterType === 'Donation'}
              onPress={() => handleFilterPress('Donation')}
            />
            <StatCard 
              label="Commissions" 
              count={transactions.filter(t => t.type === 'commission').length} 
              icon="attach-money" 
              color="#ffffff"
              active={filterType === 'Commission'}
              onPress={() => handleFilterPress('Commission')}
            />
          </ScrollView>
        )}
      </View>

      {/* Content Area */}
      {activeTab === 'overview' && (
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF7722']} />}
        >
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, styles.donationCard]}>
              <Text style={styles.summaryLabel}>Total Donations</Text>
              <Text style={styles.summaryValue}>{formatCurrency(stats.totalDonations)}</Text>
              <MaterialIcons name="volunteer-activism" size={18} color="#FF7722" style={styles.cardIcon} />
            </View>
            <View style={[styles.summaryCard, styles.commissionCard]}>
              <Text style={styles.summaryLabel}>Total Commission</Text>
              <Text style={styles.summaryValue}>{formatCurrency(stats.totalCommission)}</Text>
              <MaterialIcons name="attach-money" size={18} color="#f97316" style={styles.cardIcon} />
            </View>
            <View style={[styles.summaryCard, styles.donorCard]}>
              <Text style={styles.summaryLabel}>Total Donors</Text>
              <Text style={styles.summaryValue}>{stats.totalDonors}</Text>
              <MaterialIcons name="people" size={18} color="#8b5cf6" style={styles.cardIcon} />
            </View>
            <View style={[styles.summaryCard, styles.pendingCard]}>
              <Text style={styles.summaryLabel}>Pending Commission</Text>
              <Text style={styles.summaryValue}>{formatCurrency(stats.pendingCommission)}</Text>
              <MaterialIcons name="pending" size={18} color="#f59e0b" style={styles.cardIcon} />
            </View>
          </View>

          {/* Donations Chart - Line Chart */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Monthly Donations</Text>
            <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <LineChart
                data={{
                  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                  datasets: [{ 
                    data: stats.monthlyDonations,
                    color: (opacity = 1) => `rgba(255, 119, 34, ${opacity})`,
                    strokeWidth: 3
                  }]
                }}
                width={Math.min(screenWidth - 40, 320)}
                height={200}
                yAxisLabel="₹"
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(255, 119, 34, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  style: { borderRadius: 12 },
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                    stroke: '#FF7722'
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: '5, 5',
                    stroke: 'rgba(107, 114, 128, 0.2)'
                  }
                }}
                bezier
                style={{
                  borderRadius: 8,
                  marginLeft: -30,
                }}
                formatYLabel={(value) => `₹${Math.round(value)}`}
              />
            </View>
          </View>

          {/* Top Donors */}
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableTitle}>Top Donors</Text>
              <Text style={styles.tableSubtitle}>Highest contributing donors</Text>
            </View>
            {stats.topDonors.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No donors yet</Text>
              </View>
            ) : (
              stats.topDonors.map((donor, index) => (
                <View key={index} style={styles.donorItem}>
                  <View style={styles.donorRank}>
                    <Text style={styles.donorRankText}>#{index + 1}</Text>
                  </View>
                  <Text style={styles.donorName} numberOfLines={1}>{donor.name}</Text>
                  <Text style={styles.donorAmount}>{formatCurrency(donor.amount)}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TransactionCard transaction={item} />}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF7722']} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="receipt" size={44} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No transactions</Text>
              <Text style={styles.emptyStateSubtext}>Add a donation or commission</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF7722']} />}
        >
          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>Financial Summary Report</Text>
            
            <View style={styles.reportItem}>
              <Text style={styles.reportLabel}>Total Donations</Text>
              <Text style={styles.reportValueIncome}>{formatCurrency(stats.totalDonations)}</Text>
            </View>
            
            <View style={styles.reportItem}>
              <Text style={styles.reportLabel}>Total Commission</Text>
              <Text style={styles.reportValueExpense}>{formatCurrency(stats.totalCommission)}</Text>
            </View>
            
            <View style={styles.reportItem}>
              <Text style={styles.reportLabel}>Net Balance</Text>
              <Text style={[styles.reportValue, { color: stats.totalDonations >= stats.totalCommission ? '#10b981' : '#ef4444' }]}>
                {formatCurrency(stats.totalDonations - stats.totalCommission)}
              </Text>
            </View>

            <View style={styles.reportDivider} />

            <View style={styles.reportItem}>
              <Text style={styles.reportLabel}>Total Donors</Text>
              <Text style={styles.reportValue}>{stats.totalDonors}</Text>
            </View>

            <View style={styles.reportItem}>
              <Text style={styles.reportLabel}>Pending Commission</Text>
              <Text style={styles.reportValue}>{formatCurrency(stats.pendingCommission)}</Text>
            </View>

            <View style={styles.reportDivider} />

            <Text style={styles.reportSectionTitle}>Top Donors</Text>
            {stats.topDonors.length === 0 ? (
              <Text style={styles.emptyText}>No donors yet</Text>
            ) : (
              stats.topDonors.map((donor, index) => (
                <View key={index} style={styles.reportCategoryItem}>
                  <View style={styles.reportCategoryInfo}>
                    <Text style={styles.reportCategoryName}>{index + 1}. {donor.name}</Text>
                  </View>
                  <Text style={styles.reportCategoryAmount}>{formatCurrency(donor.amount)}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Add Donation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={donationModalVisible}
        onRequestClose={() => setDonationModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Donation</Text>
              <TouchableOpacity onPress={() => setDonationModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Donor Name *</Text>
              <TextInput
                style={styles.formInput}
                value={donationData.donorName}
                onChangeText={(text) => setDonationData({...donationData, donorName: text})}
                placeholder="Enter donor name"
                textAlignVertical="center"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Donor Email</Text>
              <TextInput
                style={styles.formInput}
                value={donationData.donorEmail}
                onChangeText={(text) => setDonationData({...donationData, donorEmail: text})}
                placeholder="Enter donor email"
                keyboardType="email-address"
                textAlignVertical="center"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Phone</Text>
              <TextInput
                style={styles.formInput}
                value={donationData.phone}
                onChangeText={(text) => setDonationData({...donationData, phone: text})}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                textAlignVertical="center"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Amount *</Text>
              <TextInput
                style={styles.formInput}
                value={donationData.amount}
                onChangeText={(text) => setDonationData({...donationData, amount: text})}
                placeholder="Enter amount"
                keyboardType="numeric"
                textAlignVertical="center"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Purpose</Text>
              <TextInput
                style={styles.formInput}
                value={donationData.purpose}
                onChangeText={(text) => setDonationData({...donationData, purpose: text})}
                placeholder="Enter purpose (e.g., Education, Medical)"
                textAlignVertical="center"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Payment Method</Text>
              <View style={styles.paymentGrid}>
                {['razorpay', 'cash', 'bank', 'upi', 'card'].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[styles.paymentButton, donationData.paymentMethod === method && styles.paymentButtonActive]}
                    onPress={() => setDonationData({...donationData, paymentMethod: method})}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.paymentButtonText, donationData.paymentMethod === method && styles.paymentButtonTextActive]}>
                      {method.charAt(0).toUpperCase() + method.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Status</Text>
              <View style={styles.statusToggle}>
                {['completed', 'pending', 'failed'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statusButton, donationData.status === status && styles.statusButtonActive]}
                    onPress={() => setDonationData({...donationData, status: status})}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.statusButtonText, donationData.status === status && styles.statusButtonTextActive]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleAddDonation} disabled={loading} activeOpacity={0.7}>
              <Text style={styles.submitButtonText}>
                {loading ? 'Saving...' : 'Add Donation'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Commission Payment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={commissionModalVisible}
        onRequestClose={() => setCommissionModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Commission</Text>
              <TouchableOpacity onPress={() => setCommissionModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Select Working Member *</Text>
              <View style={styles.memberList}>
                {workingMembers.length === 0 ? (
                  <Text style={styles.noMembersText}>No working members found</Text>
                ) : (
                  workingMembers.map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      style={[styles.memberItem, commissionData.memberId === member.id && styles.memberItemActive]}
                      onPress={() => {
                        setCommissionData({
                          ...commissionData,
                          memberId: member.id,
                          memberName: member.fullName || member.email || 'Unknown'
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.memberItemText, commissionData.memberId === member.id && styles.memberItemTextActive]}>
                        {member.fullName || member.email || 'Unknown'}
                      </Text>
                      {commissionData.memberId === member.id && (
                        <MaterialIcons name="check" size={16} color="#10b981" />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>

            {commissionData.memberId && (
              <>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Amount *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={commissionData.amount}
                    onChangeText={(text) => setCommissionData({...commissionData, amount: text})}
                    placeholder="Enter commission amount"
                    keyboardType="numeric"
                    textAlignVertical="center"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    style={[styles.formInput, styles.formTextArea]}
                    value={commissionData.description}
                    onChangeText={(text) => setCommissionData({...commissionData, description: text})}
                    placeholder="Enter description"
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Period</Text>
                  <View style={styles.periodToggle}>
                    {['monthly', 'quarterly', 'yearly', 'one-time'].map((period) => (
                      <TouchableOpacity
                        key={period}
                        style={[styles.periodButton, commissionData.period === period && styles.periodButtonActive]}
                        onPress={() => setCommissionData({...commissionData, period: period})}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.periodButtonText, commissionData.period === period && styles.periodButtonTextActive]}>
                          {period.charAt(0).toUpperCase() + period.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Status</Text>
                  <View style={styles.statusToggle}>
                    {['pending', 'paid', 'cancelled'].map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[styles.statusButton, commissionData.status === status && styles.statusButtonActive]}
                        onPress={() => setCommissionData({...commissionData, status: status})}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.statusButtonText, commissionData.status === status && styles.statusButtonTextActive]}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity style={styles.submitButton} onPress={handleCommissionPayment} disabled={loading} activeOpacity={0.7}>
                  <Text style={styles.submitButtonText}>
                    {loading ? 'Processing...' : 'Add Commission'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf8f3',
  },

  // Saffron Header
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
    marginBottom: 12,
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
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  commissionButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  addButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Tabs inside header
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  activeTabText: {
    color: '#ffffff',
  },

  // Search inside header
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Stats inside header
  statsContainer: {
    maxHeight: 65,
  },
  statsContent: {
    gap: 8,
    alignItems: 'center',
    paddingVertical: 2,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 6,
    minWidth: 70,
    width: 75,
    alignItems: 'center',
    justifyContent: 'center',
    height: 58,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statCardActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderColor: '#ffffff',
  },
  statIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  statType: {
    fontFamily: Fonts.Regular,
    fontSize: 8,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statCount: {
    fontFamily: Fonts.Bold,
    fontSize: 13,
    color: '#ffffff',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Summary
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  summaryLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  summaryValue: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  cardIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
  },

  // Chart
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chartTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#1f2937',
    marginBottom: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Table
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  tableHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  tableSubtitle: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  donorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  donorRank: {
    width: 30,
  },
  donorRankText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  donorName: {
    fontFamily: Fonts.SemiBold,
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  donorAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
    color: '#10b981',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Transactions
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 4,
  },
  transactionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIconContainer: {
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
  transactionCategory: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  transactionName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  transactionDescription: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  transactionAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  transactionDate: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  transactionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  transactionStatusText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 10,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
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
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  emptyText: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
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
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  formField: {
    marginBottom: 12,
  },
  formLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f9fafb',
    fontFamily: Fonts.Regular,
    includeFontPadding: false,
  },
  formTextArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  statusToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#FF7722',
    borderColor: '#FF7722',
  },
  statusButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statusButtonTextActive: {
    color: '#ffffff',
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  paymentButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  paymentButtonActive: {
    backgroundColor: '#FF7722',
    borderColor: '#FF7722',
  },
  paymentButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  paymentButtonTextActive: {
    color: '#ffffff',
  },
  memberList: {
    maxHeight: 200,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  memberItemActive: {
    backgroundColor: '#FFF5EB',
    borderRadius: 6,
  },
  memberItemText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  memberItemTextActive: {
    color: '#FF7722',
  },
  noMembersText: {
    textAlign: 'center',
    color: '#6b7280',
    paddingVertical: 20,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  periodToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  periodButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  periodButtonTextActive: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Reports
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reportTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
    marginBottom: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  reportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  reportLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  reportValue: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  reportValueIncome: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
    color: '#FF7722',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  reportValueExpense: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
    color: '#f97316',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  reportDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 8,
  },
  reportSectionTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  reportCategoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  reportCategoryInfo: {
    flex: 1,
  },
  reportCategoryName: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  reportCategoryAmount: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});