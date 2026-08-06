// screens/member/MemberECommerce.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image, Modal, ActivityIndicator, RefreshControl, FlatList, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, addDoc, doc, query, where, orderBy, onSnapshot, getDoc, updateDoc, increment } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { Fonts } from '../../config/fonts';
import Swiper from 'react-native-swiper';
import { 
  initiateRazorpayPayment, 
  createRazorpayOrder, 
  verifyRazorpayPayment 
} from '../../services/paymentService';
const { width } = Dimensions.get('window');

export default function MemberECommerce({ navigation }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
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

  const handleViewCart = () => {
    navigation.navigate('CartScreen', { cart });
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Cart Empty', 'Please add items to your cart');
      return;
    }
    navigation.navigate('CheckoutScreen', { cart });
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
        <ActivityIndicator size="large" color="#3b82f6" />
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
  onPress={() => navigation.navigate('MemberTabs', { screen: 'Orders' })}  // ✅ Navigate to Orders tab
>
              <MaterialIcons name="receipt" size={18} color="#ffffff" />
              <Text style={styles.ordersButtonText}>Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileIcon}
              onPress={() => navigation.navigate('MemberProfile')}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
              ) : (
                <MaterialIcons name="person" size={28} color="#3b82f6" />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
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
        onPress={handleViewCart}
      >
        <MaterialIcons name="shopping-cart" size={24} color="#ffffff" />
        {cart.length > 0 && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cart.reduce((total, item) => total + item.quantity, 0)}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// All styles remain EXACTLY the same as your original file
// ... (keep all your existing styles)
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
    backgroundColor: '#3b82f6',
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
    color: '#3b82f6',
  },
  categoryChipCount: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  categoryChipCountActive: {
    color: '#3b82f6',
  },

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

  addToCartButton: {
    backgroundColor: '#3b82f6',
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

  quantitySelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
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

  listContent: {
    paddingVertical: 12,
  },

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

  cartFloatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#3b82f6',
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
});