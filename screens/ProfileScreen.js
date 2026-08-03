// screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Fonts } from '../config/fonts';

export default function ProfileScreen({ navigation }) {
  const [loginModalVisible, setLoginModalVisible] = useState(false);

  const menuItems = [
    { icon: 'person', label: 'My Profile', color: '#3b82f6' },
    { icon: 'receipt', label: 'My Orders', color: '#10b981' },
    { icon: 'favorite', label: 'My Donations', color: '#ef4444' },
    { icon: 'event', label: 'My Events', color: '#3b82f6' },
    { icon: 'card-membership', label: 'ID Card', color: '#f59e0b' },
    { icon: 'verified', label: 'Certificate', color: '#06b6d4' },
    { icon: 'notifications', label: 'Notifications', color: '#ec4899' },
    { icon: 'settings', label: 'Settings', color: '#6b7280' },
  ];

  const handleMenuItemPress = (item) => {
    Alert.alert(
      'Login Required',
      `Please login to access ${item.label}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Login') }
      ]
    );
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.avatarContainer}>
            </View>
            <Text style={styles.greeting}>Welcome!</Text>
            <Text style={styles.subGreeting}>Please login to access all features</Text>
          </View>
        </View>

        {/* Login/Register Buttons */}
        <View style={styles.authButtonsContainer}>
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} activeOpacity={0.8}>
            <MaterialIcons name="login" size={24} color="#ffffff" />
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.registerButton} onPress={handleRegister} activeOpacity={0.8}>
            <MaterialIcons name="person-add" size={24} color="#3b82f6" />
            <Text style={styles.registerButtonText}>Register</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <Text style={styles.menuTitle}>Quick Access</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => handleMenuItemPress(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                <MaterialIcons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <MaterialIcons name="chevron-right" size={20} color="#d1d5db" />
            </TouchableOpacity>
          ))}
        </View>

        {/* About Section */}
        <View style={styles.aboutContainer}>
          <Text style={styles.aboutTitle}>About the App</Text>
          <Text style={styles.aboutText}>
            This NGO Management App helps organizations manage members, 
            events, donations, and e-commerce activities efficiently.
          </Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} NGO Management. All rights reserved.
          </Text>
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

  header: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 50
  },
  headerContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  greeting: {
    fontFamily: Fonts.Bold,
    fontSize: 24,
    color: '#ffffff',
    marginBottom: 4,
  },
  subGreeting: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },

  authButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: -20,
    gap: 12,
  },
  loginButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#ffffff',
  },
  registerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  registerButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#3b82f6',
  },

  menuContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
  },

  aboutContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  aboutTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 8,
  },
  aboutText: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },
  versionText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'right',
  },

  footer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});