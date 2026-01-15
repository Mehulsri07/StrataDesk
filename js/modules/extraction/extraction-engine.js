/**
 * Extraction Engine - Main coordinator for strata chart extraction
 * Handles file type detection, parser selection, and result coordination
 */

const ExcelParser = require('./excel-parser');
const PdfParser = require('./pdf-parser');
const ValidationEngine = require('./validation-engine');
const StrataChart = require('./strata-chart');

class ExtractionEngine {
    constructor(options = {}) {
        this.options = {
            // Parser options
            excelOptions: {},
            pdfOptions: {},
            validationOptions: {},
            
            // Processing options
            autoValidate: true,
            strictValidation: false,
            continueOnError: true,
            
            // Confidence thresholds
            minConfidenceThreshold: 0.5,
            highConfidenceThreshold: 0.8,
            
            ...options
        };
        
        // Initialize parsers
        this.excelParser = new ExcelParser(this.options.excelOptions);
        this.pdfParser = new PdfParser(this.options.pdfOptions);
        this.validator = new ValidationEngine(this.options.validationOptions);
        
        this.results = null;
        this.errors = [];
        this.warnings = [];
    }
    
    /**
     * Extracts strata chart data from a file
     */
    async extractFromFile(filePath) {
        try {
            this.reset();
            
            // Detect file type
            const fileType = this.detectFileType(filePath);
            if (!fileType) {
                throw new Error(`Unsupported file type: ${filePath}`);
            }
            
            // Select appropriate parser
            const parser = this.getParser(fileType);
            if (!parser) {
                throw new Error(`No parser available for file type: ${fileType}`);
            }
            
            // Parse the file
            const parseResult = await parser.parseFile(filePath);
            
            // Process results
            return await this.processParseResult(parseResult, filePath, fileType);
            
        } catch (error) {
            this.errors.push(`Extraction failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Extracts strata chart data from a buffer
     */
    async extractFromBuffer(buffer, filename, fileType = null) {
        try {
            this.reset();
            
            // Detect file type if not provided
            if (!fileType) {
                fileType = this.detectFileType(filename);
            }
            
            if (!fileType) {
                throw new Error(`Cannot determine file type for: ${filename}`);
            }
            
            // Select appropriate parser
            const parser = this.getParser(fileType);
            if (!parser) {
                throw new Error(`No parser available for file type: ${fileType}`);
            }
            
            // Parse the buffer
            const parseResult = await parser.parseBuffer(buffer, filename);
            
            // Process results
            return await this.processParseResult(parseResult, filename, fileType);
            
        } catch (error) {
            this.errors.push(`Extraction failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Processes parse results and adds validation
     */
    async processParseResult(parseResult, source, fileType) {
        try {
            const { chart, errors, warnings, metadata } = parseResult;
            
            // Collect parser errors and warnings
            this.errors.push(...errors);
            this.warnings.push(...warnings);
            
            // Validate the chart if auto-validation is enabled
            let validationResult = null;
            if (this.options.autoValidate) {
                validationResult = this.validator.validateChart(chart);
                
                // Add validation errors and warnings
                this.errors.push(...validationResult.errors);
                this.warnings.push(...validationResult.warnings);
            }
            
            // Calculate confidence score
            const confidence = this.calculateConfidence(chart, parseResult, validationResult);
            
            // Create final result
            this.results = {
                chart: chart,
                confidence: confidence,
                source: source,
                fileType: fileType,
                metadata: {
                    ...metadata,
                    extractionTimestamp: new Date(),
                    parserUsed: fileType === 'excel' ? 'ExcelParser' : 'PdfParser',
                    validationPerformed: this.options.autoValidate
                },
                validation: validationResult,
                errors: [...this.errors],
                warnings: [...this.warnings],
                success: this.errors.length === 0 || this.options.continueOnError
            };
            
            return this.results;
            
        } catch (error) {
            this.errors.push(`Result processing failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Detects file type from filename
     */
    detectFileType(filename) {
        if (!filename) return null;
        
        const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        
        switch (extension) {
            case '.xlsx':
            case '.xls':
            case '.csv':
                return 'excel';
            case '.pdf':
                return 'pdf';
            default:
                return null;
        }
    }
    
    /**
     * Gets the appropriate parser for file type
     */
    getParser(fileType) {
        switch (fileType) {
            case 'excel':
                return this.excelParser;
            case 'pdf':
                return this.pdfParser;
            default:
                return null;
        }
    }
    
    /**
     * Calculates confidence score for extraction results
     */
    calculateConfidence(chart, parseResult, validationResult) {
        let confidence = 0.5; // Base confidence
        
        // Factor 1: Chart completeness
        const requiredFields = ['planNumber', 'units'];
        const hasRequiredFields = requiredFields.every(field => 
            chart[field] && (Array.isArray(chart[field]) ? chart[field].length > 0 : true)
        );
        
        if (hasRequiredFields) {
            confidence += 0.2;
        }
        
        // Factor 2: Unit data quality
        if (chart.units && chart.units.length > 0) {
            const completeUnits = chart.units.filter(unit => 
                unit.unitNumber && unit.ownerName && unit.ownershipPercentage > 0
            );
            const completenessRatio = completeUnits.length / chart.units.length;
            confidence += completenessRatio * 0.2;
        }
        
        // Factor 3: Validation results
        if (validationResult) {
            if (validationResult.passed) {
                confidence += 0.2;
            } else {
                // Reduce confidence based on error severity
                const errorPenalty = Math.min(validationResult.errors.length * 0.05, 0.3);
                confidence -= errorPenalty;
            }
        }
        
        // Factor 4: Parser-specific confidence
        if (parseResult.metadata) {
            // Excel files generally have higher confidence due to structured data
            if (parseResult.metadata.columnMapping) {
                const mappedColumns = Object.keys(parseResult.metadata.columnMapping).length;
                confidence += Math.min(mappedColumns * 0.02, 0.1);
            }
            
            // PDF confidence depends on text extraction quality
            if (parseResult.metadata.textLength) {
                const textQuality = Math.min(parseResult.metadata.textLength / 1000, 1);
                confidence += textQuality * 0.1;
            }
        }
        
        // Factor 5: Error count penalty
        const errorPenalty = Math.min(this.errors.length * 0.03, 0.2);
        confidence -= errorPenalty;
        
        // Ensure confidence is within bounds
        confidence = Math.max(0, Math.min(1, confidence));
        
        return {
            score: confidence,
            level: this.getConfidenceLevel(confidence),
            factors: {
                hasRequiredFields,
                unitCompleteness: chart.units ? completeUnits.length / chart.units.length : 0,
                validationPassed: validationResult ? validationResult.passed : null,
                errorCount: this.errors.length,
                warningCount: this.warnings.length
            }
        };
    }
    
    /**
     * Gets confidence level description
     */
    getConfidenceLevel(score) {
        if (score >= this.options.highConfidenceThreshold) {
            return 'high';
        } else if (score >= this.options.minConfidenceThreshold) {
            return 'medium';
        } else {
            return 'low';
        }
    }
    
    /**
     * Validates extracted data
     */
    validateExtraction(chart) {
        return this.validator.validateChart(chart);
    }
    
    /**
     * Gets supported file types
     */
    getSupportedFileTypes() {
        return {
            excel: ExcelParser.getSupportedExtensions(),
            pdf: PdfParser.getSupportedExtensions()
        };
    }
    
    /**
     * Checks if a file is supported
     */
    isFileSupported(filename) {
        const fileType = this.detectFileType(filename);
        return fileType !== null;
    }
    
    /**
     * Gets extraction statistics
     */
    getStatistics() {
        if (!this.results) {
            return null;
        }
        
        const chart = this.results.chart;
        
        return {
            totalUnits: chart.units.length,
            totalOwnership: chart.getTotalOwnershipPercentage(),
            totalVotingRights: chart.getTotalVotingRights(),
            totalLevyContributions: chart.getTotalLevyContributions(),
            unitTypes: this.getUnitTypeDistribution(chart),
            confidence: this.results.confidence,
            validationScore: this.results.validation ? this.results.validation.summary.overallScore : null,
            errorCount: this.results.errors.length,
            warningCount: this.results.warnings.length
        };
    }
    
    /**
     * Gets unit type distribution
     */
    getUnitTypeDistribution(chart) {
        const distribution = {};
        chart.units.forEach(unit => {
            const type = unit.unitType || 'unknown';
            distribution[type] = (distribution[type] || 0) + 1;
        });
        return distribution;
    }
    
    /**
     * Resets extraction state
     */
    reset() {
        this.results = null;
        this.errors = [];
        this.warnings = [];
    }
    
    /**
     * Gets last extraction results
     */
    getResults() {
        return this.results;
    }
    
    /**
     * Gets extraction errors
     */
    getErrors() {
        return [...this.errors];
    }
    
    /**
     * Gets extraction warnings
     */
    getWarnings() {
        return [...this.warnings];
    }
    
    /**
     * Creates a summary report
     */
    generateReport() {
        if (!this.results) {
            return null;
        }
        
        const stats = this.getStatistics();
        const chart = this.results.chart;
        
        return {
            summary: {
                planNumber: chart.planNumber,
                buildingName: chart.buildingName,
                totalUnits: stats.totalUnits,
                extractionDate: this.results.metadata.extractionTimestamp,
                source: this.results.source,
                confidence: this.results.confidence
            },
            statistics: stats,
            validation: this.results.validation ? this.results.validation.summary : null,
            issues: {
                errors: this.results.errors,
                warnings: this.results.warnings
            },
            recommendations: this.generateRecommendations()
        };
    }
    
    /**
     * Generates recommendations based on extraction results
     */
    generateRecommendations() {
        const recommendations = [];
        
        if (!this.results) {
            return recommendations;
        }
        
        const confidence = this.results.confidence.score;
        const validation = this.results.validation;
        
        // Confidence-based recommendations
        if (confidence < this.options.minConfidenceThreshold) {
            recommendations.push({
                type: 'warning',
                message: 'Low confidence extraction - manual review strongly recommended',
                action: 'Review all extracted data carefully before saving'
            });
        } else if (confidence < this.options.highConfidenceThreshold) {
            recommendations.push({
                type: 'info',
                message: 'Medium confidence extraction - review recommended',
                action: 'Check key fields and percentages before saving'
            });
        }
        
        // Validation-based recommendations
        if (validation && !validation.passed) {
            if (validation.errors.length > 0) {
                recommendations.push({
                    type: 'error',
                    message: `${validation.errors.length} validation errors found`,
                    action: 'Fix validation errors before saving'
                });
            }
            
            if (validation.warnings.length > 5) {
                recommendations.push({
                    type: 'warning',
                    message: `${validation.warnings.length} validation warnings found`,
                    action: 'Review warnings and consider corrections'
                });
            }
        }
        
        // Data quality recommendations
        const chart = this.results.chart;
        const totalPercentage = chart.getTotalOwnershipPercentage();
        
        if (Math.abs(totalPercentage - 100) > 0.1) {
            recommendations.push({
                type: 'error',
                message: `Ownership percentages sum to ${totalPercentage.toFixed(2)}% instead of 100%`,
                action: 'Verify and correct ownership percentages'
            });
        }
        
        // Missing data recommendations
        const incompleteUnits = chart.units.filter(unit => 
            !unit.unitNumber || !unit.ownerName || !unit.ownershipPercentage
        );
        
        if (incompleteUnits.length > 0) {
            recommendations.push({
                type: 'warning',
                message: `${incompleteUnits.length} units have missing required data`,
                action: 'Complete missing unit information'
            });
        }
        
        return recommendations;
    }
}

module.exports = ExtractionEngine;