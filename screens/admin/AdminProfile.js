import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TextInput, TouchableOpacity, Alert, ActivityIndicator, Switch, Modal, Platform, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { signOut } from 'firebase/auth';
import { Fonts } from '../../config/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

export default function AdminProfile({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    profilePhoto: null,
    bio: '',
    designation: 'Admin',
    joinedDate: ''
  });
  const [companyFormData, setCompanyFormData] = useState({
    companyName: '',
    tagline: '',
    description: '',
    about: '',
    mission: '',
    vision: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: ''
  });

  useEffect(() => {
    fetchUserData();
    fetchCompanyData();
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
          bio: data.bio || 'Administrator of NGO App',
          designation: data.designation || 'Admin',
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

  const fetchCompanyData = async () => {
    try {
      const docRef = doc(db, 'company', 'profile');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCompanyData(data);
        setCompanyFormData({
          companyName: data.companyName || data.organizationName || '',
          tagline: data.tagline || '',
          description: data.description || '',
          about: data.about || '',
          mission: data.mission || '',
          vision: data.vision || '',
          email: data.email || '',
          phone: data.phone || data.contactNo || '',
          address: data.address || '',
          website: data.website || '',
          facebook: data.socialMedia?.facebook || '',
          instagram: data.socialMedia?.instagram || '',
          twitter: data.socialMedia?.twitter || '',
          linkedin: data.socialMedia?.linkedin || '',
          youtube: data.socialMedia?.youtube || ''
        });
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
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

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    try {
      await setDoc(doc(db, 'company', 'profile'), {
        organizationName: companyFormData.companyName,
        companyName: companyFormData.companyName,
        tagline: companyFormData.tagline,
        description: companyFormData.description,
        about: companyFormData.about,
        mission: companyFormData.mission,
        vision: companyFormData.vision,
        email: companyFormData.email,
        contactNo: companyFormData.phone,
        phone: companyFormData.phone,
        address: companyFormData.address,
        website: companyFormData.website,
        socialMedia: {
          facebook: companyFormData.facebook,
          instagram: companyFormData.instagram,
          twitter: companyFormData.twitter,
          linkedin: companyFormData.linkedin,
          youtube: companyFormData.youtube
        },
        updatedAt: new Date().toISOString()
      });

      Alert.alert('Success', 'Company profile updated successfully');
      setEditingCompany(false);
      setCompanyModalVisible(false);
      fetchCompanyData();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSavingCompany(false);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF7722" />
        <Text style={[styles.loadingText, { fontSize: isSmallDevice ? 13 : 14 }]}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Saffron Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontSize: isSmallDevice ? 18 : 20 }]}>Admin Profile</Text>
            <TouchableOpacity onPress={() => setEditing(!editing)}>
              <Text style={[styles.editButton, { fontSize: isSmallDevice ? 12 : 14 }]}>
                {editing ? 'Cancel' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Image */}
          <View style={styles.profileSection}>
            <TouchableOpacity onPress={pickImage} disabled={!editing}>
              <View style={styles.profileImageContainer}>
                {formData.profilePhoto ? (
                  <Image source={{ uri: formData.profilePhoto }} style={styles.profileImage} />
                ) : (
                  <View style={styles.placeholderImage}>
                    <MaterialIcons name="person" size={50} color="#FF7722" />
                  </View>
                )}
                {editing && (
                  <View style={styles.cameraIcon}>
                    <MaterialIcons name="photo-camera" size={16} color="#ffffff" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
            {editing && <Text style={[styles.changePhotoText, { fontSize: isSmallDevice ? 11 : 12 }]}>Tap to change photo</Text>}
          </View>

          {/* Profile Details */}
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>Full Name</Text>
              {editing ? (
                <TextInput
                  style={[styles.input, { fontSize: isSmallDevice ? 13 : 14 }]}
                  value={formData.fullName}
                  onChangeText={(text) => setFormData({...formData, fullName: text})}
                  placeholder="Enter full name"
                />
              ) : (
                <Text style={[styles.value, { fontSize: isSmallDevice ? 14 : 15 }]}>{formData.fullName || 'N/A'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>Email</Text>
              <Text style={[styles.value, { fontSize: isSmallDevice ? 14 : 15 }]}>{formData.email}</Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>Phone</Text>
              {editing ? (
                <TextInput
                  style={[styles.input, { fontSize: isSmallDevice ? 13 : 14 }]}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({...formData, phone: text})}
                  keyboardType="phone-pad"
                  placeholder="Enter phone number"
                />
              ) : (
                <Text style={[styles.value, { fontSize: isSmallDevice ? 14 : 15 }]}>{formData.phone || 'Not provided'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>Address</Text>
              {editing ? (
                <TextInput
                  style={[styles.input, styles.textArea, { fontSize: isSmallDevice ? 13 : 14 }]}
                  value={formData.address}
                  onChangeText={(text) => setFormData({...formData, address: text})}
                  multiline
                  numberOfLines={3}
                  placeholder="Enter address"
                />
              ) : (
                <Text style={[styles.value, { fontSize: isSmallDevice ? 14 : 15 }]}>{formData.address || 'Not provided'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>Bio</Text>
              {editing ? (
                <TextInput
                  style={[styles.input, styles.textArea, { fontSize: isSmallDevice ? 13 : 14 }]}
                  value={formData.bio}
                  onChangeText={(text) => setFormData({...formData, bio: text})}
                  multiline
                  numberOfLines={2}
                  placeholder="Tell us about yourself"
                />
              ) : (
                <Text style={[styles.value, { fontSize: isSmallDevice ? 14 : 15 }]}>{formData.bio || 'No bio available'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>Designation</Text>
              <View style={styles.designationBadge}>
                <MaterialIcons name="work" size={14} color="#FF7722" />
                <Text style={[styles.designationText, { fontSize: isSmallDevice ? 13 : 14 }]}>{formData.designation}</Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>Joined Date</Text>
              <View style={styles.dateBadge}>
                <MaterialIcons name="calendar-today" size={14} color="#6b7280" />
                <Text style={[styles.dateText, { fontSize: isSmallDevice ? 14 : 15 }]}>{formData.joinedDate}</Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>Status</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={[styles.statusText, { fontSize: isSmallDevice ? 13 : 14 }]}>Active</Text>
              </View>
            </View>
          </View>

          {/* Organization Settings Button */}
          <TouchableOpacity 
            style={styles.orgSettingsButton}
            onPress={() => navigation.navigate('OrganizationSettingsTabs')}
          >
            <View style={styles.orgSettingsLeft}>
              <View style={styles.orgSettingsIcon}>
                <MaterialIcons name="settings" size={24} color="#ffffff" />
              </View>
              <View>
                <Text style={[styles.orgSettingsTitle, { fontSize: isSmallDevice ? 15 : 16 }]}>
                  Organization Settings
                </Text>
                <Text style={[styles.orgSettingsSubtitle, { fontSize: isSmallDevice ? 11 : 12 }]}>
                  Manage finances, dashboard & commission
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ffffff" />
          </TouchableOpacity>

          {/* Settings */}
          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { fontSize: isSmallDevice ? 15 : 16 }]}>Settings</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <MaterialIcons name="notifications" size={20} color="#6b7280" />
                <Text style={[styles.settingLabel, { fontSize: isSmallDevice ? 13 : 14 }]}>Push Notifications</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#767577', true: '#FF7722' }}
                thumbColor={notifications ? '#ffffff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <MaterialIcons name="dark-mode" size={20} color="#6b7280" />
                <Text style={[styles.settingLabel, { fontSize: isSmallDevice ? 13 : 14 }]}>Dark Mode</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#767577', true: '#FF7722' }}
                thumbColor={darkMode ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Action Buttons */}
          {editing && (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              <MaterialIcons name="save" size={20} color="#ffffff" />
              <Text style={[styles.saveButtonText, { fontSize: isSmallDevice ? 15 : 16 }]}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color="#ffffff" />
            <Text style={[styles.logoutButtonText, { fontSize: isSmallDevice ? 15 : 16 }]}>Logout</Text>
          </TouchableOpacity>

          <View style={styles.versionContainer}>
            <Text style={[styles.versionText, { fontSize: isSmallDevice ? 11 : 12 }]}>NGO App v1.0.0</Text>
          </View>
        </ScrollView>

        {/* Company Profile Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={companyModalVisible}
          onRequestClose={() => setCompanyModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { fontSize: isSmallDevice ? 18 : 20 }]}>Company Profile</Text>
                <View style={styles.modalHeaderRight}>
                  <TouchableOpacity 
                    onPress={() => setEditingCompany(!editingCompany)}
                    style={styles.modalEditButton}
                  >
                    <Text style={[styles.modalEditButtonText, { fontSize: isSmallDevice ? 12 : 14 }]}>
                      {editingCompany ? 'Cancel' : 'Edit'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setCompanyModalVisible(false)}>
                    <MaterialIcons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>Company Name</Text>
                {editingCompany ? (
                  <TextInput
                    style={[styles.input, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={companyFormData.companyName}
                    onChangeText={(text) => setCompanyFormData({...companyFormData, companyName: text})}
                    placeholder="Enter company name"
                  />
                ) : (
                  <Text style={[styles.value, { fontSize: isSmallDevice ? 14 : 15 }]}>
                    {companyFormData.companyName || 'N/A'}
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>Tagline</Text>
                {editingCompany ? (
                  <TextInput
                    style={[styles.input, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={companyFormData.tagline}
                    onChangeText={(text) => setCompanyFormData({...companyFormData, tagline: text})}
                    placeholder="Enter tagline"
                  />
                ) : (
                  <Text style={[styles.value, { fontSize: isSmallDevice ? 14 : 15 }]}>
                    {companyFormData.tagline || 'N/A'}
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>Description</Text>
                {editingCompany ? (
                  <TextInput
                    style={[styles.input, styles.textArea, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={companyFormData.description}
                    onChangeText={(text) => setCompanyFormData({...companyFormData, description: text})}
                    placeholder="Enter description"
                    multiline
                    numberOfLines={3}
                  />
                ) : (
                  <Text style={[styles.value, { fontSize: isSmallDevice ? 14 : 15 }]}>
                    {companyFormData.description || 'N/A'}
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>About</Text>
                {editingCompany ? (
                  <TextInput
                    style={[styles.input, styles.textArea, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={companyFormData.about}
                    onChangeText={(text) => setCompanyFormData({...companyFormData, about: text})}
                    placeholder="Tell about the company"
                    multiline
                    numberOfLines={4}
                  />
                ) : (
                  <Text style={[styles.value, { fontSize: isSmallDevice ? 14 : 15 }]}>
                    {companyFormData.about || 'N/A'}
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>Mission</Text>
                {editingCompany ? (
                  <TextInput
                    style={[styles.input, styles.textArea, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={companyFormData.mission}
                    onChangeText={(text) => setCompanyFormData({...companyFormData, mission: text})}
                    placeholder="Enter mission statement"
                    multiline
                    numberOfLines={2}
                  />
                ) : (
                  <Text style={[styles.value, { fontSize: isSmallDevice ? 14 : 15 }]}>
                    {companyFormData.mission || 'N/A'}
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>Vision</Text>
                {editingCompany ? (
                  <TextInput
                    style={[styles.input, styles.textArea, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={companyFormData.vision}
                    onChangeText={(text) => setCompanyFormData({...companyFormData, vision: text})}
                    placeholder="Enter vision statement"
                    multiline
                    numberOfLines={2}
                  />
                ) : (
                  <Text style={[styles.value, { fontSize: isSmallDevice ? 14 : 15 }]}>
                    {companyFormData.vision || 'N/A'}
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>Email</Text>
                {editingCompany ? (
                  <TextInput
                    style={[styles.input, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={companyFormData.email}
                    onChangeText={(text) => setCompanyFormData({...companyFormData, email: text})}
                    placeholder="Enter email"
                    keyboardType="email-address"
                  />
                ) : (
                  <Text style={[styles.value, { fontSize: isSmallDevice ? 14 : 15 }]}>
                    {companyFormData.email || 'N/A'}
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>Phone</Text>
                {editingCompany ? (
                  <TextInput
                    style={[styles.input, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={companyFormData.phone}
                    onChangeText={(text) => setCompanyFormData({...companyFormData, phone: text})}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={[styles.value, { fontSize: isSmallDevice ? 14 : 15 }]}>
                    {companyFormData.phone || 'N/A'}
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>Address</Text>
                {editingCompany ? (
                  <TextInput
                    style={[styles.input, styles.textArea, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={companyFormData.address}
                    onChangeText={(text) => setCompanyFormData({...companyFormData, address: text})}
                    placeholder="Enter address"
                    multiline
                    numberOfLines={3}
                  />
                ) : (
                  <Text style={[styles.value, { fontSize: isSmallDevice ? 14 : 15 }]}>
                    {companyFormData.address || 'N/A'}
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>Website</Text>
                {editingCompany ? (
                  <TextInput
                    style={[styles.input, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={companyFormData.website}
                    onChangeText={(text) => setCompanyFormData({...companyFormData, website: text})}
                    placeholder="Enter website URL"
                  />
                ) : (
                  <Text style={[styles.value, { fontSize: isSmallDevice ? 14 : 15 }]}>
                    {companyFormData.website || 'N/A'}
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>Facebook</Text>
                {editingCompany ? (
                  <TextInput
                    style={[styles.input, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={companyFormData.facebook}
                    onChangeText={(text) => setCompanyFormData({...companyFormData, facebook: text})}
                    placeholder="Enter Facebook URL"
                  />
                ) : (
                  <Text style={[styles.value, { fontSize: isSmallDevice ? 14 : 15 }]}>
                    {companyFormData.facebook || 'N/A'}
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>Instagram</Text>
                {editingCompany ? (
                  <TextInput
                    style={[styles.input, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={companyFormData.instagram}
                    onChangeText={(text) => setCompanyFormData({...companyFormData, instagram: text})}
                    placeholder="Enter Instagram URL"
                  />
                ) : (
                  <Text style={[styles.value, { fontSize: isSmallDevice ? 14 : 15 }]}>
                    {companyFormData.instagram || 'N/A'}
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>Twitter</Text>
                {editingCompany ? (
                  <TextInput
                    style={[styles.input, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={companyFormData.twitter}
                    onChangeText={(text) => setCompanyFormData({...companyFormData, twitter: text})}
                    placeholder="Enter Twitter URL"
                  />
                ) : (
                  <Text style={[styles.value, { fontSize: isSmallDevice ? 14 : 15 }]}>
                    {companyFormData.twitter || 'N/A'}
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>LinkedIn</Text>
                {editingCompany ? (
                  <TextInput
                    style={[styles.input, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={companyFormData.linkedin}
                    onChangeText={(text) => setCompanyFormData({...companyFormData, linkedin: text})}
                    placeholder="Enter LinkedIn URL"
                  />
                ) : (
                  <Text style={[styles.value, { fontSize: isSmallDevice ? 14 : 15 }]}>
                    {companyFormData.linkedin || 'N/A'}
                  </Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { fontSize: isSmallDevice ? 11 : 12 }]}>YouTube</Text>
                {editingCompany ? (
                  <TextInput
                    style={[styles.input, { fontSize: isSmallDevice ? 13 : 14 }]}
                    value={companyFormData.youtube}
                    onChangeText={(text) => setCompanyFormData({...companyFormData, youtube: text})}
                    placeholder="Enter YouTube URL"
                  />
                ) : (
                  <Text style={[styles.value, { fontSize: isSmallDevice ? 14 : 15 }]}>
                    {companyFormData.youtube || 'N/A'}
                  </Text>
                )}
              </View>

              {editingCompany && (
                <TouchableOpacity 
                  style={styles.saveCompanyButton} 
                  onPress={handleSaveCompany} 
                  disabled={savingCompany}
                >
                  <Text style={[styles.saveCompanyButtonText, { fontSize: isSmallDevice ? 15 : 16 }]}>
                    {savingCompany ? 'Saving...' : 'Save Company Profile'}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fdf8f3',
  },
  container: {
    flex: 1,
    backgroundColor: '#fdf8f3',
  },
  headerCard: {
    backgroundColor: '#FF7722',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 50,
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
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  editButton: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
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
    borderColor: '#FF7722',
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF5EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FF7722',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF7722',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  changePhotoText: {
    fontFamily: Fonts.Regular,
    color: '#FF7722',
    marginTop: 8,
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
  field: {
    marginBottom: 12,
  },
  label: {
    fontFamily: Fonts.SemiBold,
    color: '#6b7280',
    marginBottom: 4,
  },
  value: {
    fontFamily: Fonts.Regular,
    color: '#1f2937',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f9fafb',
    fontFamily: Fonts.Regular,
    color: '#1f2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  designationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5EB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  designationText: {
    fontFamily: Fonts.SemiBold,
    color: '#FF7722',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontFamily: Fonts.Regular,
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
  },
  sectionTitle: {
    fontFamily: Fonts.Bold,
    color: '#1f2937',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
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
    color: '#1f2937',
  },
  orgSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF7722',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#FF7722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  orgSettingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orgSettingsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orgSettingsTitle: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
  },
  orgSettingsSubtitle: {
    fontFamily: Fonts.Regular,
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
  },
  versionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  versionText: {
    fontFamily: Fonts.Regular,
    color: '#9ca3af',
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
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalEditButton: {
    padding: 4,
  },
  modalEditButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#FF7722',
  },
  modalTitle: {
    fontFamily: Fonts.Bold,
    color: '#1f2937',
  },
  saveCompanyButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  saveCompanyButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
  },
});