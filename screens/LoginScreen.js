import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { MaterialIcons } from '@expo/vector-icons';
import { Fonts } from '../config/fonts';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [loading, setLoading] = useState(false);

  const roles = [
    { id: 'member', label: 'Member' },
    { id: 'workingMember', label: 'Working Member' },
    { id: 'admin', label: 'Admin' }
  ];

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('User UID:', user.uid);
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('User Data:', userData);
        console.log('Role from Firestore:', userData.role);
        
        // Get the role from Firestore - it could be 'member', 'working', or 'admin'
        const role = userData.role || 'member';
        const userName = userData.fullName || userData.name || 'User';
        
        Alert.alert('Success', `Welcome ${userName}!`);
        
        // Navigate based on role
        if (role === 'admin') {
          console.log('Navigating to AdminTabs');
          navigation.reset({
            index: 0,
            routes: [{ name: 'AdminTabs' }],
          });
        } else if (role === 'working') {
          console.log('Navigating to WorkingMemberTabs');
          navigation.reset({
            index: 0,
            routes: [{ name: 'WorkingMemberTabs' }],
          });
        } else {
          console.log('Navigating to MemberTabs');
          navigation.reset({
            index: 0,
            routes: [{ name: 'MemberTabs' }],
          });
        }
      } else {
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

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.title}>Log into</Text>
      <Text style={styles.subtitle}>your account</Text>

      {/* Form */}
      <View style={styles.formContainer}>
        {/* Email Field */}
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

        {/* Password Field */}
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

        {/* Forgot Password */}
        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity 
          style={[styles.loginButton, loading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* Sign Up Link */}
        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.signUpLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 40,
  },
  formContainer: {
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 30,
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
  roleContainer: {
    marginBottom: 25,
  },
  roleLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 10,
  },
  roleButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  roleButton: {
    paddingHorizontal: 20,
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
    marginBottom: 30,
  },
  forgotPasswordText: {
    fontFamily: Fonts.Regular,
    color: '#6b7280',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
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
    marginTop: 24,
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
});