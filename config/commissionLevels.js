// config/commissionLevels.js
export const LEVELS = {
  "I": {
    id: "I",
    title: "संत साधन",
    titleEn: "Customer",
    directCommission: 25,
    secondaryCommission: 10,
    minDonations: 0,
    maxDonations: 9999,
    color: "#9ca3af",
    badge: "🥉",
    description: "Starting level"
  },
  "II": {
    id: "II",
    title: "संत वेतन",
    titleEn: "Executive",
    directCommission: 35,
    secondaryCommission: 5,
    minDonations: 10000,
    maxDonations: 24999,
    color: "#3b82f6",
    badge: "🥈",
    description: "₹10,000+ donations"
  },
  "III": {
    id: "III",
    title: "संत प्रयोग",
    titleEn: "Manager",
    directCommission: 40,
    secondaryCommission: 2.5,
    minDonations: 25000,
    maxDonations: 49999,
    color: "#10b981",
    badge: "🥇",
    description: "₹25,000+ donations"
  },
  "IV": {
    id: "IV",
    title: "वैन प्रौद्योगिक",
    titleEn: "Coordinator",
    directCommission: 42.5,
    secondaryCommission: 1.25,
    minDonations: 50000,
    maxDonations: 99999,
    color: "#f59e0b",
    badge: "⭐",
    description: "₹50,000+ donations"
  },
  "V": {
    id: "V",
    title: "वैन मानकित",
    titleEn: "Guide",
    directCommission: 43.75,
    secondaryCommission: 1.25,
    minDonations: 100000,
    maxDonations: 249999,
    color: "#8b5cf6",
    badge: "🌟🌟",
    description: "₹1,00,000+ donations"
  },
  "VI": {
    id: "VI",
    title: "संत संरक्षण",
    titleEn: "Leader",
    directCommission: 44.5,
    secondaryCommission: 0.75,
    minDonations: 250000,
    maxDonations: 499999,
    color: "#ef4444",
    badge: "🌟🌟🌟",
    description: "₹2,50,000+ donations"
  },
  "VII": {
    id: "VII",
    title: "संत व्यापार",
    titleEn: "Crown",
    directCommission: 45,
    secondaryCommission: 0.50,
    minDonations: 500000,
    maxDonations: Infinity,
    color: "#fbbf24",
    badge: "👑",
    description: "₹5,00,000+ donations"
  }
};

// ============ HELPER FUNCTIONS ============

// Get level by donation amount ONLY
export const getLevelByDonations = (donationAmount) => {
  for (const [key, level] of Object.entries(LEVELS)) {
    if (donationAmount >= level.minDonations && donationAmount <= level.maxDonations) {
      return key;
    }
  }
  return "I";
};

// Get level by member count (deprecated - kept for compatibility)
// Now uses donations instead
export const getLevelByMemberCount = (count) => {
  return getLevelByDonations(count);
};

// Get level by both (deprecated - kept for compatibility)
// Now only uses donations
export const getLevelByMemberCountAndDonations = (memberCount, donationAmount) => {
  return getLevelByDonations(donationAmount);
};

// Helper function to get next level
export const getNextLevel = (currentLevelId) => {
  const levels = Object.keys(LEVELS);
  const currentIndex = levels.indexOf(currentLevelId);
  if (currentIndex < levels.length - 1) {
    return levels[currentIndex + 1];
  }
  return null;
};

// Helper function to get level details
export const getLevelDetails = (levelId) => {
  return LEVELS[levelId] || LEVELS["I"];
};

// Helper function to get level details with English title fallback
export const getLevelDetailsWithFallback = (levelId) => {
  const level = getLevelDetails(levelId);
  return {
    ...level,
    displayTitle: level.title || level.titleEn || level.id
  };
};

// Helper function to calculate progress to next level (DONATION ONLY)
export const getLevelProgress = (currentLevelId, currentDonations = 0) => {
  const currentLevel = getLevelDetails(currentLevelId);
  const nextLevelId = getNextLevel(currentLevelId);
  
  if (!nextLevelId) {
    return { 
      progress: 100, 
      nextLevel: null, 
      remainingDonations: 0,
      donationProgress: 100
    };
  }
  
  const nextLevel = getLevelDetails(nextLevelId);
  
  // Calculate donation-based progress ONLY
  const totalDonationsNeeded = nextLevel.minDonations - currentLevel.minDonations;
  const donationsAchieved = currentDonations - currentLevel.minDonations;
  const donationProgress = totalDonationsNeeded > 0 ? Math.min((donationsAchieved / totalDonationsNeeded) * 100, 100) : 100;
  const remainingDonations = Math.max(nextLevel.minDonations - currentDonations, 0);
  
  return {
    progress: donationProgress,
    nextLevel: nextLevelId,
    remainingDonations: remainingDonations,
    nextLevelTitle: nextLevel.title || nextLevel.titleEn || nextLevel.id,
    donationProgress: donationProgress
  };
};

// Get commission rates for a level
export const getCommissionRates = (levelId) => {
  const level = getLevelDetails(levelId);
  return {
    direct: level.directCommission,
    secondary: level.secondaryCommission
  };
};

// Get all level names (for dropdowns, etc.)
export const getLevelNames = () => {
  const names = {};
  for (const [key, level] of Object.entries(LEVELS)) {
    names[key] = level.title || level.titleEn || key;
  }
  return names;
};

// Get level by title (search)
export const getLevelByTitle = (title) => {
  for (const [key, level] of Object.entries(LEVELS)) {
    if (level.title === title || level.titleEn === title) {
      return key;
    }
  }
  return null;
};

// Check if eligible for promotion (DONATION ONLY)
export const isEligibleForPromotion = (currentLevelId, donationAmount = 0) => {
  const nextLevelId = getNextLevel(currentLevelId);
  if (!nextLevelId) return false;
  
  const nextLevel = getLevelDetails(nextLevelId);
  return donationAmount >= nextLevel.minDonations;
};

// Get promotion requirements (DONATION ONLY)
export const getPromotionRequirements = (currentLevelId) => {
  const nextLevelId = getNextLevel(currentLevelId);
  if (!nextLevelId) return null;
  
  const nextLevel = getLevelDetails(nextLevelId);
  return {
    nextLevelId: nextLevelId,
    nextLevelTitle: nextLevel.title || nextLevel.titleEn,
    requiredDonations: nextLevel.minDonations,
    requiredCommission: nextLevel.directCommission,
    secondaryCommission: nextLevel.secondaryCommission
  };
};

// Get level color
export const getLevelColor = (levelId) => {
  const level = getLevelDetails(levelId);
  return level.color || "#6b7280";
};

// Get level badge
export const getLevelBadge = (levelId) => {
  const level = getLevelDetails(levelId);
  return level.badge || "⭐";
};

// Get donations needed for next level
export const getDonationsNeededForNextLevel = (currentLevelId, currentDonations = 0) => {
  const nextLevelId = getNextLevel(currentLevelId);
  if (!nextLevelId) return 0;
  
  const nextLevel = getLevelDetails(nextLevelId);
  return Math.max(0, nextLevel.minDonations - currentDonations);
};

// Get current donation progress percentage
export const getDonationProgress = (currentLevelId, currentDonations = 0) => {
  const nextLevelId = getNextLevel(currentLevelId);
  if (!nextLevelId) return 100;
  
  const nextLevel = getLevelDetails(nextLevelId);
  const currentLevel = getLevelDetails(currentLevelId);
  const totalNeeded = nextLevel.minDonations - currentLevel.minDonations;
  const achieved = currentDonations - currentLevel.minDonations;
  
  return totalNeeded > 0 ? Math.min((achieved / totalNeeded) * 100, 100) : 100;
};