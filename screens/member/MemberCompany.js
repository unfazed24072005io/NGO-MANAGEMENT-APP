import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '../../config/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function MemberCompany({ navigation }) {
  const [companyData, setCompanyData] = useState(null);
  const [boardMembers, setBoardMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCompanyData();
    fetchBoardMembers();
  }, []);

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'company', 'profile');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCompanyData(docSnap.data());
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBoardMembers = async () => {
    try {
      const membersSnap = await getDocs(collection(db, 'boardMembers'));
      const members = [];
      membersSnap.forEach((doc) => {
        members.push({ id: doc.id, ...doc.data() });
      });
      setBoardMembers(members);
    } catch (error) {
      console.error('Error fetching board members:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCompanyData();
    await fetchBoardMembers();
    setRefreshing(false);
  };

  const BoardMemberCard = ({ member }) => (
    <View style={styles.boardCard}>
      {member.photo ? (
        <Image source={{ uri: member.photo }} style={styles.boardPhoto} />
      ) : (
        <View style={styles.boardPhotoPlaceholder}>
          <MaterialIcons name="person" size={30} color="#3b82f6" />
        </View>
      )}
      <View style={styles.boardInfo}>
        <Text style={styles.boardName}>{member.name || 'Member'}</Text>
        <Text style={styles.boardPosition}>{member.position || 'Board Member'}</Text>
        {member.bio && <Text style={styles.boardBio} numberOfLines={2}>{member.bio}</Text>}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading Company Profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Company Profile</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        {companyData?.coverImage && (
          <Image source={{ uri: companyData.coverImage }} style={styles.coverImage} />
        )}

        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            {companyData?.logo ? (
              <Image source={{ uri: companyData.logo }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <MaterialIcons name="business" size={40} color="#3b82f6" />
              </View>
            )}
          </View>
        </View>

        {/* Company Info */}
        <View style={styles.card}>
          <Text style={styles.companyName}>{companyData?.companyName || 'NGO Name'}</Text>
          {companyData?.tagline && <Text style={styles.tagline}>{companyData.tagline}</Text>}
          <Text style={styles.description}>{companyData?.description || 'No description available'}</Text>
        </View>

        {/* About Us */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About Us</Text>
          <Text style={styles.aboutText}>{companyData?.about || 'No about information available'}</Text>
          <Text style={styles.missionTitle}>Mission</Text>
          <Text style={styles.missionText}>{companyData?.mission || 'No mission statement available'}</Text>
          <Text style={styles.visionTitle}>Vision</Text>
          <Text style={styles.visionText}>{companyData?.vision || 'No vision statement available'}</Text>
        </View>

        {/* Board Members */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Board Members</Text>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="people" size={20} color="#6b7280" />
            <Text style={styles.boardCount}>{boardMembers.length} Members</Text>
          </View>
          {boardMembers.length === 0 ? (
            <Text style={styles.emptyText}>No board members listed</Text>
          ) : (
            boardMembers.map((member) => (
              <BoardMemberCard key={member.id} member={member} />
            ))
          )}
        </View>

        {/* Contact Information */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactItem}>
            <MaterialIcons name="email" size={20} color="#6b7280" />
            <Text style={styles.contactText}>{companyData?.email || 'N/A'}</Text>
          </View>
          <View style={styles.contactItem}>
            <MaterialIcons name="phone" size={20} color="#6b7280" />
            <Text style={styles.contactText}>{companyData?.phone || 'N/A'}</Text>
          </View>
          <View style={styles.contactItem}>
            <MaterialIcons name="location-on" size={20} color="#6b7280" />
            <Text style={styles.contactText}>{companyData?.address || 'N/A'}</Text>
          </View>
          {companyData?.website && (
            <View style={styles.contactItem}>
              <MaterialIcons name="language" size={20} color="#6b7280" />
              <Text style={styles.contactText}>{companyData.website}</Text>
            </View>
          )}
        </View>

        {/* Social Media */}
        {companyData?.socialMedia && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Follow Us</Text>
            <View style={styles.socialContainer}>
              {companyData.socialMedia.facebook && (
                <TouchableOpacity style={styles.socialButton}>
                  <MaterialIcons name="facebook" size={28} color="#1877f2" />
                </TouchableOpacity>
              )}
              {companyData.socialMedia.instagram && (
                <TouchableOpacity style={styles.socialButton}>
                  <MaterialIcons name="instagram" size={28} color="#e4405f" />
                </TouchableOpacity>
              )}
              {companyData.socialMedia.twitter && (
                <TouchableOpacity style={styles.socialButton}>
                  <MaterialIcons name="twitter" size={28} color="#1da1f2" />
                </TouchableOpacity>
              )}
              {companyData.socialMedia.youtube && (
                <TouchableOpacity style={styles.socialButton}>
                  <MaterialIcons name="youtube" size={28} color="#ff0000" />
                </TouchableOpacity>
              )}
              {companyData.socialMedia.linkedin && (
                <TouchableOpacity style={styles.socialButton}>
                  <MaterialIcons name="linkedin" size={28} color="#0a66c2" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>© {new Date().getFullYear()} {companyData?.companyName || 'NGO'}. All rights reserved.</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Blue Header
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

  scrollView: {
    flex: 1,
  },
  scrollContent: {
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

  coverImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },

  logoSection: {
    alignItems: 'center',
    marginTop: -50,
  },
  logoContainer: {
    padding: 4,
    backgroundColor: '#ffffff',
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 50,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  companyName: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#1f2937',
    textAlign: 'center',
  },
  tagline: {
    fontFamily: Fonts.Italic,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  description: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    marginTop: 8,
    textAlign: 'center',
  },

  sectionTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  boardCount: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
  },

  aboutText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 22,
  },
  missionTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    marginTop: 12,
  },
  missionText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    marginTop: 4,
    lineHeight: 22,
  },
  visionTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    marginTop: 12,
  },
  visionText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    marginTop: 4,
    lineHeight: 22,
  },

  boardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  boardPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  boardPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardInfo: {
    flex: 1,
  },
  boardName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#1f2937',
  },
  boardPosition: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
  },
  boardBio: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },

  emptyText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 10,
  },

  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  contactText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },

  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  socialButton: {
    padding: 8,
  },

  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});