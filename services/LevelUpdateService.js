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
  Timestamp
} from 'firebase/firestore';
import { getLevelByMemberCount, getLevelDetails, getNextLevel } from '../config/commissionLevels';

export const LevelUpdateService = {
  // Check and update working member level
  async checkAndUpdateLevel(workingMemberId) {
    try {
      const userRef = doc(db, 'users', workingMemberId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      if (userData.role !== 'workingMember') {
        return { success: false, message: 'Not a working member' };
      }
      
      // Count direct referrals
      const directReferralCount = userData.directReferrals?.length || 0;
      
      // Determine new level based on member count
      const newLevel = getLevelByMemberCount(directReferralCount);
      
      // Check if level changed
      if (newLevel !== userData.level) {
        // Update user level
        await updateDoc(userRef, {
          level: newLevel,
          levelUpdatedAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        
        // Log level change
        await this.logLevelChange(workingMemberId, userData.level, newLevel);
        
        // Check if user achieved next level milestone
        const oldLevelDetails = getLevelDetails(userData.level);
        const newLevelDetails = getLevelDetails(newLevel);
        
        return {
          success: true,
          oldLevel: userData.level,
          newLevel: newLevel,
          levelChanged: true,
          oldTitle: oldLevelDetails.title,
          newTitle: newLevelDetails.title,
          message: `Congratulations! You've been promoted to ${newLevelDetails.title}! 🎉`
        };
      }
      
      return {
        success: true,
        levelChanged: false,
        currentLevel: userData.level,
        currentTitle: getLevelDetails(userData.level).title
      };
      
    } catch (error) {
      console.error('Error checking level:', error);
      throw error;
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
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'workingMember')
      );
      
      const querySnapshot = await getDocs(q);
      const results = [];
      
      for (const doc of querySnapshot.docs) {
        const userData = doc.data();
        const result = await this.checkAndUpdateLevel(doc.id);
        results.push({
          userId: doc.id,
          name: userData.name,
          ...result
        });
      }
      
      return results;
    } catch (error) {
      console.error('Error updating all levels:', error);
      throw error;
    }
  },

  // Get level statistics (Admin)
  async getLevelStatistics() {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'workingMember')
      );
      
      const querySnapshot = await getDocs(q);
      const stats = {
        "I": { count: 0, members: [] },
        "II": { count: 0, members: [] },
        "III": { count: 0, members: [] },
        "IV": { count: 0, members: [] },
        "V": { count: 0, members: [] },
        "VI": { count: 0, members: [] },
        "VII": { count: 0, members: [] }
      };
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const level = userData.level || "I";
        if (stats[level]) {
          stats[level].count++;
          stats[level].members.push({
            id: doc.id,
            name: userData.name,
            email: userData.email
          });
        }
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting level statistics:', error);
      throw error;
    }
  }
};