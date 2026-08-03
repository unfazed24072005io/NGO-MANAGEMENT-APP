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
  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  const productTimerRef = useRef(null);
  const eventTimerRef = useRef(null);

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

  const formatCurrency = (amount) => {
    if (!amount || amount === 'Not provided') return 'N/A';
    return `₹ ${parseInt(amount).toLocaleString('en-IN')}`;
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

  const handleDonatePress = () => {
    handleRequireLogin('make a donation', 'Login');
  };

  const handleViewAllProducts = () => {
    navigation.navigate('Shop');
  };

  const handleViewAllEvents = () => {
    navigation.navigate('Events');
  };

  const handleServicePress = (service) => {
    handleRequireLogin(`learn more about ${service}`, 'Login');
  };

  const renderServiceCard = (service, index) => (
    <TouchableOpacity 
      key={index} 
      style={styles.serviceCard}
      onPress={() => handleServicePress(service.title)}
      activeOpacity={0.7}
    >
      <View style={[styles.serviceIcon, { backgroundColor: service.bgColor }]}>
        <MaterialIcons name={service.icon} size={28} color={service.color} />
      </View>
      <Text style={styles.serviceTitle}>{service.title}</Text>
      <Text style={styles.serviceDescription}>{service.description}</Text>
    </TouchableOpacity>
  );

  const renderProductCarousel = () => {
    if (products.length === 0) return null;

    const displayedProducts = products.slice(0, 10);

    return (
      <View style={styles.carouselContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <MaterialIcons name="shopping-bag" size={22} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Our Products</Text>
          </View>
          <TouchableOpacity onPress={handleViewAllProducts}>
            <Text style={styles.seeAllText}>View All →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.carouselWrapper}>
          <FlatList
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={displayedProducts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.productCard}
                onPress={() => handleProductPress(item)}
                activeOpacity={0.8}
              >
                <Image 
                  source={{ uri: item.image || 'https://via.placeholder.com/300x200/3b82f6/ffffff?text=Product' }} 
                  style={styles.productImage}
                />
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.productPrice}>
                    {formatCurrency(item.price)}
                  </Text>
                  <TouchableOpacity 
                    style={styles.buyButton}
                    onPress={() => handleProductPress(item)}
                  >
                    <Text style={styles.buyButtonText}>View Details</Text>
                    <MaterialIcons name="arrow-forward" size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
            onScroll={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / (width * 0.75 + 12));
              setActiveProductIndex(index);
            }}
          />
          {displayedProducts.length > 1 && (
            <View style={styles.dotsContainer}>
              {displayedProducts.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === activeProductIndex && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEventCarousel = () => {
    if (events.length === 0) return null;

    const displayedEvents = events.slice(0, 10);

    return (
      <View style={styles.carouselContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <MaterialIcons name="event" size={22} color="#8b5cf6" />
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
          </View>
          <TouchableOpacity onPress={handleViewAllEvents}>
            <Text style={styles.seeAllText}>View All →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.carouselWrapper}>
          <FlatList
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={displayedEvents}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.eventCard}
                onPress={() => handleEventPress(item)}
                activeOpacity={0.8}
              >
                <Image 
                  source={{ uri: item.image || 'https://via.placeholder.com/300x200/8b5cf6/ffffff?text=Event' }} 
                  style={styles.eventImage}
                />
                <View style={styles.eventInfo}>
                  <Text style={styles.eventName} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={styles.eventMeta}>
                    <MaterialIcons name="calendar-today" size={14} color="#6b7280" />
                    <Text style={styles.eventDate}>
                      {item.date ? new Date(item.date.seconds * 1000).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      }) : 'TBD'}
                    </Text>
                  </View>
                  <View style={styles.eventMeta}>
                    <MaterialIcons name="location-on" size={14} color="#6b7280" />
                    <Text style={styles.eventLocation} numberOfLines={1}>
                      {item.location || 'Virtual Event'}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.registerButton}
                    onPress={() => handleEventPress(item)}
                  >
                    <Text style={styles.registerButtonText}>Register Now</Text>
                    <MaterialIcons name="arrow-forward" size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
            onScroll={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / (width * 0.75 + 12));
              setActiveEventIndex(index);
            }}
          />
          {displayedEvents.length > 1 && (
            <View style={styles.dotsContainer}>
              {displayedEvents.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === activeEventIndex && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderServices = () => {
    const services = [
      { 
        icon: 'elderly', 
        title: 'Old Age Assistance', 
        description: 'Support for senior citizens',
        color: '#3b82f6',
        bgColor: '#eff6ff'
      },
      { 
        icon: 'child-care', 
        title: 'Kanya Marriage Assistance', 
        description: 'Support for girl child marriage',
        color: '#ec4899',
        bgColor: '#fdf2f8'
      },
      { 
        icon: 'work', 
        title: 'Self Employment', 
        description: 'Empower through livelihood',
        color: '#10b981',
        bgColor: '#d1fae5'
      },
      { 
        icon: 'health-and-safety', 
        title: 'Health Programs', 
        description: 'Medical assistance & camps',
        color: '#f59e0b',
        bgColor: '#fef3c7'
      },
    ];

    return (
      <View style={styles.servicesContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <MaterialIcons name="handshake" size={22} color="#10b981" />
            <Text style={styles.sectionTitle}>Our Services</Text>
          </View>
        </View>
        <View style={styles.servicesGrid}>
          {services.map((service, index) => renderServiceCard(service, index))}
        </View>
      </View>
    );
  };

  const renderServiceDetails = () => {
    const serviceDetails = [
      {
        icon: 'elderly',
        title: 'Kabir Old Age Assistance Program',
        color: '#3b82f6',
        bgColor: '#eff6ff',
        details: [
          { label: 'Below 20 years', value: '₹ 25,000' },
          { label: '20 - 40 years', value: '₹ 15,000' },
          { label: '40 - 60 years', value: '₹ 10,000' },
          { label: '60 years & above', value: '₹ 5,000' },
        ]
      },
      {
        icon: 'child-care',
        title: 'Kanya (Girl Child) Marriage Assistance',
        color: '#ec4899',
        bgColor: '#fdf2f8',
        details: [
          { label: 'Below 4 years', value: '₹ 25,000' },
          { label: '4 - 8 years', value: '₹ 15,000' },
          { label: '8 - 12 years', value: '₹ 10,000' },
          { label: '12 years & above', value: '₹ 5,000' },
        ]
      },
      {
        icon: 'work',
        title: 'Self-Employment Assistance Scheme',
        color: '#10b981',
        bgColor: '#d1fae5',
        details: [
          { label: 'Available for unemployed elderly people', value: 'Support Provided' },
        ]
      },
    ];

    return (
      <View style={styles.serviceDetailsContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <MaterialIcons name="info" size={22} color="#8b5cf6" />
            <Text style={styles.sectionTitle}>Service Details</Text>
          </View>
        </View>

        {serviceDetails.map((service, index) => (
          <TouchableOpacity 
            key={index}
            style={styles.serviceDetailCard}
            onPress={() => handleServicePress(service.title)}
            activeOpacity={0.7}
          >
            <View style={styles.serviceDetailHeader}>
              <View style={[styles.serviceDetailIcon, { backgroundColor: service.bgColor }]}>
                <MaterialIcons name={service.icon} size={24} color={service.color} />
              </View>
              <Text style={styles.serviceDetailTitle}>{service.title}</Text>
            </View>
            {service.details.map((detail, idx) => (
              <View key={idx} style={styles.serviceDetailRow}>
                <Text style={styles.serviceDetailLabel}>{detail.label}</Text>
                <Text style={[styles.serviceDetailValue, { color: service.color }]}>
                  {detail.value}
                </Text>
              </View>
            ))}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroOverlay}>
            {companyData?.coverImage ? (
              <Image 
                source={{ uri: companyData.coverImage }} 
                style={styles.heroImage}
              />
            ) : (
              <View style={styles.heroPlaceholder}>
                <MaterialIcons name="volunteer-activism" size={60} color="#3b82f6" />
              </View>
            )}
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>
                {getField('organizationName', 'NGO Organization')}
              </Text>
              <Text style={styles.heroSubtitle}>
                {getField('tagline', 'Making a difference together')}
              </Text>
              
              

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatNumber}>500+</Text>
                  <Text style={styles.heroStatLabel}>Members</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatNumber}>120+</Text>
                  <Text style={styles.heroStatLabel}>Projects</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatNumber}>50+</Text>
                  <Text style={styles.heroStatLabel}>Events</Text>
                </View>
              </View>
            </View>
          </View>
        </View>


        {/* Services */}
        {renderServices()}

        {/* Service Details */}
        {renderServiceDetails()}

        {/* About Section */}
        {(getField('about') && getField('about') !== 'Not provided') && (
          <View style={styles.aboutContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <MaterialIcons name="info" size={22} color="#8b5cf6" />
                <Text style={styles.sectionTitle}>About Us</Text>
              </View>
            </View>
            <Text style={styles.aboutText}>{getField('about')}</Text>
          </View>
        )}

        {/* Mission & Vision */}
        {(getField('mission') && getField('mission') !== 'Not provided') && (
          <View style={styles.missionVisionContainer}>
            {getField('mission') && getField('mission') !== 'Not provided' && (
              <View style={styles.mvCard}>
                <View style={styles.mvHeader}>
                  <MaterialIcons name="flag" size={20} color="#3b82f6" />
                  <Text style={styles.mvTitle}>Our Mission</Text>
                </View>
                <Text style={styles.mvText}>{getField('mission')}</Text>
              </View>
            )}
            {getField('vision') && getField('vision') !== 'Not provided' && (
              <View style={styles.mvCard}>
                <View style={styles.mvHeader}>
                  <MaterialIcons name="visibility" size={20} color="#10b981" />
                  <Text style={styles.mvTitle}>Our Vision</Text>
                </View>
                <Text style={styles.mvText}>{getField('vision')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Leadership */}
        {(getField('presidentName') && getField('presidentName') !== 'Not provided') && (
          <View style={styles.leadershipContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <MaterialIcons name="people" size={22} color="#f59e0b" />
                <Text style={styles.sectionTitle}>Leadership</Text>
              </View>
            </View>
            {getField('presidentName') && getField('presidentName') !== 'Not provided' && (
              <View style={styles.leaderCard}>
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
              <View style={styles.leaderCard}>
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

        {/* Product Carousel */}
        {renderProductCarousel()}

        {/* Event Carousel */}
        {renderEventCarousel()}

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

  heroSection: {
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  heroOverlay: {
    position: 'relative',
  },
  heroImage: {
    width: width,
    height: 220,
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    width: width,
    height: 220,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    padding: 20,
    paddingTop: 12,
  },
  heroTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 24,
    color: '#1f2937',
    textAlign: 'center',
    width: 400,
    marginLeft: -7
  },
  heroSubtitle: {
    fontFamily: Fonts.Italic,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  orgDetails: {
    marginTop: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
  },
  orgDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  orgDetailText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  heroStat: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatNumber: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#3b82f6',
  },
  heroStatLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e5e7eb',
  },

  donateContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  donateButton: {
    backgroundColor: '#ef4444',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  donateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  donateButtonText: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  carouselContainer: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
  },
  carouselWrapper: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 18,
    color: '#1f2937',
  },
  seeAllText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#3b82f6',
  },

  productCard: {
    width: width * 0.75,
    marginRight: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
  },
  productPrice: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#3b82f6',
    marginBottom: 8,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  buyButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#ffffff',
  },

  eventCard: {
    width: width * 0.75,
    marginRight: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  eventInfo: {
    padding: 12,
  },
  eventName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#1f2937',
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  eventDate: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  eventLocation: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 6,
    gap: 6,
  },
  registerButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#ffffff',
  },

  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d1d5db',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#3b82f6',
    width: 18,
  },

  servicesContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    marginBottom: 8,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  serviceCard: {
    flex: 1,
    minWidth: (width - 48) / 2,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  serviceIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    textAlign: 'center',
  },
  serviceDescription: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },

  serviceDetailsContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
  },
  serviceDetailCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  serviceDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  serviceDetailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceDetailTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  serviceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
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

  aboutContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
  },
  aboutText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 24,
  },

  missionVisionContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
  },
  mvCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mvHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  mvTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
  },
  mvText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },

  leadershipContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
  },
  leaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  leaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  leaderContent: {
    flex: 1,
  },
  leaderRole: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  leaderName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
  },

  footer: {
    backgroundColor: '#ffffff',
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