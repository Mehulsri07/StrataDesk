/**
 * Unit Class - Represents a single strata unit
 * Contains all relevant information about a strata unit including ownership details
 */

class Unit {
    constructor(data = {}) {
        this.unitNumber = data.unitNumber || null;
        this.ownerName = data.ownerName || null;
        this.ownershipPercentage = data.ownershipPercentage || 0;
        this.unitType = data.unitType || 'residential'; // residential, commercial, parking, storage
        this.floor = data.floor || null;
        this.area = data.area || null; // in square meters or feet
        this.votingRights = data.votingRights || 0;
        this.levyContribution = data.levyContribution || 0;
        this.specialLevyContribution = data.specialLevyContribution || 0;
        this.address = data.address || null;
        this.lotNumber = data.lotNumber || null;
        this.planNumber = data.planNumber || null;
        
        // Validation flags
        this.isValid = true;
        this.validationErrors = [];
        
        this.validate();
    }
    
    /**
     * Validates the unit data
     */
    validate() {
        this.validationErrors = [];
        this.isValid = true;
        
        // Required fields validation
        if (!this.unitNumber) {
            this.addValidationError('Unit number is required');
        }
        
        if (!this.ownerName) {
            this.addValidationError('Owner name is required');
        }
        
        // Percentage validation
        if (this.ownershipPercentage <= 0 || this.ownershipPercentage > 100) {
            this.addValidationError('Ownership percentage must be between 0 and 100');
        }
        
        // Voting rights validation
        if (this.votingRights < 0) {
            this.addValidationError('Voting rights cannot be negative');
        }
        
        // Levy contribution validation
        if (this.levyContribution < 0) {
            this.addValidationError('Levy contribution cannot be negative');
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
     * Returns a plain object representation of the unit
     */
    toObject() {
        return {
            unitNumber: this.unitNumber,
            ownerName: this.ownerName,
            ownershipPercentage: this.ownershipPercentage,
            unitType: this.unitType,
            floor: this.floor,
            area: this.area,
            votingRights: this.votingRights,
            levyContribution: this.levyContribution,
            specialLevyContribution: this.specialLevyContribution,
            address: this.address,
            lotNumber: this.lotNumber,
            planNumber: this.planNumber,
            isValid: this.isValid,
            validationErrors: this.validationErrors
        };
    }
    
    /**
     * Creates a Unit from a plain object
     */
    static fromObject(obj) {
        return new Unit(obj);
    }
    
    /**
     * Compares two units for equality
     */
    equals(other) {
        if (!(other instanceof Unit)) {
            return false;
        }
        
        return this.unitNumber === other.unitNumber &&
               this.ownerName === other.ownerName &&
               Math.abs(this.ownershipPercentage - other.ownershipPercentage) < 0.001;
    }
    
    /**
     * Returns a string representation of the unit
     */
    toString() {
        return `Unit ${this.unitNumber}: ${this.ownerName} (${this.ownershipPercentage}%)`;
    }
}

// Export for both browser and Node.js environments
if (typeof window !== 'undefined') {
    window.Unit = Unit;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Unit };
}