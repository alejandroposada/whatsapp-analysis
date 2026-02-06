/**
 * WhatsApp Chat Parser
 * Supports both iOS and Android export formats
 */

/**
 * Message object structure
 * @typedef {Object} Message
 * @property {Date} timestamp - Message timestamp
 * @property {string} participant - Participant name
 * @property {string} content - Message content
 * @property {boolean} isSystem - Whether it's a system message
 * @property {boolean} isMedia - Whether it contains media
 */

/**
 * Parse WhatsApp chat export file
 * @param {string} fileContent - Raw file content
 * @returns {Message[]} Array of parsed messages
 */
export function parseWhatsAppChat(fileContent) {
  if (!fileContent || fileContent.trim().length === 0) {
    throw new Error('File content is empty');
  }

  const lines = fileContent.split('\n');
  const messages = [];
  let currentMessage = null;

  // iOS format: [DD/MM/YYYY, HH:MM:SS] Name: Message
  // Android format: DD/MM/YYYY, HH:MM - Name: Message
  // ISO format: [YYYY-MM-DD, HH:MM:SS] Name: Message (newer WhatsApp versions)
  // Also support: DD/MM/YY, HH:MM - Name: Message (short year)
  // Also support: M/D/YY, H:MM AM/PM - Name: Message (US format)
  const iosRegex = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]\s*([^:]+):\s*(.*)$/;
  const androidRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)\s*-\s*([^:]+):\s*(.*)$/;
  const isoRegex = /^\[(\d{4}-\d{1,2}-\d{1,2}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]\s*([^:]+):\s*(.*)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.length === 0) {
      continue; // Skip empty lines
    }

    // Try to match iOS format
    let match = line.match(iosRegex);
    let formatType = 'ios';

    // If iOS doesn't match, try Android format
    if (!match) {
      match = line.match(androidRegex);
      formatType = 'android';
    }

    // If Android doesn't match, try ISO format
    if (!match) {
      match = line.match(isoRegex);
      formatType = 'iso';
    }

    if (match) {
      // Save previous message if exists
      if (currentMessage) {
        messages.push(currentMessage);
      }

      // Extract components
      const dateStr = match[1];
      const timeStr = match[2];
      const participant = match[3].trim();
      const content = match[4].trim();

      // Parse timestamp
      const timestamp = parseTimestamp(dateStr, timeStr, formatType);

      // Check if it's a system message
      const isSystem = isSystemMessage(content, participant);

      // Check if it contains media
      const isMedia = isMediaMessage(content);

      // Create new message
      currentMessage = {
        timestamp,
        participant,
        content,
        isSystem,
        isMedia
      };
    } else {
      // Multi-line message - append to current message
      if (currentMessage) {
        currentMessage.content += '\n' + line;

        // Update media flag if new line contains media indicator
        if (isMediaMessage(line)) {
          currentMessage.isMedia = true;
        }
      }
      // If no current message, this might be file header - skip it
    }
  }

  // Add the last message
  if (currentMessage) {
    messages.push(currentMessage);
  }

  if (messages.length === 0) {
    throw new Error('No valid messages found in file. Please ensure this is a WhatsApp chat export.');
  }

  return messages;
}

/**
 * Parse date and time strings into Date object
 * @param {string} dateStr - Date string (DD/MM/YYYY or DD/MM/YY or YYYY-MM-DD)
 * @param {string} timeStr - Time string (HH:MM:SS or HH:MM or H:MM AM/PM)
 * @param {string} formatType - Format type ('ios', 'android', or 'iso')
 * @returns {Date} Parsed date
 */
function parseTimestamp(dateStr, timeStr, formatType = 'ios') {
  let day, month, year;

  // Check if ISO format (YYYY-MM-DD with dashes)
  if (formatType === 'iso' || dateStr.includes('-')) {
    const dateParts = dateStr.split('-').map(p => parseInt(p, 10));
    if (dateParts.length === 3) {
      year = dateParts[0];
      month = dateParts[1] - 1; // JavaScript months are 0-indexed
      day = dateParts[2];
    } else {
      throw new Error(`Invalid ISO date format: ${dateStr}`);
    }
  } else {
    // Original format (DD/MM/YYYY with slashes)
    const dateParts = dateStr.split('/').map(p => parseInt(p, 10));
    if (dateParts.length === 3) {
      day = dateParts[0];
      month = dateParts[1] - 1; // JavaScript months are 0-indexed
      year = dateParts[2];

      // Handle 2-digit years
      if (year < 100) {
        year += 2000;
      }
    } else {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
  }

  // Parse time components
  let hours, minutes, seconds = 0;
  const timeUpper = timeStr.toUpperCase();
  const isPM = timeUpper.includes('PM');
  const isAM = timeUpper.includes('AM');

  // Remove AM/PM and trim
  const cleanTime = timeStr.replace(/\s*(AM|PM|am|pm)/gi, '').trim();
  const timeParts = cleanTime.split(':').map(p => parseInt(p, 10));

  if (timeParts.length >= 2) {
    hours = timeParts[0];
    minutes = timeParts[1];

    if (timeParts.length === 3) {
      seconds = timeParts[2];
    }

    // Handle 12-hour format
    if (isAM || isPM) {
      if (isPM && hours !== 12) {
        hours += 12;
      } else if (isAM && hours === 12) {
        hours = 0;
      }
    }
  } else {
    throw new Error(`Invalid time format: ${timeStr}`);
  }

  return new Date(year, month, day, hours, minutes, seconds);
}

/**
 * Check if message is a system message
 * @param {string} content - Message content
 * @param {string} participant - Participant name
 * @returns {boolean} True if system message
 */
function isSystemMessage(content, participant) {
  // Remove all non-printable characters and normalize whitespace
  const cleanContent = content
    .replace(/[\u200B-\u200F\uFEFF]/g, '') // Remove zero-width characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .toLowerCase()
    .trim();

  const systemIndicators = [
    'messages and calls are end-to-end encrypted',
    'created group',
    'added',
    'removed',
    'left',
    'changed the subject',
    'changed this group\'s icon',
    'changed the group description',
    'you deleted this message',
    'this message was deleted',
    'security code changed',
    'joined using this group\'s invite link',
    'missed voice call',
    'missed video call',
    'voice call',
    'video call',
    'waiting for this message',
    'trying to call you',
    'called you',
    'tap to call back',
    'call back'
  ];

  // Check if content matches any system indicator
  if (systemIndicators.some(indicator => cleanContent.includes(indicator))) {
    return true;
  }

  // Additional check: if message contains "missed" and "call" together
  if (cleanContent.includes('missed') && cleanContent.includes('call')) {
    return true;
  }

  // Check for call-related system messages
  if ((cleanContent.includes('voice') || cleanContent.includes('video')) &&
      cleanContent.includes('call')) {
    return true;
  }

  return false;
}

/**
 * Check if message contains media
 * @param {string} content - Message content
 * @returns {boolean} True if media message
 */
function isMediaMessage(content) {
  const mediaIndicators = [
    '<attached:',
    'image omitted',
    'video omitted',
    'audio omitted',
    'sticker omitted',
    'GIF omitted',
    'document omitted',
    'Contact card omitted',
    '<Media omitted>',
    '\u200eimage omitted',
    '\u200evideo omitted',
    '\u200eaudio omitted',
    '\u200esticker omitted',
    '\u200eGIF omitted',
    '\u200edocument omitted'
  ];

  const contentLower = content.toLowerCase();
  return mediaIndicators.some(indicator =>
    contentLower.includes(indicator.toLowerCase())
  );
}

/**
 * Get list of unique participants from messages
 * @param {Message[]} messages - Array of messages
 * @returns {string[]} Array of unique participant names
 */
export function getParticipants(messages) {
  const participants = new Set();

  messages.forEach(msg => {
    if (!msg.isSystem) {
      participants.add(msg.participant);
    }
  });

  return Array.from(participants).sort();
}

/**
 * Filter messages by participant
 * @param {Message[]} messages - Array of messages
 * @param {string} participant - Participant name (null for all)
 * @returns {Message[]} Filtered messages
 */
export function filterMessagesByParticipant(messages, participant) {
  if (!participant || participant === 'Total') {
    return messages.filter(msg => !msg.isSystem);
  }

  return messages.filter(msg =>
    msg.participant === participant && !msg.isSystem
  );
}

/**
 * Get date range from messages
 * @param {Message[]} messages - Array of messages
 * @returns {{start: Date, end: Date}} Date range
 */
export function getDateRange(messages) {
  if (messages.length === 0) {
    return { start: new Date(), end: new Date() };
  }

  const timestamps = messages.map(msg => msg.timestamp.getTime());
  return {
    start: new Date(Math.min(...timestamps)),
    end: new Date(Math.max(...timestamps))
  };
}
