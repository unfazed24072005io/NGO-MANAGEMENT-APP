import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator, RefreshControl, FlatList, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, query, where, orderBy, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function WorkingMemberMyOrders({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);

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
      where('memberId', '==', userId),
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const StatCard = ({ label, count, icon, color }) => (
    <View style={[styles.statCard]}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={18} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{count}</Text>
      </View>
    </View>
  );

  const OrderCard = ({ order }) => {
    const statusColor = getStatusColor(order.status);
    const statusIcon = getStatusIcon(order.status);
    const itemCount = order.items?.length || 0;

    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => {
          setSelectedOrder(order);
          setDetailModalVisible(true);
        }}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderId}>#ORD-{order.id?.slice(0, 8).toUpperCase()}</Text>
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
          <Text style={styles.orderItems} numberOfLines={1}>
            {itemCount} item{itemCount > 1 ? 's' : ''}
          </Text>
          <Text style={styles.orderTotal}>₹{order.total?.toLocaleString() || 0}</Text>
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.orderPayment}>Payment: {order.paymentMethod || 'N/A'}</Text>
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
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Orders</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileIcon}
            onPress={() => navigation.navigate('WorkingMemberProfile')}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
            ) : (
              <MaterialIcons name="person" size={28} color="#3b82f6" />
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
          <StatCard label="Total" count={orders.length} icon="receipt" color="#ffffff" />
          <StatCard label="Pending" count={orders.filter(o => o.status === 'pending').length} icon="pending" color="#f59e0b" />
          <StatCard label="Processing" count={orders.filter(o => o.status === 'processing').length} icon="settings" color="#3b82f6" />
          <StatCard label="Completed" count={orders.filter(o => o.status === 'completed').length} icon="check-circle" color="#10b981" />
          <StatCard label="Cancelled" count={orders.filter(o => o.status === 'cancelled').length} icon="cancel" color="#ef4444" />
        </ScrollView>
      </View>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="receipt" size={60} color="#d1d5db" />
          <Text style={styles.emptyStateText}>No orders yet</Text>
          <Text style={styles.emptyStateSubtext}>Your orders will appear here</Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => navigation.navigate('WorkingMemberECommerce')}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
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
                <View style={styles.modalOrderInfo}>
                  <Text style={styles.modalOrderId}>#ORD-{selectedOrder.id?.slice(0, 8).toUpperCase()}</Text>
                  <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedOrder.status) + '15' }]}>
                    <Text style={[styles.modalStatusText, { color: getStatusColor(selectedOrder.status) }]}>
                      {selectedOrder.status || 'pending'}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Delivery Information</Text>
                  <Text style={styles.modalValue}><Text style={styles.modalLabel}>Name:</Text> {selectedOrder.customerName || 'N/A'}</Text>
                  <Text style={styles.modalValue}><Text style={styles.modalLabel}>Phone:</Text> {selectedOrder.customerPhone || 'N/A'}</Text>
                  <Text style={styles.modalValue}><Text style={styles.modalLabel}>Address:</Text> {selectedOrder.deliveryAddress || 'N/A'}</Text>
                  <Text style={styles.modalValue}><Text style={styles.modalLabel}>Payment:</Text> {selectedOrder.paymentMethod || 'N/A'}</Text>
                  <Text style={styles.modalValue}><Text style={styles.modalLabel}>Date:</Text> {formatDate(selectedOrder.createdAt)}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Order Items</Text>
                  {selectedOrder.items?.map((item, index) => (
                    <View key={index} style={styles.modalItem}>
                      <Text style={styles.modalItemName}>{item.name}</Text>
                      <Text style={styles.modalItemQty}>x{item.quantity}</Text>
                      <Text style={styles.modalItemPrice}>₹{item.total || item.price * item.quantity}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.modalTotal}>
                  <Text style={styles.modalTotalLabel}>Total</Text>
                  <Text style={styles.modalTotalValue}>₹{selectedOrder.total?.toLocaleString() || 0}</Text>
                </View>

                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setDetailModalVisible(false)}
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

  // Stats inside header
  statsContainer: { 
    maxHeight: 80,
  },
  statsContent: { 
    gap: 10,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 8,
    minWidth: 70,
    width: 75,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: 70,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statContent: { 
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statLabel: { 
    fontFamily: Fonts.Regular,
    fontSize: 8, 
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  statValue: { 
    fontFamily: Fonts.Bold,
    fontSize: 14, 
    color: '#ffffff',
    textAlign: 'center',
  },
  statIcon: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 2,
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

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
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
    alignItems: 'center',
    marginBottom: 8,
  },
  orderIdContainer: {
    flex: 1,
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
    marginTop: 2,
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
  },
  orderTotal: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#10b981',
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
  orderPayment: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
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
  },
  emptyStateSubtext: {
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
  modalOrderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalOrderId: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
  },
  modalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
  },
  modalSection: {
    marginBottom: 12,
  },
  modalSectionTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 6,
  },
  modalLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
  },
  modalValue: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#1f2937',
    marginVertical: 2,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalItemName: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#1f2937',
    flex: 2,
  },
  modalItemQty: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
    textAlign: 'center',
  },
  modalItemPrice: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#10b981',
    flex: 1,
    textAlign: 'right',
  },
  modalTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
  },
  modalTotalLabel: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#1f2937',
  },
  modalTotalValue: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#10b981',
  },
  modalCloseButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  modalCloseButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },
});