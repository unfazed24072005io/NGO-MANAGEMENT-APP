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

export default function RegisterScreen({ navigation, route }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('member');
  const [registrationMethod, setRegistrationMethod] = useState('email'); // 'email' or 'phone'
  const [verificationId, setVerificationId] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
  
  // Check if coming from donation flow
  const isDonationFlow = route?.params?.donationFlow || false;
  
  // If donation flow, default to donor role
  const defaultRole = isDonationFlow ? 'donor' : 'member';
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
    aadharFront: null,
    aadharBack: null,
    panCard: null,
    profilePhoto: null,
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
        email: formData.email.trim().toLowerCase() || '',
        phone: formData.phone.trim(),
        address: formData.address.trim() || '',
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
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || '',
        address: formData.address.trim() || '',
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
      <Text style={styles.subStep}>Enter your basic details</Text>
      
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
              {showOtpInput ? 'Verify OTP & Register' : 'Send OTP'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.stepButtons}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
          <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        
        {registrationMethod === 'email' && (
          <TouchableOpacity style={styles.nextButton} onPress={() => setStep(4)}>
            <Text style={styles.buttonText}>Next →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ============ STEP 4: Address & Password ============
  const renderAddressAndPassword = () => (
    <View>
      <Text style={styles.stepTitle}>Address & Security</Text>
      <Text style={styles.subStep}>Enter your address and set password</Text>
      
      <View style={styles.fieldContainer}>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Address"
          placeholderTextColor="#9ca3af"
          value={formData.address}
          onChangeText={(text) => setFormData({...formData, address: text})}
          multiline
          numberOfLines={2}
        />
        <View style={styles.bottomLine} />
      </View>

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

  // ============ STEP 5: Profile Photo ============
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

  // ============ STEP 6: Aadhar Front ============
  const renderAadharFront = () => {
    if (isDonationFlow) {
      setStep(9);
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

  // ============ STEP 7: Aadhar Back ============
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
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(6)}>
            <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.nextButton} onPress={() => setStep(8)}>
            <Text style={styles.buttonText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ============ STEP 8: PAN Card ============
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

  // ============ STEP 9: Signature & Submit ============
  const renderSignature = () => {
    const isDonor = isDonationFlow || role === 'donor';
    const buttonColor = isDonor ? '#FF7722' : (role === 'working' ? '#8b5cf6' : '#FF7722');

    const handleSubmit = registrationMethod === 'phone' ? handlePhoneRegister : handleEmailRegister;

    return (
      <View>
        <Text style={styles.stepTitle}>Signature</Text>
        <Text style={styles.subStep}>Upload your signature</Text>

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

        <View style={styles.stepButtons}>
          {!isDonationFlow && (
            <TouchableOpacity style={styles.backButton} onPress={() => setStep(8)}>
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
    if (step === 4) return renderAddressAndPassword();
    if (step === 5) return renderProfilePhoto();
    if (step === 6) return renderAadharFront();
    if (step === 7) return renderAadharBack();
    if (step === 8) return renderPANCard();
    if (step === 9) return renderSignature();
    return null;
  };

  const getTotalSteps = () => {
    if (isDonationFlow) return 5;
    return 9;
  };

  if (isDonationFlow && step === 1) {
    setTimeout(() => setStep(2), 100);
  }

  if (registrationMethod === 'phone' && step === 4) {
    setTimeout(() => setStep(5), 100);
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
    flex: 0.45,
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
    flex: 0.45,
    gap: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF7722',
    paddingVertical: 16,
    borderRadius: 50,
    flex: 0.45,
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