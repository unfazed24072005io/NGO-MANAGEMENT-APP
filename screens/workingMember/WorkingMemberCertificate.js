import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, 
  Alert, ActivityIndicator, Share, RefreshControl, Modal, Platform, Dimensions 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, query, where, doc, getDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute } from '@react-navigation/native';
import { getDonationHistory } from '../../services/paymentService';

const { width } = Dimensions.get('window');

export default function WorkingMemberCertificate({ navigation }) {
  const route = useRoute();
  const [certificates, setCertificates] = useState([]);
  const [donationCertificates, setDonationCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showCertificateView, setShowCertificateView] = useState(false);
  const [currentCert, setCurrentCert] = useState(null);
  const scrollViewRef = useRef();

  useEffect(() => {
    fetchData();
    setupRealtimeListener();
    fetchDonationCertificates();
  }, []);

  // Auto-open certificate if passed from profile
  useEffect(() => {
    if (route.params?.certificate) {
      // Check in certificates first, then donation certificates
      let cert = certificates.find(c => c.id === route.params.certificate.id);
      if (!cert) {
        cert = donationCertificates.find(c => c.id === route.params.certificate.id);
      }
      if (cert) {
        setCurrentCert(cert);
        setShowCertificateView(true);
      }
    }
  }, [route.params?.certificate, certificates, donationCertificates]);

  const setupRealtimeListener = () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const q = query(
  collection(db, 'certificates'),  // <-- Changed from 'workingMemberCertificates' to 'certificates'
  where('memberId', '==', userId),
  where('status', '==', 'issued'),
  orderBy('issuedDate', 'desc')
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

  const fetchDonationCertificates = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const donations = getDonationHistory();
      const userDonations = donations.filter(d => 
        d.memberId === userId || d.userId === userId
      );

      const donationCerts = userDonations.map((donation, index) => ({
        id: `donation_${index}`,
        title: `Donation Certificate - ₹${donation.amount}`,
        type: 'donation',
        description: `Donation of ₹${donation.amount} for ${donation.purpose || 'General'}`,
        issuedDate: donation.timestamp || donation.createdAt || new Date().toISOString(),
        status: 'issued',
        amount: donation.amount,
        purpose: donation.purpose || 'General',
        paymentId: donation.paymentId,
        donorName: donation.name || donation.donorName || 'Anonymous',
        certificateNumber: `DON-${(donation.paymentId || '').slice(-8) || index.toString().padStart(4, '0')}`
      }));

      setDonationCertificates(donationCerts);
    } catch (error) {
      console.error('Error fetching donation certificates:', error);
    }
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
  collection(db, 'certificates'),  // <-- Changed from 'workingMemberCertificates' to 'certificates'
  where('memberId', '==', userId),
  where('status', '==', 'issued'),
  orderBy('issuedDate', 'desc')
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
    await fetchDonationCertificates();
    setRefreshing(false);
  };

  const getCertificateColor = (type) => {
    switch(type) {
      case 'training': return '#8b5cf6';
      case 'performance': return '#f59e0b';
      case 'completion': return '#10b981';
      case 'volunteer': return '#3b82f6';
      case 'donation': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getCertificateBg = (type) => {
    switch(type) {
      case 'training': return '#ede9fe';
      case 'performance': return '#fef3c7';
      case 'completion': return '#d1fae5';
      case 'volunteer': return '#dbeafe';
      case 'donation': return '#fee2e2';
      default: return '#f3f4f6';
    }
  };

  const getTypeLabel = (type) => {
    switch(type) {
      case 'training': return 'Training';
      case 'performance': return 'Performance';
      case 'completion': return 'Completion';
      case 'volunteer': return 'Volunteer';
      case 'donation': return 'Donation';
      default: return 'Certificate';
    }
  };

  const getCertificateIcon = (type) => {
    switch(type) {
      case 'training': return 'school';
      case 'performance': return 'star';
      case 'completion': return 'check-circle';
      case 'volunteer': return 'handshake';
      case 'donation': return 'favorite';
      default: return 'verified';
    }
  };

  // Professional Certificate View Component
  const ProfessionalCertificateView = ({ cert }) => {
    const color = getCertificateColor(cert.type);
    const bgColor = getCertificateBg(cert.type);
    const typeLabel = getTypeLabel(cert.type);
    const donorName = cert.donorName || cert.memberName || userData?.fullName || 'Working Member';
    const amount = cert.amount || 0;
    const purpose = cert.purpose || cert.type || 'General';
    const date = cert.issuedDate ? new Date(cert.issuedDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }) : new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    const certNumber = cert.certificateNumber || `CERT-${Date.now().toString().slice(-8)}`;
    const hours = cert.hours || 0;

    return (
      <View style={styles.certificateViewContainer}>
        <LinearGradient
          colors={['#f5f0eb', '#ffffff', '#f5f0eb']}
          style={styles.certificateViewWrapper}
        >
          {/* Decorative Border */}
          <View style={[styles.certificateBorder, { borderColor: color }]}>
            {/* Inner decorative border */}
            <View style={[styles.certificateInnerBorder, { borderColor: color + '40' }]}>
              
              {/* Top Ornament */}
              <View style={styles.ornamentContainer}>
                <View style={[styles.ornamentLine, { backgroundColor: color }]} />
                <View style={[styles.ornamentIcon, { backgroundColor: bgColor }]}>
                  <MaterialIcons name="stars" size={20} color={color} />
                </View>
                <View style={[styles.ornamentLine, { backgroundColor: color }]} />
              </View>

              {/* Header */}
              <View style={styles.certHeaderView}>
                <Text style={[styles.certTitleView, { color }]}>Certificate</Text>
                <Text style={styles.certSubtitleView}>of Achievement</Text>
                <View style={[styles.certTypeBadge, { backgroundColor: bgColor }]}>
                  <Text style={[styles.certTypeText, { color }]}>{typeLabel.toUpperCase()}</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={[styles.certDivider, { backgroundColor: color + '30' }]} />

              {/* Body */}
              <View style={styles.certBodyView}>
                <Text style={styles.certPresentedText}>This certificate is proudly presented to</Text>
                <Text style={styles.certDonorName}>{donorName}</Text>
                
                {amount > 0 ? (
                  <>
                    <Text style={styles.certContributionText}>in recognition of their generous contribution of</Text>
                    <Text style={[styles.certAmountView, { color }]}>₹{amount.toLocaleString()}</Text>
                  </>
                ) : hours > 0 ? (
                  <>
                    <Text style={styles.certContributionText}>for completing</Text>
                    <Text style={[styles.certHoursView, { color }]}>{hours} hours</Text>
                    <Text style={styles.certContributionText}>of dedicated service</Text>
                  </>
                ) : (
                  <Text style={styles.certContributionText}>for their valuable contribution to</Text>
                )}
                
                <Text style={styles.certPurpose}>{purpose}</Text>
                
                <View style={styles.certQuoteContainer}>
                  <Text style={styles.certQuote}>"Your dedication transforms lives and builds a better tomorrow."</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={[styles.certDivider, { backgroundColor: color + '30' }]} />

              {/* Footer */}
              <View style={styles.certFooterView}>
                <View style={styles.certFooterInfo}>
                  <Text style={styles.certFooterDate}>Issued on: {date}</Text>
                  <Text style={styles.certFooterNumber}>Certificate No: {certNumber}</Text>
                  {cert.paymentId && (
                    <View style={styles.certPaymentBadge}>
                      <MaterialIcons name="security" size={12} color="#3b82f6" />
                      <Text style={styles.certPaymentText}>Verified by Razorpay</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.certActionButtons}>
            <TouchableOpacity 
              style={[styles.certActionBtn, styles.certActionShare]}
              onPress={() => handleShare(cert)}
            >
              <MaterialIcons name="share" size={18} color="#ffffff" />
              <Text style={styles.certActionBtnText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.certActionBtn, styles.certActionDownload]}
              onPress={() => handleDownload(cert)}
            >
              <MaterialIcons name="download" size={18} color="#ffffff" />
              <Text style={styles.certActionBtnText}>Download</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.certActionBtn, styles.certActionClose]}
              onPress={() => navigation.navigate('WorkingMemberProfile')}
            >
              <MaterialIcons name="arrow-back" size={18} color="#ffffff" />
              <Text style={styles.certActionBtnText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const handleShare = async (cert) => {
    try {
      const donorName = cert.donorName || cert.memberName || userData?.fullName || 'Working Member';
      const amount = cert.amount || 0;
      const purpose = cert.purpose || cert.type || 'General';
      const date = cert.issuedDate ? new Date(cert.issuedDate).toLocaleDateString() : new Date().toLocaleDateString();
      const type = cert.type || 'General';
      const hours = cert.hours || 0;
      
      let message = `🏆 ${type.toUpperCase()} CERTIFICATE 🏆\n\nThis certificate is proudly presented to\n\n${donorName}\n\n`;
      
      if (amount > 0) {
        message += `in recognition of their generous contribution of\n\n₹${amount.toLocaleString()}\n\nfor the purpose of\n\n${purpose}\n\n`;
      } else if (hours > 0) {
        message += `for completing ${hours} hours of dedicated service\n\nfor\n\n${purpose}\n\n`;
      } else {
        message += `for their valuable contribution to\n\n${purpose}\n\n`;
      }
      
      message += `"Your dedication transforms lives and builds a better tomorrow."\n\nIssued on: ${date}\nCertificate No: ${cert.certificateNumber || 'N/A'}`;
      
      if (cert.paymentId) {
        message += `\nPayment ID: ${cert.paymentId}`;
      }

      await Share.share({
        message: message,
        title: 'Certificate',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share certificate');
    }
  };

  const handleDownload = async (cert) => {
    setGeneratingPDF(true);
    try {
      const html = generateCertificateHTML(cert);
      const filePath = FileSystem.documentDirectory + `certificate_${Date.now()}.html`;
      
      await FileSystem.writeAsStringAsync(filePath, html);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/html',
          dialogTitle: 'Download Certificate',
        });
      } else {
        Alert.alert('Error', 'Download is not available on this device');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download certificate');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const generateCertificateHTML = (cert) => {
    const donorName = cert.donorName || cert.memberName || userData?.fullName || 'Working Member';
    const amount = cert.amount || 0;
    const purpose = cert.purpose || cert.type || 'General';
    const date = cert.issuedDate ? new Date(cert.issuedDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }) : new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    const certNumber = cert.certificateNumber || `CERT-${Date.now().toString().slice(-8)}`;
    const type = cert.type || 'General';
    const hours = cert.hours || 0;
    const typeColors = {
      training: { color: '#8b5cf6', bg: '#ede9fe' },
      performance: { color: '#f59e0b', bg: '#fef3c7' },
      completion: { color: '#10b981', bg: '#d1fae5' },
      volunteer: { color: '#3b82f6', bg: '#dbeafe' },
      donation: { color: '#ef4444', bg: '#fee2e2' },
      default: { color: '#6b7280', bg: '#f3f4f6' }
    };
    const colorScheme = typeColors[type] || typeColors.default;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', serif;
      background: #f5f0eb;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
      margin: 0;
    }
    .certificate-wrapper {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      max-width: 800px;
      width: 100%;
    }
    .certificate {
      border: 8px double ${colorScheme.color};
      padding: 35px;
      text-align: center;
      background: #fcfcfc;
      position: relative;
    }
    .certificate::before {
      content: '';
      position: absolute;
      top: 12px;
      left: 12px;
      right: 12px;
      bottom: 12px;
      border: 2px solid ${colorScheme.color};
      opacity: 0.15;
    }
    .ornament {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
      margin-bottom: 10px;
    }
    .ornament-line {
      flex: 1;
      height: 2px;
      background: ${colorScheme.color};
      opacity: 0.3;
      max-width: 80px;
    }
    .ornament-icon { font-size: 24px; }
    .header h1 {
      font-size: 44px;
      color: ${colorScheme.color};
      font-weight: bold;
      letter-spacing: 8px;
      margin-bottom: 2px;
    }
    .header .subtitle {
      font-size: 18px;
      color: #777;
      letter-spacing: 6px;
      font-style: italic;
    }
    .type-badge {
      display: inline-block;
      background: ${colorScheme.bg};
      color: ${colorScheme.color};
      padding: 4px 24px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: bold;
      margin-top: 8px;
      letter-spacing: 2px;
    }
    .divider {
      width: 50%;
      height: 2px;
      background: ${colorScheme.color};
      margin: 20px auto;
      opacity: 0.25;
    }
    .body { margin: 25px 0; }
    .body p {
      font-size: 17px;
      color: #444;
      line-height: 2;
    }
    .donor-name {
      font-size: 38px;
      font-weight: bold;
      color: #1a1a2e;
      margin: 12px 0;
      letter-spacing: 3px;
    }
    .amount {
      font-size: 30px;
      font-weight: bold;
      color: ${colorScheme.color};
      margin: 8px 0;
    }
    .hours {
      font-size: 28px;
      font-weight: bold;
      color: ${colorScheme.color};
      margin: 8px 0;
    }
    .purpose {
      font-size: 20px;
      color: #555;
      margin: 8px 0;
      font-style: italic;
    }
    .quote {
      margin-top: 18px;
      font-style: italic;
      color: #777;
      font-size: 15px;
    }
    .footer { margin-top: 25px; }
    .footer .cert-number {
      font-size: 12px;
      color: #999;
      margin-top: 8px;
      font-family: monospace;
    }
    .footer .date {
      font-size: 14px;
      color: #666;
    }
    .seal {
      margin: 15px auto;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 3px solid ${colorScheme.color};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: ${colorScheme.color};
      font-size: 12px;
      font-weight: bold;
      text-align: center;
      background: ${colorScheme.bg};
      line-height: 1.3;
    }
    .seal span { font-size: 9px; font-weight: normal; color: #888; }
    .payment-badge {
      display: inline-block;
      background: #eff6ff;
      color: #3b82f6;
      padding: 2px 12px;
      border-radius: 10px;
      font-size: 10px;
      margin-top: 4px;
    }
    @media print {
      body { background: white; padding: 0; }
      .certificate-wrapper { box-shadow: none; border-radius: 0; }
    }
    @media (max-width: 600px) {
      .certificate-wrapper { padding: 15px; }
      .certificate { padding: 18px; }
      .header h1 { font-size: 28px; letter-spacing: 4px; }
      .donor-name { font-size: 24px; }
      .amount { font-size: 22px; }
      .hours { font-size: 20px; }
      .body p { font-size: 15px; }
      .purpose { font-size: 17px; }
    }
  </style>
</head>
<body>
  <div class="certificate-wrapper">
    <div class="certificate">
      <div class="ornament">
        <div class="ornament-line"></div>
        <div class="ornament-icon">✦</div>
        <div class="ornament-line"></div>
      </div>
      <div class="header">
        <h1>Certificate</h1>
        <div class="subtitle">of Achievement</div>
        <div class="type-badge">${type.toUpperCase()}</div>
      </div>
      <div class="divider"></div>
      <div class="body">
        <p>This certificate is proudly presented to</p>
        <div class="donor-name">${donorName}</div>
        ${amount > 0 ? `
          <p>in recognition of their generous contribution of</p>
          <div class="amount">₹${amount.toLocaleString()}</div>
        ` : hours > 0 ? `
          <p>for completing</p>
          <div class="hours">${hours} hours</div>
          <p>of dedicated service</p>
        ` : `
          <p>for their valuable contribution to</p>
        `}
        <div class="purpose">${purpose}</div>
        <div class="quote">"Your dedication transforms lives and builds a better tomorrow."</div>
      </div>
      <div class="divider"></div>
      <div class="footer">
        <div class="seal">
          NGO<br>App Fresh
          <span>Est. 2024</span>
        </div>
        <div class="date">Issued on: ${date}</div>
        <div class="cert-number">Certificate No: ${certNumber}</div>
        ${cert.paymentId ? `<div class="payment-badge">Payment: ${cert.paymentId.slice(-12)}</div>` : ''}
      </div>
    </div>
  </div>
</body>
</html>
    `;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading Certificates...</Text>
      </View>
    );
  }

  // Show professional certificate view if selected
  if (showCertificateView && currentCert) {
    return (
      <View style={styles.certificateFullContainer}>
        <ScrollView 
          contentContainerStyle={styles.certificateScrollContent}
          showsVerticalScrollIndicator={false}
          ref={scrollViewRef}
        >
          <ProfessionalCertificateView cert={currentCert} />
        </ScrollView>
      </View>
    );
  }

  // If no certificate is found
  return (
    <View style={styles.container}>
      <View style={styles.emptyState}>
        <MaterialIcons name="verified" size={60} color="#d1d5db" />
        <Text style={styles.emptyStateText}>No certificate found</Text>
        <TouchableOpacity 
          style={styles.goBackButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.goBackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
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

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 20,
    color: '#1f2937',
    marginTop: 16,
  },
  goBackButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  goBackButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },

  // Professional Certificate View
  certificateFullContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  certificateScrollContent: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'center',
  },
  certificateViewContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certificateViewWrapper: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  certificateBorder: {
    borderWidth: 8,
    borderStyle: 'double',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  certificateInnerBorder: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  ornamentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  ornamentLine: {
    height: 2,
    width: 50,
    opacity: 0.5,
  },
  ornamentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  certHeaderView: {
    alignItems: 'center',
    marginBottom: 12,
  },
  certTitleView: {
    fontFamily: Fonts.Bold,
    fontSize: 32,
    letterSpacing: 4,
  },
  certSubtitleView: {
    fontFamily: Fonts.Regular,
    fontSize: 16,
    color: '#666',
    letterSpacing: 3,
    fontStyle: 'italic',
  },
  certTypeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 6,
  },
  certTypeText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    letterSpacing: 1,
  },
  certDivider: {
    height: 2,
    width: '50%',
    alignSelf: 'center',
    marginVertical: 12,
    opacity: 0.3,
  },
  certBodyView: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  certPresentedText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#444',
  },
  certDonorName: {
    fontFamily: Fonts.Bold,
    fontSize: 28,
    color: '#1a1a2e',
    marginVertical: 6,
    letterSpacing: 2,
  },
  certContributionText: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#444',
  },
  certAmountView: {
    fontFamily: Fonts.Bold,
    fontSize: 26,
    marginVertical: 4,
  },
  certHoursView: {
    fontFamily: Fonts.Bold,
    fontSize: 24,
    marginVertical: 4,
  },
  certPurpose: {
    fontFamily: Fonts.SemiBold,
    fontSize: 18,
    color: '#555',
    fontStyle: 'italic',
    marginVertical: 4,
  },
  certQuoteContainer: {
    marginTop: 12,
    paddingHorizontal: 12,
  },
  certQuote: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#777',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  certFooterView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  certFooterInfo: {
    alignItems: 'center',
  },
  certFooterDate: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#555',
  },
  certFooterNumber: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  certPaymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    gap: 4,
    justifyContent: 'center',
  },
  certPaymentText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 9,
    color: '#3b82f6',
  },
  certActionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  certActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  certActionShare: {
    backgroundColor: '#8b5cf6',
  },
  certActionDownload: {
    backgroundColor: '#10b981',
  },
  certActionClose: {
    backgroundColor: '#6b7280',
  },
  certActionBtnText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#ffffff',
  },
});