import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, Image, Alert, Platform, KeyboardAvoidingView, ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Fonts } from '../config/fonts';

export default function RegisterScreen({ navigation, route }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('member');
  
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

  const handleSubmit = async () => {
    // Validate all required fields
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
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email.trim(), 
        formData.password
      );
      
      const userId = userCredential.user.uid;

      // Determine final role
      const finalRole = isDonationFlow ? 'donor' : role;

      // Base user data
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

      // For donors, save to 'donors' collection
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

      // Create wallet for working member
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

      // Show appropriate success message
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
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ============ STEP 1: Role Selection (Hidden for Donation Flow) ============
  const renderRoleSelection = () => {
    if (isDonationFlow) {
      // Skip role selection for donation flow
      setStep(2);
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
          <View style={[styles.roleIcon, { backgroundColor: role === 'member' ? '#3b82f6' : '#e5e7eb' }]}>
            <MaterialIcons name="person" size={24} color={role === 'member' ? '#ffffff' : '#6b7280'} />
          </View>
          <View style={styles.roleContent}>
            <Text style={[styles.roleTitle, role === 'member' && styles.roleTitleActive]}>Member</Text>
            <Text style={styles.roleDescription}>Register as a regular member</Text>
          </View>
          {role === 'member' && (
            <MaterialIcons name="check-circle" size={20} color="#3b82f6" />
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

        {/* Donor option - only show when not in donation flow */}
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

  // ============ STEP 2: Personal Information ============
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

      {!isDonationFlow && (
        <View style={styles.fieldContainer}>
          <TextInput
            style={styles.input}
            placeholder="Phone Number *"
            placeholderTextColor="#9ca3af"
            value={formData.phone}
            onChangeText={(text) => setFormData({...formData, phone: text})}
            keyboardType="phone-pad"
          />
          <View style={styles.bottomLine} />
        </View>
      )}

      <View style={styles.stepButtons}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
          <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.nextButton} onPress={() => setStep(3)}>
          <Text style={styles.buttonText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ============ STEP 3: Address & Password ============
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

  // ============ STEP 4: Profile Photo ============
  const renderProfilePhoto = () => (
    <View>
      <Text style={styles.stepTitle}>Profile Photo</Text>
      <Text style={styles.subStep}>Upload your profile photo</Text>

      <View style={styles.uploadContainer}>
        <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('profilePhoto')}>
          <MaterialIcons name="photo-camera" size={24} color={isDonationFlow ? '#10b981' : (role === 'working' ? '#8b5cf6' : '#3b82f6')} />
          <Text style={[styles.uploadButtonText, { color: isDonationFlow ? '#10b981' : (role === 'working' ? '#8b5cf6' : '#3b82f6') }]}>
            {formData.profilePhoto ? 'Change Photo' : 'Upload Profile Photo'}
          </Text>
        </TouchableOpacity>
        {formData.profilePhoto && (
          <Image source={{ uri: formData.profilePhoto }} style={styles.previewImage} />
        )}
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

  // ============ STEP 5: Aadhar Front (Skip for Donors) ============
  const renderAadharFront = () => {
    if (isDonationFlow) {
      setStep(8);
      return null;
    }

    return (
      <View>
        <Text style={styles.stepTitle}>Aadhar Card (Front)</Text>
        <Text style={styles.subStep}>Upload front side of Aadhar card</Text>

        <View style={styles.uploadContainer}>
          <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('aadharFront')}>
            <MaterialIcons name="credit-card" size={24} color={role === 'working' ? '#8b5cf6' : '#3b82f6'} />
            <Text style={[styles.uploadButtonText, { color: role === 'working' ? '#8b5cf6' : '#3b82f6' }]}>
              {formData.aadharFront ? 'Change Aadhar Front' : 'Upload Aadhar Front'}
            </Text>
          </TouchableOpacity>
          {formData.aadharFront && (
            <Image source={{ uri: formData.aadharFront }} style={styles.previewImage} />
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
  };

  // ============ STEP 6: Aadhar Back (Skip for Donors) ============
  const renderAadharBack = () => {
    if (isDonationFlow) {
      return null;
    }

    return (
      <View>
        <Text style={styles.stepTitle}>Aadhar Card (Back)</Text>
        <Text style={styles.subStep}>Upload back side of Aadhar card</Text>

        <View style={styles.uploadContainer}>
          <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('aadharBack')}>
            <MaterialIcons name="credit-card" size={24} color={role === 'working' ? '#8b5cf6' : '#3b82f6'} />
            <Text style={[styles.uploadButtonText, { color: role === 'working' ? '#8b5cf6' : '#3b82f6' }]}>
              {formData.aadharBack ? 'Change Aadhar Back' : 'Upload Aadhar Back'}
            </Text>
          </TouchableOpacity>
          {formData.aadharBack && (
            <Image source={{ uri: formData.aadharBack }} style={styles.previewImage} />
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

  // ============ STEP 7: PAN Card (Skip for Donors) ============
  const renderPANCard = () => {
    if (isDonationFlow) {
      return null;
    }

    return (
      <View>
        <Text style={styles.stepTitle}>PAN Card</Text>
        <Text style={styles.subStep}>Upload your PAN card</Text>

        <View style={styles.uploadContainer}>
          <TouchableOpacity style={styles.uploadButton} onPress={() => pickImage('panCard')}>
            <MaterialIcons name="assignment" size={24} color={role === 'working' ? '#8b5cf6' : '#3b82f6'} />
            <Text style={[styles.uploadButtonText, { color: role === 'working' ? '#8b5cf6' : '#3b82f6' }]}>
              {formData.panCard ? 'Change PAN Card' : 'Upload PAN Card'}
            </Text>
          </TouchableOpacity>
          {formData.panCard && (
            <Image source={{ uri: formData.panCard }} style={styles.previewImage} />
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

  // ============ STEP 8: Signature & Submit ============
  const renderSignature = () => {
  const isDonor = isDonationFlow || role === 'donor';
  const buttonColor = isDonor ? '#10b981' : (role === 'working' ? '#8b5cf6' : '#3b82f6');

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
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(7)}>
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
    if (step === 2) return renderPersonalInfo();
    if (step === 3) return renderAddressAndPassword();
    if (step === 4) return renderProfilePhoto();
    if (step === 5) return renderAadharFront();
    if (step === 6) return renderAadharBack();
    if (step === 7) return renderPANCard();
    if (step === 8) return renderSignature();
    return null;
  };

  const getTotalSteps = () => {
    if (isDonationFlow) return 5; // Skip role selection and document uploads
    return 8;
  };

  // If donation flow, skip to step 2
  if (isDonationFlow && step === 1) {
    setTimeout(() => setStep(2), 100);
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#ffffff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 4,
    width: '100%',
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
    backgroundColor: '#1f2937',
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
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 10,
    gap: 10,
    width: '100%',
  },
  uploadButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#3b82f6',
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
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingVertical: 16,
    borderRadius: 50,
    flex: 0.45,
    shadowColor: '#3b82f6',
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
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingVertical: 16,
    borderRadius: 50,
    flex: 0.45,
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
    color: '#3b82f6',
    fontSize: 14,
  },
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
    borderColor: '#3b82f6',
    backgroundColor: '#f0f7ff',
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
    color: '#3b82f6',
  },
  roleDescription: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
});