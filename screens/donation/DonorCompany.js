import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, RefreshControl, Linking, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function MemberCompany({ navigation }) {
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'company', 'profile');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('✅ Company Data:', data);
        setCompanyData(data);
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
      Alert.alert('Error', 'Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCompanyData();
    setRefreshing(false);
  };

  const openLink = (url) => {
    if (url && url !== 'Not provided') {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Could not open link');
      });
    }
  };

  const callPhone = (phone) => {
    if (phone && phone !== 'Not provided') {
      Linking.openURL(`tel:${phone}`).catch(() => {
        Alert.alert('Error', 'Could not open dialer');
      });
    }
  };

  const sendEmail = (email) => {
    if (email && email !== 'Not provided') {
      Linking.openURL(`mailto:${email}`).catch(() => {
        Alert.alert('Error', 'Could not open email');
      });
    }
  };

  const getField = (field, fallback = 'Not provided') => {
    if (!companyData) return fallback;
    const keys = field.split('.');
    let value = companyData;
    for (const key of keys) {
      if (value && value[key] !== undefined) {
        value = value[key];
      } else {
        return fallback;
      }
    }
    return value || fallback;
  };

  const formatCurrency = (amount) => {
    if (!amount || amount === 'Not provided') return 'N/A';
    return `₹ ${parseInt(amount).toLocaleString('en-IN')}`;
  };

  const ServiceCard = ({ title, icon, children }) => (
    <View style={styles.serviceCard}>
      <View style={styles.serviceHeader}>
        <MaterialIcons name={icon} size={20} color="#3b82f6" />
        <Text style={styles.serviceTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );

  const ServiceRow = ({ label, value }) => (
    <View style={styles.serviceRow}>
      <Text style={styles.serviceLabel}>{label}</Text>
      <Text style={styles.serviceValue}>{formatCurrency(value)}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading Organization Profile...</Text>
      </View>
    );
  }

  if (!companyData) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="business" size={60} color="#d1d5db" />
        <Text style={styles.emptyTitle}>No Organization Data</Text>
        <Text style={styles.emptySubtext}>Please contact the administrator to set up the organization profile.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchCompanyData} activeOpacity={0.7}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Organization Profile</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Cover Image */}
        <View style={styles.coverSection}>
          {getField('coverImage') && getField('coverImage') !== 'Not provided' ? (
            <Image source={{ uri: getField('coverImage') }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <MaterialIcons name="image" size={40} color="#9ca3af" />
              <Text style={styles.coverPlaceholderText}>Organization Cover</Text>
            </View>
          )}
        </View>

        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            {getField('logo') && getField('logo') !== 'Not provided' ? (
              <Image source={{ uri: getField('logo') }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>
                  {getField('organizationName').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Organization Info */}
        <View style={styles.card}>
          <Text style={styles.companyName}>{getField('organizationName')}</Text>
          {getField('tagline') && getField('tagline') !== 'Not provided' && (
            <Text style={styles.tagline}>{getField('tagline')}</Text>
          )}
          <View style={styles.statusContainer}>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active</Text>
            </View>
            {getField('establishedYear') && getField('establishedYear') !== 'Not provided' && (
              <Text style={styles.establishedText}>Est. {getField('establishedYear')}</Text>
            )}
          </View>
          {getField('description') && getField('description') !== 'Not provided' && (
            <Text style={styles.description}>{getField('description')}</Text>
          )}
        </View>

        {/* Organization Details */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="info" size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Organization Details</Text>
          </View>

          {getField('cin') && getField('cin') !== 'Not provided' && (
            <View style={styles.detailRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#eff6ff' }]}>
                <MaterialIcons name="verified" size={18} color="#3b82f6" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>CIN</Text>
                <Text style={styles.detailValue}>{getField('cin')}</Text>
              </View>
            </View>
          )}

          {getField('registrationNumber') && getField('registrationNumber') !== 'Not provided' && (
            <View style={styles.detailRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#f3f4f6' }]}>
                <MaterialIcons name="assignment" size={18} color="#6b7280" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Registration Number</Text>
                <Text style={styles.detailValue}>{getField('registrationNumber')}</Text>
              </View>
            </View>
          )}

          {getField('employeeCount') && getField('employeeCount') !== 'Not provided' && (
            <View style={styles.detailRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#d1fae5' }]}>
                <MaterialIcons name="people" size={18} color="#10b981" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Employee Count</Text>
                <Text style={styles.detailValue}>{getField('employeeCount')}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Services Offered Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="handshake" size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Services Offered</Text>
          </View>

          {/* Old Age Assistance */}
          {getField('oldAgeAssistance') && getField('oldAgeAssistance') !== 'Not provided' && (
            <ServiceCard title="Kabir Old Age Assistance Program" icon="elderly">
              <ServiceRow 
                label="Below 20 years" 
                value={getField('oldAgeAssistance.below20')} 
              />
              <ServiceRow 
                label="20 - 40 years" 
                value={getField('oldAgeAssistance.between20to40')} 
              />
              <ServiceRow 
                label="40 - 60 years" 
                value={getField('oldAgeAssistance.between40to60')} 
              />
              <ServiceRow 
                label="60 years & above" 
                value={getField('oldAgeAssistance.above60')} 
              />
            </ServiceCard>
          )}

          {/* Kanya Marriage Assistance */}
          {getField('kanyaMarriageAssistance') && getField('kanyaMarriageAssistance') !== 'Not provided' && (
            <ServiceCard title="Kanya (Girl Child) Marriage Assistance Program" icon="child-care">
              <ServiceRow 
                label="Below 4 years" 
                value={getField('kanyaMarriageAssistance.below4')} 
              />
              <ServiceRow 
                label="4 - 8 years" 
                value={getField('kanyaMarriageAssistance.between4to8')} 
              />
              <ServiceRow 
                label="8 - 12 years" 
                value={getField('kanyaMarriageAssistance.between8to12')} 
              />
              <ServiceRow 
                label="12 years & above" 
                value={getField('kanyaMarriageAssistance.above12')} 
              />
            </ServiceCard>
          )}

          {/* Self Employment Assistance */}
          {getField('selfEmploymentAssistance') && getField('selfEmploymentAssistance') !== 'Not provided' && (
            <ServiceCard title="Self-Employment Assistance Scheme" icon="work">
              <View style={styles.serviceRow}>
                <Text style={styles.serviceLabel}>Description</Text>
                <Text style={[styles.serviceValue, styles.serviceDescription]}>
                  {getField('selfEmploymentAssistance')}
                </Text>
              </View>
            </ServiceCard>
          )}
        </View>

        {/* About Organization */}
        {(getField('about') && getField('about') !== 'Not provided') && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="article" size={20} color="#8b5cf6" />
              <Text style={styles.sectionTitle}>About Organization</Text>
            </View>
            <Text style={styles.aboutText}>{getField('about')}</Text>
          </View>
        )}

        {/* Mission & Vision */}
        {(getField('mission') && getField('mission') !== 'Not provided') && (
          <View style={styles.card}>
            <View style={styles.missionVisionContainer}>
              {getField('mission') && getField('mission') !== 'Not provided' && (
                <View style={styles.mvItem}>
                  <View style={[styles.mvIcon, { backgroundColor: '#eff6ff' }]}>
                    <MaterialIcons name="flag" size={20} color="#3b82f6" />
                  </View>
                  <View style={styles.mvContent}>
                    <Text style={styles.mvTitle}>Mission</Text>
                    <Text style={styles.mvText}>{getField('mission')}</Text>
                  </View>
                </View>
              )}

              {getField('vision') && getField('vision') !== 'Not provided' && (
                <View style={[styles.mvItem, styles.mvItemBorder]}>
                  <View style={[styles.mvIcon, { backgroundColor: '#d1fae5' }]}>
                    <MaterialIcons name="visibility" size={20} color="#10b981" />
                  </View>
                  <View style={styles.mvContent}>
                    <Text style={styles.mvTitle}>Vision</Text>
                    <Text style={styles.mvText}>{getField('vision')}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Leadership */}
        {(getField('presidentName') && getField('presidentName') !== 'Not provided') && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="people" size={20} color="#f59e0b" />
              <Text style={styles.sectionTitle}>Leadership</Text>
            </View>

            {getField('presidentName') && getField('presidentName') !== 'Not provided' && (
              <View style={styles.leaderRow}>
                <View style={[styles.leaderIcon, { backgroundColor: '#3b82f6' }]}>
                  <MaterialIcons name="person" size={24} color="#ffffff" />
                </View>
                <View style={styles.leaderContent}>
                  <Text style={styles.leaderRole}>President</Text>
                  <Text style={styles.leaderName}>{getField('presidentName')}</Text>
                </View>
              </View>
            )}

            {getField('secretaryName') && getField('secretaryName') !== 'Not provided' && (
              <View style={[styles.leaderRow, styles.leaderRowBorder]}>
                <View style={[styles.leaderIcon, { backgroundColor: '#10b981' }]}>
                  <MaterialIcons name="person" size={24} color="#ffffff" />
                </View>
                <View style={styles.leaderContent}>
                  <Text style={styles.leaderRole}>Secretary</Text>
                  <Text style={styles.leaderName}>{getField('secretaryName')}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Contact Information */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="contact-phone" size={20} color="#ef4444" />
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </View>

          {getField('email') && getField('email') !== 'Not provided' && (
            <TouchableOpacity style={styles.contactItem} onPress={() => sendEmail(getField('email'))} activeOpacity={0.7}>
              <View style={[styles.contactIcon, { backgroundColor: '#eff6ff' }]}>
                <MaterialIcons name="email" size={20} color="#3b82f6" />
              </View>
              <Text style={styles.contactText} numberOfLines={1}>{getField('email')}</Text>
              <MaterialIcons name="chevron-right" size={20} color="#d1d5db" />
            </TouchableOpacity>
          )}

          {getField('contactNo') && getField('contactNo') !== 'Not provided' && (
            <TouchableOpacity style={styles.contactItem} onPress={() => callPhone(getField('contactNo'))} activeOpacity={0.7}>
              <View style={[styles.contactIcon, { backgroundColor: '#d1fae5' }]}>
                <MaterialIcons name="phone" size={20} color="#10b981" />
              </View>
              <Text style={styles.contactText}>{getField('contactNo')}</Text>
              <MaterialIcons name="chevron-right" size={20} color="#d1d5db" />
            </TouchableOpacity>
          )}

          {getField('address') && getField('address') !== 'Not provided' && (
            <View style={styles.contactItem}>
              <View style={[styles.contactIcon, { backgroundColor: '#fef2f2' }]}>
                <MaterialIcons name="location-on" size={20} color="#ef4444" />
              </View>
              <Text style={styles.contactText} numberOfLines={2}>{getField('address')}</Text>
            </View>
          )}

          {getField('website') && getField('website') !== 'Not provided' && (
            <TouchableOpacity style={styles.contactItem} onPress={() => openLink(getField('website'))} activeOpacity={0.7}>
              <View style={[styles.contactIcon, { backgroundColor: '#f3e8ff' }]}>
                <MaterialIcons name="language" size={20} color="#8b5cf6" />
              </View>
              <Text style={[styles.contactText, styles.linkText]} numberOfLines={1}>{getField('website')}</Text>
              <MaterialIcons name="chevron-right" size={20} color="#d1d5db" />
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} {getField('organizationName')}. All rights reserved.
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Header
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
    textAlignVertical: 'center',
    includeFontPadding: false,
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
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 30,
  },
  emptyTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#1f2937',
    marginTop: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  emptySubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Cover
  coverSection: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    height: 160,
  },
  coverImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    gap: 8,
  },
  coverPlaceholderText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#9ca3af',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    marginTop: -40,
  },
  logoContainer: {
    padding: 4,
    backgroundColor: '#ffffff',
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontFamily: Fonts.Bold,
    fontSize: 36,
    color: '#ffffff',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  // Organization Info
  companyName: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#1f2937',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  tagline: {
    fontFamily: Fonts.Italic,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  description: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Status
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  statusText: {
    fontFamily: Fonts.SemiBold,
    color: '#10b981',
    fontSize: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  establishedText: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Detail Row
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  detailValue: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Services
  serviceCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  serviceTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  serviceLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  serviceValue: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  serviceDescription: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
  },

  // About
  aboutText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 24,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Mission & Vision
  missionVisionContainer: {
    gap: 12,
  },
  mvItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  mvItemBorder: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  mvIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mvContent: {
    flex: 1,
  },
  mvTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  mvText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Leadership
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 14,
  },
  leaderRowBorder: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  leaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderContent: {
    flex: 1,
  },
  leaderRole: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  leaderName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Contact
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  linkText: {
    color: '#3b82f6',
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});