import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator, Share, RefreshControl, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, query, where, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function WorkingMemberCertificate({ navigation }) {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [selectedCert, setSelectedCert] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    fetchData();
    setupRealtimeListener();
  }, []);

  const setupRealtimeListener = () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const q = query(
      collection(db, 'workingMemberCertificates'),
      where('memberId', '==', userId),
      where('status', '==', 'issued')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const certList = [];
      snapshot.forEach((doc) => {
        certList.push({ id: doc.id, ...doc.data() });
      });
      setCertificates(certList);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }

      const certSnap = await getDocs(query(
        collection(db, 'workingMemberCertificates'),
        where('memberId', '==', userId),
        where('status', '==', 'issued')
      ));
      
      const certList = [];
      certSnap.forEach((doc) => {
        certList.push({ id: doc.id, ...doc.data() });
      });
      setCertificates(certList);
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

  const handleShare = (cert) => {
    Alert.alert('Share', `Share ${cert.title || 'Certificate'}`);
  };

  const handleDownload = (cert) => {
    Alert.alert('Download', `Download ${cert.title || 'Certificate'}`);
  };

  const getCertificateIcon = (type) => {
    switch(type) {
      case 'training': return 'school';
      case 'performance': return 'star';
      case 'completion': return 'check-circle';
      case 'volunteer': return 'handshake';
      default: return 'verified';
    }
  };

  const getCertificateColor = (type) => {
    switch(type) {
      case 'training': return '#8b5cf6';
      case 'performance': return '#f59e0b';
      case 'completion': return '#10b981';
      case 'volunteer': return '#3b82f6';
      default: return '#6b7280';
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
        <View style={[styles.certIcon, { backgroundColor: getCertificateColor(cert.type) + '15' }]}>
          <MaterialIcons name={getCertificateIcon(cert.type)} size={24} color={getCertificateColor(cert.type)} />
        </View>
        <View style={styles.certInfo}>
          <Text style={styles.certTitle}>{cert.title || 'Certificate'}</Text>
          <Text style={styles.certDate}>{cert.issuedDate ? new Date(cert.issuedDate).toLocaleDateString() : 'N/A'}</Text>
        </View>
        <View style={[styles.certStatus, { backgroundColor: cert.status === 'issued' ? '#10b981' : '#f59e0b' }]}>
          <Text style={styles.certStatusText}>{cert.status || 'issued'}</Text>
        </View>
      </View>
      {cert.description && <Text style={styles.certDescription}>{cert.description}</Text>}
      {cert.hours && (
        <View style={styles.certHoursBadge}>
          <MaterialIcons name="schedule" size={12} color="#ffffff" />
          <Text style={styles.certHoursText}>{cert.hours} hours</Text>
        </View>
      )}
      <View style={styles.certActions}>
        <TouchableOpacity style={styles.certAction} onPress={() => handleShare(cert)}>
          <MaterialIcons name="share" size={18} color="#3b82f6" />
          <Text style={styles.certActionText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.certAction} onPress={() => handleDownload(cert)}>
          <MaterialIcons name="download" size={18} color="#3b82f6" />
          <Text style={styles.certActionText}>Download</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading Certificates...</Text>
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
          <Text style={styles.headerTitle}>My Certificates</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{certificates.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {certificates.filter(c => c.type === 'training').length}
          </Text>
          <Text style={styles.summaryLabel}>Training</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {certificates.filter(c => c.type === 'performance' || c.type === 'completion').length}
          </Text>
          <Text style={styles.summaryLabel}>Achievements</Text>
        </View>
      </View>

      {/* Certificate List */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
        contentContainerStyle={styles.listContent}
      >
        {certificates.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="verified" size={44} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No certificates yet</Text>
            <Text style={styles.emptyStateSubtext}>Complete tasks and training to earn certificates</Text>
            <TouchableOpacity 
              style={styles.tasksButton}
              onPress={() => navigation.navigate('WorkingMemberTasks')}
            >
              <MaterialIcons name="assignment" size={20} color="#ffffff" />
              <Text style={styles.tasksButtonText}>View My Tasks</Text>
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
                  <View style={[styles.detailIcon, { backgroundColor: getCertificateColor(selectedCert.type) + '15' }]}>
                    <MaterialIcons name={getCertificateIcon(selectedCert.type)} size={50} color={getCertificateColor(selectedCert.type)} />
                  </View>
                  <Text style={styles.detailTitle}>{selectedCert.title || 'Certificate'}</Text>
                  <Text style={styles.detailNumber}>{selectedCert.certificateNumber || 'N/A'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Issued To</Text>
                  <Text style={styles.detailValue}>{selectedCert.memberName || userData?.fullName || 'N/A'}</Text>
                </View>

                {selectedCert.hours && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Hours Completed</Text>
                    <Text style={styles.detailValue}>{selectedCert.hours} hours</Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>{selectedCert.type || 'General'}</Text>
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
                  <Text style={styles.detailLabel}>Valid Until</Text>
                  <Text style={styles.detailValue}>
                    {selectedCert.validUntil ? new Date(selectedCert.validUntil).toLocaleDateString() : 'Lifetime'}
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
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    width: '30%',
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
  certDescription: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    marginLeft: 56,
  },
  certHoursBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginLeft: 56,
    marginBottom: 8,
    gap: 4,
  },
  certHoursText: {
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
    color: '#3b82f6',
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
  tasksButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  tasksButtonText: {
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
    backgroundColor: '#3b82f6',
  },
  detailDownloadButton: {
    backgroundColor: '#10b981',
  },
  detailActionText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },
});