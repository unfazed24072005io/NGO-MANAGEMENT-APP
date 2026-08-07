import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image, Modal, ActivityIndicator, Switch, RefreshControl, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, storage } from '../../config/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Fonts } from '../../config/fonts';

const FILTERS = ['All', 'Active', 'Inactive', 'Featured'];
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function ECommerceManagement({ navigation }) {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    images: [],
    featured: false,
    discount: '',
    status: 'active',
    sizes: [],
    discountType: 'percentage',
    shortDescription: '',
    material: '',
    weight: '',
    dimensions: '',
    color: ''
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderModalVisible, setOrderModalVisible] = useState(false);

  useEffect(() => {
    setupRealtimeListeners();
    fetchOrders();
    fetchInventory();
  }, []);

  const setupRealtimeListeners = () => {
    const unsubscribeProducts = onSnapshot(query(collection(db, 'products'), orderBy('createdAt', 'desc')), (snapshot) => {
      const productsList = [];
      snapshot.forEach((doc) => {
        productsList.push({ id: doc.id, ...doc.data() });
      });
      setProducts(productsList);
      applyFilters(productsList, searchQuery, activeFilter);
      setLoading(false);
    });

    const unsubscribeOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snapshot) => {
      const ordersList = [];
      snapshot.forEach((doc) => {
        ordersList.push({ id: doc.id, ...doc.data() });
      });
      setOrders(ordersList);
      applyOrderFilters(ordersList, searchQuery);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
    };
  };

  const fetchOrders = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'orders'));
      const ordersList = [];
      querySnapshot.forEach((doc) => {
        ordersList.push({ id: doc.id, ...doc.data() });
      });
      setOrders(ordersList);
      applyOrderFilters(ordersList, searchQuery);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const inventoryList = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        inventoryList.push({ 
          id: doc.id, 
          ...data,
          lowStock: data.stock && data.stock < 10
        });
      });
      setInventoryItems(inventoryList);
      applyInventoryFilters(inventoryList, searchQuery);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const applyFilters = (data, searchText, filter) => {
    let filtered = data;

    if (searchText) {
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchText.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchText.toLowerCase()) ||
        product.shortDescription?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (filter === 'Active') {
      filtered = filtered.filter(p => p.status === 'active');
    } else if (filter === 'Inactive') {
      filtered = filtered.filter(p => p.status === 'inactive');
    } else if (filter === 'Featured') {
      filtered = filtered.filter(p => p.featured === true);
    }

    setFilteredProducts(filtered);
  };

  const applyOrderFilters = (data, searchText) => {
    let filtered = data;
    if (searchText) {
      filtered = filtered.filter(order =>
        order.customerName?.toLowerCase().includes(searchText.toLowerCase()) ||
        order.customerEmail?.toLowerCase().includes(searchText.toLowerCase()) ||
        order.id?.toLowerCase().includes(searchText.toLowerCase()) ||
        order.items?.some(item => item.name?.toLowerCase().includes(searchText.toLowerCase()))
      );
    }
    setFilteredOrders(filtered);
  };

  const applyInventoryFilters = (data, searchText) => {
    let filtered = data;
    if (searchText) {
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.id?.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    setFilteredInventory(filtered);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (activeTab === 'products') {
      applyFilters(products, text, activeFilter);
    } else if (activeTab === 'orders') {
      applyOrderFilters(orders, text);
    } else if (activeTab === 'inventory') {
      applyInventoryFilters(inventoryItems, text);
    }
  };

  const handleFilterPress = (filter) => {
    setActiveFilter(filter);
    applyFilters(products, searchQuery, filter);
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your gallery');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      allowsMultipleSelection: true,
      base64: true,
    });

    if (!result.canceled) {
      const base64Images = result.assets.map(asset => 
        `data:image/jpeg;base64,${asset.base64}`
      );
      setFormData({ ...formData, images: [...formData.images, ...base64Images] });
    }
  };

  const removeImage = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
  };

  const toggleSize = (size) => {
    const currentSizes = formData.sizes || [];
    if (currentSizes.includes(size)) {
      setFormData({ ...formData, sizes: currentSizes.filter(s => s !== size) });
    } else {
      setFormData({ ...formData, sizes: [...currentSizes, size] });
    }
  };

  const calculateDiscountedPrice = (price, discount, discountType) => {
    const numPrice = parseFloat(price) || 0;
    const numDiscount = parseFloat(discount) || 0;
    if (discountType === 'percentage') {
      return numPrice - (numPrice * numDiscount / 100);
    } else {
      return numPrice - numDiscount;
    }
  };

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.price || !formData.category) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        shortDescription: formData.shortDescription,
        price: parseFloat(formData.price),
        category: formData.category,
        stock: parseInt(formData.stock) || 0,
        images: formData.images,
        featured: formData.featured,
        discount: parseFloat(formData.discount) || 0,
        discountType: formData.discountType,
        status: formData.status,
        sizes: formData.sizes || [],
        material: formData.material || '',
        weight: formData.weight || '',
        dimensions: formData.dimensions || '',
        color: formData.color || '',
        discountedPrice: calculateDiscountedPrice(formData.price, formData.discount, formData.discountType),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
        Alert.alert('Success', 'Product updated successfully');
      } else {
        await addDoc(collection(db, 'products'), productData);
        Alert.alert('Success', 'Product added successfully');
      }

      setModalVisible(false);
      resetForm();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'products', productId));
              Alert.alert('Success', 'Product deleted successfully');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      shortDescription: '',
      price: '',
      category: '',
      stock: '',
      images: [],
      featured: false,
      discount: '',
      discountType: 'percentage',
      status: 'active',
      sizes: [],
      material: '',
      weight: '',
      dimensions: '',
      color: ''
    });
    setEditingProduct(null);
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        status, 
        updatedAt: new Date().toISOString() 
      });
      Alert.alert('Success', `Order ${status} successfully`);
      setOrderModalVisible(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    await fetchInventory();
    setRefreshing(false);
  };

  const getFilterCount = (filter) => {
    if (filter === 'All') return products.length;
    if (filter === 'Active') return products.filter(p => p.status === 'active').length;
    if (filter === 'Inactive') return products.filter(p => p.status === 'inactive').length;
    if (filter === 'Featured') return products.filter(p => p.featured).length;
    return 0;
  };

  const StatCard = ({ label, count, icon, color, active, onPress }) => (
    <TouchableOpacity 
      style={[styles.statCard, active && styles.statCardActive]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.statIconCircle, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statType} numberOfLines={1}>{label}</Text>
      <Text style={[styles.statCount, { color }]}>{count}</Text>
    </TouchableOpacity>
  );

  const FilterChip = ({ label, active, onPress }) => (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const ProductCard = ({ product }) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        {product.images && product.images.length > 0 ? (
          <Image source={{ uri: product.images[0] }} style={styles.productImage} />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <MaterialIcons name="image" size={30} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.productCategory}>{product.category}</Text>
          <View style={styles.productPriceContainer}>
            {product.discount > 0 ? (
              <>
                <Text style={[styles.productPrice, styles.productPriceDiscounted]}>
                  ₹{product.discountedPrice?.toFixed(2) || product.price}
                </Text>
                <Text style={styles.productOriginalPrice}>₹{product.price}</Text>
              </>
            ) : (
              <Text style={styles.productPrice}>₹{product.price}</Text>
            )}
          </View>
          {product.shortDescription && (
            <Text style={styles.productShortDesc} numberOfLines={2}>
              {product.shortDescription}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.productFooter}>
        <View style={[styles.statusBadge, { backgroundColor: product.status === 'active' ? '#10b981' : '#ef4444' }]}>
          <Text style={styles.statusBadgeText}>{product.status}</Text>
        </View>
        <Text style={styles.productStock}>Stock: {product.stock || 0}</Text>
        {product.featured && (
          <View style={styles.featuredBadge}>
            <MaterialIcons name="star" size={12} color="#F59E0B" />
            <Text style={styles.featuredBadgeText}>Featured</Text>
          </View>
        )}
        {product.discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              {product.discountType === 'percentage' ? `-${product.discount}%` : `-₹${product.discount}`}
            </Text>
          </View>
        )}
        {product.sizes && product.sizes.length > 0 && (
          <View style={styles.sizesBadge}>
            <Text style={styles.sizesText}>{product.sizes.join(', ')}</Text>
          </View>
        )}
      </View>
      <View style={styles.productActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]} 
          onPress={() => {
            setEditingProduct(product);
            setFormData(product);
            setModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="edit" size={14} color="#ffffff" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]} 
          onPress={() => handleDeleteProduct(product.id)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="delete" size={14} color="#ffffff" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const OrderCard = ({ order }) => (
    <TouchableOpacity 
      style={styles.orderCard} 
      onPress={() => {
        setSelectedOrder(order);
        setOrderModalVisible(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Order #{order.id?.slice(0, 8)}</Text>
        <View style={[styles.orderStatusBadge, { 
          backgroundColor: order.status === 'completed' ? '#10b981' :
                          order.status === 'processing' ? '#f59e0b' :
                          order.status === 'cancelled' ? '#ef4444' : '#FF7722'
        }]}>
          <Text style={styles.orderStatusText}>{order.status || 'pending'}</Text>
        </View>
      </View>
      <Text style={styles.orderCustomer}>{order.customerName || 'Guest'}</Text>
      <Text style={styles.orderAmount}>₹{order.total || 0}</Text>
      <Text style={styles.orderDate}>
        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
      </Text>
    </TouchableOpacity>
  );

  const InventoryCard = ({ item }) => (
    <View style={styles.inventoryCard}>
      <View style={styles.inventoryHeader}>
        {item.images && item.images.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.inventoryImage} />
        ) : (
          <View style={styles.inventoryImagePlaceholder}>
            <MaterialIcons name="inventory" size={30} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.inventoryInfo}>
          <Text style={styles.inventoryName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.inventoryCategory}>{item.category}</Text>
          <Text style={styles.inventoryPrice}>₹{item.price}</Text>
          {item.sizes && item.sizes.length > 0 && (
            <Text style={styles.inventorySizes}>Sizes: {item.sizes.join(', ')}</Text>
          )}
        </View>
      </View>
      <View style={styles.inventoryFooter}>
        <View style={[styles.inventoryStockBadge, { 
          backgroundColor: item.lowStock ? '#ef4444' : '#10b981' 
        }]}>
          <Text style={styles.inventoryStockText}>
            {item.lowStock ? 'Low Stock' : 'In Stock'}
          </Text>
        </View>
        <Text style={styles.inventoryStockCount}>Stock: {item.stock || 0}</Text>
        <View style={[styles.statusBadge, { 
          backgroundColor: item.status === 'active' ? '#10b981' : '#ef4444' 
        }]}>
          <Text style={styles.statusBadgeText}>{item.status || 'inactive'}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Saffron Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>E-Commerce</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => {
              resetForm();
              setModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="add" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Search Bar inside header */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={18} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'products' ? "Search products..." :
              activeTab === 'orders' ? "Search orders..." :
              "Search inventory..."
            }
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={handleSearch}
            textAlignVertical="center"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <MaterialIcons name="close" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs inside header */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'products' && styles.activeTab]} 
            onPress={() => {
              setActiveTab('products');
              setActiveFilter('All');
              setSearchQuery('');
              handleSearch('');
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="inventory" size={16} color={activeTab === 'products' ? '#ffffff' : 'rgba(255,255,255,0.7)'} />
            <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>
              Products ({products.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'orders' && styles.activeTab]} 
            onPress={() => {
              setActiveTab('orders');
              setActiveFilter('All');
              setSearchQuery('');
              handleSearch('');
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="shopping-bag" size={16} color={activeTab === 'orders' ? '#ffffff' : 'rgba(255,255,255,0.7)'} />
            <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>
              Orders ({orders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'inventory' && styles.activeTab]} 
            onPress={() => {
              setActiveTab('inventory');
              setActiveFilter('All');
              setSearchQuery('');
              handleSearch('');
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="warehouse" size={16} color={activeTab === 'inventory' ? '#ffffff' : 'rgba(255,255,255,0.7)'} />
            <Text style={[styles.tabText, activeTab === 'inventory' && styles.activeTabText]}>
              Inventory
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stat Cards inside header - Only for Products tab */}
        {activeTab === 'products' && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.statsContainer}
            contentContainerStyle={styles.statsContent}
          >
            <StatCard 
              label="Total" 
              count={products.length} 
              icon="inventory" 
              color="#ffffff" 
              active={activeFilter === 'All'}
              onPress={() => handleFilterPress('All')}
            />
            <StatCard 
              label="Active" 
              count={products.filter(p => p.status === 'active').length} 
              icon="check-circle" 
              color="#ffffff"
              active={activeFilter === 'Active'}
              onPress={() => handleFilterPress('Active')}
            />
            <StatCard 
              label="Inactive" 
              count={products.filter(p => p.status === 'inactive').length} 
              icon="block" 
              color="#ffffff"
              active={activeFilter === 'Inactive'}
              onPress={() => handleFilterPress('Inactive')}
            />
            <StatCard 
              label="Featured" 
              count={products.filter(p => p.featured).length} 
              icon="star" 
              color="#ffffff"
              active={activeFilter === 'Featured'}
              onPress={() => handleFilterPress('Featured')}
            />
          </ScrollView>
        )}
      </View>

      {/* Content */}
      <FlatList
        data={
          activeTab === 'products' ? filteredProducts : 
          activeTab === 'orders' ? filteredOrders : 
          filteredInventory
        }
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => 
          activeTab === 'products' ? <ProductCard product={item} /> : 
          activeTab === 'orders' ? <OrderCard order={item} /> : 
          <InventoryCard item={item} />
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF7722']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons 
              name={activeTab === 'products' ? 'inventory' : 
                    activeTab === 'orders' ? 'shopping-bag' : 'warehouse'} 
              size={44} 
              color="#D1D5DB" 
            />
            <Text style={styles.emptyStateText}>
              {activeTab === 'products' ? 'No products found' : 
               activeTab === 'orders' ? 'No orders found' : 'No inventory items found'}
            </Text>
            {activeTab === 'products' && (
              <TouchableOpacity 
                style={styles.emptyBtn} 
                onPress={() => {
                  resetForm();
                  setModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.emptyBtnText}>Add your first product</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Add/Edit Product Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Product Name *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.name}
                onChangeText={(text) => setFormData({...formData, name: text})}
                placeholder="Enter product name"
                textAlignVertical="center"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Short Description</Text>
              <TextInput
                style={styles.formInput}
                value={formData.shortDescription}
                onChangeText={(text) => setFormData({...formData, shortDescription: text})}
                placeholder="Brief description for product listing"
                maxLength={100}
                textAlignVertical="center"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Detailed Description</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({...formData, description: text})}
                placeholder="Full product description, features, benefits..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Price *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.price}
                  onChangeText={(text) => setFormData({...formData, price: text})}
                  placeholder="₹"
                  keyboardType="numeric"
                  textAlignVertical="center"
                />
              </View>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Stock</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.stock}
                  onChangeText={(text) => setFormData({...formData, stock: text})}
                  placeholder="0"
                  keyboardType="numeric"
                  textAlignVertical="center"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Category *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.category}
                  onChangeText={(text) => setFormData({...formData, category: text})}
                  placeholder="Category"
                  textAlignVertical="center"
                />
              </View>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Color</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.color}
                  onChangeText={(text) => setFormData({...formData, color: text})}
                  placeholder="e.g., Black, Blue"
                  textAlignVertical="center"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Discount</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.discount}
                  onChangeText={(text) => setFormData({...formData, discount: text})}
                  placeholder="0"
                  keyboardType="numeric"
                  textAlignVertical="center"
                />
              </View>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Discount Type</Text>
                <View style={styles.discountTypeContainer}>
                  <TouchableOpacity 
                    style={[styles.discountTypeOption, formData.discountType === 'percentage' && styles.discountTypeActive]}
                    onPress={() => setFormData({...formData, discountType: 'percentage'})}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.discountTypeText, formData.discountType === 'percentage' && styles.discountTypeTextActive]}>%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.discountTypeOption, formData.discountType === 'fixed' && styles.discountTypeActive]}
                    onPress={() => setFormData({...formData, discountType: 'fixed'})}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.discountTypeText, formData.discountType === 'fixed' && styles.discountTypeTextActive]}>₹</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Available Sizes</Text>
              <View style={styles.sizesContainer}>
                {SIZE_OPTIONS.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.sizeOption,
                      (formData.sizes || []).includes(size) && styles.sizeOptionActive
                    ]}
                    onPress={() => toggleSize(size)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.sizeOptionText,
                      (formData.sizes || []).includes(size) && styles.sizeOptionTextActive
                    ]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Material</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.material}
                  onChangeText={(text) => setFormData({...formData, material: text})}
                  placeholder="e.g., Cotton, Leather"
                  textAlignVertical="center"
                />
              </View>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Weight (g)</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.weight}
                  onChangeText={(text) => setFormData({...formData, weight: text})}
                  placeholder="e.g., 250"
                  keyboardType="numeric"
                  textAlignVertical="center"
                />
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Dimensions</Text>
              <TextInput
                style={styles.formInput}
                value={formData.dimensions}
                onChangeText={(text) => setFormData({...formData, dimensions: text})}
                placeholder="e.g., 10x15x5 cm"
                textAlignVertical="center"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Images</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImages} activeOpacity={0.7}>
                <MaterialIcons name="photo-library" size={20} color="#FF7722" />
                <Text style={styles.uploadButtonText}>Upload Images</Text>
              </TouchableOpacity>
              <View style={styles.imagePreviewContainer}>
                {formData.images.map((uri, index) => (
                  <View key={index} style={styles.imagePreviewWrapper}>
                    <Image source={{ uri }} style={styles.imagePreview} />
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="close" size={12} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Status</Text>
                <View style={styles.switchContainer}>
                  <TouchableOpacity 
                    style={[styles.statusOption, formData.status === 'active' && styles.statusOptionActive]}
                    onPress={() => setFormData({...formData, status: 'active'})}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.statusOptionText, formData.status === 'active' && styles.statusOptionTextActive]}>
                      Active
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.statusOption, formData.status === 'inactive' && styles.statusOptionActive]}
                    onPress={() => setFormData({...formData, status: 'inactive'})}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.statusOptionText, formData.status === 'inactive' && styles.statusOptionTextActive]}>
                      Inactive
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.formField, styles.formHalf]}>
                <Text style={styles.formLabel}>Featured</Text>
                <View style={styles.switchWrapper}>
                  <Switch
                    value={formData.featured}
                    onValueChange={(value) => setFormData({...formData, featured: value})}
                    trackColor={{ false: '#767577', true: '#FF7722' }}
                    thumbColor={formData.featured ? '#ffffff' : '#f4f3f4'}
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSaveProduct} disabled={loading} activeOpacity={0.7}>
              <Text style={styles.submitButtonText}>
                {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Order Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={orderModalVisible}
        onRequestClose={() => setOrderModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setOrderModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.orderDetailField}>
                  <Text style={styles.orderDetailLabel}>Order ID</Text>
                  <Text style={styles.orderDetailValue}>#{selectedOrder.id?.slice(0, 8)}</Text>
                </View>

                <View style={styles.orderDetailField}>
                  <Text style={styles.orderDetailLabel}>Customer</Text>
                  <Text style={styles.orderDetailValue}>{selectedOrder.customerName || 'Guest'}</Text>
                </View>

                <View style={styles.orderDetailField}>
                  <Text style={styles.orderDetailLabel}>Email</Text>
                  <Text style={styles.orderDetailValue}>{selectedOrder.customerEmail || 'N/A'}</Text>
                </View>

                <View style={styles.orderDetailField}>
                  <Text style={styles.orderDetailLabel}>Total Amount</Text>
                  <Text style={[styles.orderDetailValue, styles.orderAmountLarge]}>₹{selectedOrder.total || 0}</Text>
                </View>

                <View style={styles.orderDetailField}>
                  <Text style={styles.orderDetailLabel}>Status</Text>
                  <View style={[styles.orderStatusBadge, { 
                    backgroundColor: selectedOrder.status === 'completed' ? '#10b981' :
                                    selectedOrder.status === 'processing' ? '#f59e0b' :
                                    selectedOrder.status === 'cancelled' ? '#ef4444' : '#FF7722',
                    alignSelf: 'flex-start'
                  }]}>
                    <Text style={styles.orderStatusText}>{selectedOrder.status || 'pending'}</Text>
                  </View>
                </View>

                <View style={styles.orderDetailField}>
                  <Text style={styles.orderDetailLabel}>Items</Text>
                  {selectedOrder.items?.map((item, index) => (
                    <View key={index} style={styles.orderItem}>
                      <Text style={styles.orderItemName}>{item.name}</Text>
                      <Text style={styles.orderItemQty}>x{item.quantity}</Text>
                      <Text style={styles.orderItemPrice}>₹{item.price}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.orderActionsContainer}>
                  {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                    <>
                      <TouchableOpacity 
                        style={[styles.orderActionButton, styles.orderActionComplete]}
                        onPress={() => updateOrderStatus(selectedOrder.id, 'completed')}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="check-circle" size={16} color="#ffffff" />
                        <Text style={styles.orderActionText}>Complete</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.orderActionButton, styles.orderActionCancel]}
                        onPress={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="cancel" size={16} color="#ffffff" />
                        <Text style={styles.orderActionText}>Cancel</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {selectedOrder.status === 'pending' && (
                    <TouchableOpacity 
                      style={[styles.orderActionButton, styles.orderActionProcess]}
                      onPress={() => updateOrderStatus(selectedOrder.id, 'processing')}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="settings" size={16} color="#ffffff" />
                      <Text style={styles.orderActionText}>Process</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf8f3',
  },

  // Saffron Header
  headerCard: {
    backgroundColor: '#FF7722',
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
    marginBottom: 12,
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
  addButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  // Tabs inside header
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  activeTabText: {
    color: '#ffffff',
  },

  // Search inside header
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Stats inside header
  statsContainer: {
    maxHeight: 65,
    marginBottom: 8,
  },
  statsContent: {
    gap: 8,
    alignItems: 'center',
    paddingVertical: 2,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 6,
    minWidth: 70,
    width: 75,
    alignItems: 'center',
    justifyContent: 'center',
    height: 58,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statCardActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderColor: '#ffffff',
  },
  statIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  statType: {
    fontFamily: Fonts.Regular,
    fontSize: 8,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statCount: {
    fontFamily: Fonts.Bold,
    fontSize: 13,
    color: '#ffffff',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Filter Chips inside header
  filterContainer: {
    maxHeight: 36,
  },
  filterContent: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  filterChipActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  filterChipText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  filterChipTextActive: {
    color: '#FF7722',
  },

  // List Content
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 4,
  },

  // Product Card
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1F2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  productCategory: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  productShortDesc: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  productPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  productPrice: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#10B981',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  productPriceDiscounted: {
    color: '#059669',
  },
  productOriginalPrice: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
    flexWrap: 'wrap',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 10,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  productStock: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6B7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  featuredBadgeText: {
    fontFamily: Fonts.SemiBold,
    color: '#F59E0B',
    fontSize: 10,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  discountBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  discountText: {
    fontFamily: Fonts.Bold,
    color: '#ffffff',
    fontSize: 10,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  sizesBadge: {
    backgroundColor: '#FFF5EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  sizesText: {
    fontFamily: Fonts.Regular,
    color: '#FF7722',
    fontSize: 10,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  editButton: {
    backgroundColor: '#FF7722',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Order Card
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderId: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1F2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  orderStatusText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 10,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderCustomer: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6B7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#10B981',
    marginTop: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderDate: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Inventory Card
  inventoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inventoryHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  inventoryImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  inventoryImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inventoryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  inventoryName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1F2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  inventoryCategory: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  inventoryPrice: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#10B981',
    marginTop: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  inventorySizes: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  inventoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
    flexWrap: 'wrap',
    gap: 4,
  },
  inventoryStockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  inventoryStockText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 10,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  inventoryStockCount: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6B7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyStateText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#6B7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FF7722',
  },
  emptyBtnText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Modal
  modalContainer: {
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
    color: '#1F2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  formField: {
    marginBottom: 12,
  },
  formLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
    fontFamily: Fonts.Regular,
    includeFontPadding: false,
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formHalf: {
    width: '48%',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5EB',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD4B3',
    borderStyle: 'dashed',
    gap: 8,
  },
  uploadButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#FF7722',
    fontSize: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  imagePreviewWrapper: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  switchWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 4,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusOptionActive: {
    backgroundColor: '#FF7722',
    borderColor: '#FF7722',
  },
  statusOptionText: {
    fontFamily: Fonts.SemiBold,
    color: '#6B7280',
    fontSize: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statusOptionTextActive: {
    color: '#ffffff',
  },
  sizesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  sizeOptionActive: {
    backgroundColor: '#FF7722',
    borderColor: '#FF7722',
  },
  sizeOptionText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6B7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  sizeOptionTextActive: {
    color: '#ffffff',
  },
  discountTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  discountTypeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  discountTypeActive: {
    backgroundColor: '#FF7722',
    borderColor: '#FF7722',
  },
  discountTypeText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#6B7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  discountTypeTextActive: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Order Detail Modal
  orderDetailField: {
    marginBottom: 12,
  },
  orderDetailLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderDetailValue: {
    fontFamily: Fonts.Regular,
    fontSize: 16,
    color: '#1F2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderAmountLarge: {
    fontFamily: Fonts.Bold,
    fontSize: 24,
    color: '#10B981',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  orderItemName: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderItemQty: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6B7280',
    marginHorizontal: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderItemPrice: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#10B981',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  orderActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  orderActionComplete: {
    backgroundColor: '#10B981',
  },
  orderActionCancel: {
    backgroundColor: '#EF4444',
  },
  orderActionProcess: {
    backgroundColor: '#F59E0B',
  },
  orderActionText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 13,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});