import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TextInput, TouchableOpacity, Alert, ActivityIndicator, Switch, Modal, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { signOut } from 'firebase/auth';
import { Fonts } from '../../config/fonts';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function MemberProfile({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [certificates, setCertificates] = useState([]);
  const [cardId, setCardId] = useState('');
  const [showAllCertificates, setShowAllCertificates] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    profilePhoto: null,
    bio: '',
    joinedDate: ''
  });

  useEffect(() => {
    fetchUserData();
    fetchCertificateData();
    generateCardId();
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
        setFormData({
          fullName: data.fullName || data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          profilePhoto: data.profilePhoto || null,
          bio: data.bio || 'NGO Member',
          joinedDate: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchCertificateData = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const certQuery = query(
        collection(db, 'certificates'),
        where('memberId', '==', userId),
        where('status', '==', 'issued')
      );
      const certSnap = await getDocs(certQuery);
      const certList = [];
      certSnap.forEach((doc) => {
        certList.push({ id: doc.id, ...doc.data() });
      });
      setCertificates(certList);
    } catch (error) {
      console.error('Error fetching certificate data:', error);
    }
  };

  const generateCardId = () => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      setCardId(`NGO-${userId.slice(0, 8).toUpperCase()}`);
    }
  };

  const pickImage = async () => {
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
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const base64Url = `data:image/jpeg;base64,${asset.base64}`;
      setFormData({ ...formData, profilePhoto: base64Url });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      await updateDoc(doc(db, 'users', userId), {
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        bio: formData.bio,
        profilePhoto: formData.profilePhoto,
        updatedAt: new Date().toISOString()
      });

      Alert.alert('Success', 'Profile updated successfully');
      setEditing(false);
      fetchUserData();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const getCertificateColor = (type) => {
    switch(type) {
      case 'donation': return '#ef4444';
      case 'membership': return '#3b82f6';
      case 'volunteer': return '#10b981';
      default: return '#f59e0b';
    }
  };

  const getCertificateIcon = (type) => {
    switch(type) {
      case 'donation': return 'favorite';
      case 'membership': return 'verified';
      case 'volunteer': return 'handshake';
      default: return 'verified';
    }
  };

  const getCertificateTypeLabel = (type) => {
    switch(type) {
      case 'donation': return 'Donation';
      case 'membership': return 'Membership';
      case 'volunteer': return 'Volunteer';
      default: return 'Certificate';
    }
  };

  const navigateToCertificates = () => {
    navigation.navigate('MemberCertificate');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  const displayedCertificates = showAllCertificates ? certificates : certificates.slice(0, 3);

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableOpacity onPress={() => setEditing(!editing)}>
            <Text style={styles.editButton}>{editing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={pickImage} disabled={!editing}>
            <View style={styles.profileImageContainer}>
              {formData.profilePhoto ? (
                <Image source={{ uri: formData.profilePhoto }} style={styles.profileImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <MaterialIcons name="person" size={50} color="#3b82f6" />
                </View>
              )}
              {editing && (
                <View style={styles.cameraIcon}>
                  <MaterialIcons name="photo-camera" size={16} color="#ffffff" />
                </View>
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{formData.fullName || 'Member'}</Text>
          <Text style={styles.profileBio}>{formData.bio || 'NGO Member'}</Text>
          {editing && <Text style={styles.changePhotoText}>Tap to change photo</Text>}
        </View>

        {/* Personal Information Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.fullName}
                onChangeText={(text) => setFormData({...formData, fullName: text})}
                placeholder="Enter full name"
              />
            ) : (
              <Text style={styles.value}>{formData.fullName || 'N/A'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{formData.email}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({...formData, phone: text})}
                keyboardType="phone-pad"
                placeholder="Enter phone number"
              />
            ) : (
              <Text style={styles.value}>{formData.phone || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Address</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.address}
                onChangeText={(text) => setFormData({...formData, address: text})}
                multiline
                numberOfLines={3}
                placeholder="Enter address"
              />
            ) : (
              <Text style={styles.value}>{formData.address || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Joined Date</Text>
            <View style={styles.dateBadge}>
              <MaterialIcons name="calendar-today" size={14} color="#6b7280" />
              <Text style={styles.dateText}>{formData.joinedDate}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>
        </View>

        {/* Professional ID Card */}
        <View style={styles.idCardWrapper}>
          <LinearGradient
            colors={['#1e3a5f', '#2d5a8e', '#3b82f6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.idCard}
          >
            {/* Card Header */}
            <View style={styles.idCardHeader}>
              <View style={styles.idCardLogoContainer}>
                <View style={styles.idCardLogo}>
                  <MaterialIcons name="volunteer-activism" size={24} color="#ffffff" />
                </View>
                <Text style={styles.idCardOrgName}>NGO</Text>
              </View>
              <View style={styles.idCardBadge}>
                <Text style={styles.idCardBadgeText}>MEMBER</Text>
              </View>
            </View>

            {/* Card Body */}
            <View style={styles.idCardBody}>
              <View style={styles.idCardPhotoContainer}>
                {formData.profilePhoto ? (
                  <Image source={{ uri: formData.profilePhoto }} style={styles.idCardPhoto} />
                ) : (
                  <View style={styles.idCardPhotoPlaceholder}>
                    <MaterialIcons name="person" size={40} color="#3b82f6" />
                  </View>
                )}
              </View>
              <View style={styles.idCardInfo}>
                <Text style={styles.idCardName}>{formData.fullName || 'Member'}</Text>
                <Text style={styles.idCardRole}>{formData.bio || 'NGO Member'}</Text>
                <View style={styles.idCardIdRow}>
                  <MaterialIcons name="badge" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.idCardIdText}>ID: {cardId}</Text>
                </View>
              </View>
            </View>

            {/* Card Divider */}
            <View style={styles.idCardDivider} />

            {/* Card Footer */}
            <View style={styles.idCardFooter}>
              <View style={styles.idCardDetail}>
                <MaterialIcons name="email" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.idCardDetailText} numberOfLines={1}>
                  {formData.email || 'N/A'}
                </Text>
              </View>
              <View style={styles.idCardDetail}>
                <MaterialIcons name="phone" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.idCardDetailText}>{formData.phone || 'N/A'}</Text>
              </View>
              <View style={styles.idCardDetail}>
                <MaterialIcons name="calendar-today" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.idCardDetailText}>Joined: {formData.joinedDate}</Text>
              </View>
            </View>

            {/* Card Bottom */}
            <View style={styles.idCardBottom}>
              <View style={styles.idCardStatus}>
                <View style={styles.idCardStatusDot} />
                <Text style={styles.idCardStatusText}>ACTIVE</Text>
              </View>
              <Text style={styles.idCardValidUntil}>
                Valid: {new Date().getFullYear() + 1}-12-31
              </Text>
            </View>
          </LinearGradient>
          
        </View>

        {/* Certificates Section */}
        <TouchableOpacity style={styles.card} onPress={navigateToCertificates} activeOpacity={0.7}>
          <View style={styles.certHeader}>
            <Text style={styles.cardTitle}>Certificates</Text>
            <View style={styles.certHeaderRight}>
              {certificates.length > 0 && (
                <Text style={styles.certCount}>{certificates.length} earned</Text>
              )}
              <MaterialIcons name="chevron-right" size={20} color="#3b82f6" />
            </View>
          </View>

          {certificates.length > 0 ? (
            <>

{displayedCertificates.map((cert, index) => (
  <TouchableOpacity 
    key={index} 
    style={styles.certItem}
    onPress={() => navigation.navigate('MemberCertificate', { certificate: cert })}
    activeOpacity={0.7}
  >
    <View style={[styles.certItemIcon, { backgroundColor: getCertificateColor(cert.type) + '15' }]}>
      <MaterialIcons name={getCertificateIcon(cert.type)} size={16} color={getCertificateColor(cert.type)} />
    </View>
    <View style={styles.certItemContent}>
      <Text style={styles.certItemTitle}>{cert.title || getCertificateTypeLabel(cert.type)}</Text>
      <View style={styles.certItemMeta}>
        <Text style={styles.certItemType}>{getCertificateTypeLabel(cert.type)}</Text>
        <Text style={styles.certItemDate}>
          {cert.issuedDate ? new Date(cert.issuedDate).toLocaleDateString() : 'N/A'}
        </Text>
      </View>
    </View>
    {cert.amount && (
      <Text style={styles.certItemAmount}>₹{cert.amount}</Text>
    )}
    <MaterialIcons name="chevron-right" size={20} color="#d1d5db" />
  </TouchableOpacity>
))}
              {certificates.length > 3 && (
  <TouchableOpacity 
    style={styles.viewAllCertificates}
    onPress={() => setShowAllCertificates(!showAllCertificates)}
  >
    <Text style={styles.viewAllText}>
      {showAllCertificates ? 'Show Less' : `View All ${certificates.length} Certificates`}
    </Text>
    <MaterialIcons 
      name={showAllCertificates ? 'expand-less' : 'expand-more'} 
      size={16} 
      color="#3b82f6" 
    />
  </TouchableOpacity>
)}
            </>
          ) : (
            <View style={styles.noCertContainer}>
              <MaterialIcons name="verified" size={30} color="#d1d5db" />
              <Text style={styles.noCertText}>No certificates earned yet</Text>
              <Text style={styles.noCertSubtext}>Complete activities to earn certificates</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Settings Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="notifications" size={20} color="#6b7280" />
              <Text style={styles.settingLabel}>Push Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
              thumbColor="#ffffff"
            />
          </View>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => Alert.alert('Privacy Policy', 'Privacy policy content goes here')}
          >
            <View style={styles.settingLeft}>
              <MaterialIcons name="privacy-tip" size={20} color="#6b7280" />
              <Text style={styles.settingLabel}>Privacy Policy</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => Alert.alert('Terms & Conditions', 'Terms and conditions content goes here')}
          >
            <View style={styles.settingLeft}>
              <MaterialIcons name="description" size={20} color="#6b7280" />
              <Text style={styles.settingLabel}>Terms & Conditions</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => Alert.alert('App Version', 'NGO App v1.0.0')}
          >
            <View style={styles.settingLeft}>
              <MaterialIcons name="info" size={20} color="#6b7280" />
              <Text style={styles.settingLabel}>App Version</Text>
            </View>
            <Text style={styles.versionText}>1.0.0</Text>
          </TouchableOpacity>
        </View>

        {/* More Settings Button */}
        <TouchableOpacity 
          style={styles.moreSettingsButton}
          onPress={() => navigation.navigate('MemberMoreSettingsTabs')}
        >
          <View style={styles.moreSettingsLeft}>
            <View style={styles.moreSettingsIcon}>
              <MaterialIcons name="settings" size={24} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.moreSettingsTitle}>More Settings</Text>
              <Text style={styles.moreSettingsSubtitle}>Applications, Classes & Organisation</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#ffffff" />
        </TouchableOpacity>

        {editing && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            <MaterialIcons name="save" size={20} color="#ffffff" />
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#ffffff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.versionContainer}>
          <Text style={styles.versionFooterText}>NGO App v1.0.0</Text>
        </View>
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
  editButton: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
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

  profileSection: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#3b82f6',
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#3b82f6',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  changePhotoText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 8,
  },
  profileName: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#1f2937',
    marginTop: 8,
  },
  profileBio: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 12,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  value: {
    fontFamily: Fonts.Regular,
    fontSize: 15,
    color: '#1f2937',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f9fafb',
    fontFamily: Fonts.Regular,
    color: '#1f2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontFamily: Fonts.Regular,
    fontSize: 15,
    color: '#1f2937',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  statusText: {
    fontFamily: Fonts.SemiBold,
    color: '#10b981',
    fontSize: 14,
  },

  // Professional ID Card
  idCardWrapper: {
    marginBottom: 16,
    alignItems: 'center',
  },
  idCard: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  idCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  idCardLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  idCardLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  idCardOrgName: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#ffffff',
    letterSpacing: 2,
  },
  idCardBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  idCardBadgeText: {
    fontFamily: Fonts.Bold,
    fontSize: 11,
    color: '#ffffff',
    letterSpacing: 1,
  },
  idCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  idCardPhotoContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  idCardPhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  idCardPhotoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  idCardInfo: {
    flex: 1,
  },
  idCardName: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#ffffff',
  },
  idCardRole: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  idCardIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  idCardIdText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  idCardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 8,
  },
  idCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
    paddingVertical: 4,
  },
  idCardDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  idCardDetailText: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    maxWidth: width * 0.25,
  },
  idCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  idCardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  idCardStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34d399',
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  idCardStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#34d399',
    letterSpacing: 1,
  },
  idCardValidUntil: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  idCardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    width: '100%',
  },
  idCardAction: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  idCardActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  idCardActionText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#ffffff',
  },

  // Certificates Section
  certHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  certHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  certCount: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  viewAllCertificates: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    gap: 4,
  },
  viewAllText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#3b82f6',
  },
  certItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 10,
  },
  certItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  certItemContent: {
    flex: 1,
  },
  certItemTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
  },
  certItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  certItemType: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  certItemDate: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#9ca3af',
  },
  certItemAmount: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#10b981',
  },
  noCertContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  noCertText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#6b7280',
  },
  noCertSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#9ca3af',
  },

  // Settings
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
  },
  versionText: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
  },

  // More Settings Button
  moreSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  moreSettingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  moreSettingsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreSettingsTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#ffffff',
  },
  moreSettingsSubtitle: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  saveButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  logoutButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
  },
  versionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  versionFooterText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#9ca3af',
  },
});