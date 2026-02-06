/**
 * Participant filtering logic
 */

import { getStatistics } from './statistics.js';
import { renderStats, updateActiveFilter } from './ui.js';

/**
 * Filter manager class
 */
export class FilterManager {
  constructor(chatData, chartManager) {
    this.chatData = chatData;
    this.chartManager = chartManager;
    this.currentFilter = 'Total';
  }

  /**
   * Initialize filter button event listeners
   */
  initializeFilters() {
    const filterButtons = document.querySelectorAll('.filter-button');

    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        const filterName = button.dataset.filter;
        this.applyFilter(filterName);
      });
    });
  }

  /**
   * Apply filter and update UI
   * @param {string} filterName - Filter name ('Total' or participant name)
   */
  applyFilter(filterName) {
    // Don't reapply same filter
    if (filterName === this.currentFilter) {
      return;
    }

    this.currentFilter = filterName;

    // Update active button
    updateActiveFilter(filterName);

    // Get statistics for filter
    const stats = getStatistics(this.chatData, filterName);

    if (!stats) {
      console.error(`Could not get statistics for filter: ${filterName}`);
      return;
    }

    // Update all UI elements with filtered data
    renderStats(stats, this.chatData, this.chartManager, filterName);

    // Scroll to top smoothly
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  /**
   * Get current filter
   * @returns {string} Current filter name
   */
  getCurrentFilter() {
    return this.currentFilter;
  }

  /**
   * Reset to Total filter
   */
  resetFilter() {
    this.applyFilter('Total');
  }
}
