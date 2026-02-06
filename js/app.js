/**
 * Main application orchestration
 */

import { parseWhatsAppChat } from './parser.js';
import { ChatData } from './dataModel.js';
import { calculateAllStatistics } from './statistics.js';
import { ChartManager } from './charts.js';
import {
  showLoading,
  hideLoading,
  showError,
  hideError,
  switchScreen,
  renderStats,
  createSummaryCard
} from './ui.js';
import { initializeExport } from './export.js';

/**
 * Application state
 */
let chatData = null;
let chartManager = null;
let isProcessing = false;
let currentDateFilter = null; // { from: Date, to: Date } or null for no filter

/**
 * Initialize the application
 */
function initializeApp() {
  // Initialize chart manager
  chartManager = new ChartManager();

  // Initialize file upload
  initializeFileUpload();

  // Initialize error modal close button
  const errorCloseButton = document.getElementById('error-close-button');
  errorCloseButton.addEventListener('click', hideError);

  // Initialize new analysis button
  const newAnalysisButton = document.getElementById('new-analysis-button');
  newAnalysisButton.addEventListener('click', resetApp);

  // Initialize export functionality
  initializeExport();

  // Initialize date range filter
  initializeDateFilter();

  // Initialize summary card button
  const summaryCardButton = document.getElementById('summary-card-button');
  if (summaryCardButton) {
    summaryCardButton.addEventListener('click', () => {
      if (chatData && chartManager) {
        createSummaryCard(chatData, chartManager);
      }
    });
  }

  // Initialize theme toggle
  initializeTheme();

  console.log('WhatsApp Conversation Analyzer initialized');
}

/**
 * Initialize file upload functionality
 */
function initializeFileUpload() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const browseButton = document.getElementById('browse-button');

  // Click to browse
  browseButton.addEventListener('click', () => {
    if (!isProcessing) {
      fileInput.click();
    }
  });

  dropZone.addEventListener('click', (e) => {
    // Only trigger on direct clicks to drop zone, not child elements
    if (!isProcessing && e.target === dropZone) {
      fileInput.click();
    }
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    if (isProcessing) return;

    const file = e.target.files[0];
    if (file) {
      handleFile(file);
    }
  });

  // Drag and drop
  dropZone.addEventListener('dragover', (e) => {
    if (!isProcessing) {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    }
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    if (isProcessing) return;

    e.preventDefault();
    dropZone.classList.remove('drag-over');

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  });
}

/**
 * Handle uploaded file
 * @param {File} file - Uploaded file
 */
async function handleFile(file) {
  // Validate file type
  if (!file.name.endsWith('.txt')) {
    showError('Please upload a .txt file (WhatsApp chat export)');
    return;
  }

  // Prevent multiple simultaneous uploads
  if (isProcessing) return;
  isProcessing = true;

  try {
    showLoading('Reading file...');

    // Read file content
    const content = await readFileContent(file);

    // Parse chat
    showLoading('Parsing messages...');
    await sleep(100); // Allow UI to update

    const messages = parseWhatsAppChat(content);

    if (messages.length === 0) {
      throw new Error('No messages found in file');
    }

    console.log(`Parsed ${messages.length} messages`);

    // Build data model
    showLoading('Building data model...');
    await sleep(100);

    chatData = new ChatData();
    chatData.loadMessages(messages);

    // Calculate statistics
    showLoading('Calculating statistics...');
    await sleep(100);

    calculateAllStatistics(chatData);

    // Get participants
    const participants = chatData.getAllParticipants();
    const participantNames = participants.map(p => p.name);

    console.log(`Found ${participants.length} participants:`, participantNames);

    // Initialize participant colors
    chartManager.initializeColors(participantNames);

    // Switch to app screen
    hideLoading();
    switchScreen('app');

    // Render comparison view with all participants
    renderStats(chatData, chartManager);

    // Setup date range inputs
    setupDateInputs();

    // Reset processing flag
    isProcessing = false;

    console.log('Analysis complete!');

  } catch (error) {
    console.error('Error processing file:', error);
    hideLoading();
    showError(error.message || 'Failed to process file. Please ensure this is a valid WhatsApp chat export.');
    isProcessing = false; // Reset on error
  }
}

/**
 * Read file content as text
 * @param {File} file - File to read
 * @returns {Promise<string>} File content
 */
function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      resolve(e.target.result);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Sleep utility for UI updates
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after timeout
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Reset app to upload screen
 */
function resetApp() {
  // Destroy charts
  if (chartManager) {
    chartManager.destroyAll();
  }

  // Clear data
  chatData = null;
  isProcessing = false;
  currentDateFilter = null;

  // Reset file input
  const fileInput = document.getElementById('file-input');
  fileInput.value = '';

  // Switch to upload screen
  switchScreen('upload');
}

/**
 * Initialize date range filter
 */
function initializeDateFilter() {
  const applyButton = document.getElementById('apply-date-filter');
  const resetButton = document.getElementById('reset-date-filter');

  applyButton.addEventListener('click', applyDateFilter);
  resetButton.addEventListener('click', resetDateFilter);

  // Initialize preset buttons
  document.querySelectorAll('.date-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      applyPresetFilter(preset);
    });
  });
}

/**
 * Setup date inputs with min/max from chat data
 */
function setupDateInputs() {
  if (!chatData || !chatData.metadata) return;

  const dateFrom = document.getElementById('date-from');
  const dateTo = document.getElementById('date-to');

  // Format dates as YYYY-MM-DD for input fields
  const startDate = chatData.metadata.startDate;
  const endDate = chatData.metadata.endDate;

  const minDate = formatDateForInput(startDate);
  const maxDate = formatDateForInput(endDate);

  // Set min/max attributes
  dateFrom.min = minDate;
  dateFrom.max = maxDate;
  dateTo.min = minDate;
  dateTo.max = maxDate;

  // Set default values to full range
  dateFrom.value = minDate;
  dateTo.value = maxDate;

  // Update info text
  updateDateFilterInfo();
}

/**
 * Format date as YYYY-MM-DD for input field
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Apply date filter
 */
function applyDateFilter() {
  if (!chatData) return;

  const dateFrom = document.getElementById('date-from');
  const dateTo = document.getElementById('date-to');

  const fromValue = dateFrom.value;
  const toValue = dateTo.value;

  // Validate inputs
  if (!fromValue || !toValue) {
    showError('Please select both start and end dates');
    return;
  }

  const fromDate = new Date(fromValue);
  const toDate = new Date(toValue);

  // Set time to start/end of day
  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);

  // Validate date range
  if (fromDate > toDate) {
    showError('Start date must be before end date');
    return;
  }

  // Apply filter
  currentDateFilter = { from: fromDate, to: toDate };

  // Re-render with filtered data
  renderWithDateFilter();

  // Update info text
  updateDateFilterInfo();
}

/**
 * Reset date filter to show all time
 */
function resetDateFilter() {
  if (!chatData) return;

  currentDateFilter = null;

  // Reset inputs to full range
  setupDateInputs();

  // Re-render with all data
  renderStats(chatData, chartManager);

  // Update info text
  updateDateFilterInfo();
}

/**
 * Apply a preset filter
 * @param {string} preset - Preset name
 */
function applyPresetFilter(preset) {
  if (!chatData) return;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let fromDate, toDate;

  switch (preset) {
    case 'last30days':
      toDate = new Date(today);
      fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - 30);
      break;

    case 'last3months':
      toDate = new Date(today);
      fromDate = new Date(today);
      fromDate.setMonth(fromDate.getMonth() - 3);
      break;

    case 'thisyear':
      fromDate = new Date(now.getFullYear(), 0, 1);
      toDate = new Date(today);
      break;

    case 'lastyear':
      fromDate = new Date(now.getFullYear() - 1, 0, 1);
      toDate = new Date(now.getFullYear() - 1, 11, 31);
      break;

    case 'weekends':
      // Filter to show only Saturday and Sunday messages
      applyWeekendsFilter();
      return;

    default:
      return;
  }

  // Ensure dates are within the chat data range
  const chatStart = chatData.metadata.startDate;
  const chatEnd = chatData.metadata.endDate;

  if (fromDate < chatStart) fromDate = new Date(chatStart);
  if (toDate > chatEnd) toDate = new Date(chatEnd);

  // Set time bounds
  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);

  // Update the date inputs
  document.getElementById('date-from').value = formatDateForInput(fromDate);
  document.getElementById('date-to').value = formatDateForInput(toDate);

  // Apply the filter
  currentDateFilter = { from: fromDate, to: toDate };
  reprocessChat();
}

/**
 * Apply weekends-only filter
 */
function applyWeekendsFilter() {
  // For simplicity, we'll use date filter to approximate weekends
  // Get all messages, filter to weekends, find min/max dates
  if (!chatData) return;

  const weekendDates = chatData.messages
    .filter(msg => {
      const day = msg.timestamp.getDay();
      return day === 0 || day === 6;
    })
    .map(msg => msg.timestamp);

  if (weekendDates.length === 0) {
    alert('No weekend messages found in this chat!');
    return;
  }

  // Just show info, actual filtering would require more complex logic
  alert('Weekend filtering would require custom implementation. Using Last 30 Days instead.');
  applyPresetFilter('last30days');
}

/**
 * Render stats with current date filter
 */
function renderWithDateFilter() {
  if (!chatData || !currentDateFilter) {
    renderStats(chatData, chartManager);
    return;
  }

  // Filter messages by date range
  const filteredMessages = chatData.messages.filter(msg => {
    return msg.timestamp >= currentDateFilter.from &&
           msg.timestamp <= currentDateFilter.to;
  });

  if (filteredMessages.length === 0) {
    showError('No messages found in selected date range');
    return;
  }

  // Create temporary chat data with filtered messages
  const filteredChatData = new ChatData();
  filteredChatData.loadMessages(filteredMessages);
  calculateAllStatistics(filteredChatData);

  // Render with filtered data
  renderStats(filteredChatData, chartManager);

  console.log(`Applied date filter: ${filteredMessages.length} messages`);
}

/**
 * Update date filter info text
 */
function updateDateFilterInfo() {
  const infoDiv = document.getElementById('date-range-info');

  if (!currentDateFilter) {
    infoDiv.textContent = 'Showing all messages';
    infoDiv.style.color = '#6B7280';
  } else {
    const fromStr = formatDateForDisplay(currentDateFilter.from);
    const toStr = formatDateForDisplay(currentDateFilter.to);
    infoDiv.textContent = `Filtered: ${fromStr} - ${toStr}`;
    infoDiv.style.color = '#45B5A9';
    infoDiv.style.fontWeight = '500';
  }
}

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDateForDisplay(date) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Initialize theme toggle functionality
 */
function initializeTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = themeToggle.querySelector('.theme-icon');

  // Check saved preference
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

  // Update Chart.js defaults for current theme
  updateChartDefaults(savedTheme);

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    themeIcon.textContent = next === 'dark' ? '☀️' : '🌙';

    // Update Chart.js defaults
    updateChartDefaults(next);

    // Re-render charts with new theme
    if (chartManager && chatData) {
      const participants = chatData.getAllParticipants().map(p => p.name);
      chartManager.updateAllCharts(chatData, participants);
    }
  });
}

/**
 * Update Chart.js default colors based on theme
 * @param {string} theme - 'light' or 'dark'
 */
function updateChartDefaults(theme) {
  const isDark = theme === 'dark';

  Chart.defaults.color = isDark ? '#e0e0e0' : '#2C3E50';
  Chart.defaults.borderColor = isDark ? '#404040' : '#E1E8ED';

  if (Chart.defaults.plugins && Chart.defaults.plugins.legend) {
    Chart.defaults.plugins.legend.labels.color = isDark ? '#e0e0e0' : '#2C3E50';
  }

  if (Chart.defaults.scale) {
    Chart.defaults.scale.grid.color = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
