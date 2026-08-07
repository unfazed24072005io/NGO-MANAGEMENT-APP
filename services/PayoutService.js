// services/PayoutService.js
import { db, auth } from '../config/firebase';
import { 
  doc, getDoc, updateDoc, increment, addDoc, collection,
  query, where, getDocs, runTransaction, Timestamp,
  setDoc
} from 'firebase/firestore';
import { WalletService } from './WalletService';

export const PayoutService = {
  /**
   * Process a single payout to a member's wallet
   * This adds money to the member's wallet balance
   */
  async processPayout(memberId, amount, type = 'commission_payout', description = '') {
    try {
      console.log(`💰 Processing payout: ₹${amount} to ${memberId}`);
      
      // Verify member exists
      const memberDoc = await getDoc(doc(db, 'users', memberId));
      if (!memberDoc.exists()) {
        throw new Error('Member not found');
      }
      const memberData = memberDoc.data();
      
      // Process using transaction
      const result = await runTransaction(db, async (transaction) => {
        // 1. Get or create wallet
        const walletRef = doc(db, 'wallets', memberId);
        const walletSnap = await transaction.get(walletRef);
        
        if (walletSnap.exists()) {
          transaction.update(walletRef, {
            balance: increment(amount),
            totalEarned: increment(amount),
            updatedAt: Timestamp.now()
          });
        } else {
          transaction.set(walletRef, {
            userId: memberId,
            balance: amount,
            totalEarned: amount,
            totalWithdrawn: 0,
            pendingCommission: 0,
            donationCommission: 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        }
        
        // 2. Create payout transaction record
        const payoutRef = doc(collection(db, 'walletTransactions'));
        const payoutData = {
          userId: memberId,
          amount: amount,
          type: type,
          status: 'completed',
          description: description || `${type} payout processed by admin`,
          referenceId: `PAYOUT_${Date.now()}`,
          isDonation: type === 'donation_payout',
          processedBy: auth.currentUser?.uid || 'admin',
          processedAt: Timestamp.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        transaction.set(payoutRef, payoutData);
        
        // 3. Create payout log
        const logRef = doc(collection(db, 'payoutLogs'));
        transaction.set(logRef, {
          memberId: memberId,
          memberName: memberData.fullName || memberData.name || 'Unknown',
          amount: amount,
          type: type,
          description: description,
          status: 'completed',
          processedBy: auth.currentUser?.uid || 'admin',
          processedAt: Timestamp.now(),
          createdAt: Timestamp.now()
        });
        
        return { payoutId: payoutRef.id, logId: logRef.id };
      });
      
      console.log(`✅ Payout completed: ₹${amount} to ${memberId}`);
      return { 
        success: true, 
        payoutId: result.payoutId,
        amount: amount,
        memberId: memberId
      };
      
    } catch (error) {
      console.error('❌ Payout failed:', error);
      throw error;
    }
  },

  /**
   * Process commission payout from pending commissions
   */
  async processCommissionPayout(transactionId, amount, memberId) {
    try {
      console.log(`💰 Processing commission payout: ₹${amount} from ${transactionId}`);
      
      const result = await runTransaction(db, async (transaction) => {
        // 1. Update the pending commission transaction
        const txRef = doc(db, 'walletTransactions', transactionId);
        const txSnap = await transaction.get(txRef);
        
        if (!txSnap.exists()) {
          throw new Error('Transaction not found');
        }
        
        const txData = txSnap.data();
        
        if (txData.status !== 'pending' && txData.status !== 'partially_paid') {
          throw new Error(`Transaction is already ${txData.status}`);
        }
        
        // Check if amount is valid
        const remainingAmount = txData.amount || 0;
        if (amount > remainingAmount) {
          throw new Error(`Amount exceeds remaining pending amount: ₹${remainingAmount}`);
        }
        
        // Update original transaction
        if (amount >= remainingAmount) {
          // Full payout
          transaction.update(txRef, {
            status: 'completed',
            paidAt: Timestamp.now(),
            paidAmount: amount,
            processedBy: auth.currentUser?.uid || 'admin',
            updatedAt: Timestamp.now()
          });
        } else {
          // Partial payout - update remaining amount
          transaction.update(txRef, {
            amount: remainingAmount - amount,
            status: 'partially_paid',
            paidAt: Timestamp.now(),
            paidAmount: amount,
            processedBy: auth.currentUser?.uid || 'admin',
            updatedAt: Timestamp.now()
          });
          
          // Create a new completed transaction for the paid portion
          const newTxRef = doc(collection(db, 'walletTransactions'));
          transaction.set(newTxRef, {
            userId: memberId,
            amount: amount,
            type: txData.type,
            status: 'completed',
            description: `Partial payout of ${txData.type}`,
            referenceId: txData.referenceId,
            isDonation: txData.isDonation || false,
            processedBy: auth.currentUser?.uid || 'admin',
            processedAt: Timestamp.now(),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        }
        
        // 2. Add to wallet balance
        const walletRef = doc(db, 'wallets', memberId);
        const walletSnap = await transaction.get(walletRef);
        
        if (walletSnap.exists()) {
          transaction.update(walletRef, {
            balance: increment(amount),
            totalEarned: increment(amount),
            pendingCommission: increment(-amount),
            updatedAt: Timestamp.now()
          });
        } else {
          // Create wallet if doesn't exist
          transaction.set(walletRef, {
            userId: memberId,
            balance: amount,
            totalEarned: amount,
            totalWithdrawn: 0,
            pendingCommission: 0,
            donationCommission: 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        }
        
        // 3. Create payout log
        const logRef = doc(collection(db, 'payoutLogs'));
        transaction.set(logRef, {
          memberId: memberId,
          transactionId: transactionId,
          amount: amount,
          type: 'commission_payout',
          status: 'completed',
          processedBy: auth.currentUser?.uid || 'admin',
          processedAt: Timestamp.now(),
          createdAt: Timestamp.now()
        });
      });
      
      console.log(`✅ Commission payout completed`);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Commission payout failed:', error);
      throw error;
    }
  },

  /**
   * Process donation commission payout
   */
  async processDonationCommissionPayout(memberId, amount, donationId = null) {
    try {
      console.log(`💰 Processing donation commission payout: ₹${amount} to ${memberId}`);
      
      const result = await runTransaction(db, async (transaction) => {
        // 1. Update wallet
        const walletRef = doc(db, 'wallets', memberId);
        const walletSnap = await transaction.get(walletRef);
        
        if (walletSnap.exists()) {
          transaction.update(walletRef, {
            balance: increment(amount),
            totalEarned: increment(amount),
            donationCommission: increment(amount),
            updatedAt: Timestamp.now()
          });
        } else {
          transaction.set(walletRef, {
            userId: memberId,
            balance: amount,
            totalEarned: amount,
            totalWithdrawn: 0,
            pendingCommission: 0,
            donationCommission: amount,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        }
        
        // 2. Create payout transaction
        const payoutRef = doc(collection(db, 'walletTransactions'));
        transaction.set(payoutRef, {
          userId: memberId,
          amount: amount,
          type: 'donation_payout',
          status: 'completed',
          description: 'Donation commission payout',
          referenceId: donationId || `DONATION_PAYOUT_${Date.now()}`,
          isDonation: true,
          processedBy: auth.currentUser?.uid || 'admin',
          processedAt: Timestamp.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        
        // 3. Create payout log
        const logRef = doc(collection(db, 'payoutLogs'));
        transaction.set(logRef, {
          memberId: memberId,
          donationId: donationId,
          amount: amount,
          type: 'donation_payout',
          status: 'completed',
          processedBy: auth.currentUser?.uid || 'admin',
          processedAt: Timestamp.now(),
          createdAt: Timestamp.now()
        });
      });
      
      console.log(`✅ Donation commission payout completed`);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Donation commission payout failed:', error);
      throw error;
    }
  },

  /**
   * Process bulk payouts
   */
  async processBulkPayouts(payouts) {
    const results = {
      success: [],
      failed: []
    };
    
    for (const payout of payouts) {
      try {
        if (payout.transactionId) {
          await this.processCommissionPayout(
            payout.transactionId,
            payout.amount,
            payout.memberId
          );
        } else {
          await this.processPayout(
            payout.memberId,
            payout.amount,
            payout.type || 'commission_payout',
            payout.description || ''
          );
        }
        results.success.push(payout);
      } catch (error) {
        results.failed.push({
          ...payout,
          error: error.message
        });
      }
    }
    
    return results;
  },

  /**
   * Get payout history for a member
   */
  async getPayoutHistory(memberId, limit = 50) {
    try {
      const q = query(
        collection(db, 'payoutLogs'),
        where('memberId', '==', memberId),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );
      
      const snapshot = await getDocs(q);
      const payouts = [];
      snapshot.forEach((doc) => {
        payouts.push({ id: doc.id, ...doc.data() });
      });
      
      return payouts;
    } catch (error) {
      console.error('Error getting payout history:', error);
      return [];
    }
  },

  /**
   * Get all payout logs (Admin)
   */
  async getAllPayoutLogs(limit = 100) {
    try {
      const q = query(
        collection(db, 'payoutLogs'),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );
      
      const snapshot = await getDocs(q);
      const payouts = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        // Get user details
        const userDoc = await getDoc(doc(db, 'users', data.memberId));
        const userData = userDoc.exists() ? userDoc.data() : null;
        
        payouts.push({
          id: doc.id,
          ...data,
          memberName: userData?.fullName || userData?.name || data.memberName || 'Unknown',
          memberEmail: userData?.email || 'Unknown'
        });
      }
      
      return payouts;
    } catch (error) {
      console.error('Error getting all payout logs:', error);
      return [];
    }
  },

  /**
   * Get payout statistics
   */
  async getPayoutStats() {
    try {
      const q = query(
        collection(db, 'payoutLogs'),
        where('status', '==', 'completed')
      );
      
      const snapshot = await getDocs(q);
      let totalAmount = 0;
      let count = 0;
      let byType = {};
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        totalAmount += data.amount || 0;
        count++;
        
        const type = data.type || 'unknown';
        byType[type] = (byType[type] || 0) + 1;
      });
      
      return {
        totalAmount,
        totalPayouts: count,
        byType,
        averageAmount: count > 0 ? totalAmount / count : 0
      };
    } catch (error) {
      console.error('Error getting payout stats:', error);
      return {
        totalAmount: 0,
        totalPayouts: 0,
        byType: {},
        averageAmount: 0
      };
    }
  }
};

export default PayoutService;