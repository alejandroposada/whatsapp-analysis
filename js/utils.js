/**
 * Utility functions for WhatsApp Conversation Analyzer
 */

/**
 * Extract emojis from text using Unicode regex
 * @param {string} text - Text to extract emojis from
 * @returns {string[]} Array of emojis found
 */
export function extractEmojis(text) {
  if (!text) return [];
  // Match emoji characters including skin tone modifiers and ZWJ sequences
  const emojiRegex = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;
  return text.match(emojiRegex) || [];
}

/**
 * Count total emojis in text
 * @param {string} text - Text to count emojis in
 * @returns {number} Count of emojis
 */
export function countEmojis(text) {
  return extractEmojis(text).length;
}

/**
 * Count words in text
 * @param {string} text - Text to count words in
 * @returns {number} Word count
 */
export function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Count letters (alphabetic characters) in text
 * @param {string} text - Text to count letters in
 * @returns {number} Letter count
 */
export function countLetters(text) {
  if (!text) return 0;
  return text.replace(/[^a-zA-Z]/g, '').length;
}

/**
 * Format number with thousands separator
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
  return num.toLocaleString('en-US');
}

/**
 * Format large number with fun comparison
 * @param {number} num - Number to format
 * @param {string} unit - Unit type (words, letters, etc)
 * @returns {string} Formatted with comparison
 */
export function formatWithComparison(num, unit) {
  const formatted = formatNumber(num);

  if (unit === 'words') {
    // Harry Potter series has ~1,084,170 words
    const harryPotterBooks = (num / 1084170).toFixed(2);
    if (harryPotterBooks >= 0.1) {
      return `${formatted} (${harryPotterBooks} Harry Potter series)`;
    }
  } else if (unit === 'letters') {
    // War and Peace has ~587,287 letters
    const warAndPeaceBooks = (num / 587287).toFixed(2);
    if (warAndPeaceBooks >= 0.1) {
      return `${formatted} (${warAndPeaceBooks} War and Peace novels)`;
    }
  }

  return formatted;
}

/**
 * Format date to readable string
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
export function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format time duration
 * @param {number} milliseconds - Duration in ms
 * @returns {string} Formatted duration (e.g., "2h 15m")
 */
export function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Get day of week name
 * @param {number} dayIndex - Day index (0 = Sunday, 6 = Saturday)
 * @returns {string} Day name
 */
export function getDayName(dayIndex) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex];
}

/**
 * Get short day name
 * @param {number} dayIndex - Day index (0 = Sunday, 6 = Saturday)
 * @returns {string} Short day name
 */
export function getShortDayName(dayIndex) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayIndex];
}

/**
 * Get hour label (12-hour format)
 * @param {number} hour - Hour (0-23)
 * @returns {string} Formatted hour
 */
export function getHourLabel(hour) {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

/**
 * Calculate time difference in milliseconds between two dates
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} Difference in milliseconds
 */
export function getTimeDifference(date1, date2) {
  return Math.abs(date2.getTime() - date1.getTime());
}

/**
 * Check if time gap represents a new conversation (> 2 hours)
 * @param {number} milliseconds - Time gap in ms
 * @returns {boolean} True if new conversation
 */
export function isNewConversation(milliseconds) {
  const twoHours = 2 * 60 * 60 * 1000;
  return milliseconds > twoHours;
}

/**
 * Check if time gap is valid for response time calculation (< 24 hours)
 * @param {number} milliseconds - Time gap in ms
 * @returns {boolean} True if valid response time
 */
export function isValidResponseTime(milliseconds) {
  const twentyFourHours = 24 * 60 * 60 * 1000;
  return milliseconds < twentyFourHours;
}

/**
 * Get response time bucket for a duration
 * @param {number} milliseconds - Duration in ms
 * @returns {string} Bucket label
 */
export function getResponseTimeBucket(milliseconds) {
  const minutes = milliseconds / (60 * 1000);
  const hours = minutes / 60;

  if (minutes < 1) return '<1m';
  if (minutes < 5) return '1-5m';
  if (minutes < 30) return '5-30m';
  if (hours < 1) return '30m-1h';
  return '1h+';
}

/**
 * Calculate percentage
 * @param {number} part - Part value
 * @param {number} total - Total value
 * @returns {number} Percentage (0-100)
 */
export function calculatePercentage(part, total) {
  if (total === 0) return 0;
  return (part / total) * 100;
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Animate number counting up
 * @param {HTMLElement} element - Element to animate
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} duration - Duration in ms
 */
export function animateNumber(element, start, end, duration = 1000) {
  const startTime = performance.now();
  const difference = end - start;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function (easeOutQuad)
    const eased = progress * (2 - progress);
    const current = Math.floor(start + difference * eased);

    element.textContent = formatNumber(current);

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = formatNumber(end);
    }
  }

  requestAnimationFrame(update);
}
