import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function CompanyManagement({ navigation }) {
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
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
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'company', 'profile');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCompanyData(data);
        setFormData({
          companyName: data.companyName || '',
          tagline: data.tagline || '',
          description: data.description || '',
          about: data.about || '',
          mission: data.mission || '',
          vision: data.vision || '',
          email: data.email || '',
          phone: data.phone || '',
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
      Alert.alert('Error', 'Failed to load company data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.companyName) {
      Alert.alert('Error', 'Company name is required');
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, 'company', 'profile'), {
        companyName: formData.companyName,
        tagline: formData.tagline,
        description: formData.description,
        about: formData.about,
        mission: formData.mission,
        vision: formData.vision,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        website: formData.website,
        socialMedia: {
          facebook: formData.facebook,
          instagram: formData.instagram,
          twitter: formData.twitter,
          linkedin: formData.linkedin,
          youtube: formData.youtube
        },
        updatedAt: new Date().toISOString()
      });

      Alert.alert('Success', 'Company profile updated successfully');
      setEditing(false);
      fetchCompanyData();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCompanyData();
    setRefreshing(false);
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Company Profile</Text>
          <TouchableOpacity 
            style={[styles.editButton, editing && styles.cancelButton]} 
            onPress={() => setEditing(!editing)}
          >
            <MaterialIcons name={editing ? "close" : "edit"} size={18} color="#ffffff" />
            <Text style={styles.editButtonText}>{editing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Company Info Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <MaterialIcons name="business" size={32} color="#3b82f6" />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryName}>{formData.companyName || 'NGO Name'}</Text>
            <Text style={styles.summaryTagline}>{formData.tagline || 'Add a tagline'}</Text>
          </View>
        </View>

        {/* Basic Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="info" size={20} color="#3b82f6" />
            <Text style={styles.cardTitle}>Basic Information</Text>
            {!editing && companyData && (
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active</Text>
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Company Name *</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.inputFocused]}
                value={formData.companyName}
                onChangeText={(text) => setFormData({...formData, companyName: text})}
                placeholder="Enter company name"
                placeholderTextColor="#9ca3af"
              />
            ) : (
              <Text style={styles.value}>{formData.companyName || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Tagline</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.tagline}
                onChangeText={(text) => setFormData({...formData, tagline: text})}
                placeholder="Enter tagline"
                placeholderTextColor="#9ca3af"
              />
            ) : (
              <Text style={styles.value}>{formData.tagline || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({...formData, description: text})}
                placeholder="Enter description"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />
            ) : (
              <Text style={styles.value}>{formData.description || 'Not set'}</Text>
            )}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="description" size={20} color="#8b5cf6" />
            <Text style={styles.cardTitle}>About Us</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>About</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.about}
                onChangeText={(text) => setFormData({...formData, about: text})}
                placeholder="Tell your company story"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={styles.value}>{formData.about || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mission</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.mission}
                onChangeText={(text) => setFormData({...formData, mission: text})}
                placeholder="Enter mission statement"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={2}
              />
            ) : (
              <Text style={styles.value}>{formData.mission || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Vision</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.vision}
                onChangeText={(text) => setFormData({...formData, vision: text})}
                placeholder="Enter vision statement"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={2}
              />
            ) : (
              <Text style={styles.value}>{formData.vision || 'Not set'}</Text>
            )}
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="contact-phone" size={20} color="#10b981" />
            <Text style={styles.cardTitle}>Contact Information</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWithIcon}>
              <MaterialIcons name="email" size={18} color="#6b7280" />
              {editing ? (
                <TextInput
                  style={[styles.input, styles.inputWithIconInput]}
                  value={formData.email}
                  onChangeText={(text) => setFormData({...formData, email: text})}
                  placeholder="Contact email"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                />
              ) : (
                <Text style={styles.value}>{formData.email || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone</Text>
            <View style={styles.inputWithIcon}>
              <MaterialIcons name="phone" size={18} color="#6b7280" />
              {editing ? (
                <TextInput
                  style={[styles.input, styles.inputWithIconInput]}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({...formData, phone: text})}
                  placeholder="Contact phone"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.value}>{formData.phone || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Address</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.address}
                onChangeText={(text) => setFormData({...formData, address: text})}
                placeholder="Company address"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={2}
              />
            ) : (
              <Text style={styles.value}>{formData.address || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Website</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.website}
                onChangeText={(text) => setFormData({...formData, website: text})}
                placeholder="Website URL"
                placeholderTextColor="#9ca3af"
              />
            ) : (
              <Text style={styles.value}>{formData.website || 'Not set'}</Text>
            )}
          </View>
        </View>

        {/* Social Media */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="share" size={20} color="#f59e0b" />
            <Text style={styles.cardTitle}>Social Media</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Facebook</Text>
            <View style={styles.socialInput}>
              <View style={[styles.socialIcon, { backgroundColor: '#1877f2' }]}>
                <MaterialIcons name="facebook" size={16} color="#ffffff" />
              </View>
              {editing ? (
                <TextInput
                  style={[styles.input, styles.socialInputField]}
                  value={formData.facebook}
                  onChangeText={(text) => setFormData({...formData, facebook: text})}
                  placeholder="Facebook URL"
                  placeholderTextColor="#9ca3af"
                />
              ) : (
                <Text style={styles.value}>{formData.facebook || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Instagram</Text>
            <View style={styles.socialInput}>
              <View style={[styles.socialIcon, { backgroundColor: '#e4405f' }]}>
                <MaterialIcons name="instagram" size={16} color="#ffffff" />
              </View>
              {editing ? (
                <TextInput
                  style={[styles.input, styles.socialInputField]}
                  value={formData.instagram}
                  onChangeText={(text) => setFormData({...formData, instagram: text})}
                  placeholder="Instagram URL"
                  placeholderTextColor="#9ca3af"
                />
              ) : (
                <Text style={styles.value}>{formData.instagram || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Twitter</Text>
            <View style={styles.socialInput}>
              <View style={[styles.socialIcon, { backgroundColor: '#1da1f2' }]}>
                <MaterialIcons name="twitter" size={16} color="#ffffff" />
              </View>
              {editing ? (
                <TextInput
                  style={[styles.input, styles.socialInputField]}
                  value={formData.twitter}
                  onChangeText={(text) => setFormData({...formData, twitter: text})}
                  placeholder="Twitter URL"
                  placeholderTextColor="#9ca3af"
                />
              ) : (
                <Text style={styles.value}>{formData.twitter || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>LinkedIn</Text>
            <View style={styles.socialInput}>
              <View style={[styles.socialIcon, { backgroundColor: '#0a66c2' }]}>
                <MaterialIcons name="linkedin" size={16} color="#ffffff" />
              </View>
              {editing ? (
                <TextInput
                  style={[styles.input, styles.socialInputField]}
                  value={formData.linkedin}
                  onChangeText={(text) => setFormData({...formData, linkedin: text})}
                  placeholder="LinkedIn URL"
                  placeholderTextColor="#9ca3af"
                />
              ) : (
                <Text style={styles.value}>{formData.linkedin || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>YouTube</Text>
            <View style={styles.socialInput}>
              <View style={[styles.socialIcon, { backgroundColor: '#ff0000' }]}>
                <MaterialIcons name="youtube" size={16} color="#ffffff" />
              </View>
              {editing ? (
                <TextInput
                  style={[styles.input, styles.socialInputField]}
                  value={formData.youtube}
                  onChangeText={(text) => setFormData({...formData, youtube: text})}
                  placeholder="YouTube URL"
                  placeholderTextColor="#9ca3af"
                />
              ) : (
                <Text style={styles.value}>{formData.youtube || 'Not set'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Save Button */}
        {editing && (
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSave} 
            disabled={saving}
            activeOpacity={0.8}
          >
            <MaterialIcons name="save" size={22} color="#ffffff" />
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
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelButton: {
    backgroundColor: 'rgba(239,68,68,0.3)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  editButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 12,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
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

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  summaryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  summaryContent: {
    flex: 1,
  },
  summaryName: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
  },
  summaryTagline: {
    fontFamily: Fonts.Italic,
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cardTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  statusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    color: '#10b981',
  },

  field: {
    marginBottom: 14,
  },
  label: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  value: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    paddingVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f9fafb',
    color: '#1f2937',
    fontFamily: Fonts.Regular,
  },
  inputFocused: {
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWithIconInput: {
    flex: 1,
  },
  socialInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  socialIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialInputField: {
    flex: 1,
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
  },
});