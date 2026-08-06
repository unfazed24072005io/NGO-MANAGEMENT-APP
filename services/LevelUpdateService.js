// services/LevelUpdateService.js
import { db } from '../config/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  setDoc, 
  query, 
  where, 
  getDocs,
  runTransaction,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { 
  getLevelByDonations,
  getLevelDetails, 
  getNextLevel,
  isEligibleForPromotion,
  getPromotionRequirements
} from '../config/commissionLevels';

export const LevelUpdateService = {
  // Check and update working member level (DONATION ONLY)
  async checkAndUpdateLevel(workingMemberId) {
    console.log('🟢 LevelUpdateService.checkAndUpdateLevel called');
    console.log('   workingMemberId:', workingMemberId);
    
    try {
      const userRef = doc(db, 'users', workingMemberId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      console.log('📋 User data:', userData);
      console.log('📋 User role:', userData?.role);
      
      // Check both 'working' and 'workingMember' roles
      const isWorkingMember = userData.role === 'working' || 
                             userData.role === 'workingMember';
      
      if (!isWorkingMember) {
        console.log('❌ Not a working member. Role found:', userData?.role);
        return { 
          success: false, 
          message: `Not a working member. Role: ${userData?.role}` 
        };
      }
      
      // Get total donations from registered members
      const totalDonations = await this.getTotalDonationsFromMembers(workingMemberId);
      console.log('💰 Total donations from members:', totalDonations);
      
      // Determine new level based on donations ONLY
      const newLevel = getLevelByDonations(totalDonations);
      console.log('📊 New level determined:', newLevel);
      
      // Check if level changed
      if (newLevel !== userData.level) {
        console.log('🔄 Level changing from', userData.level, 'to', newLevel);
        
        // Update user level
        await updateDoc(userRef, {
          level: newLevel,
          levelUpdatedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          totalDonationsFromMembers: totalDonations
        });
        
        // Log level change
        await this.logLevelChange(workingMemberId, userData.level, newLevel);
        
        const oldLevelDetails = getLevelDetails(userData.level);
        const newLevelDetails = getLevelDetails(newLevel);
        
        return {
          success: true,
          oldLevel: userData.level,
          newLevel: newLevel,
          levelChanged: true,
          oldTitle: oldLevelDetails.title,
          newTitle: newLevelDetails.title,
          totalDonations,
          promotionReason: `₹${totalDonations.toLocaleString()} in donations`,
          message: `🎉 Congratulations! You've been promoted to ${newLevelDetails.title} (₹${totalDonations.toLocaleString()} in donations)!`
        };
      }
      
      console.log('✅ Level unchanged:', userData.level);
      return {
        success: true,
        levelChanged: false,
        currentLevel: userData.level,
        currentTitle: getLevelDetails(userData.level).title,
        totalDonations
      };
      
    } catch (error) {
      console.error('🔴 Error checking level:', error);
      throw error;
    }
  },

  // Get total donations from all members registered by this working member
  async getTotalDonationsFromMembers(workingMemberId) {
    try {
      console.log('📊 Getting total donations for working member:', workingMemberId);
      
      // Get all members registered by this working member
      const membersQuery = query(
        collection(db, 'registeredMembers'),
        where('workingMemberId', '==', workingMemberId)
      );
      
      const membersSnapshot = await getDocs(membersQuery);
      let totalDonations = 0;
      
      if (membersSnapshot.empty) {
        console.log('ℹ️ No registered members found');
        return 0;
      }
      
      const memberPromises = [];
      membersSnapshot.forEach((doc) => {
        const memberData = doc.data();
        const memberId = memberData.memberId;
        
        if (memberId) {
          memberPromises.push(
            getDocs(query(
              collection(db, 'donations'),
              where('memberId', '==', memberId),
              where('status', '==', 'completed')
            )).then((donationSnapshot) => {
              let memberTotal = 0;
              donationSnapshot.forEach((donationDoc) => {
                memberTotal += donationDoc.data().amount || 0;
              });
              return memberTotal;
            })
          );
        }
      });
      
      const results = await Promise.all(memberPromises);
      totalDonations = results.reduce((sum, val) => sum + val, 0);
      
      console.log(`✅ Total donations: ₹${totalDonations}`);
      return totalDonations;
    } catch (error) {
      console.error('❌ Error getting total donations:', error);
      return 0;
    }
  },

  // Log level changes
  async logLevelChange(userId, oldLevel, newLevel) {
    try {
      await addDoc(collection(db, 'levelHistory'), {
        userId: userId,
        oldLevel: oldLevel,
        newLevel: newLevel,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error logging level change:', error);
    }
  },

  // Get level history for user
  async getLevelHistory(userId) {
    try {
      const q = query(
        collection(db, 'levelHistory'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const history = [];
      querySnapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() });
      });
      
      return history;
    } catch (error) {
      console.error('Error getting level history:', error);
      return [];
    }
  },

  // Get all working members and update their levels (Admin function)
  async updateAllWorkingMemberLevels() {
    try {
      console.log('🔄 Updating all working member levels...');
      
      const q = query(
        collection(db, 'users'),
        where('role', 'in', ['working', 'workingMember'])
      );
      
      const querySnapshot = await getDocs(q);
      const results = [];
      
      for (const doc of querySnapshot.docs) {
        const userData = doc.data();
        const result = await this.checkAndUpdateLevel(doc.id);
        results.push({
          userId: doc.id,
          name: userData.fullName || userData.name || 'Unknown',
          ...result
        });
      }
      
      console.log(`✅ Updated ${results.length} working members`);
      return results;
    } catch (error) {
      console.error('Error updating all levels:', error);
      throw error;
    }
  },

  // Get level statistics (Admin)
  async getLevelStatistics() {
    try {
      console.log('📊 Getting level statistics...');
      
      const q = query(
        collection(db, 'users'),
        where('role', 'in', ['working', 'workingMember'])
      );
      
      const querySnapshot = await getDocs(q);
      const stats = {
        "I": { count: 0, members: [], totalDonations: 0 },
        "II": { count: 0, members: [], totalDonations: 0 },
        "III": { count: 0, members: [], totalDonations: 0 },
        "IV": { count: 0, members: [], totalDonations: 0 },
        "V": { count: 0, members: [], totalDonations: 0 },
        "VI": { count: 0, members: [], totalDonations: 0 },
        "VII": { count: 0, members: [], totalDonations: 0 }
      };
      
      for (const doc of querySnapshot.docs) {
        const userData = doc.data();
        const level = userData.level || "I";
        if (stats[level]) {
          stats[level].count++;
          stats[level].members.push({
            id: doc.id,
            name: userData.fullName || userData.name || 'Unknown',
            email: userData.email,
            totalDonations: userData.totalDonationsFromMembers || 0
          });
          stats[level].totalDonations += (userData.totalDonationsFromMembers || 0);
        }
      }
      
      console.log('✅ Level statistics calculated');
      return stats;
    } catch (error) {
      console.error('Error getting level statistics:', error);
      throw error;
    }
  },

  // Get promotion progress for a working member (DONATION ONLY)
  async getPromotionProgress(workingMemberId) {
    try {
      console.log('📊 Getting promotion progress for:', workingMemberId);
      
      const userDoc = await getDoc(doc(db, 'users', workingMemberId));
      const userData = userDoc.data();
      
      if (!userData) {
        return null;
      }
      
      const currentLevel = userData.level || 'I';
      const totalDonations = userData.totalDonationsFromMembers || 0;
      
      const currentLevelDetails = getLevelDetails(currentLevel);
      const nextLevelId = getNextLevel(currentLevel);
      
      if (!nextLevelId) {
        return {
          currentLevel,
          currentLevelTitle: currentLevelDetails.title,
          totalDonations,
          nextLevel: null,
          isMaxLevel: true,
          message: 'You are at the highest level! 🎉',
          progress: 100
        };
      }
      
      const nextLevel = getLevelDetails(nextLevelId);
      
      // Calculate donation progress ONLY
      const totalNeeded = nextLevel.minDonations - currentLevel.minDonations;
      const achieved = totalDonations - currentLevel.minDonations;
      const donationProgress = totalNeeded > 0 ? Math.min((achieved / totalNeeded) * 100, 100) : 100;
      
      const donationsNeeded = Math.max(0, nextLevel.minDonations - totalDonations);
      const isEligible = isEligibleForPromotion(currentLevel, totalDonations);
      
      return {
        currentLevel,
        currentLevelTitle: currentLevelDetails.title,
        totalDonations,
        nextLevel: nextLevelId,
        nextLevelTitle: nextLevel.title,
        donationsNeeded,
        isEligible,
        isMaxLevel: false,
        progress: donationProgress,
        requirements: {
          requiredDonations: nextLevel.minDonations,
          directCommission: nextLevel.directCommission,
          secondaryCommission: nextLevel.secondaryCommission
        }
      };
    } catch (error) {
      console.error('Error getting promotion progress:', error);
      return null;
    }
  },

  // Check if a specific working member is eligible for promotion (DONATION ONLY)
  async checkEligibility(workingMemberId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', workingMemberId));
      const userData = userDoc.data();
      
      if (!userData) {
        return { eligible: false, reason: 'User not found' };
      }
      
      const currentLevel = userData.level || 'I';
      const totalDonations = userData.totalDonationsFromMembers || 0;
      
      const nextLevelId = getNextLevel(currentLevel);
      if (!nextLevelId) {
        return { eligible: false, reason: 'Already at highest level' };
      }
      
      const isEligible = isEligibleForPromotion(currentLevel, totalDonations);
      const requirements = getPromotionRequirements(currentLevel);
      
      return {
        eligible: isEligible,
        currentLevel,
        totalDonations,
        nextLevel: nextLevelId,
        requirements,
        donationsNeeded: Math.max(0, requirements?.requiredDonations - totalDonations || 0)
      };
    } catch (error) {
      console.error('Error checking eligibility:', error);
      return { eligible: false, reason: 'Error checking eligibility' };
    }
  },

  // Get donations needed for next level (NEW)
  async getDonationsNeededForNextLevel(workingMemberId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', workingMemberId));
      const userData = userDoc.data();
      
      if (!userData) return 0;
      
      const currentLevel = userData.level || 'I';
      const totalDonations = userData.totalDonationsFromMembers || 0;
      const nextLevelId = getNextLevel(currentLevel);
      
      if (!nextLevelId) return 0;
      
      const nextLevel = getLevelDetails(nextLevelId);
      return Math.max(0, nextLevel.minDonations - totalDonations);
    } catch (error) {
      console.error('Error getting donations needed:', error);
      return 0;
    }
  },

  // Get donation progress percentage (NEW)
  async getDonationProgressPercentage(workingMemberId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', workingMemberId));
      const userData = userDoc.data();
      
      if (!userData) return 0;
      
      const currentLevel = userData.level || 'I';
      const totalDonations = userData.totalDonationsFromMembers || 0;
      const nextLevelId = getNextLevel(currentLevel);
      
      if (!nextLevelId) return 100;
      
      const nextLevel = getLevelDetails(nextLevelId);
      const currentLevelDetails = getLevelDetails(currentLevel);
      const totalNeeded = nextLevel.minDonations - currentLevelDetails.minDonations;
      const achieved = totalDonations - currentLevelDetails.minDonations;
      
      return totalNeeded > 0 ? Math.min((achieved / totalNeeded) * 100, 100) : 100;
    } catch (error) {
      console.error('Error getting donation progress:', error);
      return 0;
    }
  }
};