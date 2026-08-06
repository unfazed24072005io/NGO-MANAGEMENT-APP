// screens/member/MemberCompany.js
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Linking, Alert 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '../../config/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';
import { getTotalDonations, getDonationCount } from '../../services/paymentService';

export default function MemberCompany({ navigation }) {
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [donationStats, setDonationStats] = useState({
    totalAmount: 0,
    totalDonations: 0,
    totalCampaigns: 0,
  });

  useEffect(() => {
    fetchCompanyData();
    fetchDonationStats();
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

  const fetchDonationStats = async () => {
    try {
      // Get total donations from Firebase
      const donationsSnap = await getDocs(query(
        collection(db, 'donations'),
        where('status', '==', 'completed')
      ));
      
      let totalAmount = 0;
      let totalDonations = 0;
      donationsSnap.forEach(doc => {
        const data = doc.data();
        totalAmount += data.amount || 0;
        totalDonations++;
      });

      // Add Razorpay donations
      const razorpayTotal = getTotalDonations();
      const razorpayCount = getDonationCount();

      // Get campaigns count
      const campaignsSnap = await getDocs(collection(db, 'campaigns'));
      const campaignsCount = campaignsSnap.size;

      setDonationStats({
        totalAmount: totalAmount + razorpayTotal,
        totalDonations: totalDonations + razorpayCount,
        totalCampaigns: campaignsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching donation stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCompanyData();
    await fetchDonationStats();
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

  // Get field with proper fallback
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
        <TouchableOpacity style={styles.retryButton} onPress={fetchCompanyData}>
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
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

        {/* Donation Stats Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="favorite" size={20} color="#ef4444" />
            <Text style={styles.sectionTitle}>Donation Impact</Text>
          </View>

          <View style={styles.donationStatsContainer}>
            <View style={styles.donationStatItem}>
              <Text style={styles.donationStatValue}>₹{donationStats.totalAmount.toLocaleString()}</Text>
              <Text style={styles.donationStatLabel}>Total Donations</Text>
            </View>
            <View style={styles.donationStatDivider} />
            <View style={styles.donationStatItem}>
              <Text style={styles.donationStatValue}>{donationStats.totalDonations}</Text>
              <Text style={styles.donationStatLabel}>Donors</Text>
            </View>
            <View style={styles.donationStatDivider} />
            <View style={styles.donationStatItem}>
              <Text style={styles.donationStatValue}>{donationStats.totalCampaigns}</Text>
              <Text style={styles.donationStatLabel}>Campaigns</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.donateNowButton}
            onPress={() => navigation.navigate('DonationScreen')}
          >
            <MaterialIcons name="favorite" size={20} color="#ffffff" />
            <Text style={styles.donateNowText}>Donate Now</Text>
          </TouchableOpacity>
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
            <TouchableOpacity style={styles.contactItem} onPress={() => sendEmail(getField('email'))}>
              <View style={[styles.contactIcon, { backgroundColor: '#eff6ff' }]}>
                <MaterialIcons name="email" size={20} color="#3b82f6" />
              </View>
              <Text style={styles.contactText}>{getField('email')}</Text>
              <MaterialIcons name="chevron-right" size={20} color="#d1d5db" />
            </TouchableOpacity>
          )}

          {getField('contactNo') && getField('contactNo') !== 'Not provided' && (
            <TouchableOpacity style={styles.contactItem} onPress={() => callPhone(getField('contactNo'))}>
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
              <Text style={styles.contactText}>{getField('address')}</Text>
            </View>
          )}

          {getField('website') && getField('website') !== 'Not provided' && (
            <TouchableOpacity style={styles.contactItem} onPress={() => openLink(getField('website'))}>
              <View style={[styles.contactIcon, { backgroundColor: '#f3e8ff' }]}>
                <MaterialIcons name="language" size={20} color="#8b5cf6" />
              </View>
              <Text style={[styles.contactText, styles.linkText]}>{getField('website')}</Text>
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

// Add these styles to the existing styles
const additionalStyles = {
  // Donation Stats
  donationStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    marginBottom: 12,
  },
  donationStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  donationStatValue: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#ef4444',
  },
  donationStatLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  donationStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  donateNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  donateNowText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#ffffff',
  },
};

// Merge styles
const styles = StyleSheet.create({
  ...require('./MemberCompany').styles,
  ...additionalStyles,
});