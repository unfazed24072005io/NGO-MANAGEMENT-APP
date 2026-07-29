// screens/donation/MyDonations.js

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function MyDonations({ navigation }) {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    count: 0
  });

  useEffect(() => {
    setupRealtimeListener();
  }, []);

  const setupRealtimeListener = () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const q = query(
      collection(db, 'donations'),
      where('donorId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const donationList = [];
      let total = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        donationList.push({ id: doc.id, ...data });
        total += data.amount || 0;
      });
      setDonations(donationList);
      setStats({
        total: total,
        count: donationList.length
      });
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Re-fetch will happen via onSnapshot
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getStatusColor = (status) => {
    switch (status) {
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
    switch (status) {
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

  const DonationItem = ({ item }) => (
    <View style={styles.donationCard}>
      <View style={styles.donationHeader}>
        <View style={[styles.donationIcon, { backgroundColor: '#10b98115' }]}>
          <MaterialIcons name="favorite" size={20} color="#10b981" />
        </View>
        <View style={styles.donationInfo}>
          <Text style={styles.donationPurpose}>{item.purpose || item.campaign || 'General Donation'}</Text>
          <Text style={styles.donationDate}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>
      <View style={styles.donationFooter}>
        <Text style={styles.donationAmount}>₹{item.amount?.toLocaleString() || 0}</Text>
        <Text style={styles.transactionId}>ID: {item.transactionId?.slice(-8) || 'N/A'}</Text>
      </View>
    </View>
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
          donations.map((item) => (
            <DonationItem key={item.id} item={item} />
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
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

  // Green Header
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
  donationAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#10b981',
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
});