/**
 * Data models for WhatsApp Conversation Analyzer
 */

import { extractEmojis, countWords, countLetters } from './utils.js';

/**
 * Participant data structure
 */
export class ParticipantData {
  constructor(name) {
    this.name = name;
    this.messageCount = 0;
    this.wordCount = 0;
    this.letterCount = 0;
    this.emojiCount = 0;
    this.topEmojis = new Map(); // emoji -> count
    this.responseTimes = []; // array of response times in ms
    this.conversationsStarted = 0;
    this.messages = []; // store actual messages for this participant

    // Communication style metrics
    this.messageLengths = []; // length of each message in words
    this.characterLengths = []; // length of each message in characters
    this.questionCount = 0; // messages with "?"
    this.exclamationCount = 0; // messages with "!"
    this.allCapsCount = 0; // messages in ALL CAPS
    this.burstCount = 0; // consecutive messages (will be calculated later)
  }

  /**
   * Add a message to this participant's data
   * @param {Object} message - Message object
   */
  addMessage(message) {
    this.messageCount++;
    this.messages.push(message);

    // Count words and letters
    if (message.content && !message.isMedia) {
      const words = countWords(message.content);
      const letters = countLetters(message.content);

      this.wordCount += words;
      this.letterCount += letters;

      // Track message lengths
      this.messageLengths.push(words);
      this.characterLengths.push(message.content.length);

      // Communication style analysis
      if (message.content.includes('?')) {
        this.questionCount++;
      }

      if (message.content.includes('!')) {
        this.exclamationCount++;
      }

      // Check for ALL CAPS (at least 5 chars, mostly uppercase)
      const alphaChars = message.content.replace(/[^a-zA-Z]/g, '');
      if (alphaChars.length >= 5) {
        const uppercaseRatio = (alphaChars.match(/[A-Z]/g) || []).length / alphaChars.length;
        if (uppercaseRatio > 0.7) {
          this.allCapsCount++;
        }
      }

      // Extract and count emojis
      const emojis = extractEmojis(message.content);
      this.emojiCount += emojis.length;

      emojis.forEach(emoji => {
        const count = this.topEmojis.get(emoji) || 0;
        this.topEmojis.set(emoji, count + 1);
      });
    }
  }

  /**
   * Add a response time measurement
   * @param {number} milliseconds - Response time in ms
   */
  addResponseTime(milliseconds) {
    this.responseTimes.push(milliseconds);
  }

  /**
   * Get average response time
   * @returns {number} Average in milliseconds
   */
  getAverageResponseTime() {
    if (this.responseTimes.length === 0) return 0;
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    return sum / this.responseTimes.length;
  }

  /**
   * Get median response time
   * @returns {number} Median in milliseconds
   */
  getMedianResponseTime() {
    if (this.responseTimes.length === 0) return 0;
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Get top N emojis
   * @param {number} n - Number of top emojis to return
   * @returns {Array<{emoji: string, count: number}>} Top emojis
   */
  getTopEmojis(n = 10) {
    return Array.from(this.topEmojis.entries())
      .map(([emoji, count]) => ({ emoji, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  }

  /**
   * Get response time distribution
   * @returns {Object} Distribution by buckets
   */
  getResponseTimeDistribution() {
    const distribution = {
      '<1m': 0,
      '1-5m': 0,
      '5-30m': 0,
      '30m-1h': 0,
      '1h+': 0
    };

    this.responseTimes.forEach(ms => {
      const minutes = ms / (60 * 1000);
      const hours = minutes / 60;

      if (minutes < 1) distribution['<1m']++;
      else if (minutes < 5) distribution['1-5m']++;
      else if (minutes < 30) distribution['5-30m']++;
      else if (hours < 1) distribution['30m-1h']++;
      else distribution['1h+']++;
    });

    return distribution;
  }

  /**
   * Get average message length in words
   * @returns {number} Average words per message
   */
  getAverageMessageLength() {
    if (this.messageLengths.length === 0) return 0;
    const sum = this.messageLengths.reduce((a, b) => a + b, 0);
    return sum / this.messageLengths.length;
  }

  /**
   * Get average message length in characters
   * @returns {number} Average characters per message
   */
  getAverageCharacterLength() {
    if (this.characterLengths.length === 0) return 0;
    const sum = this.characterLengths.reduce((a, b) => a + b, 0);
    return sum / this.characterLengths.length;
  }

  /**
   * Get communication style statistics
   * @returns {Object} Style statistics
   */
  getCommunicationStyle() {
    return {
      averageWords: this.getAverageMessageLength(),
      averageCharacters: this.getAverageCharacterLength(),
      questionCount: this.questionCount,
      questionPercentage: (this.questionCount / this.messageCount) * 100,
      exclamationCount: this.exclamationCount,
      exclamationPercentage: (this.exclamationCount / this.messageCount) * 100,
      allCapsCount: this.allCapsCount,
      allCapsPercentage: (this.allCapsCount / this.messageCount) * 100,
      burstCount: this.burstCount
    };
  }
}

/**
 * Main chat data structure
 */
export class ChatData {
  constructor() {
    this.messages = [];
    this.participants = new Map(); // name -> ParticipantData
    this.metadata = {
      startDate: null,
      endDate: null,
      totalMessages: 0,
      totalParticipants: 0
    };

    // Indexes for fast queries
    this.messagesByHour = new Map(); // hour (0-23) -> messages[]
    this.messagesByDay = new Map(); // day (0-6) -> messages[]
    this.messagesByDate = new Map(); // date string -> messages[]

    // Cache for expensive calculations
    this.cache = new Map();

    // Initialize indexes
    for (let i = 0; i < 24; i++) {
      this.messagesByHour.set(i, []);
    }
    for (let i = 0; i < 7; i++) {
      this.messagesByDay.set(i, []);
    }
  }

  /**
   * Get cached value or compute it
   * @param {string} key - Cache key
   * @param {Function} computeFn - Function to compute value if not cached
   * @returns {*} Cached or computed value
   */
  getCached(key, computeFn) {
    if (!this.cache.has(key)) {
      this.cache.set(key, computeFn());
    }
    return this.cache.get(key);
  }

  /**
   * Invalidate cache
   */
  invalidateCache() {
    this.cache.clear();
  }

  /**
   * Load messages into the data model
   * @param {Array} messages - Array of parsed messages
   */
  loadMessages(messages) {
    this.messages = messages.filter(msg => !msg.isSystem);

    // Set metadata
    if (this.messages.length > 0) {
      const timestamps = this.messages.map(m => m.timestamp.getTime());
      this.metadata.startDate = new Date(Math.min(...timestamps));
      this.metadata.endDate = new Date(Math.max(...timestamps));
      this.metadata.totalMessages = this.messages.length;
    }

    // Process each message
    this.messages.forEach(message => {
      // Get or create participant
      if (!this.participants.has(message.participant)) {
        this.participants.set(message.participant, new ParticipantData(message.participant));
      }

      const participant = this.participants.get(message.participant);
      participant.addMessage(message);

      // Index by hour
      const hour = message.timestamp.getHours();
      this.messagesByHour.get(hour).push(message);

      // Index by day
      const day = message.timestamp.getDay();
      this.messagesByDay.get(day).push(message);

      // Index by date
      const dateKey = message.timestamp.toDateString();
      if (!this.messagesByDate.has(dateKey)) {
        this.messagesByDate.set(dateKey, []);
      }
      this.messagesByDate.get(dateKey).push(message);
    });

    this.metadata.totalParticipants = this.participants.size;
  }

  /**
   * Get participant data
   * @param {string} name - Participant name
   * @returns {ParticipantData|null} Participant data
   */
  getParticipant(name) {
    return this.participants.get(name) || null;
  }

  /**
   * Get all participants as array
   * @returns {ParticipantData[]} Array of participants
   */
  getAllParticipants() {
    return Array.from(this.participants.values());
  }

  /**
   * Get messages filtered by participant
   * @param {string} participantName - Participant name (null for all)
   * @returns {Array} Filtered messages
   */
  getMessages(participantName = null) {
    if (!participantName || participantName === 'Total') {
      return this.messages;
    }

    const participant = this.getParticipant(participantName);
    return participant ? participant.messages : [];
  }

  /**
   * Get messages by hour for a participant
   * @param {number} hour - Hour (0-23)
   * @param {string} participantName - Participant name (null for all)
   * @returns {Array} Messages in that hour
   */
  getMessagesByHour(hour, participantName = null) {
    const messages = this.messagesByHour.get(hour) || [];
    if (!participantName || participantName === 'Total') {
      return messages;
    }
    return messages.filter(m => m.participant === participantName);
  }

  /**
   * Get messages by day for a participant
   * @param {number} day - Day (0-6, 0=Sunday)
   * @param {string} participantName - Participant name (null for all)
   * @returns {Array} Messages on that day
   */
  getMessagesByDay(day, participantName = null) {
    const messages = this.messagesByDay.get(day) || [];
    if (!participantName || participantName === 'Total') {
      return messages;
    }
    return messages.filter(m => m.participant === participantName);
  }

  /**
   * Get activity heatmap data (7 days x 24 hours)
   * @param {string} participantName - Participant name (null for all)
   * @returns {Array<Array<number>>} 7x24 grid of message counts
   */
  getActivityHeatmap(participantName = null) {
    const heatmap = Array(7).fill(0).map(() => Array(24).fill(0));

    this.messages.forEach(message => {
      if (participantName && participantName !== 'Total' && message.participant !== participantName) {
        return;
      }

      const day = message.timestamp.getDay();
      const hour = message.timestamp.getHours();
      heatmap[day][hour]++;
    });

    return heatmap;
  }

  /**
   * Get total statistics (all participants combined)
   * @returns {Object} Total statistics
   */
  getTotalStats() {
    const stats = {
      messageCount: this.metadata.totalMessages,
      wordCount: 0,
      letterCount: 0,
      emojiCount: 0,
      participantCount: this.metadata.totalParticipants
    };

    this.participants.forEach(participant => {
      stats.wordCount += participant.wordCount;
      stats.letterCount += participant.letterCount;
      stats.emojiCount += participant.emojiCount;
    });

    return stats;
  }

  /**
   * Get top emojis across all participants
   * @param {number} n - Number of top emojis
   * @returns {Array<{emoji: string, count: number}>} Top emojis
   */
  getTopEmojis(n = 10) {
    const emojiMap = new Map();

    this.participants.forEach(participant => {
      participant.topEmojis.forEach((count, emoji) => {
        const current = emojiMap.get(emoji) || 0;
        emojiMap.set(emoji, current + count);
      });
    });

    return Array.from(emojiMap.entries())
      .map(([emoji, count]) => ({ emoji, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  }
}
