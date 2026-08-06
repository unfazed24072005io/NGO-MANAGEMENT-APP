// services/paymentService.js
import { Platform } from 'react-native';

// Test Keys (Development)
const RAZORPAY_KEY = 'rzp_test_TMRfz7C8JokRH7';
const RAZORPAY_SECRET = 'UviRcSd3oJFI4JNt37ElSK4w';

// Generate unique order ID
const generateOrderId = () => {
  return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Create order (client-side)
export const createRazorpayOrder = async (amount, currency = 'INR') => {
  try {
    // ✅ Convert to paise (multiply by 100) and ensure it's a number
    const amountInPaise = Math.round(parseFloat(amount) * 100);
    
    if (amountInPaise < 100) {
      throw new Error('Minimum amount is ₹1');
    }

    const orderId = generateOrderId();
    
    const orderData = {
      orderId: orderId,
      amount: amountInPaise,  // ✅ This should be a NUMBER
      currency: currency,
      receipt: `receipt_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'created',
    };

    if (typeof global.orders === 'undefined') {
      global.orders = {};
    }
    global.orders[orderId] = orderData;

    return orderData;
  } catch (error) {
    console.error('Order creation failed:', error);
    throw new Error(error.message || 'Failed to create order');
  }
};

// Initiate Razorpay Payment - Web Version
const initiateWebPayment = async (paymentData) => {
  const { amount, name, email, phone, description, orderId } = paymentData;

  return new Promise((resolve) => {
    // Remove existing script to avoid conflicts
    const existingScript = document.querySelector('script[src*="razorpay"]');
    if (existingScript) existingScript.remove();

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      try {
        // Ensure amount is in paise
        const amountInPaise = Math.round(parseFloat(amount) * 100);
        
        const options = {
          key: RAZORPAY_KEY,
          amount: amountInPaise,
          currency: 'INR',
          name: 'Kabir Satdharm Foundation',
          description: description || 'Donation',
          order_id: orderId,
          prefill: {
            name: name || 'Anonymous Donor',
            email: email || 'user@example.com',
            contact: phone || '9876543210',
          },
          theme: { color: '#FF7722' },
          modal: {
            ondismiss: function() {
              resolve({ success: false, error: 'Payment cancelled' });
            },
          },
        };

        const razorpay = new window.Razorpay(options);
        
        razorpay.on('payment.success', function(response) {
          const paymentResult = {
            success: true,
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
            amount: amount,
            name: name,
            email: email,
            phone: phone,
            timestamp: new Date().toISOString(),
          };

          if (typeof global.payments === 'undefined') {
            global.payments = [];
          }
          global.payments.push(paymentResult);

          if (typeof global.paymentDetails === 'undefined') {
            global.paymentDetails = {};
          }
          global.paymentDetails[response.razorpay_payment_id] = paymentResult;

          resolve(paymentResult);
        });

        razorpay.on('payment.error', function(response) {
          resolve({ 
            success: false, 
            error: response.error?.description || 'Payment failed' 
          });
        });

        razorpay.open();
      } catch (error) {
        console.error('Razorpay init error:', error);
        resolve({ success: false, error: error.message || 'Payment initialization failed' });
      }
    };
    script.onerror = () => {
      resolve({ success: false, error: 'Failed to load Razorpay SDK' });
    };
    document.head.appendChild(script);
  });
};

// Initiate Razorpay Payment - Native Version (Android/iOS)
const initiateNativePayment = async (paymentData) => {
  try {
    const RazorpayCheckout = require('react-native-razorpay').default;
    
    const { amount, name, email, phone, description, orderId } = paymentData;

    // Ensure amount is in paise
    const amountInPaise = Math.round(parseFloat(amount) * 100);

    const options = {
      description: description || 'Donation to NGO',
      image: 'https://via.placeholder.com/150/FF7722/FFFFFF?text=NGO',
      currency: 'INR',
      key: RAZORPAY_KEY,
      amount: amountInPaise,
      name: 'Kabir Satdharm Foundation',
      order_id: orderId,
      prefill: {
        email: email || 'user@example.com',
        contact: phone || '9876543210',
        name: name || 'Anonymous Donor',
      },
      theme: { color: '#FF7722' },
      modal: {
        ondismiss: function() {
          console.log('Payment modal closed');
        },
      },
    };

    const data = await RazorpayCheckout.open(options);
    
    const paymentResult = {
      success: true,
      paymentId: data.razorpay_payment_id,
      orderId: data.razorpay_order_id,
      signature: data.razorpay_signature,
      amount: amount,
      name: name,
      email: email,
      phone: phone,
      timestamp: new Date().toISOString(),
    };

    if (typeof global.payments === 'undefined') {
      global.payments = [];
    }
    global.payments.push(paymentResult);

    if (typeof global.paymentDetails === 'undefined') {
      global.paymentDetails = {};
    }
    global.paymentDetails[data.razorpay_payment_id] = paymentResult;

    return paymentResult;
  } catch (error) {
    console.error('Payment error:', error);
    return {
      success: false,
      error: error.description || 'Payment failed',
      code: error.code,
    };
  }
};

// Main function - chooses between Web and Native
export const initiateRazorpayPayment = async (paymentData) => {
  if (Platform.OS === 'web') {
    return await initiateWebPayment(paymentData);
  } else {
    return await initiateNativePayment(paymentData);
  }
};

// Verify payment (client-side)
export const verifyRazorpayPayment = async (paymentData) => {
  try {
    const { paymentId, orderId, signature } = paymentData;
    
    const payment = global.paymentDetails?.[paymentId];
    
    if (!payment) {
      return {
        success: false,
        message: 'Payment not found',
      };
    }

    if (payment.orderId !== orderId) {
      return {
        success: false,
        message: 'Order mismatch',
      };
    }

    payment.status = 'verified';
    payment.verifiedAt = new Date().toISOString();

    if (typeof global.donationHistory === 'undefined') {
      global.donationHistory = [];
    }
    global.donationHistory.push({
      ...payment,
      verified: true,
    });

    return {
      success: true,
      message: 'Payment verified successfully',
      payment: payment,
    };
  } catch (error) {
    console.error('Payment verification failed:', error);
    return {
      success: false,
      message: 'Verification failed',
    };
  }
};

// ============================================
// ✅ EXPORT THESE FUNCTIONS - FIX FOR ERROR
// ============================================

// Get donation history
export const getDonationHistory = () => {
  return global.donationHistory || [];
};

// Get specific donation by ID
export const getDonationById = (paymentId) => {
  return global.paymentDetails?.[paymentId] || null;
};

// Get total donations amount
export const getTotalDonations = () => {
  const history = getDonationHistory();
  return history.reduce((total, donation) => total + donation.amount, 0);
};

// Get donation count
export const getDonationCount = () => {
  return getDonationHistory().length;
};

// Get all payments (for debugging)
export const getAllPayments = () => {
  return global.payments || [];
};

// Clear all payment data (for testing)
export const clearPaymentData = () => {
  global.payments = [];
  global.paymentDetails = {};
  global.donationHistory = [];
  global.orders = {};
};