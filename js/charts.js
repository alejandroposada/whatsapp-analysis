/**
 * Chart.js configuration and management
 */

import { getHourLabel, getShortDayName } from './utils.js';
import { getMessageLengthTrend, analyzeConversationLengths, getConversationInitiatorPatterns, getQuestionTrend, analyzeSentiment } from './statistics.js';

/**
 * Chart color scheme - consistent colors per participant
 */
const PARTICIPANT_COLORS = [
  '#4A9EFF', // Blue
  '#FFB84D', // Orange
  '#9B59B6', // Purple
  '#2ECC71', // Green
  '#E74C3C', // Red
  '#45B5A9'  // Teal
];

/**
 * Chart manager class
 */
export class ChartManager {
  constructor() {
    this.charts = {};
    this.participantColors = new Map(); // Map participant names to colors
  }

  /**
   * Initialize participant colors
   * @param {Array<string>} participants - Array of participant names
   */
  initializeColors(participants) {
    participants.forEach((name, index) => {
      this.participantColors.set(name, PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length]);
    });
  }

  /**
   * Get color for participant
   * @param {string} name - Participant name
   * @returns {string} Color hex code
   */
  getColor(name) {
    return this.participantColors.get(name) || PARTICIPANT_COLORS[0];
  }

  /**
   * Get all participant colors as object
   * @returns {Object} Map of name -> color
   */
  getAllColors() {
    return Object.fromEntries(this.participantColors);
  }

  /**
   * Create hourly activity chart with all participants
   * @param {ChatData} chatData - Chat data model
   * @param {Array<string>} participants - Participant names to show
   */
  createHourlyChart(chatData, participants) {
    const ctx = document.getElementById('hourly-chart');
    if (!ctx) return;

    if (this.charts.hourly) {
      this.charts.hourly.destroy();
    }

    const labels = Array.from({ length: 24 }, (_, i) => getHourLabel(i));

    // Create dataset for each participant
    const datasets = participants.map(participantName => {
      const hourlyData = new Array(24).fill(0);
      for (let hour = 0; hour < 24; hour++) {
        const messages = chatData.getMessagesByHour(hour, participantName);
        hourlyData[hour] = messages.length;
      }

      const color = this.getColor(participantName);
      return {
        label: participantName,
        data: hourlyData,
        backgroundColor: color + '80',
        borderColor: color,
        borderWidth: 2,
        borderRadius: 6
      };
    });

    this.charts.hourly = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: { size: 13, weight: '600' },
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            stacked: false,
            ticks: { precision: 0 },
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          },
          x: {
            stacked: false,
            grid: { display: false }
          }
        }
      }
    });
  }

  /**
   * Create daily activity chart with all participants
   * @param {ChatData} chatData - Chat data model
   * @param {Array<string>} participants - Participant names to show
   */
  createDailyChart(chatData, participants) {
    const ctx = document.getElementById('daily-chart');
    if (!ctx) return;

    if (this.charts.daily) {
      this.charts.daily.destroy();
    }

    const labels = Array.from({ length: 7 }, (_, i) => getShortDayName(i));

    const datasets = participants.map(participantName => {
      const dailyData = new Array(7).fill(0);
      for (let day = 0; day < 7; day++) {
        const messages = chatData.getMessagesByDay(day, participantName);
        dailyData[day] = messages.length;
      }

      const color = this.getColor(participantName);
      return {
        label: participantName,
        data: dailyData,
        backgroundColor: color + '80',
        borderColor: color,
        borderWidth: 2,
        borderRadius: 6
      };
    });

    this.charts.daily = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: { size: 13, weight: '600' },
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            stacked: false,
            ticks: { precision: 0 },
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          },
          x: {
            stacked: false,
            grid: { display: false }
          }
        }
      }
    });
  }

  /**
   * Create timeline chart with all participants
   * @param {ChatData} chatData - Chat data model
   * @param {Array<string>} participants - Participant names to show
   */
  createTimelineChart(chatData, participants) {
    const ctx = document.getElementById('timeline-chart');
    if (!ctx) return;

    if (this.charts.timeline) {
      this.charts.timeline.destroy();
    }

    // Get all unique dates
    const allDates = new Set();
    chatData.messages.forEach(msg => {
      allDates.add(msg.timestamp.toDateString());
    });
    const sortedDates = Array.from(allDates).sort((a, b) =>
      new Date(a).getTime() - new Date(b).getTime()
    );

    const labels = sortedDates.map(d => new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }));

    const datasets = participants.map(participantName => {
      const data = sortedDates.map(dateStr => {
        const messages = chatData.messagesByDate.get(dateStr) || [];
        return messages.filter(m => m.participant === participantName).length;
      });

      const color = this.getColor(participantName);
      return {
        label: participantName,
        data,
        backgroundColor: color + '20',
        borderColor: color,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5
      };
    });

    this.charts.timeline = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: { size: 13, weight: '600' },
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          },
          x: {
            grid: { display: false },
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              maxTicksLimit: 20
            }
          }
        }
      }
    });
  }

  /**
   * Create response time distribution chart for each participant
   * @param {ChatData} chatData - Chat data model
   * @param {Array<string>} participants - Participant names
   */
  createResponseTimeChart(chatData, participants) {
    const ctx = document.getElementById('response-time-chart');
    if (!ctx) return;

    if (this.charts.responseTime) {
      this.charts.responseTime.destroy();
    }

    const buckets = ['<1m', '1-5m', '5-30m', '30m-1h', '1h+'];

    const datasets = participants.map(participantName => {
      const participant = chatData.getParticipant(participantName);
      const distribution = participant.getResponseTimeDistribution();
      const data = buckets.map(bucket => distribution[bucket] || 0);

      const color = this.getColor(participantName);
      return {
        label: participantName,
        data,
        backgroundColor: color + '80',
        borderColor: color,
        borderWidth: 2,
        borderRadius: 6
      };
    });

    this.charts.responseTime = new Chart(ctx, {
      type: 'bar',
      data: { labels: buckets, datasets },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: { size: 13, weight: '600' },
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            stacked: false,
            ticks: { precision: 0 },
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          },
          y: {
            stacked: false,
            grid: { display: false }
          }
        }
      }
    });
  }

  /**
   * Create activity heatmap on canvas for a specific participant
   * @param {Array<Array<number>>} heatmapData - 7x24 grid
   * @param {number} index - Participant index
   * @param {string} participantName - Participant name
   */
  createHeatmapByIndex(heatmapData, index, participantName) {
    const canvas = document.getElementById(`heatmap-${index}`);
    if (!canvas) {
      console.warn(`Canvas heatmap-${index} not found for ${participantName}`);
      return;
    }

    const ctx = canvas.getContext('2d');
    const cellSize = 35;
    const paddingLeft = 70;
    const paddingTop = 40;
    const paddingRight = 20;
    const paddingBottom = 50;
    const width = 24 * cellSize + paddingLeft + paddingRight;
    const height = 7 * cellSize + paddingTop + paddingBottom;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    const flatData = heatmapData.flat();
    const maxValue = Math.max(...flatData, 1);

    const baseColor = this.getColor(participantName);
    const rgb = this.hexToRgb(baseColor);

    // Draw heatmap cells
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const value = heatmapData[day][hour];
        const intensity = value / maxValue;

        const r = Math.floor(rgb.r + (255 - rgb.r) * (1 - intensity));
        const g = Math.floor(rgb.g + (255 - rgb.g) * (1 - intensity));
        const b = Math.floor(rgb.b + (255 - rgb.b) * (1 - intensity));

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(
          paddingLeft + hour * cellSize,
          paddingTop + day * cellSize,
          cellSize - 2,
          cellSize - 2
        );

        if (value > 0) {
          ctx.fillStyle = intensity > 0.5 ? '#fff' : '#2C3E50';
          ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            value.toString(),
            paddingLeft + hour * cellSize + cellSize / 2,
            paddingTop + day * cellSize + cellSize / 2
          );
        }
      }
    }

    // Draw day labels (Y-axis)
    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let day = 0; day < 7; day++) {
      ctx.fillText(
        getShortDayName(day),
        paddingLeft - 15,
        paddingTop + day * cellSize + cellSize / 2
      );
    }

    // Draw hour labels (X-axis) - every 2 hours for clarity
    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let hour = 0; hour < 24; hour += 2) {
      const label = hour === 0 ? '12AM' :
                    hour < 12 ? `${hour}AM` :
                    hour === 12 ? '12PM' :
                    `${hour - 12}PM`;
      ctx.fillText(
        label,
        paddingLeft + hour * cellSize + cellSize / 2,
        paddingTop + 7 * cellSize + 10
      );
    }

    // Draw axis titles
    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';

    // Y-axis title (rotated) - with more spacing from day labels
    ctx.save();
    ctx.translate(8, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Day of Week', 0, 0);
    ctx.restore();

    // X-axis title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Hour of Day', width / 2, paddingTop + 7 * cellSize + 35);
  }

  /**
   * Convert hex color to RGB
   * @param {string} hex - Hex color
   * @returns {Object} RGB values
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 69, g: 181, b: 169 };
  }

  /**
   * Create question trend chart
   * @param {ChatData} chatData - Chat data model
   * @param {Array<string>} participants - Participant names
   */
  createQuestionTrendChart(chatData, participants) {
    const ctx = document.getElementById('question-trend-chart');
    if (!ctx) return;

    if (this.charts.questionTrend) {
      this.charts.questionTrend.destroy();
    }

    const datasets = participants.map(participantName => {
      const trend = getQuestionTrend(chatData, participantName);
      const color = this.getColor(participantName);

      return {
        label: participantName,
        data: trend.map(t => ({ x: t.period, y: t.questionPercentage })),
        borderColor: color,
        backgroundColor: color + '20',
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      };
    });

    this.charts.questionTrend = new Chart(ctx, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Questions (%)',
              font: { size: 13, weight: '600' }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            type: 'category',
            title: {
              display: true,
              text: 'Time Period',
              font: { size: 13, weight: '600' }
            },
            grid: {
              display: false
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: { size: 13, weight: '600' },
              padding: 15
            }
          },
          title: {
            display: true,
            text: 'Question Asking Trend Over Time',
            font: { size: 15, weight: '700' }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Create initiator patterns chart
   * @param {ChatData} chatData - Chat data model
   * @param {Array<string>} participants - Participant names
   */
  createInitiatorPatternsChart(chatData, participants) {
    const ctx = document.getElementById('initiator-patterns-chart');
    if (!ctx) return;

    if (this.charts.initiatorPatterns) {
      this.charts.initiatorPatterns.destroy();
    }

    const patterns = getConversationInitiatorPatterns(chatData);

    const datasets = participants.map(participantName => {
      const pattern = patterns.get(participantName);
      const color = this.getColor(participantName);

      return {
        label: participantName,
        data: pattern.byHour,
        backgroundColor: color + '80',
        borderColor: color,
        borderWidth: 2,
        borderRadius: 4
      };
    });

    this.charts.initiatorPatterns = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Array.from({ length: 24 }, (_, i) => getHourLabel(i)),
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            stacked: true,
            beginAtZero: true,
            title: {
              display: true,
              text: 'Conversations Started',
              font: { size: 13, weight: '600' }
            }
          },
          x: {
            stacked: true,
            title: {
              display: true,
              text: 'Hour of Day',
              font: { size: 13, weight: '600' }
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: { size: 13, weight: '600' },
              padding: 15
            }
          },
          title: {
            display: true,
            text: 'Who Starts Conversations by Hour',
            font: { size: 15, weight: '700' }
          }
        }
      }
    });
  }

  /**
   * Create sentiment trend chart
   * @param {ChatData} chatData - Chat data model
   * @param {Array<string>} participants - Participant names
   */
  createSentimentTrendChart(chatData, participants) {
    const ctx = document.getElementById('sentiment-trend-chart');
    if (!ctx) return;

    if (this.charts.sentimentTrend) {
      this.charts.sentimentTrend.destroy();
    }

    if (!window.Sentiment) return;

    const datasets = participants.map(participantName => {
      const sentiment = analyzeSentiment(chatData, participantName);
      const color = this.getColor(participantName);

      return {
        label: participantName,
        data: sentiment.trend.map(t => ({ x: t.period, y: t.avgScore })),
        borderColor: color,
        backgroundColor: color + '20',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2
      };
    });

    this.charts.sentimentTrend = new Chart(ctx, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            title: {
              display: true,
              text: 'Sentiment Score',
              font: { size: 13, weight: '600' }
            },
            ticks: {
              callback: function(value) {
                return value.toFixed(1);
              }
            }
          },
          x: {
            type: 'category',
            title: {
              display: true,
              text: 'Time Period',
              font: { size: 13, weight: '600' }
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: { size: 13, weight: '600' },
              padding: 15
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Create conversation length chart
   * @param {ChatData} chatData - Chat data model
   */
  createConversationLengthChart(chatData) {
    const ctx = document.getElementById('conversation-length-chart');
    if (!ctx) return;

    if (this.charts.conversationLength) {
      this.charts.conversationLength.destroy();
    }

    const analysis = analyzeConversationLengths(chatData);
    const { short, medium, long } = analysis.distribution;

    this.charts.conversationLength = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [
          `Short (1-5 turns): ${short}`,
          `Medium (6-15 turns): ${medium}`,
          `Long (16+ turns): ${long}`
        ],
        datasets: [{
          data: [short, medium, long],
          backgroundColor: ['#4A9EFF', '#FFB84D', '#9B59B6'],
          borderWidth: 3,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 13, weight: '600' },
              padding: 15
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const percent = ((context.parsed / analysis.total) * 100).toFixed(1);
                return `${context.label} - ${percent}%`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Create message length trend chart
   * @param {ChatData} chatData - Chat data model
   * @param {Array<string>} participants - Participant names
   */
  createMessageLengthTrendChart(chatData, participants) {
    const ctx = document.getElementById('message-length-trend-chart');
    if (!ctx) return;

    if (this.charts.messageLengthTrend) {
      this.charts.messageLengthTrend.destroy();
    }

    const datasets = participants.map(participantName => {
      const trend = getMessageLengthTrend(chatData, participantName, 'month');
      const color = this.getColor(participantName);

      return {
        label: participantName,
        data: trend.map(t => ({ x: t.period, y: t.averageWords })),
        borderColor: color,
        backgroundColor: color + '20',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      };
    });

    this.charts.messageLengthTrend = new Chart(ctx, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Average Words per Message',
              font: { size: 13, weight: '600' }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            type: 'category',
            title: {
              display: true,
              text: 'Time Period',
              font: { size: 13, weight: '600' }
            },
            grid: {
              display: false
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: { size: 13, weight: '600' },
              padding: 15
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} words`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Update all charts with chat data
   * @param {ChatData} chatData - Chat data model
   * @param {Array<string>} participants - Participant names
   */
  updateAllCharts(chatData, participants) {
    this.createHourlyChart(chatData, participants);
    this.createDailyChart(chatData, participants);
    this.createTimelineChart(chatData, participants);
    this.createResponseTimeChart(chatData, participants);
    this.createMessageLengthTrendChart(chatData, participants);
    this.createConversationLengthChart(chatData);
    this.createInitiatorPatternsChart(chatData, participants);
    this.createSentimentTrendChart(chatData, participants);

    // Create heatmaps for each participant
    participants.forEach((participantName, index) => {
      const heatmapData = chatData.getActivityHeatmap(participantName);
      this.createHeatmapByIndex(heatmapData, index, participantName);
    });
  }

  /**
   * Destroy all charts
   */
  destroyAll() {
    Object.values(this.charts).forEach(chart => {
      if (chart && chart.destroy) {
        chart.destroy();
      }
    });
    this.charts = {};
  }
}
