import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { db, storage } from '../../config/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Fonts } from '../../config/fonts';
import { MaterialIcons } from '@expo/vector-icons';

export default function CompanyProfileManagement({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [companyData, setCompanyData] = useState({
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
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      youtube: ''
    },
    logo: null,
    coverImage: null,
    establishedYear: '',
    employees: '',
    registrationNumber: '',
    workingHours: {
      monday: '9:00 AM - 6:00 PM',
      tuesday: '9:00 AM - 6:00 PM',
      wednesday: '9:00 AM - 6:00 PM',
      thursday: '9:00 AM - 6:00 PM',
      friday: '9:00 AM - 6:00 PM',
      saturday: '9:00 AM - 2:00 PM',
      sunday: 'Closed'
    }
  });

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'company', 'profile');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCompanyData(docSnap.data());
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
      Alert.alert('Error', 'Failed to load company data');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (field) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your gallery');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: field === 'logo' ? [1, 1] : [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      setCompanyData({ ...companyData, [field]: result.assets[0].uri });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let logoUrl = companyData.logo;
      let coverUrl = companyData.coverImage;

      // Upload logo if changed
      if (companyData.logo && companyData.logo.startsWith('file://')) {
        const response = await fetch(companyData.logo);
        const blob = await response.blob();
        const imageRef = ref(storage, 'company/logo.jpg');
        await uploadBytes(imageRef, blob);
        logoUrl = await getDownloadURL(imageRef);
      }

      // Upload cover if changed
      if (companyData.coverImage && companyData.coverImage.startsWith('file://')) {
        const response = await fetch(companyData.coverImage);
        const blob = await response.blob();
        const imageRef = ref(storage, 'company/cover.jpg');
        await uploadBytes(imageRef, blob);
        coverUrl = await getDownloadURL(imageRef);
      }

      const updatedData = {
        ...companyData,
        logo: logoUrl,
        coverImage: coverUrl,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'company', 'profile'), updatedData);
      setCompanyData(updatedData);
      setEditing(false);
      Alert.alert('Success', 'Company profile updated successfully');
    } catch (error) {
      console.error('Error saving company data:', error);
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading Company Profile...</Text>
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
          <Text style={styles.headerTitle}>Company Profile</Text>
          <TouchableOpacity onPress={() => setEditing(!editing)} activeOpacity={0.7}>
            <Text style={styles.editButton}>{editing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Cover Image */}
        <TouchableOpacity onPress={() => editing && pickImage('coverImage')} disabled={!editing} activeOpacity={0.7}>
          <View style={styles.coverContainer}>
            {companyData.coverImage ? (
              <Image source={{ uri: companyData.coverImage }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <MaterialIcons name="image" size={40} color="#9ca3af" />
                <Text style={styles.coverPlaceholderText}>Cover Image</Text>
                <Text style={styles.coverPlaceholderSub}>Tap to upload</Text>
              </View>
            )}
            {editing && (
              <View style={styles.coverEditBadge}>
                <MaterialIcons name="photo-camera" size={14} color="#ffffff" />
                <Text style={styles.coverEditText}>Change Cover</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoSection}>
          <TouchableOpacity onPress={() => editing && pickImage('logo')} disabled={!editing} activeOpacity={0.7}>
            <View style={styles.logoContainer}>
              {companyData.logo ? (
                <Image source={{ uri: companyData.logo }} style={styles.logoImage} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <MaterialIcons name="business" size={40} color="#3b82f6" />
                </View>
              )}
              {editing && (
                <View style={styles.logoEditBadge}>
                  <MaterialIcons name="photo-camera" size={14} color="#ffffff" />
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Company Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Company Details</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Company Name *</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={companyData.companyName}
                onChangeText={(text) => setCompanyData({...companyData, companyName: text})}
                placeholder="Enter company name"
                textAlignVertical="center"
              />
            ) : (
              <Text style={styles.value}>{companyData.companyName || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Tagline</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={companyData.tagline}
                onChangeText={(text) => setCompanyData({...companyData, tagline: text})}
                placeholder="Enter tagline"
                textAlignVertical="center"
              />
            ) : (
              <Text style={styles.value}>{companyData.tagline || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={companyData.description}
                onChangeText={(text) => setCompanyData({...companyData, description: text})}
                multiline
                numberOfLines={3}
                placeholder="Enter company description"
                textAlignVertical="top"
              />
            ) : (
              <Text style={styles.value}>{companyData.description || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Registration Number</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={companyData.registrationNumber}
                onChangeText={(text) => setCompanyData({...companyData, registrationNumber: text})}
                placeholder="Enter registration number"
                textAlignVertical="center"
              />
            ) : (
              <Text style={styles.value}>{companyData.registrationNumber || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Established Year</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={companyData.establishedYear}
                onChangeText={(text) => setCompanyData({...companyData, establishedYear: text})}
                keyboardType="numeric"
                placeholder="Enter established year"
                textAlignVertical="center"
              />
            ) : (
              <Text style={styles.value}>{companyData.establishedYear || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Number of Employees</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={companyData.employees}
                onChangeText={(text) => setCompanyData({...companyData, employees: text})}
                keyboardType="numeric"
                placeholder="Enter number of employees"
                textAlignVertical="center"
              />
            ) : (
              <Text style={styles.value}>{companyData.employees || 'Not set'}</Text>
            )}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About Us</Text>

          <View style={styles.field}>
            <Text style={styles.label}>About</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={companyData.about}
                onChangeText={(text) => setCompanyData({...companyData, about: text})}
                multiline
                numberOfLines={5}
                placeholder="Tell your company story"
                textAlignVertical="top"
              />
            ) : (
              <Text style={styles.value}>{companyData.about || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mission</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={companyData.mission}
                onChangeText={(text) => setCompanyData({...companyData, mission: text})}
                multiline
                numberOfLines={3}
                placeholder="Enter mission statement"
                textAlignVertical="top"
              />
            ) : (
              <Text style={styles.value}>{companyData.mission || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Vision</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={companyData.vision}
                onChangeText={(text) => setCompanyData({...companyData, vision: text})}
                multiline
                numberOfLines={3}
                placeholder="Enter vision statement"
                textAlignVertical="top"
              />
            ) : (
              <Text style={styles.value}>{companyData.vision || 'Not set'}</Text>
            )}
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={companyData.email}
                onChangeText={(text) => setCompanyData({...companyData, email: text})}
                keyboardType="email-address"
                placeholder="Enter email address"
                textAlignVertical="center"
              />
            ) : (
              <Text style={styles.value}>{companyData.email || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={companyData.phone}
                onChangeText={(text) => setCompanyData({...companyData, phone: text})}
                keyboardType="phone-pad"
                placeholder="Enter phone number"
                textAlignVertical="center"
              />
            ) : (
              <Text style={styles.value}>{companyData.phone || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Address</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={companyData.address}
                onChangeText={(text) => setCompanyData({...companyData, address: text})}
                multiline
                numberOfLines={3}
                placeholder="Enter address"
                textAlignVertical="top"
              />
            ) : (
              <Text style={styles.value}>{companyData.address || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Website</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={companyData.website}
                onChangeText={(text) => setCompanyData({...companyData, website: text})}
                placeholder="Enter website URL"
                textAlignVertical="center"
              />
            ) : (
              <Text style={styles.value}>{companyData.website || 'Not set'}</Text>
            )}
          </View>
        </View>

        {/* Social Media */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Social Media</Text>

          {['facebook', 'instagram', 'twitter', 'linkedin', 'youtube'].map((platform) => (
            <View key={platform} style={styles.field}>
              <Text style={styles.label}>{platform.charAt(0).toUpperCase() + platform.slice(1)}</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={companyData.socialMedia?.[platform] || ''}
                  onChangeText={(text) => setCompanyData({
                    ...companyData,
                    socialMedia: { ...companyData.socialMedia, [platform]: text }
                  })}
                  placeholder={`Enter ${platform} URL`}
                  textAlignVertical="center"
                />
              ) : (
                <Text style={styles.value}>
                  {companyData.socialMedia?.[platform] ? (
                    <Text style={styles.socialLink}>{companyData.socialMedia[platform]}</Text>
                  ) : (
                    'Not set'
                  )}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Working Hours */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Working Hours</Text>

          {Object.entries(companyData.workingHours || {}).map(([day, hours]) => (
            <View key={day} style={styles.workingHourItem}>
              <Text style={styles.dayLabel}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
              {editing ? (
                <TextInput
                  style={[styles.input, styles.hoursInput]}
                  value={hours}
                  onChangeText={(text) => setCompanyData({
                    ...companyData,
                    workingHours: { ...companyData.workingHours, [day]: text }
                  })}
                  placeholder="Enter working hours"
                  textAlignVertical="center"
                />
              ) : (
                <Text style={styles.hoursText}>{hours}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Save Button */}
        {editing && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving} activeOpacity={0.7}>
            <MaterialIcons name="save" size={20} color="#ffffff" />
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        )}

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
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  editButton: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  scrollView: {
    flex: 1,
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

  coverContainer: {
    position: 'relative',
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: -50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  coverPlaceholderText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  coverPlaceholderSub: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  coverEditBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  coverEditText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  logoSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoContainer: {
    position: 'relative',
    marginTop: -60,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: '#ffffff',
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  logoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    padding: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  field: {
    marginBottom: 12,
  },
  label: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  value: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
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
    includeFontPadding: false,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  socialLink: {
    color: '#3b82f6',
  },

  workingHourItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dayLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    width: 100,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  hoursInput: {
    flex: 1,
    marginLeft: 10,
  },
  hoursText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});