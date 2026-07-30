import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { Fonts } from '../../config/fonts';

export default function CompanyManagement({ navigation }) {
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [formData, setFormData] = useState({
    organizationName: 'Kabir Ban Bhandari Foundation (Trust)',
    cin: 'U85300BR2024NPL067466',
    address: 'Bihar, Kishanganj, Bongaon, Bihar (854101)',
    contactNo: '9470080435',
    email: 'kabirself@gmail.com',
    presidentName: 'Shri Bablu Bhandari',
    secretaryName: 'Shri Ajit Kumar Bhandari',
    tagline: '',
    description: '',
    about: '',
    mission: '',
    vision: '',
    website: '',
    logo: null,
    coverImage: null,
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: '',
    establishedYear: '2024',
    employeeCount: '',
    registrationNumber: 'U85300BR2024NPL067466',
    // Services
    oldAgeAssistance: {
      below20: '25000',
      between20to40: '15000',
      between40to60: '10000',
      above60: '5000'
    },
    kanyaMarriageAssistance: {
      below4: '25000',
      between4to8: '15000',
      between8to12: '10000',
      above12: '5000'
    },
    selfEmploymentAssistance: 'Available for unemployed elderly people.'
  });

  useEffect(() => {
    fetchOrSeedCompanyData();
  }, []);

  const fetchOrSeedCompanyData = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'company', 'profile');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('✅ Company data found, loading...');
        setCompanyData(data);
        setFormData({
          organizationName: data.organizationName || data.companyName || 'Kabir Ban Bhandari Foundation (Trust)',
          cin: data.cin || 'U85300BR2024NPL067466',
          address: data.address || 'Bihar, Kishanganj, Bongaon, Bihar (854101)',
          contactNo: data.contactNo || data.phone || '9470080435',
          email: data.email || 'kabirself@gmail.com',
          presidentName: data.presidentName || 'Shri Bablu Bhandari',
          secretaryName: data.secretaryName || 'Shri Ajit Kumar Bhandari',
          tagline: data.tagline || '',
          description: data.description || '',
          about: data.about || '',
          mission: data.mission || '',
          vision: data.vision || '',
          website: data.website || '',
          logo: data.logo || null,
          coverImage: data.coverImage || null,
          facebook: data.socialMedia?.facebook || '',
          instagram: data.socialMedia?.instagram || '',
          twitter: data.socialMedia?.twitter || '',
          linkedin: data.socialMedia?.linkedin || '',
          youtube: data.socialMedia?.youtube || '',
          establishedYear: data.establishedYear || '2024',
          employeeCount: data.employeeCount || '',
          registrationNumber: data.registrationNumber || 'U85300BR2024NPL067466',
          oldAgeAssistance: data.oldAgeAssistance || {
            below20: '25000',
            between20to40: '15000',
            between40to60: '10000',
            above60: '5000'
          },
          kanyaMarriageAssistance: data.kanyaMarriageAssistance || {
            below4: '25000',
            between4to8: '15000',
            between8to12: '10000',
            above12: '5000'
          },
          selfEmploymentAssistance: data.selfEmploymentAssistance || 'Available for unemployed elderly people.'
        });
      } else {
        console.log('🆕 No company data found. Seeding default data...');
        setIsFirstRun(true);
        await seedDefaultData();
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
      Alert.alert('Error', 'Failed to load company data');
    } finally {
      setLoading(false);
    }
  };

  const seedDefaultData = async () => {
    try {
      const defaultData = {
        organizationName: 'Kabir Ban Bhandari Foundation (Trust)',
        cin: 'U85300BR2024NPL067466',
        address: 'Bihar, Kishanganj, Bongaon, Bihar (854101)',
        contactNo: '9470080435',
        email: 'kabirself@gmail.com',
        presidentName: 'Shri Bablu Bhandari',
        secretaryName: 'Shri Ajit Kumar Bhandari',
        tagline: 'Empowering Communities, Changing Lives',
        description: 'Kabir Ban Bhandari Foundation is a non-profit organization dedicated to empowering underprivileged communities through education, healthcare, and social welfare programs.',
        about: 'Kabir Ban Bhandari Foundation (Trust) was established with the vision of creating a better world for everyone. We believe in the power of community and the importance of giving back. Our organization works tirelessly to uplift the underprivileged and provide them with opportunities for a better life.',
        mission: 'To empower communities and create sustainable change through education, healthcare, and social welfare programs.',
        vision: 'A world where every individual has access to quality education, healthcare, and opportunities for a better life.',
        website: 'https://www.kabirbanbhandari.org',
        establishedYear: '2024',
        employeeCount: '10-20',
        registrationNumber: 'U85300BR2024NPL067466',
        socialMedia: {
          facebook: 'https://facebook.com/kabirbanbhandari',
          instagram: 'https://instagram.com/kabirbanbhandari',
          twitter: 'https://twitter.com/kabirbanbhandari',
          linkedin: 'https://linkedin.com/company/kabirbanbhandari',
          youtube: 'https://youtube.com/kabirbanbhandari'
        },
        oldAgeAssistance: {
          below20: '25000',
          between20to40: '15000',
          between40to60: '10000',
          above60: '5000'
        },
        kanyaMarriageAssistance: {
          below4: '25000',
          between4to8: '15000',
          between8to12: '10000',
          above12: '5000'
        },
        selfEmploymentAssistance: 'Available for unemployed elderly people.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid || 'admin'
      };

      await setDoc(doc(db, 'company', 'profile'), defaultData);
      console.log('✅ Default data seeded successfully!');
      
      setCompanyData(defaultData);
      setFormData({
        organizationName: defaultData.organizationName,
        cin: defaultData.cin,
        address: defaultData.address,
        contactNo: defaultData.contactNo,
        email: defaultData.email,
        presidentName: defaultData.presidentName,
        secretaryName: defaultData.secretaryName,
        tagline: defaultData.tagline,
        description: defaultData.description,
        about: defaultData.about,
        mission: defaultData.mission,
        vision: defaultData.vision,
        website: defaultData.website,
        logo: defaultData.logo || null,
        coverImage: defaultData.coverImage || null,
        facebook: defaultData.socialMedia?.facebook || '',
        instagram: defaultData.socialMedia?.instagram || '',
        twitter: defaultData.socialMedia?.twitter || '',
        linkedin: defaultData.socialMedia?.linkedin || '',
        youtube: defaultData.socialMedia?.youtube || '',
        establishedYear: defaultData.establishedYear,
        employeeCount: defaultData.employeeCount,
        registrationNumber: defaultData.registrationNumber,
        oldAgeAssistance: defaultData.oldAgeAssistance,
        kanyaMarriageAssistance: defaultData.kanyaMarriageAssistance,
        selfEmploymentAssistance: defaultData.selfEmploymentAssistance
      });

      Alert.alert(
        '✅ Organization Profile Created',
        'Default organization data has been set up successfully. You can now edit it if needed.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error seeding default data:', error);
      Alert.alert('Error', 'Failed to seed default data: ' + error.message);
    }
  };

  const pickImage = async (type) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your gallery');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'logo' ? [1, 1] : [16, 9],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const base64Url = `data:image/jpeg;base64,${asset.base64}`;
      if (type === 'logo') {
        setFormData({ ...formData, logo: base64Url });
      } else {
        setFormData({ ...formData, coverImage: base64Url });
      }
    }
  };

  const handleSave = async () => {
    if (!formData.organizationName) {
      Alert.alert('Error', 'Organization name is required');
      return;
    }

    setSaving(true);
    try {
      const data = {
        organizationName: formData.organizationName,
        cin: formData.cin,
        address: formData.address,
        contactNo: formData.contactNo,
        email: formData.email,
        presidentName: formData.presidentName,
        secretaryName: formData.secretaryName,
        tagline: formData.tagline,
        description: formData.description,
        about: formData.about,
        mission: formData.mission,
        vision: formData.vision,
        website: formData.website,
        logo: formData.logo,
        coverImage: formData.coverImage,
        establishedYear: formData.establishedYear,
        employeeCount: formData.employeeCount,
        registrationNumber: formData.registrationNumber,
        socialMedia: {
          facebook: formData.facebook,
          instagram: formData.instagram,
          twitter: formData.twitter,
          linkedin: formData.linkedin,
          youtube: formData.youtube
        },
        oldAgeAssistance: formData.oldAgeAssistance,
        kanyaMarriageAssistance: formData.kanyaMarriageAssistance,
        selfEmploymentAssistance: formData.selfEmploymentAssistance,
        updatedAt: new Date().toISOString()
      };

      if (!companyData) {
        data.createdAt = new Date().toISOString();
        data.createdBy = auth.currentUser?.uid || 'admin';
      }

      await setDoc(doc(db, 'company', 'profile'), data);
      Alert.alert('Success', 'Company profile updated successfully');
      setEditing(false);
      await fetchOrSeedCompanyData();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompany = async () => {
    Alert.alert(
      'Delete Company',
      'Are you sure you want to delete the company profile? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'company', 'profile'));
              Alert.alert('Success', 'Company profile deleted successfully');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrSeedCompanyData();
    setRefreshing(false);
  };

  const ServiceCard = ({ title, icon, children }) => (
    <View style={styles.serviceCard}>
      <View style={styles.serviceHeader}>
        <MaterialIcons name={icon} size={20} color="#3b82f6" />
        <Text style={styles.serviceTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );

  const ServiceRow = ({ label, value, field, type }) => (
    <View style={styles.serviceRow}>
      <Text style={styles.serviceLabel}>{label}</Text>
      {editing ? (
        <TextInput
          style={styles.serviceInput}
          value={value}
          onChangeText={(text) => {
            if (type === 'oldAge') {
              setFormData({
                ...formData,
                oldAgeAssistance: { ...formData.oldAgeAssistance, [field]: text }
              });
            } else if (type === 'kanya') {
              setFormData({
                ...formData,
                kanyaMarriageAssistance: { ...formData.kanyaMarriageAssistance, [field]: text }
              });
            }
          }}
          keyboardType="numeric"
          placeholder="Enter amount"
        />
      ) : (
        <Text style={styles.serviceValue}>₹ {value}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>
          {isFirstRun ? 'Setting up organization profile...' : 'Loading Company Profile...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Organization Profile</Text>
          <TouchableOpacity onPress={() => setEditing(!editing)}>
            <Text style={styles.editButton}>{editing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
        {isFirstRun && (
          <View style={styles.seedNotice}>
            <MaterialIcons name="info" size={16} color="#ffffff" />
            <Text style={styles.seedNoticeText}>
              Default data loaded successfully! You can now edit it.
            </Text>
          </View>
        )}
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
        }
      >
        {/* Cover Image */}
        <View style={styles.coverSection}>
          <TouchableOpacity onPress={() => pickImage('cover')} disabled={!editing}>
            <View style={styles.coverImageContainer}>
              {formData.coverImage ? (
                <Image source={{ uri: formData.coverImage }} style={styles.coverImage} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <MaterialIcons name="image" size={40} color="#9ca3af" />
                  <Text style={styles.coverPlaceholderText}>Add Cover Image</Text>
                </View>
              )}
              {editing && (
                <View style={styles.coverCameraIcon}>
                  <MaterialIcons name="photo-camera" size={16} color="#ffffff" />
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Logo & Organization Name */}
        <View style={styles.companyHeader}>
          <TouchableOpacity onPress={() => pickImage('logo')} disabled={!editing}>
            <View style={styles.logoContainer}>
              {formData.logo ? (
                <Image source={{ uri: formData.logo }} style={styles.logoImage} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <MaterialIcons name="business" size={30} color="#3b82f6" />
                </View>
              )}
              {editing && (
                <View style={styles.logoCameraIcon}>
                  <MaterialIcons name="photo-camera" size={12} color="#ffffff" />
                </View>
              )}
            </View>
          </TouchableOpacity>
          <View style={styles.companyNameContainer}>
            {editing ? (
              <TextInput
                style={styles.companyNameInput}
                value={formData.organizationName}
                onChangeText={(text) => setFormData({...formData, organizationName: text})}
                placeholder="Enter organization name"
                placeholderTextColor="#9ca3af"
              />
            ) : (
              <Text style={styles.companyName}>{formData.organizationName}</Text>
            )}
            {editing ? (
              <TextInput
                style={styles.taglineInput}
                value={formData.tagline}
                onChangeText={(text) => setFormData({...formData, tagline: text})}
                placeholder="Enter tagline"
                placeholderTextColor="#9ca3af"
              />
            ) : (
              <Text style={styles.companyTagline}>{formData.tagline || 'Add a tagline'}</Text>
            )}
          </View>
        </View>

        {/* Status Badge */}
        {!editing && (
          <View style={styles.statusContainer}>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active</Text>
            </View>
            {companyData && (
              <Text style={styles.lastUpdated}>
                Last updated: {companyData.updatedAt ? new Date(companyData.updatedAt).toLocaleDateString() : 'N/A'}
              </Text>
            )}
          </View>
        )}

        {/* Organization Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Organization Details</Text>

          <View style={styles.field}>
            <Text style={styles.label}>CIN (Corporate Identification Number)</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.cin}
                onChangeText={(text) => setFormData({...formData, cin: text})}
                placeholder="Enter CIN"
              />
            ) : (
              <Text style={styles.value}>{formData.cin}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Registration Number</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.registrationNumber}
                onChangeText={(text) => setFormData({...formData, registrationNumber: text})}
                placeholder="Enter registration number"
              />
            ) : (
              <Text style={styles.value}>{formData.registrationNumber}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Established Year</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.establishedYear}
                onChangeText={(text) => setFormData({...formData, establishedYear: text})}
                placeholder="e.g., 2024"
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.value}>{formData.establishedYear}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Employee Count</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.employeeCount}
                onChangeText={(text) => setFormData({...formData, employeeCount: text})}
                placeholder="e.g., 50-100"
              />
            ) : (
              <Text style={styles.value}>{formData.employeeCount || 'Not provided'}</Text>
            )}
          </View>
        </View>

        {/* Services Offered Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="handshake" size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Services Offered</Text>
          </View>

          {/* Old Age Assistance */}
          <ServiceCard title="Kabir Old Age Assistance Program" icon="elderly">
            <ServiceRow 
              label="Below 20 years" 
              value={formData.oldAgeAssistance?.below20 || '0'} 
              field="below20" 
              type="oldAge" 
            />
            <ServiceRow 
              label="20 - 40 years" 
              value={formData.oldAgeAssistance?.between20to40 || '0'} 
              field="between20to40" 
              type="oldAge" 
            />
            <ServiceRow 
              label="40 - 60 years" 
              value={formData.oldAgeAssistance?.between40to60 || '0'} 
              field="between40to60" 
              type="oldAge" 
            />
            <ServiceRow 
              label="60 years & above" 
              value={formData.oldAgeAssistance?.above60 || '0'} 
              field="above60" 
              type="oldAge" 
            />
          </ServiceCard>

          {/* Kanya Marriage Assistance */}
          <ServiceCard title="Kanya (Girl Child) Marriage Assistance Program" icon="child-care">
            <ServiceRow 
              label="Below 4 years" 
              value={formData.kanyaMarriageAssistance?.below4 || '0'} 
              field="below4" 
              type="kanya" 
            />
            <ServiceRow 
              label="4 - 8 years" 
              value={formData.kanyaMarriageAssistance?.between4to8 || '0'} 
              field="between4to8" 
              type="kanya" 
            />
            <ServiceRow 
              label="8 - 12 years" 
              value={formData.kanyaMarriageAssistance?.between8to12 || '0'} 
              field="between8to12" 
              type="kanya" 
            />
            <ServiceRow 
              label="12 years & above" 
              value={formData.kanyaMarriageAssistance?.above12 || '0'} 
              field="above12" 
              type="kanya" 
            />
          </ServiceCard>

          {/* Self Employment Assistance */}
          <ServiceCard title="Self-Employment Assistance Scheme" icon="work">
            <View style={styles.serviceRow}>
              <Text style={styles.serviceLabel}>Description</Text>
              {editing ? (
                <TextInput
                  style={[styles.serviceInput, styles.serviceTextArea]}
                  value={formData.selfEmploymentAssistance || ''}
                  onChangeText={(text) => setFormData({...formData, selfEmploymentAssistance: text})}
                  placeholder="Enter description"
                  multiline
                  numberOfLines={2}
                />
              ) : (
                <Text style={styles.serviceValue}>
                  {formData.selfEmploymentAssistance || 'Available for unemployed elderly people.'}
                </Text>
              )}
            </View>
          </ServiceCard>
        </View>

        {/* Contact Information */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Address</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.address}
                onChangeText={(text) => setFormData({...formData, address: text})}
                placeholder="Enter address"
                multiline
                numberOfLines={3}
              />
            ) : (
              <Text style={styles.value}>{formData.address}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contact Number</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.contactNo}
                onChangeText={(text) => setFormData({...formData, contactNo: text})}
                placeholder="Enter contact number"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.value}>{formData.contactNo}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({...formData, email: text})}
                placeholder="Enter email"
                keyboardType="email-address"
              />
            ) : (
              <Text style={styles.value}>{formData.email}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Website</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.website}
                onChangeText={(text) => setFormData({...formData, website: text})}
                placeholder="Enter website URL"
              />
            ) : (
              <Text style={styles.value}>{formData.website || 'Not provided'}</Text>
            )}
          </View>
        </View>

        {/* Leadership */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Leadership</Text>

          <View style={styles.field}>
            <Text style={styles.label}>President</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.presidentName}
                onChangeText={(text) => setFormData({...formData, presidentName: text})}
                placeholder="Enter president name"
              />
            ) : (
              <Text style={styles.value}>{formData.presidentName}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Secretary</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.secretaryName}
                onChangeText={(text) => setFormData({...formData, secretaryName: text})}
                placeholder="Enter secretary name"
              />
            ) : (
              <Text style={styles.value}>{formData.secretaryName}</Text>
            )}
          </View>
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About Organization</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Short Description</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({...formData, description: text})}
                placeholder="Enter short description"
                multiline
                numberOfLines={3}
              />
            ) : (
              <Text style={styles.value}>{formData.description || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>About Us</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.about}
                onChangeText={(text) => setFormData({...formData, about: text})}
                placeholder="Tell your organization story"
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={styles.value}>{formData.about || 'Not provided'}</Text>
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
                multiline
                numberOfLines={2}
              />
            ) : (
              <Text style={styles.value}>{formData.mission || 'Not provided'}</Text>
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
                multiline
                numberOfLines={2}
              />
            ) : (
              <Text style={styles.value}>{formData.vision || 'Not provided'}</Text>
            )}
          </View>
        </View>

        {/* Social Media */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Social Media</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Facebook</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.facebook}
                onChangeText={(text) => setFormData({...formData, facebook: text})}
                placeholder="Enter Facebook URL"
              />
            ) : (
              <Text style={styles.value}>{formData.facebook || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Instagram</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.instagram}
                onChangeText={(text) => setFormData({...formData, instagram: text})}
                placeholder="Enter Instagram URL"
              />
            ) : (
              <Text style={styles.value}>{formData.instagram || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Twitter</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.twitter}
                onChangeText={(text) => setFormData({...formData, twitter: text})}
                placeholder="Enter Twitter URL"
              />
            ) : (
              <Text style={styles.value}>{formData.twitter || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>LinkedIn</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.linkedin}
                onChangeText={(text) => setFormData({...formData, linkedin: text})}
                placeholder="Enter LinkedIn URL"
              />
            ) : (
              <Text style={styles.value}>{formData.linkedin || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>YouTube</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.youtube}
                onChangeText={(text) => setFormData({...formData, youtube: text})}
                placeholder="Enter YouTube URL"
              />
            ) : (
              <Text style={styles.value}>{formData.youtube || 'Not provided'}</Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        {editing && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            <MaterialIcons name="save" size={20} color="#ffffff" />
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        )}

        {!editing && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteCompany}>
            <MaterialIcons name="delete" size={20} color="#ffffff" />
            <Text style={styles.deleteButtonText}>Delete Organization Profile</Text>
          </TouchableOpacity>
        )}

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>NGO App v1.0.0</Text>
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

  // Header
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
  seedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  seedNoticeText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#ffffff',
    flex: 1,
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

  // Cover Image
  coverSection: {
    marginTop: 16,
    marginBottom: 12,
  },
  coverImageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 12,
    gap: 8,
  },
  coverPlaceholderText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#9ca3af',
  },
  coverCameraIcon: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },

  // Company Header
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  logoContainer: {
    position: 'relative',
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#3b82f6',
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#3b82f6',
  },
  logoCameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    borderRadius: 15,
    padding: 5,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  companyNameContainer: {
    flex: 1,
  },
  companyName: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#1f2937',
  },
  companyNameInput: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#3b82f6',
    paddingBottom: 2,
  },
  companyTagline: {
    fontFamily: Fonts.Italic,
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  taglineInput: {
    fontFamily: Fonts.Italic,
    fontSize: 14,
    color: '#6b7280',
    borderBottomWidth: 1,
    borderBottomColor: '#3b82f6',
    paddingBottom: 2,
    marginTop: 2,
  },

  // Status
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
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
  lastUpdated: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#9ca3af',
  },

  // Card
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#1f2937',
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

  // Service Styles
  serviceCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  serviceTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  serviceLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  serviceValue: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
  },
  serviceInput: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 6,
    paddingHorizontal: 10,
    minWidth: 80,
    textAlign: 'right',
  },
  serviceTextArea: {
    minWidth: '100%',
    textAlign: 'left',
    height: 60,
    textAlignVertical: 'top',
  },

  // Save Button
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

  // Delete Button
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  deleteButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
  },

  versionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  versionText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#9ca3af',
  },
});