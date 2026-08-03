import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, ActivityIndicator, Switch } from 'react-native';
import { signInWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { MaterialIcons } from '@expo/vector-icons';
import { Fonts } from '../config/fonts';

export default function LoginScreen({ navigation, route }) {
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [selectedRole, setSelectedRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);

  // Check if coming from donation flow
  const isDonationFlow = route?.params?.donationFlow || false;

  const roles = [
    { id: 'member', label: 'Member' },
    { id: 'workingMember', label: 'Working Member' },
    { id: 'admin', label: 'Admin' },
    { id: 'donor', label: 'Donor' },
    { id: 'employee', label: 'Employee' }
  ];

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
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      let formattedNumber = phoneNumber;
      if (!phoneNumber.startsWith('+')) {
        formattedNumber = `+91${phoneNumber}`;
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

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert('Error', 'Please enter a valid OTP');
      return;
    }

    setLoading(true);
    try {
      const credential = auth.PhoneAuthProvider.credential(verificationId, otp);
      const userCredential = await auth.signInWithCredential(credential);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role || 'member';
        const userName = userData.fullName || userData.name || 'User';

        Alert.alert('Success', `Welcome ${userName}!`);

        handleNavigation(role, userData);
      } else {
        const donorDoc = await getDoc(doc(db, 'donors', user.uid));
        if (donorDoc.exists()) {
          Alert.alert('Success', 'Welcome donor!');
          navigation.reset({
            index: 0,
            routes: [{ name: 'DonationTabs' }],
          });
          return;
        }
        Alert.alert('Error', 'User data not found. Please contact support.');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      Alert.alert('Error', 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role || 'member';
        const userName = userData.fullName || userData.name || 'User';

        Alert.alert('Success', `Welcome ${userName}!`);

        handleNavigation(role, userData);
      } else {
        const donorDoc = await getDoc(doc(db, 'donors', user.uid));
        if (donorDoc.exists()) {
          Alert.alert('Success', 'Welcome donor!');
          navigation.reset({
            index: 0,
            routes: [{ name: 'DonationTabs' }],
          });
          return;
        }
        Alert.alert('Error', 'User data not found. Please contact support.');
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed. Please try again.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // In LoginScreen.js - Update the handleNavigation function

const handleNavigation = (role, userData) => {
  // Check if this is donation flow
  if (isDonationFlow) {
    navigation.reset({
      index: 0,
      routes: [{ name: 'DonationTabs' }],
    });
    return;
  }

  // Check if user is an employee
  if (userData?.isEmployee || userData?.role === 'employee') {
    navigation.reset({
      index: 0,
      routes: [{ name: 'EmployeeTabs' }],
    });
    return;
  }

  // Navigate based on role
  if (role === 'admin') {
    navigation.reset({
      index: 0,
      routes: [{ name: 'AdminTabs' }],
    });
  } else if (role === 'working') {
    navigation.reset({
      index: 0,
      routes: [{ name: 'WorkingMemberTabs' }],
    });
  } else if (role === 'donor') {
    navigation.reset({
      index: 0,
      routes: [{ name: 'DonationTabs' }],
    });
  } else {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MemberTabs' }],
    });
  }
};

  return (
    <View style={styles.container}>
      {/* Recaptcha Container for Phone Auth */}
      <View id="recaptcha-container" style={styles.recaptchaContainer} />

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.title}>Log into</Text>
      <Text style={styles.subtitle}>your account</Text>

      {/* Login Method Toggle */}
      <View style={styles.methodToggle}>
        <TouchableOpacity
          style={[styles.methodButton, loginMethod === 'email' && styles.methodButtonActive]}
          onPress={() => {
            setLoginMethod('email');
            setShowOtpInput(false);
            setOtp('');
          }}
        >
          <MaterialIcons name="email" size={20} color={loginMethod === 'email' ? '#ffffff' : '#6b7280'} />
          <Text style={[styles.methodText, loginMethod === 'email' && styles.methodTextActive]}>Email</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.methodButton, loginMethod === 'phone' && styles.methodButtonActive]}
          onPress={() => {
            setLoginMethod('phone');
            setShowOtpInput(false);
            setOtp('');
          }}
        >
          <MaterialIcons name="phone" size={20} color={loginMethod === 'phone' ? '#ffffff' : '#6b7280'} />
          <Text style={[styles.methodText, loginMethod === 'phone' && styles.methodTextActive]}>Phone</Text>
        </TouchableOpacity>
      </View>

      {/* Form */}
      <View style={styles.formContainer}>
        {loginMethod === 'email' ? (
          // Email Login
          <>
            <View style={styles.fieldContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.bottomLine} />
            </View>

            <View style={styles.fieldContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <View style={styles.bottomLine} />
            </View>
          </>
        ) : (
          // Phone Login
          <>
            <View style={styles.fieldContainer}>
              <View style={styles.phoneInputContainer}>
                <View style={styles.countryCodeContainer}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  placeholder="Phone Number"
                  placeholderTextColor="#9ca3af"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              <View style={styles.bottomLine} />
            </View>

            {showOtpInput && (
              <View style={styles.fieldContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter OTP"
                  placeholderTextColor="#9ca3af"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <View style={styles.bottomLine} />
              </View>
            )}

            <TouchableOpacity
              style={[styles.sendOtpButton, loading && styles.disabledButton]}
              onPress={showOtpInput ? handleVerifyOtp : handleSendOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.sendOtpText}>
                  {showOtpInput ? 'Verify OTP' : 'Send OTP'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Role Selection - Optional, just for UI */}
        <View style={styles.roleContainer}>
          <Text style={styles.roleLabel}>Login as:</Text>
          <View style={styles.roleButtonsContainer}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[
                  styles.roleButton,
                  selectedRole === role.id && styles.roleButtonActive
                ]}
                onPress={() => setSelectedRole(role.id)}
              >
                <Text style={[
                  styles.roleText,
                  selectedRole === role.id && styles.roleTextActive
                ]}>
                  {role.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Forgot Password - Only for Email Login */}
        {loginMethod === 'email' && (
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>
        )}

        {/* Login Button - Only for Email Login */}
        {loginMethod === 'email' && (
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.disabledButton]}
            onPress={handleEmailLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Sign Up Link */}
        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.signUpLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Donation Register Link - Show when not in donation flow */}
        {!isDonationFlow && (
          <View style={styles.donationContainer}>
            <Text style={styles.donationText}>Want to donate? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('DonationRegister')}>
              <Text style={styles.donationLink}>Register as Donor</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  backButton: {
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
  recaptchaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0,
    zIndex: -1,
  },

  // Method Toggle
  methodToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 25,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  methodButtonActive: {
    backgroundColor: '#3b82f6',
  },
  methodText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#6b7280',
  },
  methodTextActive: {
    color: '#ffffff',
  },

  formContainer: {
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 25,
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

  // Phone Input
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCodeContainer: {
    paddingRight: 10,
  },
  countryCodeText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 0,
  },

  // Send OTP Button
  sendOtpButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  sendOtpText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
  },

  roleContainer: {
    marginBottom: 20,
  },
  roleLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 10,
  },
  roleButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  roleButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  roleText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    color: '#6b7280',
  },
  roleTextActive: {
    color: '#ffffff',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 25,
  },
  forgotPasswordText: {
    fontFamily: Fonts.Regular,
    color: '#6b7280',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signUpText: {
    fontFamily: Fonts.Regular,
    color: '#6b7280',
    fontSize: 14,
  },
  signUpLink: {
    fontFamily: Fonts.SemiBold,
    color: '#3b82f6',
    fontSize: 14,
  },
  donationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  donationText: {
    fontFamily: Fonts.Regular,
    color: '#6b7280',
    fontSize: 14,
  },
  donationLink: {
    fontFamily: Fonts.SemiBold,
    color: '#10b981',
    fontSize: 14,
  },
});