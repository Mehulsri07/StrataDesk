// Address Search Controller - Handles API communication and result processing
class AddressSearchController {
  constructor() {
    this.cache = new Map();
    this.currentController = null;
    this.lastQuery = '';
    this.requestCount = 0;
    
    // Ensure Logger is available
    if (typeof Logger === 'undefined' || !Logger) {
      this.logger = {
        debug: (msg, data) => console.debug(msg, data),
        info: (msg, data) => console.info(msg, data),
        warn: (msg, data) => console.warn(msg, data),
        error: (msg, data) => console.error(msg, data)
      };
    } else {
      this.logger = Logger;
    }
    
    // Load cached results from localStorage
    this.loadCache();
    
    // Result ranking weights
    this.typeWeights = {
      'city': 100,
      'town': 90,
      'village': 80,
      'hamlet': 70,
      'suburb': 60,
      'district': 50,
      'administrative': 40,
      'residential': 30,
      'commercial': 25,
      'industrial': 20,
      'road': 15,
      'highway': 10,
      'railway': 8,
      'waterway': 5,
      'natural': 3,
      'tourism': 2,
      'amenity': 1
    };
  }

  // Search for addresses with enhanced features
  async searchAddress(query, options = {}) {
    const trimmedQuery = query?.trim();
    if (!trimmedQuery || trimmedQuery.length < 3) {
      return [];
    }

    // Check cache first
    const cacheKey = this.getCacheKey(trimmedQuery);
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CONFIG.SEARCH.CACHE_DURATION) {
        return cached.results;
      }
      this.cache.delete(cacheKey);
    }

    // Cancel previous request
    if (this.currentController) {
      this.currentController.abort();
    }

    // Create new abort controller
    this.currentController = new AbortController();
    const requestId = ++this.requestCount;

    try {
      const results = await this.fetchFromNominatim(trimmedQuery, {
        signal: this.currentController.signal,
        ...options
      });

      // Check if this is still the latest request
      if (requestId !== this.requestCount) {
        return []; // Ignore outdated results
      }

      // Process and rank results
      const processedResults = this.processResults(results, trimmedQuery);
      
      // Cache results
      this.cacheResults(cacheKey, processedResults);
      
      return processedResults;

    } catch (error) {
      if (error.name === 'AbortError') {
        return []; // Request was cancelled
      }
      
      this.logger.error('Address search failed', { query: trimmedQuery, error });
      throw new Error('Address search failed. Please try again or click on the map.');
    } finally {
      if (this.currentController && requestId === this.requestCount) {
        this.currentController = null;
      }
    }
  }

  // Fetch results from Nominatim API
  async fetchFromNominatim(query, options = {}) {
    const params = new URLSearchParams({
      format: 'json',
      q: query,
      limit: '8', // Get more results for better ranking
      addressdetails: '1',
      extratags: '1',
      namedetails: '1'
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        signal: options.signal,
        headers: {
          'User-Agent': 'StrataDesk/2.0 (Groundwater Data Management; contact@stratadesksupport.com)'
        },
        timeout: 10000
      }
    );

    if (!response.ok) {
      throw new Error(`Search service returned ${response.status}`);
    }

    return await response.json();
  }

  // Process and rank search results
  processResults(rawResults, query) {
    if (!rawResults || rawResults.length === 0) {
      return [];
    }

    const queryLower = query.toLowerCase();
    
    return rawResults
      .map(result => this.transformResult(result, queryLower))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5); // Return top 5 results
  }

  // Transform raw Nominatim result to our format
  transformResult(result, query) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const type = result.type || 'location';
    const importance = parseFloat(result.importance) || 0;
    
    // Calculate relevance score
    const relevanceScore = this.calculateRelevanceScore(result, query, importance);
    
    // Calculate confidence based on multiple factors
    const confidence = this.calculateConfidence(result, importance);
    
    // Extract bounding box if available
    const boundingBox = result.boundingbox ? {
      south: parseFloat(result.boundingbox[0]),
      north: parseFloat(result.boundingbox[1]),
      west: parseFloat(result.boundingbox[2]),
      east: parseFloat(result.boundingbox[3])
    } : null;

    return {
      lat,
      lng,
      name: result.display_name,
      type,
      importance,
      relevanceScore,
      confidence,
      boundingBox,
      placeId: result.place_id,
      osm: {
        type: result.osm_type,
        id: result.osm_id
      },
      address: result.address || {},
      matchedText: this.findMatchedText(result.display_name, query)
    };
  }

  // Calculate relevance score for ranking
  calculateRelevanceScore(result, query, importance) {
    let score = 0;
    
    // Base importance score (0-100)
    score += importance * 100;
    
    // Type weight bonus
    const typeWeight = this.typeWeights[result.type] || 0;
    score += typeWeight;
    
    // Name matching bonus
    const displayName = result.display_name.toLowerCase();
    if (displayName.startsWith(query)) {
      score += 50; // Starts with query
    } else if (displayName.includes(query)) {
      score += 25; // Contains query
    }
    
    // Address component matching
    if (result.address) {
      Object.values(result.address).forEach(value => {
        if (value && value.toLowerCase().includes(query)) {
          score += 10;
        }
      });
    }
    
    // Penalize very long names (likely less specific)
    if (displayName.length > 100) {
      score -= 10;
    }
    
    return Math.max(0, score);
  }

  // Calculate confidence level
  calculateConfidence(result, importance) {
    let confidence = 'medium';
    
    // High confidence criteria
    if (importance > 0.5 && ['city', 'town', 'village'].includes(result.type)) {
      confidence = 'high';
    }
    // Low confidence criteria
    else if (importance < 0.1 || ['road', 'building'].includes(result.type)) {
      confidence = 'low';
    }
    
    return confidence;
  }

  // Find matched text for highlighting
  findMatchedText(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  // Cache management
  getCacheKey(query) {
    return `search_${query.toLowerCase()}`;
  }

  cacheResults(key, results) {
    this.cache.set(key, {
      results,
      timestamp: Date.now()
    });
    
    // Persist to localStorage (with size limit)
    this.saveCache();
  }

  loadCache() {
    try {
      const cached = localStorage.getItem('strataAddressCache');
      if (cached) {
        const data = JSON.parse(cached);
        Object.entries(data).forEach(([key, value]) => {
          if (Date.now() - value.timestamp < CONFIG.SEARCH.CACHE_DURATION) {
            this.cache.set(key, value);
          }
        });
      }
    } catch (error) {
      this.logger.warn('Failed to load address cache', error);
    }
  }

  saveCache() {
    try {
      const cacheObj = {};
      this.cache.forEach((value, key) => {
        cacheObj[key] = value;
      });
      
      // Limit cache size
      const cacheStr = JSON.stringify(cacheObj);
      if (cacheStr.length < 100000) { // 100KB limit
        localStorage.setItem('strataAddressCache', cacheStr);
      }
    } catch (error) {
      this.logger.warn('Failed to save address cache', error);
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    localStorage.removeItem('strataAddressCache');
  }

  // Cancel current search
  cancelCurrentSearch() {
    if (this.currentController) {
      this.currentController.abort();
      this.currentController = null;
    }
  }

  // Get network status
  isOnline() {
    return navigator.onLine;
  }
}

// Export for use in other modules
window.AddressSearchController = AddressSearchController;