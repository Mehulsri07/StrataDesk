const express = require('express');
const Joi = require('joi');

const { getAllRows, getRow } = require('../database/init');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get map markers with clustering and temporal data
router.get('/markers', optionalAuth, asyncHandler(async (req, res) => {
  const querySchema = Joi.object({
    project_id: Joi.string().uuid().optional(),
    bbox: Joi.string().pattern(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/).optional(),
    date_from: Joi.date().optional(),
    date_to: Joi.date().optional(),
    cluster_radius: Joi.number().min(0).max(1000).default(50), // meters
    include_water_levels: Joi.boolean().default(true),
    user_id: Joi.string().uuid().optional()
  });

  const { error, value } = querySchema.validate(req.query);
  if (error) {
    throw new ValidationError('Invalid query parameters', error.details);
  }

  // Build WHERE clause
  const conditions = [];
  const params = [];

  // User filtering
  if (req.user) {
    conditions.push('user_id = ?');
    params.push(req.user.id);
  } else if (value.user_id) {
    conditions.push('user_id = ?');
    params.push(value.user_id);
  }

  // Project filtering
  if (value.project_id) {
    conditions.push('project_id = ?');
    params.push(value.project_id);
  }

  // Location filtering (bounding box)
  if (value.bbox) {
    const [minLng, minLat, maxLng, maxLat] = value.bbox.split(',').map(Number);
    conditions.push('latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?');
    params.push(minLat, maxLat, minLng, maxLng);
  }

  // Date filtering
  if (value.date_from) {
    conditions.push('survey_date >= ?');
    params.push(value.date_from);
  }

  if (value.date_to) {
    conditions.push('survey_date <= ?');
    params.push(value.date_to);
  }

  // Only include files with coordinates
  conditions.push('latitude IS NOT NULL AND longitude IS NOT NULL');

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get all files with location data
  const files = await getAllRows(`
    SELECT 
      id, filename, original_filename, bore_id, survey_date, 
      water_level, water_level_unit, latitude, longitude,
      project_id, created_at
    FROM files 
    ${whereClause}
    ORDER BY survey_date DESC, created_at DESC
  `, params);

  // Group files by location (with clustering)
  const locationGroups = new Map();
  const clusterRadius = value.cluster_radius / 111320; // Convert meters to degrees (approximate)

  files.forEach(file => {
    const lat = parseFloat(file.latitude);
    const lng = parseFloat(file.longitude);
    
    // Find existing cluster within radius
    let clusterId = null;
    for (const [existingId, group] of locationGroups) {
      const [groupLat, groupLng] = existingId.split(',').map(Number);
      const distance = Math.sqrt(
        Math.pow(lat - groupLat, 2) + Math.pow(lng - groupLng, 2)
      );
      
      if (distance <= clusterRadius) {
        clusterId = existingId;
        break;
      }
    }

    // Create new cluster if none found
    if (!clusterId) {
      clusterId = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      locationGroups.set(clusterId, {
        latitude: lat,
        longitude: lng,
        files: [],
        totalFiles: 0,
        uniqueBores: new Set(),
        dateRange: { earliest: null, latest: null },
        waterLevels: []
      });
    }

    const group = locationGroups.get(clusterId);
    group.files.push(file);
    group.totalFiles++;
    
    if (file.bore_id) {
      group.uniqueBores.add(file.bore_id);
    }

    // Update date range
    if (file.survey_date) {
      const surveyDate = new Date(file.survey_date);
      if (!group.dateRange.earliest || surveyDate < new Date(group.dateRange.earliest)) {
        group.dateRange.earliest = file.survey_date;
      }
      if (!group.dateRange.latest || surveyDate > new Date(group.dateRange.latest)) {
        group.dateRange.latest = file.survey_date;
      }
    }

    // Collect water levels
    if (file.water_level !== null && value.include_water_levels) {
      group.waterLevels.push({
        value: file.water_level,
        unit: file.water_level_unit || 'feet',
        date: file.survey_date,
        boreId: file.bore_id
      });
    }
  });

  // Process location groups into markers
  const markers = Array.from(locationGroups.values()).map(group => {
    // Calculate average position for cluster
    const avgLat = group.files.reduce((sum, f) => sum + parseFloat(f.latitude), 0) / group.files.length;
    const avgLng = group.files.reduce((sum, f) => sum + parseFloat(f.longitude), 0) / group.files.length;

    // Get latest file for preview
    const latestFile = group.files[0]; // Already sorted by date DESC

    // Calculate water level statistics
    let waterLevelStats = null;
    if (group.waterLevels.length > 0) {
      const levels = group.waterLevels.map(wl => wl.value);
      waterLevelStats = {
        count: levels.length,
        average: levels.reduce((sum, val) => sum + val, 0) / levels.length,
        minimum: Math.min(...levels),
        maximum: Math.max(...levels),
        latest: group.waterLevels.find(wl => wl.date === group.dateRange.latest)?.value || null,
        unit: group.waterLevels[0].unit
      };
    }

    return {
      id: `marker_${avgLat.toFixed(6)}_${avgLng.toFixed(6)}`,
      latitude: parseFloat(avgLat.toFixed(6)),
      longitude: parseFloat(avgLng.toFixed(6)),
      totalFiles: group.totalFiles,
      uniqueBores: group.uniqueBores.size,
      dateRange: group.dateRange,
      waterLevels: waterLevelStats,
      latestFile: {
        id: latestFile.id,
        filename: latestFile.original_filename,
        boreId: latestFile.bore_id,
        surveyDate: latestFile.survey_date,
        waterLevel: latestFile.water_level,
        waterLevelUnit: latestFile.water_level_unit
      },
      // Include up to 5 most recent files for popup
      recentFiles: group.files.slice(0, 5).map(file => ({
        id: file.id,
        filename: file.original_filename,
        boreId: file.bore_id,
        surveyDate: file.survey_date,
        waterLevel: file.water_level,
        waterLevelUnit: file.water_level_unit,
        url: `/api/files/${file.id}/download`
      }))
    };
  });

  res.json({
    markers,
    summary: {
      totalMarkers: markers.length,
      totalFiles: files.length,
      clusterRadius: value.cluster_radius,
      boundingBox: value.bbox || null
    }
  });
}));

// Get location history (temporal data for a specific location)
router.get('/location/history', optionalAuth, asyncHandler(async (req, res) => {
  const querySchema = Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().min(1).max(1000).default(50), // meters
    project_id: Joi.string().uuid().optional(),
    user_id: Joi.string().uuid().optional()
  });

  const { error, value } = querySchema.validate(req.query);
  if (error) {
    throw new ValidationError('Invalid query parameters', error.details);
  }

  // Convert radius to degrees (approximate)
  const radiusDegrees = value.radius / 111320;

  // Build WHERE clause
  const conditions = [
    'latitude IS NOT NULL',
    'longitude IS NOT NULL',
    `ABS(latitude - ?) <= ?`,
    `ABS(longitude - ?) <= ?`
  ];
  const params = [value.latitude, radiusDegrees, value.longitude, radiusDegrees];

  // User filtering
  if (req.user) {
    conditions.push('user_id = ?');
    params.push(req.user.id);
  } else if (value.user_id) {
    conditions.push('user_id = ?');
    params.push(value.user_id);
  }

  // Project filtering
  if (value.project_id) {
    conditions.push('project_id = ?');
    params.push(value.project_id);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Get historical data
  const files = await getAllRows(`
    SELECT 
      id, filename, original_filename, bore_id, survey_date,
      water_level, water_level_unit, latitude, longitude,
      notes, surveyor, created_at
    FROM files 
    ${whereClause}
    ORDER BY survey_date ASC, created_at ASC
  `, params);

  if (files.length === 0) {
    return res.json({
      location: {
        latitude: value.latitude,
        longitude: value.longitude,
        radius: value.radius
      },
      history: [],
      summary: {
        totalRecords: 0,
        dateRange: null,
        waterLevelTrend: null
      }
    });
  }

  // Group by year for temporal analysis
  const yearlyData = new Map();
  files.forEach(file => {
    const year = file.survey_date ? new Date(file.survey_date).getFullYear() : 'Unknown';
    
    if (!yearlyData.has(year)) {
      yearlyData.set(year, {
        year,
        files: [],
        waterLevels: [],
        averageWaterLevel: null
      });
    }

    const yearData = yearlyData.get(year);
    yearData.files.push(file);

    if (file.water_level !== null) {
      yearData.waterLevels.push(file.water_level);
    }
  });

  // Calculate averages and trends
  yearlyData.forEach(yearData => {
    if (yearData.waterLevels.length > 0) {
      yearData.averageWaterLevel = yearData.waterLevels.reduce((sum, val) => sum + val, 0) / yearData.waterLevels.length;
    }
  });

  // Calculate water level trend
  const yearsWithWaterLevels = Array.from(yearlyData.values())
    .filter(yd => yd.averageWaterLevel !== null && yd.year !== 'Unknown')
    .sort((a, b) => a.year - b.year);

  let waterLevelTrend = null;
  if (yearsWithWaterLevels.length >= 2) {
    const firstYear = yearsWithWaterLevels[0];
    const lastYear = yearsWithWaterLevels[yearsWithWaterLevels.length - 1];
    const change = lastYear.averageWaterLevel - firstYear.averageWaterLevel;
    const yearSpan = lastYear.year - firstYear.year;
    
    waterLevelTrend = {
      totalChange: parseFloat(change.toFixed(2)),
      annualChange: parseFloat((change / yearSpan).toFixed(2)),
      direction: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
      yearSpan,
      unit: files.find(f => f.water_level_unit)?.water_level_unit || 'feet'
    };
  }

  res.json({
    location: {
      latitude: value.latitude,
      longitude: value.longitude,
      radius: value.radius
    },
    history: Array.from(yearlyData.values()).sort((a, b) => {
      if (a.year === 'Unknown') return 1;
      if (b.year === 'Unknown') return -1;
      return b.year - a.year;
    }),
    summary: {
      totalRecords: files.length,
      dateRange: {
        earliest: files[0].survey_date,
        latest: files[files.length - 1].survey_date
      },
      waterLevelTrend
    }
  });
}));

// Get nearby locations
router.get('/nearby', optionalAuth, asyncHandler(async (req, res) => {
  const querySchema = Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().min(100).max(10000).default(1000), // meters
    limit: Joi.number().min(1).max(50).default(10),
    project_id: Joi.string().uuid().optional(),
    user_id: Joi.string().uuid().optional()
  });

  const { error, value } = querySchema.validate(req.query);
  if (error) {
    throw new ValidationError('Invalid query parameters', error.details);
  }

  // Convert radius to degrees (approximate)
  const radiusDegrees = value.radius / 111320;

  // Build WHERE clause
  const conditions = [
    'latitude IS NOT NULL',
    'longitude IS NOT NULL',
    `ABS(latitude - ?) <= ?`,
    `ABS(longitude - ?) <= ?`
  ];
  const params = [value.latitude, radiusDegrees, value.longitude, radiusDegrees];

  // User filtering
  if (req.user) {
    conditions.push('user_id = ?');
    params.push(req.user.id);
  } else if (value.user_id) {
    conditions.push('user_id = ?');
    params.push(value.user_id);
  }

  // Project filtering
  if (value.project_id) {
    conditions.push('project_id = ?');
    params.push(value.project_id);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  params.push(value.limit);

  // Get nearby files
  const nearbyFiles = await getAllRows(`
    SELECT 
      id, filename, original_filename, bore_id, survey_date,
      water_level, water_level_unit, latitude, longitude,
      project_id, created_at,
      -- Calculate approximate distance
      ABS(latitude - ?) + ABS(longitude - ?) as approx_distance
    FROM files 
    ${whereClause}
    ORDER BY approx_distance ASC
    LIMIT ?
  `, [value.latitude, value.longitude, ...params]);

  // Calculate actual distances and group by location
  const locations = new Map();
  
  nearbyFiles.forEach(file => {
    const lat = parseFloat(file.latitude);
    const lng = parseFloat(file.longitude);
    
    // Calculate actual distance using Haversine formula (approximate)
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat - value.latitude) * Math.PI / 180;
    const dLng = (lng - value.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(value.latitude * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    const locationKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    
    if (!locations.has(locationKey)) {
      locations.set(locationKey, {
        latitude: lat,
        longitude: lng,
        distance: Math.round(distance),
        files: [],
        latestSurveyDate: null,
        latestWaterLevel: null
      });
    }

    const location = locations.get(locationKey);
    location.files.push({
      id: file.id,
      filename: file.original_filename,
      boreId: file.bore_id,
      surveyDate: file.survey_date,
      waterLevel: file.water_level,
      waterLevelUnit: file.water_level_unit
    });

    // Update latest data
    if (!location.latestSurveyDate || 
        (file.survey_date && new Date(file.survey_date) > new Date(location.latestSurveyDate))) {
      location.latestSurveyDate = file.survey_date;
      location.latestWaterLevel = file.water_level;
    }
  });

  // Convert to array and sort by distance
  const nearbyLocations = Array.from(locations.values())
    .sort((a, b) => a.distance - b.distance);

  res.json({
    searchLocation: {
      latitude: value.latitude,
      longitude: value.longitude,
      radius: value.radius
    },
    nearbyLocations,
    summary: {
      totalLocations: nearbyLocations.length,
      totalFiles: nearbyFiles.length,
      searchRadius: value.radius
    }
  });
}));

module.exports = router;