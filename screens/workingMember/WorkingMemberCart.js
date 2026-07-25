import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Modal, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function WorkingMemberCart({ navigation, route }) {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (route.params?.cart) {
      setCart(route.params.cart);
    }
    fetchUserData();
  }, [route.params?.cart]);

  const fetchUserData = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserData(docSnap.data());
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

  const getWholesaleDiscount = () => {
    const total = getTotalAmount();
    if (total >= 5000) return 0.20;
    if (total >= 2000) return 0.15;
    if (total >= 1000) return 0.10;
    return 0;
  };

  const getDiscountedTotal = () => {
    const total = getTotalAmount();
    const discount = getWholesaleDiscount();
    return total - (total * discount);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Cart Empty', 'Please add items to your cart');
      return;
    }
    navigation.navigate('WorkingMemberCheckout', { 
      cart, 
      total: getTotalAmount(),
      discountedTotal: getDiscountedTotal(),
      discount: getWholesaleDiscount()
    });
  };

  const CartItem = ({ item }) => (
    <View style={styles.cartItem}>
      {item.images && item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={styles.itemImage} />
      ) : (
        <View style={styles.itemImagePlaceholder}>
          <MaterialIcons name="image" size={24} color="#9ca3af" />
        </View>
      )}
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
          <Text style={styles.itemQuantity}>{item.quantity}</Text>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, 1)}
          >
            <MaterialIcons name="add" size={16} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.itemTotal}>₹{item.price * item.quantity}</Text>
          <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.deleteButton}>
            <MaterialIcons name="delete" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (cart.length === 0) {
    return (
      <View style={styles.container}>
        {/* Blue Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Cart</Text>
            <View style={{ width: 32 }} />
          </View>
        </View>
        
        <View style={styles.emptyContainer}>
          <MaterialIcons name="shopping-cart" size={60} color="#d1d5db" />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <Text style={styles.emptySubtext}>Start shopping to add items</Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.shopButtonText}>Continue Shopping</Text>
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Cart</Text>
          <TouchableOpacity onPress={() => setCart([])}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={cart}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CartItem item={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          <View style={styles.footer}>
            {getWholesaleDiscount() > 0 && (
              <View style={styles.discountSection}>
                <Text style={styles.discountLabel}>Wholesale Discount</Text>
                <Text style={styles.discountValue}>{getWholesaleDiscount() * 100}% OFF</Text>
              </View>
            )}
            
            <View style={styles.totalSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalAmount}>₹{getTotalAmount().toLocaleString()}</Text>
              </View>
              
              {getWholesaleDiscount() > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.discountRowLabel}>Discount</Text>
                  <Text style={styles.discountRowValue}>-₹{(getTotalAmount() * getWholesaleDiscount()).toFixed(2)}</Text>
                </View>
              )}
              
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalAmount}>₹{getDiscountedTotal().toLocaleString()}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.checkoutButton}
              onPress={handleCheckout}
            >
              <MaterialIcons name="shopping-cart" size={20} color="#ffffff" />
              <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
  clearText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },

  listContent: {
    paddingHorizontal: 16,
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
    marginLeft: 12,
  },
  itemName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
  },
  itemPrice: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemQuantity: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    minWidth: 20,
    textAlign: 'center',
  },
  itemTotal: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#10b981',
    flex: 1,
    textAlign: 'right',
  },
  deleteButton: {
    padding: 4,
  },

  footer: {
    marginTop: 10,
  },
  discountSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ede9fe',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  discountLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#8b5cf6',
  },
  discountValue: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
    color: '#8b5cf6',
  },
  totalSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  totalLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
  },
  totalAmount: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
  },
  discountRowLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#8b5cf6',
  },
  discountRowValue: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#8b5cf6',
  },
  grandTotalRow: {
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#1f2937',
  },
  grandTotalAmount: {
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
    gap: 8,
  },
  checkoutButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 18,
    color: '#1f2937',
    marginTop: 16,
  },
  emptySubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  shopButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  shopButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },
});