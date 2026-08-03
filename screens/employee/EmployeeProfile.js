// screens/employee/EmployeeProfile.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TextInput, TouchableOpacity, Alert, ActivityIndicator, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Fonts } from '../../config/fonts';

export default function EmployeeProfile({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    profilePhoto: null,
    position: '',
    department: '',
    employeeId: '',
    joiningDate: '',
    bio: ''
  });

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Error', 'User not logged in');
        return;
      }

      // Get user data
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        setUserData(userData);
        
        // Get employee data using employeeId reference
        if (userData.employeeId) {
          const empDocRef = doc(db, 'employees', userData.employeeId);
          const empDocSnap = await getDoc(empDocRef);
          
          if (empDocSnap.exists()) {
            const empData = empDocSnap.data();
            setEmployeeData(empData);
            setFormData({
              fullName: empData.fullName || userData.fullName || '',
              email: empData.email || userData.email || '',
              phone: empData.phone || '',
              address: empData.address || '',
              profilePhoto: empData.profilePhoto || userData.profilePhoto || null,
              position: empData.position || 'Employee',
              department: empData.department || 'General',
              employeeId: empData.employeeId || 'N/A',
              joiningDate: empData.joiningDate || 'N/A',
              bio: empData.bio || 'Employee'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Update user document
      await updateDoc(doc(db, 'users', userId), {
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        profilePhoto: formData.profilePhoto,
        bio: formData.bio,
        updatedAt: new Date().toISOString()
      });

      // Update employee document if employeeId exists
      if (userData?.employeeId) {
        await updateDoc(doc(db, 'employees', userData.employeeId), {
          fullName: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          profilePhoto: formData.profilePhoto,
          bio: formData.bio,
          updatedAt: new Date().toISOString()
        });
      }

      Alert.alert('Success', 'Profile updated successfully');
      setEditing(false);
      fetchEmployeeData();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
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
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Saffron Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableOpacity onPress={() => setEditing(!editing)}>
            <Text style={styles.editButton}>{editing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {formData.profilePhoto ? (
              <Image source={{ uri: formData.profilePhoto }} style={styles.profileImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <MaterialIcons name="person" size={50} color="#FF7722" />
              </View>
            )}
          </View>
          <Text style={styles.profileName}>{formData.fullName || 'Employee'}</Text>
          <Text style={styles.profilePosition}>{formData.position}</Text>
          <Text style={styles.profileDepartment}>{formData.department}</Text>
          
          <View style={styles.employeeIdBadge}>
            <MaterialIcons name="badge" size={16} color="#FF7722" />
            <Text style={styles.employeeIdText}>ID: {formData.employeeId}</Text>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.fullName}
                onChangeText={(text) => setFormData({...formData, fullName: text})}
                placeholder="Enter full name"
              />
            ) : (
              <Text style={styles.value}>{formData.fullName || 'N/A'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{formData.email}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({...formData, phone: text})}
                keyboardType="phone-pad"
                placeholder="Enter phone number"
              />
            ) : (
              <Text style={styles.value}>{formData.phone || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Address</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.address}
                onChangeText={(text) => setFormData({...formData, address: text})}
                multiline
                numberOfLines={3}
                placeholder="Enter address"
              />
            ) : (
              <Text style={styles.value}>{formData.address || 'Not provided'}</Text>
            )}
          </View>
        </View>

        {/* Employment Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Employment Information</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Position</Text>
            <View style={styles.badgeContainer}>
              <MaterialIcons name="work" size={16} color="#FF7722" />
              <Text style={styles.value}>{formData.position}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Department</Text>
            <View style={styles.badgeContainer}>
              <MaterialIcons name="business" size={16} color="#8b5cf6" />
              <Text style={styles.value}>{formData.department}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Employee ID</Text>
            <View style={styles.badgeContainer}>
              <MaterialIcons name="badge" size={16} color="#f59e0b" />
              <Text style={styles.value}>{formData.employeeId}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Joining Date</Text>
            <View style={styles.dateBadge}>
              <MaterialIcons name="calendar-today" size={14} color="#6b7280" />
              <Text style={styles.dateText}>{formData.joiningDate}</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <TouchableOpacity 
          style={styles.taskButton}
          onPress={() => navigation.navigate('EmployeeTasks')}
        >
          <View style={styles.taskButtonLeft}>
            <View style={styles.taskButtonIcon}>
              <MaterialIcons name="assignment" size={24} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.taskButtonTitle}>My Tasks</Text>
              <Text style={styles.taskButtonSubtitle}>View your assigned tasks</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#ffffff" />
        </TouchableOpacity>

        {editing && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            <MaterialIcons name="save" size={20} color="#ffffff" />
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#ffffff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

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
    backgroundColor: '#fdf8f3',
  },

  headerCard: {
    backgroundColor: '#FF7722',
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
    fontSize: 14,
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
  profileName: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#1f2937',
    marginTop: 8,
  },
  profilePosition: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#FF7722',
    marginTop: 4,
  },
  profileDepartment: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
  },
  employeeIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5EB',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    gap: 6,
  },
  employeeIdText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#FF7722',
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
  cardTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 12,
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
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontFamily: Fonts.Regular,
    fontSize: 15,
    color: '#1f2937',
  },

  taskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  taskButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskButtonIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskButtonTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#ffffff',
  },
  taskButtonSubtitle: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
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
    fontSize: 16,
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