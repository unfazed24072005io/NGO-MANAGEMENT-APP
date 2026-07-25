import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, FlatList, Modal, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function WorkingMemberMyOrders({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');

  const statusFilters = ['All', 'Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

  useEffect(() => {
    setupRealtimeListener();
  }, []);

  const setupRealtimeListener = () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const q = query(
      collection(db, 'orders'),
      where('memberId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = [];
      snapshot.forEach((doc) => {
        ordersList.push({ id: doc.id, ...doc.data() });
      });
      setOrders(ordersList);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'pending': return '#f59e0b';
      case 'confirmed': return '#3b82f6';
      case 'processing': return '#8b5cf6';
      case 'shipped': return '#10b981';
      case 'delivered': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'pending': return 'pending';
      case 'confirmed': return 'check-circle';
      case 'processing': return 'settings';
      case 'shipped': return 'local-shipping';
      case 'delivered': return 'check-circle';
      case 'cancelled': return 'cancel';
      default: return 'info';
    }
  };

  const getFilteredOrders = () => {
    if (filterStatus === 'All') return orders;
    return orders.filter(order => order.status?.toLowerCase() === filterStatus.toLowerCase());
  };

  const OrderCard = ({ order }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => {
        setSelectedOrder(order);
        setDetailModalVisible(true);
      }}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderId}>#{order.id?.slice(-6) || 'N/A'}</Text>
          <Text style={styles.orderDate}>
            {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '15' }]}>
          <MaterialIcons name={getStatusIcon(order.status)} size={12} color={getStatusColor(order.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
            {order.status || 'pending'}
          </Text>
        </View>
      </View>

      <View style={styles.orderItems}>
        <Text style={styles.orderItemsCount}>{order.items?.length || 0} items</Text>
        <Text style={styles.orderTotal}>₹{order.total?.toLocaleString() || 0}</Text>
      </View>

      {order.orderType && (
        <View style={styles.orderTypeBadge}>
          <MaterialIcons name={order.orderType === 'wholesale' ? 'inventory' : 'shopping-cart'} size={12} color="#8b5cf6" />
          <Text style={styles.orderTypeText}>{order.orderType || 'retail'}</Text>
        </View>
      )}

      {order.discount > 0 && (
        <View style={styles.discountBadge}>
          <MaterialIcons name="percent" size={12} color="#10b981" />
          <Text style={styles.discountText}>{order.discount}% off</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const FilterChip = ({ label }) => (
    <TouchableOpacity
      style={[styles.filterChip, filterStatus === label && styles.filterChipActive]}
      onPress={() => setFilterStatus(label)}
    >
      <Text style={[styles.filterChipText, filterStatus === label && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading orders...</Text>
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
          <Text style={styles.headerTitle}>My Orders</Text>
          <TouchableOpacity style={styles.filterButton} onPress={() => setFilterStatus('All')}>
            <MaterialIcons name="filter-list" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {statusFilters.map((filter) => (
          <FilterChip key={filter} label={filter} />
        ))}
      </ScrollView>

      {/* Orders List */}
      <FlatList
        data={getFilteredOrders()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OrderCard order={item} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="receipt" size={44} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No orders found</Text>
            <Text style={styles.emptyStateSubtext}>Start shopping to place orders</Text>
            <TouchableOpacity 
              style={styles.shopButton}
              onPress={() => navigation.navigate('WorkingMemberECommerce')}
            >
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Order Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailHeader}>
                  <View>
                    <Text style={styles.detailOrderId}>Order #{selectedOrder.id?.slice(-6) || 'N/A'}</Text>
                    <Text style={styles.detailOrderDate}>
                      {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : 'N/A'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) + '15' }]}>
                    <MaterialIcons name={getStatusIcon(selectedOrder.status)} size={14} color={getStatusColor(selectedOrder.status)} />
                    <Text style={[styles.statusText, { color: getStatusColor(selectedOrder.status) }]}>
                      {selectedOrder.status || 'pending'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Items</Text>
                  {selectedOrder.items?.map((item, index) => (
                    <View key={index} style={styles.detailItem}>
                      <Text style={styles.detailItemName}>{item.name} x{item.quantity}</Text>
                      <Text style={styles.detailItemPrice}>₹{item.total || item.price * item.quantity}</Text>
                    </View>
                  ))}
                </View>

                {selectedOrder.discount > 0 && (
                  <View style={styles.detailDiscountRow}>
                    <Text style={styles.detailDiscountLabel}>Discount ({selectedOrder.discount}%)</Text>
                    <Text style={styles.detailDiscountValue}>-₹{((selectedOrder.originalTotal || selectedOrder.total) * (selectedOrder.discount / 100)).toFixed(2)}</Text>
                  </View>
                )}

                <View style={styles.detailTotalRow}>
                  <Text style={styles.detailTotalLabel}>Total</Text>
                  <Text style={styles.detailTotalValue}>₹{selectedOrder.total?.toLocaleString() || 0}</Text>
                </View>

                {selectedOrder.shippingAddress && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Shipping Address</Text>
                    <Text style={styles.detailAddress}>
                      {selectedOrder.shippingAddress.address},
                      {selectedOrder.shippingAddress.city},
                      {selectedOrder.shippingAddress.pincode}
                    </Text>
                  </View>
                )}

                {selectedOrder.orderType && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Order Type</Text>
                    <Text style={styles.detailType}>{selectedOrder.orderType || 'retail'}</Text>
                  </View>
                )}
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
  filterButton: { padding: 4 },

  filterContainer: {
    maxHeight: 50,
    marginVertical: 12,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterChipText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
  },
  orderDate: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
  },
  orderItems: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  orderItemsCount: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
  },
  orderTotal: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#10b981',
  },
  orderTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  orderTypeText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#8b5cf6',
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  discountText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#10b981',
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
    color: '#1f2937',
  },
  emptyStateSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
  },
  shopButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  shopButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
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
  },

  // Modal
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

  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailOrderId: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#1f2937',
  },
  detailOrderDate: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  detailSection: {
    marginBottom: 12,
  },
  detailLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailItemName: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
  },
  detailItemPrice: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#10b981',
  },
  detailDiscountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    marginTop: 4,
    paddingTop: 8,
  },
  detailDiscountLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#8b5cf6',
  },
  detailDiscountValue: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#8b5cf6',
  },
  detailTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    marginTop: 4,
  },
  detailTotalLabel: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#1f2937',
  },
  detailTotalValue: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#10b981',
  },
  detailAddress: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  detailType: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#8b5cf6',
  },
});