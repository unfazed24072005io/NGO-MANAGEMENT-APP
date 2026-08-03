import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TextInput, TouchableOpacity, Alert, ActivityIndicator, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { signOut } from 'firebase/auth';
import { Fonts } from '../../config/fonts';

export default function WorkingMemberProfile({ navigation }) {
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
    joinedDate: '',
    department: '',
    position: '',
    employeeId: '',
    reportingTo: ''
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
          bio: data.bio || 'Working Member',
          joinedDate: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
          department: data.department || 'Not assigned',
          position: data.position || 'Working Member',
          employeeId: data.employeeId || `WM-${userId.slice(0, 6).toUpperCase()}`,
          reportingTo: data.reportingTo || 'N/A'
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
      setCardId(`WM-${userId.slice(0, 8).toUpperCase()}`);
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
        department: formData.department,
        position: formData.position,
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
      case 'membership': return '#8b5cf6';
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  const displayedCertificates = showAllCertificates ? certificates : certificates.slice(0, 3);

  return (
    <View style={styles.container}>
      {/* Purple Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Working Member Profile</Text>
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
                  <MaterialIcons name="person" size={50} color="#8b5cf6" />
                </View>
              )}
              {editing && (
                <View style={styles.cameraIcon}>
                  <MaterialIcons name="photo-camera" size={16} color="#ffffff" />
                </View>
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{formData.fullName || 'Working Member'}</Text>
          <Text style={styles.profileBio}>{formData.bio || 'Working Member'}</Text>
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
            <Text style={styles.label}>Bio</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.bio}
                onChangeText={(text) => setFormData({...formData, bio: text})}
                multiline
                numberOfLines={2}
                placeholder="Tell us about yourself"
              />
            ) : (
              <Text style={styles.value}>{formData.bio || 'No bio available'}</Text>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.label}>Department</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.department}
                onChangeText={(text) => setFormData({...formData, department: text})}
                placeholder="Enter department"
              />
            ) : (
              <View style={styles.badgeContainer}>
                <MaterialIcons name="business" size={16} color="#8b5cf6" />
                <Text style={styles.value}>{formData.department}</Text>
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Position</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.position}
                onChangeText={(text) => setFormData({...formData, position: text})}
                placeholder="Enter position"
              />
            ) : (
              <View style={styles.badgeContainer}>
                <MaterialIcons name="work" size={16} color="#8b5cf6" />
                <Text style={styles.value}>{formData.position}</Text>
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Employee ID</Text>
            <View style={styles.badgeContainer}>
              <MaterialIcons name="badge" size={16} color="#8b5cf6" />
              <Text style={styles.value}>{formData.employeeId}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Reporting To</Text>
            <View style={styles.badgeContainer}>
              <MaterialIcons name="person" size={16} color="#f59e0b" />
              <Text style={styles.value}>{formData.reportingTo}</Text>
            </View>
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

        {/* ID Card Section - Displayed Directly */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ID Card</Text>
          <View style={styles.idCardDisplay}>
            <View style={styles.idCardHeader}>
              <View style={styles.idCardLogo}>
                <MaterialIcons name="volunteer-activism" size={20} color="#ffffff" />
              </View>
              <Text style={styles.idCardTitleText}>WORKING MEMBER</Text>
              <View style={styles.idCardBadge}>
                <Text style={styles.idCardBadgeText}>ACTIVE</Text>
              </View>
            </View>

            <View style={styles.idCardBody}>
              <View style={styles.idCardAvatarContainer}>
                {formData.profilePhoto ? (
                  <Image source={{ uri: formData.profilePhoto }} style={styles.idCardAvatar} />
                ) : (
                  <View style={styles.idCardAvatarPlaceholder}>
                    <MaterialIcons name="person" size={30} color="#8b5cf6" />
                  </View>
                )}
              </View>
              <Text style={styles.idCardName}>{formData.fullName || 'Working Member'}</Text>
              <Text style={styles.idCardId}>ID: {cardId}</Text>
              <Text style={styles.idCardPosition}>{formData.position}</Text>
            </View>

            <View style={styles.idCardFooter}>
              <View style={styles.idCardDetail}>
                <MaterialIcons name="email" size={14} color="#6b7280" />
                <Text style={styles.idCardDetailText}>{formData.email || 'N/A'}</Text>
              </View>
              <View style={styles.idCardDetail}>
                <MaterialIcons name="phone" size={14} color="#6b7280" />
                <Text style={styles.idCardDetailText}>{formData.phone || 'N/A'}</Text>
              </View>
              <View style={styles.idCardDetail}>
                <MaterialIcons name="business" size={14} color="#6b7280" />
                <Text style={styles.idCardDetailText}>{formData.department}</Text>
              </View>
              <View style={styles.idCardDetail}>
                <MaterialIcons name="calendar-today" size={14} color="#6b7280" />
                <Text style={styles.idCardDetailText}>Joined: {formData.joinedDate}</Text>
              </View>
            </View>

            <View style={styles.idCardBottom}>
              <Text style={styles.idCardBottomText}>Valid Until: {new Date().getFullYear() + 1}-12-31</Text>
            </View>
          </View>
        </View>

        {/* Certificates Section - Displayed Directly */}
        <View style={styles.card}>
          <View style={styles.certHeader}>
            <Text style={styles.cardTitle}>Certificates</Text>
            {certificates.length > 3 && (
              <TouchableOpacity onPress={() => setShowAllCertificates(!showAllCertificates)}>
                <Text style={styles.viewAllText}>
                  {showAllCertificates ? 'Show Less' : `View All (${certificates.length})`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {certificates.length > 0 ? (
            <>
              {displayedCertificates.map((cert, index) => (
                <View key={index} style={styles.certItem}>
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
                </View>
              ))}
              <View style={styles.certTotalBadge}>
                <MaterialIcons name="verified" size={16} color="#10b981" />
                <Text style={styles.certTotalText}>Total Certificates: {certificates.length}</Text>
              </View>
            </>
          ) : (
            <View style={styles.noCertContainer}>
              <MaterialIcons name="verified" size={30} color="#d1d5db" />
              <Text style={styles.noCertText}>No certificates earned yet</Text>
              <Text style={styles.noCertSubtext}>Complete activities to earn certificates</Text>
            </View>
          )}
        </View>

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
              trackColor={{ false: '#d1d5db', true: '#8b5cf6' }}
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
          onPress={() => navigation.navigate('WorkingMemberMoreSettingsTabs')}
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
    backgroundColor: '#fdf8f3',
  },

  // Purple Header
  headerCard: {
    backgroundColor: '#8b5cf6',
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
    backgroundColor: '#fdf8f3',
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
    borderColor: '#8b5cf6',
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#8b5cf6',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#8b5cf6',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  changePhotoText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#8b5cf6',
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
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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

  // ID Card Display
  idCardDisplay: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  idCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#8b5cf6',
  },
  idCardLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  idCardTitleText: {
    fontFamily: Fonts.Bold,
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 1,
  },
  idCardBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  idCardBadgeText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 9,
  },
  idCardBody: {
    alignItems: 'center',
    padding: 16,
    paddingTop: 12,
  },
  idCardAvatarContainer: {
    marginBottom: 8,
  },
  idCardAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  idCardAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  idCardName: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#1f2937',
  },
  idCardId: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  idCardPosition: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#8b5cf6',
    marginTop: 2,
  },
  idCardFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 4,
  },
  idCardDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  idCardDetailText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#1f2937',
  },
  idCardBottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  idCardBottomText: {
    fontFamily: Fonts.Regular,
    fontSize: 9,
    color: '#6b7280',
  },

  // Certificates Section
  certHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#8b5cf6',
  },
  certItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
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
  certTotalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  certTotalText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#059669',
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
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#8b5cf6',
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