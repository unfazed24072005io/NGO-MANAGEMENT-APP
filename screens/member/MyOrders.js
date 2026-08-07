// screens/member/MyOrders.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator, RefreshControl, FlatList, Modal, Share } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, query, where, orderBy, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';
import { getDonationById } from '../../services/paymentService';

export default function MyOrders({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);

  const statusFilters = ['All', 'pending', 'processing', 'completed', 'cancelled'];

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
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = [];
      snapshot.forEach((doc) => {
        ordersList.push({ id: doc.id, ...doc.data() });
      });
      setOrders(ordersList);
      applyFilters(ordersList, filterStatus);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const applyFilters = (data, status) => {
    let filtered = data;
    if (status !== 'All') {
      filtered = filtered.filter(order => order.status === status);
    }
    setFilteredOrders(filtered);
  };

  const handleFilterPress = (status) => {
    setFilterStatus(status);
    applyFilters(orders, status);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return '#f59e0b';
      case 'processing': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending': return 'pending';
      case 'processing': return 'settings';
      case 'completed': return 'check-circle';
      case 'cancelled': return 'cancel';
      default: return 'circle';
    }
  };

  const getPaymentMethodIcon = (method) => {
    if (method?.toLowerCase().includes('razorpay')) {
      return 'payment';
    }
    return 'credit-card';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toLocaleString('en-IN')}`;
  };

  const handleViewPaymentDetails = async (order) => {
    if (order.paymentId) {
      const payment = getDonationById(order.paymentId);
      if (payment) {
        setPaymentDetails(payment);
        Alert.alert(
          'Payment Details',
          `Payment ID: ${payment.paymentId}\nOrder ID: ${payment.orderId}\nAmount: ${formatCurrency(payment.amount)}\nStatus: ${payment.status || 'Completed'}\nDate: ${formatDate(payment.timestamp)}`
        );
        return;
      }
    }
    
    Alert.alert(
      'Payment Information',
      `Payment Method: ${order.paymentMethod || 'Razorpay'}\nPayment ID: ${order.paymentId || 'N/A'}\nOrder ID: ${order.orderId || order.id}\nAmount: ${formatCurrency(order.total)}\nStatus: ${order.status || 'Pending'}\nDate: ${formatDate(order.createdAt)}`
    );
  };

  const handleShareOrder = async (order) => {
    try {
      const itemsList = order.items?.map(item => 
        `${item.name} x${item.quantity} = ${formatCurrency(item.total || item.price * item.quantity)}`
      ).join('\n') || 'No items';

      const message = 
`📦 Order Details
─────────────────────
Order #: ${order.orderId?.slice(-10).toUpperCase() || order.id?.slice(0, 8).toUpperCase()}
Date: ${formatDate(order.createdAt)}
Status: ${order.status || 'pending'}
Type: ${order.orderType || 'Retail'}

Items:
${itemsList}

Subtotal: ${formatCurrency(order.subtotal || order.total)}
${order.discount > 0 ? `Discount: ${order.discount}%\nTotal: ${formatCurrency(order.total)}` : `Total: ${formatCurrency(order.total)}`}

Payment: ${order.paymentMethod || 'Razorpay'}
Payment ID: ${order.paymentId || 'N/A'}

Delivery Details:
${order.customerName || 'N/A'}
${order.customerPhone || 'N/A'}
${order.deliveryAddress || 'N/A'}

Thank you for your order! 🙏`;

      await Share.share({
        message: message,
        title: `Order ${order.orderId?.slice(-10) || 'Details'}`,
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share order');
    }
  };

  const StatCard = ({ label, count, icon, color }) => (
    <TouchableOpacity 
      style={[styles.statCard, filterStatus === label && styles.statCardActive]}
      onPress={() => {
        const statusMap = {
          'Total': 'All',
          'Pending': 'pending',
          'Processing': 'processing',
          'Completed': 'completed',
          'Cancelled': 'cancelled'
        };
        handleFilterPress(statusMap[label] || label);
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={16} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{count}</Text>
      </View>
    </TouchableOpacity>
  );

  const OrderCard = ({ order }) => {
    const statusColor = getStatusColor(order.status);
    const statusIcon = getStatusIcon(order.status);
    const itemCount = order.items?.length || 0;
    const discount = order.discount || 0;

    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => {
          setSelectedOrder(order);
          setDetailModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderId}>
              #{order.orderId?.slice(-10).toUpperCase() || order.id?.slice(0, 8).toUpperCase()}
            </Text>
            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={[styles.orderStatusBadge, { backgroundColor: statusColor + '15' }]}>
            <MaterialIcons name={statusIcon} size={12} color={statusColor} />
            <Text style={[styles.orderStatusText, { color: statusColor }]}>
              {order.status || 'pending'}
            </Text>
          </View>
        </View>

        <View style={styles.orderBody}>
          <View>
            <Text style={styles.orderItems} numberOfLines={1}>
              {itemCount} item{itemCount > 1 ? 's' : ''}
            </Text>
            {discount > 0 && (
              <Text style={styles.orderDiscount}>
                {discount}% off
              </Text>
            )}
          </View>
          <View style={styles.orderPriceContainer}>
            {discount > 0 && (
              <Text style={styles.orderOriginalPrice}>
                {formatCurrency(order.subtotal || order.total)}
              </Text>
            )}
            <Text style={styles.orderTotal}>{formatCurrency(order.total || 0)}</Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.orderPaymentInfo}>
            <MaterialIcons 
              name={getPaymentMethodIcon(order.paymentMethod)} 
              size={14} 
              color="#6b7280" 
            />
            <Text style={styles.orderPayment}>
              {order.paymentMethod || 'Razorpay'}
            </Text>
            {order.paymentId && (
              <View style={styles.paymentIdBadge}>
                <Text style={styles.paymentIdText}>
                  {order.paymentId.slice(0, 8)}...
                </Text>
              </View>
            )}
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
        </View>
      </TouchableOpacity>
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getStats = () => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const processing = orders.filter(o => o.status === 'processing').length;
    const completed = orders.filter(o => o.status === 'completed').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    return { total, pending, processing, completed, cancelled };
  };

  const stats = getStats();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading Orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Blue Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
              <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Orders</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileIcon}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.7}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
            ) : (
              <MaterialIcons name="person" size={26} color="#3b82f6" />
            )}
          </TouchableOpacity>
        </View>

        {/* Stat Cards inside header */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.statsContainer}
          contentContainerStyle={styles.statsContent}
        >
          <StatCard label="Total" count={stats.total} icon="receipt" color="#ffffff" />
          <StatCard label="Pending" count={stats.pending} icon="pending" color="#f59e0b" />
          <StatCard label="Processing" count={stats.processing} icon="settings" color="#3b82f6" />
          <StatCard label="Completed" count={stats.completed} icon="check-circle" color="#10b981" />
          <StatCard label="Cancelled" count={stats.cancelled} icon="cancel" color="#ef4444" />
        </ScrollView>
      </View>

      {/* Filter Status Indicator */}
      {filterStatus !== 'All' && (
        <View style={styles.filterIndicator}>
          <Text style={styles.filterIndicatorText}>
            Showing: <Text style={styles.filterIndicatorHighlight}>{filterStatus}</Text> orders
          </Text>
          <TouchableOpacity onPress={() => handleFilterPress('All')} activeOpacity={0.7}>
            <Text style={styles.filterClear}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="receipt" size={60} color="#d1d5db" />
          <Text style={styles.emptyStateText}>
            {filterStatus !== 'All' ? `No ${filterStatus} orders` : 'No orders yet'}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {filterStatus !== 'All' ? 'Try changing the filter' : 'Your orders will appear here'}
          </Text>
          {filterStatus === 'All' && (
            <TouchableOpacity 
              style={styles.shopButton}
              onPress={() => navigation.navigate('Shop')}
              activeOpacity={0.7}
            >
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </TouchableOpacity>
          )}
          {filterStatus !== 'All' && (
            <TouchableOpacity 
              style={styles.shopButton}
              onPress={() => handleFilterPress('All')}
              activeOpacity={0.7}
            >
              <Text style={styles.shopButtonText}>View All Orders</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OrderCard order={item} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Enhanced Order Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => {
          setDetailModalVisible(false);
          setPaymentDetails(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => {
                setDetailModalVisible(false);
                setPaymentDetails(null);
              }} activeOpacity={0.7}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Order Header with Status */}
                <View style={styles.modalOrderHeader}>
                  <View style={styles.modalOrderInfo}>
                    <View>
                      <Text style={styles.modalOrderId}>
                        #{selectedOrder.orderId?.slice(-10).toUpperCase() || selectedOrder.id?.slice(0, 8).toUpperCase()}
                      </Text>
                      <Text style={styles.modalOrderDate}>
                        {formatDate(selectedOrder.createdAt)}
                      </Text>
                    </View>
                    <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedOrder.status) + '15' }]}>
                      <MaterialIcons name={getStatusIcon(selectedOrder.status)} size={14} color={getStatusColor(selectedOrder.status)} />
                      <Text style={[styles.modalStatusText, { color: getStatusColor(selectedOrder.status) }]}>
                        {selectedOrder.status || 'pending'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.modalOrderTypeBadge}>
                    <MaterialIcons name={selectedOrder.orderType === 'wholesale' ? 'store' : 'shopping-bag'} size={14} color="#ffffff" />
                    <Text style={styles.modalOrderTypeText}>
                      {selectedOrder.orderType || 'Retail'}
                    </Text>
                  </View>
                </View>

                {/* Order Summary Cards */}
                <View style={styles.modalSummaryGrid}>
                  <View style={styles.modalSummaryCard}>
                    <Text style={styles.modalSummaryValue}>
                      {selectedOrder.items?.length || 0}
                    </Text>
                    <Text style={styles.modalSummaryLabel}>Items</Text>
                  </View>
                  <View style={styles.modalSummaryCard}>
                    <Text style={styles.modalSummaryValue}>
                      {formatCurrency(selectedOrder.total || 0)}
                    </Text>
                    <Text style={styles.modalSummaryLabel}>Total</Text>
                  </View>
                  <View style={styles.modalSummaryCard}>
                    <Text style={styles.modalSummaryValue}>
                      {selectedOrder.discount || 0}%
                    </Text>
                    <Text style={styles.modalSummaryLabel}>Discount</Text>
                  </View>
                </View>

                {/* Order Items Section */}
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeader}>
                    <Text style={styles.modalSectionTitle}>Order Items</Text>
                    <Text style={styles.modalSectionCount}>
                      {selectedOrder.items?.length || 0} items
                    </Text>
                  </View>
                  {selectedOrder.items?.map((item, index) => (
                    <View key={index} style={styles.modalItem}>
                      <View style={styles.modalItemImageContainer}>
                        {item.images && item.images.length > 0 ? (
                          <Image source={{ uri: item.images[0] }} style={styles.modalItemImage} />
                        ) : (
                          <View style={styles.modalItemImagePlaceholder}>
                            <MaterialIcons name="image" size={18} color="#d1d5db" />
                          </View>
                        )}
                      </View>
                      <View style={styles.modalItemInfo}>
                        <Text style={styles.modalItemName} numberOfLines={2}>{item.name}</Text>
                        <Text style={styles.modalItemQty}>Qty: {item.quantity}</Text>
                      </View>
                      <View style={styles.modalItemPriceInfo}>
                        <Text style={styles.modalItemUnitPrice}>₹{item.price} × {item.quantity}</Text>
                        <Text style={styles.modalItemTotal}>
                          {formatCurrency(item.total || item.price * item.quantity)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Price Breakdown */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Price Breakdown</Text>
                  <View style={styles.modalPriceRow}>
                    <Text style={styles.modalPriceLabel}>Subtotal</Text>
                    <Text style={styles.modalPriceValue}>
                      {formatCurrency(selectedOrder.subtotal || selectedOrder.total)}
                    </Text>
                  </View>
                  {selectedOrder.discount > 0 && (
                    <View style={styles.modalPriceRow}>
                      <Text style={styles.modalPriceLabelDiscount}>Discount ({selectedOrder.discount}%)</Text>
                      <Text style={styles.modalPriceValueDiscount}>
                        -{formatCurrency((selectedOrder.subtotal || selectedOrder.total) * (selectedOrder.discount / 100))}
                      </Text>
                    </View>
                  )}
                  {selectedOrder.deliveryCharge > 0 && (
                    <View style={styles.modalPriceRow}>
                      <Text style={styles.modalPriceLabel}>Delivery Charge</Text>
                      <Text style={styles.modalPriceValue}>
                        {formatCurrency(selectedOrder.deliveryCharge)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.modalPriceDivider} />
                  <View style={[styles.modalPriceRow, styles.modalPriceTotalRow]}>
                    <Text style={styles.modalPriceTotalLabel}>Grand Total</Text>
                    <Text style={styles.modalPriceTotalValue}>
                      {formatCurrency(selectedOrder.total || 0)}
                    </Text>
                  </View>
                </View>

                {/* Delivery Information */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Delivery Information</Text>
                  <View style={styles.modalInfoCard}>
                    <View style={styles.modalInfoRow}>
                      <MaterialIcons name="person" size={16} color="#6b7280" />
                      <Text style={styles.modalInfoLabel}>Name</Text>
                      <Text style={styles.modalInfoValue}>{selectedOrder.customerName || 'N/A'}</Text>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <MaterialIcons name="phone" size={16} color="#6b7280" />
                      <Text style={styles.modalInfoLabel}>Phone</Text>
                      <Text style={styles.modalInfoValue}>{selectedOrder.customerPhone || 'N/A'}</Text>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <MaterialIcons name="location-on" size={16} color="#6b7280" />
                      <Text style={styles.modalInfoLabel}>Address</Text>
                      <Text style={[styles.modalInfoValue, styles.modalInfoAddress]}>
                        {selectedOrder.deliveryAddress || 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Payment Details */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Payment Details</Text>
                  <View style={styles.modalInfoCard}>
                    <View style={styles.modalInfoRow}>
                      <MaterialIcons name={getPaymentMethodIcon(selectedOrder.paymentMethod)} size={16} color="#6b7280" />
                      <Text style={styles.modalInfoLabel}>Method</Text>
                      <Text style={styles.modalInfoValue}>{selectedOrder.paymentMethod || 'Razorpay'}</Text>
                    </View>
                    {selectedOrder.paymentId && (
                      <View style={styles.modalInfoRow}>
                        <MaterialIcons name="credit-card" size={16} color="#6b7280" />
                        <Text style={styles.modalInfoLabel}>Payment ID</Text>
                        <Text style={[styles.modalInfoValue, styles.modalInfoMono]}>
                          {selectedOrder.paymentId}
                        </Text>
                      </View>
                    )}
                    <View style={styles.modalInfoRow}>
                      <MaterialIcons name="date-range" size={16} color="#6b7280" />
                      <Text style={styles.modalInfoLabel}>Date</Text>
                      <Text style={styles.modalInfoValue}>{formatDate(selectedOrder.createdAt)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.viewPaymentButton}
                    onPress={() => handleViewPaymentDetails(selectedOrder)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="visibility" size={16} color="#3b82f6" />
                    <Text style={styles.viewPaymentButtonText}>View Full Payment Details</Text>
                  </TouchableOpacity>
                </View>

                {/* Action Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.modalActionButton, styles.modalActionShare]}
                    onPress={() => handleShareOrder(selectedOrder)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="share" size={18} color="#ffffff" />
                    <Text style={styles.modalActionText}>Share</Text>
                  </TouchableOpacity>
                  {selectedOrder.status === 'pending' && (
                    <TouchableOpacity 
                      style={[styles.modalActionButton, styles.modalActionCancel]}
                      onPress={() => {
                        Alert.alert(
                          'Cancel Order',
                          'Are you sure you want to cancel this order?',
                          [
                            { text: 'No', style: 'cancel' },
                            { 
                              text: 'Yes, Cancel', 
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  const orderRef = doc(db, 'orders', selectedOrder.id);
                                  await updateDoc(orderRef, {
                                    status: 'cancelled',
                                    updatedAt: new Date().toISOString()
                                  });
                                  Alert.alert('Success', 'Order cancelled successfully');
                                  setDetailModalVisible(false);
                                } catch (error) {
                                  Alert.alert('Error', 'Failed to cancel order');
                                }
                              }
                            }
                          ]
                        );
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="cancel" size={18} color="#ffffff" />
                      <Text style={styles.modalActionText}>Cancel Order</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => {
                    setDetailModalVisible(false);
                    setPaymentDetails(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCloseButtonText}>Close</Text>
                </TouchableOpacity>
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
    backgroundColor: '#f8fafc',
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
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  profileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  statsContainer: { 
    maxHeight: 72,
  },
  statsContent: { 
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 6,
    minWidth: 62,
    width: 68,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: 62,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statCardActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderColor: '#ffffff',
  },
  statContent: { 
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  statLabel: { 
    fontFamily: Fonts.Regular,
    fontSize: 7, 
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statValue: { 
    fontFamily: Fonts.Bold,
    fontSize: 13, 
    color: '#ffffff',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statIcon: { 
    width: 22, 
    height: 22, 
    borderRadius: 11, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 1,
  },

  filterIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterIndicatorText: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  filterIndicatorHighlight: {
    fontFamily: Fonts.SemiBold,
    color: '#3b82f6',
  },
  filterClear: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#3b82f6',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontFamily: Fonts.Regular,
    marginTop: 10,
    color: '#6b7280',
    fontSize: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 10,
  },

  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderIdContainer: {
    flex: 1,
  },
  orderId: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderDate: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  orderStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  orderItems: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderDiscount: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#8b5cf6',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderPriceContainer: {
    alignItems: 'flex-end',
  },
  orderOriginalPrice: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderTotal: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#10b981',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  orderPaymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderPayment: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  paymentIdBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paymentIdText: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 20,
    color: '#1f2937',
    marginTop: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  emptyStateSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
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
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Enhanced Modal Styles
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
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalOrderHeader: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalOrderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalOrderId: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalOrderDate: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  modalStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalOrderTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
  },
  modalOrderTypeText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#ffffff',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalSummaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    gap: 10,
  },
  modalSummaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalSummaryValue: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalSummaryLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalSectionTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalSectionCount: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 10,
  },
  modalItemImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  modalItemImage: {
    width: 48,
    height: 48,
    resizeMode: 'cover',
  },
  modalItemImagePlaceholder: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  modalItemInfo: {
    flex: 2,
  },
  modalItemName: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalItemQty: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalItemPriceInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  modalItemUnitPrice: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalItemTotal: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#10b981',
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  modalPriceLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalPriceValue: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalPriceLabelDiscount: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#8b5cf6',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalPriceValueDiscount: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#8b5cf6',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalPriceDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 6,
  },
  modalPriceTotalRow: {
    paddingTop: 8,
  },
  modalPriceTotalLabel: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalPriceTotalValue: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#10b981',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalInfoCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  modalInfoLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
    width: 50,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalInfoValue: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#1f2937',
    flex: 1,
    textAlign: 'right',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalInfoAddress: {
    fontSize: 12,
  },
  modalInfoMono: {
    fontFamily: 'monospace',
    fontSize: 11,
  },
  viewPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  viewPaymentButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#3b82f6',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    marginBottom: 12,
    gap: 10,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    flex: 1,
  },
  modalActionShare: {
    backgroundColor: '#3b82f6',
  },
  modalActionCancel: {
    backgroundColor: '#ef4444',
  },
  modalActionText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#ffffff',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalCloseButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  modalCloseButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});