# WhatsApp Conversation Analyzer

A privacy-focused web app for analyzing your WhatsApp chat exports. All processing happens locally in your browser - your conversations never leave your device.

## Features

### Core Analytics
- Message Statistics - Total messages, words, letters, emojis
- Activity Patterns - Hourly, daily, and monthly trends
- Response Time Analysis - Average response times by hour
- Communication Style - Message length patterns and trends
- Conversation Metrics - Conversation length analysis and initiator patterns

### Advanced Insights
- Sentiment Analysis - AI-powered sentiment tracking using the sentiment.js library
- Relationship Health Score - Reciprocity and engagement metrics
- Peak Prediction - Predict the best time to send messages
- Conversation Starters - Who initiates conversations and when
- Most Active Days - Top 10 busiest conversation days
- Activity Heatmap - 7x24 grid showing message patterns
- Response Time Heatmap - Response speed by hour

### Visualization & UX
- Beautiful Charts - Interactive Chart.js visualizations
- Dark Mode - Full dark theme with persistent preference
- Date Range Filters - Analyze specific time periods with presets
- Side-by-Side Comparisons - Compare participants directly
- Emoji Analysis - Top emojis with usage counts
- Word Frequency - Most used words (with Spanish stop-word filtering)

### Export & Sharing
- HTML Export - Standalone HTML report with embedded charts
- Summary Card - Spotify Wrapped-style shareable summary
- Responsive Design - Works on desktop, tablet, and mobile

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, or Edge)
- A local web server (or just open the HTML file directly)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/whatsapp-analysis.git
cd whatsapp-analysis
```

2. Start a local server:

Using Python:
```bash
python3 -m http.server 8000
```

Using Node.js:
```bash
npx http-server -p 8000
```

3. Open in browser:
Navigate to `http://localhost:8000`

## How to Export Your WhatsApp Chat

### On iPhone:
1. Open WhatsApp and go to the chat you want to analyze
2. Tap the contact/group name at the top
3. Scroll down and tap "Export Chat"
4. Choose "Without Media"
5. Save the .txt file and upload it to the analyzer

### On Android:
1. Open WhatsApp and go to the chat you want to analyze
2. Tap the three dots in the top right
3. Tap "More" then "Export chat"
4. Choose "Without Media"
5. Save the .txt file and upload it to the analyzer

## Privacy

Your data never leaves your device. This app:
- Runs 100% in your browser
- No server uploads
- No data collection
- No external API calls (except loading Chart.js and sentiment.js from CDN)
- No cookies or tracking

All analysis is performed locally using JavaScript.

## Technology Stack

- **Frontend:** Vanilla JavaScript (ES6 modules)
- **Charts:** Chart.js v4.4.0
- **Sentiment Analysis:** sentiment.js v5.0.2
- **Export:** html2canvas v1.4.1
- **Styling:** Custom CSS with CSS Variables for theming

## Project Structure

```
whatsapp-analysis/
├── index.html              # Main HTML file
├── css/
│   └── main.css           # All styles, including dark mode
├── js/
│   ├── app.js             # Application orchestration
│   ├── parser.js          # WhatsApp chat file parser
│   ├── dataModel.js       # Data structures and caching
│   ├── statistics.js      # Statistical calculations
│   ├── charts.js          # Chart.js visualizations
│   ├── ui.js              # UI rendering and DOM manipulation
│   ├── export.js          # Export functionality
│   ├── utils.js           # Utility functions
│   └── wordAnalysis.js    # Word frequency analysis
└── README.md
```

## Features in Detail

### Sentiment Analysis
Uses the AFINN-165 wordlist to analyze message sentiment:
- Excludes messages over 200 characters (pasted content)
- Tracks positive, negative, and neutral messages
- Shows sentiment trends over time
- Displays overall mood for each participant

### Date Range Filtering
- Custom date range selection
- Preset filters: Last 30 days, Last 3 months, This year, Last year
- Dynamically updates all charts and statistics

### Dark Mode
- Full dark theme support
- Persists preference in localStorage
- Automatically updates all visualizations
- Easy toggle in the header

### Performance Optimizations
- Caching system for expensive calculations
- Handles large chats (50k+ messages)
- Progressive rendering for smooth UX
- Efficient DOM manipulation

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## License

MIT License - feel free to use this project however you'd like!

---

This tool is not affiliated with WhatsApp or Meta. It's an independent project for analyzing exported chat files.
