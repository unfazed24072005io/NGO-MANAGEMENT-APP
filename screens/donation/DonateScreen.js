// screens/donation/DonateScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, 
  TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  Modal
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Fonts } from '../../config/fonts';
import { auth, db } from '../../config/firebase';
import { doc, updateDoc, increment, setDoc, getDoc } from 'firebase/firestore';
import { 
  initiateRazorpayPayment, 
  createRazorpayOrder, 
  verifyRazorpayPayment 
} from '../../services/paymentService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DonateScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [purpose, setPurpose] = useState('General Donation');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [donationData, setDonationData] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const presetAmounts = [100, 500, 1000, 2000, 5000];
  const purposes = ['General Donation', 'Education', 'Healthcare', 'Food', 'Clothing'];

  // Load saved user data
  useEffect(() => {
    loadUserData();
    loadDonorData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const savedName = await AsyncStorage.getItem('donorName');
        const savedEmail = await AsyncStorage.getItem('donorEmail');
        const savedPhone = await AsyncStorage.getItem('donorPhone');
        setName(savedName || user.displayName || '');
        setEmail(savedEmail || user.email || '');
        setPhone(savedPhone || user.phoneNumber || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadDonorData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const donorRef = doc(db, 'donors', user.uid);
        const donorDoc = await getDoc(donorRef);
        if (donorDoc.exists()) {
          const data = donorDoc.data();
          setName(data.name || '');
          setEmail(data.email || '');
          setPhone(data.phone || '');
        }
      }
    } catch (error) {
      console.error('Error loading donor data:', error);
    }
  };

  const handleAmountSelect = (value) => {
    setSelectedAmount(value);
    setAmount(value.toString());
    setCustomAmount('');
  };

  const handleCustomAmount = (value) => {
    setCustomAmount(value);
    setSelectedAmount(null);
    setAmount(value);
  };

  // screens/donation/DonateScreen.js - Fix handleDonate function

const handleDonation = async () => {
  const donationAmount = parseFloat(amount);
  if (!donationAmount || donationAmount <= 0) {
    Alert.alert('Error', 'Please enter a valid donation amount');
    return;
  }

  if (donationAmount < 10) {
    Alert.alert('Error', 'Minimum donation amount is ₹10');
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    Alert.alert('Error', 'Please login to donate');
    return;
  }

  // Validate donor details
  if (!isAnonymous) {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name or select anonymous');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
  }

  setLoading(true);
  try {
    const donorName = isAnonymous ? 'Anonymous Donor' : name;
    const donorEmail = isAnonymous ? 'anonymous@donor.com' : email;
    const donorPhone = isAnonymous ? '0000000000' : phone;

    // ✅ Step 1: Initiate Razorpay payment
    const paymentResult = await initiateRazorpayPayment({
      amount: donationAmount,
      name: donorName,
      email: donorEmail,
      phone: donorPhone,
      description: purpose,
    });

    // ✅ Step 2: Check if payment was successful
    if (paymentResult && paymentResult.success) {
      
      // ✅ Step 3: Verify payment (optional - keep or remove)
      let verificationResult = { success: true };
      if (paymentResult.paymentId) {
        verificationResult = await verifyRazorpayPayment({
          paymentId: paymentResult.paymentId,
          orderId: paymentResult.orderId,
          signature: paymentResult.signature,
        });
      }

      if (verificationResult.success) {
        // Step 4: Save donation to Firebase
        const transactionId = `DON${Date.now()}${Math.floor(Math.random() * 1000)}`;
        
        const donationData = {
          donorId: user.uid,
          donorName: donorName,
          donorEmail: donorEmail,
          donorPhone: donorPhone,
          amount: donationAmount,
          paymentMethod: 'razorpay',
          paymentId: paymentResult.paymentId || 'pending_verification',
          status: 'completed',
          purpose: purpose,
          campaign: purpose,
          transactionId: transactionId,
          isAnonymous: isAnonymous,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'donations', transactionId), donationData);

        // Update donor stats
        const donorRef = doc(db, 'donors', user.uid);
        const donorDoc = await getDoc(donorRef);
        
        if (donorDoc.exists()) {
          await updateDoc(donorRef, {
            totalDonations: increment(donationAmount),
            donationCount: increment(1),
            lastDonation: new Date().toISOString(),
            livesImpacted: increment(Math.floor(donationAmount / 100) + 1),
            name: donorName,
            email: donorEmail,
            phone: donorPhone,
          });
        } else {
          await setDoc(donorRef, {
            userId: user.uid,
            name: donorName,
            email: donorEmail,
            phone: donorPhone,
            totalDonations: donationAmount,
            donationCount: 1,
            lastDonation: new Date().toISOString(),
            livesImpacted: Math.floor(donationAmount / 100) + 1,
            createdAt: new Date().toISOString(),
          });
        }

        // Save user data
        if (!isAnonymous) {
          await AsyncStorage.setItem('donorName', name);
          await AsyncStorage.setItem('donorEmail', email);
          await AsyncStorage.setItem('donorPhone', phone);
        }

        // Show success modal
        setDonationData({
          ...paymentResult,
          amount: donationAmount,
          name: donorName,
          email: donorEmail,
          phone: donorPhone,
          purpose: purpose,
        });
        setShowSuccessModal(true);
      } else {
        Alert.alert('Payment Failed', 'Payment verification failed. Please try again.');
      }
    } else {
      // Payment failed
      Alert.alert(
        'Payment Failed',
        paymentResult?.error || 'Something went wrong. Please try again.',
        [{ text: 'OK', style: 'cancel' }]
      );
    }
  } catch (error) {
    console.error('Donation error:', error);
    Alert.alert(
      'Error',
      'Failed to process donation. Please check your internet connection and try again.',
      [{ text: 'OK', style: 'cancel' }]
    );
  } finally {
    setLoading(false);
  }
};

  const handleSuccessAction = (action) => {
    setShowSuccessModal(false);
    if (action === 'certificate') {
      navigation.navigate('DonationCertificate', {
        paymentId: donationData.paymentId,
        amount: donationData.amount,
        name: donationData.name,
        email: donationData.email,
        purpose: donationData.purpose,
        date: new Date().toISOString(),
      });
    } else if (action === 'history') {
      navigation.navigate('MyDonations');
    } else {
      navigation.goBack();
    }
  };

  // Success Modal Component
  const SuccessModal = () => (
    <Modal
      visible={showSuccessModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowSuccessModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.successIconContainer}>
            <MaterialIcons name="check-circle" size={60} color="#10b981" />
          </View>
          <Text style={styles.modalTitle}>🎉 Donation Successful!</Text>
          <Text style={styles.modalSubtitle}>
            Thank you for your donation of ₹{donationData?.amount}!
          </Text>
          
          <View style={styles.modalDetails}>
            <Text style={styles.modalDetailText}>
              <Text style={styles.modalDetailLabel}>Payment ID: </Text>
              {donationData?.paymentId}
            </Text>
            <Text style={styles.modalDetailText}>
              <Text style={styles.modalDetailLabel}>Purpose: </Text>
              {donationData?.purpose}
            </Text>
            <Text style={styles.modalDetailText}>
              <Text style={styles.modalDetailLabel}>Donor: </Text>
              {donationData?.name}
            </Text>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => handleSuccessAction('history')}
            >
              <Text style={styles.modalButtonTextSecondary}>View History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={() => handleSuccessAction('certificate')}
            >
              <Text style={styles.modalButtonTextPrimary}>Get Certificate</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => handleSuccessAction('close')}
          >
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Make a Donation</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Donor Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Your Details</Text>
          
          <TouchableOpacity
            style={styles.anonymousToggle}
            onPress={() => setIsAnonymous(!isAnonymous)}
          >
            <MaterialIcons 
              name={isAnonymous ? 'check-box' : 'check-box-outline-blank'} 
              size={24} 
              color="#10b981" 
            />
            <Text style={styles.anonymousToggleText}>Donate Anonymously</Text>
          </TouchableOpacity>

          {!isAnonymous && (
            <>
              <View style={styles.inputContainer}>
                <MaterialIcons name="person" size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#9ca3af"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialIcons name="email" size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialIcons name="phone" size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor="#9ca3af"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </>
          )}
        </View>

        {/* Amount Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Select Amount</Text>
          <View style={styles.presetContainer}>
            {presetAmounts.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetButton,
                  selectedAmount === preset && styles.presetButtonActive,
                ]}
                onPress={() => handleAmountSelect(preset)}
              >
                <Text
                  style={[
                    styles.presetText,
                    selectedAmount === preset && styles.presetTextActive,
                  ]}
                >
                  ₹{preset}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.customContainer}>
            <Text style={styles.customLabel}>Or enter custom amount</Text>
            <View style={styles.customInputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.customInput}
                placeholder="Enter amount"
                placeholderTextColor="#9ca3af"
                value={customAmount}
                onChangeText={handleCustomAmount}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Purpose Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Donation Purpose</Text>
          <View style={styles.purposeContainer}>
            {purposes.map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.purposeButton,
                  purpose === p && styles.purposeButtonActive,
                ]}
                onPress={() => setPurpose(p)}
              >
                <Text
                  style={[
                    styles.purposeText,
                    purpose === p && styles.purposeTextActive,
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payment Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentOptions}>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'razorpay' && styles.paymentOptionActive,
              ]}
              onPress={() => setPaymentMethod('razorpay')}
            >
              <MaterialIcons
                name="security"
                size={24}
                color={paymentMethod === 'razorpay' ? '#10b981' : '#6b7280'}
              />
              <Text
                style={[
                  styles.paymentOptionText,
                  paymentMethod === 'razorpay' && styles.paymentOptionTextActive,
                ]}
              >
                Razorpay
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'upi' && styles.paymentOptionActive,
              ]}
              onPress={() => setPaymentMethod('upi')}
            >
              <MaterialIcons
                name="payment"
                size={24}
                color={paymentMethod === 'upi' ? '#10b981' : '#6b7280'}
              />
              <Text
                style={[
                  styles.paymentOptionText,
                  paymentMethod === 'upi' && styles.paymentOptionTextActive,
                ]}
              >
                UPI
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'card' && styles.paymentOptionActive,
              ]}
              onPress={() => setPaymentMethod('card')}
            >
              <MaterialIcons
                name="credit-card"
                size={24}
                color={paymentMethod === 'card' ? '#10b981' : '#6b7280'}
              />
              <Text
                style={[
                  styles.paymentOptionText,
                  paymentMethod === 'card' && styles.paymentOptionTextActive,
                ]}
              >
                Card
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.paymentNote}>Secure payments powered by Razorpay</Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Donation Amount</Text>
            <Text style={styles.summaryValue}>₹{amount || 0}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Purpose</Text>
            <Text style={styles.summaryValue}>{purpose}</Text>
          </View>
          {!isAnonymous && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Donor</Text>
              <Text style={styles.summaryValue}>{name || 'Not provided'}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{amount || 0}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.donateButton,
            (!amount || parseFloat(amount) <= 0) && styles.donateButtonDisabled,
          ]}
          onPress={handleDonation}
          disabled={!amount || parseFloat(amount) <= 0 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <MaterialIcons name="favorite" size={20} color="#ffffff" />
              <Text style={styles.donateButtonText}>Donate Now</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.noteText}>
          All donations are tax-deductible under section 80G
        </Text>
        <Text style={styles.noteText}>
          🔒 Your payment is secure and encrypted
        </Text>
      </ScrollView>

      <SuccessModal />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  input: {
    flex: 1,
    fontFamily: Fonts.Regular,
    fontSize: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: '#1f2937',
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  anonymousToggleText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    marginLeft: 8,
  },
  presetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  presetButtonActive: {
    borderColor: '#10b981',
    backgroundColor: '#d1fae5',
  },
  presetText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#6b7280',
  },
  presetTextActive: {
    color: '#10b981',
  },
  customContainer: {
    marginTop: 16,
  },
  customLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
  },
  currencySymbol: {
    fontFamily: Fonts.SemiBold,
    fontSize: 18,
    color: '#1f2937',
    marginRight: 8,
  },
  customInput: {
    flex: 1,
    fontFamily: Fonts.Regular,
    fontSize: 16,
    paddingVertical: 12,
    color: '#1f2937',
  },
  purposeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  purposeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  purposeButtonActive: {
    borderColor: '#10b981',
    backgroundColor: '#d1fae5',
  },
  purposeText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  purposeTextActive: {
    color: '#10b981',
    fontFamily: Fonts.SemiBold,
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  paymentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  paymentOptionActive: {
    borderColor: '#10b981',
    backgroundColor: '#d1fae5',
  },
  paymentOptionText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#6b7280',
  },
  paymentOptionTextActive: {
    color: '#10b981',
  },
  paymentNote: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  totalLabel: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#1f2937',
  },
  totalValue: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#10b981',
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  donateButtonDisabled: {
    opacity: 0.5,
  },
  donateButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 18,
    color: '#ffffff',
  },
  noteText: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#1f2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontFamily: Fonts.Regular,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalDetails: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  modalDetailText: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#1f2937',
    paddingVertical: 4,
  },
  modalDetailLabel: {
    fontFamily: Fonts.SemiBold,
    color: '#6b7280',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#10b981',
  },
  modalButtonSecondary: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalButtonTextPrimary: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#ffffff',
  },
  modalButtonTextSecondary: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#6b7280',
  },
  modalCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  modalCloseText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
  },
});