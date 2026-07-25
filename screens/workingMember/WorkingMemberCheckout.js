import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function WorkingMemberCheckout({ navigation, route }) {
  const { cart, total, discountedTotal, discount } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
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

  const handlePlaceOrder = async () => {
    if (!formData.address || !formData.city) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      const orderData = {
        memberId: userId,
        customerName: formData.name || 'Working Member',
        customerEmail: formData.email || '',
        customerPhone: formData.phone || '',
        shippingAddress: {
          address: formData.address,
          city: formData.city,
          pincode: formData.pincode,
          notes: formData.notes
        },
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity
        })),
        originalTotal: total,
        discount: discount * 100,
        total: discountedTotal,
        status: 'pending',
        orderType: discount > 0 ? 'wholesale' : 'retail',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'orders'), orderData);
      
      Alert.alert(
        'Order Placed!',
        'Your order has been placed successfully. You will receive a confirmation email shortly.',
        [
          { 
            text: 'View Orders', 
            onPress: () => navigation.navigate('MyOrders')
          },
          { 
            text: 'Continue Shopping', 
            onPress: () => navigation.navigate('WorkingMemberECommerce')
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
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
          {cart.map((item) => (
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
            <Text style={styles.totalValue}>₹{discountedTotal.toLocaleString()}</Text>
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
            <MaterialIcons name="payment" size={20} color="#10b981" />
            <Text style={styles.paymentText}>Cash on Delivery</Text>
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
              <Text style={styles.placeOrderButtonText}>Place Order</Text>
            </>
          )}
        </TouchableOpacity>

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
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  paymentText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#10b981',
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
});