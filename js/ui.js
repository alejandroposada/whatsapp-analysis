/**
 * UI rendering and DOM manipulation
 */

import { formatNumber, formatDuration, formatDate, animateNumber, calculatePercentage } from './utils.js';
import { calculateStreaks, analyzeActivityTrend, getMostActiveDays, analyzeConversationLengths, getResponseTimeByHour, predictPeakConversationTime, calculateRelationshipHealth, analyzeSentiment, getSentimentComparison } from './statistics.js';
import { analyzeWordFrequency, analyzeLaughPatterns } from './wordAnalysis.js';

// Global state for word filter
let filterStopWords = true;
let cachedParticipants = null;
let cachedChartManager = null;

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show loading overlay
 * @param {string} message - Loading message
 */
export function showLoading(message = 'Analyzing your conversation...') {
  const overlay = document.getElementById('loading-overlay');
  const text = overlay.querySelector('.loading-text');
  text.textContent = message;
  overlay.classList.remove('hidden');
}

/**
 * Hide loading overlay
 */
export function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  overlay.classList.add('hidden');
}

/**
 * Show error modal
 * @param {string} message - Error message
 */
export function showError(message) {
  const modal = document.getElementById('error-modal');
  const messageEl = document.getElementById('error-message');
  messageEl.textContent = message;
  modal.classList.remove('hidden');
}

/**
 * Hide error modal
 */
export function hideError() {
  const modal = document.getElementById('error-modal');
  modal.classList.add('hidden');
}

/**
 * Switch between upload and app screens
 * @param {string} screen - 'upload' or 'app'
 */
export function switchScreen(screen) {
  const uploadScreen = document.getElementById('upload-screen');
  const appScreen = document.getElementById('app-screen');

  if (screen === 'app') {
    uploadScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
  } else {
    uploadScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
  }
}

/**
 * Render all statistics UI
 * @param {ChatData} chatData - Chat data model
 * @param {ChartManager} chartManager - Chart manager instance
 */
export function renderStats(chatData, chartManager) {
  const participants = chatData.getAllParticipants();
  const participantNames = participants.map(p => p.name);

  // Cache for word filter toggle
  cachedParticipants = participants;
  cachedChartManager = chartManager;

  // Update hero card with comparison
  updateHeroCard(chatData, chartManager);

  // Update activity trend
  updateActivityTrend(chatData);

  // Update peak prediction
  updatePeakPrediction(chatData);

  // Update quick stats with comparison
  updateQuickStatsComparison(participants, chartManager);

  // Update streaks
  updateStreaks(chatData);

  // Update communication style comparison
  updateCommunicationStyleComparison(participants, chartManager);

  // Update response time comparison
  updateResponseTimeComparison(participants, chartManager);

  // Update conversation starters comparison
  updateConversationStartersComparison(participants, chartManager);

  // Update top words analysis
  updateTopWords(participants, chartManager);

  // Update emoji comparison (side-by-side)
  updateEmojiComparison(participants, chartManager);

  // Update heatmap section (creates canvases in DOM)
  updateHeatmapSection(participants, chartManager);

  // Update most active days
  updateMostActiveDays(chatData);

  // Update conversation length analysis
  updateConversationLengthAnalysis(chatData, chartManager);

  // Update response time heatmap
  updateResponseTimeHeatmap(chatData, chartManager);

  // Update relationship health metrics
  updateRelationshipHealth(chatData);

  // Update sentiment analysis
  updateSentimentAnalysis(chatData, participants, chartManager);

  // Hide participant comparison section (we're showing everything side-by-side now)
  const comparisonSection = document.getElementById('participant-comparison-section');
  if (comparisonSection) {
    comparisonSection.classList.add('hidden');
  }

  // Update charts AFTER DOM elements are created
  // Use setTimeout to ensure DOM is fully rendered
  setTimeout(() => {
    chartManager.updateAllCharts(chatData, participantNames);
  }, 0);
}

/**
 * Update activity trend banner
 * @param {ChatData} chatData - Chat data model
 */
function updateActivityTrend(chatData) {
  const trendInfo = analyzeActivityTrend(chatData);
  const banner = document.getElementById('activity-trend-banner');

  let trendIcon, trendText, trendClass;

  if (trendInfo.trend === 'increasing') {
    trendIcon = '📈';
    trendText = 'Messaging activity is increasing';
    trendClass = 'trend-increasing';
  } else if (trendInfo.trend === 'decreasing') {
    trendIcon = '📉';
    trendText = 'Messaging activity is decreasing';
    trendClass = 'trend-decreasing';
  } else {
    trendIcon = '➡️';
    trendText = 'Messaging activity is stable';
    trendClass = 'trend-stable';
  }

  const percentageText = Math.abs(trendInfo.percentageChange).toFixed(0);
  const direction = trendInfo.percentageChange > 0 ? 'up' : 'down';

  banner.className = `trend-banner ${trendClass}`;
  banner.innerHTML = `
    <div class="trend-content">
      <div class="trend-icon">${trendIcon}</div>
      <div class="trend-text">
        <div class="trend-title">${trendText}</div>
        <div class="trend-detail">
          ${percentageText}% ${direction} •
          ${trendInfo.comparison.firstPeriod.avgPerDay.toFixed(1)} →
          ${trendInfo.comparison.secondPeriod.avgPerDay.toFixed(1)} messages/day
        </div>
      </div>
    </div>
  `;
}

/**
 * Update peak conversation prediction
 * @param {ChatData} chatData - Chat data model
 */
function updatePeakPrediction(chatData) {
  const banner = document.getElementById('peak-prediction-banner');
  if (!banner) return;

  const prediction = predictPeakConversationTime(chatData);

  banner.className = 'prediction-banner';
  banner.innerHTML = `
    <div class="prediction-content">
      <div class="prediction-icon">🔮</div>
      <div class="prediction-text">
        <div class="prediction-title">You're most likely to chat on</div>
        <div class="prediction-detail">
          <strong>${prediction.day}s at ${prediction.hourFormatted}</strong>
          <span class="prediction-meta">• ${prediction.messageCount} messages (${prediction.confidence}% confidence)</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Update hero card with comparison stats
 * @param {ChatData} chatData - Chat data model
 * @param {ChartManager} chartManager - Chart manager
 */
function updateHeroCard(chatData, chartManager) {
  const label = document.getElementById('hero-label');
  const number = document.getElementById('hero-number');
  const subtitle = document.getElementById('hero-subtitle');

  label.textContent = 'Conversation Overview';

  const totalMessages = chatData.metadata.totalMessages;
  animateNumber(number, 0, totalMessages);

  if (chatData.metadata.startDate && chatData.metadata.endDate) {
    const startDate = formatDate(chatData.metadata.startDate);
    const endDate = formatDate(chatData.metadata.endDate);
    subtitle.textContent = `${startDate} - ${endDate}`;
  }
}

/**
 * Update quick stats with side-by-side comparison
 * @param {Array<ParticipantData>} participants - Participants
 * @param {ChartManager} chartManager - Chart manager
 */
function updateQuickStatsComparison(participants, chartManager) {
  const messagesEl = document.getElementById('stat-messages');
  const wordsEl = document.getElementById('stat-words');
  const lettersEl = document.getElementById('stat-letters');
  const emojisEl = document.getElementById('stat-emojis');

  // Create comparison HTML for each stat
  const totalMessages = participants.reduce((sum, p) => sum + p.messageCount, 0);
  const totalWords = participants.reduce((sum, p) => sum + p.wordCount, 0);
  const totalLetters = participants.reduce((sum, p) => sum + p.letterCount, 0);
  const totalEmojis = participants.reduce((sum, p) => sum + p.emojiCount, 0);

  messagesEl.innerHTML = createCleanComparisonHTML(participants, 'messageCount', totalMessages, chartManager);
  wordsEl.innerHTML = createCleanComparisonHTML(participants, 'wordCount', totalWords, chartManager);
  lettersEl.innerHTML = createCleanComparisonHTML(participants, 'letterCount', totalLetters, chartManager);
  emojisEl.innerHTML = createCleanComparisonHTML(participants, 'emojiCount', totalEmojis, chartManager);
}

/**
 * Create clean comparison HTML for a stat
 * @param {Array} participants - Participants
 * @param {string} field - Field name
 * @param {number} total - Total value
 * @param {ChartManager} chartManager - Chart manager
 * @returns {string} HTML string
 */
function createCleanComparisonHTML(participants, field, total, chartManager) {
  let html = '<div class="stat-comparison-grid">';

  participants.forEach(participant => {
    const value = participant[field];
    const percentage = ((value / total) * 100).toFixed(1);
    const color = chartManager.getColor(participant.name);

    // Get first name only for cleaner display
    const firstName = participant.name.split(' ')[0];

    html += `
      <div class="stat-person-box" style="background-color: ${color}20; border-left: 4px solid ${color};">
        <div class="stat-person-name" style="color: ${color};">${firstName}</div>
        <div class="stat-person-value">${formatNumber(value)}</div>
        <div class="stat-person-percent">${percentage}%</div>
      </div>
    `;
  });

  html += '</div>';
  return html;
}

/**
 * Update communication style comparison
 * @param {Array<ParticipantData>} participants - Participants
 * @param {ChartManager} chartManager - Chart manager
 */
function updateCommunicationStyleComparison(participants, chartManager) {
  const container = document.getElementById('communication-style-content');
  container.innerHTML = '';
  container.className = 'communication-style-grid';

  participants.forEach(participant => {
    const style = participant.getCommunicationStyle();
    const color = chartManager.getColor(participant.name);
    const firstName = participant.name.split(' ')[0];

    const column = document.createElement('div');
    column.className = 'style-column';
    column.style.borderTopColor = color;

    column.innerHTML = `
      <h3 class="style-column-header" style="color: ${color};">${firstName}</h3>

      <div class="style-metrics">
        <div class="style-metric">
          <div class="style-metric-icon">📏</div>
          <div class="style-metric-content">
            <div class="style-metric-label">Avg Message Length</div>
            <div class="style-metric-value">${style.averageWords.toFixed(1)} words</div>
            <div class="style-metric-sub">${style.averageCharacters.toFixed(0)} characters</div>
          </div>
        </div>

        <div class="style-metric">
          <div class="style-metric-icon">❓</div>
          <div class="style-metric-content">
            <div class="style-metric-label">Questions Asked</div>
            <div class="style-metric-value">${formatNumber(style.questionCount)}</div>
            <div class="style-metric-sub">${style.questionPercentage.toFixed(1)}% of messages</div>
          </div>
        </div>

        <div class="style-metric">
          <div class="style-metric-icon">❗</div>
          <div class="style-metric-content">
            <div class="style-metric-label">Exclamations</div>
            <div class="style-metric-value">${formatNumber(style.exclamationCount)}</div>
            <div class="style-metric-sub">${style.exclamationPercentage.toFixed(1)}% of messages</div>
          </div>
        </div>

        <div class="style-metric">
          <div class="style-metric-icon">🔊</div>
          <div class="style-metric-content">
            <div class="style-metric-label">ALL CAPS</div>
            <div class="style-metric-value">${formatNumber(style.allCapsCount)}</div>
            <div class="style-metric-sub">${style.allCapsPercentage.toFixed(1)}% of messages</div>
          </div>
        </div>

        <div class="style-metric">
          <div class="style-metric-icon">💬</div>
          <div class="style-metric-content">
            <div class="style-metric-label">Message Bursts</div>
            <div class="style-metric-value">${formatNumber(style.burstCount)}</div>
            <div class="style-metric-sub">Consecutive messages</div>
          </div>
        </div>
      </div>
    `;

    container.appendChild(column);
  });
}

/**
 * Update response time with side-by-side comparison
 * @param {Array<ParticipantData>} participants - Participants
 * @param {ChartManager} chartManager - Chart manager
 */
function updateResponseTimeComparison(participants, chartManager) {
  const container = document.querySelector('.response-time-content');
  container.innerHTML = '';

  // Create stats grid
  const statsGrid = document.createElement('div');
  statsGrid.className = 'response-time-stats-grid';

  participants.forEach(participant => {
    const avgTime = participant.getAverageResponseTime();
    const timeStr = avgTime > 0 ? formatDuration(avgTime) : 'N/A';
    const color = chartManager.getColor(participant.name);
    const firstName = participant.name.split(' ')[0];

    const statDiv = document.createElement('div');
    statDiv.className = 'response-time-stat';
    statDiv.style.borderTopColor = color;
    statDiv.innerHTML = `
      <div class="response-time-label" style="color: ${color};">${firstName}</div>
      <div class="response-time-value" style="color: ${color};">${timeStr}</div>
    `;
    statsGrid.appendChild(statDiv);
  });

  container.appendChild(statsGrid);

  // Add chart container
  const chartContainer = document.createElement('div');
  chartContainer.className = 'response-time-chart';
  chartContainer.innerHTML = '<canvas id="response-time-chart"></canvas>';
  container.appendChild(chartContainer);
}

/**
 * Update conversation starters with side-by-side comparison
 * @param {Array<ParticipantData>} participants - Participants
 * @param {ChartManager} chartManager - Chart manager
 */
function updateConversationStartersComparison(participants, chartManager) {
  const container = document.getElementById('conversation-starters-content');
  container.innerHTML = '';

  const totalStarters = participants.reduce((sum, p) => sum + p.conversationsStarted, 0);

  participants.forEach(participant => {
    const percentage = calculatePercentage(participant.conversationsStarted, totalStarters);
    const color = chartManager.getColor(participant.name);

    const item = document.createElement('div');
    item.className = 'starter-item';
    item.innerHTML = `
      <div class="starter-name" style="color: ${color};">${participant.name}</div>
      <div class="starter-stats">
        <div class="starter-count" style="color: ${color};">${formatNumber(participant.conversationsStarted)}</div>
        <div class="starter-percentage">${percentage.toFixed(1)}%</div>
      </div>
      <div class="starter-bar" style="width: ${percentage}%; background-color: ${color}80;"></div>
    `;
    container.appendChild(item);
  });
}

/**
 * Update top words analysis
 * @param {Array<ParticipantData>} participants - Participants
 * @param {ChartManager} chartManager - Chart manager
 */
function updateTopWords(participants, chartManager) {
  const grid = document.getElementById('top-words-grid');
  grid.innerHTML = '';

  // Initialize toggle button handler (only once)
  const toggleButton = document.getElementById('toggle-stop-words');
  if (toggleButton && !toggleButton.dataset.initialized) {
    toggleButton.dataset.initialized = 'true';
    toggleButton.addEventListener('click', () => {
      filterStopWords = !filterStopWords;
      toggleButton.querySelector('.toggle-text').textContent =
        filterStopWords ? 'Hide Common Words' : 'Show All Words';
      if (cachedParticipants && cachedChartManager) {
        updateTopWords(cachedParticipants, cachedChartManager);
      }
    });
  }

  participants.forEach(participant => {
    const color = chartManager.getColor(participant.name);
    const firstName = participant.name.split(' ')[0];
    const topWords = analyzeWordFrequency(participant.messages, filterStopWords);
    const laughs = analyzeLaughPatterns(participant.messages);

    const column = document.createElement('div');
    column.className = 'word-column';
    column.style.borderTopColor = color;

    let columnHTML = `
      <div class="word-column-header" style="color: ${color};">
        <h3>${firstName}</h3>
        <span class="word-total">${topWords.reduce((sum, w) => sum + w.count, 0)} unique words</span>
      </div>

      <div class="word-list">
    `;

    // Show top 15 words
    topWords.slice(0, 15).forEach((item, index) => {
      const barWidth = (item.count / topWords[0].count) * 100;
      columnHTML += `
        <div class="word-item">
          <div class="word-rank">#${index + 1}</div>
          <div class="word-content">
            <div class="word-label">
              <span class="word-text">${item.word}</span>
              <span class="word-count">${formatNumber(item.count)}</span>
            </div>
            <div class="word-bar" style="width: ${barWidth}%; background-color: ${color}80;"></div>
          </div>
        </div>
      `;
    });

    columnHTML += '</div>';

    // Add laugh patterns section
    const totalLaughs = Object.values(laughs).reduce((sum, val) => sum + val, 0);
    if (totalLaughs > 0) {
      columnHTML += `
        <div class="laugh-section">
          <h4 class="laugh-title">How ${firstName} laughs:</h4>
          <div class="laugh-items">
      `;

      Object.entries(laughs)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .forEach(([pattern, count]) => {
          const percentage = ((count / totalLaughs) * 100).toFixed(0);
          columnHTML += `
            <div class="laugh-item">
              <span class="laugh-pattern">${pattern}</span>
              <span class="laugh-count">${count} (${percentage}%)</span>
            </div>
          `;
        });

      columnHTML += '</div></div>';
    }

    column.innerHTML = columnHTML;
    grid.appendChild(column);
  });
}

/**
 * Update word clouds
 * @param {Array<ParticipantData>} participants - Participants
 * @param {ChartManager} chartManager - Chart manager
 */
function updateWordClouds(participants, chartManager) {
  const container = document.getElementById('word-cloud-container');
  if (!container) return;

  container.innerHTML = '';

  participants.forEach(participant => {
    const color = chartManager.getColor(participant.name);
    const firstName = participant.name.split(' ')[0];
    const topWords = analyzeWordFrequency(participant.messages);

    const cloudDiv = document.createElement('div');
    cloudDiv.className = 'word-cloud-section';

    const maxCount = topWords[0]?.count || 1;

    const wordsHTML = topWords.slice(0, 30).map((item, index) => {
      const size = Math.max(0.8, (item.count / maxCount) * 3);
      const opacity = 0.5 + (item.count / maxCount) * 0.5;
      return `<span class="cloud-word" style="font-size: ${size}em; color: ${color}; opacity: ${opacity};">${item.word}</span>`;
    }).join(' ');

    cloudDiv.innerHTML = `
      <h3 class="word-cloud-title" style="color: ${color};">${firstName}'s Word Cloud</h3>
      <div class="word-cloud">${wordsHTML}</div>
    `;

    container.appendChild(cloudDiv);
  });
}

/**
 * Update emoji comparison with side-by-side layout
 * @param {Array<ParticipantData>} participants - Participants
 * @param {ChartManager} chartManager - Chart manager
 */
function updateEmojiComparison(participants, chartManager) {
  const grid = document.getElementById('emoji-grid');
  grid.innerHTML = '';
  grid.className = 'emoji-comparison-grid';

  participants.forEach(participant => {
    const color = chartManager.getColor(participant.name);
    const topEmojis = participant.getTopEmojis(10);

    const column = document.createElement('div');
    column.className = 'emoji-comparison-column';
    column.style.borderTopColor = color;

    let columnHTML = `
      <div class="emoji-comparison-header" style="color: ${color};">
        <h3>${participant.name}</h3>
        <span class="emoji-total">${formatNumber(participant.emojiCount)} emojis</span>
      </div>
      <div class="emoji-list">
    `;

    if (topEmojis.length === 0) {
      columnHTML += '<p class="emoji-none">No emojis used</p>';
    } else {
      topEmojis.forEach(({ emoji, count }, index) => {
        columnHTML += `
          <div class="emoji-item">
            <span class="emoji-rank">#${index + 1}</span>
            <span class="emoji-char">${emoji}</span>
            <span class="emoji-count">${formatNumber(count)}</span>
          </div>
        `;
      });
    }

    columnHTML += '</div>';
    column.innerHTML = columnHTML;
    grid.appendChild(column);
  });
}

/**
 * Update streak statistics
 * @param {ChatData} chatData - Chat data model
 */
function updateStreaks(chatData) {
  const streakInfo = calculateStreaks(chatData);

  const longestStreakEl = document.getElementById('stat-longest-streak');
  const currentStreakEl = document.getElementById('stat-current-streak');
  const currentStreakCard = document.getElementById('current-streak-card');

  animateNumber(longestStreakEl, 0, streakInfo.longestStreak);
  animateNumber(currentStreakEl, 0, streakInfo.currentStreak);

  // Highlight current streak if active
  if (streakInfo.currentStreak > 0) {
    currentStreakCard.classList.add('stat-card-active');
  } else {
    currentStreakCard.classList.remove('stat-card-active');
  }
}

/**
 * Update heatmap section with side-by-side heatmaps
 * @param {Array<ParticipantData>} participants - Participants
 * @param {ChartManager} chartManager - Chart manager
 */
function updateHeatmapSection(participants, chartManager) {
  const container = document.querySelector('.heatmap-container');
  if (!container) {
    return;
  }

  container.innerHTML = '';
  container.className = 'heatmap-comparison-container';

  participants.forEach((participant, index) => {
    const color = chartManager.getColor(participant.name);
    const firstName = participant.name.split(' ')[0];
    // Create safe ID without spaces or special characters
    const safeId = `heatmap-${index}`;

    const heatmapDiv = document.createElement('div');
    heatmapDiv.className = 'heatmap-wrapper';
    heatmapDiv.innerHTML = `
      <h3 class="heatmap-title" style="color: ${color};">${firstName}</h3>
      <canvas id="${safeId}" data-participant="${participant.name}"></canvas>
    `;
    container.appendChild(heatmapDiv);
  });
}

/**
 * Update most active days display
 * @param {ChatData} chatData - Chat data model
 */
function updateMostActiveDays(chatData) {
  const container = document.getElementById('most-active-days-content');
  if (!container) return;

  const mostActive = getMostActiveDays(chatData, 10);

  container.innerHTML = `
    <div class="active-days-list">
      ${mostActive.map((day, index) => `
        <div class="active-day-item" style="animation-delay: ${index * 0.05}s;">
          <div class="active-day-rank">#${index + 1}</div>
          <div class="active-day-info">
            <div class="active-day-date">${formatDate(day.date)}</div>
            <div class="active-day-meta">${day.dayName}</div>
          </div>
          <div class="active-day-count">${formatNumber(day.count)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Update conversation length analysis display
 * @param {ChatData} chatData - Chat data model
 * @param {ChartManager} chartManager - Chart manager
 */
function updateConversationLengthAnalysis(chatData, chartManager) {
  const analysis = analyzeConversationLengths(chatData);

  const avgEl = document.getElementById('avg-convo-length');
  const totalEl = document.getElementById('total-conversations');
  const longestEl = document.getElementById('longest-convo');

  if (avgEl) avgEl.textContent = analysis.average.toFixed(1) + ' turns';
  if (totalEl) totalEl.textContent = formatNumber(analysis.total);
  if (longestEl) longestEl.textContent = analysis.longest + ' turns';
}

/**
 * Update response time heatmap display
 * @param {ChatData} chatData - Chat data model
 * @param {ChartManager} chartManager - Chart manager
 */
function updateResponseTimeHeatmap(chatData, chartManager) {
  const container = document.getElementById('response-time-heatmap-container');
  if (!container) return;

  const participants = chatData.getAllParticipants();
  container.innerHTML = '';

  participants.forEach(participant => {
    const color = chartManager.getColor(participant.name);
    const firstName = participant.name.split(' ')[0];
    const hourData = getResponseTimeByHour(chatData, participant.name);

    // Find max for scaling
    const maxMinutes = Math.max(...hourData.map(d => d.avgMinutes).filter(m => m > 0), 1);

    const section = document.createElement('div');
    section.className = 'response-heatmap-section';
    section.innerHTML = `
      <h3 class="response-heatmap-title" style="color: ${color};">${firstName}</h3>
      <div class="response-heatmap-grid">
        ${hourData.map(data => {
          const intensity = data.avgMinutes > 0 ? (data.avgMinutes / maxMinutes) : 0;
          const bgOpacity = intensity * 0.8 + 0.1;
          const displayTime = data.count > 0 ? formatResponseTime(data.avgMinutes) : '-';

          return `
            <div class="response-heatmap-cell"
                 style="background-color: ${color}${Math.floor(bgOpacity * 255).toString(16).padStart(2, '0')};"
                 title="Hour ${data.hour}:00 - Avg: ${displayTime} (${data.count} responses)">
              <div class="response-cell-hour">${data.hour}</div>
              <div class="response-cell-time">${displayTime}</div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="response-heatmap-legend">
        <span>Faster</span>
        <div class="response-legend-gradient" style="background: linear-gradient(to right, ${color}20, ${color});"></div>
        <span>Slower</span>
      </div>
    `;

    container.appendChild(section);
  });
}

/**
 * Format response time for display
 * @param {number} minutes - Response time in minutes
 * @returns {string} Formatted string
 */
function formatResponseTime(minutes) {
  if (minutes < 1) return '<1m';
  if (minutes < 60) return Math.round(minutes) + 'm';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/**
 * Update relationship health metrics display
 * @param {ChatData} chatData - Chat data model
 */
function updateRelationshipHealth(chatData) {
  const container = document.getElementById('relationship-health-container');
  if (!container) return;

  const health = calculateRelationshipHealth(chatData);

  if (!health) {
    container.innerHTML = '<p class="health-note">Relationship health metrics are only available for 1-on-1 conversations.</p>';
    return;
  }

  const getScoreColor = (score) => {
    if (score >= 80) return '#2ECC71';
    if (score >= 60) return '#45B5A9';
    if (score >= 40) return '#FFB84D';
    return '#E74C3C';
  };

  container.innerHTML = `
    <div class="health-dashboard">
      <div class="health-overall">
        <div class="health-score-circle" style="border-color: ${getScoreColor(health.overallHealth)};">
          <div class="health-score-number">${health.overallHealth}</div>
          <div class="health-score-label">Overall Health</div>
        </div>
        <div class="health-interpretation">${health.interpretation}</div>
      </div>

      <div class="health-metrics">
        <div class="health-metric">
          <div class="health-metric-header">
            <span class="health-metric-name">⚖️ Conversation Balance</span>
            <span class="health-metric-value">${health.reciprocityScore}%</span>
          </div>
          <div class="health-metric-bar">
            <div class="health-metric-fill" style="width: ${health.reciprocityScore}%; background-color: ${getScoreColor(health.reciprocityScore)};"></div>
          </div>
          <div class="health-metric-detail">
            ${health.details.p1.name}: ${health.details.p1.messagePercentage.toFixed(1)}% •
            ${health.details.p2.name}: ${health.details.p2.messagePercentage.toFixed(1)}%
          </div>
        </div>

        <div class="health-metric">
          <div class="health-metric-header">
            <span class="health-metric-name">⚡ Response Speed</span>
            <span class="health-metric-value">${health.responseScore}%</span>
          </div>
          <div class="health-metric-bar">
            <div class="health-metric-fill" style="width: ${health.responseScore}%; background-color: ${getScoreColor(health.responseScore)};"></div>
          </div>
          <div class="health-metric-detail">
            Average response: ${formatDuration((health.details.p1.avgResponseTime + health.details.p2.avgResponseTime) / 2)}
          </div>
        </div>

        <div class="health-metric">
          <div class="health-metric-header">
            <span class="health-metric-name">💬 Engagement Level</span>
            <span class="health-metric-value">${health.engagementScore}%</span>
          </div>
          <div class="health-metric-bar">
            <div class="health-metric-fill" style="width: ${health.engagementScore}%; background-color: ${getScoreColor(health.engagementScore)};"></div>
          </div>
          <div class="health-metric-detail">
            Average message: ${((health.details.p1.avgWordCount + health.details.p2.avgWordCount) / 2).toFixed(1)} words
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Create summary card (Wrapped-style)
 * @param {ChatData} chatData - Chat data model
 * @param {ChartManager} chartManager - Chart manager
 */
export function createSummaryCard(chatData, chartManager) {
  const participants = chatData.getAllParticipants();
  const streaks = calculateStreaks(chatData);
  const activityTrend = analyzeActivityTrend(chatData);
  const mostActiveDay = getMostActiveDays(chatData, 1)[0];

  // Create overlay modal
  const modal = document.createElement('div');
  modal.id = 'summary-card-modal';
  modal.className = 'summary-modal';

  modal.innerHTML = `
    <div class="summary-card">
      <button class="summary-close" onclick="this.closest('.summary-modal').remove()">×</button>

      <div class="summary-header">
        <h1>Your Conversation Story</h1>
        <p>${formatDate(chatData.metadata.startDate)} - ${formatDate(chatData.metadata.endDate)}</p>
      </div>

      <div class="summary-section">
        <div class="summary-stat-big">
          <div class="summary-number">${formatNumber(chatData.metadata.totalMessages)}</div>
          <div class="summary-label">Total Messages</div>
        </div>
      </div>

      <div class="summary-section">
        <h2>Most Active Day</h2>
        <div class="summary-highlight">
          ${formatDate(mostActiveDay.date)}
          <div class="summary-subtext">${mostActiveDay.count} messages</div>
        </div>
      </div>

      <div class="summary-section">
        <h2>Longest Streak</h2>
        <div class="summary-highlight">
          ${streaks.longestStreak} days
          ${streaks.streaks.length > 0 ? `
            <div class="summary-subtext">${formatDate(streaks.streaks[0].startDate)} - ${formatDate(streaks.streaks[0].endDate)}</div>
          ` : ''}
        </div>
      </div>

      <div class="summary-section">
        <h2>Activity Trend</h2>
        <div class="summary-trend ${activityTrend.trend}">
          ${activityTrend.trend === 'increasing' ? '📈' : activityTrend.trend === 'decreasing' ? '📉' : '➡️'}
          ${Math.abs(activityTrend.percentageChange).toFixed(1)}% ${activityTrend.trend}
        </div>
      </div>

      <div class="summary-participants">
        ${participants.map(p => {
          const color = chartManager.getColor(p.name);
          return `
            <div class="summary-participant" style="border-left: 4px solid ${color};">
              <div class="summary-participant-name">${p.name}</div>
              <div class="summary-participant-stat">${formatNumber(p.messageCount)} messages</div>
              <div class="summary-participant-stat">${p.getTopEmojis(1)[0]?.emoji || '💬'} ${p.getTopEmojis(1)[0]?.count || 0}</div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="summary-footer">
        <button class="summary-export-btn" onclick="alert('Screenshot this card to share!')">Share 📷</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

/**
 * Update sentiment analysis section
 * @param {ChatData} chatData - Chat data model
 * @param {Array} participants - Array of participant data
 * @param {ChartManager} chartManager - Chart manager
 */
function updateSentimentAnalysis(chatData, participants, chartManager) {
  const container = document.getElementById('sentiment-analysis-content');
  if (!container) {
    return;
  }

  // Check if sentiment library is available
  if (!window.Sentiment) {
    container.innerHTML = '<p style="color: #E74C3C; padding: 20px; text-align: center;">Sentiment analysis library is loading... Please wait a moment and try again.</p>';
    return;
  }

  let html = '<div class="sentiment-grid">';

  try {
    participants.forEach(participant => {
      const sentiment = analyzeSentiment(chatData, participant.name);

      if (!sentiment) {
        return;
      }

      const color = chartManager.getColor(participant.name);

    // Determine overall mood
    let moodEmoji = '😐';
    let moodText = 'Neutral';
    let moodColor = '#7F8C8D';

    if (sentiment.overall > 0.15) {
      moodEmoji = '😊';
      moodText = 'Positive';
      moodColor = '#27AE60';
    } else if (sentiment.overall > 0.05) {
      moodEmoji = '🙂';
      moodText = 'Slightly Positive';
      moodColor = '#52C77A';
    } else if (sentiment.overall < -0.15) {
      moodEmoji = '😔';
      moodText = 'Negative';
      moodColor = '#E74C3C';
    } else if (sentiment.overall < -0.05) {
      moodEmoji = '😕';
      moodText = 'Slightly Negative';
      moodColor = '#E67E22';
    }

    const total = sentiment.positive + sentiment.negative + sentiment.neutral;
    const positivePercent = ((sentiment.positive / total) * 100).toFixed(1);
    const negativePercent = ((sentiment.negative / total) * 100).toFixed(1);
    const neutralPercent = ((sentiment.neutral / total) * 100).toFixed(1);

    html += `
      <div class="sentiment-participant" style="border-left: 4px solid ${color};">
        <div class="sentiment-header">
          <div class="sentiment-name">${participant.name}</div>
          <div class="sentiment-mood" style="color: ${moodColor};">
            <span class="sentiment-emoji">${moodEmoji}</span>
            <span class="sentiment-mood-text">${moodText}</span>
          </div>
        </div>
        <div class="sentiment-score">
          <div class="sentiment-score-label">Overall Score</div>
          <div class="sentiment-score-value" style="color: ${moodColor};">
            ${sentiment.overall.toFixed(2)}
          </div>
        </div>
        <div class="sentiment-breakdown">
          <div class="sentiment-breakdown-item">
            <span class="sentiment-breakdown-label">😊 Positive</span>
            <span class="sentiment-breakdown-value">${positivePercent}%</span>
          </div>
          <div class="sentiment-breakdown-item">
            <span class="sentiment-breakdown-label">😔 Negative</span>
            <span class="sentiment-breakdown-value">${negativePercent}%</span>
          </div>
          <div class="sentiment-breakdown-item">
            <span class="sentiment-breakdown-label">😐 Neutral</span>
            <span class="sentiment-breakdown-value">${neutralPercent}%</span>
          </div>
        </div>
      </div>
    `;
    });

    html += '</div>';
    container.innerHTML = html;
  } catch (error) {
    console.error('Error rendering sentiment analysis:', error);
    container.innerHTML = '<p style="color: #E74C3C; padding: 20px; text-align: center;">Error analyzing sentiment. Please try again.</p>';
  }
}
