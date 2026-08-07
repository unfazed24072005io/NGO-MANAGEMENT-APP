// screens/workingMember/WorkingMemberDonation.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, addDoc, query, where, setDoc, orderBy, onSnapshot, doc, getDoc, updateDoc, increment, getDocs } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';
import { 
  initiateRazorpayPayment, 
  verifyRazorpayPayment 
} from '../../services/paymentService';

export default function WorkingMemberDonation({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [donations, setDonations] = useState([]);
  const [totalDonated, setTotalDonated] = useState(0);
  const [donationCount, setDonationCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [donationData, setDonationData] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    purpose: 'General',
    name: '',
    email: '',
    phone: '',
    message: '',
    anonymous: false
  });

  const purposes = ['General', 'Education', 'Healthcare', 'Relief'];

  useEffect(() => {
    setupRealtimeListener();
    fetchUserData();
    fetchDonationHistory();
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
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const donationsList = [];
      snapshot.forEach((doc) => {
        donationsList.push({ id: doc.id, ...doc.data() });
      });
      setDonations(donationsList);
    } catch (error) {
      console.error('Error fetching donation history:', error);
    }
  };

  const handleDonate = async () => {
    if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid donation amount');
      return;
    }

    if (parseFloat(formData.amount) < 10) {
      Alert.alert('Error', 'Minimum donation amount is ₹10');
      return;
    }

    if (!formData.purpose) {
      Alert.alert('Error', 'Please select a purpose for your donation');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'Please login to donate');
      return;
    }

    setLoading(true);
    try {
      const donationAmount = parseFloat(formData.amount);
      const donorName = formData.anonymous ? 'Anonymous Donor' : formData.name || 'Working Member';
      const donorEmail = formData.anonymous ? 'anonymous@donor.com' : formData.email || user.email || '';
      const donorPhone = formData.anonymous ? '0000000000' : formData.phone || '';

      const paymentResult = await initiateRazorpayPayment({
        amount: donationAmount,
        name: donorName,
        email: donorEmail,
        phone: donorPhone,
        description: formData.purpose || 'General Donation',
      });

      if (paymentResult.success) {
        let verificationResult = { success: true };
        if (paymentResult.paymentId) {
          verificationResult = await verifyRazorpayPayment({
            paymentId: paymentResult.paymentId,
            orderId: paymentResult.orderId,
            signature: paymentResult.signature,
          });
        }

        if (verificationResult.success) {
          const certificateNumber = `CERT-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

          const donationRef = await addDoc(collection(db, 'donations'), {
            memberId: user.uid,
            amount: donationAmount,
            purpose: formData.purpose,
            donorName: donorName,
            donorEmail: donorEmail,
            donorPhone: donorPhone,
            message: formData.message || '',
            paymentMethod: 'razorpay',
            paymentId: paymentResult.paymentId || 'pending_verification',
            orderId: paymentResult.orderId || '',
            status: 'completed',
            anonymous: formData.anonymous,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          await addDoc(collection(db, 'certificates'), {
            memberId: user.uid,
            memberName: donorName,
            donorName: donorName,
            donorEmail: donorEmail,
            donorPhone: donorPhone,
            amount: donationAmount,
            purpose: formData.purpose,
            type: 'donation',
            title: `${formData.purpose} Donation Certificate`,
            description: `Certificate of appreciation for your generous donation of ₹${donationAmount} for ${formData.purpose}`,
            certificateNumber: certificateNumber,
            paymentId: paymentResult.paymentId || 'pending_verification',
            orderId: paymentResult.orderId || '',
            issuedDate: new Date().toISOString(),
            status: 'issued',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          const donorRef = doc(db, 'donors', user.uid);
          const donorDoc = await getDoc(donorRef);
          if (donorDoc.exists()) {
            await updateDoc(donorRef, {
              totalDonations: increment(donationAmount),
              donationCount: increment(1),
              lastDonation: new Date().toISOString(),
            });
          } else {
            await setDoc(donorRef, {
              userId: user.uid,
              totalDonations: donationAmount,
              donationCount: 1,
              lastDonation: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            });
          }

          setDonationData({
            amount: donationAmount,
            name: donorName,
            purpose: formData.purpose,
            paymentId: paymentResult.paymentId || 'pending_verification',
            certificateNumber: certificateNumber,
          });
          setShowSuccessModal(true);
          
          setFormData(prev => ({
            ...prev,
            amount: '',
            message: ''
          }));
        } else {
          Alert.alert('Payment Failed', 'Payment verification failed. Please try again.');
        }
      } else {
        Alert.alert('Payment Failed', paymentResult.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Donation error:', error);
      Alert.alert('Error', 'Failed to process donation. Please try again.');
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
        <MaterialIcons name={icon} size={20} color={color} />
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
      activeOpacity={0.7}
    >
      <Text style={[styles.purposeButtonText, selected && styles.purposeButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const SuccessModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showSuccessModal}
      onRequestClose={() => setShowSuccessModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.successIconContainer}>
            <View style={styles.successIconCircle}>
              <MaterialIcons name="check" size={40} color="#10b981" />
            </View>
          </View>
          <Text style={styles.modalTitle}>Thank you for your</Text>
          <Text style={styles.modalTitle}>donation! 🙏</Text>
          <Text style={styles.modalSubtext}>
            Your generous donation of ₹{donationData?.amount?.toLocaleString()} 
            for {donationData?.purpose} has been received.
          </Text>
          {donationData?.certificateNumber && (
            <Text style={styles.modalCertNumber}>
              🏆 Certificate: {donationData.certificateNumber}
            </Text>
          )}
          {donationData?.paymentId && (
            <Text style={styles.modalPaymentId}>
              Payment ID: {donationData.paymentId.slice(-12)}
            </Text>
          )}
          
          <View style={styles.modalButtonRow}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => {
                setShowSuccessModal(false);
                navigation.goBack();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.modalButtonTextSecondary}>Done</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={() => {
                setShowSuccessModal(false);
                navigation.navigate('WorkingMemberCertificate', {
                  certificate: {
                    id: donationData?.certificateNumber || '',
                    title: `${donationData?.purpose} Donation Certificate`,
                    type: 'donation',
                    amount: donationData?.amount,
                    purpose: donationData?.purpose,
                    donorName: donationData?.name,
                    certificateNumber: donationData?.certificateNumber,
                    paymentId: donationData?.paymentId,
                    issuedDate: new Date().toISOString(),
                    status: 'issued'
                  }
                });
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="verified" size={18} color="#ffffff" />
              <Text style={styles.modalButtonText}>View Certificate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDonationHistory = () => {
    if (donations.length === 0) return null;
    
    return (
      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.cardTitle}>Recent Donations</Text>
        {donations.slice(0, 3).map((donation, index) => (
          <View key={donation.id || index} style={styles.historyItem}>
            <View style={styles.historyLeft}>
              <Text style={styles.historyPurpose}>{donation.purpose}</Text>
              <Text style={styles.historyDate}>
                {donation.createdAt ? new Date(donation.createdAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
            <Text style={styles.historyAmount}>₹{donation.amount?.toLocaleString()}</Text>
          </View>
        ))}
        {donations.length > 3 && (
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('WorkingMemberDonationHistory')}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>View All ({donations.length})</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Purple Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Donate</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8b5cf6']} />}
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
            color="#8b5cf6" 
          />
        </View>

        {/* Donation Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Make a Donation</Text>
          
          {/* Anonymous Toggle */}
          <TouchableOpacity 
            style={styles.anonymousToggle}
            onPress={() => setFormData({...formData, anonymous: !formData.anonymous})}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, formData.anonymous && styles.checkboxChecked]}>
              {formData.anonymous && <MaterialIcons name="check" size={16} color="#ffffff" />}
            </View>
            <Text style={styles.anonymousText}>Donate Anonymously</Text>
          </TouchableOpacity>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Amount (₹) *</Text>
            <TextInput
              style={styles.fieldInput}
              value={formData.amount}
              onChangeText={(text) => setFormData({...formData, amount: text})}
              placeholder="Enter amount"
              keyboardType="numeric"
              textAlignVertical="center"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Purpose *</Text>
            <View style={styles.purposeContainer}>
              {purposes.map((p) => (
                <PurposeButton 
                  key={p}
                  label={p} 
                  selected={formData.purpose === p}
                  onPress={() => setFormData({...formData, purpose: p})}
                />
              ))}
            </View>
          </View>

          {!formData.anonymous && (
            <>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={formData.name}
                  onChangeText={(text) => setFormData({...formData, name: text})}
                  placeholder="Enter your name"
                  textAlignVertical="center"
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
                  textAlignVertical="center"
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
                  textAlignVertical="center"
                />
              </View>
            </>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              style={[styles.fieldInput, styles.textArea]}
              value={formData.message}
              onChangeText={(text) => setFormData({...formData, message: text})}
              placeholder="Leave a message (optional)"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity 
            style={[styles.donateButton, loading && styles.donateButtonDisabled]}
            onPress={handleDonate}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <MaterialIcons name="favorite" size={20} color="#ffffff" />
                <Text style={styles.donateButtonText}>
                  Donate ₹{parseFloat(formData.amount) || 0}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.paymentNote}>🔒 Secure payment powered by Razorpay</Text>
        </View>

        {/* Donation History */}
        {renderDonationHistory()}

        <View style={{ height: 40 }} />
      </ScrollView>

      <SuccessModal />
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
    padding: 4 
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

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
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
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
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
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  anonymousText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
    marginBottom: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
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
    includeFontPadding: false,
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
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  purposeButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
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
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  modalButtonSecondary: {
    backgroundColor: '#6b7280',
    flex: 1,
  },
  modalButtonPrimary: {
    backgroundColor: '#8b5cf6',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  modalButtonTextSecondary: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalCertNumber: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#8b5cf6',
    marginBottom: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  donateButtonDisabled: {
    opacity: 0.6,
  },
  donateButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  paymentNote: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 10,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // History Items
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  historyLeft: {
    flex: 1,
  },
  historyPurpose: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  historyDate: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  historyAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
    color: '#10b981',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  viewAllText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#8b5cf6',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#1f2937',
    textAlign: 'center',
    lineHeight: 30,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalPaymentId: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});