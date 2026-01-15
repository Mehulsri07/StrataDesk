/**
 * StrataChart Class - Represents a complete strata chart
 * Contains all units and provides validation and analysis methods
 */

// Import Unit class for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    const { Unit } = require('./Unit');
    global.Unit = Unit;
}

class StrataChart {
    constructor(data = {}) {
        this.planNumber = data.planNumber || null;
        this.planType = data.planType || 'strata'; // strata, community, survey-strata
        this.buildingName = data.buildingName || null;
        this.address = data.address || null;
        this.totalUnits = data.totalUnits || 0;
        this.createdDate = data.createdDate || new Date();
        this.lastModified = data.lastModified || new Date();
        this.source = data.source || null; // file path or source identifier
        this.sourceType = data.sourceType || null; // 'excel', 'pdf', 'manual'
        
        // Units array
        this.units = [];
        if (data.units && Array.isArray(data.units)) {
            this.units = data.units.map(unit => 
                unit instanceof Unit ? unit : new Unit(unit)
            );
        }
        
        // Common property information
        this.commonProperty = data.commonProperty || {
            description: null,
            area: null,
            managementRights: null
        };
        
        // Validation state
        this.isValid = true;
        this.validationErrors = [];
        this.validationWarnings = [];
        
        this.validate();
    }
    
    /**
     * Adds a unit to the chart
     */
    addUnit(unit) {
        if (!(unit instanceof Unit)) {
            unit = new Unit(unit);
        }
        this.units.push(unit);
        this.totalUnits = this.units.length;
        this.lastModified = new Date();
        this.validate();
    }
    
    /**
     * Removes a unit from the chart
     */
    removeUnit(unitNumber) {
        const index = this.units.findIndex(unit => unit.unitNumber === unitNumber);
        if (index !== -1) {
            this.units.splice(index, 1);
            this.totalUnits = this.units.length;
            this.lastModified = new Date();
            this.validate();
            return true;
        }
        return false;
    }
    
    /**
     * Gets a unit by unit number
     */
    getUnit(unitNumber) {
        return this.units.find(unit => unit.unitNumber === unitNumber);
    }
    
    /**
     * Gets all units
     */
    getUnits() {
        return [...this.units];
    }
    
    /**
     * Validates the entire strata chart
     */
    validate() {
        this.validationErrors = [];
        this.validationWarnings = [];
        this.isValid = true;
        
        // Basic validation
        if (!this.planNumber) {
            this.addValidationError('Plan number is required');
        }
        
        if (this.units.length === 0) {
            this.addValidationError('At least one unit is required');
        }
        
        // Validate individual units
        let hasInvalidUnits = false;
        this.units.forEach(unit => {
            if (!unit.isValid) {
                hasInvalidUnits = true;
                unit.validationErrors.forEach(error => {
                    this.addValidationError(`Unit ${unit.unitNumber}: ${error}`);
                });
            }
        });
        
        // Check for duplicate unit numbers
        const unitNumbers = this.units.map(unit => unit.unitNumber);
        const duplicates = unitNumbers.filter((num, index) => unitNumbers.indexOf(num) !== index);
        if (duplicates.length > 0) {
            this.addValidationError(`Duplicate unit numbers found: ${[...new Set(duplicates)].join(', ')}`);
        }
        
        // Validate ownership percentages sum to 100%
        const totalPercentage = this.getTotalOwnershipPercentage();
        const tolerance = 0.01; // Allow for small rounding errors
        if (Math.abs(totalPercentage - 100) > tolerance) {
            this.addValidationError(`Total ownership percentage is ${totalPercentage.toFixed(2)}%, should be 100%`);
        } else if (Math.abs(totalPercentage - 100) > 0.001) {
            this.addValidationWarning(`Total ownership percentage is ${totalPercentage.toFixed(4)}%, minor rounding difference from 100%`);
        }
        
        // Validate voting rights if present
        const totalVotingRights = this.getTotalVotingRights();
        if (totalVotingRights > 0) {
            // Check if voting rights align with ownership percentages
            const votingRightsMismatch = this.units.some(unit => {
                if (unit.votingRights > 0) {
                    const expectedVoting = (unit.ownershipPercentage / 100) * totalVotingRights;
                    return Math.abs(unit.votingRights - expectedVoting) > 0.01;
                }
                return false;
            });
            
            if (votingRightsMismatch) {
                this.addValidationWarning('Voting rights may not align with ownership percentages');
            }
        }
        
        this.isValid = this.validationErrors.length === 0;
    }
    
    /**
     * Adds a validation error
     */
    addValidationError(error) {
        this.validationErrors.push(error);
        this.isValid = false;
    }
    
    /**
     * Adds a validation warning
     */
    addValidationWarning(warning) {
        this.validationWarnings.push(warning);
    }
    
    /**
     * Calculates total ownership percentage
     */
    getTotalOwnershipPercentage() {
        return this.units.reduce((total, unit) => total + unit.ownershipPercentage, 0);
    }
    
    /**
     * Calculates total voting rights
     */
    getTotalVotingRights() {
        return this.units.reduce((total, unit) => total + unit.votingRights, 0);
    }
    
    /**
     * Calculates total levy contributions
     */
    getTotalLevyContributions() {
        return this.units.reduce((total, unit) => total + unit.levyContribution, 0);
    }
    
    /**
     * Gets units by type
     */
    getUnitsByType(type) {
        return this.units.filter(unit => unit.unitType === type);
    }
    
    /**
     * Gets units by floor
     */
    getUnitsByFloor(floor) {
        return this.units.filter(unit => unit.floor === floor);
    }
    
    /**
     * Gets summary statistics
     */
    getSummary() {
        const unitTypes = {};
        this.units.forEach(unit => {
            unitTypes[unit.unitType] = (unitTypes[unit.unitType] || 0) + 1;
        });
        
        return {
            totalUnits: this.totalUnits,
            unitTypes: unitTypes,
            totalOwnershipPercentage: this.getTotalOwnershipPercentage(),
            totalVotingRights: this.getTotalVotingRights(),
            totalLevyContributions: this.getTotalLevyContributions(),
            isValid: this.isValid,
            errorCount: this.validationErrors.length,
            warningCount: this.validationWarnings.length
        };
    }
    
    /**
     * Returns a plain object representation
     */
    toObject() {
        return {
            planNumber: this.planNumber,
            planType: this.planType,
            buildingName: this.buildingName,
            address: this.address,
            totalUnits: this.totalUnits,
            createdDate: this.createdDate,
            lastModified: this.lastModified,
            source: this.source,
            sourceType: this.sourceType,
            units: this.units.map(unit => unit.toObject()),
            commonProperty: this.commonProperty,
            isValid: this.isValid,
            validationErrors: this.validationErrors,
            validationWarnings: this.validationWarnings
        };
    }
    
    /**
     * Creates a StrataChart from a plain object
     */
    static fromObject(obj) {
        return new StrataChart(obj);
    }
    
    /**
     * Returns a string representation
     */
    toString() {
        return `Strata Plan ${this.planNumber}: ${this.totalUnits} units (${this.isValid ? 'Valid' : 'Invalid'})`;
    }
}

// Export for both browser and Node.js environments
if (typeof window !== 'undefined') {
    window.StrataChart = StrataChart;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StrataChart };
}