/**
 * Validation Engine - Comprehensive validation for strata chart data
 * Implements all correctness, completeness, consistency, and format compliance checks
 */

class ValidationEngine {
    constructor(options = {}) {
        this.options = {
            // Tolerance settings
            percentageTolerance: 0.01, // Allow 0.01% difference in total percentages
            roundingTolerance: 0.001, // Tolerance for rounding differences
            
            // Validation levels
            strictMode: false, // If true, warnings become errors
            requireAllFields: false, // If true, all optional fields must be present
            
            // Business rules
            maxOwnershipPercentage: 100,
            minOwnershipPercentage: 0.001,
            maxUnitsPerChart: 10000,
            
            // Format validation
            unitNumberFormat: /^[A-Z0-9\-\/]+$/i,
            planNumberFormat: /^\d+$/,
            
            ...options
        };
        
        this.errors = [];
        this.warnings = [];
        this.validationResults = {};
    }
    
    /**
     * Validates a complete strata chart
     */
    validateChart(strataChart) {
        this.errors = [];
        this.warnings = [];
        this.validationResults = {
            correctness: { passed: false, details: [] },
            completeness: { passed: false, details: [] },
            consistency: { passed: false, details: [] },
            formatCompliance: { passed: false, details: [] },
            businessRules: { passed: false, details: [] }
        };
        
        // Run all validation categories
        this.validateCorrectness(strataChart);
        this.validateCompleteness(strataChart);
        this.validateConsistency(strataChart);
        this.validateFormatCompliance(strataChart);
        this.validateBusinessRules(strataChart);
        
        // Calculate overall results
        const overallPassed = Object.values(this.validationResults).every(result => result.passed);
        
        return {
            passed: overallPassed,
            errors: this.errors,
            warnings: this.warnings,
            results: this.validationResults,
            summary: this.generateSummary()
        };
    }
    
    /**
     * Validates correctness properties
     */
    validateCorrectness(strataChart) {
        const results = this.validationResults.correctness;
        
        try {
            // Property 1: Total ownership percentages must sum to 100%
            const totalPercentage = strataChart.getTotalOwnershipPercentage();
            const percentageDiff = Math.abs(totalPercentage - 100);
            
            if (percentageDiff > this.options.percentageTolerance) {
                this.addError(`Total ownership percentage is ${totalPercentage.toFixed(4)}%, must be 100% (±${this.options.percentageTolerance}%)`);
                results.details.push({
                    property: 'percentage_sum',
                    passed: false,
                    expected: 100,
                    actual: totalPercentage,
                    difference: percentageDiff
                });
            } else {
                results.details.push({
                    property: 'percentage_sum',
                    passed: true,
                    expected: 100,
                    actual: totalPercentage,
                    difference: percentageDiff
                });
                
                if (percentageDiff > this.options.roundingTolerance) {
                    this.addWarning(`Total ownership percentage is ${totalPercentage.toFixed(4)}%, minor rounding difference from 100%`);
                }
            }
            
            // Property 2: All individual percentages must be positive and <= 100%
            let invalidPercentages = 0;
            strataChart.units.forEach(unit => {
                if (unit.ownershipPercentage <= 0 || unit.ownershipPercentage > this.options.maxOwnershipPercentage) {
                    this.addError(`Unit ${unit.unitNumber}: Invalid ownership percentage ${unit.ownershipPercentage}%`);
                    invalidPercentages++;
                }
            });
            
            results.details.push({
                property: 'individual_percentages',
                passed: invalidPercentages === 0,
                invalidCount: invalidPercentages,
                totalUnits: strataChart.units.length
            });
            
            // Property 3: Voting rights should align with ownership (if present)
            const totalVotingRights = strataChart.getTotalVotingRights();
            if (totalVotingRights > 0) {
                let votingMismatches = 0;
                strataChart.units.forEach(unit => {
                    if (unit.votingRights > 0) {
                        const expectedVoting = (unit.ownershipPercentage / 100) * totalVotingRights;
                        const votingDiff = Math.abs(unit.votingRights - expectedVoting);
                        
                        if (votingDiff > 0.01) {
                            this.addWarning(`Unit ${unit.unitNumber}: Voting rights (${unit.votingRights}) may not align with ownership percentage (${unit.ownershipPercentage}%)`);
                            votingMismatches++;
                        }
                    }
                });
                
                results.details.push({
                    property: 'voting_alignment',
                    passed: votingMismatches === 0,
                    mismatchCount: votingMismatches,
                    totalWithVoting: strataChart.units.filter(u => u.votingRights > 0).length
                });
            }
            
            results.passed = results.details.every(detail => detail.passed);
            
        } catch (error) {
            this.addError(`Correctness validation failed: ${error.message}`);
            results.passed = false;
        }
    }
    
    /**
     * Validates completeness properties
     */
    validateCompleteness(strataChart) {
        const results = this.validationResults.completeness;
        
        try {
            // Property 1: All units must have required fields
            const requiredFields = ['unitNumber', 'ownerName', 'ownershipPercentage'];
            const optionalFields = ['unitType', 'floor', 'area', 'votingRights', 'levyContribution'];
            
            let incompleteUnits = 0;
            const fieldCompleteness = {};
            
            // Initialize field completeness tracking
            [...requiredFields, ...optionalFields].forEach(field => {
                fieldCompleteness[field] = { present: 0, missing: 0 };
            });
            
            strataChart.units.forEach(unit => {
                let unitIncomplete = false;
                
                // Check required fields
                requiredFields.forEach(field => {
                    if (!unit[field] || unit[field] === '' || unit[field] === null) {
                        this.addError(`Unit ${unit.unitNumber || 'Unknown'}: Missing required field '${field}'`);
                        fieldCompleteness[field].missing++;
                        unitIncomplete = true;
                    } else {
                        fieldCompleteness[field].present++;
                    }
                });
                
                // Check optional fields
                optionalFields.forEach(field => {
                    if (unit[field] && unit[field] !== '' && unit[field] !== null) {
                        fieldCompleteness[field].present++;
                    } else {
                        fieldCompleteness[field].missing++;
                        if (this.options.requireAllFields) {
                            this.addWarning(`Unit ${unit.unitNumber || 'Unknown'}: Missing optional field '${field}'`);
                        }
                    }
                });
                
                if (unitIncomplete) {
                    incompleteUnits++;
                }
            });
            
            results.details.push({
                property: 'required_fields',
                passed: incompleteUnits === 0,
                incompleteUnits: incompleteUnits,
                totalUnits: strataChart.units.length,
                fieldCompleteness: fieldCompleteness
            });
            
            // Property 2: Chart metadata completeness
            const requiredMetadata = ['planNumber'];
            const optionalMetadata = ['buildingName', 'address', 'planType'];
            let missingMetadata = 0;
            
            requiredMetadata.forEach(field => {
                if (!strataChart[field] || strataChart[field] === '') {
                    this.addError(`Missing required chart metadata: ${field}`);
                    missingMetadata++;
                }
            });
            
            optionalMetadata.forEach(field => {
                if ((!strataChart[field] || strataChart[field] === '') && this.options.requireAllFields) {
                    this.addWarning(`Missing optional chart metadata: ${field}`);
                }
            });
            
            results.details.push({
                property: 'metadata_completeness',
                passed: missingMetadata === 0,
                missingRequired: missingMetadata,
                totalRequired: requiredMetadata.length
            });
            
            results.passed = results.details.every(detail => detail.passed);
            
        } catch (error) {
            this.addError(`Completeness validation failed: ${error.message}`);
            results.passed = false;
        }
    }
    
    /**
     * Validates consistency properties
     */
    validateConsistency(strataChart) {
        const results = this.validationResults.consistency;
        
        try {
            // Property 1: Unit numbers must be unique
            const unitNumbers = strataChart.units.map(unit => unit.unitNumber);
            const duplicates = unitNumbers.filter((num, index) => unitNumbers.indexOf(num) !== index);
            const uniqueDuplicates = [...new Set(duplicates)];
            
            if (uniqueDuplicates.length > 0) {
                this.addError(`Duplicate unit numbers found: ${uniqueDuplicates.join(', ')}`);
            }
            
            results.details.push({
                property: 'unique_unit_numbers',
                passed: uniqueDuplicates.length === 0,
                duplicates: uniqueDuplicates,
                totalUnits: strataChart.units.length
            });
            
            // Property 2: Cross-validation of related fields
            let inconsistentUnits = 0;
            strataChart.units.forEach(unit => {
                // Check if voting rights and levy contributions align with ownership
                if (unit.votingRights > 0 && unit.levyContribution > 0) {
                    const votingRatio = unit.votingRights / strataChart.getTotalVotingRights();
                    const levyRatio = unit.levyContribution / strataChart.getTotalLevyContributions();
                    const ownershipRatio = unit.ownershipPercentage / 100;
                    
                    const votingDiff = Math.abs(votingRatio - ownershipRatio);
                    const levyDiff = Math.abs(levyRatio - ownershipRatio);
                    
                    if (votingDiff > 0.05 || levyDiff > 0.05) {
                        this.addWarning(`Unit ${unit.unitNumber}: Inconsistent ratios between ownership, voting rights, and levy contributions`);
                        inconsistentUnits++;
                    }
                }
            });
            
            results.details.push({
                property: 'field_consistency',
                passed: inconsistentUnits === 0,
                inconsistentUnits: inconsistentUnits,
                totalUnits: strataChart.units.length
            });
            
            // Property 3: Data source consistency
            if (strataChart.source && strataChart.sourceType) {
                const sourceExtension = strataChart.source.toLowerCase().substring(strataChart.source.lastIndexOf('.'));
                const expectedType = sourceExtension === '.xlsx' || sourceExtension === '.xls' ? 'excel' : 
                                   sourceExtension === '.pdf' ? 'pdf' : 'unknown';
                
                const sourceConsistent = strataChart.sourceType === expectedType;
                if (!sourceConsistent) {
                    this.addWarning(`Source type '${strataChart.sourceType}' doesn't match file extension '${sourceExtension}'`);
                }
                
                results.details.push({
                    property: 'source_consistency',
                    passed: sourceConsistent,
                    sourceType: strataChart.sourceType,
                    expectedType: expectedType
                });
            }
            
            results.passed = results.details.every(detail => detail.passed);
            
        } catch (error) {
            this.addError(`Consistency validation failed: ${error.message}`);
            results.passed = false;
        }
    }
    
    /**
     * Validates format compliance
     */
    validateFormatCompliance(strataChart) {
        const results = this.validationResults.formatCompliance;
        
        try {
            // Property 1: Unit number format compliance
            let invalidUnitNumbers = 0;
            strataChart.units.forEach(unit => {
                if (unit.unitNumber && !this.options.unitNumberFormat.test(unit.unitNumber)) {
                    this.addWarning(`Unit ${unit.unitNumber}: Unit number format doesn't match expected pattern`);
                    invalidUnitNumbers++;
                }
            });
            
            results.details.push({
                property: 'unit_number_format',
                passed: invalidUnitNumbers === 0,
                invalidCount: invalidUnitNumbers,
                totalUnits: strataChart.units.length,
                expectedFormat: this.options.unitNumberFormat.toString()
            });
            
            // Property 2: Plan number format compliance
            let planNumberValid = true;
            if (strataChart.planNumber && !this.options.planNumberFormat.test(strataChart.planNumber)) {
                this.addWarning(`Plan number '${strataChart.planNumber}' doesn't match expected format`);
                planNumberValid = false;
            }
            
            results.details.push({
                property: 'plan_number_format',
                passed: planNumberValid,
                planNumber: strataChart.planNumber,
                expectedFormat: this.options.planNumberFormat.toString()
            });
            
            // Property 3: Numeric field ranges
            let invalidRanges = 0;
            strataChart.units.forEach(unit => {
                if (unit.ownershipPercentage < this.options.minOwnershipPercentage || 
                    unit.ownershipPercentage > this.options.maxOwnershipPercentage) {
                    this.addError(`Unit ${unit.unitNumber}: Ownership percentage ${unit.ownershipPercentage}% out of valid range`);
                    invalidRanges++;
                }
                
                if (unit.votingRights < 0) {
                    this.addError(`Unit ${unit.unitNumber}: Voting rights cannot be negative`);
                    invalidRanges++;
                }
                
                if (unit.levyContribution < 0) {
                    this.addError(`Unit ${unit.unitNumber}: Levy contribution cannot be negative`);
                    invalidRanges++;
                }
            });
            
            results.details.push({
                property: 'numeric_ranges',
                passed: invalidRanges === 0,
                invalidCount: invalidRanges,
                totalUnits: strataChart.units.length
            });
            
            results.passed = results.details.every(detail => detail.passed);
            
        } catch (error) {
            this.addError(`Format compliance validation failed: ${error.message}`);
            results.passed = false;
        }
    }
    
    /**
     * Validates business rules
     */
    validateBusinessRules(strataChart) {
        const results = this.validationResults.businessRules;
        
        try {
            // Property 1: Maximum units per chart
            const exceedsMaxUnits = strataChart.units.length > this.options.maxUnitsPerChart;
            if (exceedsMaxUnits) {
                this.addError(`Chart contains ${strataChart.units.length} units, exceeds maximum of ${this.options.maxUnitsPerChart}`);
            }
            
            results.details.push({
                property: 'max_units',
                passed: !exceedsMaxUnits,
                unitCount: strataChart.units.length,
                maxAllowed: this.options.maxUnitsPerChart
            });
            
            // Property 2: Minimum viable chart
            const hasMinimumData = strataChart.units.length > 0 && strataChart.planNumber;
            if (!hasMinimumData) {
                this.addError('Chart must have at least one unit and a plan number');
            }
            
            results.details.push({
                property: 'minimum_viable',
                passed: hasMinimumData,
                unitCount: strataChart.units.length,
                hasPlanNumber: !!strataChart.planNumber
            });
            
            // Property 3: Logical consistency checks
            let logicalErrors = 0;
            
            // Check for reasonable ownership distribution
            const avgOwnership = strataChart.getTotalOwnershipPercentage() / strataChart.units.length;
            if (avgOwnership < 0.1 || avgOwnership > 50) {
                this.addWarning(`Average ownership percentage (${avgOwnership.toFixed(2)}%) seems unusual`);
            }
            
            // Check for units with zero ownership
            const zeroOwnershipUnits = strataChart.units.filter(unit => unit.ownershipPercentage === 0);
            if (zeroOwnershipUnits.length > 0) {
                this.addWarning(`${zeroOwnershipUnits.length} units have zero ownership percentage`);
            }
            
            results.details.push({
                property: 'logical_consistency',
                passed: logicalErrors === 0,
                errorCount: logicalErrors,
                averageOwnership: avgOwnership,
                zeroOwnershipCount: zeroOwnershipUnits.length
            });
            
            results.passed = results.details.every(detail => detail.passed);
            
        } catch (error) {
            this.addError(`Business rules validation failed: ${error.message}`);
            results.passed = false;
        }
    }
    
    /**
     * Adds an error message
     */
    addError(message) {
        this.errors.push(message);
    }
    
    /**
     * Adds a warning message
     */
    addWarning(message) {
        this.warnings.push(message);
        
        if (this.options.strictMode) {
            this.errors.push(`[STRICT MODE] ${message}`);
        }
    }
    
    /**
     * Generates a validation summary
     */
    generateSummary() {
        const totalTests = Object.values(this.validationResults).reduce((sum, result) => 
            sum + result.details.length, 0);
        const passedTests = Object.values(this.validationResults).reduce((sum, result) => 
            sum + result.details.filter(detail => detail.passed).length, 0);
        
        return {
            totalTests,
            passedTests,
            failedTests: totalTests - passedTests,
            errorCount: this.errors.length,
            warningCount: this.warnings.length,
            overallScore: totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0,
            categories: {
                correctness: this.validationResults.correctness.passed,
                completeness: this.validationResults.completeness.passed,
                consistency: this.validationResults.consistency.passed,
                formatCompliance: this.validationResults.formatCompliance.passed,
                businessRules: this.validationResults.businessRules.passed
            }
        };
    }
    
    /**
     * Validates a single unit
     */
    validateUnit(unit) {
        const errors = [];
        const warnings = [];
        
        // Required field validation
        if (!unit.unitNumber) errors.push('Unit number is required');
        if (!unit.ownerName) errors.push('Owner name is required');
        if (unit.ownershipPercentage === undefined || unit.ownershipPercentage === null) {
            errors.push('Ownership percentage is required');
        }
        
        // Range validation
        if (unit.ownershipPercentage <= 0 || unit.ownershipPercentage > 100) {
            errors.push('Ownership percentage must be between 0 and 100');
        }
        
        if (unit.votingRights < 0) errors.push('Voting rights cannot be negative');
        if (unit.levyContribution < 0) errors.push('Levy contribution cannot be negative');
        
        // Format validation
        if (unit.unitNumber && !this.options.unitNumberFormat.test(unit.unitNumber)) {
            warnings.push('Unit number format may not be standard');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    /**
     * Quick validation for basic correctness
     */
    quickValidate(strataChart) {
        const errors = [];
        
        // Check basic requirements
        if (!strataChart.planNumber) errors.push('Plan number is required');
        if (strataChart.units.length === 0) errors.push('At least one unit is required');
        
        // Check percentage sum
        const totalPercentage = strataChart.getTotalOwnershipPercentage();
        if (Math.abs(totalPercentage - 100) > this.options.percentageTolerance) {
            errors.push(`Total ownership percentage is ${totalPercentage.toFixed(2)}%, must be 100%`);
        }
        
        // Check for duplicate unit numbers
        const unitNumbers = strataChart.units.map(unit => unit.unitNumber);
        const duplicates = unitNumbers.filter((num, index) => unitNumbers.indexOf(num) !== index);
        if (duplicates.length > 0) {
            errors.push(`Duplicate unit numbers: ${[...new Set(duplicates)].join(', ')}`);
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = ValidationEngine;