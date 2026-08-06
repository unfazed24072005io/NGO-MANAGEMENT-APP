import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, FlatList, Platform, Modal, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Fonts } from '../../config/fonts';
import { 
  initiateRazorpayPayment, 
  createRazorpayOrder, 
  verifyRazorpayPayment 
} from '../../services/paymentService';
import { auth, db } from '../../config/firebase';
import { doc, setDoc, updateDoc, increment, getDoc } from 'firebase/firestore';

export default function CartScreen({ navigation, route }) {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [deliveryInfo, setDeliveryInfo] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
  });

  const DELIVERY_CHARGE = 50;
  const FREE_DELIVERY_THRESHOLD = 500;

  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.cart) {
        setCart(route.params.cart);
      }
      fetchUserData();
    }, [route.params?.cart])
  );

  const fetchUserData = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        setDeliveryInfo(prev => ({
          ...prev,
          name: data.fullName || data.name || '',
          email: data.email || '',
          phone: data.phone || data.phoneNumber || '',
          address: data.address || '',
        }));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const updateQuantity = (productId, change) => {
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) return null;
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item !== null));
  };

  const removeFromCart = (productId) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            setCart(cart.filter(item => item.id !== productId));
          }
        }
      ]
    );
  };

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

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Cart Empty', 'Please add items to your cart');
      return;
    }
    setShowDeliveryModal(true);
  };

  const validateDeliveryInfo = () => {
    if (!deliveryInfo.name || deliveryInfo.name.trim().length < 2) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    if (!deliveryInfo.phone || deliveryInfo.phone.trim().length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return false;
    }
    if (!deliveryInfo.address || deliveryInfo.address.trim().length < 5) {
      Alert.alert('Error', 'Please enter your delivery address');
      return false;
    }
    if (!deliveryInfo.city || deliveryInfo.city.trim().length < 2) {
      Alert.alert('Error', 'Please enter your city');
      return false;
    }
    if (!deliveryInfo.pincode || deliveryInfo.pincode.trim().length < 6) {
      Alert.alert('Error', 'Please enter a valid pincode');
      return false;
    }
    return true;
  };

  const processPayment = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'Please login to complete your purchase');
      return;
    }

    setLoading(true);
    try {
      const totalAmount = getGrandTotal();
      const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      // Format address
      const fullAddress = `${deliveryInfo.address}${deliveryInfo.landmark ? `, ${deliveryInfo.landmark}` : ''}, ${deliveryInfo.city}, ${deliveryInfo.state || 'N/A'} - ${deliveryInfo.pincode}`;

      const orderData = {
        orderId: orderId,
        memberId: user.uid,
        userId: user.uid,
        userEmail: user.email,
        customerName: deliveryInfo.name || user.displayName || 'Customer',
        customerPhone: deliveryInfo.phone || user.phoneNumber || '',
        customerEmail: deliveryInfo.email || user.email || '',
        deliveryAddress: fullAddress,
        deliveryInfo: deliveryInfo, // Store full delivery info
        paymentMethod: 'razorpay',
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
          images: item.images || [],
        })),
        subtotal: getTotalAmount(),
        deliveryCharge: getDeliveryCharge(),
        total: totalAmount,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'orders', orderId), orderData);

      const paymentResult = await initiateRazorpayPayment({
        amount: totalAmount,
        name: deliveryInfo.name || user.displayName || 'Customer',
        email: deliveryInfo.email || user.email || '',
        phone: deliveryInfo.phone || user.phoneNumber || '',
        description: `Order #${orderId.slice(-8)} - ${getTotalItems()} items`,
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
          await updateDoc(doc(db, 'orders', orderId), {
            status: 'completed',
            paymentId: paymentResult.paymentId || 'pending_verification',
            orderId: paymentResult.orderId || orderId,
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

          setShowDeliveryModal(false);
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
    setCart([]);
    if (action === 'orders') {
      navigation.navigate('MyOrders');
    } else {
      navigation.goBack();
    }
  };

  const CartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemImageContainer}>
        {item.images && item.images.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.itemImage} />
        ) : (
          <View style={styles.itemImagePlaceholder}>
            <MaterialIcons name="image" size={30} color="#9ca3af" />
          </View>
        )}
      </View>
      <View style={styles.itemDetails}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.itemPrice}>₹{item.price}</Text>
        <View style={styles.itemControls}>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, -1)}
          >
            <MaterialIcons name="remove" size={16} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.itemQty}>{item.quantity}</Text>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, 1)}
          >
            <MaterialIcons name="add" size={16} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.itemSubtotal}>₹{item.price * item.quantity}</Text>
          <TouchableOpacity onPress={() => removeFromCart(item.id)}>
            <MaterialIcons name="delete" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Delivery Info Modal
  const DeliveryModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showDeliveryModal}
      onRequestClose={() => setShowDeliveryModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Delivery Information</Text>
            <TouchableOpacity onPress={() => setShowDeliveryModal(false)}>
              <MaterialIcons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Full Name *</Text>
              <TextInput
                style={styles.formInput}
                value={deliveryInfo.name}
                onChangeText={(text) => setDeliveryInfo({...deliveryInfo, name: text})}
                placeholder="Enter your full name"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={styles.formInput}
                value={deliveryInfo.email}
                onChangeText={(text) => setDeliveryInfo({...deliveryInfo, email: text})}
                placeholder="Enter your email"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Phone Number *</Text>
              <TextInput
                style={styles.formInput}
                value={deliveryInfo.phone}
                onChangeText={(text) => setDeliveryInfo({...deliveryInfo, phone: text})}
                placeholder="Enter your phone number"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Delivery Address *</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={deliveryInfo.address}
                onChangeText={(text) => setDeliveryInfo({...deliveryInfo, address: text})}
                placeholder="Enter your delivery address"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Landmark</Text>
              <TextInput
                style={styles.formInput}
                value={deliveryInfo.landmark}
                onChangeText={(text) => setDeliveryInfo({...deliveryInfo, landmark: text})}
                placeholder="Nearby landmark (optional)"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, styles.formFieldHalf]}>
                <Text style={styles.formLabel}>City *</Text>
                <TextInput
                  style={styles.formInput}
                  value={deliveryInfo.city}
                  onChangeText={(text) => setDeliveryInfo({...deliveryInfo, city: text})}
                  placeholder="City"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={[styles.formField, styles.formFieldHalf]}>
                <Text style={styles.formLabel}>State</Text>
                <TextInput
                  style={styles.formInput}
                  value={deliveryInfo.state}
                  onChangeText={(text) => setDeliveryInfo({...deliveryInfo, state: text})}
                  placeholder="State"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Pincode *</Text>
              <TextInput
                style={styles.formInput}
                value={deliveryInfo.pincode}
                onChangeText={(text) => setDeliveryInfo({...deliveryInfo, pincode: text})}
                placeholder="Enter pincode"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                maxLength={6}
              />
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

            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => {
                if (validateDeliveryInfo()) {
                  setShowDeliveryModal(false);
                  setShowPaymentModal(true);
                }
              }}
            >
              <Text style={styles.continueButtonText}>Continue to Payment</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
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
              <Text style={styles.paymentInfoText}>{deliveryInfo.name || 'Customer'}</Text>
            </View>
            <View style={styles.paymentInfoRow}>
              <MaterialIcons name="phone" size={18} color="#6b7280" />
              <Text style={styles.paymentInfoText}>{deliveryInfo.phone || 'N/A'}</Text>
            </View>
            <View style={styles.paymentInfoRow}>
              <MaterialIcons name="location-on" size={18} color="#6b7280" />
              <Text style={[styles.paymentInfoText, { fontSize: 12 }]} numberOfLines={2}>
                {deliveryInfo.address || 'N/A'}
              </Text>
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
                Pay ₹{getGrandTotal().toLocaleString()}
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Processing your order...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Cart</Text>
          <Text style={styles.itemCount}>{getTotalItems()} items</Text>
        </View>
      </View>

      {cart.length === 0 ? (
        <View style={styles.emptyCart}>
          <MaterialIcons name="shopping-cart" size={60} color="#d1d5db" />
          <Text style={styles.emptyCartText}>Your cart is empty</Text>
          <Text style={styles.emptyCartSubtext}>Browse products and add items to your cart</Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.shopButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <CartItem item={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />

          {/* Bottom Summary */}
          <View style={styles.bottomContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal ({getTotalItems()} items)</Text>
              <Text style={styles.summaryValue}>₹{getTotalAmount().toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Charges</Text>
              <Text style={styles.summaryValue}>
                {getDeliveryCharge() === 0 ? 'FREE' : `₹${getDeliveryCharge()}`}
              </Text>
            </View>
            {getTotalAmount() >= FREE_DELIVERY_THRESHOLD && (
              <View style={styles.freeDeliveryBadge}>
                <MaterialIcons name="local-offer" size={14} color="#10b981" />
                <Text style={styles.freeDeliveryText}>Free Delivery</Text>
              </View>
            )}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{getGrandTotal().toLocaleString()}</Text>
            </View>
            <TouchableOpacity 
              style={styles.checkoutButton}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </>
      )}

      <DeliveryModal />
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
  },
  itemCount: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  listContent: {
    padding: 12,
    paddingBottom: 20,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemImageContainer: {
    marginRight: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  itemImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
  },
  itemPrice: {
    fontFamily: Fonts.Bold,
    fontSize: 15,
    color: '#10b981',
    marginTop: 2,
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  quantityButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemQty: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    minWidth: 24,
    textAlign: 'center',
  },
  itemSubtotal: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#10b981',
    flex: 1,
    textAlign: 'right',
  },
  emptyCart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyCartText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 20,
    color: '#1f2937',
    marginTop: 16,
  },
  emptyCartSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  shopButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  shopButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },
  bottomContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
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
  },
  summaryDivider: {
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
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  checkoutButtonText: {
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
    maxHeight: '95%',
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
  // Form Styles
  formField: {
    marginBottom: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formFieldHalf: {
    flex: 1,
  },
  formLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
    marginBottom: 4,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9fafb',
    fontFamily: Fonts.Regular,
    color: '#1f2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  orderSummary: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
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
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginBottom: 8,
  },
  continueButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#ffffff',
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