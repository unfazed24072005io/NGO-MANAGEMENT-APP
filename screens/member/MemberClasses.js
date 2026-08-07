// screens/member/MemberClasses.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
  Linking,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, query, where, doc, getDoc, onSnapshot, orderBy, addDoc, updateDoc, increment } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';
import { 
  initiateRazorpayPayment, 
  createRazorpayOrder, 
  verifyRazorpayPayment 
} from '../../services/paymentService';

export default function MemberClasses({ navigation }) {
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [registeredClasses, setRegisteredClasses] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [classToRegister, setClassToRegister] = useState(null);

  useEffect(() => {
    setupClassesListener();
    fetchRegisteredClasses();
  }, []);

  const setupClassesListener = () => {
    const q = query(collection(db, 'onlineClasses'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classesList = [];
      snapshot.forEach((doc) => {
        classesList.push({ id: doc.id, ...doc.data() });
      });
      setClasses(classesList);
      applyFilters(classesList, searchQuery, filterStatus);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const fetchRegisteredClasses = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const regSnap = await getDocs(query(
        collection(db, 'classRegistrations'),
        where('userId', '==', userId),
        where('status', '==', 'registered')
      ));
      
      const ids = [];
      regSnap.forEach((doc) => {
        ids.push(doc.data().classId);
      });
      setRegisteredClasses(ids);
    } catch (error) {
      console.error('Error fetching registered classes:', error);
    }
  };

  const applyFilters = (data, searchText, status) => {
    let filtered = data;

    if (searchText) {
      filtered = filtered.filter(cls =>
        cls.title?.toLowerCase().includes(searchText.toLowerCase()) ||
        cls.instructor?.toLowerCase().includes(searchText.toLowerCase()) ||
        cls.category?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (status !== 'all') {
      filtered = filtered.filter(cls => cls.status === status);
    }

    setFilteredClasses(filtered);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFilters(classes, text, filterStatus);
  };

  const handleFilterPress = (status) => {
    setFilterStatus(status);
    applyFilters(classes, searchQuery, status);
  };

  const initiateRegistration = (classItem) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    if (registeredClasses.includes(classItem.id)) {
      Alert.alert('Already Registered', 'You have already registered for this class');
      return;
    }

    if (classItem.capacity && classItem.registeredCount >= classItem.capacity) {
      Alert.alert('Class Full', 'This class has reached maximum capacity');
      return;
    }

    if (classItem.fee && classItem.fee > 0) {
      setClassToRegister(classItem);
      setShowPaymentModal(true);
    } else {
      handleRegister(classItem);
    }
  };

  const handleRegister = async (classItem, paymentData = null) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      const registrationData = {
        classId: classItem.id,
        userId: userId,
        userName: auth.currentUser?.displayName || 'Member',
        userEmail: auth.currentUser?.email,
        className: classItem.title,
        registeredAt: new Date().toISOString(),
        status: 'registered',
        fee: classItem.fee || 0,
        feePaid: classItem.fee ? true : false,
      };

      if (paymentData) {
        registrationData.paymentId = paymentData.paymentId;
        registrationData.orderId = paymentData.orderId;
        registrationData.paymentAmount = classItem.fee;
      }

      await addDoc(collection(db, 'classRegistrations'), registrationData);

      const classRef = doc(db, 'onlineClasses', classItem.id);
      await updateDoc(classRef, {
        registeredCount: increment(1),
      });

      setRegisteredClasses([...registeredClasses, classItem.id]);
      
      Alert.alert('Success', `Registered for ${classItem.title} successfully!`);
      setDetailModalVisible(false);
      setShowPaymentModal(false);
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', error.message);
    }
  };

  const handlePaymentAndRegister = async () => {
    if (!classToRegister) return;
    
    setPaymentLoading(true);
    try {
      const user = auth.currentUser;
      const fee = classToRegister.fee || 0;

      const orderData = await createRazorpayOrder(fee);

      const paymentResult = await initiateRazorpayPayment({
        amount: fee,
        name: user?.displayName || 'Member',
        email: user?.email || '',
        phone: user?.phoneNumber || '',
        description: `Registration Fee for ${classToRegister.title}`,
        orderId: orderData.orderId,
      });

      if (paymentResult.success) {
        const verificationResult = await verifyRazorpayPayment({
          paymentId: paymentResult.paymentId,
          orderId: paymentResult.orderId,
          signature: paymentResult.signature,
        });

        if (verificationResult.success) {
          await handleRegister(classToRegister, paymentResult);
        } else {
          Alert.alert('Payment Failed', 'Payment verification failed. Please try again.');
        }
      } else {
        Alert.alert('Payment Failed', paymentResult.error || 'Something went wrong');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Payment failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const openMeetLink = (link) => {
    if (link) {
      Linking.openURL(link).catch(() => {
        Alert.alert('Error', 'Could not open the meeting link');
      });
    } else {
      Alert.alert('No Link', 'Google Meet link not available for this class');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRegisteredClasses();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'upcoming': return '#3b82f6';
      case 'live': return '#10b981';
      case 'completed': return '#6b7280';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getLevelColor = (level) => {
    switch(level) {
      case 'beginner': return '#10b981';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const StatCard = ({ label, count, icon, color }) => (
    <TouchableOpacity 
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={() => {
        const statusMap = {
          'Total': 'all',
          'Upcoming': 'upcoming',
          'Live': 'live',
          'Completed': 'completed'
        };
        handleFilterPress(statusMap[label] || 'all');
      }}
      activeOpacity={0.7}
    >
      <View style={styles.statIconContainer}>
        <MaterialIcons name={icon} size={18} color={color} />
      </View>
      <View style={styles.statTextContainer}>
        <Text style={styles.statCount}>{count}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </TouchableOpacity>
  );

  const ClassCard = ({ classItem }) => {
    const isRegistered = registeredClasses.includes(classItem.id);
    const statusColor = getStatusColor(classItem.status);
    const hasFee = classItem.fee && classItem.fee > 0;
    
    return (
      <TouchableOpacity 
        style={styles.classCard}
        onPress={() => {
          setSelectedClass(classItem);
          setDetailModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.classHeader}>
          <View style={styles.classTitleContainer}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.classTitle} numberOfLines={1}>{classItem.title}</Text>
          </View>
          <View style={[styles.classStatusBadge, { backgroundColor: statusColor + '15' }]}>
            <Text style={[styles.classStatusText, { color: statusColor }]}>
              {classItem.status || 'upcoming'}
            </Text>
          </View>
        </View>

        <Text style={styles.classDescription} numberOfLines={2}>
          {classItem.description || 'No description'}
        </Text>

        <View style={styles.classDetails}>
          <View style={styles.classDetail}>
            <MaterialIcons name="person" size={14} color="#6b7280" />
            <Text style={styles.classDetailText}>{classItem.instructor}</Text>
          </View>
          <View style={styles.classDetail}>
            <MaterialIcons name="event" size={14} color="#6b7280" />
            <Text style={styles.classDetailText}>{classItem.date}</Text>
          </View>
          <View style={styles.classDetail}>
            <MaterialIcons name="access-time" size={14} color="#6b7280" />
            <Text style={styles.classDetailText}>{classItem.time}</Text>
          </View>
        </View>

        <View style={styles.classFooter}>
          <View style={styles.footerLeft}>
            <View style={[styles.levelBadge, { backgroundColor: getLevelColor(classItem.level) + '15' }]}>
              <Text style={[styles.levelBadgeText, { color: getLevelColor(classItem.level) }]}>
                {classItem.level || 'beginner'}
              </Text>
            </View>
            {hasFee && (
              <View style={styles.feeBadge}>
                <MaterialIcons name="payment" size={12} color="#d97706" />
                <Text style={styles.feeBadgeText}>₹{classItem.fee}</Text>
              </View>
            )}
          </View>
          <View style={styles.capacityBadge}>
            <MaterialIcons name="people" size={14} color="#6b7280" />
            <Text style={styles.capacityText}>
              {classItem.registeredCount || 0}/{classItem.capacity || '∞'}
            </Text>
          </View>
        </View>

        {isRegistered && (
          <View style={styles.registeredBadge}>
            <MaterialIcons name="check-circle" size={14} color="#10b981" />
            <Text style={styles.registeredBadgeText}>Registered</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Payment Modal
  const PaymentModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showPaymentModal}
      onRequestClose={() => {
        if (!paymentLoading) setShowPaymentModal(false);
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.paymentModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Registration Fee</Text>
            <TouchableOpacity 
              onPress={() => {
                if (!paymentLoading) setShowPaymentModal(false);
              }}
              disabled={paymentLoading}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {classToRegister && (
            <>
              <View style={styles.paymentInfo}>
                <MaterialIcons name="video-library" size={36} color="#3b82f6" />
                <Text style={styles.paymentClassTitle}>{classToRegister.title}</Text>
                <Text style={styles.paymentFeeLabel}>Registration Fee</Text>
                <Text style={styles.paymentFeeAmount}>₹{classToRegister.fee}</Text>
                <Text style={styles.paymentDescription}>
                  This fee covers your registration for this online class
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.payFeeButton, paymentLoading && styles.payFeeDisabled]}
                onPress={handlePaymentAndRegister}
                disabled={paymentLoading}
                activeOpacity={0.7}
              >
                {paymentLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.payFeeButtonText}>
                    Pay ₹{classToRegister.fee} & Register
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={styles.paymentNote}>🔒 Secure payment via Razorpay</Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading classes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Online Classes</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={18} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search classes..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={handleSearch}
            textAlignVertical="center"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} activeOpacity={0.7}>
              <MaterialIcons name="close" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <StatCard 
            label="Total" 
            count={classes.length} 
            icon="video-library" 
            color="#3b82f6" 
          />
          <StatCard 
            label="Upcoming" 
            count={classes.filter(c => c.status === 'upcoming').length} 
            icon="event" 
            color="#3b82f6" 
          />
          <StatCard 
            label="Live" 
            count={classes.filter(c => c.status === 'live').length} 
            icon="video-call" 
            color="#10b981" 
          />
          <StatCard 
            label="Completed" 
            count={classes.filter(c => c.status === 'completed').length} 
            icon="check-circle" 
            color="#6b7280" 
          />
        </View>
      </View>

      {/* Class List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
        }
        contentContainerStyle={styles.listContent}
      >
        {filteredClasses.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="video-library" size={44} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No classes available</Text>
            <Text style={styles.emptyStateSubtext}>Check back later for new classes</Text>
          </View>
        ) : (
          filteredClasses.map((item) => (
            <ClassCard key={item.id} classItem={item} />
          ))
        )}
      </ScrollView>

      {/* Class Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            {selectedClass && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Class Details</Text>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)} activeOpacity={0.7}>
                    <MaterialIcons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Title</Text>
                  <Text style={styles.detailValue}>{selectedClass.title}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{selectedClass.description || 'No description'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Instructor</Text>
                  <Text style={styles.detailValue}>{selectedClass.instructor}</Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={[styles.detailSection, { flex: 1 }]}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>{selectedClass.date}</Text>
                  </View>
                  <View style={[styles.detailSection, { flex: 1 }]}>
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>{selectedClass.time}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Level</Text>
                  <Text style={[styles.detailValue, { color: getLevelColor(selectedClass.level) }]}>
                    {selectedClass.level || 'beginner'}
                  </Text>
                </View>

                {selectedClass.fee && selectedClass.fee > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Registration Fee</Text>
                    <Text style={[styles.detailValue, { color: '#d97706', fontFamily: Fonts.Bold }]}>
                      ₹{selectedClass.fee}
                    </Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Google Meet Link</Text>
                  <TouchableOpacity onPress={() => openMeetLink(selectedClass.googleMeetLink)} activeOpacity={0.7}>
                    <Text style={[styles.detailValue, styles.linkText]}>
                      {selectedClass.googleMeetLink || 'Not available'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Capacity</Text>
                  <Text style={styles.detailValue}>
                    {selectedClass.registeredCount || 0} / {selectedClass.capacity || '∞'} registered
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.detailStatusBadge, { backgroundColor: getStatusColor(selectedClass.status) + '15' }]}>
                    <Text style={[styles.detailStatusText, { color: getStatusColor(selectedClass.status) }]}>
                      {selectedClass.status || 'upcoming'}
                    </Text>
                  </View>
                </View>

                {selectedClass.status !== 'completed' && selectedClass.status !== 'cancelled' && (
                  <TouchableOpacity 
                    style={[
                      styles.registerButton,
                      (registeredClasses.includes(selectedClass.id) || 
                       selectedClass.registeredCount >= selectedClass.capacity) && 
                      styles.registerDisabled
                    ]}
                    onPress={() => initiateRegistration(selectedClass)}
                    disabled={
                      registeredClasses.includes(selectedClass.id) || 
                      selectedClass.registeredCount >= selectedClass.capacity ||
                      paymentLoading
                    }
                    activeOpacity={0.7}
                  >
                    <MaterialIcons 
                      name={
                        registeredClasses.includes(selectedClass.id) ? 'check-circle' :
                        selectedClass.registeredCount >= selectedClass.capacity ? 'block' : 'event'
                      } 
                      size={20} 
                      color="#ffffff" 
                    />
                    <Text style={styles.registerText}>
                      {registeredClasses.includes(selectedClass.id) ? 'Registered' :
                       selectedClass.registeredCount >= selectedClass.capacity ? 'Full' :
                       selectedClass.fee && selectedClass.fee > 0 ? `Pay ₹${selectedClass.fee} & Register` : 'Register Now'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Payment Modal */}
      <PaymentModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 6,
    borderRadius: 10,
    gap: 6,
    borderLeftWidth: 3,
  },
  statIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statCount: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
    color: '#ffffff',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 8,
    color: 'rgba(255,255,255,0.8)',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 4,
  },

  classCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  classTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  classTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  classStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  classStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  classDescription: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  classDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  classDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  classDetailText: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  classFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  levelBadgeText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  feeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  feeBadgeText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    color: '#d97706',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  capacityText: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  registeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 8,
    gap: 4,
    alignSelf: 'flex-start',
  },
  registeredBadgeText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#059669',
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
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  emptyStateSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

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
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  detailSection: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  detailValue: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  linkText: {
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
  detailStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 16,
  },
  registerDisabled: {
    backgroundColor: '#9ca3af',
  },
  registerText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#ffffff',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Payment Modal
  paymentModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
  },
  paymentInfo: {
    alignItems: 'center',
    marginVertical: 16,
  },
  paymentClassTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
    marginTop: 8,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  paymentFeeLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  paymentFeeAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 28,
    color: '#3b82f6',
    marginTop: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  paymentDescription: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  payFeeButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  payFeeDisabled: {
    backgroundColor: '#9ca3af',
  },
  payFeeButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#ffffff',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  paymentNote: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 10,
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
    fontSize: 14,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});