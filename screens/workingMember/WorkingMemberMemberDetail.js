import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, FlatList, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function WorkingMemberMemberDetail({ navigation, route }) {
  const { memberId } = route.params || {};
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [donations, setDonations] = useState([]);
  const [totalDonations, setTotalDonations] = useState(0);

  useEffect(() => {
    fetchMemberDetails();
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

  const fetchMemberDetails = async () => {
    try {
      if (!memberId) {
        Alert.alert('Error', 'Member ID not found');
        navigation.goBack();
        return;
      }

      const docRef = doc(db, 'registeredMembers', memberId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const memberData = { id: docSnap.id, ...docSnap.data() };
        setMember(memberData);
        
        if (memberData.memberId) {
          await fetchMemberDonations(memberData.memberId);
        }
      } else {
        Alert.alert('Error', 'Member not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching member:', error);
      Alert.alert('Error', 'Failed to load member details');
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberDonations = async (userId) => {
    try {
      const q = query(
        collection(db, 'donations'),
        where('memberId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const donationsList = [];
      let total = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        donationsList.push({ id: doc.id, ...data });
        total += data.amount || 0;
      });
      
      donationsList.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return 0;
      });
      
      setDonations(donationsList);
      setTotalDonations(total);
    } catch (error) {
      console.error('Error fetching donations:', error);
    }
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'inactive': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // ============ RENDER FUNCTIONS FOR FLATLIST ============
  
  const renderProfileSection = () => (
    <View style={styles.profileSection}>
      <View style={styles.avatarContainer}>
        {member?.profilePhoto ? (
          <Image source={{ uri: member.profilePhoto }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <MaterialIcons name="person" size={60} color="#3b82f6" />
          </View>
        )}
      </View>
      <Text style={styles.memberName}>{member?.fullName || member?.name || 'Unknown'}</Text>
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(member?.status) + '15' }]}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(member?.status) }]} />
        <Text style={[styles.statusText, { color: getStatusColor(member?.status) }]}>
          {member?.status || 'pending'}
        </Text>
      </View>
    </View>
  );

  const renderDonationSection = () => (
    <View style={[styles.infoCard, styles.donationCard]}>
      <View style={styles.donationHeader}>
        <MaterialIcons name="volunteer-activism" size={24} color="#8b5cf6" />
        <Text style={styles.infoTitle}>Donation Summary</Text>
      </View>
      
      <View style={styles.donationStats}>
        <View style={styles.donationStat}>
          <Text style={styles.donationStatLabel}>Total Donations</Text>
          <Text style={styles.donationStatValue}>₹{totalDonations.toLocaleString()}</Text>
        </View>
        <View style={styles.donationStat}>
          <Text style={styles.donationStatLabel}>Number of Donations</Text>
          <Text style={styles.donationStatValue}>{donations.length}</Text>
        </View>
      </View>

      {donations.length > 0 && (
        <View style={styles.recentDonations}>
          <Text style={styles.recentDonationsTitle}>Recent Donations</Text>
          {donations.slice(0, 3).map((donation, index) => (
            <View key={donation.id || index} style={styles.donationItem}>
              <View>
                <Text style={styles.donationItemAmount}>₹{donation.amount}</Text>
                <Text style={styles.donationItemDate}>
                  {donation.createdAt ? new Date(donation.createdAt).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
              <View style={[styles.donationStatusBadge, { 
                backgroundColor: donation.status === 'completed' ? '#10b98115' : '#f59e0b15' 
              }]}>
                <Text style={[styles.donationStatusText, { 
                  color: donation.status === 'completed' ? '#10b981' : '#f59e0b' 
                }]}>
                  {donation.status || 'pending'}
                </Text>
              </View>
            </View>
          ))}
          {donations.length > 3 && (
            <Text style={styles.viewAllDonations}>+{donations.length - 3} more donations</Text>
          )}
        </View>
      )}
    </View>
  );

  const renderContactSection = () => (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>Contact Information</Text>
      
      <View style={styles.infoRow}>
        <MaterialIcons name="email" size={20} color="#6b7280" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{member?.email || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <MaterialIcons name="phone" size={20} color="#6b7280" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>{member?.phone || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <MaterialIcons name="person" size={20} color="#6b7280" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Gender</Text>
          <Text style={styles.infoValue}>{member?.gender || 'N/A'}</Text>
        </View>
      </View>
    </View>
  );

  const renderAddressSection = () => (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>Address Information</Text>
      
      {member?.address ? (
        <View style={styles.infoRow}>
          <MaterialIcons name="home" size={20} color="#6b7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>{member.address}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.infoRow}>
          <MaterialIcons name="home" size={20} color="#6b7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={[styles.infoValue, { color: '#9ca3af' }]}>Not provided</Text>
          </View>
        </View>
      )}

      <View style={styles.infoRow}>
        <MaterialIcons name="location-city" size={20} color="#6b7280" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>City / State</Text>
          <Text style={styles.infoValue}>
            {[member?.city, member?.state].filter(Boolean).join(', ') || 'N/A'}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <MaterialIcons name="pin-drop" size={20} color="#6b7280" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Pincode</Text>
          <Text style={styles.infoValue}>{member?.pincode || 'N/A'}</Text>
        </View>
      </View>
    </View>
  );

  const renderDocumentsSection = () => (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>Documents</Text>
      
      {member?.aadharFront ? (
        <TouchableOpacity style={styles.documentRow} onPress={() => Alert.alert('Aadhar Front', 'View document')}>
          <MaterialIcons name="credit-card" size={20} color="#3b82f6" />
          <Text style={styles.documentText}>Aadhar Card (Front)</Text>
          <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
        </TouchableOpacity>
      ) : (
        <View style={styles.documentRow}>
          <MaterialIcons name="credit-card" size={20} color="#9ca3af" />
          <Text style={[styles.documentText, { color: '#9ca3af' }]}>Aadhar Card (Front) - Not uploaded</Text>
        </View>
      )}

      {member?.aadharBack ? (
        <TouchableOpacity style={styles.documentRow} onPress={() => Alert.alert('Aadhar Back', 'View document')}>
          <MaterialIcons name="credit-card" size={20} color="#3b82f6" />
          <Text style={styles.documentText}>Aadhar Card (Back)</Text>
          <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
        </TouchableOpacity>
      ) : (
        <View style={styles.documentRow}>
          <MaterialIcons name="credit-card" size={20} color="#9ca3af" />
          <Text style={[styles.documentText, { color: '#9ca3af' }]}>Aadhar Card (Back) - Not uploaded</Text>
        </View>
      )}

      {member?.panCard ? (
        <TouchableOpacity style={styles.documentRow} onPress={() => Alert.alert('PAN Card', 'View document')}>
          <MaterialIcons name="assignment" size={20} color="#3b82f6" />
          <Text style={styles.documentText}>PAN Card</Text>
          <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
        </TouchableOpacity>
      ) : (
        <View style={styles.documentRow}>
          <MaterialIcons name="assignment" size={20} color="#9ca3af" />
          <Text style={[styles.documentText, { color: '#9ca3af' }]}>PAN Card - Not uploaded</Text>
        </View>
      )}

      {member?.signature ? (
        <TouchableOpacity style={styles.documentRow} onPress={() => Alert.alert('Signature', 'View document')}>
          <MaterialIcons name="edit" size={20} color="#3b82f6" />
          <Text style={styles.documentText}>Signature</Text>
          <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
        </TouchableOpacity>
      ) : (
        <View style={styles.documentRow}>
          <MaterialIcons name="edit" size={20} color="#9ca3af" />
          <Text style={[styles.documentText, { color: '#9ca3af' }]}>Signature - Not uploaded</Text>
        </View>
      )}
    </View>
  );

  const renderCommissionSection = () => (
    <View style={[styles.infoCard, styles.lastCard]}>
      <Text style={styles.infoTitle}>Commission Information</Text>
      
      <View style={styles.infoRow}>
        <MaterialIcons name="payments" size={20} color="#10b981" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Commission Earned</Text>
          <Text style={[styles.infoValue, { color: '#10b981', fontSize: 18, fontFamily: Fonts.Bold }]}>
            ₹{member?.commission || 0}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <MaterialIcons name="calendar-today" size={20} color="#6b7280" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Registered On</Text>
          <Text style={styles.infoValue}>
            {member?.createdAt ? new Date(member.createdAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            }) : 'N/A'}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <MaterialIcons name="access-time" size={20} color="#6b7280" />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Registered At</Text>
          <Text style={styles.infoValue}>
            {member?.createdAt ? new Date(member.createdAt).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit'
            }) : 'N/A'}
          </Text>
        </View>
      </View>
    </View>
  );

  // Data array for FlatList - similar to how ECommerce uses data
  const sections = [
    { id: 'profile', component: renderProfileSection },
    { id: 'donation', component: renderDonationSection },
    { id: 'contact', component: renderContactSection },
    { id: 'address', component: renderAddressSection },
    { id: 'documents', component: renderDocumentsSection },
    { id: 'commission', component: renderCommissionSection },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading member details...</Text>
      </View>
    );
  }

  if (!member) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="person-off" size={60} color="#d1d5db" />
        <Text style={styles.loadingText}>Member not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Blue Header Card - Fixed at top (same as ECommerce) */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Member Details</Text>
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
        </View>

        {/* FlatList - Same pattern as ECommerce */}
        <FlatList
          data={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => item.component()}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
          ListFooterComponent={<View style={styles.bottomPadding} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  loadingText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
  },

  // Blue Header Card - Same as ECommerce
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
    fontSize: 20,
    color: '#ffffff',
  },
  profileIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },

  // FlatList Content
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },

  // Profile Section
  profileSection: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberName: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#1f2937',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
  },

  // Donation Card
  donationCard: {
    borderColor: '#8b5cf6',
    borderWidth: 1,
    backgroundColor: '#faf5ff',
  },
  donationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  donationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3e8ff',
    marginBottom: 12,
  },
  donationStat: {
    alignItems: 'center',
  },
  donationStatLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  donationStatValue: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#8b5cf6',
    marginTop: 4,
  },
  recentDonations: {
    marginTop: 4,
  },
  recentDonationsTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 8,
  },
  donationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3e8ff',
  },
  donationItemAmount: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
  },
  donationItemDate: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  donationStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  donationStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
  },
  viewAllDonations: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#8b5cf6',
    textAlign: 'center',
    marginTop: 8,
  },

  // Info Cards
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  lastCard: {
    marginBottom: 0,
  },
  infoTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  infoValue: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    marginTop: 2,
  },

  // Documents
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  documentText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  bottomPadding: {
    height: 20,
  },
});