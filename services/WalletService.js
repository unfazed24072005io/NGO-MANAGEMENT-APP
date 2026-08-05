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
        
        // Update wallet
        transaction.update(walletRef, {
          balance: increment(amount),
          totalEarned: increment(amount),
          pendingCommission: increment(amount),
          updatedAt: Timestamp.now()
        });
        
        // Create transaction record
        const transactionRef = doc(collection(db, 'walletTransactions'));
        transaction.set(transactionRef, {
          userId: userId,
          amount: amount,
          type: type, // 'direct_commission', 'secondary_commission', 'withdrawal'
          status: 'pending',
          description: description,
          referenceId: referenceId,
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
  }
};