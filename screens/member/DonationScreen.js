// screens/member/DonationScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, 
  Alert, Image, Modal, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';
import { 
  initiateRazorpayPayment, 
  createRazorpayOrder, 
  verifyRazorpayPayment 
} from '../../services/paymentService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommissionService } from '../../services/CommissionService';
export default function DonationScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [donationData, setDonationData] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    amount: '',
    purpose: 'General',
    message: '',
    paymentMethod: 'razorpay',
    anonymous: false
  });

  const donationPurposes = [
    'General', 'Education', 'Medical', 'Food', 'Shelter', 'Clothing', 'Emergency Relief', 'Other'
  ];

  const quickAmounts = [100, 500, 1000, 2000, 5000];

  // Load saved user data
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const savedName = await AsyncStorage.getItem('donorName');
        const savedEmail = await AsyncStorage.getItem('donorEmail');
        const savedPhone = await AsyncStorage.getItem('donorPhone');
        setFormData(prev => ({
          ...prev,
          fullName: savedName || user.displayName || '',
          email: savedEmail || user.email || '',
          phone: savedPhone || user.phoneNumber || '',
        }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const saveUserData = async () => {
    try {
      await AsyncStorage.setItem('donorName', formData.fullName);
      await AsyncStorage.setItem('donorEmail', formData.email);
      await AsyncStorage.setItem('donorPhone', formData.phone);
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return false;
    }
    if (!formData.amount || parseFloat(formData.amount) < 10) {
      Alert.alert('Error', 'Minimum donation amount is ₹10');
      return false;
    }
    return true;
  };

  // screens/member/DonationScreen.js - Fix handleDonate function

const handleDonate = async () => {
  if (!validateForm()) return;

  setLoading(true);
  try {
    const userId = auth.currentUser?.uid;
    const userEmail = auth.currentUser?.email || formData.email;

    const donationAmount = parseFloat(formData.amount);
    const donorName = formData.anonymous ? 'Anonymous Donor' : formData.fullName;
    const donorEmail = formData.anonymous ? 'anonymous@donor.com' : formData.email;

    // ✅ Step 1: Initiate Razorpay payment
    const paymentResult = await initiateRazorpayPayment({
      amount: donationAmount,
      name: donorName,
      email: donorEmail,
      phone: formData.phone,
      description: formData.purpose || 'General Donation',
    });

    // ✅ Step 2: Check if payment was successful
    if (paymentResult && paymentResult.success) {
      
      // ✅ Step 3: Verify payment
      let verificationResult = { success: true };
      if (paymentResult.paymentId) {
        verificationResult = await verifyRazorpayPayment({
          paymentId: paymentResult.paymentId,
          orderId: paymentResult.orderId,
          signature: paymentResult.signature,
        });
      }

      if (verificationResult.success) {
        // ✅ Step 4: Save donation to Firebase
        const donationRef = await addDoc(collection(db, 'donations'), {
          donorName: donorName,
          donorEmail: donorEmail,
          phone: formData.phone,
          amount: donationAmount,
          purpose: formData.purpose || 'General',
          message: formData.message || '',
          paymentMethod: 'razorpay',
          paymentId: paymentResult.paymentId || 'pending_verification',
          status: 'completed',
          anonymous: formData.anonymous,
          memberId: userId || 'guest',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        // ✅ Step 5: Create certificate
        const certificateRef = await addDoc(collection(db, 'certificates'), {
          memberId: userId || 'guest',
          donorName: donorName,
          amount: donationAmount,
          purpose: formData.purpose || 'General',
          donationId: donationRef.id,
          certificateNumber: `CERT-${Date.now().toString().slice(-8)}`,
          issuedDate: new Date().toISOString(),
          status: 'issued',
          type: 'donation',
          title: 'Donation Certificate',
          description: `For donating ₹${donationAmount} to ${formData.purpose || 'General'} cause`,
          paymentId: paymentResult.paymentId || 'pending_verification',
          createdAt: new Date().toISOString()
        });

        // ✅ Step 6: Update donor stats if logged in
        if (userId && userId !== 'guest') {
          const donorRef = doc(db, 'donors', userId);
          const donorDoc = await getDoc(donorRef);
          if (donorDoc.exists()) {
            await updateDoc(donorRef, {
              totalDonations: increment(donationAmount),
              donationCount: increment(1),
              lastDonation: new Date().toISOString(),
              livesImpacted: increment(Math.floor(donationAmount / 100) + 1),
            });
          } else {
            await setDoc(donorRef, {
              userId: userId,
              name: donorName,
              email: donorEmail,
              phone: formData.phone,
              totalDonations: donationAmount,
              donationCount: 1,
              lastDonation: new Date().toISOString(),
              livesImpacted: Math.floor(donationAmount / 100) + 1,
              createdAt: new Date().toISOString(),
            });
          }
          
          // ✅ Step 7: Process commission for the working member who registered this donor
          try {
            console.log('🔄 Processing commission for donation...');
            const commissionResult = await CommissionService.processDonationCommission(userId, donationAmount);
            console.log('✅ Commission processed:', commissionResult);
            
            // Optionally show commission info in the success popup
            if (commissionResult && commissionResult.success) {
              console.log(`💰 Commission: ₹${commissionResult.commissionAmount} at ${commissionResult.commissionRate}%`);
            }
          } catch (commissionError) {
            console.error('❌ Commission processing error:', commissionError);
            // Don't block the donation flow if commission fails
          }
        }

        // Save user data
        if (!formData.anonymous) {
          await saveUserData();
        }

        // Show success popup
        setDonationData({
          amount: donationAmount,
          name: donorName,
          purpose: formData.purpose,
          paymentId: paymentResult.paymentId || 'pending_verification',
          certificateId: certificateRef.id,
        });
        setShowSuccessPopup(true);

      } else {
        Alert.alert('Payment Failed', 'Payment verification failed. Please try again.');
      }
    } else {
      Alert.alert('Payment Failed', paymentResult?.error || 'Something went wrong');
    }
  } catch (error) {
    console.error('Donation error:', error);
    Alert.alert('Error', 'Failed to process donation. Please try again.');
  } finally {
    setLoading(false);
  }
};
  const handleBackHome = () => {
    setShowSuccessPopup(false);
    navigation.goBack();
  };

  const handleViewCertificate = () => {
    setShowSuccessPopup(false);
    navigation.navigate('Certificate', {
      certificateId: donationData?.certificateId,
      amount: donationData?.amount,
      name: donationData?.name,
      purpose: donationData?.purpose,
      paymentId: donationData?.paymentId,
    });
  };

  const PurposeCard = ({ purpose, selected, onSelect }) => (
    <TouchableOpacity
      style={[styles.purposeCard, selected && styles.purposeCardSelected]}
      onPress={() => onSelect(purpose)}
    >
      <Text style={[styles.purposeText, selected && styles.purposeTextSelected]}>
        {purpose}
      </Text>
    </TouchableOpacity>
  );

  // Success Popup Modal
  const SuccessPopup = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showSuccessPopup}
      onRequestClose={() => setShowSuccessPopup(false)}
    >
      <View style={styles.popupOverlay}>
        <View style={styles.popupContainer}>
          <View style={styles.popupIconContainer}>
            <View style={styles.popupIconCircle}>
              <MaterialIcons name="check" size={40} color="#10b981" />
            </View>
          </View>

          <Text style={styles.popupTitle}>Thank you for your</Text>
          <Text style={styles.popupTitle}>donation! 🙏</Text>

          <Text style={styles.popupSubtext}>
            Your generous donation of ₹{donationData?.amount?.toLocaleString()} 
            for {donationData?.purpose} has been received.
          </Text>

          {donationData?.paymentId && (
            <Text style={styles.popupPaymentId}>
              Payment ID: {donationData.paymentId.slice(-12)}
            </Text>
          )}

          <View style={styles.popupButtons}>
            <TouchableOpacity 
              style={[styles.popupButton, styles.popupButtonSecondary]} 
              onPress={handleBackHome}
            >
              <Text style={styles.popupButtonTextSecondary}>Back Home</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.popupButton, styles.popupButtonPrimary]} 
              onPress={handleViewCertificate}
            >
              <MaterialIcons name="card-membership" size={18} color="#ffffff" />
              <Text style={styles.popupButtonTextPrimary}>Certificate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Blue Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Donate for a Cause</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Amount Section */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Enter Donation Amount</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={formData.amount}
              onChangeText={(text) => setFormData({...formData, amount: text})}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.quickAmountsRow}>
            {quickAmounts.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.quickAmountChip}
                onPress={() => setFormData({...formData, amount: amount.toString()})}
              >
                <Text style={styles.quickAmountText}>₹{amount.toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Donor Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Donor Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.fullName}
              onChangeText={(text) => setFormData({...formData, fullName: text})}
              placeholder="Enter your full name"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({...formData, email: text})}
              placeholder="Enter your email"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone *</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => setFormData({...formData, phone: text})}
              placeholder="Enter your phone number"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <TouchableOpacity 
            style={styles.anonymousToggle}
            onPress={() => setFormData({...formData, anonymous: !formData.anonymous})}
          >
            <View style={[styles.checkbox, formData.anonymous && styles.checkboxChecked]}>
              {formData.anonymous && <MaterialIcons name="check" size={16} color="#ffffff" />}
            </View>
            <Text style={styles.anonymousText}>Donate Anonymously</Text>
          </TouchableOpacity>
        </View>

        {/* Payment Method */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Method</Text>
          <View style={styles.paymentGrid}>
            <TouchableOpacity
              style={[styles.paymentOption, formData.paymentMethod === 'razorpay' && styles.paymentOptionSelected]}
              onPress={() => setFormData({...formData, paymentMethod: 'razorpay'})}
            >
              <MaterialIcons 
                name="security" 
                size={24} 
                color={formData.paymentMethod === 'razorpay' ? '#3b82f6' : '#6b7280'} 
              />
              <Text style={[styles.paymentOptionText, formData.paymentMethod === 'razorpay' && styles.paymentOptionTextSelected]}>
                Razorpay
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.paymentNote}>💳 Secure payment powered by Razorpay</Text>
        </View>

        {/* Purpose */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Purpose</Text>
          <View style={styles.purposeGrid}>
            {donationPurposes.map((purpose) => (
              <PurposeCard
                key={purpose}
                purpose={purpose}
                selected={formData.purpose === purpose}
                onSelect={() => setFormData({...formData, purpose})}
              />
            ))}
          </View>
        </View>

        {/* Message */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Message (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.message}
            onChangeText={(text) => setFormData({...formData, message: text})}
            placeholder="Write a message..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Donation Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Donation Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.summaryValue}>₹{parseFloat(formData.amount) || 0}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Purpose</Text>
            <Text style={styles.summaryValue}>{formData.purpose || 'General'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Donor</Text>
            <Text style={styles.summaryValue}>{formData.anonymous ? 'Anonymous' : formData.fullName || 'Not provided'}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total Donation</Text>
            <Text style={styles.summaryTotalValue}>₹{parseFloat(formData.amount) || 0}</Text>
          </View>
        </View>

        {/* Donate Button */}
        <TouchableOpacity 
          style={[styles.donateButton, loading && styles.disabledButton]}
          onPress={handleDonate}
          disabled={loading}
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

        <Text style={styles.noteText}>
          🔒 Your donation is secure and encrypted via Razorpay
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>

      <SuccessPopup />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Blue Header Card
  headerCard: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    width: 32,
  },

  // Amount Section
  amountSection: {
    alignItems: 'center',
  },
  amountLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
    width: '100%',
  },
  currencySymbol: {
    fontFamily: Fonts.Bold,
    fontSize: 24,
    color: '#ffffff',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontFamily: Fonts.Bold,
    fontSize: 28,
    color: '#ffffff',
    paddingVertical: 8,
  },
  quickAmountsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  quickAmountChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  quickAmountText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },

  // Cards
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 12,
  },

  // Fields
  field: {
    marginBottom: 12,
  },
  label: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f9fafb',
    color: '#1f2937',
    fontFamily: Fonts.Regular,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // Anonymous Toggle
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
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
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  anonymousText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
  },

  // Payment Methods
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paymentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    gap: 8,
    minWidth: '45%',
  },
  paymentOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  paymentOptionText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#6b7280',
  },
  paymentOptionTextSelected: {
    color: '#3b82f6',
  },
  paymentNote: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },

  // Purpose
  purposeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  purposeCard: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  purposeCardSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  purposeText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  purposeTextSelected: {
    color: '#ffffff',
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 6,
  },
  summaryTotalLabel: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#1f2937',
  },
  summaryTotalValue: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#10b981',
  },

  // Donate Button
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
  },
  donateButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 18,
  },
  noteText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
  },

  // Success Popup
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  popupIconContainer: {
    marginBottom: 16,
  },
  popupIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#1f2937',
    textAlign: 'center',
    lineHeight: 30,
  },
  popupSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
    lineHeight: 20,
  },
  popupPaymentId: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 20,
  },
  popupButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  popupButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  popupButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  popupButtonSecondary: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  popupButtonTextPrimary: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },
  popupButtonTextSecondary: {
    fontFamily: Fonts.SemiBold,
    color: '#6b7280',
    fontSize: 14,
  },
});