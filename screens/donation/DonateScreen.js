// screens/donation/DonateScreen.js

import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, 
  TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Fonts } from '../../config/fonts';
import { auth, db } from '../../config/firebase';
import { doc, updateDoc, increment, setDoc, getDoc } from 'firebase/firestore';

export default function DonateScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [purpose, setPurpose] = useState('General Donation');

  const presetAmounts = [100, 500, 1000, 2000, 5000];
  const purposes = ['General Donation', 'Education', 'Healthcare', 'Food', 'Clothing'];

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

  const handleDonate = async () => {
    const donationAmount = parseFloat(amount);
    if (!donationAmount || donationAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid donation amount');
      return;
    }

    if (donationAmount < 10) {
      Alert.alert('Error', 'Minimum donation amount is ₹10');
      return;
    }

    setLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Error', 'Please login to donate');
        return;
      }

      const transactionId = `DON${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Create donation record
      const donationData = {
        donorId: userId,
        amount: donationAmount,
        paymentMethod: paymentMethod,
        status: 'completed',
        purpose: purpose,
        campaign: purpose,
        transactionId: transactionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'donations', transactionId), donationData);

      // Update donor stats
      const donorRef = doc(db, 'donors', userId);
      const donorDoc = await getDoc(donorRef);
      
      if (donorDoc.exists()) {
        await updateDoc(donorRef, {
          totalDonations: increment(donationAmount),
          donationCount: increment(1),
          lastDonation: new Date().toISOString(),
          livesImpacted: increment(Math.floor(donationAmount / 100) + 1),
        });
      }

      Alert.alert(
        'Thank You! 🙏',
        `Your donation of ₹${donationAmount} has been successfully processed.`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              setAmount('');
              setSelectedAmount(null);
              setCustomAmount('');
              navigation.goBack();
            }
          }
        ]
      );

    } catch (error) {
      console.error('Donation error:', error);
      Alert.alert('Error', 'Failed to process donation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'bank' && styles.paymentOptionActive,
              ]}
              onPress={() => setPaymentMethod('bank')}
            >
              <MaterialIcons
                name="account-balance"
                size={24}
                color={paymentMethod === 'bank' ? '#10b981' : '#6b7280'}
              />
              <Text
                style={[
                  styles.paymentOptionText,
                  paymentMethod === 'bank' && styles.paymentOptionTextActive,
                ]}
              >
                Bank
              </Text>
            </TouchableOpacity>
          </View>
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
          onPress={handleDonate}
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
      </ScrollView>
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
});