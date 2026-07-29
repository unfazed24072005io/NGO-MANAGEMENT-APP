// screens/donation/DonationCertificate.js

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator, Share, RefreshControl, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, query, where, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function DonationCertificate({ navigation }) {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [selectedCert, setSelectedCert] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    donationCerts: 0,
    achievementCerts: 0
  });

  useEffect(() => {
    fetchData();
    setupRealtimeListener();
  }, []);

  const setupRealtimeListener = () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const q = query(
      collection(db, 'donationCertificates'),
      where('donorId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const certList = [];
      snapshot.forEach((doc) => {
        certList.push({ id: doc.id, ...doc.data() });
      });
      setCertificates(certList);
      
      // Update stats
      const donationCerts = certList.filter(c => c.type === 'donation').length;
      const achievementCerts = certList.filter(c => c.type === 'achievement').length;
      setStats({
        total: certList.length,
        donationCerts: donationCerts,
        achievementCerts: achievementCerts
      });
      
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userDoc = await getDoc(doc(db, 'donors', userId));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }

      const certSnap = await getDocs(query(
        collection(db, 'donationCertificates'),
        where('donorId', '==', userId)
      ));
      
      const certList = [];
      certSnap.forEach((doc) => {
        certList.push({ id: doc.id, ...doc.data() });
      });
      setCertificates(certList);
      
      // Update stats
      const donationCerts = certList.filter(c => c.type === 'donation').length;
      const achievementCerts = certList.filter(c => c.type === 'achievement').length;
      setStats({
        total: certList.length,
        donationCerts: donationCerts,
        achievementCerts: achievementCerts
      });
    } catch (error) {
      console.error('Error fetching certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleShare = async (cert) => {
    try {
      await Share.share({
        message: `I received a ${cert.type} certificate for ${cert.purpose || 'donation'}! 🎉\n\nJoin me in making a difference! 🙏`,
        title: 'Donation Certificate',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share certificate');
    }
  };

  const handleDownload = (cert) => {
    Alert.alert('Coming Soon', 'Download feature will be available soon!');
  };

  const getCertificateIcon = (type) => {
    switch(type) {
      case 'donation': return 'favorite';
      case 'achievement': return 'emoji-events';
      case 'milestone': return 'stars';
      default: return 'verified';
    }
  };

  const getCertificateColor = (type) => {
    switch(type) {
      case 'donation': return '#10b981';
      case 'achievement': return '#8b5cf6';
      case 'milestone': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  const getCertificateBgColor = (type) => {
    switch(type) {
      case 'donation': return '#10b98115';
      case 'achievement': return '#8b5cf615';
      case 'milestone': return '#f59e0b15';
      default: return '#3b82f615';
    }
  };

  const getTypeLabel = (type) => {
    switch(type) {
      case 'donation': return 'Donation';
      case 'achievement': return 'Achievement';
      case 'milestone': return 'Milestone';
      default: return 'Certificate';
    }
  };

  const CertificateCard = ({ cert }) => (
    <TouchableOpacity 
      style={styles.certCard}
      onPress={() => {
        setSelectedCert(cert);
        setDetailModalVisible(true);
      }}
    >
      <View style={styles.certHeader}>
        <View style={[styles.certIcon, { backgroundColor: getCertificateBgColor(cert.type) }]}>
          <MaterialIcons name={getCertificateIcon(cert.type)} size={24} color={getCertificateColor(cert.type)} />
        </View>
        <View style={styles.certInfo}>
          <Text style={styles.certTitle}>{cert.title || `${getTypeLabel(cert.type)} Certificate`}</Text>
          <Text style={styles.certDate}>
            {cert.issuedDate ? new Date(cert.issuedDate).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
        <View style={[styles.certStatus, { backgroundColor: cert.status === 'issued' ? '#10b981' : '#f59e0b' }]}>
          <Text style={styles.certStatusText}>{cert.status || 'issued'}</Text>
        </View>
      </View>
      
      {cert.purpose && (
        <Text style={styles.certPurpose}>Purpose: {cert.purpose}</Text>
      )}
      
      {cert.amount && (
        <View style={styles.certAmountBadge}>
          <Text style={styles.certAmountText}>₹{cert.amount.toLocaleString()}</Text>
        </View>
      )}
      
      <View style={styles.certActions}>
        <TouchableOpacity style={styles.certAction} onPress={() => handleShare(cert)}>
          <MaterialIcons name="share" size={18} color="#10b981" />
          <Text style={styles.certActionText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.certAction} onPress={() => handleDownload(cert)}>
          <MaterialIcons name="download" size={18} color="#10b981" />
          <Text style={styles.certActionText}>Download</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading Certificates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Green Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Certificates</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats.total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats.donationCerts}</Text>
          <Text style={styles.summaryLabel}>Donations</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats.achievementCerts}</Text>
          <Text style={styles.summaryLabel}>Achievements</Text>
        </View>
      </View>

      {/* Certificate List */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} />
        }
        contentContainerStyle={styles.listContent}
      >
        {certificates.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="verified" size={44} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No certificates yet</Text>
            <Text style={styles.emptyStateSubtext}>Make a donation to earn your first certificate</Text>
            <TouchableOpacity 
              style={styles.donateButton}
              onPress={() => navigation.navigate('DonateScreen')}
            >
              <MaterialIcons name="favorite" size={20} color="#ffffff" />
              <Text style={styles.donateButtonText}>Make a Donation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          certificates.map((cert) => (
            <CertificateCard key={cert.id} cert={cert} />
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Certificate Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedCert && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailCertificate}>
                  <View style={[styles.detailIcon, { backgroundColor: getCertificateBgColor(selectedCert.type) }]}>
                    <MaterialIcons name={getCertificateIcon(selectedCert.type)} size={50} color={getCertificateColor(selectedCert.type)} />
                  </View>
                  <Text style={styles.detailTitle}>{selectedCert.title || 'Certificate'}</Text>
                  <Text style={styles.detailNumber}>{selectedCert.certificateNumber || 'N/A'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Issued To</Text>
                  <Text style={styles.detailValue}>{selectedCert.donorName || userData?.fullName || 'N/A'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>{getTypeLabel(selectedCert.type)}</Text>
                </View>

                {selectedCert.amount && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Amount</Text>
                    <Text style={styles.detailValue}>₹{selectedCert.amount.toLocaleString()}</Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Purpose</Text>
                  <Text style={styles.detailValue}>{selectedCert.purpose || 'General Donation'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{selectedCert.description || 'No description'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Issued Date</Text>
                  <Text style={styles.detailValue}>
                    {selectedCert.issuedDate ? new Date(selectedCert.issuedDate).toLocaleString() : 'N/A'}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.detailStatusBadge, { backgroundColor: selectedCert.status === 'issued' ? '#10b981' : '#f59e0b' }]}>
                    <Text style={styles.detailStatusText}>{selectedCert.status || 'issued'}</Text>
                  </View>
                </View>

                <View style={styles.detailActions}>
                  <TouchableOpacity style={[styles.detailActionButton, styles.detailShareButton]} onPress={() => handleShare(selectedCert)}>
                    <MaterialIcons name="share" size={20} color="#ffffff" />
                    <Text style={styles.detailActionText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.detailActionButton, styles.detailDownloadButton]} onPress={() => handleDownload(selectedCert)}>
                    <MaterialIcons name="download" size={20} color="#ffffff" />
                    <Text style={styles.detailActionText}>Download</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
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

  // Green Header
  headerCard: {
    backgroundColor: '#10b981',
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

  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryValue: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#1f2937',
  },
  summaryLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  certCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  certHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  certIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  certInfo: {
    flex: 1,
  },
  certTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: '#1f2937',
  },
  certDate: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  certStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  certStatusText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 10,
  },
  certPurpose: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
    marginLeft: 56,
  },
  certAmountBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginLeft: 56,
    marginBottom: 8,
  },
  certAmountText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 12,
  },
  certActions: {
    flexDirection: 'row',
    gap: 16,
    marginLeft: 56,
  },
  certAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  certActionText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#10b981',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyStateText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
  },
  emptyStateSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  donateButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },

  // Modal
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
    maxHeight: '85%',
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
  },
  detailCertificate: {
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: '#1f2937',
  },
  detailNumber: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  detailSection: {
    marginBottom: 12,
  },
  detailLabel: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#1f2937',
  },
  detailStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  detailStatusText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 12,
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  detailActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  detailShareButton: {
    backgroundColor: '#10b981',
  },
  detailDownloadButton: {
    backgroundColor: '#3b82f6',
  },
  detailActionText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },
});