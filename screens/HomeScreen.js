// screens/HomeScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  FlatList,
  Linking,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '../config/firebase';
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { Fonts } from '../config/fonts';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companyData, setCompanyData] = useState(null);
  const [products, setProducts] = useState([]);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('food');
  const [expandedService, setExpandedService] = useState(null);
  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  const productTimerRef = useRef(null);
  const eventTimerRef = useRef(null);

  const tabs = [
    { id: 'food', label: 'Food', icon: 'restaurant' },
    { id: 'clothing', label: 'Clothing', icon: 'checkroom' },
    { id: 'education', label: 'Education', icon: 'school' },
    { id: 'money', label: 'Money', icon: 'attach-money' },
  ];

  const services = [
    {
      id: 'oldage',
      icon: 'elderly',
      title: 'Old Age Assistance',
      description: 'Support for senior citizens with medical care and daily needs',
      details: [
        { label: 'Below 20 years', value: '₹ 25,000' },
        { label: '20 - 40 years', value: '₹ 15,000' },
        { label: '40 - 60 years', value: '₹ 10,000' },
        { label: '60 years & above', value: '₹ 5,000' },
      ]
    },
    {
      id: 'kanya',
      icon: 'child-care',
      title: 'Kanya Marriage Assistance',
      description: 'Financial support for girl child marriage ceremonies',
      details: [
        { label: 'Below 4 years', value: '₹ 25,000' },
        { label: '4 - 8 years', value: '₹ 15,000' },
        { label: '8 - 12 years', value: '₹ 10,000' },
        { label: '12 years & above', value: '₹ 5,000' },
      ]
    },
    {
      id: 'selfemployment',
      icon: 'work',
      title: 'Self-Employment Assistance',
      description: 'Empower through livelihood and skill development programs',
      details: [
        { label: 'Available for unemployed elderly people', value: 'Support Provided' },
      ]
    },
  ];

  const leadership = [
    { name: 'Shri. Rajesh Kumar', role: 'President', color: '#FF7722' },
    { name: 'Smt. Anita Sharma', role: 'Secretary', color: '#10b981' },
    { name: 'Shri. Sunil Verma', role: 'Treasurer', color: '#3b82f6' },
  ];

  useEffect(() => {
    fetchHomeData();
    return () => {
      clearInterval(productTimerRef.current);
      clearInterval(eventTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (products.length > 1) {
      productTimerRef.current = setInterval(() => {
        setActiveProductIndex((prev) => (prev + 1) % products.length);
      }, 4000);
    }
    return () => clearInterval(productTimerRef.current);
  }, [products]);

  useEffect(() => {
    if (events.length > 1) {
      eventTimerRef.current = setInterval(() => {
        setActiveEventIndex((prev) => (prev + 1) % events.length);
      }, 4000);
    }
    return () => clearInterval(eventTimerRef.current);
  }, [events]);

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      const companyDocRef = doc(db, 'company', 'profile');
      const companyDocSnap = await getDoc(companyDocRef);
      if (companyDocSnap.exists()) {
        setCompanyData(companyDocSnap.data());
      }

      try {
        const productsQuery = query(
          collection(db, 'products'),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc')
        );
        const productsSnapshot = await getDocs(productsQuery);
        const productsList = [];
        productsSnapshot.forEach((doc) => {
          productsList.push({ id: doc.id, ...doc.data() });
        });
        setProducts(productsList);
      } catch (productError) {
        console.log('Products collection may not exist yet:', productError);
        setProducts([]);
      }

      try {
        const eventsQuery = query(
          collection(db, 'events'),
          where('isActive', '==', true),
          orderBy('date', 'asc')
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const eventsList = [];
        eventsSnapshot.forEach((doc) => {
          eventsList.push({ id: doc.id, ...doc.data() });
        });
        setEvents(eventsList);
      } catch (eventError) {
        console.log('Events collection may not exist yet:', eventError);
        setEvents([]);
      }

    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHomeData();
    setRefreshing(false);
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

  const handleRequireLogin = (action, screen) => {
    Alert.alert(
      'Login Required',
      `Please login to ${action}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Login') }
      ]
    );
  };

  const handleProductPress = (product) => {
    handleRequireLogin('view product details', 'Login');
  };

  const handleEventPress = (event) => {
    handleRequireLogin('register for this event', 'Login');
  };

  const toggleService = (id) => {
    setExpandedService(expandedService === id ? null : id);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF7722" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF7722']} />
        }
      >
        {/* Cover Image - Rectangle with rounded corners */}
        <View style={styles.coverContainer}>
          <Image 
            source={{ uri: companyData?.coverImage || 'https://via.placeholder.com/400x200/FF7722/ffffff?text=NGO+Cover' }} 
            style={styles.coverImage}
          />
        </View>

        {/* Profile Info Row */}
        <View style={styles.profileRow}>
          <View style={styles.profileLeft}>
            <View style={styles.verifiedBadge}>
              <MaterialIcons name="verified" size={18} color="#FF7722" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>
          <View style={styles.profileRight}>
            <TouchableOpacity style={styles.actionIcon}>
              <MaterialIcons name="call" size={22} color="#FF7722" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon}>
              <MaterialIcons name="message" size={22} color="#FF7722" />
            </TouchableOpacity>
          </View>
        </View>

        {/* NGO Name */}
        <Text style={styles.orgName}>{getField('organizationName', 'NGO Organization')}</Text>

        {/* Location */}
        <View style={styles.locationContainer}>
          <MaterialIcons name="location-on" size={16} color="#6b7280" />
          <Text style={styles.locationText}>{getField('address', 'Location not specified')}</Text>
        </View>

        {/* Tabs Row */}
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <MaterialIcons 
                name={tab.icon} 
                size={16} 
                color={activeTab === tab.id ? '#FF7722' : '#6b7280'} 
              />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reviews Bar - Full width with saffron bg */}
        <View style={styles.reviewsBar}>
          <View style={styles.reviewsContent}>
            <View style={styles.reviewsLeft}>
              <Text style={styles.reviewsLabel}>Reviews</Text>
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={18} color="#fbbf24" />
                <Text style={styles.ratingText}>4.8</Text>
              </View>
            </View>
            <View style={styles.reviewsRight}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={[styles.avatarCircle, { marginLeft: i > 1 ? -12 : 0 }]}>
                  <Text style={styles.avatarText}>{String.fromCharCode(64 + i)}</Text>
                </View>
              ))}
              <View style={[styles.avatarCircle, styles.moreCircle]}>
                <Text style={styles.moreText}>+{Math.floor(Math.random() * 10) + 5}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.aboutContainer}>
          <Text style={styles.aboutTitle}>About Us</Text>
          <Text style={styles.aboutText}>
            {getField('about', 'We are a non-profit organization dedicated to making a difference in the community through various social welfare programs and initiatives.')}
          </Text>
        </View>

        {/* Services Section - 3 Tabs in a row */}
        <View style={styles.servicesContainer}>
          <View style={styles.servicesTabs}>
            {services.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceTab,
                  expandedService === service.id && styles.serviceTabActive
                ]}
                onPress={() => toggleService(service.id)}
              >
                <View style={styles.serviceTabIcon}>
                  <MaterialIcons 
                    name={service.icon} 
                    size={22} 
                    color={expandedService === service.id ? '#FF7722' : '#6b7280'} 
                  />
                </View>
                <Text style={[
                  styles.serviceTabText,
                  expandedService === service.id && styles.serviceTabTextActive
                ]}>
                  {service.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Expanded Service Details */}
          {expandedService && (
            <View style={styles.expandedServiceCard}>
              {services.find(s => s.id === expandedService)?.details.map((detail, idx) => (
                <View key={idx} style={styles.serviceDetailRow}>
                  <Text style={styles.serviceDetailLabel}>{detail.label}</Text>
                  <Text style={[styles.serviceDetailValue, { color: '#FF7722' }]}>
                    {detail.value}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Leadership Section */}
        <View style={styles.leadershipContainer}>
          <Text style={styles.leadershipTitle}>Leadership</Text>
          {leadership.map((leader, index) => (
            <View key={index} style={styles.leaderCard}>
              <View style={[styles.leaderIcon, { backgroundColor: leader.color }]}>
                <Text style={styles.leaderInitial}>{leader.name.charAt(0)}</Text>
              </View>
              <View style={styles.leaderContent}>
                <Text style={styles.leaderName}>{leader.name}</Text>
                <Text style={styles.leaderRole}>{leader.role}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} {getField('organizationName', 'NGO')}. All rights reserved.
          </Text>
          <Text style={styles.footerSubText}>Together we can make a difference</Text>
          {getField('email') && getField('email') !== 'Not provided' && (
            <Text style={styles.footerContact}>{getField('email')}</Text>
          )}
          {getField('contactNo') && getField('contactNo') !== 'Not provided' && (
            <Text style={styles.footerContact}>{getField('contactNo')}</Text>
          )}
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

  // Cover Image - Rectangle with rounded corners
  coverContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  coverImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    resizeMode: 'cover',
    backgroundColor: '#f3f4f6',
  },

  // Profile Row
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5eb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
  },
  verifiedText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#FF7722',
  },
  profileRight: {
    flexDirection: 'row',
    gap: 10,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff5eb',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // NGO Name
  orgName: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#1f2937',
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Location
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 4,
  },
  locationText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
  },

  // Tabs Row
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#fff5eb',
  },
  tabText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#FF7722',
  },

  // Reviews Bar - Full width with saffron bg
  reviewsBar: {
    backgroundColor: '#FF7722',
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: 400,
    marginLeft: 13,      
    borderRadius: 10
  },
  reviewsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewsLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#ffffff',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#ffffff',
  },
  reviewsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF7722',
  },
  avatarText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#ffffff',
  },
  moreCircle: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  moreText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    color: '#ffffff',
  },

  // About Section
  aboutContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  aboutTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
    marginBottom: 8,
  },
  aboutText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },

  // Services Section
  servicesContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  servicesTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  serviceTab: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  serviceTabActive: {
    backgroundColor: '#fff5eb',
  },
  serviceTabIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceTabText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
  serviceTabTextActive: {
    color: '#FF7722',
  },

  // Expanded Service Card
  expandedServiceCard: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  serviceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  serviceDetailLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
  },
  serviceDetailValue: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
  },

  // Leadership Section
  leadershipContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  leadershipTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
    marginBottom: 12,
  },
  leaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  leaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  leaderInitial: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#ffffff',
  },
  leaderContent: {
    flex: 1,
  },
  leaderName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#1f2937',
  },
  leaderRole: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },

  // Footer
  footer: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  footerText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  footerSubText: {
    fontFamily: Fonts.Italic,
    fontSize: 11,
    color: '#b0b8c4',
    textAlign: 'center',
    marginTop: 4,
  },
  footerContact: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
});