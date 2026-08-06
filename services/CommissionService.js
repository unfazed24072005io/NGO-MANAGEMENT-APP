// services/CommissionService.js
import { db } from '../config/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  increment, 
  collection, 
  addDoc, 
  setDoc, 
  query, 
  where, 
  getDocs,
  runTransaction,
  Timestamp
} from 'firebase/firestore';
import { 
  getLevelDetails, 
  getCommissionRates,
  getLevelByMemberCountAndDonations,
  isEligibleForPromotion,
  getPromotionRequirements
} from '../config/commissionLevels';
import { WalletService } from './WalletService';
import { LevelUpdateService } from './LevelUpdateService';

export const CommissionService = {
  // ============================================================
  // 1. PROCESS COMMISSION ON NEW MEMBER REGISTRATION
  // ============================================================
  async processNewRegistration(newMemberId, sponsorId, registrationAmount = 1000) {
    console.log('🔵 CommissionService.processNewRegistration called');
    console.log('   newMemberId:', newMemberId);
    console.log('   sponsorId:', sponsorId);
    console.log('   registrationAmount:', registrationAmount);
    
    try {
      // Get sponsor details
      const sponsorDoc = await getDoc(doc(db, 'users', sponsorId));
      const sponsorData = sponsorDoc.data();
      
      console.log('📋 Sponsor data:', sponsorData);
      console.log('📋 Sponsor role:', sponsorData?.role);
      
      // Check both 'working' and 'workingMember' roles
      const isWorkingMember = sponsorData.role === 'working' || 
                             sponsorData.role === 'workingMember';
      
      if (!isWorkingMember) {
        console.log('❌ Sponsor is not a working member. Role found:', sponsorData?.role);
        return { 
          success: false, 
          message: `Sponsor is not a working member. Role: ${sponsorData?.role}` 
        };
      }
      
      // Get sponsor's level
      const sponsorLevel = sponsorData.level || 'I';
      const levelDetails = getLevelDetails(sponsorLevel);
      
      console.log('📊 Sponsor Level:', sponsorLevel);
      console.log('📊 Level Details:', levelDetails);
      
      // 1. Calculate Direct Commission
      const directCommissionAmount = (registrationAmount * levelDetails.directCommission) / 100;
      console.log('💰 Direct commission amount:', directCommissionAmount);
      
      // 2. Add direct commission to sponsor's wallet
      await WalletService.addCommission(
        sponsorId,
        directCommissionAmount,
        'direct_commission',
        `Direct commission for registering new member (${levelDetails.directCommission}%)`,
        newMemberId
      );
      
      console.log(`✅ Direct commission: ₹${directCommissionAmount} added to sponsor ${sponsorId}`);
      
      // 3. Calculate Secondary Commissions (Upline)
      const secondaryCommissions = await this.calculateSecondaryCommissions(
        sponsorId,
        registrationAmount,
        newMemberId
      );
      
      console.log(`✅ Secondary commissions: ${secondaryCommissions.length} levels`);
      
      // 4. Update sponsor's direct referrals count
      await this.updateDirectReferrals(sponsorId, newMemberId);
      
      // 5. Update sponsor's level (based on both members AND donations)
      await LevelUpdateService.checkAndUpdateLevel(sponsorId);
      
      return {
        success: true,
        directCommission: directCommissionAmount,
        secondaryCommissions: secondaryCommissions,
        newLevel: sponsorData.level
      };
      
    } catch (error) {
      console.error('🔴 CommissionService error:', error);
      throw error;
    }
  },

  // ============================================================
  // 2. PROCESS COMMISSION ON DONATION (NEW)
  // ============================================================
  async processDonationCommission(memberId, donationAmount) {
    console.log('💰 CommissionService.processDonationCommission called');
    console.log('   memberId:', memberId);
    console.log('   donationAmount:', donationAmount);
    
    try {
      // 1. Get the member's data to find who registered them
      const memberDoc = await getDoc(doc(db, 'users', memberId));
      const memberData = memberDoc.data();
      
      if (!memberDoc.exists()) {
        console.log('❌ Member not found');
        return { success: false, message: 'Member not found' };
      }
      
      console.log('📋 Member data:', memberData);
      
      // 2. Get the working member who registered this member
      const workingMemberId = memberData.registeredBy || memberData.createdBy;
      
      if (!workingMemberId) {
        console.log('❌ No working member found for this member');
        return { success: false, message: 'No working member found' };
      }
      
      console.log('👤 Working Member ID (who registered this member):', workingMemberId);
      
      // 3. Get working member's details
      const workingMemberDoc = await getDoc(doc(db, 'users', workingMemberId));
      const workingMemberData = workingMemberDoc.data();
      
      if (!workingMemberDoc.exists()) {
        console.log('❌ Working member not found');
        return { success: false, message: 'Working member not found' };
      }
      
      console.log('📋 Working member data:', workingMemberData);
      
      // 4. Check if it's a working member
      const isWorkingMember = workingMemberData.role === 'working' || 
                             workingMemberData.role === 'workingMember';
      
      if (!isWorkingMember) {
        console.log('❌ Sponsor is not a working member. Role:', workingMemberData.role);
        return { success: false, message: 'Sponsor is not a working member' };
      }
      
      // 5. Get working member's level and commission rate
      const level = workingMemberData.level || 'I';
      const levelDetails = getLevelDetails(level);
      const commissionRate = levelDetails.directCommission;
      
      console.log(`📊 Working Member Level: ${level}, Commission Rate: ${commissionRate}%`);
      
      // 6. Calculate commission
      const commissionAmount = (donationAmount * commissionRate) / 100;
      console.log(`💰 Commission Amount: ₹${commissionAmount}`);
      
      // 7. Add commission to working member's wallet
      await WalletService.addCommission(
        workingMemberId,
        commissionAmount,
        'direct_commission',
        `Commission from ${memberData.fullName || 'Member'}'s donation of ₹${donationAmount} (${commissionRate}%)`,
        memberId
      );
      
      console.log(`✅ Commission: ₹${commissionAmount} added to working member ${workingMemberId}`);
      
      // 8. Log the commission
      await addDoc(collection(db, 'commissionLogs'), {
        workingMemberId: workingMemberId,
        memberId: memberId,
        memberName: memberData.fullName || 'Unknown',
        donationAmount: donationAmount,
        commissionAmount: commissionAmount,
        commissionRate: commissionRate,
        level: level,
        type: 'donation_commission',
        createdAt: Timestamp.now()
      });
      
      console.log('✅ Commission log created');
      
      // 9. Update working member's total commission from donations
      const workingMemberRef = doc(db, 'users', workingMemberId);
      const currentTotal = workingMemberData.totalDonationCommission || 0;
      await updateDoc(workingMemberRef, {
        totalDonationCommission: currentTotal + commissionAmount,
        updatedAt: Timestamp.now()
      });
      
      // ============ 🎯 UPDATE WORKING MEMBER'S LEVEL BASED ON DONATIONS ============
      // 10. Check and update level based on donations
      const updatedLevelResult = await LevelUpdateService.checkAndUpdateLevel(workingMemberId);
      console.log('📊 Level update result after donation:', updatedLevelResult);
      
      // 11. Update working member's donation total in the user document
      const totalDonations = await this.getTotalDonationsByMember(workingMemberId);
      await updateDoc(workingMemberRef, {
        totalDonationsFromMembers: totalDonations,
        updatedAt: Timestamp.now()
      });
      
      return {
        success: true,
        commissionAmount: commissionAmount,
        commissionRate: commissionRate,
        level: level,
        workingMemberId: workingMemberId,
        memberName: memberData.fullName || 'Unknown',
        levelChanged: updatedLevelResult?.levelChanged || false,
        newLevel: updatedLevelResult?.newLevel || level
      };
      
    } catch (error) {
      console.error('❌ Error processing donation commission:', error);
      throw error;
    }
  },

  // ============================================================
  // 3. GET TOTAL DONATIONS BY WORKING MEMBER'S REGISTERED MEMBERS
  // ============================================================
  async getTotalDonationsByMember(workingMemberId) {
    try {
      console.log('📊 Getting total donations for working member:', workingMemberId);
      
      // Get all members registered by this working member
      const membersQuery = query(
        collection(db, 'registeredMembers'),
        where('workingMemberId', '==', workingMemberId)
      );
      
      const membersSnapshot = await getDocs(membersQuery);
      let totalDonations = 0;
      
      for (const doc of membersSnapshot.docs) {
        const memberData = doc.data();
        const memberId = memberData.memberId;
        
        // Get donations for this member
        const donationsQuery = query(
          collection(db, 'donations'),
          where('memberId', '==', memberId),
          where('status', '==', 'completed')
        );
        
        const donationsSnapshot = await getDocs(donationsQuery);
        donationsSnapshot.forEach((donationDoc) => {
          totalDonations += donationDoc.data().amount || 0;
        });
      }
      
      console.log(`✅ Total donations: ₹${totalDonations}`);
      return totalDonations;
    } catch (error) {
      console.error('❌ Error getting total donations:', error);
      return 0;
    }
  },

  // ============================================================
  // 4. CALCULATE SECONDARY COMMISSIONS (UPLINE)
  // ============================================================
  async calculateSecondaryCommissions(sponsorId, registrationAmount, newMemberId) {
    const commissions = [];
    let currentId = sponsorId;
    let level = 1;
    const maxDepth = 10;
    
    console.log('🔵 Calculating secondary commissions for sponsor:', sponsorId);
    
    while (currentId && level <= maxDepth) {
      try {
        // Get upline member
        const uplineDoc = await getDoc(doc(db, 'users', currentId));
        const uplineData = uplineDoc.data();
        
        if (!uplineData) {
          console.log(`❌ Upline not found at level ${level}`);
          break;
        }
        
        console.log(`📊 Upline level ${level}:`, uplineData.name || 'Unknown', 'Role:', uplineData.role);
        
        // Check both 'working' and 'workingMember' roles
        const isWorkingMember = uplineData.role === 'working' || 
                               uplineData.role === 'workingMember';
        
        if (!isWorkingMember) {
          console.log(`❌ Upline at level ${level} is not a working member. Role: ${uplineData.role}`);
          // Continue to next level instead of breaking
          currentId = uplineData.sponsorId;
          level++;
          continue;
        }
        
        // Get commission rate for this level
        const uplineLevel = uplineData.level || 'I';
        const commissionRates = getCommissionRates(uplineLevel);
        const secondaryRate = commissionRates.secondary || 0;
        
        console.log(`📊 Upline Level ${level}: ${uplineLevel}, Secondary Rate: ${secondaryRate}%`);
        
        if (secondaryRate > 0) {
          const commissionAmount = (registrationAmount * secondaryRate) / 100;
          
          // Add secondary commission to upline's wallet
          await WalletService.addCommission(
            currentId,
            commissionAmount,
            'secondary_commission',
            `Secondary commission (Level ${level}) - ${secondaryRate}%`,
            newMemberId
          );
          
          commissions.push({
            level: level,
            userId: currentId,
            name: uplineData.fullName || uplineData.name || 'Unknown',
            amount: commissionAmount,
            percentage: secondaryRate,
            title: uplineData.levelTitle || uplineLevel
          });
          
          console.log(`✅ Secondary commission level ${level}: ₹${commissionAmount} to ${uplineData.fullName || uplineData.name}`);
        }
        
        // Move to next upline
        currentId = uplineData.sponsorId;
        level++;
        
      } catch (error) {
        console.error(`❌ Error processing upline level ${level}:`, error);
        break;
      }
    }
    
    console.log(`✅ Secondary commissions calculation complete. Total: ${commissions.length} levels`);
    return commissions;
  },

  // ============================================================
  // 5. UPDATE SPONSOR'S DIRECT REFERRALS
  // ============================================================
  async updateDirectReferrals(sponsorId, newMemberId) {
    try {
      console.log('📝 Updating direct referrals for sponsor:', sponsorId);
      
      const userRef = doc(db, 'users', sponsorId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      const currentReferrals = userData.directReferrals || [];
      if (!currentReferrals.includes(newMemberId)) {
        currentReferrals.push(newMemberId);
      }
      
      await updateDoc(userRef, {
        directReferrals: currentReferrals,
        updatedAt: Timestamp.now()
      });
      
      console.log(`✅ Direct referrals updated. Total: ${currentReferrals.length}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating direct referrals:', error);
      throw error;
    }
  },

  // ============================================================
  // 6. GET COMMISSION SUMMARY FOR A USER
  // ============================================================
  async getCommissionSummary(userId) {
    try {
      console.log('📊 Getting commission summary for user:', userId);
      
      const q = query(
        collection(db, 'walletTransactions'),
        where('userId', '==', userId),
        where('type', 'in', ['direct_commission', 'secondary_commission'])
      );
      
      const querySnapshot = await getDocs(q);
      let totalDirect = 0;
      let totalSecondary = 0;
      let countDirect = 0;
      let countSecondary = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'direct_commission') {
          totalDirect += data.amount || 0;
          countDirect++;
        } else if (data.type === 'secondary_commission') {
          totalSecondary += data.amount || 0;
          countSecondary++;
        }
      });
      
      console.log(`✅ Commission summary: Direct: ₹${totalDirect}, Secondary: ₹${totalSecondary}`);
      
      return {
        totalDirect,
        totalSecondary,
        countDirect,
        countSecondary,
        totalEarned: totalDirect + totalSecondary
      };
    } catch (error) {
      console.error('❌ Error getting commission summary:', error);
      return {
        totalDirect: 0,
        totalSecondary: 0,
        countDirect: 0,
        countSecondary: 0,
        totalEarned: 0
      };
    }
  },

  // ============================================================
  // 7. GET COMMISSION HISTORY (ADMIN)
  // ============================================================
  async getAllCommissionTransactions(limit = 100) {
    try {
      console.log('📊 Getting all commission transactions...');
      
      const q = query(
        collection(db, 'walletTransactions'),
        where('type', 'in', ['direct_commission', 'secondary_commission']),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );
      
      const querySnapshot = await getDocs(q);
      const transactions = [];
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        // Get user details
        const userDoc = await getDoc(doc(db, 'users', data.userId));
        const userData = userDoc.exists() ? userDoc.data() : null;
        
        transactions.push({
          id: doc.id,
          ...data,
          userName: userData?.fullName || userData?.name || 'Unknown',
          userEmail: userData?.email || 'Unknown'
        });
      }
      
      console.log(`✅ Found ${transactions.length} transactions`);
      return transactions;
    } catch (error) {
      console.error('❌ Error getting all transactions:', error);
      return [];
    }
  },

  // ============================================================
  // 8. GET TOP EARNERS
  // ============================================================
  async getTopEarners(limit = 10) {
    try {
      console.log('📊 Getting top earners...');
      
      const q = query(
        collection(db, 'users'),
        where('role', 'in', ['working', 'workingMember'])
      );
      
      const querySnapshot = await getDocs(q);
      const earners = [];
      
      for (const doc of querySnapshot.docs) {
        const userData = doc.data();
        const wallet = await WalletService.getOrCreateWallet(doc.id);
        
        // Get total donations from this working member's registered members
        const totalDonations = await this.getTotalDonationsByMember(doc.id);
        
        earners.push({
          id: doc.id,
          name: userData.fullName || userData.name || 'Unknown',
          email: userData.email,
          level: userData.level || 'I',
          totalEarned: wallet.totalEarned || 0,
          directReferrals: userData.directReferrals?.length || 0,
          donationCommission: userData.totalDonationCommission || 0,
          totalDonationsFromMembers: totalDonations
        });
      }
      
      // Sort by total earned
      earners.sort((a, b) => b.totalEarned - a.totalEarned);
      
      console.log(`✅ Top earners: ${earners.slice(0, limit).length} found`);
      return earners.slice(0, limit);
    } catch (error) {
      console.error('❌ Error getting top earners:', error);
      return [];
    }
  },

  // ============================================================
  // 9. PROCESS PAYOUT FOR A SINGLE COMMISSION
  // ============================================================
  async processPayout(transactionId, amount, note = '') {
    try {
      console.log('💰 Processing payout for transaction:', transactionId);
      
      const transactionRef = doc(db, 'walletTransactions', transactionId);
      
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(transactionRef);
        if (!docSnap.exists()) {
          throw new Error('Transaction not found');
        }
        
        const data = docSnap.data();
        
        // Update transaction status
        transaction.update(transactionRef, {
          status: 'completed',
          paidAt: Timestamp.now(),
          paidAmount: amount || data.amount,
          note: note || 'Commission payout processed',
          updatedAt: Timestamp.now()
        });
        
        // Update wallet
        const walletRef = doc(db, 'wallets', data.userId);
        const walletSnap = await transaction.get(walletRef);
        if (walletSnap.exists()) {
          transaction.update(walletRef, {
            balance: increment(amount || data.amount),
            totalEarned: increment(amount || data.amount),
            pendingCommission: increment(-(amount || data.amount)),
            updatedAt: Timestamp.now()
          });
        }
      });
      
      console.log('✅ Payout processed successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error processing payout:', error);
      throw error;
    }
  },

  // ============================================================
  // 10. GET PENDING COMMISSIONS FOR A USER
  // ============================================================
  async getPendingCommissions(userId) {
    try {
      console.log('📊 Getting pending commissions for user:', userId);
      
      const q = query(
        collection(db, 'walletTransactions'),
        where('userId', '==', userId),
        where('type', 'in', ['direct_commission', 'secondary_commission']),
        where('status', '==', 'pending')
      );
      
      const querySnapshot = await getDocs(q);
      const commissions = [];
      let totalPending = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        commissions.push({ id: doc.id, ...data });
        totalPending += data.amount || 0;
      });
      
      console.log(`✅ Found ${commissions.length} pending commissions totaling ₹${totalPending}`);
      return {
        commissions,
        totalPending
      };
    } catch (error) {
      console.error('❌ Error getting pending commissions:', error);
      return { commissions: [], totalPending: 0 };
    }
  },

  // ============================================================
  // 11. GET DONATION COMMISSION HISTORY FOR A WORKING MEMBER
  // ============================================================
  async getDonationCommissionHistory(workingMemberId, limit = 50) {
    try {
      console.log('📊 Getting donation commission history for:', workingMemberId);
      
      const q = query(
        collection(db, 'commissionLogs'),
        where('workingMemberId', '==', workingMemberId),
        where('type', '==', 'donation_commission'),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );
      
      const querySnapshot = await getDocs(q);
      const history = [];
      
      querySnapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`✅ Found ${history.length} donation commission records`);
      return history;
    } catch (error) {
      console.error('❌ Error getting donation commission history:', error);
      return [];
    }
  },

  // ============================================================
  // 12. GET TOTAL DONATION COMMISSION FOR A WORKING MEMBER
  // ============================================================
  async getTotalDonationCommission(workingMemberId) {
    try {
      console.log('📊 Getting total donation commission for:', workingMemberId);
      
      const userDoc = await getDoc(doc(db, 'users', workingMemberId));
      const userData = userDoc.data();
      
      const total = userData.totalDonationCommission || 0;
      console.log(`✅ Total donation commission: ₹${total}`);
      
      return total;
    } catch (error) {
      console.error('❌ Error getting total donation commission:', error);
      return 0;
    }
  },

  // ============================================================
  // 13. GET PROMOTION PROGRESS FOR A WORKING MEMBER
  // ============================================================
  async getPromotionProgress(workingMemberId) {
    try {
      console.log('📊 Getting promotion progress for:', workingMemberId);
      
      const userDoc = await getDoc(doc(db, 'users', workingMemberId));
      const userData = userDoc.data();
      
      const currentLevel = userData.level || 'I';
      const directReferrals = userData.directReferrals || [];
      const memberCount = directReferrals.length;
      
      // Get total donations from members
      const totalDonations = await this.getTotalDonationsByMember(workingMemberId);
      
      const nextLevelId = getNextLevel(currentLevel);
      if (!nextLevelId) {
        return {
          currentLevel,
          memberCount,
          totalDonations,
          nextLevel: null,
          isMaxLevel: true,
          message: 'You are at the highest level! 🎉'
        };
      }
      
      const nextLevel = getLevelDetails(nextLevelId);
      const requirements = getPromotionRequirements(currentLevel);
      
      const membersNeeded = Math.max(0, nextLevel.minMembers - memberCount);
      const donationsNeeded = Math.max(0, nextLevel.minDonations - totalDonations);
      
      const isEligible = isEligibleForPromotion(currentLevel, memberCount, totalDonations);
      
      return {
        currentLevel,
        currentLevelTitle: getLevelDetails(currentLevel).title,
        memberCount,
        totalDonations,
        nextLevel: nextLevelId,
        nextLevelTitle: nextLevel.title,
        membersNeeded,
        donationsNeeded,
        isEligible,
        isMaxLevel: false,
        requirements,
        progress: {
          members: Math.min((memberCount / nextLevel.minMembers) * 100, 100),
          donations: Math.min((totalDonations / nextLevel.minDonations) * 100, 100)
        }
      };
    } catch (error) {
      console.error('❌ Error getting promotion progress:', error);
      return null;
    }
  }
};