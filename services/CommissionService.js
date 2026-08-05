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
import { getLevelDetails, getCommissionRates } from '../config/commissionLevels';
import { WalletService } from './WalletService';
import { LevelUpdateService } from './LevelUpdateService';

export const CommissionService = {
  // Process commission on new member registration
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
      
      // ✅ FIX: Check both 'working' and 'workingMember' roles
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
      
      // 5. Update sponsor's level
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

  // Calculate secondary commissions for upline
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
        
        // ✅ FIX: Check both 'working' and 'workingMember' roles
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

  // Update sponsor's direct referrals
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

  // Get commission summary for a user
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

  // Get commission history (Admin)
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

  // Get top earners
  async getTopEarners(limit = 10) {
    try {
      console.log('📊 Getting top earners...');
      
      // ✅ FIX: Check both 'working' and 'workingMember' roles
      const q = query(
        collection(db, 'users'),
        where('role', 'in', ['working', 'workingMember'])
      );
      
      const querySnapshot = await getDocs(q);
      const earners = [];
      
      for (const doc of querySnapshot.docs) {
        const userData = doc.data();
        const wallet = await WalletService.getOrCreateWallet(doc.id);
        earners.push({
          id: doc.id,
          name: userData.fullName || userData.name || 'Unknown',
          email: userData.email,
          level: userData.level || 'I',
          totalEarned: wallet.totalEarned || 0,
          directReferrals: userData.directReferrals?.length || 0
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

  // ✅ NEW: Process payout for a single commission
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

  // ✅ NEW: Get pending commissions for a user
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
  }
};