import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator, RefreshControl, FlatList, Modal, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function CheckoutScreen({ navigation, route }) {
  const [cart] = useState(route.params?.cart || []);
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    paymentMethod: 'cash'
  });

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handlePlaceOrder = async () => {
    if (!formData.name || !formData.phone || !formData.address) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      const userEmail = auth.currentUser?.email;

      await addDoc(collection(db, 'orders'), {
        memberId: userId,
        customerName: formData.name,
        customerEmail: formData.email || userEmail || 'N/A',
        customerPhone: formData.phone,
        deliveryAddress: formData.address,
        paymentMethod: formData.paymentMethod,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity
        })),
        subtotal: getTotalAmount(),
        deliveryCharges: 50,
        total: getTotalAmount() + 50,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      setOrderPlaced(true);
      Alert.alert('Success', 'Order placed successfully!');
      
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const PaymentMethod = ({ method, icon, selected, onSelect }) => (
    <TouchableOpacity 
      style={[styles.paymentMethod, selected && styles.paymentMethodSelected]}
      onPress={() => onSelect(method)}
    >
      <View style={[styles.paymentIcon, selected && styles.paymentIconSelected]}>
        <MaterialIcons name={icon} size={22} color={selected ? '#ffffff' : '#6b7280'} />
      </View>
      <Text style={[styles.paymentText, selected && styles.paymentTextSelected]}>
        {method.charAt(0).toUpperCase() + method.slice(1)}
      </Text>
      {selected && (
        <View style={styles.checkMark}>
          <MaterialIcons name="check-circle" size={20} color="#10b981" />
        </View>
      )}
    </TouchableOpacity>
  );

  if (orderPlaced) {
    return (
      <View style={styles.successContainer}>
        <MaterialIcons name="check-circle" size={70} color="#10b981" />
        <Text style={styles.successTitle}>Order Placed!</Text>
        <Text style={styles.successSubtext}>Your order has been placed successfully</Text>
        <TouchableOpacity 
          style={styles.successButton}
          onPress={() => navigation.navigate('MemberTabs')}
        >
          <Text style={styles.successButtonText}>Continue Shopping</Text>
        </TouchableOpacity>
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
            />
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Method</Text>
          <View style={styles.paymentGrid}>
            <PaymentMethod 
              method="cash" 
              icon="payments" 
              selected={formData.paymentMethod === 'cash'}
              onSelect={() => setFormData({...formData, paymentMethod: 'cash'})}
            />
            <PaymentMethod 
              method="razorpay" 
              icon="payment" 
              selected={formData.paymentMethod === 'razorpay'}
              onSelect={() => setFormData({...formData, paymentMethod: 'razorpay'})}
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
            <Text style={styles.orderValue}>₹50</Text>
          </View>

          <View style={styles.orderDivider} />
          
          <View style={styles.orderTotal}>
            <Text style={styles.orderTotalLabel}>Total</Text>
            <Text style={styles.orderTotalValue}>₹{(getTotalAmount() + 50).toLocaleString()}</Text>
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
          <Text style={styles.bottomTotal}>₹{(getTotalAmount() + 50).toLocaleString()}</Text>
          <TouchableOpacity 
            style={[styles.placeOrderButton, loading && styles.disabledButton]}
            onPress={handlePlaceOrder}
            disabled={loading}
          >
            <Text style={styles.placeOrderText}>
              {loading ? 'Placing Order...' : 'Place Order'}
            </Text>
            {!loading && <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />}
          </TouchableOpacity>
        </View>
      </View>
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
  },
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
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paymentMethod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    gap: 10,
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
  },
  paymentTextSelected: {
    color: '#3b82f6',
  },
  checkMark: {
    marginLeft: 'auto',
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
  },
  orderValue: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
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
  },
  orderTotalValue: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#10b981',
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
  },
  cartPreviewQty: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
    textAlign: 'center',
  },
  cartPreviewPrice: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#10b981',
    flex: 1,
    textAlign: 'right',
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
  bottomTotal: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#10b981',
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
  },
  successSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  successButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  successButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },
});