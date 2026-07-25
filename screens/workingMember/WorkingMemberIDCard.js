import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator, Share } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function WorkingMemberIDCard({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardId, setCardId] = useState('');
  const [joinedDate, setJoinedDate] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Error', 'User not logged in');
        return;
      }
      
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        setCardId(`WM-${userId.slice(0, 8).toUpperCase()}`);
        setJoinedDate(data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'N/A');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load ID card');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Working Member ID Card\n\nName: ${userData?.fullName || userData?.name || 'Member'}\nID: ${cardId}\nDepartment: ${userData?.department || 'N/A'}\nPosition: ${userData?.position || 'N/A'}\nEmail: ${userData?.email || 'N/A'}\nPhone: ${userData?.phone || 'N/A'}`,
        title: 'My Working Member ID Card',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share ID card');
    }
  };

  const handleDownload = () => {
    Alert.alert('Download', 'ID card will be downloaded as image');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading ID Card...</Text>
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
          <Text style={styles.headerTitle}>My ID Card</Text>
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <MaterialIcons name="share" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Card */}
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardLogo}>
                <MaterialIcons name="work" size={28} color="#ffffff" />
              </View>
              <Text style={styles.cardTitle}>WORKING MEMBER</Text>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>ACTIVE</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.cardAvatarContainer}>
                {userData?.profilePhoto ? (
                  <Image source={{ uri: userData.profilePhoto }} style={styles.cardAvatar} />
                ) : (
                  <View style={styles.cardAvatarPlaceholder}>
                    <MaterialIcons name="person" size={50} color="#3b82f6" />
                  </View>
                )}
              </View>
              <Text style={styles.cardName}>{userData?.fullName || userData?.name || 'Member'}</Text>
              <Text style={styles.cardPosition}>{userData?.position || 'Working Member'}</Text>
              <Text style={styles.cardId}>ID: {cardId}</Text>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.cardDetail}>
                <MaterialIcons name="business" size={16} color="#6b7280" />
                <Text style={styles.cardDetailText}>{userData?.department || 'N/A'}</Text>
              </View>
              <View style={styles.cardDetail}>
                <MaterialIcons name="email" size={16} color="#6b7280" />
                <Text style={styles.cardDetailText}>{userData?.email || 'N/A'}</Text>
              </View>
              <View style={styles.cardDetail}>
                <MaterialIcons name="phone" size={16} color="#6b7280" />
                <Text style={styles.cardDetailText}>{userData?.phone || 'N/A'}</Text>
              </View>
              <View style={styles.cardDetail}>
                <MaterialIcons name="calendar-today" size={16} color="#6b7280" />
                <Text style={styles.cardDetailText}>Joined: {joinedDate}</Text>
              </View>
            </View>

            <View style={styles.cardBottom}>
              <Text style={styles.cardBottomText}>Valid Until: {new Date().getFullYear() + 1}-12-31</Text>
              <Text style={styles.cardBottomText}>•</Text>
              <Text style={styles.cardBottomText}>NGO App</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
            <MaterialIcons name="download" size={20} color="#ffffff" />
            <Text style={styles.downloadButtonText}>Download</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.printButton} onPress={handleShare}>
            <MaterialIcons name="print" size={20} color="#ffffff" />
            <Text style={styles.printButtonText}>Share</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Member Information</Text>
          
          <View style={styles.infoItem}>
            <MaterialIcons name="person" size={18} color="#6b7280" />
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>{userData?.fullName || userData?.name || 'N/A'}</Text>
          </View>

          <View style={styles.infoItem}>
            <MaterialIcons name="work" size={18} color="#6b7280" />
            <Text style={styles.infoLabel}>Position</Text>
            <Text style={styles.infoValue}>{userData?.position || 'N/A'}</Text>
          </View>

          <View style={styles.infoItem}>
            <MaterialIcons name="business" size={18} color="#6b7280" />
            <Text style={styles.infoLabel}>Department</Text>
            <Text style={styles.infoValue}>{userData?.department || 'N/A'}</Text>
          </View>

          <View style={styles.infoItem}>
            <MaterialIcons name="email" size={18} color="#6b7280" />
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{userData?.email || 'N/A'}</Text>
          </View>

          <View style={styles.infoItem}>
            <MaterialIcons name="phone" size={18} color="#6b7280" />
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{userData?.phone || 'N/A'}</Text>
          </View>

          <View style={styles.infoItem}>
            <MaterialIcons name="location-on" size={18} color="#6b7280" />
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>{userData?.address || 'N/A'}</Text>
          </View>

          <View style={styles.infoItem}>
            <MaterialIcons name="badge" size={18} color="#6b7280" />
            <Text style={styles.infoLabel}>Employee ID</Text>
            <Text style={styles.infoValue}>{userData?.employeeId || 'N/A'}</Text>
          </View>

          <View style={styles.infoItem}>
            <MaterialIcons name="verified" size={18} color="#6b7280" />
            <Text style={styles.infoLabel}>Status</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  shareButton: {
    padding: 4,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
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

  cardContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#3b82f6',
    paddingBottom: 0,
  },
  cardLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontFamily: Fonts.Bold,
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 1,
  },
  cardBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  cardBadgeText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 10,
  },
  cardBody: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 16,
  },
  cardAvatarContainer: {
    marginBottom: 12,
  },
  cardAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#3b82f6',
  },
  cardAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#3b82f6',
  },
  cardName: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
  },
  cardPosition: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  cardId: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  cardFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 6,
  },
  cardDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardDetailText: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#1f2937',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  cardBottomText: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#6b7280',
  },

  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  downloadButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },
  printButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  printButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },

  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  infoTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  infoLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#6b7280',
    width: 90,
  },
  infoValue: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#1f2937',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  statusText: {
    fontFamily: Fonts.SemiBold,
    color: '#10b981',
    fontSize: 12,
  },
});