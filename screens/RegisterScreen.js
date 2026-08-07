// screens/RegisterScreen.js
import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, Image, Alert, Platform, KeyboardAvoidingView, ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createUserWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Fonts } from '../config/fonts';
import { Picker } from '@react-native-picker/picker';

export default function RegisterScreen({ navigation, route }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('member');
  const [registrationMethod, setRegistrationMethod] = useState('email');
  const [verificationId, setVerificationId] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
  
  const isDonationFlow = route?.params?.donationFlow || false;
  const defaultRole = isDonationFlow ? 'donor' : 'member';
  
  const [formData, setFormData] = useState({
    // Personal Details
    fullName: '',
    fatherName: '',
    dob: '',
    gender: '',
    education: '',
    caste: '',
    spouseName: '',
    aadharNumber: '',
    phone: '',
    email: '',
    address: '',
    
    // Location Details
    village: '',
    postOffice: '',
    thana: '',
    district: '',
    state: '',
    pinCode: '',
    nationality: '',
    profession: '',
    
    // Membership Details
    membershipNumber: '',
    membershipDate: '',
    guruAshram: '',
    memberType: '',
    contributionAmount: '',
    
    // Account Security
    password: '',
    confirmPassword: '',
    
    // Document Uploads
    profilePhoto: null,
    aadharFront: null,
    aadharBack: null,
    panCard: null,
    signature: null,
  });

  // Setup Recaptcha for Phone Auth
  const setupRecaptcha = () => {
    if (!recaptchaVerifier) {
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
          console.log('Recaptcha verified');
        },
        'expired-callback': () => {
          console.log('Recaptcha expired');
        }
      });
      setRecaptchaVerifier(verifier);
      return verifier;
    }
    return recaptchaVerifier;
  };

  const handleSendOtp = async () => {
    if (!formData.phone || formData.phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      let formattedNumber = formData.phone;
      if (!formattedNumber.startsWith('+')) {
        formattedNumber = `+91${formattedNumber}`;
      }

      const verifier = setupRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, formattedNumber, verifier);
      setVerificationId(confirmation.verificationId);
      setShowOtpInput(true);
      Alert.alert('OTP Sent', 'Please check your phone for the OTP');
    } catch (error) {
      console.error('Error sending OTP:', error);
      let errorMessage = 'Failed to send OTP. Please try again.';
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number. Please enter a valid number.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneRegister = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert('Error', 'Please enter a valid OTP');
      return;
    }

    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    setLoading(true);
    try {
      const credential = auth.PhoneAuthProvider.credential(verificationId, otp);
      const userCredential = await auth.signInWithCredential(credential);
      const user = userCredential.user;

      const userId = user.uid;
      const finalRole = isDonationFlow ? 'donor' : role;

      const userData = {
        fullName: formData.fullName.trim(),
        fatherName: formData.fatherName.trim(),
        dob: formData.dob,
        gender: formData.gender,
        education: formData.education,
        caste: formData.caste,
        spouseName: formData.spouseName,
        aadharNumber: formData.aadharNumber,
        phone: formData.phone.trim(),
        email: formData.email.trim().toLowerCase() || '',
        address: formData.address.trim(),
        village: formData.village,
        postOffice: formData.postOffice,
        thana: formData.thana,
        district: formData.district,
        state: formData.state,
        pinCode: formData.pinCode,
        nationality: formData.nationality,
        profession: formData.profession,
        membershipNumber: formData.membershipNumber,
        membershipDate: formData.membershipDate,
        guruAshram: formData.guruAshram,
        memberType: formData.memberType,
        contributionAmount: formData.contributionAmount,
        role: finalRole,
        status: finalRole === 'donor' ? 'active' : (finalRole === 'working' ? 'active' : 'pending'),
        profilePhoto: formData.profilePhoto || null,
        aadharFront: formData.aadharFront || null,
        aadharBack: formData.aadharBack || null,
        panCard: formData.panCard || null,
        signature: formData.signature || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (finalRole === 'donor') {
        await setDoc(doc(db, 'donors', userId), {
          ...userData,
          totalDonations: 0,
          donationCount: 0,
          lastDonation: null,
        });
      } else {
        await setDoc(doc(db, 'users', userId), userData);
      }

      if (finalRole === 'working') {
        await setDoc(doc(db, 'wallets', userId), {
          balance: 0,
          totalDeposited: 0,
          totalWithdrawn: 0,
          pendingWithdrawals: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      let successMessage = 'Your registration has been submitted for approval. You will be notified once approved.';
      let navigateTo = 'Login';

      if (finalRole === 'donor') {
        successMessage = 'Your donor account has been created successfully! You can now start donating.';
        navigateTo = 'DonationTabs';
      } else if (finalRole === 'working') {
        successMessage = 'Your working member account has been created. You can now login and start earning commissions!';
      }

      Alert.alert(
        'Registration Complete!', 
        successMessage,
        [
          { 
            text: 'OK', 
            onPress: () => {
              if (finalRole === 'donor') {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'DonationTabs' }],
                });
              } else {
                navigation.navigate(navigateTo);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Phone registration error:', error);
      Alert.alert('Error', 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleEmailRegister = async () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!formData.email.trim() || !validateEmail(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!isDonationFlow && !formData.phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
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

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email.trim(), 
        formData.password
      );
      
      const userId = userCredential.user.uid;
      const finalRole = isDonationFlow ? 'donor' : role;

      const userData = {
        fullName: formData.fullName.trim(),
        fatherName: formData.fatherName.trim(),
        dob: formData.dob,
        gender: formData.gender,
        education: formData.education,
        caste: formData.caste,
        spouseName: formData.spouseName,
        aadharNumber: formData.aadharNumber,
        phone: formData.phone.trim() || '',
        email: formData.email.trim().toLowerCase(),
        address: formData.address.trim(),
        village: formData.village,
        postOffice: formData.postOffice,
        thana: formData.thana,
        district: formData.district,
        state: formData.state,
        pinCode: formData.pinCode,
        nationality: formData.nationality,
        profession: formData.profession,
        membershipNumber: formData.membershipNumber,
        membershipDate: formData.membershipDate,
        guruAshram: formData.guruAshram,
        memberType: formData.memberType,
        contributionAmount: formData.contributionAmount,
        role: finalRole,
        status: finalRole === 'donor' ? 'active' : (finalRole === 'working' ? 'active' : 'pending'),
        profilePhoto: formData.profilePhoto || null,
        aadharFront: formData.aadharFront || null,
        aadharBack: formData.aadharBack || null,
        panCard: formData.panCard || null,
        signature: formData.signature || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (finalRole === 'donor') {
        await setDoc(doc(db, 'donors', userId), {
          ...userData,
          totalDonations: 0,
          donationCount: 0,
          lastDonation: null,
        });
      } else {
        await setDoc(doc(db, 'users', userId), userData);
      }

      if (finalRole === 'working') {
        await setDoc(doc(db, 'wallets', userId), {
          balance: 0,
          totalDeposited: 0,
          totalWithdrawn: 0,
          pendingWithdrawals: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      let successMessage = 'Your registration has been submitted for approval. You will be notified once approved.';
      let navigateTo = 'Login';

      if (finalRole === 'donor') {
        successMessage = 'Your donor account has been created successfully! You can now start donating.';
        navigateTo = 'DonationTabs';
      } else if (finalRole === 'working') {
        successMessage = 'Your working member account has been created. You can now login and start earning commissions!';
      }

      Alert.alert(
        'Registration Complete!', 
        successMessage,
        [
          { 
            text: 'OK', 
            onPress: () => {
              if (finalRole === 'donor') {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'DonationTabs' }],
                });
              } else {
                navigation.navigate(navigateTo);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please use a different email or login.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use at least 6 characters.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

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

  // ============ STEP 1: Role Selection ============
  const renderRoleSelection = () => {
    if (isDonationFlow) {
      setTimeout(() => setStep(2), 100);
      return null;
    }

    return (
      <View>
        <Text style={styles.stepTitle}>Select Registration Type</Text>
        <Text style={styles.subStep}>Choose how you want to register</Text>

        <TouchableOpacity 
          style={[styles.roleCard, role === 'member' && styles.roleCardActive]}
          onPress={() => setRole('member')}
        >
          <View style={[styles.roleIcon, { backgroundColor: role === 'member' ? '#FF7722' : '#e5e7eb' }]}>
            <MaterialIcons name="person" size={24} color={role === 'member' ? '#ffffff' : '#6b7280'} />
          </View>
          <View style={styles.roleContent}>
            <Text style={[styles.roleTitle, role === 'member' && styles.roleTitleActive]}>Member</Text>
            <Text style={styles.roleDescription}>Register as a regular member</Text>
          </View>
          {role === 'member' && (
            <MaterialIcons name="check-circle" size={20} color="#FF7722" />
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.roleCard, role === 'working' && styles.roleCardActive]}
          onPress={() => setRole('working')}
        >
          <View style={[styles.roleIcon, { backgroundColor: role === 'working' ? '#8b5cf6' : '#e5e7eb' }]}>
            <MaterialIcons name="work" size={24} color={role === 'working' ? '#ffffff' : '#6b7280'} />
          </View>
          <View style={styles.roleContent}>
            <Text style={[styles.roleTitle, role === 'working' && styles.roleTitleActive]}>Working Member</Text>
            <Text style={styles.roleDescription}>Register as a working member to earn commissions</Text>
          </View>
          {role === 'working' && (
            <MaterialIcons name="check-circle" size={20} color="#8b5cf6" />
          )}
        </TouchableOpacity>

        {!isDonationFlow && (
          <TouchableOpacity 
            style={[styles.roleCard, role === 'donor' && styles.roleCardActive]}
            onPress={() => setRole('donor')}
          >
            <View style={[styles.roleIcon, { backgroundColor: role === 'donor' ? '#10b981' : '#e5e7eb' }]}>
              <MaterialIcons name="favorite" size={24} color={role === 'donor' ? '#ffffff' : '#6b7280'} />
            </View>
            <View style={styles.roleContent}>
              <Text style={[styles.roleTitle, role === 'donor' && styles.roleTitleActive]}>Donor</Text>
              <Text style={styles.roleDescription}>Register as a donor to support the cause</Text>
            </View>
            {role === 'donor' && (
              <MaterialIcons name="check-circle" size={20} color="#10b981" />
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.nextButton} onPress={() => setStep(2)}>
          <Text style={styles.buttonText}>Next →</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ============ STEP 2: Registration Method ============
  const renderRegistrationMethod = () => (
    <View>
      <Text style={styles.stepTitle}>Choose Registration Method</Text>
      <Text style={styles.subStep}>How would you like to register?</Text>

      <TouchableOpacity 
        style={[styles.methodCard, registrationMethod === 'email' && styles.methodCardActive]}
        onPress={() => setRegistrationMethod('email')}
      >
        <View style={[styles.methodIcon, { backgroundColor: registrationMethod === 'email' ? '#FF7722' : '#e5e7eb' }]}>
          <MaterialIcons name="email" size={24} color={registrationMethod === 'email' ? '#ffffff' : '#6b7280'} />
        </View>
        <View style={styles.methodContent}>
          <Text style={[styles.methodTitle, registrationMethod === 'email' && styles.methodTitleActive]}>Email Registration</Text>
          <Text style={styles.methodDescription}>Register using your email and password</Text>
        </View>
        {registrationMethod === 'email' && (
          <MaterialIcons name="check-circle" size={20} color="#FF7722" />
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.methodCard, registrationMethod === 'phone' && styles.methodCardActive]}
        onPress={() => setRegistrationMethod('phone')}
      >
        <View style={[styles.methodIcon, { backgroundColor: registrationMethod === 'phone' ? '#10b981' : '#e5e7eb' }]}>
          <MaterialIcons name="phone" size={24} color={registrationMethod === 'phone' ? '#ffffff' : '#6b7280'} />
        </View>
        <View style={styles.methodContent}>
          <Text style={[styles.methodTitle, registrationMethod === 'phone' && styles.methodTitleActive]}>Phone Registration</Text>
          <Text style={styles.methodDescription}>Register using your phone number and OTP</Text>
        </View>
        {registrationMethod === 'phone' && (
          <MaterialIcons name="check-circle" size={20} color="#10b981" />
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.nextButton} onPress={() => setStep(3)}>
        <Text style={styles.buttonText}>Next →</Text>
      </TouchableOpacity>
    </View>
  );

  // ============ STEP 3: Personal Information ============
  const renderPersonalInfo = () => (
    <View>
      <Text style={styles.stepTitle}>Personal Information</Text>
      <Text style={styles.subStep}>Enter your basic personal details</Text>
      
      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.input}
          placeholder="Full Name *"
          placeholderTextColor="#9ca3af"
          value={formData.fullName}
          onChangeText={(text) => setFormData({...formData, fullName: text})}
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.input}
          placeholder="Father/Husband Name"
          placeholderTextColor="#9ca3af"
          value={formData.fatherName}
          onChangeText={(text) => setFormData({...formData, fatherName: text})}
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.input}
          placeholder="Date of Birth (DD/MM/YYYY)"
          placeholderTextColor="#9ca3af"
          value={formData.dob}
          onChangeText={(text) => setFormData({...formData, dob: text})}
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.fieldContainer}>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={formData.gender}
            onValueChange={(itemValue) => setFormData({...formData, gender: itemValue})}
            style={styles.picker}
          >
            <Picker.Item label="Select Gender" value="" />
            <Picker.Item label="Male" value="Male" />
            <Picker.Item label="Female" value="Female" />
            <Picker.Item label="Other" value="Other" />
          </Picker>
          <View style={styles.bottomLine} />
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.input}
          placeholder="Educational Qualification"
          placeholderTextColor="#9ca3af"
          value={formData.education}
          onChangeText={(text) => setFormData({...formData, education: text})}
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.input}
          placeholder="Caste"
          placeholderTextColor="#9ca3af"
          value={formData.caste}
          onChangeText={(text) => setFormData({...formData, caste: text})}
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.input}
          placeholder="Spouse Name"
          placeholderTextColor="#9ca3af"
          value={formData.spouseName}
          onChangeText={(text) => setFormData({...formData, spouseName: text})}
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.input}
          placeholder="Aadhar Number"
          placeholderTextColor="#9ca3af"
          value={formData.aadharNumber}
          onChangeText={(text) => setFormData({...formData, aadharNumber: text})}
          keyboardType="numeric"
          maxLength={12}
        />
        <View style={styles.bottomLine} />
      </View>

      {registrationMethod === 'email' && (
        <View style={styles.fieldContainer}>
          <TextInput
            style={styles.input}
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
      )}

      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.input}
          placeholder="Phone Number *"
          placeholderTextColor="#9ca3af"
          value={formData.phone}
          onChangeText={(text) => setFormData({...formData, phone: text})}
          keyboardType="phone-pad"
          maxLength={10}
        />
        <View style={styles.bottomLine} />
      </View>

      {registrationMethod === 'phone' && showOtpInput && (
        <View style={styles.fieldContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter OTP *"
            placeholderTextColor="#9ca3af"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
          />
          <View style={styles.bottomLine} />
        </View>
      )}

      {registrationMethod === 'phone' && (
        <TouchableOpacity
          style={[styles.sendOtpButton, loading && styles.disabledButton]}
          onPress={showOtpInput ? handlePhoneRegister : handleSendOtp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.sendOtpText}>
              {showOtpInput ? 'Verify OTP & Continue' : 'Send OTP'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.stepButtons}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
          <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.nextButton} onPress={() => setStep(4)}>
          <Text style={styles.buttonText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ============ STEP 4: Address & Location ============
  const renderAddress = () => (
    <View>
      <Text style={styles.stepTitle}>Address & Location</Text>
      <Text style={styles.subStep}>Enter your address and location details</Text>
      
      <View style={styles.fieldContainer}>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Address"
          placeholderTextColor="#9ca3af"
          value={formData.address}
          onChangeText={(text) => setFormData({...formData, address: text})}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.input}
          placeholder="Village"
          placeholderTextColor="#9ca3af"
          value={formData.village}
          onChangeText={(text) => setFormData({...formData, village: text})}
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.input}
          placeholder="Post Office"
          placeholderTextColor="#9ca3af"
          value={formData.postOffice}
          onChangeText={(text) => setFormData({...formData, postOffice: text})}
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.input}
          placeholder="Thana/Police Station"
          placeholderTextColor="#9ca3af"
          value={formData.thana}
          onChangeText={(text) => setFormData({...formData, thana: text})}
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.input}
          placeholder="District"
          placeholderTextColor="#9ca3af"
          value={formData.district}
          onChangeText={(text) => setFormData({...formData, district: text})}
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.input}
          placeholder="State"
          placeholderTextColor="#9ca3af"
          value={formData.state}
          onChangeText={(text) => setFormData({...formData, state: text})}
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.input}
          placeholder="PIN Code"
          placeholderTextColor="#9ca3af"
          value={formData.pinCode}
          onChangeText={(text) => setFormData({...formData, pinCode: text})}
          keyboardType="numeric"
          maxLength={6}
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nationality"
          placeholderTextColor="#9ca3af"
          value={formData.nationality}
          onChangeText={(text) => setFormData({...formData, nationality: text})}
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.input}
          placeholder="Profession"
          placeholderTextColor="#9ca3af"
          value={formData.profession}
          onChangeText={(text) => setFormData({...formData, profession: text})}
        />
        <View style={styles.bottomLine} />
      </View>

      <View style={styles.stepButtons}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(3)}>
          <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.nextButton} onPress={() => setStep(5)}>
          <Text style={styles.buttonText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ============ STEP 5: Membership Details ============
  const renderMembershipDetails = () => {
    if (isDonationFlow) {
      setTimeout(() => setStep(8), 100);
      return null;
    }

    return (
      <View>
        <Text style={styles.stepTitle}>Membership Details</Text>
        <Text style={styles.subStep}>Enter your membership information</Text>
        
        <View style={styles.fieldContainer}>
          <TextInput
            style={styles.input}
            placeholder="Membership Number"
            placeholderTextColor="#9ca3af"
            value={formData.membershipNumber}
            onChangeText={(text) => setFormData({...formData, membershipNumber: text})}
          />
          <View style={styles.bottomLine} />
        </View>

        <View style={styles.fieldContainer}>
          <TextInput
            style={styles.input}
            placeholder="Membership Date (DD/MM/YYYY)"
            placeholderTextColor="#9ca3af"
            value={formData.membershipDate}
            onChangeText={(text) => setFormData({...formData, membershipDate: text})}
          />
          <View style={styles.bottomLine} />
        </View>

        <View style={styles.fieldContainer}>
          <TextInput
            style={styles.input}
            placeholder="Guru Ashram"
            placeholderTextColor="#9ca3af"
            value={formData.guruAshram}
            onChangeText={(text) => setFormData({...formData, guruAshram: text})}
          />
          <View style={styles.bottomLine} />
        </View>

        <View style={styles.fieldContainer}>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={formData.memberType}
              onValueChange={(itemValue) => setFormData({...formData, memberType: itemValue})}
              style={styles.picker}
            >
              <Picker.Item label="Select Member Type" value="" />
              <Picker.Item label="Founder Member (₹5000+)" value="Founder Member" />
              <Picker.Item label="Collector Member (₹3500)" value="Collector Member" />
              <Picker.Item label="Distinguished Member (₹1500)" value="Distinguished Member" />
              <Picker.Item label="Lifetime Member (₹2500)" value="Lifetime Member" />
              <Picker.Item label="Honored Member (₹500)" value="Honored Member" />
              <Picker.Item label="General Member (₹100)" value="General Member" />
            </Picker>
            <View style={styles.bottomLine} />
          </View>
        </View>

        {formData.memberType && (
          <View style={styles.fieldContainer}>
            <TextInput
              style={styles.input}
              placeholder="Contribution Amount (₹)"
              placeholderTextColor="#9ca3af"
              value={formData.contributionAmount}
              onChangeText={(text) => setFormData({...formData, contributionAmount: text})}
              keyboardType="numeric"
            />
            <View style={styles.bottomLine} />
          </View>
        )}

        <View style={styles.stepButtons}>
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(4)}>
            <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.nextButton} onPress={() => setStep(6)}>
            <Text style={styles.buttonText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ============ STEP 6: Password ============
  const renderPassword = () => {
    if (registrationMethod === 'phone') {
      setTimeout(() => setStep(7), 100);
      return null;
    }

    return (
      <View>
        <Text style={styles.stepTitle}>Account Security</Text>
        <Text style={styles.subStep}>Set your password for account security</Text>
        
        <View style={styles.fieldContainer}>
          <TextInput
            style={styles.input}
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
            style={styles.input}
            placeholder="Confirm Password *"
            placeholderTextColor="#9ca3af"
            value={formData.confirmPassword}
            onChangeText={(text) => setFormData({...formData, confirmPassword: text})}
            secureTextEntry
          />
          <View style={styles.bottomLine} />
        </View>

        <View style={styles.stepButtons}>
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(5)}>
            <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.nextButton} onPress={() => setStep(7)}>
            <Text style={styles.buttonText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ============ STEP 7: Profile Photo ============
  const renderProfilePhoto = () => (
    <View>
      <Text style={styles.stepTitle}>Profile Photo</Text>
      <Text style={styles.subStep}>Upload your profile photo</Text>

      <View style={styles.uploadContainer}>
        <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('profilePhoto')}>
          <MaterialIcons name="photo-camera" size={24} color="#FF7722" />
          <Text style={[styles.uploadButtonText, { color: '#FF7722' }]}>
            {formData.profilePhoto ? 'Change Photo' : 'Upload Profile Photo'}
          </Text>
        </TouchableOpacity>
        {formData.profilePhoto && (
          <Image source={{ uri: formData.profilePhoto }} style={styles.previewImage} />
        )}
      </View>

      <View style={styles.stepButtons}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(registrationMethod === 'phone' ? 5 : 6)}>
          <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.nextButton} onPress={() => setStep(8)}>
          <Text style={styles.buttonText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ============ STEP 8: Aadhar Front ============
  const renderAadharFront = () => {
    if (isDonationFlow) {
      setTimeout(() => setStep(11), 100);
      return null;
    }

    return (
      <View>
        <Text style={styles.stepTitle}>Aadhar Card (Front)</Text>
        <Text style={styles.subStep}>Upload front side of Aadhar card</Text>

        <View style={styles.uploadContainer}>
          <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('aadharFront')}>
            <MaterialIcons name="credit-card" size={24} color="#FF7722" />
            <Text style={[styles.uploadButtonText, { color: '#FF7722' }]}>
              {formData.aadharFront ? 'Change Aadhar Front' : 'Upload Aadhar Front'}
            </Text>
          </TouchableOpacity>
          {formData.aadharFront && (
            <Image source={{ uri: formData.aadharFront }} style={styles.previewImage} />
          )}
        </View>

        <View style={styles.stepButtons}>
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(7)}>
            <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.nextButton} onPress={() => setStep(9)}>
            <Text style={styles.buttonText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ============ STEP 9: Aadhar Back ============
  const renderAadharBack = () => {
    if (isDonationFlow) return null;

    return (
      <View>
        <Text style={styles.stepTitle}>Aadhar Card (Back)</Text>
        <Text style={styles.subStep}>Upload back side of Aadhar card</Text>

        <View style={styles.uploadContainer}>
          <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('aadharBack')}>
            <MaterialIcons name="credit-card" size={24} color="#FF7722" />
            <Text style={[styles.uploadButtonText, { color: '#FF7722' }]}>
              {formData.aadharBack ? 'Change Aadhar Back' : 'Upload Aadhar Back'}
            </Text>
          </TouchableOpacity>
          {formData.aadharBack && (
            <Image source={{ uri: formData.aadharBack }} style={styles.previewImage} />
          )}
        </View>

        <View style={styles.stepButtons}>
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(8)}>
            <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.nextButton} onPress={() => setStep(10)}>
            <Text style={styles.buttonText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ============ STEP 10: PAN Card ============
  const renderPANCard = () => {
    if (isDonationFlow) return null;

    return (
      <View>
        <Text style={styles.stepTitle}>PAN Card</Text>
        <Text style={styles.subStep}>Upload your PAN card</Text>

        <View style={styles.uploadContainer}>
          <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('panCard')}>
            <MaterialIcons name="assignment" size={24} color="#FF7722" />
            <Text style={[styles.uploadButtonText, { color: '#FF7722' }]}>
              {formData.panCard ? 'Change PAN Card' : 'Upload PAN Card'}
            </Text>
          </TouchableOpacity>
          {formData.panCard && (
            <Image source={{ uri: formData.panCard }} style={styles.previewImage} />
          )}
        </View>

        <View style={styles.stepButtons}>
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(9)}>
            <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.nextButton} onPress={() => setStep(11)}>
            <Text style={styles.buttonText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ============ STEP 11: Signature & Submit ============
  const renderSignature = () => {
    const isDonor = isDonationFlow || role === 'donor';
    const buttonColor = isDonor ? '#FF7722' : (role === 'working' ? '#8b5cf6' : '#FF7722');

    const handleSubmit = registrationMethod === 'phone' ? handlePhoneRegister : handleEmailRegister;

    return (
      <View>
        <Text style={styles.stepTitle}>Signature & Declaration</Text>
        <Text style={styles.subStep}>Upload your signature and complete registration</Text>

        <View style={styles.uploadContainer}>
          <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('signature')}>
            <MaterialIcons name="edit" size={24} color={buttonColor} />
            <Text style={[styles.uploadButtonText, { color: buttonColor }]}>
              {formData.signature ? 'Change Signature' : 'Upload Signature'}
            </Text>
          </TouchableOpacity>
          {formData.signature && (
            <Image source={{ uri: formData.signature }} style={styles.previewImage} />
          )}
        </View>

        <View style={styles.declarationContainer}>
          <Text style={styles.declarationText}>
            मैं, {formData.fullName || '___________'} कबीर सत धर्म फाउंडेशन (ट्रस्ट) में अपनी मर्जी से सदस्यता ग्रहण कर रहा/रही हूं।
          </Text>
          <Text style={styles.declarationText}>
            मैं इस ट्रस्ट के सभी नियमों का पालन करूंगा/करूंगी।
          </Text>
          <Text style={styles.declarationText}>
            मैं कोई भी ऐसा कार्य नहीं करूंगा/करूंगी, जिससे ट्रस्ट को किसी प्रकार का कोई नुकसान हो।
          </Text>
          <Text style={styles.declarationText}>
            मैं यह भी वचनबद्ध करता/करती हूं कि ट्रस्ट को आगे बढ़ाने के लिए हर संभव प्रयास करता रहूंगा/रहूंगी।
          </Text>
        </View>

        <View style={styles.stepButtons}>
          {!isDonationFlow && (
            <TouchableOpacity style={styles.backButton} onPress={() => setStep(10)}>
              <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
              <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.submitButton, { backgroundColor: buttonColor }]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
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
  };

  // ============ STEP ROUTING ============
  const getStepContent = () => {
    if (step === 1) return renderRoleSelection();
    if (step === 2) return renderRegistrationMethod();
    if (step === 3) return renderPersonalInfo();
    if (step === 4) return renderAddress();
    if (step === 5) return renderMembershipDetails();
    if (step === 6) return renderPassword();
    if (step === 7) return renderProfilePhoto();
    if (step === 8) return renderAadharFront();
    if (step === 9) return renderAadharBack();
    if (step === 10) return renderPANCard();
    if (step === 11) return renderSignature();
    return null;
  };

  const getTotalSteps = () => {
    if (isDonationFlow) return 5;
    if (registrationMethod === 'phone') return 10;
    return 11;
  };

  // Skip steps for phone registration
  if (registrationMethod === 'phone' && step === 6) {
    setTimeout(() => setStep(7), 100);
  }

  // Skip steps for donation flow
  if (isDonationFlow && step === 1) {
    setTimeout(() => setStep(2), 100);
  }
  if (isDonationFlow && step === 5) {
    setTimeout(() => setStep(8), 100);
  }
  if (isDonationFlow && step === 8) {
    setTimeout(() => setStep(11), 100);
  }

  // Skip aadhar/pan for donor flow
  if (isDonationFlow && step >= 8 && step <= 10) {
    setTimeout(() => setStep(11), 100);
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#fdf8f3' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View id="recaptcha-container" style={styles.recaptchaContainer} />
      
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backHeaderButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>

        <Text style={styles.title}>Create</Text>
        <Text style={styles.subtitle}>
          {isDonationFlow ? 'donor account' : 'your account'}
        </Text>

        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Step {step} of {getTotalSteps()}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(step / getTotalSteps()) * 100}%` }]} />
          </View>
        </View>

        <View style={styles.card}>
          {getStepContent()}
        </View>
        
        <View style={styles.signInContainer}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signInLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backHeaderButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: Fonts.Bold,
    fontSize: 32,
    color: '#1f2937',
  },
  subtitle: {
    fontFamily: Fonts.Bold,
    fontSize: 32,
    color: '#1f2937',
    marginBottom: 30,
    textTransform: 'lowercase',
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF7722',
    borderRadius: 2,
  },
  recaptchaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0,
    zIndex: -1,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 4,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  stepTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 18,
    color: '#1f2937',
    marginBottom: 8,
  },
  subStep: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  input: {
    fontFamily: Fonts.Regular,
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    color: '#1f2937',
    backgroundColor: 'transparent',
  },
  bottomLine: {
    height: 2,
    backgroundColor: '#FF7722',
    width: '100%',
    marginTop: 4,
  },
  textArea: {
    height: 50,
    textAlignVertical: 'top',
    paddingVertical: 8,
  },
  pickerWrapper: {
    backgroundColor: 'transparent',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#1f2937',
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
    backgroundColor: '#fff5eb',
    padding: 14,
    borderRadius: 10,
    gap: 10,
    width: '100%',
  },
  uploadButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#FF7722',
    fontSize: 16,
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'center',
  },
  declarationContainer: {
    backgroundColor: '#fef9f0',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginVertical: 12,
  },
  declarationText: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#1f2937',
    marginBottom: 8,
    lineHeight: 20,
  },
  stepButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF7722',
    paddingVertical: 16,
    borderRadius: 50,
    flex: 1,
    shadowColor: '#FF7722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6b7280',
    paddingVertical: 16,
    borderRadius: 50,
    flex: 1,
    gap: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF7722',
    paddingVertical: 16,
    borderRadius: 50,
    flex: 1,
    gap: 8,
    shadowColor: '#FF7722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  sendOtpButton: {
    backgroundColor: '#FF7722',
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#FF7722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  sendOtpText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    flexWrap: 'wrap',
  },
  signInText: {
    fontFamily: Fonts.Regular,
    color: '#6b7280',
    fontSize: 14,
  },
  signInLink: {
    fontFamily: Fonts.SemiBold,
    color: '#FF7722',
    fontSize: 14,
  },
  // Role Cards
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  roleCardActive: {
    borderColor: '#FF7722',
    backgroundColor: '#fff5eb',
  },
  roleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  roleContent: {
    flex: 1,
  },
  roleTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
  },
  roleTitleActive: {
    color: '#FF7722',
  },
  roleDescription: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  // Method Cards
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  methodCardActive: {
    borderColor: '#FF7722',
    backgroundColor: '#fff5eb',
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
  },
  methodTitleActive: {
    color: '#FF7722',
  },
  methodDescription: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
});