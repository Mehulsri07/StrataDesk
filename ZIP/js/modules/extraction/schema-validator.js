/**
 * Schema Validator - Validates extracted strata data against existing StrataDesk schema
 * Ensures compatibility with existing database structure and UI components
 */

class SchemaValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }
    
    /**
     * Validates a file record against the StrataDesk schema
     */
    validateFileRecord(fileRecord) {
        this.errors = [];
        this.warnings = [];
        
        // Validate required top-level fields
        this.validateRequiredField(fileRecord, 'id', 'string');
        this.validateRequiredField(fileRecord, 'project', 'string');
        this.validateRequiredField(fileRecord, 'filename', 'string');
        this.validateRequiredField(fileRecord, 'files', 'array');
        this.validateRequiredField(fileRecord, 'metadata', 'object');
        
        // Validate metadata structure
        if (fileRecord.metadata) {
            this.validateMetadata(fileRecord.metadata);
        }
        
        // Validate strata layers if present
        if (fileRecord.metadata && fileRecord.metadata.strataLayers) {
            this.validateStrataLayers(fileRecord.metadata.strataLayers);
        }
        
        // Validate extraction source if present
        if (fileRecord.metadata && fileRecord.metadata.extractionSource) {
            this.validateExtractionSource(fileRecord.metadata.extractionSource);
        }
        
        return {
            valid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        };
    }
    
    /**
     * Validates metadata structure
     */
    validateMetadata(metadata) {
        // Required metadata fields
        this.validateRequiredField(metadata, 'boreId', 'string');
        this.validateRequiredField(metadata, 'date', 'string');
        this.validateRequiredField(metadata, 'createdAt', 'string');
        this.validateRequiredField(metadata, 'createdBy', 'string');
        
        // Optional but expected fields
        this.validateOptionalField(metadata, 'waterLevel', 'number');
        this.validateOptionalField(metadata, 'coordinates', 'object');
        this.validateOptionalField(metadata, 'tags', 'array');
        this.validateOptionalField(metadata, 'notes', 'string');
        this.validateOptionalField(metadata, 'strataLayers', 'array');
        this.validateOptionalField(metadata, 'strataSummary', 'string');
        
        // Validate date format
        if (metadata.date && !this.isValidDateString(metadata.date)) {
            this.errors.push('metadata.date must be in YYYY-MM-DD format');
        }
        
        if (metadata.createdAt && !this.isValidISOString(metadata.createdAt)) {
            this.errors.push('metadata.createdAt must be in ISO 8601 format');
        }
        
        // Validate coordinates structure if present
        if (metadata.coordinates) {
            this.validateCoordinates(metadata.coordinates);
        }
        
        // Validate tags array if present
        if (metadata.tags && Array.isArray(metadata.tags)) {
            metadata.tags.forEach((tag, index) => {
                if (typeof tag !== 'string') {
                    this.errors.push(`metadata.tags[${index}] must be a string`);
                }
            });
        }
    }
    
    /**
     * Validates strata layers structure
     */
    validateStrataLayers(strataLayers) {
        if (!Array.isArray(strataLayers)) {
            this.errors.push('strataLayers must be an array');
            return;
        }
        
        strataLayers.forEach((layer, index) => {
            this.validateStrataLayer(layer, index);
        });
        
        // Validate layer sequence
        this.validateLayerSequence(strataLayers);
    }
    
    /**
     * Validates a single strata layer
     */
    validateStrataLayer(layer, index) {
        const prefix = `strataLayers[${index}]`;
        
        // Required fields
        this.validateRequiredField(layer, 'type', 'string', prefix);
        this.validateRequiredField(layer, 'thickness', 'number', prefix);
        this.validateRequiredField(layer, 'startDepth', 'number', prefix);
        this.validateRequiredField(layer, 'endDepth', 'number', prefix);
        
        // Optional fields
        this.validateOptionalField(layer, 'confidence', 'string', prefix);
        this.validateOptionalField(layer, 'source', 'string', prefix);
        this.validateOptionalField(layer, 'userEdited', 'boolean', prefix);
        
        // Validate numeric constraints
        if (typeof layer.thickness === 'number' && layer.thickness <= 0) {
            this.errors.push(`${prefix}.thickness must be positive`);
        }
        
        if (typeof layer.startDepth === 'number' && typeof layer.endDepth === 'number') {
            if (layer.startDepth >= layer.endDepth) {
                this.errors.push(`${prefix}.startDepth must be less than endDepth`);
            }
            
            const calculatedThickness = layer.endDepth - layer.startDepth;
            if (Math.abs(calculatedThickness - layer.thickness) > 0.01) {
                this.warnings.push(`${prefix}.thickness (${layer.thickness}) doesn't match calculated thickness (${calculatedThickness})`);
            }
        }
        
        // Validate confidence values
        if (layer.confidence && !['low', 'medium', 'high'].includes(layer.confidence)) {
            this.warnings.push(`${prefix}.confidence should be 'low', 'medium', or 'high'`);
        }
        
        // Validate source values
        if (layer.source && !['extraction', 'manual', 'import'].includes(layer.source)) {
            this.warnings.push(`${prefix}.source should be 'extraction', 'manual', or 'import'`);
        }
    }
    
    /**
     * Validates layer sequence for gaps and overlaps
     */
    validateLayerSequence(strataLayers) {
        if (strataLayers.length < 2) return;
        
        // Sort layers by start depth
        const sortedLayers = [...strataLayers].sort((a, b) => a.startDepth - b.startDepth);
        
        for (let i = 0; i < sortedLayers.length - 1; i++) {
            const currentLayer = sortedLayers[i];
            const nextLayer = sortedLayers[i + 1];
            
            // Check for overlaps
            if (currentLayer.endDepth > nextLayer.startDepth) {
                this.errors.push(`Layer overlap detected: layer ending at ${currentLayer.endDepth} overlaps with layer starting at ${nextLayer.startDepth}`);
            }
            
            // Check for gaps (warning only)
            if (currentLayer.endDepth < nextLayer.startDepth) {
                const gap = nextLayer.startDepth - currentLayer.endDepth;
                if (gap > 0.01) { // Ignore tiny gaps due to rounding
                    this.warnings.push(`Gap detected between layers: ${gap.toFixed(2)} units between ${currentLayer.endDepth} and ${nextLayer.startDepth}`);
                }
            }
        }
    }
    
    /**
     * Validates extraction source metadata
     */
    validateExtractionSource(extractionSource) {
        const prefix = 'metadata.extractionSource';
        
        // Required fields for extraction source
        this.validateRequiredField(extractionSource, 'filename', 'string', prefix);
        this.validateRequiredField(extractionSource, 'extractionTimestamp', 'string', prefix);
        this.validateRequiredField(extractionSource, 'layerCount', 'number', prefix);
        this.validateRequiredField(extractionSource, 'extractedLayers', 'array', prefix);
        
        // Optional fields
        this.validateOptionalField(extractionSource, 'totalDepth', 'number', prefix);
        this.validateOptionalField(extractionSource, 'depthUnit', 'string', prefix);
        
        // Validate timestamp format
        if (extractionSource.extractionTimestamp && !this.isValidISOString(extractionSource.extractionTimestamp)) {
            this.errors.push(`${prefix}.extractionTimestamp must be in ISO 8601 format`);
        }
        
        // Validate layer count consistency
        if (extractionSource.layerCount && extractionSource.extractedLayers) {
            if (extractionSource.layerCount !== extractionSource.extractedLayers.length) {
                this.warnings.push(`${prefix}.layerCount (${extractionSource.layerCount}) doesn't match extractedLayers length (${extractionSource.extractedLayers.length})`);
            }
        }
        
        // Validate extracted layers structure
        if (extractionSource.extractedLayers && Array.isArray(extractionSource.extractedLayers)) {
            extractionSource.extractedLayers.forEach((layer, index) => {
                this.validateExtractedLayer(layer, `${prefix}.extractedLayers[${index}]`);
            });
        }
    }
    
    /**
     * Validates an extracted layer structure
     */
    validateExtractedLayer(layer, prefix) {
        // Required fields for extracted layers
        this.validateRequiredField(layer, 'material', 'string', prefix);
        this.validateRequiredField(layer, 'start_depth', 'number', prefix);
        this.validateRequiredField(layer, 'end_depth', 'number', prefix);
        
        // Optional fields
        this.validateOptionalField(layer, 'confidence', 'string', prefix);
        this.validateOptionalField(layer, 'source', 'string', prefix);
        this.validateOptionalField(layer, 'user_edited', 'boolean', prefix);
        this.validateOptionalField(layer, 'original_color', 'string', prefix);
        
        // Validate depth logic
        if (typeof layer.start_depth === 'number' && typeof layer.end_depth === 'number') {
            if (layer.start_depth >= layer.end_depth) {
                this.errors.push(`${prefix}: start_depth must be less than end_depth`);
            }
        }
    }
    
    /**
     * Validates coordinates structure
     */
    validateCoordinates(coordinates) {
        this.validateRequiredField(coordinates, 'lat', 'number', 'metadata.coordinates');
        this.validateRequiredField(coordinates, 'lng', 'number', 'metadata.coordinates');
        
        // Validate coordinate ranges
        if (typeof coordinates.lat === 'number') {
            if (coordinates.lat < -90 || coordinates.lat > 90) {
                this.errors.push('metadata.coordinates.lat must be between -90 and 90');
            }
        }
        
        if (typeof coordinates.lng === 'number') {
            if (coordinates.lng < -180 || coordinates.lng > 180) {
                this.errors.push('metadata.coordinates.lng must be between -180 and 180');
            }
        }
    }
    
    /**
     * Validates a required field
     */
    validateRequiredField(obj, field, expectedType, prefix = '') {
        const fullPath = prefix ? `${prefix}.${field}` : field;
        
        if (!(field in obj)) {
            this.errors.push(`${fullPath} is required`);
            return false;
        }
        
        if (!this.validateFieldType(obj[field], expectedType, fullPath)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Validates an optional field if present
     */
    validateOptionalField(obj, field, expectedType, prefix = '') {
        const fullPath = prefix ? `${prefix}.${field}` : field;
        
        if (field in obj && obj[field] !== null && obj[field] !== undefined) {
            return this.validateFieldType(obj[field], expectedType, fullPath);
        }
        
        return true;
    }
    
    /**
     * Validates field type
     */
    validateFieldType(value, expectedType, fieldPath) {
        let actualType = typeof value;
        
        if (expectedType === 'array' && Array.isArray(value)) {
            actualType = 'array';
        }
        
        if (actualType !== expectedType) {
            this.errors.push(`${fieldPath} must be of type ${expectedType}, got ${actualType}`);
            return false;
        }
        
        return true;
    }
    
    /**
     * Validates date string format (YYYY-MM-DD)
     */
    isValidDateString(dateString) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateString)) return false;
        
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }
    
    /**
     * Validates ISO 8601 timestamp format
     */
    isValidISOString(isoString) {
        try {
            const date = new Date(isoString);
            return date instanceof Date && !isNaN(date) && date.toISOString() === isoString;
        } catch {
            return false;
        }
    }
    
    /**
     * Creates a compliant file record from extraction results
     */
    createCompliantFileRecord(extractionResult, options = {}) {
        const {
            project = 'imported-data',
            boreId = null,
            coordinates = null,
            tags = ['strata-extraction', 'imported'],
            notes = ''
        } = options;
        
        const chart = extractionResult.chart;
        const timestamp = new Date().toISOString();
        const dateOnly = timestamp.split('T')[0];
        
        // Generate unique ID
        const id = this.generateUniqueId('f');
        
        // Convert units to strata layers
        const strataLayers = chart.units.map(unit => ({
            type: unit.unitType || 'residential',
            thickness: 1, // Units don't have thickness, use default
            startDepth: 0, // Units don't have depth, use defaults
            endDepth: 1,
            confidence: 'high',
            source: 'extraction',
            userEdited: false,
            // Store unit-specific data in custom fields
            unitNumber: unit.unitNumber,
            ownerName: unit.ownerName,
            ownershipPercentage: unit.ownershipPercentage,
            votingRights: unit.votingRights,
            levyContribution: unit.levyContribution
        }));
        
        const fileRecord = {
            id: id,
            project: project,
            filename: this.generateFilename(extractionResult.source),
            files: [], // No actual files for extracted data
            metadata: {
                boreId: boreId || `extracted_${Date.now()}`,
                date: dateOnly,
                waterLevel: null,
                coordinates: coordinates,
                tags: tags,
                notes: notes || `Imported from ${extractionResult.source} via strata chart extraction`,
                createdAt: timestamp,
                createdBy: this.getCurrentUser(),
                strataLayers: strataLayers,
                strataSummary: this.generateStrataSummary(chart),
                // Extraction-specific metadata
                extractionSource: {
                    filename: extractionResult.source,
                    extractionTimestamp: timestamp,
                    totalDepth: null, // Not applicable for strata charts
                    depthUnit: 'units',
                    layerCount: chart.units.length,
                    extractedLayers: chart.units.map(unit => ({
                        material: unit.ownerName,
                        start_depth: 0,
                        end_depth: unit.ownershipPercentage,
                        confidence: extractionResult.confidence.level,
                        source: 'extraction',
                        user_edited: false,
                        unitNumber: unit.unitNumber,
                        unitType: unit.unitType,
                        ownershipPercentage: unit.ownershipPercentage
                    }))
                },
                // Store the complete strata chart data
                strataChart: chart.toObject()
            }
        };
        
        return fileRecord;
    }
    
    /**
     * Generates a filename for extracted data
     */
    generateFilename(sourceFilename) {
        const timestamp = new Date().toISOString().split('T')[0];
        const baseName = sourceFilename ? 
            sourceFilename.replace(/\.[^/.]+$/, '') : 
            'strata_chart';
        return `${baseName}_extracted_${timestamp}`;
    }
    
    /**
     * Generates a summary for strata chart data
     */
    generateStrataSummary(chart) {
        const summary = [
            `Strata Plan: ${chart.planNumber}`,
            `Building: ${chart.buildingName || 'Not specified'}`,
            `Total Units: ${chart.units.length}`,
            `Total Ownership: ${chart.getTotalOwnershipPercentage().toFixed(2)}%`,
            ''
        ];
        
        // Add unit type breakdown
        const unitTypes = {};
        chart.units.forEach(unit => {
            const type = unit.unitType || 'residential';
            unitTypes[type] = (unitTypes[type] || 0) + 1;
        });
        
        summary.push('Unit Types:');
        Object.entries(unitTypes).forEach(([type, count]) => {
            summary.push(`  ${type}: ${count} units`);
        });
        
        return summary.join('\n');
    }
    
    /**
     * Generates a unique ID
     */
    generateUniqueId(prefix = 'x') {
        if (typeof window !== 'undefined' && window.UTILS && window.UTILS.uid) {
            return window.UTILS.uid(prefix);
        }
        return prefix + '_' + Math.random().toString(36).slice(2, 10);
    }
    
    /**
     * Gets current user
     */
    getCurrentUser() {
        if (typeof window !== 'undefined' && window.auth && window.auth.getCurrentUser) {
            return window.auth.getCurrentUser()?.username || 'system';
        }
        return 'system';
    }
}

module.exports = SchemaValidator;