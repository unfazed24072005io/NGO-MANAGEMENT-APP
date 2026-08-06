// services/WalletService.js
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

export const WalletService = {
  // Get or create wallet for user
  async getOrCreateWallet(userId) {
    try {
      const walletRef = doc(db, 'wallets', userId);
      const walletDoc = await getDoc(walletRef);
      
      if (walletDoc.exists()) {
        return { id: walletDoc.id, ...walletDoc.data() };
      } else {
        // Create new wallet
        const newWallet = {
          userId: userId,
          balance: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
          pendingCommission: 0,
          donationCommission: 0, // NEW: Track donation commission separately
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        await setDoc(walletRef, newWallet);
        return { id: userId, ...newWallet };
      }
    } catch (error) {
      console.error('Error getting wallet:', error);
      throw error;
    }
  },

  // Add commission to wallet
  async addCommission(userId, amount, type, description, referenceId) {
    try {
      const walletRef = doc(db, 'wallets', userId);
      
      // Use transaction for atomic update
      await runTransaction(db, async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        const walletData = walletDoc.data();
        
        // Determine if this is a donation commission
        const isDonation = description?.toLowerCase().includes('donation') || false;
        
        // Update wallet
        const updates = {
          balance: increment(amount),
          totalEarned: increment(amount),
          pendingCommission: increment(amount),
          updatedAt: Timestamp.now()
        };
        
        // If donation commission, update donationCommission field
        if (isDonation) {
          updates.donationCommission = increment(amount);
        }
        
        transaction.update(walletRef, updates);
        
        // Create transaction record
        const transactionRef = doc(collection(db, 'walletTransactions'));
        transaction.set(transactionRef, {
          userId: userId,
          amount: amount,
          type: type, // 'direct_commission', 'secondary_commission', 'donation_commission', 'withdrawal'
          status: 'pending',
          description: description,
          referenceId: referenceId,
          isDonation: isDonation, // NEW: Flag for donation commissions
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error adding commission:', error);
      throw error;
    }
  },

  // Add donation commission specifically (NEW)
  async addDonationCommission(userId, amount, description, referenceId) {
    try {
      const walletRef = doc(db, 'wallets', userId);
      
      await runTransaction(db, async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        const walletData = walletDoc.data();
        
        transaction.update(walletRef, {
          balance: increment(amount),
          totalEarned: increment(amount),
          pendingCommission: increment(amount),
          donationCommission: increment(amount),
          updatedAt: Timestamp.now()
        });
        
        const transactionRef = doc(collection(db, 'walletTransactions'));
        transaction.set(transactionRef, {
          userId: userId,
          amount: amount,
          type: 'donation_commission',
          status: 'pending',
          description: description,
          referenceId: referenceId,
          isDonation: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error adding donation commission:', error);
      throw error;
    }
  },

  // Get donation commission total (NEW)
  async getDonationCommissionTotal(userId) {
    try {
      const walletRef = doc(db, 'wallets', userId);
      const walletDoc = await getDoc(walletRef);
      
      if (walletDoc.exists()) {
        return walletDoc.data().donationCommission || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error getting donation commission total:', error);
      return 0;
    }
  },

  // Process withdrawal
  async processWithdrawal(userId, amount, bankDetails) {
    try {
      const walletRef = doc(db, 'wallets', userId);
      
      return await runTransaction(db, async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        const walletData = walletDoc.data();
        
        if (walletData.balance < amount) {
          throw new Error('Insufficient balance');
        }
        
        // Update wallet
        transaction.update(walletRef, {
          balance: increment(-amount),
          totalWithdrawn: increment(amount),
          updatedAt: Timestamp.now()
        });
        
        // Create withdrawal request
        const withdrawalRef = doc(collection(db, 'withdrawals'));
        transaction.set(withdrawalRef, {
          userId: userId,
          amount: amount,
          bankDetails: bankDetails,
          status: 'pending',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        
        // Create transaction record
        const transactionRef = doc(collection(db, 'walletTransactions'));
        transaction.set(transactionRef, {
          userId: userId,
          amount: -amount,
          type: 'withdrawal',
          status: 'pending',
          description: `Withdrawal request - ${bankDetails.bankName}`,
          isDonation: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        
        return { success: true, transactionId: withdrawalRef.id };
      });
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      throw error;
    }
  },

  // Get wallet transactions
  async getWalletTransactions(userId, limit = 50) {
    try {
      const q = query(
        collection(db, 'walletTransactions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );
      
      const querySnapshot = await getDocs(q);
      const transactions = [];
      querySnapshot.forEach((doc) => {
        transactions.push({ id: doc.id, ...doc.data() });
      });
      
      return transactions;
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  },

  // Get donation transactions only (NEW)
  async getDonationTransactions(userId, limit = 50) {
    try {
      const q = query(
        collection(db, 'walletTransactions'),
        where('userId', '==', userId),
        where('type', '==', 'donation_commission'),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );
      
      const querySnapshot = await getDocs(q);
      const transactions = [];
      querySnapshot.forEach((doc) => {
        transactions.push({ id: doc.id, ...doc.data() });
      });
      
      return transactions;
    } catch (error) {
      console.error('Error getting donation transactions:', error);
      throw error;
    }
  },

  // Get wallet summary with donation breakdown (NEW)
  async getWalletSummary(userId) {
    try {
      const wallet = await this.getOrCreateWallet(userId);
      const transactions = await this.getWalletTransactions(userId, 100);
      
      let totalDirect = 0;
      let totalSecondary = 0;
      let totalDonation = 0;
      let totalWithdrawn = 0;
      let pending = 0;
      
      transactions.forEach((t) => {
        if (t.status === 'pending' || t.status === 'partially_paid') {
          pending += Math.abs(t.amount || 0);
        } else if (t.status === 'completed' || t.status === 'paid') {
          if (t.type === 'direct_commission') {
            totalDirect += t.amount || 0;
          } else if (t.type === 'secondary_commission') {
            totalSecondary += t.amount || 0;
          } else if (t.type === 'donation_commission') {
            totalDonation += t.amount || 0;
          } else if (t.type === 'withdrawal') {
            totalWithdrawn += Math.abs(t.amount || 0);
          }
        }
      });
      
      return {
        balance: wallet.balance || 0,
        totalEarned: wallet.totalEarned || 0,
        totalWithdrawn: wallet.totalWithdrawn || 0,
        pendingCommission: wallet.pendingCommission || 0,
        donationCommission: wallet.donationCommission || 0,
        breakdown: {
          direct: totalDirect,
          secondary: totalSecondary,
          donation: totalDonation,
          withdrawn: totalWithdrawn,
          pending: pending
        }
      };
    } catch (error) {
      console.error('Error getting wallet summary:', error);
      throw error;
    }
  },

  // Approve withdrawal (Admin)
  async approveWithdrawal(withdrawalId) {
    try {
      const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
      await updateDoc(withdrawalRef, {
        status: 'approved',
        approvedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      // Update transaction status
      const q = query(
        collection(db, 'walletTransactions'),
        where('referenceId', '==', withdrawalId)
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (doc) => {
        await updateDoc(doc.ref, {
          status: 'completed',
          updatedAt: Timestamp.now()
        });
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      throw error;
    }
  },

  // Reject withdrawal (Admin)
  async rejectWithdrawal(withdrawalId, reason) {
    try {
      const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
      const withdrawalDoc = await getDoc(withdrawalRef);
      const withdrawalData = withdrawalDoc.data();
      
      // Refund balance
      const walletRef = doc(db, 'wallets', withdrawalData.userId);
      await updateDoc(walletRef, {
        balance: increment(withdrawalData.amount),
        updatedAt: Timestamp.now()
      });
      
      // Update withdrawal status
      await updateDoc(withdrawalRef, {
        status: 'rejected',
        reason: reason,
        rejectedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      throw error;
    }
  },

  // Get pending withdrawals for a user
  async getPendingWithdrawals(userId) {
    try {
      const q = query(
        collection(db, 'withdrawals'),
        where('userId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const withdrawals = [];
      querySnapshot.forEach((doc) => {
        withdrawals.push({ id: doc.id, ...doc.data() });
      });
      
      return withdrawals;
    } catch (error) {
      console.error('Error getting pending withdrawals:', error);
      return [];
    }
  },

  // Get all pending withdrawals (Admin)
  async getAllPendingWithdrawals() {
    try {
      const q = query(
        collection(db, 'withdrawals'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const withdrawals = [];
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        // Get user details
        const userDoc = await getDoc(doc(db, 'users', data.userId));
        const userData = userDoc.exists() ? userDoc.data() : null;
        
        withdrawals.push({
          id: doc.id,
          ...data,
          userName: userData?.fullName || userData?.name || 'Unknown',
          userEmail: userData?.email || 'Unknown'
        });
      }
      
      return withdrawals;
    } catch (error) {
      console.error('Error getting all pending withdrawals:', error);
      return [];
    }
  }
};