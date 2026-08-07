import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TextInput, TouchableOpacity, Alert, ActivityIndicator, Switch, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { signOut } from 'firebase/auth';
import { Fonts } from '../../config/fonts';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Defs, Pattern, Rect, Image as SvgImage } from 'react-native-svg';

const { width } = Dimensions.get('window');

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
    reportingTo: '',
    fatherName: '',
    dob: '',
    aadharNumber: '',
    membershipStatus: 'Active'
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
          reportingTo: data.reportingTo || 'N/A',
          fatherName: data.fatherName || '',
          dob: data.dob || '',
          aadharNumber: data.aadharNumber || '',
          membershipStatus: data.membershipStatus || 'Active'
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
        fatherName: formData.fatherName,
        dob: formData.dob,
        aadharNumber: formData.aadharNumber,
        membershipStatus: formData.membershipStatus,
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

  const navigateToCertificates = () => {
    navigation.navigate('WorkingMemberCertificate');
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
          <Text style={styles.headerTitle} numberOfLines={1}>Working Member Profile</Text>
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
          <Text style={styles.profileName} numberOfLines={1}>{formData.fullName || 'Working Member'}</Text>
          <Text style={styles.profileBio} numberOfLines={1}>{formData.bio || 'Working Member'}</Text>
          {editing && <Text style={styles.changePhotoText}>Tap to change photo</Text>}
        </View>

        {/* Identity Card - Hindi Version */}
        <View style={styles.idCardWrapper}>
          <View style={styles.idCard}>
            {/* Background Watermark */}
            <View style={styles.watermarkContainer}>
              <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
                <Defs>
                  <Pattern id="watermark" patternUnits="userSpaceOnUse" width={100} height={100}>
                    <SvgImage
                      href={require('../../assets/watermark.png')}
                      width={100}
                      height={100}
                      opacity={0.08}
                    />
                  </Pattern>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#watermark)" />
              </Svg>
            </View>

            {/* Top Section - Logos and Title */}
            <View style={styles.idCardTopSection}>
              {/* Left Logo */}
              <View style={styles.idCardLeftLogo}>
                <Image 
                  source={{ uri: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR7cLJLLXgddsZygiRpdvi-NzOpYcooRXCS7kd9BK6Fcg&s=10' }}
                  style={styles.idCardLogoImage}
                  resizeMode="contain"
                />
              </View>

              {/* Center Title */}
              <View style={styles.idCardCenterTitle}>
                <Text style={styles.idCardMainTitle}>कबीर सत धर्म फाउंडेशन (ट्रस्ट)</Text>
                <Text style={styles.idCardSubTitle}>भारत सरकार द्वारा मान्यता प्राप्त</Text>
                <Text style={styles.idCardRegNo}>पंजीकरण संख्या: U8550BR2024NPL067466</Text>
              </View>

              {/* Right Logo */}
              <View style={styles.idCardRightLogo}>
                <Image 
                  source={{ uri: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRkyFSf2hPLbia_p0WxL6wQmoXFPTGlaWahT0DXI8nJjQ&s=10' }}
                  style={styles.idCardLogoImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Identity Card Title */}
            <View style={styles.idCardIdentityTitle}>
              <Text style={styles.idCardIdentityText}>पहचान पत्र</Text>
            </View>

            {/* ID Card Body - Left Fields & Right Photo */}
<View style={styles.idCardBody}>
  {/* Left Fields */}
  <View style={styles.idCardLeftFields}>
    <View style={styles.idCardField}>
      <Text style={styles.idCardFieldLabel}>नाम :</Text>
      <Text style={styles.idCardFieldValue} numberOfLines={1}>{formData.fullName || 'N/A'}</Text>
    </View>
    <View style={styles.idCardField}>
      <Text style={styles.idCardFieldLabel}>पिता/पति का नाम :</Text>
      <Text style={styles.idCardFieldValue} numberOfLines={1}>{formData.fatherName || 'N/A'}</Text>
    </View>
    <View style={styles.idCardField}>
      <Text style={styles.idCardFieldLabel}>जन्म तिथि :</Text>
      <Text style={styles.idCardFieldValue} numberOfLines={1}>{formData.dob || 'N/A'}</Text>
    </View>
    <View style={styles.idCardField}>
      <Text style={styles.idCardFieldLabel}>आधार संख्या :</Text>
      <Text style={styles.idCardFieldValue} numberOfLines={1}>{formData.aadharNumber || 'N/A'}</Text>
    </View>
    <View style={styles.idCardField}>
      <Text style={styles.idCardFieldLabel}>सदस्यता स्थिति :</Text>
      <Text style={[styles.idCardFieldValue, styles.idCardStatusValue]} numberOfLines={1}>{formData.membershipStatus || 'Active'}</Text>
    </View>
    <View style={styles.idCardField}>
      <Text style={styles.idCardFieldLabel}>मोबाइल नंबर :</Text>
      <Text style={styles.idCardFieldValue} numberOfLines={1}>{formData.phone || 'N/A'}</Text>
    </View>
    <View style={styles.idCardField}>
      <Text style={styles.idCardFieldLabel}>पता :</Text>
      <Text style={styles.idCardFieldValue} numberOfLines={2}>{formData.address || 'N/A'}</Text>
    </View>
  </View>

  {/* Right Photo - Positioned lower */}
  <View style={styles.idCardRightPhoto}>
    <View style={styles.idCardPhotoWrapper}>
      {formData.profilePhoto ? (
        <Image source={{ uri: formData.profilePhoto }} style={styles.idCardPhoto} />
      ) : (
        <View style={styles.idCardPhotoPlaceholder}>
          <MaterialIcons name="person" size={60} color="#8b5cf6" />
        </View>
      )}
    </View>
    <Text style={styles.idCardPhotoLabel}>फोटो</Text>
  </View>
</View>

            {/* ID Card Footer */}
            <View style={styles.idCardFooter}>
              <Text style={styles.idCardFooterText}>प्रबंधक</Text>
              <View style={styles.idCardFooterCenter}>
                <View style={styles.idCardSignatureLine} />
                <Text style={styles.idCardSignatureLabel}>सदस्य हस्ताक्षर</Text>
              </View>
              <Text style={styles.idCardFooterText}>सचिव</Text>
            </View>
          </View>
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
                placeholderTextColor="#9ca3af"
              />
            ) : (
              <Text style={styles.value} numberOfLines={1}>{formData.fullName || 'N/A'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Father/Husband Name</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.fatherName}
                onChangeText={(text) => setFormData({...formData, fatherName: text})}
                placeholder="Enter father/husband name"
                placeholderTextColor="#9ca3af"
              />
            ) : (
              <Text style={styles.value} numberOfLines={1}>{formData.fatherName || 'N/A'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date of Birth</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.dob}
                onChangeText={(text) => setFormData({...formData, dob: text})}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#9ca3af"
              />
            ) : (
              <Text style={styles.value} numberOfLines={1}>{formData.dob || 'N/A'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Aadhar Number</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.aadharNumber}
                onChangeText={(text) => setFormData({...formData, aadharNumber: text})}
                placeholder="Enter Aadhar number"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.value} numberOfLines={1}>{formData.aadharNumber || 'N/A'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Membership Status</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.membershipStatus}
                onChangeText={(text) => setFormData({...formData, membershipStatus: text})}
                placeholder="Active/Inactive"
                placeholderTextColor="#9ca3af"
              />
            ) : (
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>{formData.membershipStatus}</Text>
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value} numberOfLines={1}>{formData.email}</Text>
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
                placeholderTextColor="#9ca3af"
              />
            ) : (
              <Text style={styles.value} numberOfLines={1}>{formData.phone || 'Not provided'}</Text>
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
                placeholderTextColor="#9ca3af"
                textAlignVertical="top"
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
                placeholderTextColor="#9ca3af"
                textAlignVertical="top"
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
                placeholderTextColor="#9ca3af"
              />
            ) : (
              <View style={styles.badgeContainer}>
                <MaterialIcons name="business" size={16} color="#8b5cf6" />
                <Text style={styles.value} numberOfLines={1}>{formData.department}</Text>
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
                placeholderTextColor="#9ca3af"
              />
            ) : (
              <View style={styles.badgeContainer}>
                <MaterialIcons name="work" size={16} color="#8b5cf6" />
                <Text style={styles.value} numberOfLines={1}>{formData.position}</Text>
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Employee ID</Text>
            <View style={styles.badgeContainer}>
              <MaterialIcons name="badge" size={16} color="#8b5cf6" />
              <Text style={styles.value} numberOfLines={1}>{formData.employeeId}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Reporting To</Text>
            <View style={styles.badgeContainer}>
              <MaterialIcons name="person" size={16} color="#f59e0b" />
              <Text style={styles.value} numberOfLines={1}>{formData.reportingTo}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Joined Date</Text>
            <View style={styles.dateBadge}>
              <MaterialIcons name="calendar-today" size={14} color="#6b7280" />
              <Text style={styles.dateText} numberOfLines={1}>{formData.joinedDate}</Text>
            </View>
          </View>
        </View>

        {/* Certificates Section */}
        <TouchableOpacity style={styles.card} onPress={navigateToCertificates} activeOpacity={0.7}>
          <View style={styles.certHeader}>
            <Text style={styles.cardTitle}>Certificates</Text>
            <View style={styles.certHeaderRight}>
              {certificates.length > 0 && (
                <Text style={styles.certCount} numberOfLines={1}>{certificates.length} earned</Text>
              )}
              <MaterialIcons name="chevron-right" size={20} color="#8b5cf6" />
            </View>
          </View>

          {certificates.length > 0 ? (
            <>
              {displayedCertificates.map((cert, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.certItem}
                  onPress={() => navigation.navigate('WorkingMemberCertificate', { certificate: cert })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.certItemIcon, { backgroundColor: getCertificateColor(cert.type) + '15' }]}>
                    <MaterialIcons name={getCertificateIcon(cert.type)} size={16} color={getCertificateColor(cert.type)} />
                  </View>
                  <View style={styles.certItemContent}>
                    <Text style={styles.certItemTitle} numberOfLines={1}>{cert.title || getCertificateTypeLabel(cert.type)}</Text>
                    <View style={styles.certItemMeta}>
                      <Text style={styles.certItemType} numberOfLines={1}>{getCertificateTypeLabel(cert.type)}</Text>
                      <Text style={styles.certItemDate} numberOfLines={1}>
                        {cert.issuedDate ? new Date(cert.issuedDate).toLocaleDateString() : 'N/A'}
                      </Text>
                    </View>
                  </View>
                  {cert.amount && (
                    <Text style={styles.certItemAmount} numberOfLines={1}>₹{cert.amount}</Text>
                  )}
                  <MaterialIcons name="chevron-right" size={20} color="#d1d5db" />
                </TouchableOpacity>
              ))}
              {certificates.length > 3 && (
                <TouchableOpacity 
                  style={styles.viewAllCertificates}
                  onPress={() => setShowAllCertificates(!showAllCertificates)}
                >
                  <Text style={styles.viewAllText} numberOfLines={1}>
                    {showAllCertificates ? 'Show Less' : `View All ${certificates.length} Certificates`}
                  </Text>
                  <MaterialIcons 
                    name={showAllCertificates ? 'expand-less' : 'expand-more'} 
                    size={16} 
                    color="#8b5cf6" 
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
            <View style={styles.moreSettingsTextContainer}>
              <Text style={styles.moreSettingsTitle}>More Settings</Text>
              <Text style={styles.moreSettingsSubtitle} numberOfLines={1}>Applications, Classes & Organisation</Text>
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
    paddingHorizontal: 8,
  },
  editButton: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
    paddingHorizontal: 4,
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
    maxWidth: width - 60,
  },
  profileBio: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    maxWidth: width - 60,
  },

  // Identity Card Styles
  idCardWrapper: {
    marginBottom: 16,
    alignItems: 'center',
  },
  idCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  watermarkContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  idCardTopSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  idCardLeftLogo: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  idCardRightLogo: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  idCardLogoImage: {
    width: 50,
    height: 50,
  },
  idCardCenterTitle: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  idCardMainTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#1f2937',
    textAlign: 'center',
  },
  idCardSubTitle: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#4b5563',
    textAlign: 'center',
    marginTop: 2,
  },
  idCardRegNo: {
    fontFamily: Fonts.Regular,
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },
  idCardIdentityTitle: {
    alignItems: 'center',
    marginVertical: 6,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#d1d5db',
  },
  idCardIdentityText: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
    letterSpacing: 2,
  },
  idCardBody: {
    flexDirection: 'row',
    marginTop: 8,
    paddingVertical: 4,
  },
  idCardLeftFields: {
    flex: 1,
    paddingRight: 8,
  },
  idCardField: {
    marginBottom: 4,
  },
  idCardFieldLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#4b5563',
  },
  idCardFieldValue: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#1f2937',
    marginLeft: 4,
  },
  idCardStatusValue: {
    color: '#10b981',
    fontFamily: Fonts.SemiBold,
  },
  idCardRightPhoto: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 8,
  },
  idCardPhoto: {
    width: 140,
    height: 160,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginLeft: -50
  },
  idCardPhotoPlaceholder: {
    width: 80,
    height: 90,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  idCardPhotoLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 8,
    color: '#6b7280',
    marginTop: 2,
  },
  idCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  idCardFooterText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#4b5563',
  },
  idCardFooterCenter: {
    alignItems: 'center',
  },
  idCardSignatureLine: {
    width: 80,
    height: 1,
    backgroundColor: '#9ca3af',
    marginBottom: 2,
  },
  idCardSignatureLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 8,
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
    flexShrink: 1,
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
    color: '#8b5cf6',
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
    flexShrink: 0,
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
    flexWrap: 'wrap',
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
    flexShrink: 0,
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
    flex: 1,
  },
  settingLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    flexShrink: 1,
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
    flex: 1,
  },
  moreSettingsTextContainer: {
    flex: 1,
  },
  moreSettingsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
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