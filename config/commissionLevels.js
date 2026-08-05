// config/commissionLevels.js
export const LEVELS = {
  "I": {
    id: "I",
    title: "Customer",
    directCommission: 25,
    secondaryCommission: 10,        // ← Changed from 0 to 10
    minMembers: 0,
    maxMembers: 4,
    color: "#9ca3af",
    badge: "🥉",
    description: "Starting level"
  },
  "II": {
    id: "II",
    title: "Executive",
    directCommission: 35,
    secondaryCommission: 5,         // ← Changed from 10 to 5
    minMembers: 5,
    maxMembers: 9,
    color: "#3b82f6",
    badge: "🥈",
    description: "5-9 direct members"
  },
  "III": {
    id: "III",
    title: "Manager",
    directCommission: 40,
    secondaryCommission: 2.5,       // ← Changed from 5 to 2.5
    minMembers: 10,
    maxMembers: 24,
    color: "#10b981",
    badge: "🥇",
    description: "10-24 direct members"
  },
  "IV": {
    id: "IV",
    title: "Coordinator",
    directCommission: 42.5,
    secondaryCommission: 1.25,      // ← Changed from 2.5 to 1.25
    minMembers: 25,
    maxMembers: 49,
    color: "#f59e0b",
    badge: "⭐",
    description: "25-49 direct members"
  },
  "V": {
    id: "V",
    title: "Guide",
    directCommission: 43.75,
    secondaryCommission: 1.25,      // ✅ Correct
    minMembers: 50,
    maxMembers: 99,
    color: "#8b5cf6",
    badge: "🌟🌟",
    description: "50-99 direct members"
  },
  "VI": {
    id: "VI",
    title: "Leader",
    directCommission: 44.5,
    secondaryCommission: 0.75,      // ✅ Correct
    minMembers: 100,
    maxMembers: 199,
    color: "#ef4444",
    badge: "🌟🌟🌟",
    description: "100-199 direct members"
  },
  "VII": {
    id: "VII",
    title: "Crown",
    directCommission: 45,
    secondaryCommission: 0.50,      // ✅ Correct
    minMembers: 200,
    maxMembers: Infinity,
    color: "#fbbf24",
    badge: "👑",
    description: "200+ direct members"
  }
};

// Helper function to get level by member count
export const getLevelByMemberCount = (count) => {
  for (const [key, level] of Object.entries(LEVELS)) {
    if (count >= level.minMembers && count <= level.maxMembers) {
      return key;
    }
  }
  return "I"; // Default to Customer
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

// Helper function to calculate progress to next level
export const getLevelProgress = (currentLevelId, currentMemberCount) => {
  const currentLevel = getLevelDetails(currentLevelId);
  const nextLevelId = getNextLevel(currentLevelId);
  
  if (!nextLevelId) {
    return { progress: 100, nextLevel: null, remaining: 0 };
  }
  
  const nextLevel = getLevelDetails(nextLevelId);
  const totalNeeded = nextLevel.minMembers - currentLevel.minMembers;
  const achieved = currentMemberCount - currentLevel.minMembers;
  const progress = Math.min((achieved / totalNeeded) * 100, 100);
  const remaining = Math.max(nextLevel.minMembers - currentMemberCount, 0);
  
  return {
    progress,
    nextLevel: nextLevelId,
    remaining,
    nextLevelTitle: nextLevel.title
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