import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Fonts } from '../../config/fonts';

export default function CommissionManagement({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [commissionData, setCommissionData] = useState(null);
  const [formData, setFormData] = useState({
    levels: [
      { id: 'I', name: 'ग्राहक', nameEn: 'Customer', percentage: 25 },
      { id: 'II', name: 'सेवक', nameEn: 'Servant / Worker', percentage: 35 },
      { id: 'III', name: 'प्रचारक', nameEn: 'Promoter', percentage: 40 },
      { id: 'IV', name: 'संयोजक', nameEn: 'Coordinator / Organizer', percentage: 42.5 },
      { id: 'V', name: 'मार्गदर्शक', nameEn: 'Guide / Mentor', percentage: 43.75 },
      { id: 'VI', name: 'संरक्षक', nameEn: 'Guardian / Protector', percentage: 44.5 },
      { id: 'VII', name: 'स्वामी', nameEn: 'Owner / Master', percentage: 45 }
    ],
    generalCommission: 10,
    starCommission: 5,
    lastUpdated: null
  });

  useEffect(() => {
    fetchCommissionData();
  }, []);

  const fetchCommissionData = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'commission');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCommissionData(data);
        setFormData({
          levels: data.levels || [
            { id: 'I', name: 'ग्राहक', nameEn: 'Customer', percentage: 25 },
            { id: 'II', name: 'सेवक', nameEn: 'Servant / Worker', percentage: 35 },
            { id: 'III', name: 'प्रचारक', nameEn: 'Promoter', percentage: 40 },
            { id: 'IV', name: 'संयोजक', nameEn: 'Coordinator / Organizer', percentage: 42.5 },
            { id: 'V', name: 'मार्गदर्शक', nameEn: 'Guide / Mentor', percentage: 43.75 },
            { id: 'VI', name: 'संरक्षक', nameEn: 'Guardian / Protector', percentage: 44.5 },
            { id: 'VII', name: 'स्वामी', nameEn: 'Owner / Master', percentage: 45 }
          ],
          generalCommission: data.generalCommission || 10,
          starCommission: data.starCommission || 5,
          lastUpdated: data.lastUpdated || null
        });
      }
    } catch (error) {
      console.error('Error fetching commission data:', error);
      Alert.alert('Error', 'Failed to load commission data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        levels: formData.levels,
        generalCommission: formData.generalCommission,
        starCommission: formData.starCommission,
        lastUpdated: new Date().toISOString(),
        updatedBy: auth.currentUser?.uid || 'admin'
      };

      await setDoc(doc(db, 'settings', 'commission'), data);
      Alert.alert('Success', 'Commission settings updated successfully');
      setEditing(false);
      fetchCommissionData();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateLevelPercentage = (index, value) => {
    const newLevels = [...formData.levels];
    newLevels[index].percentage = parseFloat(value) || 0;
    setFormData({ ...formData, levels: newLevels });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCommissionData();
    setRefreshing(false);
  };

  // Calculate reverse cumulative percentages
  const calculateReverseCumulative = () => {
    const levels = [...formData.levels].reverse();
    let cumulative = 0;
    return levels.map(level => {
      cumulative += level.percentage;
      return {
        ...level,
        cumulative: Math.min(cumulative, 50) // Cap at 50%
      };
    });
  };

  const reverseData = calculateReverseCumulative();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading Commission Settings...</Text>
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
          <Text style={styles.headerTitle}>Commission Management</Text>
          <TouchableOpacity onPress={() => setEditing(!editing)}>
            <Text style={styles.editButton}>{editing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
        }
      >
        {/* Membership Levels Table */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="workspace-premium" size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Membership Levels & Commission</Text>
          </View>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.levelCol]}>Level</Text>
            <Text style={[styles.tableHeaderText, styles.nameCol]}>Member Type</Text>
            <Text style={[styles.tableHeaderText, styles.nameCol]}>English</Text>
            <Text style={[styles.tableHeaderText, styles.percentageCol]}>Commission %</Text>
          </View>

          {/* Table Rows */}
          {formData.levels.map((level, index) => (
            <View key={level.id} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
              <Text style={[styles.tableCell, styles.levelCol, styles.levelBadge]}>
                {level.id}
              </Text>
              <Text style={[styles.tableCell, styles.nameCol, styles.marathiText]}>
                {level.name}
              </Text>
              <Text style={[styles.tableCell, styles.nameCol]}>
                {level.nameEn}
              </Text>
              <View style={[styles.tableCell, styles.percentageCol]}>
                {editing ? (
                  <TextInput
                    style={styles.percentageInput}
                    value={String(level.percentage)}
                    onChangeText={(text) => updateLevelPercentage(index, text)}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                ) : (
                  <Text style={styles.percentageText}>{level.percentage}%</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Achievement Bonus Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="stars" size={20} color="#f59e0b" />
            <Text style={styles.sectionTitle}>Achievement Bonus</Text>
          </View>

          <View style={styles.bonusContainer}>
            <View style={styles.bonusItem}>
              <View style={[styles.bonusIcon, { backgroundColor: '#d1fae5' }]}>
                <MaterialIcons name="stars" size={20} color="#10b981" />
              </View>
              <View style={styles.bonusContent}>
                <Text style={styles.bonusLabel}>साधारण कमिशन (General Commission)</Text>
                {editing ? (
                  <TextInput
                    style={styles.bonusInput}
                    value={String(formData.generalCommission)}
                    onChangeText={(text) => setFormData({...formData, generalCommission: parseFloat(text) || 0})}
                    keyboardType="numeric"
                  />
                ) : (
                  <Text style={styles.bonusValue}>{formData.generalCommission}%</Text>
                )}
              </View>
            </View>

            <View style={[styles.bonusItem, styles.bonusItemBorder]}>
              <View style={[styles.bonusIcon, { backgroundColor: '#fef3c7' }]}>
                <MaterialIcons name="star" size={20} color="#f59e0b" />
              </View>
              <View style={styles.bonusContent}>
                <Text style={styles.bonusLabel}>स्टार कमिशन (Star Commission)</Text>
                {editing ? (
                  <TextInput
                    style={styles.bonusInput}
                    value={String(formData.starCommission)}
                    onChangeText={(text) => setFormData({...formData, starCommission: parseFloat(text) || 0})}
                    keyboardType="numeric"
                  />
                ) : (
                  <Text style={styles.bonusValue}>{formData.starCommission}%</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Reverse Calculation Breakdown */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="calculate" size={20} color="#8b5cf6" />
            <Text style={styles.sectionTitle}>Reverse Calculation Breakdown</Text>
          </View>

          <View style={styles.reverseContainer}>
            {reverseData.map((level, index) => (
              <View key={level.id} style={[styles.reverseRow, index % 2 === 0 && styles.reverseRowEven]}>
                <View style={styles.reverseLeft}>
                  <Text style={styles.reverseLevel}>{level.id}</Text>
                  <Text style={styles.reverseName}>{level.nameEn}</Text>
                  <Text style={[styles.reverseName, styles.marathiText]}>({level.name})</Text>
                </View>
                <View style={styles.reverseRight}>
                  <Text style={styles.reversePercentage}>{level.percentage}%</Text>
                  <MaterialIcons name="arrow-forward" size={16} color="#6b7280" />
                  <Text style={styles.reverseCumulative}>{level.cumulative}%</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Note at bottom */}
          <View style={styles.noteContainer}>
            <MaterialIcons name="info" size={16} color="#6b7280" />
            <Text style={styles.noteText}>
              नीचे दिलेले पैमाने / आपले पैमाने
            </Text>
          </View>
          <Text style={styles.noteSubText}>
            The scales/percentages given below / Your scales/percentages
          </Text>
        </View>

        {/* Last Updated Info */}
        {commissionData?.lastUpdated && !editing && (
          <View style={styles.updateInfo}>
            <MaterialIcons name="update" size={14} color="#9ca3af" />
            <Text style={styles.updateText}>
              Last updated: {new Date(commissionData.lastUpdated).toLocaleString()}
            </Text>
          </View>
        )}

        {/* Save Button */}
        {editing && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            <MaterialIcons name="save" size={20} color="#ffffff" />
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>NGO App v1.0.0</Text>
        </View>
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
  },
  editButton: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 14,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
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
  },

  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    marginTop: 10,
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
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.SemiBold,
    fontSize: 16,
    color: '#1f2937',
  },

  // Table Styles
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: '#4b5563',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 4,
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#1f2937',
  },
  levelCol: {
    width: '12%',
  },
  nameCol: {
    width: '32%',
  },
  percentageCol: {
    width: '24%',
    alignItems: 'flex-end',
  },
  levelBadge: {
    fontFamily: Fonts.Bold,
    color: '#3b82f6',
  },
  marathiText: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
  },
  percentageText: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
    color: '#3b82f6',
  },
  percentageInput: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#3b82f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    width: 60,
    textAlign: 'center',
    backgroundColor: '#ffffff',
  },

  // Bonus Styles
  bonusContainer: {
    gap: 8,
  },
  bonusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  bonusItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  bonusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bonusContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bonusLabel: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: '#1f2937',
  },
  bonusValue: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: '#f59e0b',
  },
  bonusInput: {
    fontFamily: Fonts.Regular,
    fontSize: 14,
    color: '#f59e0b',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    width: 60,
    textAlign: 'center',
    backgroundColor: '#ffffff',
  },

  // Reverse Calculation Styles
  reverseContainer: {
    gap: 2,
  },
  reverseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  reverseRowEven: {
    backgroundColor: '#f9fafb',
  },
  reverseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reverseLevel: {
    fontFamily: Fonts.Bold,
    fontSize: 12,
    color: '#3b82f6',
    width: 20,
  },
  reverseName: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#1f2937',
  },
  reverseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reversePercentage: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
  },
  reverseCumulative: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
    color: '#10b981',
  },

  // Note Styles
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  noteText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  noteSubText: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
    paddingLeft: 22,
  },

  // Update Info
  updateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  updateText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#9ca3af',
  },

  // Save Button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  saveButtonText: {
    fontFamily: Fonts.SemiBold,
    color: '#ffffff',
    fontSize: 16,
  },

  versionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  versionText: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#9ca3af',
  },
});