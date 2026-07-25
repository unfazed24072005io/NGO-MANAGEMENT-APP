import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function WorkingMemberDonation({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [donations, setDonations] = useState([]);
  const [totalDonated, setTotalDonated] = useState(0);
  const [donationCount, setDonationCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    purpose: '',
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [donationHistory, setDonationHistory] = useState([]);

  useEffect(() => {
    fetchDonationHistory();
    setupRealtimeListener();
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData(prev => ({
          ...prev,
          name: data.fullName || data.name || '',
          email: data.email || '',
          phone: data.phone || ''
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
      collection(db, 'donations'),
      where('memberId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const donationsList = [];
      let total = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        donationsList.push({ id: doc.id, ...data });
        if (data.status === 'completed') {
          total += data.amount || 0;
        }
      });
      setDonations(donationsList);
      setTotalDonated(total);
      setDonationCount(donationsList.length);
    });

    return () => unsubscribe();
  };

  const fetchDonationHistory = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const q = query(
        collection(db, 'donations'),
        where('memberId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      const donationsList = [];
      snapshot.forEach((doc) => {
        donationsList.push({ id: doc.id, ...doc.data() });
      });
      setDonationHistory(donationsList);
    } catch (error) {
      console.error('Error fetching donation history:', error);
    }
  };

  const handleDonate = async () => {
    if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid donation amount');
      return;
    }

    if (!formData.purpose) {
      Alert.alert('Error', 'Please select a purpose for your donation');
      return;
    }

    setLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      const userEmail = auth.currentUser?.email;

      await addDoc(collection(db, 'donations'), {
        memberId: userId,
        amount: parseFloat(formData.amount),
        purpose: formData.purpose,
        donorName: formData.name || 'Working Member',
        donorEmail: formData.email || userEmail || '',
        donorPhone: formData.phone || '',
        message: formData.message || '',
        status: 'completed',
        createdAt: new Date().toISOString()
      });

      Alert.alert(
        'Thank You!',
        `Your donation of ₹${parseFloat(formData.amount).toLocaleString()} has been successfully processed.`,
        [
          { text: 'OK', onPress: () => {
            setFormData(prev => ({ ...prev, amount: '', purpose: '', message: '' }));
            navigation.navigate('WorkingMemberDashboard');
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
    await fetchDonationHistory();
    setRefreshing(false);
  };

  const StatCard = ({ label, value, icon, color }) => (
    <View style={[styles.statCard, { backgroundColor: color + '10' }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <MaterialIcons name={icon} size={22} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  const PurposeButton = ({ label, onPress, selected }) => (
    <TouchableOpacity 
      style={[styles.purposeButton, selected && styles.purposeButtonActive]}
      onPress={() => setFormData({...formData, purpose: label})}
    >
      <Text style={[styles.purposeButtonText, selected && styles.purposeButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Donate</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Stats */}
        <View style={styles.statsContainer}>
          <StatCard 
            label="Total Donated" 
            value={`₹${totalDonated.toLocaleString()}`} 
            icon="favorite" 
            color="#ef4444" 
          />
          <StatCard 
            label="Donations" 
            value={donationCount} 
            icon="favorite" 
            color="#3b82f6" 
          />
        </View>

        {/* Donation Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Make a Donation</Text>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Amount (₹) *</Text>
            <TextInput
              style={styles.fieldInput}
              value={formData.amount}
              onChangeText={(text) => setFormData({...formData, amount: text})}
              placeholder="Enter amount"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Purpose *</Text>
            <View style={styles.purposeContainer}>
              <PurposeButton 
                label="General" 
                selected={formData.purpose === 'General'}
                onPress={() => setFormData({...formData, purpose: 'General'})}
              />
              <PurposeButton 
                label="Education" 
                selected={formData.purpose === 'Education'}
                onPress={() => setFormData({...formData, purpose: 'Education'})}
              />
              <PurposeButton 
                label="Healthcare" 
                selected={formData.purpose === 'Healthcare'}
                onPress={() => setFormData({...formData, purpose: 'Healthcare'})}
              />
              <PurposeButton 
                label="Relief" 
                selected={formData.purpose === 'Relief'}
                onPress={() => setFormData({...formData, purpose: 'Relief'})}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
              placeholder="Enter your name"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.fieldInput}
              value={formData.email}
              onChangeText={(text) => setFormData({...formData, email: text})}
              placeholder="Enter your email"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              style={styles.fieldInput}
              value={formData.phone}
              onChangeText={(text) => setFormData({...formData, phone: text})}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              style={[styles.fieldInput, styles.textArea]}
              value={formData.message}
              onChangeText={(text) => setFormData({...formData, message: text})}
              placeholder="Leave a message (optional)"
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity 
            style={styles.donateButton}
            onPress={handleDonate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <MaterialIcons name="favorite" size={20} color="#ffffff" />
                <Text style={styles.donateButtonText}>Donate Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
  },
  statLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 18,
    color: '#1f2937',
    marginBottom: 16,
  },

  field: {
    marginBottom: 14,
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
    height: 80,
    textAlignVertical: 'top',
  },

  purposeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  purposeButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  purposeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  purposeButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
  },
  purposeButtonTextActive: {
    color: '#ffffff',
  },

  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  donateButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
  },
});