import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image, Modal, ActivityIndicator, RefreshControl, FlatList, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, addDoc, doc, query, where, orderBy, onSnapshot, getDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Fonts } from '../../config/fonts';
import Swiper from 'react-native-swiper';
const { width } = Dimensions.get('window');

export default function WorkingMemberECommerce({ navigation }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [showWholesale, setShowWholesale] = useState(false);

  const categories = ['All', 'Books', 'Clothing', 'Accessories', 'Food', 'Other'];

  useEffect(() => {
    setupRealtimeListener();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfilePhoto(data.profilePhoto || null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const setupRealtimeListener = () => {
    const q = query(collection(db, 'products'), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsList = [];
      snapshot.forEach((doc) => {
        productsList.push({ id: doc.id, ...doc.data() });
      });
      setProducts(productsList);
      applyFilters(productsList, searchQuery, selectedCategory);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const applyFilters = (data, searchText, category) => {
    let filtered = data;

    if (searchText) {
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (category !== 'All') {
      filtered = filtered.filter(product => product.category === category);
    }

    setFilteredProducts(filtered);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFilters(products, text, selectedCategory);
  };

  const handleCategoryPress = (category) => {
    setSelectedCategory(category);
    applyFilters(products, searchQuery, category);
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    Alert.alert('Added to Cart', `${product.name} added to cart`);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
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

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Cart Empty', 'Please add items to your cart');
      return;
    }

    setCheckoutModalVisible(false);
    setOrderPlaced(true);

    try {
      const userId = auth.currentUser?.uid;
      const userEmail = auth.currentUser?.email;
      const discount = getWholesaleDiscount();
      const originalTotal = getTotalAmount();
      const discountedTotal = getDiscountedTotal();

      await addDoc(collection(db, 'orders'), {
        memberId: userId,
        customerName: auth.currentUser?.displayName || 'Working Member',
        customerEmail: userEmail,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity
        })),
        originalTotal: originalTotal,
        discount: discount * 100,
        total: discountedTotal,
        status: 'pending',
        orderType: showWholesale ? 'wholesale' : 'retail',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      Alert.alert('Order Placed', 'Your order has been placed successfully');
      setCart([]);
      setOrderPlaced(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const CategoryChip = ({ label, count }) => (
    <TouchableOpacity
      style={[styles.categoryChip, selectedCategory === label && styles.categoryChipActive]}
      onPress={() => handleCategoryPress(label)}
    >
      <View style={styles.categoryChipContent}>
        <Text style={[styles.categoryChipLabel, selectedCategory === label && styles.categoryChipLabelActive]}>{label}</Text>
        <Text style={[styles.categoryChipCount, selectedCategory === label && styles.categoryChipCountActive]}>{count}</Text>
      </View>
    </TouchableOpacity>
  );

  const ProductCard = ({ product }) => {
    const hasWholesalePrice = product.wholesalePrice && product.wholesalePrice > 0;
    
    // Get quantity from cart for this product
    const cartItem = cart.find(item => item.id === product.id);
    const quantity = cartItem ? cartItem.quantity : 0;

    const handleAddToCart = () => {
      if (product.stock === 0) {
        Alert.alert('Out of Stock', 'This product is currently out of stock');
        return;
      }
      addToCart(product);
    };

    const handleIncrement = () => {
      if (product.stock === 0) {
        Alert.alert('Out of Stock', 'This product is currently out of stock');
        return;
      }
      addToCart(product);
    };

    const handleDecrement = () => {
      if (quantity > 0) {
        if (quantity === 1) {
          removeFromCart(product.id);
        } else {
          updateQuantity(product.id, -1);
        }
      }
    };

    return (
      <View style={styles.productCard}>
        <TouchableOpacity 
          style={styles.productCardInner}
          onPress={() => Alert.alert('Product Details', product.name)}
          activeOpacity={0.9}
        >
          {product.images && product.images.length > 0 ? (
            <Image source={{ uri: product.images[0] }} style={styles.productCardImage} />
          ) : (
            <View style={styles.productCardImagePlaceholder}>
              <MaterialIcons name="image" size={35} color="#9ca3af" />
            </View>
          )}
          {showWholesale && hasWholesalePrice && (
            <View style={styles.wholesaleBadge}>
              <Text style={styles.wholesaleBadgeText}>BULK</Text>
            </View>
          )}
          <Text style={styles.productCardName} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.productCardDescription} numberOfLines={2}>
            {product.shortDescription || product.category || 'Product'}
          </Text>
          {showWholesale && hasWholesalePrice ? (
            <View style={styles.priceWrapper}>
              <Text style={styles.productCardPrice}>₹{product.wholesalePrice}</Text>
              <Text style={styles.retailPriceStrikethrough}>₹{product.price}</Text>
            </View>
          ) : (
            <Text style={styles.productCardPrice}>₹{product.price}</Text>
          )}
        </TouchableOpacity>
        
        {/* Add to Cart / Quantity Selector */}
        {quantity > 0 ? (
          <View style={styles.quantitySelectorContainer}>
            <TouchableOpacity 
              style={[styles.quantityControlButton, styles.quantityMinusButton]}
              onPress={handleDecrement}
            >
              <MaterialIcons name="remove" size={16} color="#ffffff" />
            </TouchableOpacity>
            
            <Text style={styles.quantityDisplay}>{quantity}</Text>
            
            <TouchableOpacity 
              style={[styles.quantityControlButton, styles.quantityPlusButton]}
              onPress={handleIncrement}
              disabled={product.stock === 0}
            >
              <MaterialIcons name="add" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.addToCartButton, (product.stock === 0) && styles.disabledButton]}
            onPress={handleAddToCart}
            disabled={product.stock === 0}
          >
            <Text style={styles.addToCartButtonText}>
              {product.stock === 0 ? 'Out of Stock' : 'Add'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const CategorySection = ({ category, products }) => {
    if (products.length === 0) return null;
    
    return (
      <View style={styles.categorySection}>
        <Text style={styles.categorySectionTitle}>{category}</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categorySectionContent}
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ScrollView>
      </View>
    );
  };

  const getProductsByCategory = () => {
    const grouped = {};
    const filtered = selectedCategory === 'All' ? products : filteredProducts;
    
    filtered.forEach(product => {
      const category = product.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(product);
    });
    
    return grouped;
  };

  const groupedProducts = getProductsByCategory();
  const categoryKeys = Object.keys(groupedProducts);

  const getCategoryCount = (category) => {
    if (category === 'All') return products.length;
    return products.filter(p => p.category === category).length;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Blue Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Shop</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.ordersButton}
              onPress={() => navigation.navigate('WorkingMemberMyOrders')}
            >
              <MaterialIcons name="receipt" size={18} color="#ffffff" />
              <Text style={styles.ordersButtonText}>Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileIcon}
              onPress={() => navigation.navigate('WorkingMemberProfile')}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
              ) : (
                <MaterialIcons name="person" size={28} color="#8b5cf6" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar inside header */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <MaterialIcons name="close" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Chips inside header */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoryChipsContainer}
          contentContainerStyle={styles.categoryChipsContent}
        >
          <CategoryChip label="All" count={getCategoryCount('All')} />
          {categories.filter(c => c !== 'All').map((category) => (
            <CategoryChip 
              key={category} 
              label={category} 
              count={getCategoryCount(category)} 
            />
          ))}
        </ScrollView>
      </View>

      {/* Products by Category */}
      <FlatList
        data={categoryKeys}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <CategorySection category={item} products={groupedProducts[item]} />
        )}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8b5cf6']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="shopping-bag" size={44} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No products found</Text>
            <Text style={styles.emptyStateSubtext}>Check back later for new items</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Cart Floating Button */}
      <TouchableOpacity 
        style={styles.cartFloatingButton}
        onPress={() => setCartModalVisible(true)}
      >
        <MaterialIcons name="shopping-cart" size={24} color="#ffffff" />
        {cart.length > 0 && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cart.reduce((total, item) => total + item.quantity, 0)}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Cart Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={cartModalVisible}
        onRequestClose={() => setCartModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>My Cart</Text>
              <TouchableOpacity onPress={() => setCartModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <MaterialIcons name="shopping-cart" size={44} color="#d1d5db" />
                <Text style={styles.emptyCartText}>Your cart is empty</Text>
                <TouchableOpacity 
                  style={styles.continueShoppingButton}
                  onPress={() => setCartModalVisible(false)}
                >
                  <Text style={styles.continueShoppingText}>Continue Shopping</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <FlatList
                  data={cart}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.cartItem}>
                      <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
                      <View style={styles.cartItemControls}>
                        <TouchableOpacity 
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.id, -1)}
                        >
                          <MaterialIcons name="remove" size={14} color="#ffffff" />
                        </TouchableOpacity>
                        <Text style={styles.cartItemQty}>{item.quantity}</Text>
                        <TouchableOpacity 
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.id, 1)}
                        >
                          <MaterialIcons name="add" size={14} color="#ffffff" />
                        </TouchableOpacity>
                        <Text style={styles.cartItemPrice}>₹{item.price * item.quantity}</Text>
                        <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                          <MaterialIcons name="delete" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  scrollEnabled={false}
                />
                
                {showWholesale && getWholesaleDiscount() > 0 && (
                  <View style={styles.discountSection}>
                    <Text style={styles.discountLabel}>Wholesale Discount</Text>
                    <Text style={styles.discountValue}>{getWholesaleDiscount() * 100}% OFF</Text>
                  </View>
                )}

                <View style={styles.cartTotal}>
                  <Text style={styles.cartTotalLabel}>Total Amount</Text>
                  {showWholesale && getWholesaleDiscount() > 0 ? (
                    <View>
                      <Text style={styles.cartTotalOriginal}>₹{getTotalAmount().toLocaleString()}</Text>
                      <Text style={styles.cartTotalAmount}>₹{getDiscountedTotal().toLocaleString()}</Text>
                    </View>
                  ) : (
                    <Text style={styles.cartTotalAmount}>₹{getTotalAmount().toLocaleString()}</Text>
                  )}
                </View>

                <TouchableOpacity 
                  style={styles.checkoutButton}
                  onPress={() => {
                    setCartModalVisible(false);
                    setCheckoutModalVisible(true);
                  }}
                >
                  <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Checkout Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={checkoutModalVisible}
        onRequestClose={() => setCheckoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Checkout</Text>
              <TouchableOpacity onPress={() => setCheckoutModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.checkoutSummary}>
              <Text style={styles.checkoutLabel}>Order Summary</Text>
              {cart.map((item) => (
                <View key={item.id} style={styles.checkoutItem}>
                  <Text style={styles.checkoutItemName}>{item.name} x{item.quantity}</Text>
                  <Text style={styles.checkoutItemPrice}>₹{item.price * item.quantity}</Text>
                </View>
              ))}
              
              {showWholesale && getWholesaleDiscount() > 0 && (
                <View style={styles.checkoutDiscount}>
                  <Text style={styles.checkoutDiscountLabel}>Discount ({getWholesaleDiscount() * 100}%)</Text>
                  <Text style={styles.checkoutDiscountValue}>-₹{(getTotalAmount() * getWholesaleDiscount()).toFixed(2)}</Text>
                </View>
              )}

              <View style={styles.checkoutDivider} />
              <View style={styles.checkoutTotal}>
                <Text style={styles.checkoutTotalLabel}>Total</Text>
                <Text style={styles.checkoutTotalAmount}>₹{getDiscountedTotal().toLocaleString()}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.placeOrderButton}
              onPress={handleCheckout}
            >
              <MaterialIcons name="check-circle" size={20} color="#ffffff" />
              <Text style={styles.placeOrderText}>Place Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Order Success */}
      {orderPlaced && (
        <View style={styles.orderSuccess}>
          <MaterialIcons name="check-circle" size={50} color="#10b981" />
          <Text style={styles.orderSuccessText}>Order Placed!</Text>
          <Text style={styles.orderSuccessSubtext}>Thank you for your purchase</Text>
          <TouchableOpacity 
            style={styles.orderSuccessButton}
            onPress={() => {
              setOrderPlaced(false);
              navigation.goBack();
            }}
          >
            <Text style={styles.orderSuccessButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      )}
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
  },

  // Blue Header Card
  headerCard: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#ffffff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ordersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  ordersButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#ffffff',
  },
  profileIcon: {
    width: 70,
    height: 70,
    borderRadius: 50,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 50,
  },

  // Search inside header
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
  },

  // Category Chips inside header
  categoryChipsContainer: {
    maxHeight: 50,
  },
  categoryChipsContent: {
    gap: 10,
  },
  categoryChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    minWidth: 80,
  },
  categoryChipActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  categoryChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  categoryChipLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  categoryChipLabelActive: {
    color: '#8b5cf6',
  },
  categoryChipCount: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  categoryChipCountActive: {
    color: '#8b5cf6',
  },

  // Category Sections
  categorySection: {
    marginBottom: 20,
  },
  categorySectionTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 18,
    color: '#1f2937',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categorySectionContent: {
    paddingHorizontal: 12,
    gap: 14,
  },

  // Product Card - Taller with more spacing
  productCard: {
    width: 170,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    paddingBottom: 12,
  },
  productCardInner: {
    padding: 12,
  },
  productCardImage: {
    width: 146,
    height: 150,
    borderRadius: 10,
    alignSelf: 'center',
    backgroundColor: '#f3f4f6',
  },
  productCardImagePlaceholder: {
    width: 146,
    height: 150,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  productCardName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
    marginTop: 10,
    height: 36,
    lineHeight: 18,
  },
  productCardDescription: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
    height: 30,
    lineHeight: 15,
  },
  priceWrapper: {
    marginTop: 6,
  },
  productCardPrice: {
    fontFamily: Fonts.Bold,
    fontSize: 17,
    color: '#10b981',
    marginTop: 6,
  },
  retailPriceStrikethrough: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  wholesaleBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 1,
  },
  wholesaleBadgeText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 9,
    color: '#ffffff',
  },

  // Add to Cart Button
  addToCartButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    minHeight: 36,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  addToCartButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#ffffff',
  },

  // Quantity Selector
  quantitySelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginHorizontal: 12,
    minHeight: 36,
    gap: 8,
  },
  quantityControlButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityMinusButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  quantityPlusButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  quantityDisplay: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#ffffff',
    minWidth: 24,
    textAlign: 'center',
  },

  // List Content
  listContent: {
    paddingVertical: 12,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyStateText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
  },
  emptyStateSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
  },

  // Floating Cart Button
  cartFloatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#8b5cf6',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cartBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  cartBadgeText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 10,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
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
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyCartText: {
    fontFamily: Fonts.Regular,
    fontSize: 15,
    color: '#6b7280',
  },
  continueShoppingButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  continueShoppingText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },
  cartItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cartItemName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quantityButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItemQty: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#1f2937',
    minWidth: 20,
    textAlign: 'center',
  },
  cartItemPrice: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#10b981',
    flex: 1,
    textAlign: 'right',
  },
  discountSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 4,
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
  cartTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
  },
  cartTotalLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
  },
  cartTotalOriginal: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    textAlign: 'right',
  },
  cartTotalAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#10b981',
  },
  checkoutButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  checkoutButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 15,
  },
  checkoutSummary: {
    marginBottom: 16,
  },
  checkoutLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#1f2937',
    marginBottom: 12,
  },
  checkoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  checkoutItemName: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
  },
  checkoutItemPrice: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#10b981',
  },
  checkoutDiscount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    marginTop: 4,
    paddingTop: 8,
  },
  checkoutDiscountLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#8b5cf6',
  },
  checkoutDiscountValue: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#8b5cf6',
  },
  checkoutDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  checkoutTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  checkoutTotalLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
  },
  checkoutTotalAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#10b981',
  },
  placeOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  placeOrderText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 15,
  },
  orderSuccess: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  orderSuccessText: {
    fontFamily: Fonts.Bold,
    fontSize: 24,
    color: '#1f2937',
  },
  orderSuccessSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 15,
    color: '#6b7280',
  },
  orderSuccessButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  orderSuccessButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },
});