import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator, RefreshControl, FlatList, Modal, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, addDoc, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';
import { 
  initiateRazorpayPayment, 
  createRazorpayOrder, 
  verifyRazorpayPayment 
} from '../../services/paymentService';

export default function CheckoutScreen({ navigation, route }) {
  const [cart] = useState(route.params?.cart || []);
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    paymentMethod: 'razorpay'
  });

  const DELIVERY_CHARGE = 50;
  const FREE_DELIVERY_THRESHOLD = 500;

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getDeliveryCharge = () => {
    const subtotal = getTotalAmount();
    return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
  };

  const getGrandTotal = () => {
    return getTotalAmount() + getDeliveryCharge();
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return false;
    }
    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter your delivery address');
      return false;
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'Please login to place order');
      return;
    }

    if (formData.paymentMethod === 'razorpay') {
      setShowPaymentModal(true);
      return;
    }

    await processOrder('offline');
  };

  const processOrder = async (paymentType, paymentData = null) => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      const orderData = {
        orderId: orderId,
        userId: user.uid,
        userEmail: user.email,
        customerName: formData.name,
        customerEmail: formData.email || user.email || 'N/A',
        customerPhone: formData.phone,
        deliveryAddress: formData.address,
        paymentMethod: formData.paymentMethod,
        paymentType: paymentType,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity
        })),
        subtotal: getTotalAmount(),
        deliveryCharges: getDeliveryCharge(),
        total: getGrandTotal(),
        status: paymentType === 'razorpay' ? 'completed' : 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (paymentData) {
        orderData.paymentId = paymentData.paymentId;
        orderData.razorpayOrderId = paymentData.orderId;
        orderData.razorpaySignature = paymentData.signature;
      }

      await addDoc(collection(db, 'orders'), orderData);

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

      setOrderData(orderData);
      setOrderPlaced(true);
      
      Alert.alert(
        '🎉 Success!',
        'Your order has been placed successfully!',
        [
          { 
            text: 'View Orders', 
            onPress: () => navigation.navigate('MyOrders')
          },
          { 
            text: 'Continue Shopping', 
            onPress: () => navigation.navigate('MemberTabs')
          }
        ]
      );

    } catch (error) {
      console.error('Order error:', error);
      Alert.alert('Error', error.message || 'Failed to place order');
    } finally {
      setLoading(false);
      setShowPaymentModal(false);
    }
  };

  const handleRazorpayPayment = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      const totalAmount = getGrandTotal();

      const paymentResult = await initiateRazorpayPayment({
        amount: totalAmount,
        name: formData.name,
        email: formData.email || user.email,
        phone: formData.phone,
        description: `Order - ${cart.length} items`,
      });

      if (paymentResult.success) {
        const verificationResult = await verifyRazorpayPayment({
          paymentId: paymentResult.paymentId,
          orderId: paymentResult.orderId,
          signature: paymentResult.signature,
        });

        if (verificationResult.success) {
          await processOrder('razorpay', paymentResult);
        } else {
          Alert.alert('Payment Failed', 'Payment verification failed. Please try again.');
        }
      } else {
        Alert.alert('Payment Failed', paymentResult.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Razorpay error:', error);
      Alert.alert('Error', 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
      setShowPaymentModal(false);
    }
  };

  const PaymentMethod = ({ method, icon, selected, onSelect }) => (
    <TouchableOpacity 
      style={[styles.paymentMethod, selected && styles.paymentMethodSelected]}
      onPress={() => onSelect(method)}
      activeOpacity={0.7}
    >
      <View style={[styles.paymentIcon, selected && styles.paymentIconSelected]}>
        <MaterialIcons name={icon} size={20} color={selected ? '#ffffff' : '#6b7280'} />
      </View>
      <Text style={[styles.paymentText, selected && styles.paymentTextSelected]}>
        {method.charAt(0).toUpperCase() + method.slice(1)}
      </Text>
      {selected && (
        <View style={styles.checkMark}>
          <MaterialIcons name="check-circle" size={18} color="#10b981" />
        </View>
      )}
    </TouchableOpacity>
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
            <TouchableOpacity onPress={() => setShowPaymentModal(false)} activeOpacity={0.7}>
              <MaterialIcons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.orderSummary}>
            <Text style={styles.orderSummaryTitle}>Order Summary</Text>
            <View style={styles.orderSummaryRow}>
              <Text style={styles.orderSummaryLabel}>Subtotal ({getTotalItems()} items)</Text>
              <Text style={styles.orderSummaryValue}>₹{getTotalAmount().toLocaleString()}</Text>
            </View>
            <View style={styles.orderSummaryRow}>
              <Text style={styles.orderSummaryLabel}>Delivery Charges</Text>
              <Text style={styles.orderSummaryValue}>
                {getDeliveryCharge() === 0 ? 'FREE' : `₹${getDeliveryCharge()}`}
              </Text>
            </View>
            <View style={styles.orderDivider} />
            <View style={styles.orderSummaryRow}>
              <Text style={styles.orderTotalLabel}>Total</Text>
              <Text style={styles.orderTotalValue}>₹{getGrandTotal().toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.paymentInfo}>
            <View style={styles.paymentInfoRow}>
              <MaterialIcons name="person" size={18} color="#6b7280" />
              <Text style={styles.paymentInfoText}>{formData.name}</Text>
            </View>
            <View style={styles.paymentInfoRow}>
              <MaterialIcons name="phone" size={18} color="#6b7280" />
              <Text style={styles.paymentInfoText}>{formData.phone}</Text>
            </View>
            <View style={styles.paymentInfoRow}>
              <MaterialIcons name="location-on" size={18} color="#6b7280" />
              <Text style={styles.paymentInfoText} numberOfLines={1}>{formData.address}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.payButton, loading && styles.payButtonDisabled]}
            onPress={handleRazorpayPayment}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.payButtonText}>
                Pay ₹{getGrandTotal().toLocaleString()}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.paymentNote}>🔒 Secure payment powered by Razorpay</Text>
        </View>
      </View>
    </Modal>
  );

  if (orderPlaced) {
    return (
      <View style={styles.successContainer}>
        <MaterialIcons name="check-circle" size={70} color="#10b981" />
        <Text style={styles.successTitle}>Order Placed! 🎉</Text>
        <Text style={styles.successSubtext}>Your order has been placed successfully</Text>
        {orderData?.orderId && (
          <Text style={styles.orderIdText}>Order ID: {orderData.orderId.slice(-10)}</Text>
        )}
        <View style={styles.successButtons}>
          <TouchableOpacity 
            style={[styles.successButton, styles.successButtonPrimary]}
            onPress={() => navigation.navigate('MyOrders')}
            activeOpacity={0.7}
          >
            <Text style={styles.successButtonText}>View Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.successButton, styles.successButtonSecondary]}
            onPress={() => navigation.navigate('MemberTabs')}
            activeOpacity={0.7}
          >
            <Text style={styles.successButtonTextSecondary}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Delivery Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
              placeholder="Enter your full name"
              placeholderTextColor="#9ca3af"
              textAlignVertical="center"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({...formData, email: text})}
              placeholder="Enter your email"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              textAlignVertical="center"
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
              textAlignVertical="center"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Delivery Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.address}
              onChangeText={(text) => setFormData({...formData, address: text})}
              placeholder="Enter your delivery address"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Method</Text>
          <View style={styles.paymentGrid}>
            <PaymentMethod 
              method="razorpay" 
              icon="security" 
              selected={formData.paymentMethod === 'razorpay'}
              onSelect={() => setFormData({...formData, paymentMethod: 'razorpay'})}
            />
            <PaymentMethod 
              method="cash" 
              icon="payments" 
              selected={formData.paymentMethod === 'cash'}
              onSelect={() => setFormData({...formData, paymentMethod: 'cash'})}
            />
            <PaymentMethod 
              method="upi" 
              icon="phone-android" 
              selected={formData.paymentMethod === 'upi'}
              onSelect={() => setFormData({...formData, paymentMethod: 'upi'})}
            />
            <PaymentMethod 
              method="card" 
              icon="credit-card" 
              selected={formData.paymentMethod === 'card'}
              onSelect={() => setFormData({...formData, paymentMethod: 'card'})}
            />
          </View>
          {formData.paymentMethod === 'razorpay' && (
            <Text style={styles.paymentNote}>💳 Secure online payment via Razorpay</Text>
          )}
        </View>

        {/* Order Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          
          <View style={styles.orderItem}>
            <Text style={styles.orderLabel}>Items ({getTotalItems()})</Text>
            <Text style={styles.orderValue}>₹{getTotalAmount().toLocaleString()}</Text>
          </View>
          
          <View style={styles.orderItem}>
            <Text style={styles.orderLabel}>Delivery Charges</Text>
            <Text style={[styles.orderValue, getDeliveryCharge() === 0 && styles.freeDelivery]}>
              {getDeliveryCharge() === 0 ? 'FREE' : `₹${getDeliveryCharge()}`}
            </Text>
          </View>

          {getDeliveryCharge() === 0 && (
            <View style={styles.freeDeliveryBadge}>
              <MaterialIcons name="local-offer" size={14} color="#10b981" />
              <Text style={styles.freeDeliveryText}>Free Delivery Applied</Text>
            </View>
          )}

          <View style={styles.orderDivider} />
          
          <View style={styles.orderTotal}>
            <Text style={styles.orderTotalLabel}>Total</Text>
            <Text style={styles.orderTotalValue}>₹{getGrandTotal().toLocaleString()}</Text>
          </View>
        </View>

        {/* Cart Items Preview */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items in Cart</Text>
          {cart.map((item, index) => (
            <View key={index} style={styles.cartPreviewItem}>
              <Text style={styles.cartPreviewName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.cartPreviewQty}>x{item.quantity}</Text>
              <Text style={styles.cartPreviewPrice}>₹{item.price * item.quantity}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.bottomContainer}>
        <View style={styles.bottomRow}>
          <View>
            <Text style={styles.bottomTotalLabel}>Total Amount</Text>
            <Text style={styles.bottomTotal}>₹{getGrandTotal().toLocaleString()}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.placeOrderButton, loading && styles.disabledButton]}
            onPress={handlePlaceOrder}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Text style={styles.placeOrderText}>
                  {formData.paymentMethod === 'razorpay' ? 'Pay & Place Order' : 'Place Order'}
                </Text>
                <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <PaymentModal />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 20,
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
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
    marginBottom: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
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
    includeFontPadding: false,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    gap: 8,
    minWidth: '45%',
  },
  paymentMethodSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  paymentIcon: {
    padding: 4,
  },
  paymentIconSelected: {
    color: '#3b82f6',
  },
  paymentText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  paymentTextSelected: {
    color: '#3b82f6',
  },
  checkMark: {
    marginLeft: 'auto',
  },
  paymentNote: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  orderLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderValue: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  freeDelivery: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  freeDeliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  freeDeliveryText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#10b981',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 6,
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  orderTotalLabel: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderTotalValue: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#10b981',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  cartPreviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cartPreviewName: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#1f2937',
    flex: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  cartPreviewQty: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  cartPreviewPrice: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#10b981',
    flex: 1,
    textAlign: 'right',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  bottomContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomTotalLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  bottomTotal: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#10b981',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  placeOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  placeOrderText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 15,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  successTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 24,
    color: '#1f2937',
    marginTop: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  successSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderIdText: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  successButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    width: '100%',
    maxWidth: 300,
  },
  successButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successButtonPrimary: {
    backgroundColor: '#10b981',
  },
  successButtonSecondary: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  successButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  successButtonTextSecondary: {
    fontFamily: Fonts.SemiBold,
    color: '#6b7280',
    fontSize: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
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
    includeFontPadding: false,
    textAlignVertical: 'center',
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
    includeFontPadding: false,
    textAlignVertical: 'center',
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
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderSummaryValue: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
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
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderTotalValue: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#10b981',
    includeFontPadding: false,
    textAlignVertical: 'center',
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
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  payButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 18,
    color: '#ffffff',
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
});