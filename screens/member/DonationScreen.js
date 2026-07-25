import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, Modal, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function DonationScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [donationSuccess, setDonationSuccess] = useState(false);
  const [certificateUrl, setCertificateUrl] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
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

  const quickAmounts = [5000, 10000, 20000];

  const handleDonate = async () => {
    if (!formData.fullName || !formData.amount || !formData.email) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (parseFloat(formData.amount) < 10) {
      Alert.alert('Error', 'Minimum donation amount is ₹10');
      return;
    }

    setLoading(true);
    try {
      const userId = auth.currentUser?.uid || 'guest';
      const userEmail = auth.currentUser?.email || formData.email;

      const donationRef = await addDoc(collection(db, 'donations'), {
        donorName: formData.anonymous ? 'Anonymous' : formData.fullName,
        donorEmail: formData.email,
        phone: formData.phone || '',
        amount: parseFloat(formData.amount),
        purpose: formData.purpose || 'General',
        message: formData.message || '',
        paymentMethod: formData.paymentMethod || 'razorpay',
        status: 'completed',
        anonymous: formData.anonymous,
        memberId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const certificateRef = await addDoc(collection(db, 'certificates'), {
        memberId: userId,
        donorName: formData.anonymous ? 'Anonymous Donor' : formData.fullName,
        amount: parseFloat(formData.amount),
        purpose: formData.purpose || 'General',
        donationId: donationRef.id,
        certificateNumber: `CERT-${Date.now().toString().slice(-8)}`,
        issuedDate: new Date().toISOString(),
        status: 'issued',
        type: 'donation',
        title: `Donation Certificate`,
        description: `For donating ₹${parseFloat(formData.amount)} to ${formData.purpose || 'General'} cause`,
        createdAt: new Date().toISOString()
      });

      setCertificateUrl(`https://ngo-app-54121.web.app/certificate/${certificateRef.id}`);
      
      setShowSuccessPopup(true);

    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackHome = () => {
    setShowSuccessPopup(false);
    navigation.goBack();
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

  if (donationSuccess) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIconContainer}>
          <MaterialIcons name="favorite" size={60} color="#ef4444" />
        </View>
        <Text style={styles.successTitle}>Thank You for Your Donation!</Text>
        <Text style={styles.successSubtext}>Your generosity makes a difference</Text>
        
        <View style={styles.certificateCard}>
          <MaterialIcons name="verified" size={40} color="#10b981" />
          <Text style={styles.certificateTitle}>Certificate of Appreciation</Text>
          <Text style={styles.certificateText}>This certifies that</Text>
          <Text style={styles.certificateName}>{formData.anonymous ? 'Anonymous Donor' : formData.fullName}</Text>
          <Text style={styles.certificateText}>has donated ₹{parseFloat(formData.amount).toLocaleString()} for</Text>
          <Text style={styles.certificatePurpose}>{formData.purpose || 'General'}</Text>
          <Text style={styles.certificateDate}>
            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
          <View style={styles.certificateDivider} />
          <Text style={styles.certificateNumber}>#CERT-{Date.now().toString().slice(-8)}</Text>
        </View>

        <View style={styles.successActions}>
          <TouchableOpacity 
            style={[styles.successButton, styles.shareButton]}
            onPress={() => Alert.alert('Share', 'Certificate sharing feature coming soon')}
          >
            <MaterialIcons name="share" size={20} color="#ffffff" />
            <Text style={styles.successButtonText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.successButton, styles.downloadButton]}
            onPress={() => Alert.alert('Download', 'Certificate download coming soon')}
          >
            <MaterialIcons name="download" size={20} color="#ffffff" />
            <Text style={styles.successButtonText}>Download</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.doneButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
                <Text style={styles.quickAmountText}>+{amount.toLocaleString()}</Text>
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
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => setFormData({...formData, phone: text})}
              placeholder="Enter your phone number"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
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
          <Text style={styles.cardTitle}>Select Payment Method</Text>
          <View style={styles.paymentGrid}>
            {['razorpay', 'upi', 'card', 'netbanking'].map((method) => (
              <TouchableOpacity
                key={method}
                style={[styles.paymentOption, formData.paymentMethod === method && styles.paymentOptionSelected]}
                onPress={() => setFormData({...formData, paymentMethod: method})}
              >
                <MaterialIcons 
                  name={method === 'razorpay' ? 'payment' : 
                       method === 'upi' ? 'phone-android' : 
                       method === 'card' ? 'credit-card' : 'account-balance'} 
                  size={24} 
                  color={formData.paymentMethod === method ? '#3b82f6' : '#6b7280'} 
                />
                <Text style={[styles.paymentOptionText, formData.paymentMethod === method && styles.paymentOptionTextSelected]}>
                  {method.charAt(0).toUpperCase() + method.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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

        {/* Pay Button */}
        <TouchableOpacity 
          style={[styles.payButton, loading && styles.disabledButton]}
          onPress={handleDonate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Text style={styles.payButtonText}>Pay ₹{parseFloat(formData.amount) || 0}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Success Popup Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessPopup}
        onRequestClose={() => setShowSuccessPopup(false)}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupContainer}>
            {/* Success Icon */}
            <View style={styles.popupIconContainer}>
              <View style={styles.popupIconCircle}>
                <MaterialIcons name="check" size={40} color="#10b981" />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.popupTitle}>Thank you for your</Text>
            <Text style={styles.popupTitle}>support!</Text>

            {/* Subtitle */}
            <Text style={styles.popupSubtext}>
              A tax-deductible receipt was sent{'\n'}to your email.
            </Text>

            {/* Back Home Button */}
            <TouchableOpacity style={styles.popupButton} onPress={handleBackHome}>
              <Text style={styles.popupButtonText}>Back Home</Text>
            </TouchableOpacity>
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
    justifyContent: 'center',
    gap: 12,
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

  // Pay Button
  payButton: {
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
  payButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 18,
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
    marginBottom: 24,
    lineHeight: 20,
  },
  popupButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  popupButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
  },

  // Success (old)
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 24,
    color: '#1f2937',
    textAlign: 'center',
  },
  successSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  certificateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  certificateTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
    marginTop: 8,
  },
  certificateText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  certificateName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 20,
    color: '#1f2937',
    marginTop: 4,
  },
  certificatePurpose: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#3b82f6',
    marginTop: 4,
  },
  certificateDate: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  certificateDivider: {
    width: 60,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  certificateNumber: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#9ca3af',
  },
  successActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  successButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  shareButton: {
    backgroundColor: '#3b82f6',
  },
  downloadButton: {
    backgroundColor: '#10b981',
  },
  successButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },
  doneButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 16,
  },
  doneButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },
});