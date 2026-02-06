/**
 * Word frequency analysis
 */

// Common stop words to filter out (English)
const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for',
  'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his',
  'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
  'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
  'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like',
  'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year',
  'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
  'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back',
  'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most',
  'us', 'is', 'was', 'are', 'been', 'has', 'had', 'were', 'said', 'did',
  'am', 'im', 'dont', 'thats', 'im', 'youre', 'cant', 'wont', 'didnt',
  'doesnt', 'wasnt', 'werent', 'havent', 'hasnt', 'hadnt', 'wouldnt',
  'shouldnt', 'couldnt', 'isnt', 'arent', 'aint', 'gonna', 'wanna', 'gotta',
  // Spanish common words
  'que', 'por', 'con', 'como', 'para', 'una', 'las', 'los', 'del', 'pero',
  'más', 'mas', 'esto', 'ese', 'eso', 'esta', 'este', 'está', 'esta', 'son',
  'fue', 'hay', 'muy', 'sin', 'sobre', 'ser', 'tiene', 'todo', 'también',
  'tambien', 'fue', 'han', 'puede', 'son', 'dos', 'bien', 'donde', 'cuando',
  'hacer', 'sido', 'así', 'otra', 'otro', 'entre', 'hasta', 'desde', 'algo',
  'solo', 'sólo', 'mismo', 'ahora', 'antes', 'después', 'despues', 'tanto',
  'ella', 'nos', 'les', 'sus', 'cual', 'sea', 'esa', 'estas', 'estos',
  // System message noise
  'missed', 'call', 'voice', 'video', 'tap', 'waiting', 'message', 'deleted',
  'attached', 'omitted', 'image', 'audio', 'document', 'sticker', 'gif'
]);

/**
 * Extract words from text
 * @param {string} text - Text to extract words from
 * @param {boolean} filterStopWords - Whether to filter stop words
 * @returns {Array<string>} Array of words
 */
function extractWords(text, filterStopWords = true) {
  if (!text) return [];

  // Remove URLs first
  let cleanText = text
    .replace(/https?:\/\/[^\s]+/gi, '') // Remove URLs
    .replace(/www\.[^\s]+/gi, '')       // Remove www links
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ');        // Keep apostrophes and hyphens

  return cleanText
    .split(/\s+/)
    .filter(word => {
      // Basic filters (always apply)
      const basicFilter = word.length > 2 &&
                         !/^\d+$/.test(word) &&
                         !word.includes('http') &&
                         !word.includes('www');

      // Stop word filter (optional)
      if (filterStopWords) {
        return basicFilter && !STOP_WORDS.has(word);
      }

      return basicFilter;
    });
}

/**
 * Analyze word frequency for a participant
 * @param {Array} messages - Messages from participant
 * @param {boolean} filterStopWords - Whether to filter stop words (default true)
 * @returns {Array<{word: string, count: number}>} Top words
 */
export function analyzeWordFrequency(messages, filterStopWords = true) {
  const wordCounts = new Map();

  messages.forEach(msg => {
    // Skip system messages and media
    if (msg.content && !msg.isMedia && !msg.isSystem) {
      const words = extractWords(msg.content, filterStopWords);
      words.forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
    }
  });

  // Convert to array and sort by frequency
  return Array.from(wordCounts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Top 20 words
}

/**
 * Find unique words (words only one person uses)
 * @param {Array} participant1Messages - First participant's messages
 * @param {Array} participant2Messages - Second participant's messages
 * @returns {Object} Unique words for each participant
 */
export function findUniqueWords(participant1Messages, participant2Messages) {
  const words1 = new Set();
  const words2 = new Set();

  participant1Messages.forEach(msg => {
    if (msg.content && !msg.isMedia) {
      extractWords(msg.content).forEach(word => words1.add(word));
    }
  });

  participant2Messages.forEach(msg => {
    if (msg.content && !msg.isMedia) {
      extractWords(msg.content).forEach(word => words2.add(word));
    }
  });

  // Find words unique to each person
  const unique1 = Array.from(words1).filter(word => !words2.has(word));
  const unique2 = Array.from(words2).filter(word => !words1.has(word));

  return {
    participant1: unique1.slice(0, 10),
    participant2: unique2.slice(0, 10)
  };
}

/**
 * Analyze laugh patterns (English and Spanish)
 * @param {Array} messages - Messages
 * @returns {Object} Laugh pattern counts
 */
export function analyzeLaughPatterns(messages) {
  const patterns = {
    haha: 0,
    hehe: 0,
    jaja: 0,    // Spanish
    jeje: 0,    // Spanish
    jiji: 0,    // Spanish
    lol: 0,
    lmao: 0,
    lmfao: 0,
    rofl: 0
  };

  messages.forEach(msg => {
    // Skip system messages and media
    if (msg.content && !msg.isMedia && !msg.isSystem) {
      const lower = msg.content.toLowerCase();

      // English laughs
      if (/ha+h+a+/i.test(lower)) patterns.haha++;
      if (/he+h+e+/i.test(lower)) patterns.hehe++;

      // Spanish laughs
      if (/ja+j+a+/i.test(lower)) patterns.jaja++;
      if (/je+j+e+/i.test(lower)) patterns.jeje++;
      if (/ji+j+i+/i.test(lower)) patterns.jiji++;

      // Internet slang
      if (/\blol\b/i.test(lower)) patterns.lol++;
      if (/\blmao\b/i.test(lower)) patterns.lmao++;
      if (/\blmfao\b/i.test(lower)) patterns.lmfao++;
      if (/\brofl\b/i.test(lower)) patterns.rofl++;
    }
  });

  return patterns;
}
