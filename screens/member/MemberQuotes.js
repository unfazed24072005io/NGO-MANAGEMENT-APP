// screens/member/MemberQuotes.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Share,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDoc,
  doc
} from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

const { width } = Dimensions.get('window');

export default function MemberQuotes({ navigation }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);

  useEffect(() => {
    setupRealtimeListener();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfilePhoto(data.profilePhoto || null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const setupRealtimeListener = () => {
    const now = new Date();
    const q = query(
      collection(db, 'quotes'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const quotesList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const startDate = data.startDate?.toDate?.() || new Date(data.startDate);
        const endDate = data.endDate?.toDate?.() || new Date(data.endDate);
        const isValid = now >= startDate && now <= endDate;
        
        if (isValid) {
          quotesList.push({ 
            id: doc.id, 
            ...data,
            startDate,
            endDate
          });
        }
      });
      setQuotes(quotesList);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const handleShare = async (quote) => {
    try {
      const message = `"${quote.text}"\n— ${quote.author || 'Unknown'}\n\nShared from NGO App 💫`;
      await Share.share({
        message: message,
        title: 'Inspirational Quote',
      });
    } catch (error) {
      console.error('Error sharing quote:', error);
      Alert.alert('Error', 'Failed to share quote');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const QuoteCard = ({ quote }) => {
    const [expanded, setExpanded] = useState(false);

    return (
      <View style={styles.quoteCard}>
        <Image source={{ uri: quote.imageUrl }} style={styles.quoteImage} />
        <View style={styles.quoteOverlay}>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={() => handleShare(quote)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="share" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
        <View style={styles.quoteContent}>
          <Text 
            style={styles.quoteText}
            numberOfLines={expanded ? undefined : 3}
          >
            "{quote.text}"
          </Text>
          {quote.text.length > 100 && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
              <Text style={styles.expandText}>
                {expanded ? 'Show less' : 'Read more'}
              </Text>
            </TouchableOpacity>
          )}
          {quote.author && (
            <Text style={styles.quoteAuthor}>— {quote.author}</Text>
          )}
          <View style={styles.quoteFooter}>
            <View style={styles.dateInfo}>
              <MaterialIcons name="event" size={14} color="#6b7280" />
              <Text style={styles.dateText}>
                Valid: {formatDate(quote.startDate)} - {formatDate(quote.endDate)}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.shareIconButton}
              onPress={() => handleShare(quote)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="share" size={18} color="#8b5cf6" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading quotes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Purple Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
              <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Daily Quotes</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileIcon}
            onPress={() => navigation.navigate('MemberProfile')}
            activeOpacity={0.7}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
            ) : (
              <MaterialIcons name="person" size={26} color="#8b5cf6" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Quotes List */}
      <FlatList
        data={quotes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <QuoteCard quote={item} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8b5cf6']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="format-quote" size={44} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No quotes available</Text>
            <Text style={styles.emptyStateSubtext}>Check back later for inspiring quotes</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerInfo}>
            <Text style={styles.headerInfoText}>✨ Daily Inspiration</Text>
            <Text style={styles.headerInfoSubtext}>
              Share these quotes with your friends and family
            </Text>
          </View>
        }
      />
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
    fontSize: 14,
    color: '#6b7280',
    marginTop: 10,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Header
  headerCard: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: '#ffffff',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  profileIcon: {
    width: 64,
    height: 64,
    borderRadius: 50,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 50,
  },

  headerInfo: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  headerInfoText: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  headerInfoSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // List
  listContent: {
    paddingBottom: 20,
    paddingTop: 4,
  },

  // Quote Card
  quoteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quoteImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    backgroundColor: '#f3f4f6',
  },
  quoteOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quoteContent: {
    padding: 16,
  },
  quoteText: {
    fontFamily: Fonts.Medium,
    fontSize: 17,
    color: '#1f2937',
    fontStyle: 'italic',
    lineHeight: 26,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  expandText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: '#8b5cf6',
    marginTop: 6,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  quoteAuthor: {
    fontFamily: Fonts.Regular,
    fontSize: 15,
    color: '#6b7280',
    marginTop: 10,
    textAlign: 'right',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  quoteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dateText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  shareIconButton: {
    padding: 6,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyStateText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  emptyStateSubtext: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});