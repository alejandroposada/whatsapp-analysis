/**
 * Statistics calculation engine
 */

import { isNewConversation, isValidResponseTime, getResponseTimeBucket } from './utils.js';

/**
 * Calculate response times for all participants
 * @param {Array} messages - Sorted array of messages
 * @param {ChatData} chatData - Chat data model
 */
export function calculateResponseTimes(messages, chatData) {
  // Sort messages by timestamp
  const sortedMessages = [...messages].sort((a, b) =>
    a.timestamp.getTime() - b.timestamp.getTime()
  );

  // For each message, find the next message from a different participant
  for (let i = 0; i < sortedMessages.length - 1; i++) {
    const currentMsg = sortedMessages[i];
    const currentParticipant = currentMsg.participant;

    // Find next message from different participant
    for (let j = i + 1; j < sortedMessages.length; j++) {
      const nextMsg = sortedMessages[j];

      if (nextMsg.participant !== currentParticipant) {
        // Calculate time difference
        const timeDiff = nextMsg.timestamp.getTime() - currentMsg.timestamp.getTime();

        // Only count if within 24 hours (valid response time)
        if (isValidResponseTime(timeDiff)) {
          const responder = chatData.getParticipant(nextMsg.participant);
          if (responder) {
            responder.addResponseTime(timeDiff);
          }
        }

        break; // Found the response, move to next message
      }
    }
  }
}

/**
 * Calculate conversation starters for all participants
 * @param {Array} messages - Sorted array of messages
 * @param {ChatData} chatData - Chat data model
 */
export function calculateConversationStarters(messages, chatData) {
  // Sort messages by timestamp
  const sortedMessages = [...messages].sort((a, b) =>
    a.timestamp.getTime() - b.timestamp.getTime()
  );

  if (sortedMessages.length === 0) return;

  // First message is always a conversation starter
  const firstParticipant = chatData.getParticipant(sortedMessages[0].participant);
  if (firstParticipant) {
    firstParticipant.conversationsStarted++;
  }

  // Check each subsequent message
  for (let i = 1; i < sortedMessages.length; i++) {
    const currentMsg = sortedMessages[i];
    const previousMsg = sortedMessages[i - 1];

    const timeDiff = currentMsg.timestamp.getTime() - previousMsg.timestamp.getTime();

    // If gap is > 2 hours, this is a new conversation
    if (isNewConversation(timeDiff)) {
      const participant = chatData.getParticipant(currentMsg.participant);
      if (participant) {
        participant.conversationsStarted++;
      }
    }
  }
}

/**
 * Calculate message bursts for all participants
 * @param {Array} messages - Sorted array of messages
 * @param {ChatData} chatData - Chat data model
 */
export function calculateMessageBursts(messages, chatData) {
  const sortedMessages = [...messages].sort((a, b) =>
    a.timestamp.getTime() - b.timestamp.getTime()
  );

  let currentParticipant = null;
  let burstCount = 0;

  sortedMessages.forEach(msg => {
    if (msg.participant === currentParticipant) {
      burstCount++;
    } else {
      currentParticipant = msg.participant;
      burstCount = 0;
    }

    // If this is a burst (2+ consecutive messages), count it
    if (burstCount >= 1) {
      const participant = chatData.getParticipant(msg.participant);
      if (participant) {
        participant.burstCount++;
      }
    }
  });
}

/**
 * Calculate conversation streaks
 * @param {ChatData} chatData - Chat data model
 * @returns {Object} Streak information
 */
export function calculateStreaks(chatData) {
  const messages = chatData.messages;
  if (messages.length === 0) {
    return { currentStreak: 0, longestStreak: 0, streaks: [] };
  }

  // Get unique dates with messages
  const datesWithMessages = new Set();
  messages.forEach(msg => {
    const dateStr = msg.timestamp.toDateString();
    datesWithMessages.add(dateStr);
  });

  // Sort dates
  const sortedDates = Array.from(datesWithMessages)
    .map(d => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime());

  // Calculate streaks
  let currentStreak = 1;
  let longestStreak = 1;
  let currentStreakDays = [sortedDates[0]];
  const streaks = [];

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = sortedDates[i - 1];
    const currDate = sortedDates[i];

    // Calculate day difference
    const daysDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      // Consecutive day
      currentStreak++;
      currentStreakDays.push(currDate);
    } else {
      // Streak broken
      if (currentStreak >= 2) {
        streaks.push({
          length: currentStreak,
          startDate: currentStreakDays[0],
          endDate: currentStreakDays[currentStreakDays.length - 1]
        });
      }
      longestStreak = Math.max(longestStreak, currentStreak);
      currentStreak = 1;
      currentStreakDays = [currDate];
    }
  }

  // Check final streak
  if (currentStreak >= 2) {
    streaks.push({
      length: currentStreak,
      startDate: currentStreakDays[0],
      endDate: currentStreakDays[currentStreakDays.length - 1]
    });
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  // Check if current streak is active (last message within last 2 days)
  const lastDate = sortedDates[sortedDates.length - 1];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceLastMessage = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
  const activeStreak = daysSinceLastMessage <= 1 ? currentStreak : 0;

  return {
    currentStreak: activeStreak,
    longestStreak,
    streaks,
    totalDaysWithMessages: sortedDates.length
  };
}

/**
 * Calculate all statistics for the chat
 * @param {ChatData} chatData - Chat data model
 */
export function calculateAllStatistics(chatData) {
  calculateResponseTimes(chatData.messages, chatData);
  calculateConversationStarters(chatData.messages, chatData);
  calculateMessageBursts(chatData.messages, chatData);
}

/**
 * Get statistics for a specific participant or total
 * @param {ChatData} chatData - Chat data model
 * @param {string} participantName - Participant name or 'Total'
 * @returns {Object} Statistics object
 */
export function getStatistics(chatData, participantName = 'Total') {
  if (participantName === 'Total') {
    return getTotalStatistics(chatData);
  }

  const participant = chatData.getParticipant(participantName);
  if (!participant) {
    return null;
  }

  return getParticipantStatistics(participant, chatData);
}

/**
 * Get total statistics across all participants
 * @param {ChatData} chatData - Chat data model
 * @returns {Object} Total statistics
 */
function getTotalStatistics(chatData) {
  const totalStats = chatData.getTotalStats();
  const participants = chatData.getAllParticipants();

  // Calculate total response times
  let allResponseTimes = [];
  participants.forEach(p => {
    allResponseTimes = allResponseTimes.concat(p.responseTimes);
  });

  const avgResponseTime = allResponseTimes.length > 0
    ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length
    : 0;

  // Calculate total conversation starters
  const totalConversationsStarted = participants.reduce((sum, p) =>
    sum + p.conversationsStarted, 0
  );

  // Get top emojis
  const topEmojis = chatData.getTopEmojis(10);

  // Get response time distribution
  const responseTimeDistribution = getResponseTimeDistributionTotal(participants);

  // Get hourly distribution
  const hourlyDistribution = getHourlyDistribution(chatData, null);

  // Get daily distribution
  const dailyDistribution = getDailyDistribution(chatData, null);

  // Get activity heatmap
  const activityHeatmap = chatData.getActivityHeatmap(null);

  return {
    messageCount: totalStats.messageCount,
    wordCount: totalStats.wordCount,
    letterCount: totalStats.letterCount,
    emojiCount: totalStats.emojiCount,
    participantCount: totalStats.participantCount,
    averageResponseTime: avgResponseTime,
    conversationsStarted: totalConversationsStarted,
    topEmojis,
    responseTimeDistribution,
    hourlyDistribution,
    dailyDistribution,
    activityHeatmap,
    dateRange: {
      start: chatData.metadata.startDate,
      end: chatData.metadata.endDate
    }
  };
}

/**
 * Get statistics for a specific participant
 * @param {ParticipantData} participant - Participant data
 * @param {ChatData} chatData - Chat data model
 * @returns {Object} Participant statistics
 */
function getParticipantStatistics(participant, chatData) {
  const topEmojis = participant.getTopEmojis(10);
  const responseTimeDistribution = participant.getResponseTimeDistribution();
  const hourlyDistribution = getHourlyDistribution(chatData, participant.name);
  const dailyDistribution = getDailyDistribution(chatData, participant.name);
  const activityHeatmap = chatData.getActivityHeatmap(participant.name);

  return {
    name: participant.name,
    messageCount: participant.messageCount,
    wordCount: participant.wordCount,
    letterCount: participant.letterCount,
    emojiCount: participant.emojiCount,
    averageResponseTime: participant.getAverageResponseTime(),
    medianResponseTime: participant.getMedianResponseTime(),
    conversationsStarted: participant.conversationsStarted,
    topEmojis,
    responseTimeDistribution,
    hourlyDistribution,
    dailyDistribution,
    activityHeatmap,
    dateRange: {
      start: chatData.metadata.startDate,
      end: chatData.metadata.endDate
    }
  };
}

/**
 * Get response time distribution for all participants combined
 * @param {Array<ParticipantData>} participants - Array of participants
 * @returns {Object} Distribution
 */
function getResponseTimeDistributionTotal(participants) {
  const distribution = {
    '<1m': 0,
    '1-5m': 0,
    '5-30m': 0,
    '30m-1h': 0,
    '1h+': 0
  };

  participants.forEach(participant => {
    const dist = participant.getResponseTimeDistribution();
    Object.keys(dist).forEach(key => {
      distribution[key] += dist[key];
    });
  });

  return distribution;
}

/**
 * Get hourly distribution (messages by hour)
 * @param {ChatData} chatData - Chat data model
 * @param {string} participantName - Participant name or null for all
 * @returns {Array<number>} Count for each hour (0-23)
 */
function getHourlyDistribution(chatData, participantName) {
  const distribution = new Array(24).fill(0);

  for (let hour = 0; hour < 24; hour++) {
    const messages = chatData.getMessagesByHour(hour, participantName);
    distribution[hour] = messages.length;
  }

  return distribution;
}

/**
 * Get daily distribution (messages by day of week)
 * @param {ChatData} chatData - Chat data model
 * @param {string} participantName - Participant name or null for all
 * @returns {Array<number>} Count for each day (0-6, 0=Sunday)
 */
function getDailyDistribution(chatData, participantName) {
  const distribution = new Array(7).fill(0);

  for (let day = 0; day < 7; day++) {
    const messages = chatData.getMessagesByDay(day, participantName);
    distribution[day] = messages.length;
  }

  return distribution;
}

/**
 * Get messages over time (aggregated by date)
 * @param {ChatData} chatData - Chat data model
 * @param {string} participantName - Participant name or null for all
 * @returns {Array<{date: string, count: number}>} Messages per date
 */
export function getMessagesOverTime(chatData, participantName = null) {
  const dateMap = new Map();

  const messages = participantName && participantName !== 'Total'
    ? chatData.getMessages(participantName)
    : chatData.messages;

  messages.forEach(message => {
    const dateKey = message.timestamp.toDateString();
    const count = dateMap.get(dateKey) || 0;
    dateMap.set(dateKey, count + 1);
  });

  // Convert to array and sort by date
  return Array.from(dateMap.entries())
    .map(([date, count]) => ({ date: new Date(date), count }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Get participant comparison data
 * @param {ChatData} chatData - Chat data model
 * @returns {Array<Object>} Comparison data for each participant
 */
export function getParticipantComparison(chatData) {
  const participants = chatData.getAllParticipants();
  const totalMessages = chatData.metadata.totalMessages;

  return participants.map(participant => {
    const messagePercentage = (participant.messageCount / totalMessages) * 100;
    const wordPercentage = participant.wordCount > 0
      ? (participant.wordCount / chatData.getTotalStats().wordCount) * 100
      : 0;

    return {
      name: participant.name,
      messageCount: participant.messageCount,
      messagePercentage,
      wordCount: participant.wordCount,
      wordPercentage,
      emojiCount: participant.emojiCount,
      averageResponseTime: participant.getAverageResponseTime(),
      conversationsStarted: participant.conversationsStarted
    };
  }).sort((a, b) => b.messageCount - a.messageCount);
}

/**
 * Find peak activity times
 * @param {ChatData} chatData - Chat data model
 * @param {string} participantName - Participant name or null for all
 * @returns {Object} Peak hour and day info
 */
export function getPeakActivityTimes(chatData, participantName = null) {
  const hourlyDist = getHourlyDistribution(chatData, participantName);
  const dailyDist = getDailyDistribution(chatData, participantName);

  const peakHour = hourlyDist.indexOf(Math.max(...hourlyDist));
  const peakDay = dailyDist.indexOf(Math.max(...dailyDist));

  return {
    peakHour,
    peakHourCount: hourlyDist[peakHour],
    peakDay,
    peakDayCount: dailyDist[peakDay]
  };
}

/**
 * Calculate relationship health metrics
 * @param {ChatData} chatData - Chat data model
 * @returns {Object} Health metrics
 */
export function calculateRelationshipHealth(chatData) {
  const participants = chatData.getAllParticipants();

  if (participants.length !== 2) {
    return null; // Only works for 1-on-1 conversations
  }

  const [p1, p2] = participants;

  // 1. Reciprocity Score (0-100): How balanced is the conversation?
  const totalMessages = p1.messageCount + p2.messageCount;
  const idealSplit = totalMessages / 2;
  const deviation = Math.abs(p1.messageCount - idealSplit);
  const reciprocityScore = Math.max(0, 100 - (deviation / totalMessages) * 100);

  // 2. Response Rate: Average of both participants' response rates
  const avgResponseTime1 = p1.getAverageResponseTime();
  const avgResponseTime2 = p2.getAverageResponseTime();

  // Convert to score (lower is better, max 24 hours)
  const maxTime = 24 * 60 * 60 * 1000; // 24 hours in ms
  const responseScore1 = Math.max(0, 100 - (avgResponseTime1 / maxTime) * 100);
  const responseScore2 = Math.max(0, 100 - (avgResponseTime2 / maxTime) * 100);
  const responseScore = (responseScore1 + responseScore2) / 2;

  // 3. Engagement Index: Combination of message frequency and length
  const avgWordCount1 = p1.wordCount / p1.messageCount || 0;
  const avgWordCount2 = p2.wordCount / p2.messageCount || 0;
  const avgWordCount = (avgWordCount1 + avgWordCount2) / 2;

  // Score based on average word count (5-20 words is optimal)
  const wordScore = avgWordCount < 5
    ? (avgWordCount / 5) * 100
    : avgWordCount > 20
    ? Math.max(0, 100 - ((avgWordCount - 20) / 30) * 100)
    : 100;

  const engagementScore = wordScore;

  // 4. Overall Health: Weighted average
  const overallHealth = (reciprocityScore * 0.4 + responseScore * 0.3 + engagementScore * 0.3);

  return {
    overallHealth: Math.round(overallHealth),
    reciprocityScore: Math.round(reciprocityScore),
    responseScore: Math.round(responseScore),
    engagementScore: Math.round(engagementScore),
    interpretation: getHealthInterpretation(overallHealth),
    details: {
      p1: {
        name: p1.name,
        messageCount: p1.messageCount,
        messagePercentage: (p1.messageCount / totalMessages) * 100,
        avgResponseTime: avgResponseTime1,
        avgWordCount: avgWordCount1
      },
      p2: {
        name: p2.name,
        messageCount: p2.messageCount,
        messagePercentage: (p2.messageCount / totalMessages) * 100,
        avgResponseTime: avgResponseTime2,
        avgWordCount: avgWordCount2
      }
    }
  };
}

/**
 * Get health interpretation
 * @param {number} score - Health score (0-100)
 * @returns {string} Interpretation
 */
function getHealthInterpretation(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Attention';
}

/**
 * Predict peak conversation time
 * @param {ChatData} chatData - Chat data model
 * @returns {Object} {day: string, hour: number, confidence: number, messageCount: number}
 */
export function predictPeakConversationTime(chatData) {
  // Create a matrix of day x hour
  const matrix = Array(7).fill(null).map(() => Array(24).fill(0));

  chatData.messages.forEach(msg => {
    const day = msg.timestamp.getDay();
    const hour = msg.timestamp.getHours();
    matrix[day][hour]++;
  });

  // Find the peak
  let maxCount = 0;
  let peakDay = 0;
  let peakHour = 0;

  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      if (matrix[day][hour] > maxCount) {
        maxCount = matrix[day][hour];
        peakDay = day;
        peakHour = hour;
      }
    }
  }

  // Calculate confidence (how much more active is peak vs average)
  const totalMessages = chatData.messages.length;
  const avgMessagesPerSlot = totalMessages / (7 * 24);
  const confidence = avgMessagesPerSlot > 0
    ? Math.min((maxCount / avgMessagesPerSlot) * 20, 100)
    : 0;

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return {
    day: days[peakDay],
    dayShort: days[peakDay].slice(0, 3),
    hour: peakHour,
    hourFormatted: formatHourForPrediction(peakHour),
    confidence: Math.round(confidence),
    messageCount: maxCount,
    totalMessages
  };
}

/**
 * Format hour for prediction display
 * @param {number} hour - Hour (0-23)
 * @returns {string} Formatted hour
 */
function formatHourForPrediction(hour) {
  if (hour === 0) return '12am';
  if (hour < 12) return hour + 'am';
  if (hour === 12) return '12pm';
  return (hour - 12) + 'pm';
}

/**
 * Get response time heatmap by hour
 * @param {ChatData} chatData - Chat data model
 * @param {string} participantName - Participant name
 * @returns {Array<{hour: number, avgMinutes: number, count: number}>}
 */
export function getResponseTimeByHour(chatData, participantName) {
  const hourData = Array(24).fill(null).map((_, i) => ({
    hour: i,
    total: 0,
    count: 0
  }));

  // Get all messages sorted by time
  const messages = [...chatData.messages].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 0; i < messages.length - 1; i++) {
    const msg = messages[i];
    const nextMsg = messages[i + 1];

    // Find response from the specified participant
    if (nextMsg.participant === participantName && nextMsg.participant !== msg.participant) {
      const responseTime = nextMsg.timestamp - msg.timestamp;

      if (isValidResponseTime(responseTime)) {
        const hour = nextMsg.timestamp.getHours();
        hourData[hour].total += responseTime;
        hourData[hour].count++;
      }
    }
  }

  // Convert to averages in minutes
  return hourData.map(data => ({
    hour: data.hour,
    avgMinutes: data.count > 0 ? (data.total / data.count) / 60000 : 0,
    count: data.count
  }));
}

/**
 * Get question asking trend over time
 * @param {ChatData} chatData - Chat data model
 * @param {string} participantName - Participant name
 * @returns {Array<{period: string, questionPercentage: number}>}
 */
export function getQuestionTrend(chatData, participantName) {
  const participant = chatData.getParticipant(participantName);
  if (!participant) return [];

  const messages = [...participant.messages].sort((a, b) => a.timestamp - b.timestamp);
  const periodMap = new Map();

  messages.forEach(msg => {
    const monthKey = getMonthKey(msg.timestamp);

    if (!periodMap.has(monthKey)) {
      periodMap.set(monthKey, { total: 0, questions: 0 });
    }

    const period = periodMap.get(monthKey);
    period.total++;

    if (msg.content && msg.content.includes('?')) {
      period.questions++;
    }
  });

  return Array.from(periodMap.entries())
    .map(([period, data]) => ({
      period,
      questionPercentage: (data.questions / data.total) * 100
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Get conversation initiator patterns by time
 * @param {ChatData} chatData - Chat data model
 * @returns {Map<participantName, {byHour: Array<24>, byDay: Array<7>}>}
 */
export function getConversationInitiatorPatterns(chatData) {
  const messages = [...chatData.messages].sort((a, b) => a.timestamp - b.timestamp);
  const patterns = new Map();

  // Initialize patterns for each participant
  chatData.getAllParticipants().forEach(p => {
    patterns.set(p.name, {
      byHour: Array(24).fill(0),
      byDay: Array(7).fill(0)
    });
  });

  let lastTimestamp = null;

  messages.forEach(msg => {
    if (!lastTimestamp || isNewConversation(msg.timestamp - lastTimestamp)) {
      // This message is a conversation starter
      const hour = msg.timestamp.getHours();
      const day = msg.timestamp.getDay();
      const pattern = patterns.get(msg.participant);

      if (pattern) {
        pattern.byHour[hour]++;
        pattern.byDay[day]++;
      }
    }

    lastTimestamp = msg.timestamp;
  });

  return patterns;
}

/**
 * Analyze conversation lengths (back-and-forth turns)
 * @param {ChatData} chatData - Chat data model
 * @returns {Object} {lengths: number[], distribution: {short, medium, long}, average, total}
 */
export function analyzeConversationLengths(chatData) {
  const messages = [...chatData.messages].sort((a, b) => a.timestamp - b.timestamp);
  const conversations = [];
  let currentConvo = [];
  let lastTimestamp = null;

  messages.forEach(msg => {
    if (lastTimestamp && !isNewConversation(msg.timestamp - lastTimestamp)) {
      currentConvo.push(msg);
    } else {
      if (currentConvo.length > 0) {
        conversations.push(currentConvo);
      }
      currentConvo = [msg];
    }
    lastTimestamp = msg.timestamp;
  });

  if (currentConvo.length > 0) {
    conversations.push(currentConvo);
  }

  // Calculate turns (consecutive messages = 1 turn)
  const conversationLengths = conversations.map(convo => {
    let turns = 0;
    let lastParticipant = null;

    convo.forEach(msg => {
      if (msg.participant !== lastParticipant) {
        turns++;
        lastParticipant = msg.participant;
      }
    });

    return turns;
  });

  // Distribution
  const short = conversationLengths.filter(l => l <= 5).length;
  const medium = conversationLengths.filter(l => l > 5 && l <= 15).length;
  const long = conversationLengths.filter(l => l > 15).length;

  return {
    lengths: conversationLengths,
    distribution: { short, medium, long },
    average: conversationLengths.length > 0
      ? conversationLengths.reduce((sum, l) => sum + l, 0) / conversationLengths.length
      : 0,
    total: conversations.length,
    longest: conversationLengths.length > 0 ? Math.max(...conversationLengths) : 0
  };
}

/**
 * Get message length trend over time
 * @param {ChatData} chatData - Chat data model
 * @param {string} participantName - Participant name
 * @param {string} granularity - 'week' or 'month'
 * @returns {Array<{period: string, averageWords: number, averageChars: number}>}
 */
export function getMessageLengthTrend(chatData, participantName, granularity = 'month') {
  const participant = chatData.getParticipant(participantName);
  if (!participant) return [];

  const messages = [...participant.messages].sort((a, b) => a.timestamp - b.timestamp);

  const periodMap = new Map();

  messages.forEach(msg => {
    const periodKey = granularity === 'week'
      ? getWeekKey(msg.timestamp)
      : getMonthKey(msg.timestamp);

    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, { words: [], chars: [] });
    }

    const wordCount = countWords(msg.content);
    const charCount = countLetters(msg.content);

    periodMap.get(periodKey).words.push(wordCount);
    periodMap.get(periodKey).chars.push(charCount);
  });

  return Array.from(periodMap.entries())
    .map(([period, data]) => ({
      period,
      averageWords: data.words.reduce((sum, w) => sum + w, 0) / data.words.length,
      averageChars: data.chars.reduce((sum, c) => sum + c, 0) / data.chars.length
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Get month key from date
 * @param {Date} date - Date object
 * @returns {string} Month key in YYYY-MM format
 */
function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get week key from date
 * @param {Date} date - Date object
 * @returns {string} Week key in YYYY-WXX format
 */
function getWeekKey(date) {
  // ISO week number
  const oneJan = new Date(date.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((date - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Count words in a message
 * @param {string} content - Message content
 * @returns {number} Word count
 */
function countWords(content) {
  if (!content) return 0;
  return content.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Count letters in a message
 * @param {string} content - Message content
 * @returns {number} Letter count
 */
function countLetters(content) {
  if (!content) return 0;
  return content.replace(/[^a-zA-Z]/g, '').length;
}

/**
 * Get most active days sorted by message count
 * @param {ChatData} chatData - Chat data model
 * @param {number} topN - Number of days to return (default 10)
 * @returns {Array<{date: Date, count: number, dayName: string}>}
 */
export function getMostActiveDays(chatData, topN = 10) {
  const dayCounts = new Map();

  chatData.messages.forEach(msg => {
    const dateKey = formatDateKey(msg.timestamp);
    dayCounts.set(dateKey, (dayCounts.get(dateKey) || 0) + 1);
  });

  return Array.from(dayCounts.entries())
    .map(([dateStr, count]) => {
      const date = new Date(dateStr);
      return {
        date,
        count,
        dayName: getDayName(date.getDay())
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

/**
 * Helper for consistent date key format
 * @param {Date} date - Date object
 * @returns {string} Date key in YYYY-MM-DD format
 */
function formatDateKey(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Get day name from day number
 * @param {number} dayNum - Day number (0-6, 0=Sunday)
 * @returns {string} Day name
 */
function getDayName(dayNum) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNum];
}

/**
 * Analyze activity trend over time
 * @param {ChatData} chatData - Chat data model
 * @returns {Object} Trend analysis
 */
export function analyzeActivityTrend(chatData) {
  const messages = chatData.messages;
  if (messages.length === 0) {
    return { trend: 'neutral', percentageChange: 0, comparison: {} };
  }

  // Sort by date
  const sortedMessages = [...messages].sort((a, b) =>
    a.timestamp.getTime() - b.timestamp.getTime()
  );

  const firstDate = sortedMessages[0].timestamp;
  const lastDate = sortedMessages[sortedMessages.length - 1].timestamp;
  const totalDays = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));

  // If less than 60 days, compare first half vs second half
  // If more than 60 days, compare first 30 days vs last 30 days
  let firstPeriodEnd, secondPeriodStart;

  if (totalDays < 60) {
    const midPoint = new Date(firstDate.getTime() + (totalDays / 2) * 24 * 60 * 60 * 1000);
    firstPeriodEnd = midPoint;
    secondPeriodStart = midPoint;
  } else {
    firstPeriodEnd = new Date(firstDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    secondPeriodStart = new Date(lastDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Count messages in each period
  const firstPeriodMessages = sortedMessages.filter(m =>
    m.timestamp >= firstDate && m.timestamp <= firstPeriodEnd
  ).length;

  const secondPeriodMessages = sortedMessages.filter(m =>
    m.timestamp >= secondPeriodStart && m.timestamp <= lastDate
  ).length;

  // Calculate days in each period
  const firstPeriodDays = Math.ceil((firstPeriodEnd - firstDate) / (1000 * 60 * 60 * 24));
  const secondPeriodDays = Math.ceil((lastDate - secondPeriodStart) / (1000 * 60 * 60 * 24));

  // Calculate average messages per day for each period
  const firstPeriodAvg = firstPeriodMessages / firstPeriodDays;
  const secondPeriodAvg = secondPeriodMessages / secondPeriodDays;

  // Calculate percentage change
  const percentageChange = ((secondPeriodAvg - firstPeriodAvg) / firstPeriodAvg) * 100;

  // Determine trend
  let trend;
  if (percentageChange > 10) trend = 'increasing';
  else if (percentageChange < -10) trend = 'decreasing';
  else trend = 'stable';

  return {
    trend,
    percentageChange,
    comparison: {
      firstPeriod: {
        messages: firstPeriodMessages,
        days: firstPeriodDays,
        avgPerDay: firstPeriodAvg,
        startDate: firstDate,
        endDate: firstPeriodEnd
      },
      secondPeriod: {
        messages: secondPeriodMessages,
        days: secondPeriodDays,
        avgPerDay: secondPeriodAvg,
        startDate: secondPeriodStart,
        endDate: lastDate
      }
    }
  };
}

/**
 * Analyze sentiment of a single message using Sentiment library
 * @param {string} text - Message text
 * @returns {number} Sentiment score (normalized to -1 to 1)
 */
function analyzeMessageSentiment(text) {
  if (!text || text.trim().length === 0) return 0;
  if (!window.Sentiment) return 0;

  try {
    const sentiment = new window.Sentiment();
    const result = sentiment.analyze(text);

    // Sentiment library returns scores typically ranging from -10 to +10
    // Normalize to -1 to 1 range
    return Math.max(-1, Math.min(1, result.score / 10));
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return 0;
  }
}

/**
 * Analyze sentiment of messages
 * @param {ChatData} chatData - Chat data model
 * @param {string} participantName - Participant name
 * @returns {Object} {overall: number, positive: number, negative: number, neutral: number, trend: Array, topPositive: Array, topNegative: Array}
 */
export function analyzeSentiment(chatData, participantName) {
  const participant = chatData.getParticipant(participantName);
  if (!participant) {
    return {
      overall: 0,
      positive: 0,
      negative: 0,
      neutral: 0,
      trend: [],
      topPositive: [],
      topNegative: []
    };
  }

  const messages = [...participant.messages].sort((a, b) => a.timestamp - b.timestamp);

  let totalScore = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  const periodMap = new Map();
  const scoredMessages = [];
  const MAX_LENGTH = 200; // Exclude pasted paragraphs and long forwarded messages

  messages.forEach(msg => {
    if (!msg.content || msg.content.trim().length === 0) return;

    // Skip very long messages (likely pasted content)
    if (msg.content.length > MAX_LENGTH) return;

    // Analyze message sentiment
    const score = analyzeMessageSentiment(msg.content);

    totalScore += score;

    // Store message with score
    scoredMessages.push({
      content: msg.content,
      score: score,
      timestamp: msg.timestamp
    });

    // Categorize (more sensitive thresholds)
    if (score > 0.05) {
      positiveCount++;
    } else if (score < -0.05) {
      negativeCount++;
    } else {
      neutralCount++;
    }

    // Track by month for trend
    const monthKey = getMonthKey(msg.timestamp);
    if (!periodMap.has(monthKey)) {
      periodMap.set(monthKey, { scores: [], positive: 0, negative: 0, neutral: 0 });
    }

    const period = periodMap.get(monthKey);
    period.scores.push(score);

    if (score > 0.05) period.positive++;
    else if (score < -0.05) period.negative++;
    else period.neutral++;
  });

  // Calculate trend data
  const trend = Array.from(periodMap.entries())
    .map(([period, data]) => ({
      period,
      avgScore: data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length,
      positive: data.positive,
      negative: data.negative,
      neutral: data.neutral
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  // Get top 5 most positive and negative messages
  const sortedByScore = [...scoredMessages].sort((a, b) => b.score - a.score);
  const topPositive = sortedByScore.slice(0, 5).filter(m => m.score > 0);
  const topNegative = sortedByScore.slice(-5).reverse().filter(m => m.score < 0);

  return {
    overall: messages.length > 0 ? totalScore / messages.length : 0,
    positive: positiveCount,
    negative: negativeCount,
    neutral: neutralCount,
    trend,
    topPositive,
    topNegative
  };
}

/**
 * Get overall sentiment comparison for all participants
 * @param {ChatData} chatData - Chat data model
 * @returns {Map<participantName, sentimentData>}
 */
export function getSentimentComparison(chatData) {
  const comparison = new Map();

  chatData.getAllParticipants().forEach(participant => {
    const sentimentData = analyzeSentiment(chatData, participant.name);
    comparison.set(participant.name, sentimentData);
  });

  return comparison;
}
