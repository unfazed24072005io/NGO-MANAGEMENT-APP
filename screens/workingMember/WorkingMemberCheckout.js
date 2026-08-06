// screens/workingMember/WorkingMemberCheckout.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';
import { 
  initiateRazorpayPayment, 
  createRazorpayOrder, 
  verifyRazorpayPayment 
} from '../../services/paymentService';

export default function WorkingMemberCheckout({ navigation, route }) {
  const { cart, total, discountedTotal, discount } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    notes: ''
  });

  useEffect(() => {
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
        setUserData(data);
        setFormData({
          name: data.fullName || data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          pincode: data.pincode || '',
          notes: ''
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const validateForm = () => {
    if (!formData.address || !formData.city) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }
    if (!formData.phone || formData.phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return false;
    }
    return true;
  };

  const handlePlaceOrder = () => {
    if (!validateForm()) return;
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'Please login to complete your purchase');
      return;
    }

    setLoading(true);
    try {
      const totalAmount = discountedTotal || total || 0;
      const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      // Create order data
      const orderData = {
        orderId: orderId,
        userId: user.uid,
        memberId: user.uid,
        userEmail: user.email,
        customerName: formData.name || 'Working Member',
        customerEmail: formData.email || user.email || '',
        customerPhone: formData.phone || user.phoneNumber || '',
        deliveryAddress: `${formData.address}, ${formData.city}${formData.pincode ? ', ' + formData.pincode : ''}`,
        shippingAddress: {
          address: formData.address,
          city: formData.city,
          pincode: formData.pincode,
          notes: formData.notes
        },
        paymentMethod: 'razorpay',
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
          images: item.images || [],
        })),
        originalTotal: total || 0,
        subtotal: total || 0,
        discount: discount * 100 || 0,
        deliveryCharge: 0,
        total: totalAmount,
        status: 'pending',
        orderType: discount > 0 ? 'wholesale' : 'retail',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save order to Firestore
      await addDoc(collection(db, 'orders'), orderData);

      // Initiate Razorpay payment
      const paymentResult = await initiateRazorpayPayment({
        amount: totalAmount,
        name: formData.name || 'Working Member',
        email: formData.email || user.email || '',
        phone: formData.phone || user.phoneNumber || '',
        description: `Order #${orderId.slice(-8)} - ${cart.length} items`,
      });

      if (paymentResult && paymentResult.success) {
        // Verify payment
        let verificationResult = { success: true };
        if (paymentResult.paymentId) {
          verificationResult = await verifyRazorpayPayment({
            paymentId: paymentResult.paymentId,
            orderId: paymentResult.orderId,
            signature: paymentResult.signature,
          });
        }

        if (verificationResult.success) {
          // Update order status
          await updateDoc(doc(db, 'orders', orderId), {
            status: 'completed',
            paymentId: paymentResult.paymentId || 'pending_verification',
            updatedAt: new Date().toISOString(),
          });

          // Update product stock
          for (const item of cart) {
            const productRef = doc(db, 'products', item.id);
            const productDoc = await getDoc(productRef);
            if (productDoc.exists()) {
              await updateDoc(productRef, {
                stock: increment(-item.quantity),
                sales: increment(item.quantity),
              });
            }
          }

          setOrderData({
            orderId: orderId,
            paymentId: paymentResult.paymentId || 'pending_verification',
            total: totalAmount,
            items: cart,
          });

          setShowPaymentModal(false);
          setShowSuccessModal(true);
        } else {
          Alert.alert('Payment Failed', 'Payment verification failed. Please try again.');
        }
      } else {
        Alert.alert('Payment Failed', paymentResult?.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessAction = (action) => {
    setShowSuccessModal(false);
    if (action === 'orders') {
      navigation.navigate('WorkingMemberMyOrders');
    } else {
      navigation.navigate('WorkingMemberECommerce');
    }
  };

  const InputField = ({ label, value, onChangeText, placeholder, keyboardType = 'default', required = false }) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label} {required && <Text style={styles.requiredStar}>*</Text>}
      </Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType}
      />
    </View>
  );

  // Payment Modal
  const PaymentModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showPaymentModal}
      onRequestClose={() => setShowPaymentModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Payment</Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <MaterialIcons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.orderSummary}>
            <Text style={styles.orderSummaryTitle}>Order Summary</Text>
            <View style={styles.orderSummaryRow}>
              <Text style={styles.orderSummaryLabel}>Items ({cart.length})</Text>
              <Text style={styles.orderSummaryValue}>₹{(total || 0).toLocaleString()}</Text>
            </View>
            {discount > 0 && (
              <View style={styles.orderSummaryRow}>
                <Text style={styles.orderSummaryLabel}>Discount ({discount * 100}%)</Text>
                <Text style={[styles.orderSummaryValue, { color: '#8b5cf6' }]}>
                  -₹{((total || 0) * discount).toFixed(2)}
                </Text>
              </View>
            )}
            <View style={styles.orderDivider} />
            <View style={styles.orderSummaryRow}>
              <Text style={styles.orderTotalLabel}>Total</Text>
              <Text style={styles.orderTotalValue}>₹{(discountedTotal || total || 0).toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.paymentInfo}>
            <View style={styles.paymentInfoRow}>
              <MaterialIcons name="person" size={18} color="#6b7280" />
              <Text style={styles.paymentInfoText}>{formData.name || 'Working Member'}</Text>
            </View>
            <View style={styles.paymentInfoRow}>
              <MaterialIcons name="phone" size={18} color="#6b7280" />
              <Text style={styles.paymentInfoText}>{formData.phone || 'N/A'}</Text>
            </View>
            <View style={styles.paymentInfoRow}>
              <MaterialIcons name="location-on" size={18} color="#6b7280" />
              <Text style={styles.paymentInfoText}>{formData.address}, {formData.city}</Text>
            </View>
            <View style={styles.paymentInfoRow}>
              <MaterialIcons name="security" size={18} color="#3b82f6" />
              <Text style={[styles.paymentInfoText, { color: '#3b82f6' }]}>Razorpay (Secure)</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.payButton, loading && styles.payButtonDisabled]}
            onPress={processPayment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.payButtonText}>
                Pay ₹{(discountedTotal || total || 0).toLocaleString()}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.paymentNote}>🔒 Secure payment powered by Razorpay</Text>
        </View>
      </View>
    </Modal>
  );

  // Success Modal
  const SuccessModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showSuccessModal}
      onRequestClose={() => setShowSuccessModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.successModalContent}>
          <View style={styles.successIconContainer}>
            <MaterialIcons name="check-circle" size={60} color="#10b981" />
          </View>
          <Text style={styles.successTitle}>🎉 Order Placed!</Text>
          <Text style={styles.successSubtitle}>
            Your order has been placed successfully!
          </Text>
          
          <View style={styles.successDetails}>
            <Text style={styles.successDetailText}>
              <Text style={styles.successDetailLabel}>Order ID: </Text>
              {orderData?.orderId?.slice(-10)}
            </Text>
            <Text style={styles.successDetailText}>
              <Text style={styles.successDetailLabel}>Payment ID: </Text>
              {orderData?.paymentId?.slice(-12)}
            </Text>
            <Text style={styles.successDetailText}>
              <Text style={styles.successDetailLabel}>Total: </Text>
              ₹{orderData?.total?.toLocaleString()}
            </Text>
            <Text style={styles.successDetailText}>
              <Text style={styles.successDetailLabel}>Items: </Text>
              {orderData?.items?.length}
            </Text>
          </View>

          <View style={styles.successButtons}>
            <TouchableOpacity
              style={[styles.successButton, styles.successButtonSecondary]}
              onPress={() => handleSuccessAction('close')}
            >
              <Text style={styles.successButtonTextSecondary}>Continue Shopping</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.successButton, styles.successButtonPrimary]}
              onPress={() => handleSuccessAction('orders')}
            >
              <Text style={styles.successButtonTextPrimary}>View Orders</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Order Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          {cart && cart.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <Text style={styles.orderItemName}>{item.name} x{item.quantity}</Text>
              <Text style={styles.orderItemPrice}>₹{item.price * item.quantity}</Text>
            </View>
          ))}
          
          {discount > 0 && (
            <View style={styles.discountRow}>
              <Text style={styles.discountLabel}>Discount ({discount * 100}%)</Text>
              <Text style={styles.discountValue}>-₹{(total * discount).toFixed(2)}</Text>
            </View>
          )}
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{(discountedTotal || total || 0).toLocaleString()}</Text>
          </View>
        </View>

        {/* Shipping Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shipping Details</Text>
          
          <InputField
            label="Full Name"
            value={formData.name}
            onChangeText={(text) => setFormData({...formData, name: text})}
            placeholder="Enter full name"
            required
          />
          
          <InputField
            label="Email"
            value={formData.email}
            onChangeText={(text) => setFormData({...formData, email: text})}
            placeholder="Enter email"
            keyboardType="email-address"
          />
          
          <InputField
            label="Phone"
            value={formData.phone}
            onChangeText={(text) => setFormData({...formData, phone: text})}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            required
          />
          
          <InputField
            label="Address"
            value={formData.address}
            onChangeText={(text) => setFormData({...formData, address: text})}
            placeholder="Enter address"
            required
          />
          
          <InputField
            label="City"
            value={formData.city}
            onChangeText={(text) => setFormData({...formData, city: text})}
            placeholder="Enter city"
            required
          />
          
          <InputField
            label="Pincode"
            value={formData.pincode}
            onChangeText={(text) => setFormData({...formData, pincode: text})}
            placeholder="Enter pincode"
            keyboardType="numeric"
          />
          
          <InputField
            label="Order Notes"
            value={formData.notes}
            onChangeText={(text) => setFormData({...formData, notes: text})}
            placeholder="Any special instructions"
          />
        </View>

        {/* Payment Method */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Method</Text>
          <View style={styles.paymentOption}>
            <MaterialIcons name="security" size={20} color="#3b82f6" />
            <Text style={styles.paymentText}>Razorpay (Secure)</Text>
          </View>
        </View>

        {/* Place Order Button */}
        <TouchableOpacity 
          style={styles.placeOrderButton}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <MaterialIcons name="check-circle" size={20} color="#ffffff" />
              <Text style={styles.placeOrderButtonText}>Pay & Place Order</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <PaymentModal />
      <SuccessModal />
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

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 12,
  },

  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  orderItemName: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
  },
  orderItemPrice: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#10b981',
  },

  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    marginTop: 4,
    paddingTop: 8,
  },
  discountLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#8b5cf6',
  },
  discountValue: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#8b5cf6',
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    marginTop: 4,
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

  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
    marginBottom: 4,
  },
  requiredStar: {
    color: '#ef4444',
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

  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  paymentText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#3b82f6',
  },

  placeOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  placeOrderButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
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
    paddingBottom: 40,
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
  orderSummary: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  orderSummaryTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 8,
  },
  orderSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  orderSummaryLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
  },
  orderSummaryValue: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
  },
  orderDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 6,
  },
  orderTotalLabel: {
    fontFamily: Fonts.Bold,
    fontSize: 15,
    color: '#1f2937',
  },
  orderTotalValue: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#10b981',
  },
  paymentInfo: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  paymentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    gap: 8,
  },
  paymentInfoText: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#1f2937',
    flex: 1,
  },
  payButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 18,
    color: '#ffffff',
  },
  paymentNote: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 10,
  },

  // Success Modal
  successModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
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
  successTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#1f2937',
  },
  successSubtitle: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  successDetails: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginTop: 12,
    marginBottom: 16,
  },
  successDetailText: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#1f2937',
    paddingVertical: 3,
  },
  successDetailLabel: {
    fontFamily: Fonts.SemiBold,
    color: '#6b7280',
  },
  successButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  successButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  successButtonPrimary: {
    backgroundColor: '#10b981',
  },
  successButtonSecondary: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  successButtonTextPrimary: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#ffffff',
  },
  successButtonTextSecondary: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#6b7280',
  },
});