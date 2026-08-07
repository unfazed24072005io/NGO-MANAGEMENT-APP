// screens/workingMember/WorkingMemberApplications.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  orderBy,
} from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function WorkingMemberApplications({ navigation }) {
  const [activeTab, setActiveTab] = useState('services');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [services, setServices] = useState([]);
  const [applications, setApplications] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [myCompetitions, setMyCompetitions] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [applyForm, setApplyForm] = useState({
    serviceType: '',
    fullName: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    occupation: '',
    annualIncome: '',
    idProof: '',
    details: '',
    amount: '',
    ageGroup: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [competitionDetailModalVisible, setCompetitionDetailModalVisible] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [fundStatus, setFundStatus] = useState(null);
  const [applicationDetailModalVisible, setApplicationDetailModalVisible] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [myApplicationsTab, setMyApplicationsTab] = useState(false);

  useEffect(() => {
    fetchServices();
    setupApplicationsListener();
    setupCompetitionsListener();
  }, []);

  const fetchServices = async () => {
    try {
      const docRef = doc(db, 'company', 'profile');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const servicesList = [];
        
        if (data.oldAgeAssistance) {
          servicesList.push({
            id: 'oldAge',
            title: 'Kabir Old Age Assistance Program',
            icon: 'elderly',
            description: 'Financial assistance for senior citizens',
            type: 'oldAge',
            details: [
              { label: 'Below 20 years', value: data.oldAgeAssistance.below20 || '0' },
              { label: '20 - 40 years', value: data.oldAgeAssistance.between20to40 || '0' },
              { label: '40 - 60 years', value: data.oldAgeAssistance.between40to60 || '0' },
              { label: '60 years & above', value: data.oldAgeAssistance.above60 || '0' },
            ]
          });
        }
        
        if (data.kanyaMarriageAssistance) {
          servicesList.push({
            id: 'kanya',
            title: 'Kanya (Girl Child) Marriage Assistance',
            icon: 'child-care',
            description: 'Support for girl child marriage',
            type: 'kanya',
            details: [
              { label: 'Below 4 years', value: data.kanyaMarriageAssistance.below4 || '0' },
              { label: '4 - 8 years', value: data.kanyaMarriageAssistance.between4to8 || '0' },
              { label: '8 - 12 years', value: data.kanyaMarriageAssistance.between8to12 || '0' },
              { label: '12 years & above', value: data.kanyaMarriageAssistance.above12 || '0' },
            ]
          });
        }
        
        if (data.selfEmploymentAssistance) {
          servicesList.push({
            id: 'selfEmployment',
            title: 'Self-Employment Assistance Scheme',
            icon: 'work',
            description: 'Support for unemployed elderly people',
            type: 'selfEmployment',
            details: [
              { label: 'Description', value: data.selfEmploymentAssistance || 'Available for unemployed elderly people.' }
            ]
          });
        }
        
        setServices(servicesList);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      Alert.alert('Error', 'Failed to load services');
    }
  };

  const setupApplicationsListener = () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const q = query(
      collection(db, 'serviceApplications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = [];
      snapshot.forEach((doc) => {
        apps.push({ id: doc.id, ...doc.data() });
      });
      setApplications(apps);
      setLoading(false);
    });
    return () => unsubscribe();
  };

  const setupCompetitionsListener = () => {
    const compUnsubscribe = onSnapshot(collection(db, 'competitions'), (snapshot) => {
      const comps = [];
      snapshot.forEach((doc) => {
        comps.push({ id: doc.id, ...doc.data() });
      });
      setCompetitions(comps);
      setLoading(false);
    });

    const userId = auth.currentUser?.uid;
    if (userId) {
      const regQuery = query(
        collection(db, 'competitionRegistrations'),
        where('userId', '==', userId)
      );
      const regUnsubscribe = onSnapshot(regQuery, (snapshot) => {
        const regs = [];
        snapshot.forEach((doc) => {
          regs.push(doc.data().competitionId);
        });
        setMyCompetitions(regs);
      });
      return () => {
        compUnsubscribe();
        regUnsubscribe();
      };
    }
    return () => compUnsubscribe();
  };

  const handleApply = async () => {
    if (!applyForm.serviceType || !applyForm.details || !applyForm.fullName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const existingApp = applications.find(
      app => app.serviceType === applyForm.serviceType && 
      (app.status === 'pending' || app.status === 'verified')
    );
    
    if (existingApp) {
      Alert.alert(
        'Application Exists',
        `You already have a ${existingApp.status} application for this service. You cannot apply again.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setSubmitting(true);
    try {
      const userId = auth.currentUser?.uid;
      const userEmail = auth.currentUser?.email;

      await addDoc(collection(db, 'serviceApplications'), {
        userId: userId,
        userEmail: userEmail || applyForm.email,
        serviceType: applyForm.serviceType,
        fullName: applyForm.fullName,
        age: applyForm.age || '',
        gender: applyForm.gender || '',
        phone: applyForm.phone || '',
        email: applyForm.email || userEmail || '',
        address: applyForm.address || '',
        occupation: applyForm.occupation || '',
        annualIncome: applyForm.annualIncome || '',
        idProof: applyForm.idProof || '',
        details: applyForm.details,
        amount: applyForm.amount || '0',
        ageGroup: applyForm.ageGroup || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      Alert.alert('Success', 'Your application has been submitted successfully');
      setApplyModalVisible(false);
      setApplyForm({
        serviceType: '',
        fullName: '',
        age: '',
        gender: '',
        phone: '',
        email: '',
        address: '',
        occupation: '',
        annualIncome: '',
        idProof: '',
        details: '',
        amount: '',
        ageGroup: '',
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterCompetition = async (competition) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    if (myCompetitions.includes(competition.id)) {
      Alert.alert('Already Registered', 'You have already registered for this competition');
      return;
    }

    if (competition.participants?.length >= competition.maxParticipants) {
      Alert.alert('Full', 'This competition has reached maximum participants');
      return;
    }

    setRegistering(true);
    try {
      const userName = auth.currentUser?.displayName || 'Working Member';
      
      await addDoc(collection(db, 'competitionRegistrations'), {
        competitionId: competition.id,
        userId: userId,
        userName: userName,
        userEmail: auth.currentUser?.email,
        registeredAt: new Date().toISOString(),
        status: 'registered',
      });

      const compRef = doc(db, 'competitions', competition.id);
      const participants = competition.participants || [];
      participants.push(userId);
      await updateDoc(compRef, { participants });

      Alert.alert('Success', 'Registered for competition successfully');
      setCompetitionDetailModalVisible(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setRegistering(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchServices();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return '#d97706';
      case 'verified': return '#2563eb';
      case 'funded': return '#059669';
      case 'rejected': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending': return 'hourglass-empty';
      case 'verified': return 'check-circle';
      case 'funded': return 'payments';
      case 'rejected': return 'cancel';
      default: return 'info';
    }
  };

  const ServiceCard = ({ service }) => {
    const hasApplied = applications.some(
      app => app.serviceType === service.type && 
      (app.status === 'pending' || app.status === 'verified' || app.status === 'funded')
    );
    const latestApp = applications.find(app => app.serviceType === service.type);
    const status = latestApp?.status || '';

    return (
      <View style={styles.serviceCard}>
        <View style={styles.serviceCardHeader}>
          <View style={styles.serviceIconContainer}>
            <MaterialIcons name={service.icon} size={26} color="#8b5cf6" />
          </View>
          <View style={styles.serviceCardContent}>
            <Text style={styles.serviceCardTitle}>{service.title}</Text>
            <Text style={styles.serviceCardDesc}>{service.description}</Text>
          </View>
        </View>

        {service.details && (
          <View style={styles.serviceDetails}>
            {service.details.map((detail, index) => (
              <View key={index} style={styles.serviceDetailRow}>
                <Text style={styles.serviceDetailLabel}>{detail.label}</Text>
                <Text style={styles.serviceDetailValue}>₹ {detail.value}</Text>
              </View>
            ))}
          </View>
        )}

        {hasApplied ? (
          <View style={styles.applicationStatusContainer}>
            <View style={[styles.applicationStatusBadge, { backgroundColor: getStatusColor(status) + '15' }]}>
              <MaterialIcons name={getStatusIcon(status)} size={14} color={getStatusColor(status)} />
              <Text style={[styles.applicationStatusText, { color: getStatusColor(status) }]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.viewAppButton}
              onPress={() => {
                setSelectedApplication(latestApp);
                setApplicationDetailModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAppText}>View Details</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.applyButton}
            onPress={() => {
              setSelectedService(service);
              const user = auth.currentUser;
              setApplyForm({
                serviceType: service.type,
                fullName: user?.displayName || '',
                age: '',
                gender: '',
                phone: '',
                email: user?.email || '',
                address: '',
                occupation: '',
                annualIncome: '',
                idProof: '',
                details: '',
                amount: '',
                ageGroup: '',
              });
              setApplyModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="send" size={16} color="#ffffff" />
            <Text style={styles.applyButtonText}>Apply Now</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const ApplicationItem = ({ application }) => (
    <TouchableOpacity 
      style={styles.applicationItem}
      onPress={() => {
        setSelectedApplication(application);
        setApplicationDetailModalVisible(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.applicationItemLeft}>
        <View style={[styles.applicationItemIcon, { backgroundColor: getStatusColor(application.status) + '15' }]}>
          <MaterialIcons name={getStatusIcon(application.status)} size={18} color={getStatusColor(application.status)} />
        </View>
        <View>
          <Text style={styles.applicationItemTitle}>
            {application.serviceType === 'oldAge' ? 'Old Age Assistance' :
             application.serviceType === 'kanya' ? 'Kanya Marriage Assistance' :
             'Self Employment Assistance'}
          </Text>
          <Text style={styles.applicationItemSubtitle}>
            Applied on {new Date(application.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <View style={[styles.applicationItemStatus, { backgroundColor: getStatusColor(application.status) + '15' }]}>
        <Text style={[styles.applicationItemStatusText, { color: getStatusColor(application.status) }]}>
          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const CompetitionCard = ({ competition }) => {
    const isRegistered = myCompetitions.includes(competition.id);
    const isFull = competition.participants?.length >= competition.maxParticipants;

    return (
      <TouchableOpacity 
        style={styles.competitionCard}
        onPress={() => {
          setSelectedCompetition(competition);
          setCompetitionDetailModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.competitionHeader}>
          <Text style={styles.competitionTitle} numberOfLines={1}>
            {competition.title}
          </Text>
          <View style={[styles.competitionStatus, { backgroundColor:
            competition.status === 'upcoming' ? '#fef3c7' :
            competition.status === 'live' ? '#dbeafe' : '#d1fae5'
          }]}>
            <Text style={[styles.competitionStatusText, { color:
              competition.status === 'upcoming' ? '#d97706' :
              competition.status === 'live' ? '#2563eb' : '#059669'
            }]}>
              {competition.status?.toUpperCase() || 'UPCOMING'}
            </Text>
          </View>
        </View>

        <Text style={styles.competitionDescription} numberOfLines={2}>
          {competition.description || 'No description'}
        </Text>

        <View style={styles.competitionMeta}>
          <View style={styles.competitionMetaItem}>
            <MaterialIcons name="emoji-events" size={14} color="#6b7280" />
            <Text style={styles.competitionMetaText}>₹{competition.prize || '0'}</Text>
          </View>
          <View style={styles.competitionMetaItem}>
            <MaterialIcons name="people" size={14} color="#6b7280" />
            <Text style={styles.competitionMetaText}>
              {competition.participants?.length || 0}/{competition.maxParticipants || '∞'}
            </Text>
          </View>
          {competition.winner && (
            <View style={styles.competitionMetaItem}>
              <MaterialIcons name="stars" size={14} color="#f59e0b" />
              <Text style={[styles.competitionMetaText, { color: '#f59e0b' }]}>
                Winner Declared
              </Text>
            </View>
          )}
        </View>

        {isRegistered && (
          <View style={styles.registeredBadge}>
            <MaterialIcons name="check-circle" size={14} color="#10b981" />
            <Text style={styles.registeredBadgeText}>Registered</Text>
          </View>
        )}

        {isFull && !isRegistered && (
          <View style={styles.fullBadge}>
            <MaterialIcons name="block" size={14} color="#ef4444" />
            <Text style={styles.fullBadgeText}>Full</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Purple Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Applications</Text>
          <TouchableOpacity onPress={() => setMyApplicationsTab(!myApplicationsTab)} activeOpacity={0.7}>
            <Text style={styles.toggleButton}>
              {myApplicationsTab ? 'Apply' : 'My Apps'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {myApplicationsTab ? (
        // My Applications Tab
        <View style={styles.myAppsContainer}>
          <View style={styles.myAppsHeader}>
            <Text style={styles.myAppsTitle}>My Applications</Text>
            <Text style={styles.myAppsCount}>{applications.length} applications</Text>
          </View>
          
          {applications.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="inbox" size={50} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No applications yet</Text>
              <Text style={styles.emptyStateSubtext}>Apply for services to see them here</Text>
              <TouchableOpacity 
                style={styles.emptyApplyButton}
                onPress={() => setMyApplicationsTab(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.emptyApplyButtonText}>Browse Services</Text>
              </TouchableOpacity>
            </View>
          ) : (
            applications.map((app) => (
              <ApplicationItem key={app.id} application={app} />
            ))
          )}
        </View>
      ) : (
        // Main Tabs
        <>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'services' && styles.tabButtonActive]}
              onPress={() => setActiveTab('services')}
              activeOpacity={0.7}
            >
              <MaterialIcons 
                name="handshake" 
                size={18} 
                color={activeTab === 'services' ? '#8b5cf6' : '#6b7280'} 
              />
              <Text style={[styles.tabText, activeTab === 'services' && styles.tabTextActive]}>
                Services
              </Text>
              {applications.filter(a => a.status === 'pending').length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {applications.filter(a => a.status === 'pending').length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'competitions' && styles.tabButtonActive]}
              onPress={() => setActiveTab('competitions')}
              activeOpacity={0.7}
            >
              <MaterialIcons 
                name="emoji-events" 
                size={18} 
                color={activeTab === 'competitions' ? '#8b5cf6' : '#6b7280'} 
              />
              <Text style={[styles.tabText, activeTab === 'competitions' && styles.tabTextActive]}>
                Competitions
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8b5cf6']} />
            }
          >
            {activeTab === 'services' ? (
              <View style={styles.servicesContainer}>
                {services.map((service, index) => (
                  <ServiceCard key={index} service={service} />
                ))}
              </View>
            ) : (
              <View style={styles.competitionsContainer}>
                {competitions.length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialIcons name="emoji-events" size={50} color="#d1d5db" />
                    <Text style={styles.emptyStateText}>No Competitions</Text>
                    <Text style={styles.emptyStateSubtext}>Check back later for upcoming competitions</Text>
                  </View>
                ) : (
                  competitions.map((competition) => (
                    <CompetitionCard key={competition.id} competition={competition} />
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* Apply Modal - With More Details */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={applyModalVisible}
        onRequestClose={() => setApplyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply for Service</Text>
              <TouchableOpacity onPress={() => setApplyModalVisible(false)} activeOpacity={0.7}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Service Type</Text>
              <View style={styles.serviceTypeDisplay}>
                <Text style={styles.serviceTypeText}>
                  {selectedService?.title || 'Select a service'}
                </Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={applyForm.fullName}
                onChangeText={(text) => setApplyForm({...applyForm, fullName: text})}
                placeholder="Enter your full name"
                placeholderTextColor="#9ca3af"
                textAlignVertical="center"
              />
            </View>

            <View style={styles.rowFields}>
              <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Age</Text>
                <TextInput
                  style={styles.input}
                  value={applyForm.age}
                  onChangeText={(text) => setApplyForm({...applyForm, age: text})}
                  placeholder="Age"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  textAlignVertical="center"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Gender</Text>
                <TextInput
                  style={styles.input}
                  value={applyForm.gender}
                  onChangeText={(text) => setApplyForm({...applyForm, gender: text})}
                  placeholder="Male/Female"
                  placeholderTextColor="#9ca3af"
                  textAlignVertical="center"
                />
              </View>
            </View>

            <View style={styles.rowFields}>
              <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={applyForm.phone}
                  onChangeText={(text) => setApplyForm({...applyForm, phone: text})}
                  placeholder="Phone number"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  textAlignVertical="center"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={applyForm.email}
                  onChangeText={(text) => setApplyForm({...applyForm, email: text})}
                  placeholder="Email"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  textAlignVertical="center"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={applyForm.address}
                onChangeText={(text) => setApplyForm({...applyForm, address: text})}
                placeholder="Enter your address"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.rowFields}>
              <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Occupation</Text>
                <TextInput
                  style={styles.input}
                  value={applyForm.occupation}
                  onChangeText={(text) => setApplyForm({...applyForm, occupation: text})}
                  placeholder="Occupation"
                  placeholderTextColor="#9ca3af"
                  textAlignVertical="center"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Annual Income</Text>
                <TextInput
                  style={styles.input}
                  value={applyForm.annualIncome}
                  onChangeText={(text) => setApplyForm({...applyForm, annualIncome: text})}
                  placeholder="Annual income"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  textAlignVertical="center"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>ID Proof Details</Text>
              <TextInput
                style={styles.input}
                value={applyForm.idProof}
                onChangeText={(text) => setApplyForm({...applyForm, idProof: text})}
                placeholder="Aadhar/PAN/Voter ID etc."
                placeholderTextColor="#9ca3af"
                textAlignVertical="center"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Age Group (if applicable)</Text>
              <TextInput
                style={styles.input}
                value={applyForm.ageGroup}
                onChangeText={(text) => setApplyForm({...applyForm, ageGroup: text})}
                placeholder="e.g., 20-40 years"
                placeholderTextColor="#9ca3af"
                textAlignVertical="center"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Details / Reason *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={applyForm.details}
                onChangeText={(text) => setApplyForm({...applyForm, details: text})}
                placeholder="Please provide detailed reason for application"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Expected Amount (₹)</Text>
              <TextInput
                style={styles.input}
                value={applyForm.amount}
                onChangeText={(text) => setApplyForm({...applyForm, amount: text})}
                placeholder="Enter expected amount"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                textAlignVertical="center"
              />
            </View>

            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleApply}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Submitting...' : 'Submit Application'}
              </Text>
              {!submitting && (
                <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Application Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={applicationDetailModalVisible}
        onRequestClose={() => setApplicationDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedApplication && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Application Details</Text>
                  <TouchableOpacity onPress={() => setApplicationDetailModalVisible(false)} activeOpacity={0.7}>
                    <MaterialIcons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailStatusBar}>
                  <View style={[styles.detailStatusBadge, { backgroundColor: getStatusColor(selectedApplication.status) + '15' }]}>
                    <MaterialIcons name={getStatusIcon(selectedApplication.status)} size={18} color={getStatusColor(selectedApplication.status)} />
                    <Text style={[styles.detailStatusText, { color: getStatusColor(selectedApplication.status) }]}>
                      {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.detailDate}>
                    {new Date(selectedApplication.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Service</Text>
                  <Text style={styles.detailValue}>
                    {selectedApplication.serviceType === 'oldAge' ? 'Old Age Assistance' :
                     selectedApplication.serviceType === 'kanya' ? 'Kanya Marriage Assistance' :
                     'Self Employment Assistance'}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Full Name</Text>
                  <Text style={styles.detailValue}>{selectedApplication.fullName || 'N/A'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={[styles.detailSection, { flex: 1 }]}>
                    <Text style={styles.detailLabel}>Age</Text>
                    <Text style={styles.detailValue}>{selectedApplication.age || 'N/A'}</Text>
                  </View>
                  <View style={[styles.detailSection, { flex: 1 }]}>
                    <Text style={styles.detailLabel}>Gender</Text>
                    <Text style={styles.detailValue}>{selectedApplication.gender || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={[styles.detailSection, { flex: 1 }]}>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>{selectedApplication.phone || 'N/A'}</Text>
                  </View>
                  <View style={[styles.detailSection, { flex: 1 }]}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{selectedApplication.email || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Address</Text>
                  <Text style={styles.detailValue}>{selectedApplication.address || 'N/A'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={[styles.detailSection, { flex: 1 }]}>
                    <Text style={styles.detailLabel}>Occupation</Text>
                    <Text style={styles.detailValue}>{selectedApplication.occupation || 'N/A'}</Text>
                  </View>
                  <View style={[styles.detailSection, { flex: 1 }]}>
                    <Text style={styles.detailLabel}>Annual Income</Text>
                    <Text style={styles.detailValue}>₹{selectedApplication.annualIncome || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>ID Proof</Text>
                  <Text style={styles.detailValue}>{selectedApplication.idProof || 'N/A'}</Text>
                </View>

                {selectedApplication.ageGroup && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Age Group</Text>
                    <Text style={styles.detailValue}>{selectedApplication.ageGroup}</Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Details / Reason</Text>
                  <Text style={styles.detailValue}>{selectedApplication.details || 'N/A'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Expected Amount</Text>
                  <Text style={[styles.detailValue, { color: '#10b981', fontFamily: Fonts.Bold }]}>
                    ₹{selectedApplication.amount || '0'}
                  </Text>
                </View>

                {selectedApplication.status === 'funded' && (
                  <View style={styles.fundDetailCard}>
                    <Text style={styles.fundDetailTitle}>Fund Details</Text>
                    <View style={styles.fundDetailRow}>
                      <Text style={styles.fundDetailLabel}>Amount Released</Text>
                      <Text style={styles.fundDetailValue}>₹{selectedApplication.fundAmount || selectedApplication.amount || '0'}</Text>
                    </View>
                    {selectedApplication.fundRemarks && (
                      <View style={styles.fundDetailRow}>
                        <Text style={styles.fundDetailLabel}>Remarks</Text>
                        <Text style={styles.fundDetailValue}>{selectedApplication.fundRemarks}</Text>
                      </View>
                    )}
                    <View style={styles.fundDetailRow}>
                      <Text style={styles.fundDetailLabel}>Released Date</Text>
                      <Text style={styles.fundDetailValue}>
                        {selectedApplication.fundReleasedAt ? new Date(selectedApplication.fundReleasedAt).toLocaleDateString() : 'N/A'}
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Competition Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={competitionDetailModalVisible}
        onRequestClose={() => setCompetitionDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedCompetition && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Competition Details</Text>
                  <TouchableOpacity onPress={() => setCompetitionDetailModalVisible(false)} activeOpacity={0.7}>
                    <MaterialIcons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.competitionDetailTitle}>{selectedCompetition.title}</Text>
                
                <View style={styles.competitionDetailStatus}>
                  <View style={[styles.competitionStatus, { backgroundColor:
                    selectedCompetition.status === 'upcoming' ? '#fef3c7' :
                    selectedCompetition.status === 'live' ? '#dbeafe' : '#d1fae5',
                    alignSelf: 'flex-start'
                  }]}>
                    <Text style={[styles.competitionStatusText, { color:
                      selectedCompetition.status === 'upcoming' ? '#d97706' :
                      selectedCompetition.status === 'live' ? '#2563eb' : '#059669'
                    }]}>
                      {selectedCompetition.status?.toUpperCase() || 'UPCOMING'}
                    </Text>
                  </View>
                </View>

                <View style={styles.competitionDetailSection}>
                  <Text style={styles.competitionDetailLabel}>Description</Text>
                  <Text style={styles.competitionDetailValue}>
                    {selectedCompetition.description || 'No description'}
                  </Text>
                </View>

                <View style={styles.competitionDetailRow}>
                  <View style={styles.competitionDetailItem}>
                    <Text style={styles.competitionDetailLabel}>Category</Text>
                    <Text style={styles.competitionDetailValue}>
                      {selectedCompetition.category || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.competitionDetailItem}>
                    <Text style={styles.competitionDetailLabel}>Prize</Text>
                    <Text style={[styles.competitionDetailValue, { color: '#10b981', fontFamily: Fonts.Bold }]}>
                      ₹{selectedCompetition.prize || '0'}
                    </Text>
                  </View>
                </View>

                <View style={styles.competitionDetailRow}>
                  <View style={styles.competitionDetailItem}>
                    <Text style={styles.competitionDetailLabel}>Venue</Text>
                    <Text style={styles.competitionDetailValue}>
                      {selectedCompetition.venue || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.competitionDetailItem}>
                    <Text style={styles.competitionDetailLabel}>Participants</Text>
                    <Text style={styles.competitionDetailValue}>
                      {selectedCompetition.participants?.length || 0}/{selectedCompetition.maxParticipants || '∞'}
                    </Text>
                  </View>
                </View>

                {selectedCompetition.winner && (
                  <View style={styles.winnerSection}>
                    <View style={styles.winnerBadge}>
                      <MaterialIcons name="stars" size={20} color="#f59e0b" />
                      <Text style={styles.winnerText}>Winner: {selectedCompetition.winnerName}</Text>
                    </View>
                  </View>
                )}

                {selectedCompetition.passSent && (
                  <View style={styles.notificationBadge}>
                    <MaterialIcons name="confirmation-number" size={16} color="#8b5cf6" />
                    <Text style={styles.notificationText}>Pass/Ticket Sent</Text>
                  </View>
                )}

                {selectedCompetition.certificateSent && (
                  <View style={styles.notificationBadge}>
                    <MaterialIcons name="verified" size={16} color="#10b981" />
                    <Text style={styles.notificationText}>Certificate Sent</Text>
                  </View>
                )}

                {selectedCompetition.status !== 'completed' && (
                  <TouchableOpacity 
                    style={[
                      styles.registerCompetitionButton,
                      (myCompetitions.includes(selectedCompetition.id) || 
                       selectedCompetition.participants?.length >= selectedCompetition.maxParticipants) && 
                      styles.registerDisabled
                    ]}
                    onPress={() => handleRegisterCompetition(selectedCompetition)}
                    disabled={
                      registering || 
                      myCompetitions.includes(selectedCompetition.id) || 
                      selectedCompetition.participants?.length >= selectedCompetition.maxParticipants
                    }
                    activeOpacity={0.7}
                  >
                    <MaterialIcons 
                      name={
                        myCompetitions.includes(selectedCompetition.id) ? 'check-circle' :
                        selectedCompetition.participants?.length >= selectedCompetition.maxParticipants ? 'block' : 'event'
                      } 
                      size={20} 
                      color="#ffffff" 
                    />
                    <Text style={styles.registerCompetitionText}>
                      {registering ? 'Registering...' :
                       myCompetitions.includes(selectedCompetition.id) ? 'Registered' :
                       selectedCompetition.participants?.length >= selectedCompetition.maxParticipants ? 'Full' : 'Register Now'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  headerCard: {
    backgroundColor: '#8b5cf6',
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
  toggleButton: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#ffffff',
    padding: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    borderRadius: 8,
    position: 'relative',
  },
  tabButtonActive: {
    backgroundColor: '#f5f3ff',
  },
  tabText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  tabTextActive: {
    color: '#8b5cf6',
  },
  tabBadge: {
    position: 'absolute',
    top: 4,
    right: '30%',
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 9,
    color: '#ffffff',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 4,
  },

  servicesContainer: {
    paddingVertical: 8,
  },

  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  serviceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceCardContent: {
    flex: 1,
  },
  serviceCardTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  serviceCardDesc: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  serviceDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  serviceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  serviceDetailLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  serviceDetailValue: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  applicationStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  applicationStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  applicationStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  viewAppButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  viewAppText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#8b5cf6',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  applyButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#ffffff',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // My Applications
  myAppsContainer: {
    flex: 1,
    padding: 16,
  },
  myAppsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  myAppsTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  myAppsCount: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  applicationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  applicationItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  applicationItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applicationItemTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  applicationItemSubtitle: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  applicationItemStatus: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  applicationItemStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Competition Styles
  competitionsContainer: {
    paddingVertical: 8,
  },

  competitionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  competitionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  competitionTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#1f2937',
    flex: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  competitionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  competitionStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  competitionDescription: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  competitionMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  competitionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  competitionMetaText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  registeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    gap: 4,
    alignSelf: 'flex-start',
  },
  registeredBadgeText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#059669',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  fullBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    gap: 4,
    alignSelf: 'flex-start',
  },
  fullBadgeText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#ef4444',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  field: {
    marginBottom: 14,
  },
  rowFields: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  label: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
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
    includeFontPadding: false,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  serviceTypeDisplay: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f9fafb',
  },
  serviceTypeText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  submitButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#ffffff',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Application Detail Modal
  detailStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  detailStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  detailDate: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  detailSection: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  detailValue: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  fundDetailCard: {
    backgroundColor: '#d1fae5',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
  },
  fundDetailTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
    color: '#059669',
    marginBottom: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  fundDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  fundDetailLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#047857',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  fundDetailValue: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#047857',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Competition Detail Modal
  competitionDetailTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
    marginBottom: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  competitionDetailStatus: {
    marginBottom: 12,
  },
  competitionDetailSection: {
    marginBottom: 12,
  },
  competitionDetailLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  competitionDetailValue: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  competitionDetailRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  competitionDetailItem: {
    flex: 1,
  },

  winnerSection: {
    marginVertical: 10,
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  winnerText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#d97706',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  notificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginVertical: 4,
    gap: 6,
  },
  notificationText: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  registerCompetitionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 16,
  },
  registerDisabled: {
    backgroundColor: '#9ca3af',
  },
  registerCompetitionText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#ffffff',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 18,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  emptyStateSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  emptyApplyButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyApplyButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#ffffff',
    includeFontPadding: false,
    textAlignVertical: 'center',
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
});