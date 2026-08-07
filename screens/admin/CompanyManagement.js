import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal, ActivityIndicator, RefreshControl, Image, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, addDoc, onSnapshot } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { Fonts } from '../../config/fonts';

export default function CompanyManagement({ navigation }) {
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [activeTab, setActiveTab] = useState('services');
  const [applications, setApplications] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [applicationModalVisible, setApplicationModalVisible] = useState(false);
  const [competitionModalVisible, setCompetitionModalVisible] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState(null);
  const [competitionDetailModalVisible, setCompetitionDetailModalVisible] = useState(false);
  const [createCompetitionModalVisible, setCreateCompetitionModalVisible] = useState(false);
  const [fundReleaseModalVisible, setFundReleaseModalVisible] = useState(false);
  const [selectedFundApplication, setSelectedFundApplication] = useState(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundRemarks, setFundRemarks] = useState('');
  const [verifyConfirmModalVisible, setVerifyConfirmModalVisible] = useState(false);
  const [selectedVerifyApplication, setSelectedVerifyApplication] = useState(null);
  const [fundConfirmModalVisible, setFundConfirmModalVisible] = useState(false);
  const [selectedFundConfirm, setSelectedFundConfirm] = useState(null);
  const [competitionForm, setCompetitionForm] = useState({
    title: '',
    description: '',
    category: '',
    startDate: '',
    endDate: '',
    prize: '',
    venue: '',
    maxParticipants: '',
    image: '',
    status: 'upcoming'
  });

  const [formData, setFormData] = useState({
    organizationName: 'Kabir Ban Bhandari Foundation (Trust)',
    cin: 'U85300BR2024NPL067466',
    address: 'Bihar, Kishanganj, Bongaon, Bihar (854101)',
    contactNo: '9470080435',
    email: 'kabirself@gmail.com',
    presidentName: 'Shri Bablu Bhandari',
    secretaryName: 'Shri Ajit Kumar Bhandari',
    tagline: '',
    description: '',
    about: '',
    mission: '',
    vision: '',
    website: '',
    logo: null,
    coverImage: null,
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: '',
    establishedYear: '2024',
    employeeCount: '',
    registrationNumber: 'U85300BR2024NPL067466',
    oldAgeAssistance: {
      below20: '25000',
      between20to40: '15000',
      between40to60: '10000',
      above60: '5000'
    },
    kanyaMarriageAssistance: {
      below4: '25000',
      between4to8: '15000',
      between8to12: '10000',
      above12: '5000'
    },
    selfEmploymentAssistance: 'Available for unemployed elderly people.'
  });

  useEffect(() => {
    fetchOrSeedCompanyData();
    setupApplicationsListener();
    setupCompetitionsListener();
  }, []);

  const setupApplicationsListener = () => {
    const q = query(collection(db, 'serviceApplications'), where('status', 'in', ['pending', 'verified', 'funded']));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = [];
      snapshot.forEach((doc) => {
        apps.push({ id: doc.id, ...doc.data() });
      });
      setApplications(apps);
    });
    return () => unsubscribe();
  };

  const setupCompetitionsListener = () => {
    const unsubscribe = onSnapshot(collection(db, 'competitions'), (snapshot) => {
      const comps = [];
      snapshot.forEach((doc) => {
        comps.push({ id: doc.id, ...doc.data() });
      });
      setCompetitions(comps);
    });
    return () => unsubscribe();
  };

  const fetchOrSeedCompanyData = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'company', 'profile');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCompanyData(data);
        setFormData({
          organizationName: data.organizationName || data.companyName || 'Kabir Ban Bhandari Foundation (Trust)',
          cin: data.cin || 'U85300BR2024NPL067466',
          address: data.address || 'Bihar, Kishanganj, Bongaon, Bihar (854101)',
          contactNo: data.contactNo || data.phone || '9470080435',
          email: data.email || 'kabirself@gmail.com',
          presidentName: data.presidentName || 'Shri Bablu Bhandari',
          secretaryName: data.secretaryName || 'Shri Ajit Kumar Bhandari',
          tagline: data.tagline || '',
          description: data.description || '',
          about: data.about || '',
          mission: data.mission || '',
          vision: data.vision || '',
          website: data.website || '',
          logo: data.logo || null,
          coverImage: data.coverImage || null,
          facebook: data.socialMedia?.facebook || '',
          instagram: data.socialMedia?.instagram || '',
          twitter: data.socialMedia?.twitter || '',
          linkedin: data.socialMedia?.linkedin || '',
          youtube: data.socialMedia?.youtube || '',
          establishedYear: data.establishedYear || '2024',
          employeeCount: data.employeeCount || '',
          registrationNumber: data.registrationNumber || 'U85300BR2024NPL067466',
          oldAgeAssistance: data.oldAgeAssistance || {
            below20: '25000',
            between20to40: '15000',
            between40to60: '10000',
            above60: '5000'
          },
          kanyaMarriageAssistance: data.kanyaMarriageAssistance || {
            below4: '25000',
            between4to8: '15000',
            between8to12: '10000',
            above12: '5000'
          },
          selfEmploymentAssistance: data.selfEmploymentAssistance || 'Available for unemployed elderly people.'
        });
      } else {
        setIsFirstRun(true);
        await seedDefaultData();
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
      Alert.alert('Error', 'Failed to load company data');
    } finally {
      setLoading(false);
    }
  };

  const seedDefaultData = async () => {
    try {
      const defaultData = {
        organizationName: 'Kabir Ban Bhandari Foundation (Trust)',
        cin: 'U85300BR2024NPL067466',
        address: 'Bihar, Kishanganj, Bongaon, Bihar (854101)',
        contactNo: '9470080435',
        email: 'kabirself@gmail.com',
        presidentName: 'Shri Bablu Bhandari',
        secretaryName: 'Shri Ajit Kumar Bhandari',
        tagline: 'Empowering Communities, Changing Lives',
        description: 'Kabir Ban Bhandari Foundation is a non-profit organization dedicated to empowering underprivileged communities through education, healthcare, and social welfare programs.',
        about: 'Kabir Ban Bhandari Foundation (Trust) was established with the vision of creating a better world for everyone.',
        mission: 'To empower communities and create sustainable change through education, healthcare, and social welfare programs.',
        vision: 'A world where every individual has access to quality education, healthcare, and opportunities.',
        website: 'https://www.kabirbanbhandari.org',
        establishedYear: '2024',
        employeeCount: '10-20',
        registrationNumber: 'U85300BR2024NPL067466',
        socialMedia: {
          facebook: 'https://facebook.com/kabirbanbhandari',
          instagram: 'https://instagram.com/kabirbanbhandari',
          twitter: 'https://twitter.com/kabirbanbhandari',
          linkedin: 'https://linkedin.com/company/kabirbanbhandari',
          youtube: 'https://youtube.com/kabirbanbhandari'
        },
        oldAgeAssistance: {
          below20: '25000',
          between20to40: '15000',
          between40to60: '10000',
          above60: '5000'
        },
        kanyaMarriageAssistance: {
          below4: '25000',
          between4to8: '15000',
          between8to12: '10000',
          above12: '5000'
        },
        selfEmploymentAssistance: 'Available for unemployed elderly people.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid || 'admin'
      };

      await setDoc(doc(db, 'company', 'profile'), defaultData);
      setCompanyData(defaultData);
      setFormData(defaultData);
    } catch (error) {
      console.error('Error seeding default data:', error);
      Alert.alert('Error', 'Failed to seed default data');
    }
  };

  const handleVerifyApplication = async () => {
    if (!selectedVerifyApplication) return;
    
    try {
      await updateDoc(doc(db, 'serviceApplications', selectedVerifyApplication.id), {
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        verifiedBy: auth.currentUser?.uid
      });
      setVerifyConfirmModalVisible(false);
      setSelectedVerifyApplication(null);
      Alert.alert('Success', 'Application verified successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleReleaseFund = async () => {
    if (!selectedFundConfirm) return;
    
    try {
      await updateDoc(doc(db, 'serviceApplications', selectedFundConfirm.id), {
        status: 'funded',
        fundAmount: parseFloat(fundAmount) || 0,
        fundRemarks: fundRemarks || 'Fund released',
        fundReleasedAt: new Date().toISOString(),
        fundReleasedBy: auth.currentUser?.uid
      });
      
      setFundConfirmModalVisible(false);
      setFundReleaseModalVisible(false);
      setSelectedFundConfirm(null);
      setFundAmount('');
      setFundRemarks('');
      Alert.alert('Success', 'Fund released successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCreateCompetition = async () => {
    if (!competitionForm.title) {
      Alert.alert('Error', 'Competition title is required');
      return;
    }

    try {
      await addDoc(collection(db, 'competitions'), {
        ...competitionForm,
        participants: [],
        winners: [],
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid,
        status: competitionForm.status || 'upcoming'
      });
      
      setCreateCompetitionModalVisible(false);
      setCompetitionForm({
        title: '',
        description: '',
        category: '',
        startDate: '',
        endDate: '',
        prize: '',
        venue: '',
        maxParticipants: '',
        image: '',
        status: 'upcoming'
      });
      Alert.alert('Success', 'Competition created successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCompetitionAction = async (competitionId, action, data = {}) => {
    try {
      const competitionRef = doc(db, 'competitions', competitionId);
      
      if (action === 'makeLive') {
        await updateDoc(competitionRef, { status: 'live' });
        Alert.alert('Success', 'Competition is now live!');
      } else if (action === 'end') {
        await updateDoc(competitionRef, { status: 'completed' });
        Alert.alert('Success', 'Competition ended successfully');
      } else if (action === 'sendPass') {
        await updateDoc(competitionRef, { 
          passSent: true,
          passSentAt: new Date().toISOString()
        });
        Alert.alert('Success', 'Pass/Ticket sent successfully to all participants');
      } else if (action === 'sendCertificate') {
        await updateDoc(competitionRef, { 
          certificateSent: true,
          certificateSentAt: new Date().toISOString()
        });
        Alert.alert('Success', 'Certificate sent successfully to all participants');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const openVerifyModal = (application) => {
    setSelectedVerifyApplication(application);
    setVerifyConfirmModalVisible(true);
  };

  const openFundReleaseModal = (application) => {
    setSelectedFundConfirm(application);
    setFundReleaseModalVisible(true);
  };

  const confirmFundRelease = () => {
    if (!fundAmount || parseFloat(fundAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    setFundConfirmModalVisible(true);
  };

  const getServiceTypeLabel = (type) => {
    switch(type) {
      case 'oldAge': return 'Old Age Assistance';
      case 'kanya': return 'Kanya Marriage Assistance';
      case 'selfEmployment': return 'Self Employment Assistance';
      default: return type;
    }
  };

  const ApplicationCard = ({ application }) => (
    <TouchableOpacity 
      style={styles.applicationCard}
      onPress={() => {
        setSelectedApplication(application);
        setApplicationModalVisible(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.applicationHeader}>
        <View style={styles.applicationUser}>
          <View style={styles.applicationAvatar}>
            <Text style={styles.applicationAvatarText}>
              {application.userName?.charAt(0) || 'U'}
            </Text>
          </View>
          <View>
            <Text style={styles.applicationUserName}>{application.userName || 'Unknown User'}</Text>
            <Text style={styles.applicationService}>{getServiceTypeLabel(application.serviceType)}</Text>
          </View>
        </View>
        <View style={[styles.applicationStatus, { backgroundColor: 
          application.status === 'pending' ? '#fef3c7' : 
          application.status === 'verified' ? '#dbeafe' : '#d1fae5'
        }]}>
          <Text style={[styles.applicationStatusText, { color:
            application.status === 'pending' ? '#d97706' : 
            application.status === 'verified' ? '#2563eb' : '#059669'
          }]}>
            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
          </Text>
        </View>
      </View>
      
      <View style={application.status === 'pending' ? styles.applicationActions : null}>
        {application.status === 'pending' && (
          <TouchableOpacity 
            style={[styles.applicationButton, styles.verifyButton]}
            onPress={() => openVerifyModal(application)}
          >
            <MaterialIcons name="check-circle" size={16} color="#ffffff" />
            <Text style={styles.applicationButtonText}>Verify</Text>
          </TouchableOpacity>
        )}

        {application.status === 'verified' && (
          <TouchableOpacity 
            style={[styles.applicationButton, styles.fundButton]}
            onPress={() => openFundReleaseModal(application)}
          >
            <MaterialIcons name="payments" size={16} color="#ffffff" />
            <Text style={styles.applicationButtonText}>Release Fund</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const CompetitionCard = ({ competition }) => (
    <TouchableOpacity 
      style={styles.competitionCard}
      onPress={() => {
        setSelectedCompetition(competition);
        setCompetitionDetailModalVisible(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.competitionHeader}>
        <Text style={styles.competitionTitle} numberOfLines={1}>{competition.title}</Text>
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
      
      <View style={styles.competitionDetails}>
        <View style={styles.competitionDetail}>
          <MaterialIcons name="people" size={16} color="#6b7280" />
          <Text style={styles.competitionDetailText}>
            {competition.participants?.length || 0} participants
          </Text>
        </View>
        <View style={styles.competitionDetail}>
          <MaterialIcons name="emoji-events" size={16} color="#6b7280" />
          <Text style={styles.competitionDetailText}>₹{competition.prize || '0'}</Text>
        </View>
      </View>
      
      {competition.winner && (
        <View style={styles.winnerBadge}>
          <MaterialIcons name="stars" size={14} color="#f59e0b" />
          <Text style={styles.winnerText}>Winner: {competition.winnerName}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

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
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Organization Dashboard</Text>
          <TouchableOpacity onPress={() => setEditing(!editing)}>
            <Text style={styles.editButton}>{editing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {['services', 'applications', 'competitions'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={
                tab === 'services' ? 'handshake' :
                tab === 'applications' ? 'people' : 'emoji-events'
              } 
              size={18} 
              color={activeTab === tab ? '#FF7722' : '#6b7280'} 
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchOrSeedCompanyData} colors={['#FF7722']} />
        }
      >
        {activeTab === 'services' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Services Offered</Text>
            <ServiceCard title="Old Age Assistance" icon="elderly">
              <ServiceRow label="Below 20 years" value={formData.oldAgeAssistance?.below20 || '0'} />
              <ServiceRow label="20 - 40 years" value={formData.oldAgeAssistance?.between20to40 || '0'} />
              <ServiceRow label="40 - 60 years" value={formData.oldAgeAssistance?.between40to60 || '0'} />
              <ServiceRow label="60 years & above" value={formData.oldAgeAssistance?.above60 || '0'} />
            </ServiceCard>
            <ServiceCard title="Kanya Marriage Assistance" icon="child-care">
              <ServiceRow label="Below 4 years" value={formData.kanyaMarriageAssistance?.below4 || '0'} />
              <ServiceRow label="4 - 8 years" value={formData.kanyaMarriageAssistance?.between4to8 || '0'} />
              <ServiceRow label="8 - 12 years" value={formData.kanyaMarriageAssistance?.between8to12 || '0'} />
              <ServiceRow label="12 years & above" value={formData.kanyaMarriageAssistance?.above12 || '0'} />
            </ServiceCard>
            <ServiceCard title="Self Employment Assistance" icon="work">
              <Text style={styles.serviceValue}>
                {formData.selfEmploymentAssistance || 'Available for unemployed elderly people.'}
              </Text>
            </ServiceCard>
          </View>
        )}

        {activeTab === 'applications' && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="people" size={20} color="#FF7722" />
              <Text style={styles.sectionTitle}>Service Applications</Text>
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
                  {applications.filter(a => a.status === 'pending').length} Pending
                </Text>
              </View>
            </View>
            
            {applications.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="inbox" size={40} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No applications yet</Text>
              </View>
            ) : (
              applications.map((app) => (
                <ApplicationCard key={app.id} application={app} />
              ))
            )}
          </View>
        )}

        {activeTab === 'competitions' && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="emoji-events" size={20} color="#FF7722" />
              <Text style={styles.sectionTitle}>Competitions</Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => setCreateCompetitionModalVisible(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="add" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            {competitions.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="emoji-events" size={40} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No competitions created</Text>
                <TouchableOpacity 
                  style={styles.createCompetitionButton}
                  onPress={() => setCreateCompetitionModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.createCompetitionButtonText}>Create Competition</Text>
                </TouchableOpacity>
              </View>
            ) : (
              competitions.map((comp) => (
                <CompetitionCard key={comp.id} competition={comp} />
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Application Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={applicationModalVisible}
        onRequestClose={() => setApplicationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            {selectedApplication && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Application Details</Text>
                  <TouchableOpacity onPress={() => setApplicationModalVisible(false)}>
                    <MaterialIcons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailStatusBar}>
                  <View style={[styles.detailStatusBadge, { backgroundColor: 
                    selectedApplication.status === 'pending' ? '#fef3c7' : 
                    selectedApplication.status === 'verified' ? '#dbeafe' : '#d1fae5'
                  }]}>
                    <Text style={[styles.detailStatusText, { color:
                      selectedApplication.status === 'pending' ? '#d97706' : 
                      selectedApplication.status === 'verified' ? '#2563eb' : '#059669'
                    }]}>
                      {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.detailDate}>
                    {new Date(selectedApplication.createdAt?.toDate?.() || selectedApplication.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Service Type</Text>
                  <Text style={styles.detailValue}>{getServiceTypeLabel(selectedApplication.serviceType)}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Applicant Name</Text>
                  <Text style={styles.detailValue}>{selectedApplication.userName || 'N/A'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{selectedApplication.userEmail || 'N/A'}</Text>
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

                {selectedApplication.status === 'pending' && (
                  <TouchableOpacity 
                    style={[styles.detailActionButton, styles.verifyButton]}
                    onPress={() => {
                      setApplicationModalVisible(false);
                      openVerifyModal(selectedApplication);
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="check-circle" size={16} color="#ffffff" />
                    <Text style={styles.detailActionText}>Verify Application</Text>
                  </TouchableOpacity>
                )}

                {selectedApplication.status === 'verified' && (
                  <TouchableOpacity 
                    style={[styles.detailActionButton, styles.fundButton]}
                    onPress={() => {
                      setApplicationModalVisible(false);
                      openFundReleaseModal(selectedApplication);
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="payments" size={16} color="#ffffff" />
                    <Text style={styles.detailActionText}>Release Fund</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Verify Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={verifyConfirmModalVisible}
        onRequestClose={() => setVerifyConfirmModalVisible(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalIcon}>
              <MaterialIcons name="check-circle" size={50} color="#FF7722" />
            </View>
            <Text style={styles.confirmModalTitle}>Verify Application</Text>
            <Text style={styles.confirmModalMessage}>
              Are you sure you want to verify this application?
              {selectedVerifyApplication && (
                <Text style={styles.confirmModalDetail}>
                  \n\nApplicant: {selectedVerifyApplication.userName || 'Unknown'}\n
                  Service: {getServiceTypeLabel(selectedVerifyApplication.serviceType)}\n
                  Amount: ₹{selectedVerifyApplication.amount || '0'}
                </Text>
              )}
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity 
                style={[styles.confirmModalButton, styles.confirmCancelButton]}
                onPress={() => setVerifyConfirmModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmModalButton, styles.confirmVerifyButton]}
                onPress={handleVerifyApplication}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmVerifyText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fund Release Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={fundReleaseModalVisible}
        onRequestClose={() => setFundReleaseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Release Fund</Text>
            
            <View style={styles.field}>
              <Text style={styles.label}>Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                value={fundAmount}
                onChangeText={setFundAmount}
                keyboardType="numeric"
                placeholder="Enter amount"
                textAlignVertical="center"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Remarks</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={fundRemarks}
                onChangeText={setFundRemarks}
                placeholder="Add remarks"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setFundReleaseModalVisible(false);
                  setFundAmount('');
                  setFundRemarks('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmFundRelease}
                disabled={!fundAmount}
                activeOpacity={0.7}
              >
                <Text style={styles.modalConfirmText}>Release Fund</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fund Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={fundConfirmModalVisible}
        onRequestClose={() => setFundConfirmModalVisible(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalIcon}>
              <MaterialIcons name="payments" size={50} color="#10b981" />
            </View>
            <Text style={styles.confirmModalTitle}>Confirm Fund Release</Text>
            <Text style={styles.confirmModalMessage}>
              Are you sure you want to release the fund?
              {selectedFundConfirm && (
                <Text style={styles.confirmModalDetail}>
                  \n\nApplicant: {selectedFundConfirm.userName || 'Unknown'}\n
                  Service: {getServiceTypeLabel(selectedFundConfirm.serviceType)}\n
                  Amount: ₹{fundAmount || selectedFundConfirm.amount || '0'}
                  {fundRemarks ? `\nRemarks: ${fundRemarks}` : ''}
                </Text>
              )}
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity 
                style={[styles.confirmModalButton, styles.confirmCancelButton]}
                onPress={() => {
                  setFundConfirmModalVisible(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmModalButton, styles.confirmFundButton]}
                onPress={handleReleaseFund}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmFundText}>Release Fund</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Competition Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createCompetitionModalVisible}
        onRequestClose={() => setCreateCompetitionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Create Competition</Text>
            
            <View style={styles.field}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={competitionForm.title}
                onChangeText={(text) => setCompetitionForm({...competitionForm, title: text})}
                placeholder="Enter competition title"
                textAlignVertical="center"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={competitionForm.description}
                onChangeText={(text) => setCompetitionForm({...competitionForm, description: text})}
                placeholder="Enter description"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.input}
                value={competitionForm.category}
                onChangeText={(text) => setCompetitionForm({...competitionForm, category: text})}
                placeholder="e.g., Essay, Quiz, Art"
                textAlignVertical="center"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Prize (₹)</Text>
              <TextInput
                style={styles.input}
                value={competitionForm.prize}
                onChangeText={(text) => setCompetitionForm({...competitionForm, prize: text})}
                placeholder="Enter prize amount"
                keyboardType="numeric"
                textAlignVertical="center"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Venue</Text>
              <TextInput
                style={styles.input}
                value={competitionForm.venue}
                onChangeText={(text) => setCompetitionForm({...competitionForm, venue: text})}
                placeholder="Enter venue"
                textAlignVertical="center"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Max Participants</Text>
              <TextInput
                style={styles.input}
                value={competitionForm.maxParticipants}
                onChangeText={(text) => setCompetitionForm({...competitionForm, maxParticipants: text})}
                placeholder="Enter max participants"
                keyboardType="numeric"
                textAlignVertical="center"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusPicker}>
                {['upcoming', 'live', 'completed'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statusOption, competitionForm.status === status && styles.statusOptionActive]}
                    onPress={() => setCompetitionForm({...competitionForm, status})}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.statusOptionText, competitionForm.status === status && styles.statusOptionTextActive]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setCreateCompetitionModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleCreateCompetition}
                activeOpacity={0.7}
              >
                <Text style={styles.modalConfirmText}>Create</Text>
              </TouchableOpacity>
            </View>
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
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            {selectedCompetition && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedCompetition.title}</Text>
                  <TouchableOpacity onPress={() => setCompetitionDetailModalVisible(false)}>
                    <MaterialIcons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.competitionDetailSection}>
                  <Text style={styles.competitionDetailLabel}>Status</Text>
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
                  <Text style={styles.competitionDetailValue}>{selectedCompetition.description || 'N/A'}</Text>
                </View>

                <View style={styles.competitionDetailSection}>
                  <Text style={styles.competitionDetailLabel}>Category</Text>
                  <Text style={styles.competitionDetailValue}>{selectedCompetition.category || 'N/A'}</Text>
                </View>

                <View style={styles.competitionDetailSection}>
                  <Text style={styles.competitionDetailLabel}>Prize</Text>
                  <Text style={styles.competitionDetailValue}>₹{selectedCompetition.prize || '0'}</Text>
                </View>

                <View style={styles.competitionDetailSection}>
                  <Text style={styles.competitionDetailLabel}>Venue</Text>
                  <Text style={styles.competitionDetailValue}>{selectedCompetition.venue || 'N/A'}</Text>
                </View>

                <View style={styles.competitionDetailSection}>
                  <Text style={styles.competitionDetailLabel}>Participants</Text>
                  <Text style={styles.competitionDetailValue}>
                    {selectedCompetition.participants?.length || 0} / {selectedCompetition.maxParticipants || '∞'}
                  </Text>
                </View>

                {selectedCompetition.winner && (
                  <View style={styles.competitionDetailSection}>
                    <Text style={styles.competitionDetailLabel}>Winner</Text>
                    <View style={styles.winnerBadge}>
                      <MaterialIcons name="stars" size={14} color="#f59e0b" />
                      <Text style={styles.winnerText}>{selectedCompetition.winnerName}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.competitionActions}>
                  {selectedCompetition.status === 'upcoming' && (
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.liveButton]}
                      onPress={() => handleCompetitionAction(selectedCompetition.id, 'makeLive')}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="play-arrow" size={20} color="#ffffff" />
                      <Text style={styles.actionButtonText}>Make Live</Text>
                    </TouchableOpacity>
                  )}

                  {selectedCompetition.status === 'live' && (
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.endButton]}
                      onPress={() => handleCompetitionAction(selectedCompetition.id, 'end')}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="stop" size={20} color="#ffffff" />
                      <Text style={styles.actionButtonText}>End Competition</Text>
                    </TouchableOpacity>
                  )}

                  {selectedCompetition.status === 'completed' && !selectedCompetition.passSent && (
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.passButton]}
                      onPress={() => handleCompetitionAction(selectedCompetition.id, 'sendPass')}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="confirmation-number" size={20} color="#ffffff" />
                      <Text style={styles.actionButtonText}>Send Pass/Ticket</Text>
                    </TouchableOpacity>
                  )}

                  {selectedCompetition.status === 'completed' && !selectedCompetition.certificateSent && (
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.certificateButton]}
                      onPress={() => handleCompetitionAction(selectedCompetition.id, 'sendCertificate')}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="verified" size={20} color="#ffffff" />
                      <Text style={styles.actionButtonText}>Send Certificate</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// Helper Components
const ServiceCard = ({ title, icon, children }) => (
  <View style={styles.serviceCard}>
    <View style={styles.serviceHeader}>
      <MaterialIcons name={icon} size={20} color="#FF7722" />
      <Text style={styles.serviceTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const ServiceRow = ({ label, value }) => (
  <View style={styles.serviceRow}>
    <Text style={styles.serviceLabel}>{label}</Text>
    <Text style={styles.serviceValue}>₹ {value}</Text>
  </View>
);

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
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  editButton: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
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
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#FFF5EB',
  },
  tabText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  tabTextActive: {
    color: '#FF7722',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 4,
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
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  badgeContainer: {
    backgroundColor: '#FFF5EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#FF7722',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  createButton: {
    backgroundColor: '#FF7722',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

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
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  serviceLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
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

  // Application Styles
  applicationCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  applicationUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  applicationAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF5EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  applicationAvatarText: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#FF7722',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  applicationUserName: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  applicationService: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  applicationStatus: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  applicationStatusText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  applicationDetails: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  applicationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  applicationDate: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#9ca3af',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  applicationAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
    color: '#10b981',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  applicationActions: {
    marginTop: 8,
  },
  applicationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  verifyButton: {
    backgroundColor: '#FF7722',
  },
  fundButton: {
    backgroundColor: '#10b981',
    marginTop: 4,
  },
  applicationButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#ffffff',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Competition Styles
  competitionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    marginBottom: 6,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  competitionDetails: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  competitionDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  competitionDetailText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
    gap: 4,
  },
  winnerText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#d97706',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Competition Detail Modal
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
  competitionActions: {
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  liveButton: {
    backgroundColor: '#FF7722',
  },
  endButton: {
    backgroundColor: '#ef4444',
  },
  passButton: {
    backgroundColor: '#8b5cf6',
  },
  certificateButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#ffffff',
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
    fontSize: 20,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f3f4f6',
  },
  modalCancelText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalConfirmButton: {
    backgroundColor: '#FF7722',
  },
  modalConfirmText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#ffffff',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  field: {
    marginBottom: 12,
  },
  label: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
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
    height: 80,
    textAlignVertical: 'top',
  },

  statusPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOptionActive: {
    backgroundColor: '#FF7722',
  },
  statusOptionText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statusOptionTextActive: {
    color: '#ffffff',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#9ca3af',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  createCompetitionButton: {
    backgroundColor: '#FF7722',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createCompetitionButtonText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
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
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
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
  detailActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  detailActionText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: '#ffffff',
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

  // Confirm Modal
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 380,
    alignItems: 'center',
  },
  confirmModalIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF5EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#1f2937',
    marginBottom: 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  confirmModalMessage: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    includeFontPadding: false,
  },
  confirmModalDetail: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 20,
    includeFontPadding: false,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelButton: {
    backgroundColor: '#f3f4f6',
  },
  confirmCancelText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  confirmVerifyButton: {
    backgroundColor: '#FF7722',
  },
  confirmVerifyText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#ffffff',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  confirmFundButton: {
    backgroundColor: '#10b981',
  },
  confirmFundText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#ffffff',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});