/// <reference types="@figma/plugin-typings" />

import { handleUIMessage, initializePlugin, quickLintSelectedNode } from './ui/message-handler';

// Plugin configuration
const PLUGIN_WINDOW_SIZE = { width: 380, height: 600, themeColors: true };

// Plugin initialization
try {
  figma.showUI(__html__, PLUGIN_WINDOW_SIZE);
  console.log('✅ FigmaLint v2.0 - UI shown successfully');
} catch (error) {
  console.log('ℹ️ UI might already be shown in inspect panel:', error);
}

// Set up message handler
figma.ui.onmessage = handleUIMessage;

// Notify UI when selection changes so it can invalidate stale results
figma.on('selectionchange', () => {
  const sel = figma.currentPage.selection;
  figma.ui.postMessage({
    type: 'selection-changed',
    data: {
      hasSelection: sel.length > 0,
      nodeId: sel.length > 0 ? sel[0].id : null,
      nodeName: sel.length > 0 ? sel[0].name : null,
    },
  });

  // Ambient quality badge — quick lint on selection change
  if (sel.length > 0) {
    quickLintSelectedNode();
  }
});

// Initialize plugin
initializePlugin();

console.log('🚀 FigmaLint v2.0 initialized with modular architecture');
