// screens/ShopScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '../config/firebase';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { Fonts } from '../config/fonts';

const { width } = Dimensions.get('window');

export default function ShopScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const categories = ['All', 'Books', 'Clothing', 'Accessories', 'Food', 'Other'];

  useEffect(() => {
    setupRealtimeListener();
  }, []);

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

  const showLoginModal = (product) => {
    setSelectedProduct(product);
    setLoginModalVisible(true);
  };

  const handleProductPress = (product) => {
    showLoginModal(product);
  };

  const handleAddToCart = (product) => {
    showLoginModal(product);
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
        <Text style={[styles.categoryChipLabel, selectedCategory === label && styles.categoryChipLabelActive]}>
          {label}
        </Text>
        <Text style={[styles.categoryChipCount, selectedCategory === label && styles.categoryChipCountActive]}>
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const ProductCard = ({ product }) => {
    const hasWholesalePrice = product.wholesalePrice && product.wholesalePrice > 0;
    
    return (
      <View style={styles.productCard}>
        <TouchableOpacity 
          style={styles.productCardInner}
          onPress={() => handleProductPress(product)}
          activeOpacity={0.9}
        >
          {product.image ? (
            <Image source={{ uri: product.image }} style={styles.productCardImage} resizeMode="cover" />
          ) : (
            <View style={styles.productCardImagePlaceholder}>
              <MaterialIcons name="image" size={35} color="#9ca3af" />
            </View>
          )}
          
          <Text style={styles.productCardName} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.productCardDescription} numberOfLines={2}>
            {product.shortDescription || product.category || 'Product'}
          </Text>
          <Text style={styles.productCardPrice}>₹{product.price}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.addToCartButton, (product.stock === 0) && styles.disabledButton]}
          onPress={() => handleAddToCart(product)}
          disabled={product.stock === 0}
        >
          <Text style={styles.addToCartButtonText}>
            {product.stock === 0 ? 'Out of Stock' : 'Add'}
          </Text>
        </TouchableOpacity>
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
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Shop</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Shop</Text>
          </View>
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
        </View>

        <View style={styles.emptyState}>
          <MaterialIcons name="inventory" size={60} color="#d1d5db" />
          <Text style={styles.emptyStateText}>No Products Available</Text>
          <Text style={styles.emptyStateSubtext}>Please check back later</Text>
        </View>

        {/* Login Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={loginModalVisible}
          onRequestClose={() => setLoginModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalIconContainer}>
                <MaterialIcons name="lock" size={50} color="#3b82f6" />
              </View>
              <Text style={styles.modalTitle}>Login Required</Text>
              <Text style={styles.modalMessage}>
                Please login to add items to cart and make purchases
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setLoginModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalLoginButton]}
                  onPress={() => {
                    setLoginModalVisible(false);
                    navigation.navigate('Login');
                  }}
                >
                  <Text style={styles.modalLoginText}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Shop</Text>
        </View>

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

      {/* Login Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={loginModalVisible}
        onRequestClose={() => setLoginModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <MaterialIcons name="lock" size={50} color="#3b82f6" />
            </View>
            <Text style={styles.modalTitle}>Login Required</Text>
            <Text style={styles.modalMessage}>
              Please login to add items to cart and make purchases
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setLoginModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalLoginButton]}
                onPress={() => {
                  setLoginModalVisible(false);
                  navigation.navigate('Login');
                }}
              >
                <Text style={styles.modalLoginText}>Login</Text>
              </TouchableOpacity>
            </View>
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

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Fonts.Regular,
    marginTop: 10,
    color: '#6b7280',
  },

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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#ffffff',
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

  // Product Card - Horizontal scroll style
  productCard: {
    width: 170,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
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
  productCardPrice: {
    fontFamily: Fonts.Bold,
    fontSize: 17,
    color: '#10b981',
    marginTop: 6,
  },

  // Add to Cart Button
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

  listContent: {
    paddingVertical: 12,
  },

  emptyState: {
    flex: 1,
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 30,
    width: '90%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#1f2937',
    marginBottom: 8,
  },
  modalMessage: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f3f4f6',
  },
  modalCancelText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#6b7280',
  },
  modalLoginButton: {
    backgroundColor: '#3b82f6',
  },
  modalLoginText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#ffffff',
  },
});