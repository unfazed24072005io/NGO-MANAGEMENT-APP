import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, Image, Alert, Platform, KeyboardAvoidingView, ActivityIndicator,
  RefreshControl, FlatList, Modal
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../config/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, setDoc, addDoc, getDocs } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function WorkingMemberRegisteredMembers({ navigation }) {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    inactive: 0,
    totalDonations: 0
  });

  // Register Member Modal States
  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [step, setStep] = useState(1);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gender: 'Male',
    password: '',
    confirmPassword: '',
    aadharFront: null,
    aadharBack: null,
    panCard: null,
    profilePhoto: null,
    signature: null,
  });

  useEffect(() => {
    setupRealtimeListener();
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

  const setupRealtimeListener = () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const q = query(
      collection(db, 'registeredMembers'),
      where('workingMemberId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const membersList = [];
      let total = 0, active = 0, pending = 0, inactive = 0;
      let totalDonations = 0;
      
      // First, get all members
      const memberPromises = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        membersList.push({ id: doc.id, ...data });
        total++;
        if (data.status === 'active') active++;
        else if (data.status === 'pending') pending++;
        else inactive++;
        
        // Fetch donations for this member
        if (data.memberId) {
          memberPromises.push(
            getDocs(query(
              collection(db, 'donations'),
              where('memberId', '==', data.memberId)
            )).then((donationSnapshot) => {
              let memberDonationTotal = 0;
              donationSnapshot.forEach((donationDoc) => {
                const donationData = donationDoc.data();
                memberDonationTotal += donationData.amount || 0;
              });
              return { memberId: data.memberId, total: memberDonationTotal };
            })
          );
        }
      });
      
      // Calculate total donations
      const donationResults = await Promise.all(memberPromises);
      donationResults.forEach(result => {
        totalDonations += result.total;
        // Update member with their donation total
        const memberIndex = membersList.findIndex(m => m.memberId === result.memberId);
        if (memberIndex !== -1) {
          membersList[memberIndex].totalDonations = result.total;
        }
      });
      
      setMembers(membersList);
      setFilteredMembers(membersList);
      setStats({ total, active, pending, inactive, totalDonations });
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text) {
      const filtered = members.filter(member =>
        member.fullName?.toLowerCase().includes(text.toLowerCase()) ||
        member.email?.toLowerCase().includes(text.toLowerCase()) ||
        member.phone?.includes(text)
      );
      setFilteredMembers(filtered);
    } else {
      setFilteredMembers(members);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'inactive': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Image Picker
  const pickImage = async (field) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your gallery');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const base64Url = `data:image/jpeg;base64,${asset.base64}`;
        setFormData({ ...formData, [field]: base64Url });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Register Member Functions
  const handleRegisterMember = async () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Please enter full name');
      return;
    }

    if (!formData.email.trim() || !validateEmail(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!formData.phone.trim()) {
      Alert.alert('Error', 'Please enter phone number');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setRegisterLoading(true);

    try {
      const workingMemberId = auth.currentUser?.uid;
      
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email.trim(), 
        formData.password
      );
      
      const userId = userCredential.user.uid;

      await setDoc(doc(db, 'users', userId), {
        uid: userId,
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        address: formData.address.trim() || '',
        city: formData.city || '',
        state: formData.state || '',
        pincode: formData.pincode || '',
        gender: formData.gender || 'Male',
        role: 'member',
        isWorkingMember: false,
        createdBy: workingMemberId,
        status: 'active',
        profilePhoto: formData.profilePhoto || null,
        aadharFront: formData.aadharFront || null,
        aadharBack: formData.aadharBack || null,
        panCard: formData.panCard || null,
        signature: formData.signature || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'registeredMembers'), {
        memberId: userId,
        workingMemberId: workingMemberId,
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        address: formData.address.trim() || '',
        city: formData.city || '',
        state: formData.state || '',
        pincode: formData.pincode || '',
        gender: formData.gender || 'Male',
        status: 'active',
        commission: 0,
        totalDonations: 0,
        profilePhoto: formData.profilePhoto || null,
        aadharFront: formData.aadharFront || null,
        aadharBack: formData.aadharBack || null,
        panCard: formData.panCard || null,
        signature: formData.signature || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'members'), {
        uid: userId,
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        address: formData.address.trim() || '',
        city: formData.city || '',
        state: formData.state || '',
        pincode: formData.pincode || '',
        gender: formData.gender || 'Male',
        role: 'member',
        registeredBy: workingMemberId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Create a wallet for the member
      await setDoc(doc(db, 'wallets', userId), {
        balance: 0,
        totalDonations: 0,
        totalWithdrawn: 0,
        pendingWithdrawals: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      Alert.alert('Success', 'Member registered successfully! They can now login and make donations.');
      
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        gender: 'Male',
        password: '',
        confirmPassword: '',
        aadharFront: null,
        aadharBack: null,
        panCard: null,
        profilePhoto: null,
        signature: null,
      });
      setStep(1);
      setRegisterModalVisible(false);
      
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Error', 'This email is already registered');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Error', 'Invalid email address');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('Error', 'Password is too weak. Please use at least 6 characters');
      } else {
        Alert.alert('Error', error.message || 'Failed to register member');
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  // ============ STEP 1: Personal Information ============
  const renderPersonalInfo = () => (
    <View>
      <Text style={styles.modalStepTitle}>Personal Information</Text>
      <Text style={styles.modalSubStep}>Enter member's basic details</Text>
      
      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.modalInput}
          placeholder="Full Name *"
          placeholderTextColor="#9ca3af"
          value={formData.fullName}
          onChangeText={(text) => setFormData({...formData, fullName: text})}
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.modalInput}
          placeholder="Email *"
          placeholderTextColor="#9ca3af"
          value={formData.email}
          onChangeText={(text) => setFormData({...formData, email: text})}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.modalInput}
          placeholder="Phone Number *"
          placeholderTextColor="#9ca3af"
          value={formData.phone}
          onChangeText={(text) => setFormData({...formData, phone: text})}
          keyboardType="phone-pad"
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.modalLabel}>Gender</Text>
        <View style={styles.genderContainer}>
          {['Male', 'Female', 'Other'].map((gender) => (
            <TouchableOpacity
              key={gender}
              style={[
                styles.genderOption,
                formData.gender === gender && styles.genderOptionActive
              ]}
              onPress={() => setFormData({...formData, gender})}
            >
              <Text style={[
                styles.genderText,
                formData.gender === gender && styles.genderTextActive
              ]}>
                {gender}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.modalNextButton} onPress={() => setStep(2)}>
        <Text style={styles.buttonText}>Next →</Text>
      </TouchableOpacity>
    </View>
  );

  // ============ STEP 2: Address & Password ============
  const renderAddressAndPassword = () => (
    <View>
      <Text style={styles.modalStepTitle}>Address & Security</Text>
      <Text style={styles.modalSubStep}>Enter address and set password</Text>
      
      <View style={styles.fieldContainer}>
        <TextInput
          style={[styles.modalInput, styles.textArea]}
          placeholder="Address"
          placeholderTextColor="#9ca3af"
          value={formData.address}
          onChangeText={(text) => setFormData({...formData, address: text})}
          multiline
          numberOfLines={2}
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.formRow}>
        <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
          <TextInput
            style={styles.modalInput}
            placeholder="City"
            placeholderTextColor="#9ca3af"
            value={formData.city}
            onChangeText={(text) => setFormData({...formData, city: text})}
          />
          <View style={styles.bottomLine} />
        </View>
        <View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }]}>
          <TextInput
            style={styles.modalInput}
            placeholder="State"
            placeholderTextColor="#9ca3af"
            value={formData.state}
            onChangeText={(text) => setFormData({...formData, state: text})}
          />
          <View style={styles.bottomLine} />
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.modalInput}
          placeholder="Pincode"
          placeholderTextColor="#9ca3af"
          value={formData.pincode}
          onChangeText={(text) => setFormData({...formData, pincode: text})}
          keyboardType="numeric"
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.modalInput}
          placeholder="Password * (min 6 characters)"
          placeholderTextColor="#9ca3af"
          value={formData.password}
          onChangeText={(text) => setFormData({...formData, password: text})}
          secureTextEntry
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.modalInput}
          placeholder="Confirm Password *"
          placeholderTextColor="#9ca3af"
          value={formData.confirmPassword}
          onChangeText={(text) => setFormData({...formData, confirmPassword: text})}
          secureTextEntry
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.modalStepButtons}>
        <TouchableOpacity style={styles.modalBackButton} onPress={() => setStep(1)}>
          <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.modalNextButton} onPress={() => setStep(3)}>
          <Text style={styles.buttonText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ============ STEP 3: Profile Photo ============
  const renderProfilePhoto = () => (
    <View>
      <Text style={styles.modalStepTitle}>Profile Photo</Text>
      <Text style={styles.modalSubStep}>Upload member's profile photo</Text>

      <View style={styles.uploadContainer}>
        <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('profilePhoto')}>
          <MaterialIcons name="photo-camera" size={24} color="#3b82f6" />
          <Text style={styles.uploadButtonText}>
            {formData.profilePhoto ? 'Change Photo' : 'Upload Profile Photo'}
          </Text>
        </TouchableOpacity>
        {formData.profilePhoto && (
          <Image source={{ uri: formData.profilePhoto }} style={styles.previewImage} />
        )}
      </View>

      <View style={styles.modalStepButtons}>
        <TouchableOpacity style={styles.modalBackButton} onPress={() => setStep(2)}>
          <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.modalNextButton} onPress={() => setStep(4)}>
          <Text style={styles.buttonText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ============ STEP 4: Aadhar Front ============
  const renderAadharFront = () => (
    <View>
      <Text style={styles.modalStepTitle}>Aadhar Card (Front)</Text>
      <Text style={styles.modalSubStep}>Upload front side of Aadhar card</Text>

      <View style={styles.uploadContainer}>
        <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('aadharFront')}>
          <MaterialIcons name="credit-card" size={24} color="#3b82f6" />
          <Text style={styles.uploadButtonText}>
            {formData.aadharFront ? 'Change Aadhar Front' : 'Upload Aadhar Front'}
          </Text>
        </TouchableOpacity>
        {formData.aadharFront && (
          <Image source={{ uri: formData.aadharFront }} style={styles.previewImage} />
        )}
      </View>

      <View style={styles.modalStepButtons}>
        <TouchableOpacity style={styles.modalBackButton} onPress={() => setStep(3)}>
          <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.modalNextButton} onPress={() => setStep(5)}>
          <Text style={styles.buttonText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ============ STEP 5: Aadhar Back ============
  const renderAadharBack = () => (
    <View>
      <Text style={styles.modalStepTitle}>Aadhar Card (Back)</Text>
      <Text style={styles.modalSubStep}>Upload back side of Aadhar card</Text>

      <View style={styles.uploadContainer}>
        <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('aadharBack')}>
          <MaterialIcons name="credit-card" size={24} color="#3b82f6" />
          <Text style={styles.uploadButtonText}>
            {formData.aadharBack ? 'Change Aadhar Back' : 'Upload Aadhar Back'}
          </Text>
        </TouchableOpacity>
        {formData.aadharBack && (
          <Image source={{ uri: formData.aadharBack }} style={styles.previewImage} />
        )}
      </View>

      <View style={styles.modalStepButtons}>
        <TouchableOpacity style={styles.modalBackButton} onPress={() => setStep(4)}>
          <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.modalNextButton} onPress={() => setStep(6)}>
          <Text style={styles.buttonText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ============ STEP 6: PAN Card ============
  const renderPANCard = () => (
    <View>
      <Text style={styles.modalStepTitle}>PAN Card</Text>
      <Text style={styles.modalSubStep}>Upload member's PAN card</Text>

      <View style={styles.uploadContainer}>
        <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('panCard')}>
          <MaterialIcons name="assignment" size={24} color="#3b82f6" />
          <Text style={styles.uploadButtonText}>
            {formData.panCard ? 'Change PAN Card' : 'Upload PAN Card'}
          </Text>
        </TouchableOpacity>
        {formData.panCard && (
          <Image source={{ uri: formData.panCard }} style={styles.previewImage} />
        )}
      </View>

      <View style={styles.modalStepButtons}>
        <TouchableOpacity style={styles.modalBackButton} onPress={() => setStep(5)}>
          <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.modalNextButton} onPress={() => setStep(7)}>
          <Text style={styles.buttonText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ============ STEP 7: Signature & Submit ============
  const renderSignature = () => (
    <View>
      <Text style={styles.modalStepTitle}>Signature</Text>
      <Text style={styles.modalSubStep}>Upload member's signature</Text>

      <View style={styles.uploadContainer}>
        <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('signature')}>
          <MaterialIcons name="edit" size={24} color="#3b82f6" />
          <Text style={styles.uploadButtonText}>
            {formData.signature ? 'Change Signature' : 'Upload Signature'}
          </Text>
        </TouchableOpacity>
        {formData.signature && (
          <Image source={{ uri: formData.signature }} style={styles.previewImage} />
        )}
      </View>

      <View style={styles.modalStepButtons}>
        <TouchableOpacity style={styles.modalBackButton} onPress={() => setStep(6)}>
          <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.modalSubmitButton, registerLoading && styles.disabledButton]} 
          onPress={handleRegisterMember}
          disabled={registerLoading}
        >
          {registerLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <MaterialIcons name="check" size={20} color="#ffffff" />
              <Text style={styles.buttonText}>Register</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // ============ STEP ROUTING ============
  const getStepContent = () => {
    if (step === 1) return renderPersonalInfo();
    if (step === 2) return renderAddressAndPassword();
    if (step === 3) return renderProfilePhoto();
    if (step === 4) return renderAadharFront();
    if (step === 5) return renderAadharBack();
    if (step === 6) return renderPANCard();
    if (step === 7) return renderSignature();
    return null;
  };

  const getTotalSteps = () => 7;

  const StatCard = ({ label, count, icon, color }) => (
    <View style={[styles.statCard]}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={18} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{count}</Text>
      </View>
    </View>
  );

  const MemberCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.memberCard}
      onPress={() => navigation.navigate('WorkingMemberMemberDetail', { memberId: item.id })}
    >
      <View style={styles.memberHeader}>
        <View style={styles.memberAvatar}>
          {item.profilePhoto ? (
            <Image source={{ uri: item.profilePhoto }} style={styles.memberImage} />
          ) : (
            <MaterialIcons name="person" size={30} color="#3b82f6" />
          )}
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.fullName || item.name || 'Unknown'}</Text>
          <Text style={styles.memberEmail}>{item.email || 'N/A'}</Text>
          <Text style={styles.memberPhone}>{item.phone || 'N/A'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status || 'pending'}
          </Text>
        </View>
      </View>
      <View style={styles.memberFooter}>
        <View style={styles.memberFooterLeft}>
          <Text style={styles.memberDate}>
            Joined: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
        <View style={styles.memberFooterRight}>
          {item.totalDonations !== undefined && item.totalDonations > 0 && (
            <View style={styles.donationBadge}>
              <MaterialIcons name="volunteer-activism" size={12} color="#8b5cf6" />
              <Text style={styles.donationBadgeText}>₹{item.totalDonations}</Text>
            </View>
          )}
          {item.commission !== undefined && (
            <Text style={styles.memberCommission}>Commission: ₹{item.commission || 0}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading members...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Blue Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Members</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.registerButton}
              onPress={() => {
                setStep(1);
                setRegisterModalVisible(true);
              }}
            >
              <MaterialIcons name="person-add" size={18} color="#ffffff" />
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>
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

        {/* Search Bar inside header */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search members..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <MaterialIcons name="close" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Stat Cards inside header */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.statsContainer}
          contentContainerStyle={styles.statsContent}
        >
          <StatCard label="Total" count={stats.total} icon="people" color="#ffffff" />
          <StatCard label="Active" count={stats.active} icon="check-circle" color="#10b981" />
          <StatCard label="Pending" count={stats.pending} icon="pending" color="#f59e0b" />
          <StatCard label="Inactive" count={stats.inactive} icon="block" color="#ef4444" />

        </ScrollView>
      </View>

      {/* Members List */}
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MemberCard item={item} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="people" size={44} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No registered members</Text>
            <Text style={styles.emptyStateSubtext}>Start registering members to earn commissions</Text>
            <TouchableOpacity 
              style={styles.inviteButton}
              onPress={() => {
                setStep(1);
                setRegisterModalVisible(true);
              }}
            >
              <Text style={styles.inviteButtonText}>Register Member</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Register Member Modal with Multi-Step Flow */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={registerModalVisible}
        onRequestClose={() => {
          if (!registerLoading) {
            setRegisterModalVisible(false);
            setStep(1);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            style={{ flex: 1, justifyContent: 'center' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Register New Member</Text>
                <TouchableOpacity 
                  onPress={() => {
                    if (!registerLoading) {
                      setRegisterModalVisible(false);
                      setStep(1);
                    }
                  }}
                >
                  <MaterialIcons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>Step {step} of {getTotalSteps()}</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${(step / getTotalSteps()) * 100}%` }]} />
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {getStepContent()}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Blue Header Card
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
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#ffffff',
  },
  registerButton: {
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
  registerButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#ffffff',
  },
  profileIcon: {
    width: 70,
    height: 70,
    borderRadius: 50,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 50,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: { 
    flex: 1, 
    fontFamily: Fonts.Regular,
    fontSize: 14, 
    color: '#1f2937' 
  },

  statsContainer: { 
    maxHeight: 80,
  },
  statsContent: { 
    gap: 10,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 8,
    minWidth: 70,
    width: 75,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: 70,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statContent: { 
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statLabel: { 
    fontFamily: Fonts.Regular,
    fontSize: 8, 
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  statValue: { 
    fontFamily: Fonts.Bold,
    fontSize: 14, 
    color: '#ffffff',
    textAlign: 'center',
  },
  statIcon: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 2,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  memberCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  memberImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#1f2937',
  },
  memberEmail: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  memberPhone: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
  },
  memberFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  memberFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberDate: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#9ca3af',
  },
  memberCommission: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#10b981',
  },
  donationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  donationBadgeText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#8b5cf6',
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
  },
  emptyStateSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
  },
  inviteButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  inviteButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
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

  // Modal Styles - Multi-Step Registration
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
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
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  modalStepTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 18,
    color: '#1f2937',
    marginBottom: 4,
  },
  modalSubStep: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  modalInput: {
    fontFamily: Fonts.Regular,
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 4,
    color: '#1f2937',
    backgroundColor: 'transparent',
  },
  bottomLine: {
    height: 2,
    backgroundColor: '#1f2937',
    width: '100%',
    marginTop: 4,
  },
  textArea: {
    height: 50,
    textAlignVertical: 'top',
    paddingVertical: 8,
  },
  modalLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
    marginBottom: 8,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  genderOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  genderText: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
  },
  genderTextActive: {
    color: '#ffffff',
    fontFamily: Fonts.SemiBold,
  },
  formRow: {
    flexDirection: 'row',
  },
  uploadContainer: {
    marginVertical: 8,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    width: '100%',
  },
  uploadButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#3b82f6',
    fontSize: 14,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'center',
  },
  modalStepButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  modalNextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 50,
    flex: 0.5,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  modalBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6b7280',
    paddingVertical: 14,
    borderRadius: 50,
    flex: 0.5,
    gap: 8,
  },
  modalSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 50,
    flex: 0.5,
    gap: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.7,
  },
});