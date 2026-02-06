/**
 * Export functionality using html2canvas
 */

/**
 * Export as HTML report with embedded charts
 */
export async function exportAsHTML() {
  const mainContent = document.getElementById('main-content');

  if (!mainContent) {
    console.error('Main content not found');
    return;
  }

  try {
    // Show loading state
    const exportButton = document.getElementById('export-button');
    const originalText = exportButton.textContent;
    exportButton.textContent = '⏳';
    exportButton.disabled = true;

    // Clone the main content
    const clone = mainContent.cloneNode(true);

    // Remove interactive elements
    clone.querySelectorAll('button, input').forEach(el => el.remove());

    // Convert all canvas elements to images
    const canvases = mainContent.querySelectorAll('canvas');
    const clonedCanvases = clone.querySelectorAll('canvas');

    canvases.forEach((canvas, index) => {
      if (clonedCanvases[index]) {
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        clonedCanvases[index].parentNode.replaceChild(img, clonedCanvases[index]);
      }
    });

    // Get theme
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const isDark = theme === 'dark';

    // Get inline styles
    const styles = getCSSString();

    const html = `
<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp Analysis Report</title>
  <style>
    ${styles}
    body {
      padding: 20px;
      margin: 0;
    }
    .hidden {
      display: none !important;
    }
    /* Ensure images display properly */
    img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: ${isDark ? '#2d2d2d' : '#fff'}; border-radius: 12px;">
    <h1 style="margin: 0 0 10px 0; font-size: 2rem;">WhatsApp Conversation Analysis Report</h1>
    <p style="margin: 0; color: ${isDark ? '#a0a0a0' : '#7F8C8D'};">Generated on ${new Date().toLocaleDateString()}</p>
  </div>
  ${clone.outerHTML}
  <footer style="text-align: center; margin-top: 50px; padding: 20px; color: ${isDark ? '#a0a0a0' : '#7F8C8D'}; font-size: 0.875rem; border-top: 1px solid ${isDark ? '#404040' : '#E1E8ED'};">
    <p>Generated with WhatsApp Conversation Analyzer</p>
  </footer>
</body>
</html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = `whatsapp-report-${timestamp}.html`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);

    // Reset button state
    exportButton.textContent = originalText;
    exportButton.disabled = false;

  } catch (error) {
    console.error('HTML export failed:', error);
    alert('Failed to export HTML. Please try again.');

    // Reset button state
    const exportButton = document.getElementById('export-button');
    exportButton.textContent = '📄';
    exportButton.disabled = false;
  }
}

/**
 * Get CSS as string
 * @returns {string} CSS content
 */
function getCSSString() {
  let css = '';

  // Get all stylesheets
  for (const sheet of document.styleSheets) {
    try {
      if (sheet.cssRules) {
        for (const rule of sheet.cssRules) {
          css += rule.cssText + '\n';
        }
      }
    } catch (e) {
      // Cross-origin stylesheets may throw errors
      console.warn('Could not read stylesheet:', e);
    }
  }

  return css;
}

/**
 * Initialize export button
 */
export function initializeExport() {
  const exportButton = document.getElementById('export-button');

  if (exportButton) {
    exportButton.addEventListener('click', exportAsHTML);
  }
}
