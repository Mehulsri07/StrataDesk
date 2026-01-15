/**
 * PDFProcessor - Handles PDF file parsing and strata data extraction
 * Uses PDF.js (pdfjs-dist) library for document processing
 * 
 * Feature: strata-chart-extraction
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

// For Node.js environment (testing)
let pdfjsLib;
if (typeof require !== 'undefined') {
  try {
    pdfjsLib = require('pdfjs-dist');
  } catch (e) {
    // Will use browser global
  }
}

class PDFProcessor {
  constructor() {
    this.document = null;
    
    // Depth label patterns
    this.depthPatterns = [
      /^(\d+(?:\.\d+)?)\s*(?:ft|feet|m|meters?)?$/i,
      /^(\d+(?:\.\d+)?)'$/,  // 10' format
      /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/,  // Range format: 10-20
      /depth[:\s]*(\d+(?:\.\d+)?)/i
    ];
    
    // Common material keywords
    this.materialKeywords = [
      'clay', 'sand', 'gravel', 'silt', 'rock', 'limestone',
      'sandstone', 'shale', 'topsoil', 'fill', 'bedrock',
      'loam', 'boulder', 'cobble', 'peat', 'organic'
    ];
  }

  /**
   * Process a PDF file and extract strata data
   * @param {File} file - The PDF file to process
   * @returns {Promise<Object>} Extracted data with depths, materials, and colors
   */
  async processFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    return this.loadPDFDocument(arrayBuffer);
  }

  /**
   * Load and parse a PDF document
   * @param {ArrayBuffer} arrayBuffer - PDF file data
   * @returns {Promise<Object>} Parsed strata data
   */
  async loadPDFDocument(arrayBuffer) {
    // Get PDF.js library (browser or Node.js)
    const pdfjs = typeof window !== 'undefined' && window.pdfjsLib ? window.pdfjsLib : pdfjsLib;
    
    if (!pdfjs) {
      throw new Error('PDF.js library not available');
    }

    try {
      // Load the PDF document
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      this.document = await loadingTask.promise;
      
      if (!this.document || this.document.numPages === 0) {
        throw new Error('PDF document is empty or could not be loaded');
      }

      // Extract text from all pages
      const allTextContent = [];
      const allDepths = [];
      const allMaterials = [];
      
      for (let pageNum = 1; pageNum <= this.document.numPages; pageNum++) {
        const page = await this.document.getPage(pageNum);
        const textContent = await this.extractTextContent(page);
        allTextContent.push(textContent);
        
        // Detect depths and materials from this page
        const depths = this.detectDepthLabels(textContent);
        const materials = this.identifyMaterialRegions(textContent);
        
        allDepths.push(...depths);
        allMaterials.push(...materials);
      }

      // Validate readability
      const readability = this.validateReadability({
        depths: allDepths,
        materials: allMaterials,
        textContent: allTextContent
      });

      if (!readability.readable) {
        throw new Error(`PDF content not readable: ${readability.reason}`);
      }

      // Correlate depths with materials
      const correlatedData = this.correlateDepthsAndMaterials(allDepths, allMaterials);

      return {
        depths: correlatedData.depths,
        materials: correlatedData.materials,
        colors: new Array(correlatedData.depths.length).fill(null), // PDFs don't have cell colors
        depthUnit: this.detectDepthUnit(allTextContent),
        pageCount: this.document.numPages,
        confidence: readability.confidence
      };

    } catch (error) {
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
  }

  /**
   * Extract text content from a PDF page
   * @param {Object} page - PDF.js page object
   * @returns {Promise<Object>} Extracted text content with positions
   */
  async extractTextContent(page) {
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });
    
    // Process text items with position information
    const items = textContent.items.map(item => {
      const transform = item.transform;
      return {
        text: item.str,
        x: transform[4],
        y: viewport.height - transform[5], // Convert to top-down coordinates
        width: item.width,
        height: item.height,
        fontName: item.fontName
      };
    });

    // Sort by y position (top to bottom), then x position (left to right)
    items.sort((a, b) => {
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) < 5) { // Same line threshold
        return a.x - b.x;
      }
      return yDiff;
    });

    // Group items into lines
    const lines = this.groupIntoLines(items);

    return {
      items,
      lines,
      pageWidth: viewport.width,
      pageHeight: viewport.height
    };
  }

  /**
   * Group text items into lines based on y-position
   * @param {Array} items - Text items with positions
   * @returns {Array} Lines of text
   */
  groupIntoLines(items) {
    const lines = [];
    let currentLine = [];
    let currentY = null;
    const lineThreshold = 5; // Pixels threshold for same line

    items.forEach(item => {
      if (currentY === null || Math.abs(item.y - currentY) < lineThreshold) {
        currentLine.push(item);
        currentY = item.y;
      } else {
        if (currentLine.length > 0) {
          lines.push({
            y: currentY,
            items: currentLine,
            text: currentLine.map(i => i.text).join(' ')
          });
        }
        currentLine = [item];
        currentY = item.y;
      }
    });

    if (currentLine.length > 0) {
      lines.push({
        y: currentY,
        items: currentLine,
        text: currentLine.map(i => i.text).join(' ')
      });
    }

    return lines;
  }

  /**
   * Detect depth labels in extracted text
   * @param {Object} textContent - Extracted text content
   * @returns {Array} Array of detected depth values with positions
   */
  detectDepthLabels(textContent) {
    const depths = [];
    
    textContent.lines.forEach((line, lineIndex) => {
      // Check each item in the line for depth patterns
      line.items.forEach(item => {
        const text = item.text.trim();
        
        for (const pattern of this.depthPatterns) {
          const match = text.match(pattern);
          if (match) {
            const depthValue = parseFloat(match[1]);
            if (!isNaN(depthValue) && depthValue >= 0 && depthValue < 10000) {
              depths.push({
                value: depthValue,
                text: text,
                x: item.x,
                y: item.y,
                lineIndex
              });
              break;
            }
          }
        }
      });
      
      // Also check the full line text
      const lineText = line.text;
      for (const pattern of this.depthPatterns) {
        const match = lineText.match(pattern);
        if (match && !depths.find(d => d.lineIndex === lineIndex)) {
          const depthValue = parseFloat(match[1]);
          if (!isNaN(depthValue) && depthValue >= 0 && depthValue < 10000) {
            depths.push({
              value: depthValue,
              text: lineText,
              x: line.items[0]?.x || 0,
              y: line.y,
              lineIndex
            });
          }
        }
      }
    });

    // Sort by depth value
    depths.sort((a, b) => a.value - b.value);
    
    // Remove duplicates
    const uniqueDepths = [];
    depths.forEach(d => {
      if (!uniqueDepths.find(u => Math.abs(u.value - d.value) < 0.01)) {
        uniqueDepths.push(d);
      }
    });

    return uniqueDepths;
  }

  /**
   * Identify material regions in the PDF
   * @param {Object} textContent - Extracted text content
   * @returns {Array} Array of material regions with bounds
   */
  identifyMaterialRegions(textContent) {
    const materials = [];
    
    textContent.lines.forEach((line, lineIndex) => {
      const lineText = line.text.toLowerCase();
      
      // Check for material keywords
      for (const keyword of this.materialKeywords) {
        if (lineText.includes(keyword)) {
          // Extract the material description
          let materialText = line.text.trim();
          
          // Try to clean up the material text
          // Remove depth numbers if present at the start
          materialText = materialText.replace(/^\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?\s*/, '');
          materialText = materialText.replace(/^\d+(?:\.\d+)?\s*(?:ft|feet|m|')?\s*/, '');
          
          if (materialText.length > 0) {
            materials.push({
              material: this.normalizeMaterialName(materialText),
              originalText: line.text,
              x: line.items[0]?.x || 0,
              y: line.y,
              lineIndex,
              confidence: this.calculateMaterialConfidence(materialText)
            });
          }
          break;
        }
      }
    });

    return materials;
  }

  /**
   * Normalize material name to standard format
   * @param {string} text - Raw material text
   * @returns {string} Normalized material name
   */
  normalizeMaterialName(text) {
    const lowerText = text.toLowerCase();
    
    // Map common variations to standard names
    const materialMap = {
      'sandy clay': 'Sandy Clay',
      'clayey sand': 'Clayey Sand',
      'silty sand': 'Silty Sand',
      'sandy silt': 'Sandy Silt',
      'gravelly sand': 'Gravelly Sand',
      'sandy gravel': 'Sandy Gravel',
      'top soil': 'Topsoil',
      'bed rock': 'Bedrock'
    };

    for (const [pattern, normalized] of Object.entries(materialMap)) {
      if (lowerText.includes(pattern)) {
        return normalized;
      }
    }

    // Capitalize first letter of each word
    return text.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Calculate confidence score for material identification
   * @param {string} text - Material text
   * @returns {number} Confidence score 0-1
   */
  calculateMaterialConfidence(text) {
    const lowerText = text.toLowerCase();
    let confidence = 0.5; // Base confidence

    // Increase confidence for exact keyword matches
    for (const keyword of this.materialKeywords) {
      if (lowerText === keyword) {
        confidence = 0.9;
        break;
      }
      if (lowerText.includes(keyword)) {
        confidence = Math.max(confidence, 0.7);
      }
    }

    // Decrease confidence for very long descriptions
    if (text.length > 50) {
      confidence *= 0.8;
    }

    // Decrease confidence if contains numbers (might be mixed with depth)
    if (/\d/.test(text)) {
      confidence *= 0.9;
    }

    return confidence;
  }

  /**
   * Validate readability of extracted data
   * @param {Object} extractedData - Data extracted from PDF
   * @returns {Object} Validation result with confidence score
   */
  validateReadability(extractedData) {
    const { depths, materials, textContent } = extractedData;
    
    // Check if we have any text content
    const totalTextItems = textContent.reduce((sum, page) => sum + page.items.length, 0);
    if (totalTextItems === 0) {
      return {
        readable: false,
        reason: 'No text content found in PDF (may be image-based)',
        confidence: 0
      };
    }

    // Check if we found any depths
    if (depths.length === 0) {
      return {
        readable: false,
        reason: 'Could not identify depth values in the PDF',
        confidence: 0.2
      };
    }

    // Check if we found any materials
    if (materials.length === 0) {
      return {
        readable: false,
        reason: 'Could not identify material descriptions in the PDF',
        confidence: 0.3
      };
    }

    // Calculate overall confidence
    const depthConfidence = Math.min(depths.length / 5, 1); // More depths = higher confidence
    const materialConfidence = materials.reduce((sum, m) => sum + m.confidence, 0) / materials.length;
    const overallConfidence = (depthConfidence + materialConfidence) / 2;

    return {
      readable: true,
      confidence: overallConfidence,
      depthCount: depths.length,
      materialCount: materials.length
    };
  }

  /**
   * Correlate depths with materials based on position
   * @param {Array} depths - Detected depth values
   * @param {Array} materials - Detected material regions
   * @returns {Object} Correlated depths and materials arrays
   */
  correlateDepthsAndMaterials(depths, materials) {
    const correlatedDepths = [];
    const correlatedMaterials = [];

    // Sort depths by value
    const sortedDepths = [...depths].sort((a, b) => a.value - b.value);
    
    // For each depth, find the closest material by y-position
    sortedDepths.forEach(depth => {
      correlatedDepths.push(depth.value);
      
      // Find material closest to this depth's y-position
      let closestMaterial = null;
      let minDistance = Infinity;
      
      materials.forEach(material => {
        const distance = Math.abs(material.y - depth.y);
        if (distance < minDistance) {
          minDistance = distance;
          closestMaterial = material;
        }
      });

      if (closestMaterial && minDistance < 50) { // Within 50 pixels
        correlatedMaterials.push(closestMaterial.material);
      } else {
        correlatedMaterials.push(null);
      }
    });

    return {
      depths: correlatedDepths,
      materials: correlatedMaterials
    };
  }

  /**
   * Detect depth unit from text content
   * @param {Array} textContent - Array of page text content
   * @returns {string} Detected unit ('feet' or 'meters')
   */
  detectDepthUnit(textContent) {
    let feetCount = 0;
    let meterCount = 0;

    textContent.forEach(page => {
      page.lines.forEach(line => {
        const text = line.text.toLowerCase();
        if (/\bft\b|\bfeet\b|'/.test(text)) feetCount++;
        if (/\bm\b|\bmeters?\b/.test(text)) meterCount++;
      });
    });

    return meterCount > feetCount ? 'meters' : 'feet';
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.PDFProcessor = PDFProcessor;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PDFProcessor };
}
