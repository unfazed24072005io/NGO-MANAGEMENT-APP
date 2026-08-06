// screens/donation/MyDonations.js
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  RefreshControl, ActivityIndicator, Modal 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';
import { getDonationHistory } from '../../services/paymentService';

export default function MyDonations({ navigation }) {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    count: 0,
    totalRazorpay: 0,
    razorpayCount: 0,
  });

  useEffect(() => {
    setupRealtimeListener();
  }, []);

  const setupRealtimeListener = () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'donations'),
      where('donorId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const donationList = [];
      let total = 0;
      let razorpayTotal = 0;
      let razorpayCount = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const donation = { id: doc.id, ...data };
        donationList.push(donation);
        total += data.amount || 0;
        
        if (data.paymentMethod === 'razorpay') {
          razorpayTotal += data.amount || 0;
          razorpayCount++;
        }
      });

      // Also get from local Razorpay history
      const localHistory = getDonationHistory();
      const user = auth.currentUser;
      const localDonations = localHistory.filter(
        donation => donation.email === user?.email || donation.phone === user?.phoneNumber
      );

      // Merge and deduplicate
      const allDonations = [...donationList];
      localDonations.forEach(localDonation => {
        if (!allDonations.some(d => d.paymentId === localDonation.paymentId)) {
          allDonations.push({
            id: localDonation.paymentId,
            ...localDonation,
            paymentMethod: 'razorpay',
            status: 'completed',
            isLocal: true,
          });
          razorpayTotal += localDonation.amount || 0;
          razorpayCount++;
        }
      });

      setDonations(allDonations);
      setStats({
        total: total + localDonations.reduce((sum, d) => sum + d.amount, 0),
        count: allDonations.length,
        totalRazorpay: razorpayTotal,
        razorpayCount: razorpayCount,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'failed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return status || 'N/A';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const DonationItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.donationCard}
      onPress={() => {
        setSelectedDonation(item);
        setShowDetailModal(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.donationHeader}>
        <View style={[styles.donationIcon, { backgroundColor: '#10b98115' }]}>
          <MaterialIcons name="favorite" size={20} color="#10b981" />
        </View>
        <View style={styles.donationInfo}>
          <Text style={styles.donationPurpose}>
            {item.purpose || item.campaign || 'General Donation'}
          </Text>
          <Text style={styles.donationDate}>
            {formatDate(item.createdAt || item.timestamp)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>
      <View style={styles.donationFooter}>
        <View style={styles.amountSection}>
          <Text style={styles.donationAmount}>₹{item.amount?.toLocaleString() || 0}</Text>
          {item.paymentMethod === 'razorpay' && (
            <View style={styles.razorpayBadge}>
              <MaterialIcons name="security" size={12} color="#10b981" />
              <Text style={styles.razorpayBadgeText}>Razorpay</Text>
            </View>
          )}
        </View>
        <Text style={styles.transactionId}>
          {item.paymentId ? `ID: ${item.paymentId.slice(-8)}` : `ID: ${item.transactionId?.slice(-8) || 'N/A'}`}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const DetailModal = () => (
    <Modal
      visible={showDetailModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDetailModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Donation Details</Text>
            <TouchableOpacity 
              onPress={() => setShowDetailModal(false)}
              style={styles.modalCloseBtn}
            >
              <MaterialIcons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {selectedDonation && (
            <ScrollView>
              <View style={styles.modalDetailSection}>
                <View style={styles.modalIconContainer}>
                  <MaterialIcons name="favorite" size={40} color="#10b981" />
                </View>
                <Text style={styles.modalAmount}>₹{selectedDonation.amount?.toLocaleString()}</Text>
                <Text style={styles.modalPurpose}>{selectedDonation.purpose || 'General Donation'}</Text>
                
                <View style={styles.modalStatus}>
                  <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedDonation.status) + '20' }]}>
                    <Text style={[styles.modalStatusText, { color: getStatusColor(selectedDonation.status) }]}>
                      {getStatusLabel(selectedDonation.status)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalInfoGrid}>
                <View style={styles.modalInfoItem}>
                  <Text style={styles.modalInfoLabel}>Payment Method</Text>
                  <Text style={styles.modalInfoValue}>
                    {selectedDonation.paymentMethod?.toUpperCase() || 'N/A'}
                  </Text>
                </View>
                <View style={styles.modalInfoItem}>
                  <Text style={styles.modalInfoLabel}>Date</Text>
                  <Text style={styles.modalInfoValue}>
                    {formatDate(selectedDonation.createdAt || selectedDonation.timestamp)}
                  </Text>
                </View>
                <View style={styles.modalInfoItem}>
                  <Text style={styles.modalInfoLabel}>Donor</Text>
                  <Text style={styles.modalInfoValue}>
                    {selectedDonation.isAnonymous ? 'Anonymous' : selectedDonation.donorName || selectedDonation.name || 'N/A'}
                  </Text>
                </View>
                {selectedDonation.paymentId && (
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalInfoLabel}>Payment ID</Text>
                    <Text style={[styles.modalInfoValue, styles.modalInfoCode]}>
                      {selectedDonation.paymentId}
                    </Text>
                  </View>
                )}
                {selectedDonation.orderId && (
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalInfoLabel}>Order ID</Text>
                    <Text style={[styles.modalInfoValue, styles.modalInfoCode]}>
                      {selectedDonation.orderId}
                    </Text>
                  </View>
                )}
              </View>

              {selectedDonation.paymentId && (
                <TouchableOpacity
                  style={styles.certificateButton}
                  onPress={() => {
                    setShowDetailModal(false);
                    navigation.navigate('DonationCertificate', {
                      paymentId: selectedDonation.paymentId,
                      amount: selectedDonation.amount,
                      name: selectedDonation.donorName || selectedDonation.name || 'Donor',
                      purpose: selectedDonation.purpose || 'General Donation',
                      date: selectedDonation.createdAt || selectedDonation.timestamp,
                    });
                  }}
                >
                  <MaterialIcons name="card-membership" size={20} color="#ffffff" />
                  <Text style={styles.certificateButtonText}>View Certificate</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading donations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Green Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Donations</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats.count}</Text>
          <Text style={styles.summaryLabel}>Total Donations</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>₹{stats.total.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Total Amount</Text>
        </View>
      </View>

      {stats.razorpayCount > 0 && (
        <View style={styles.razorpaySummary}>
          <MaterialIcons name="security" size={16} color="#10b981" />
          <Text style={styles.razorpaySummaryText}>
            {stats.razorpayCount} payments via Razorpay • ₹{stats.totalRazorpay.toLocaleString()}
          </Text>
        </View>
      )}

      {/* Donations List */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} />
        }
        contentContainerStyle={styles.listContent}
      >
        {donations.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="favorite-border" size={44} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No donations yet</Text>
            <Text style={styles.emptyStateSubtext}>Start your journey of giving today</Text>
            <TouchableOpacity 
              style={styles.donateButton}
              onPress={() => navigation.navigate('DonateScreen')}
            >
              <Text style={styles.donateButtonText}>Make a Donation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          donations.map((item, index) => (
            <DonationItem key={item.id || index} item={item} />
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      <DetailModal />
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
    marginTop: 10,
  },
  headerCard: {
    backgroundColor: '#10b981',
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
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryValue: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#1f2937',
  },
  summaryLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  razorpaySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d1fae5',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  razorpaySummaryText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#065f46',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  donationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  donationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  donationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  donationInfo: {
    flex: 1,
  },
  donationPurpose: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#1f2937',
  },
  donationDate: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
  },
  donationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  donationAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#10b981',
  },
  razorpayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  razorpayBadgeText: {
    fontFamily: Fonts.Regular,
    fontSize: 9,
    color: '#065f46',
  },
  transactionId: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#9ca3af',
  },
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
  },
  emptyStateSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  donateButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  modalCloseBtn: {
    padding: 4,
  },
  modalDetailSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 28,
    color: '#10b981',
  },
  modalPurpose: {
    fontFamily: Fonts.Regular,
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  modalStatus: {
    marginTop: 8,
  },
  modalStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modalStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
  },
  modalInfoGrid: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  modalInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  modalInfoLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
  },
  modalInfoValue: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
  },
  modalInfoCode: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  certificateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  certificateButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#ffffff',
  },
});