import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Fonts } from '../config/fonts';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      {/* Image on top */}
      <View style={styles.imageContainer}>
        <Image 
          source={require('../assets/welcome-image.png')} 
          style={styles.image}
          resizeMode="cover"
        />
      </View>

      {/* Content below image */}
      <View style={styles.contentContainer}>
        {/* Text */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            "Is your heart as open to making a difference as mine? Let's change the world together"
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.signUpButton]}
            onPress={() => navigation.navigate('Register')}
          >
            <MaterialIcons name="person-add" size={22} color="#ffffff" />
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.loginButton]}
            onPress={() => navigation.navigate('Login')}
          >
            <MaterialIcons name="login" size={22} color="#3b82f6" />
            <Text style={[styles.buttonText, styles.loginButtonText]}>Log In</Text>
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
  },
  imageContainer: {
    height: height * 0.45,
    width: width,
    position: 'relative',
  },
  image: {
    width: width,
    height: height * 0.45,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
    backgroundColor: '#ffffff',
  },
  textContainer: {
    marginBottom: 30,
  },
  title: {
    fontFamily: Fonts.Italic,
    fontSize: 22,
    color: '#1f2937',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: 0.5,
  },
  buttonsContainer: {
    gap: 14,
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 50,
    gap: 10,
    width: '100%',
  },
  signUpButton: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  buttonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 18,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  loginButtonText: {
    color: '#3b82f6',
  },
});