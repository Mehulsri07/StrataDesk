const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

const { runQuery, getRow, getAllRows } = require('../database/init');
const { authenticateToken, requireOwnership } = require('../middleware/auth');
const { uploadMultiple, cleanupOnError } = require('../middleware/upload');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { 
  getFileInfo, 
  createThumbnail, 
  deleteFile, 
  IMAGE_TYPES,
  ensureDirectory 
} = require('../utils/fileUtils');
const { logger } = require('../utils/logger');

const router = express.Router();

// Validation schemas
const uploadMetadataSchema = Joi.object({
  project_id: Joi.string().uuid().required(),
  bore_id: Joi.string().max(50).optional(),
  survey_date: Joi.date().optional(),
  water_level: Joi.number().min(0).max(1000).optional(),
  water_level_unit: Joi.string().valid('feet', 'meters').default('feet'),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  location_accuracy: Joi.number().min(0).optional(),
  location_source: Joi.string().valid('gps', 'map_click', 'address_search').optional(),
  elevation: Joi.number().optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  notes: Joi.string().max(1000).optional(),
  surveyor: Joi.string().max(100).optional(),
  weather_conditions: Joi.string().max(200).optional(),
  measurement_method: Joi.string().max(100).optional()
});

// Helper function to get file owner
async function getFileOwner(req) {
  const file = await getRow(
    'SELECT user_id FROM files WHERE id = ?',
    [req.params.id]
  );
  return file?.user_id;
}

// Upload files
router.post('/upload', 
  authenticateToken,
  cleanupOnError,
  uploadMultiple('files', 10),
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please select at least one file to upload'
      });
    }

    // Validate metadata
    const { error, value } = uploadMetadataSchema.validate(req.body);
    if (error) {
      throw new ValidationError('Invalid metadata', error.details);
    }

    // Verify project ownership
    const project = await getRow(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [value.project_id, req.user.id]
    );

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        message: 'Project not found or access denied'
      });
    }

    const uploadedFiles = [];
    const errors = [];

    // Process each uploaded file
    for (const file of req.files) {
      try {
        const fileId = uuidv4();
        const fileInfo = await getFileInfo(file.path);
        
        // Create thumbnail for images
        let thumbnailPath = null;
        if (IMAGE_TYPES.has(file.mimetype)) {
          try {
            const thumbnailDir = path.join(path.dirname(file.path), 'thumbnails');
            await ensureDirectory(thumbnailDir);
            thumbnailPath = path.join(thumbnailDir, `thumb_${file.filename}`);
            await createThumbnail(file.path, thumbnailPath);
          } catch (thumbError) {
            logger.warn('Thumbnail creation failed:', { 
              file: file.filename, 
              error: thumbError.message 
            });
          }
        }

        // Insert file record
        await runQuery(`
          INSERT INTO files (
            id, project_id, user_id, filename, original_filename, 
            file_path, file_size, mime_type, file_hash, thumbnail_path,
            bore_id, survey_date, water_level, water_level_unit,
            latitude, longitude, location_accuracy, location_source, elevation,
            tags, notes, surveyor, weather_conditions, measurement_method
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          fileId,
          value.project_id,
          req.user.id,
          file.filename,
          file.originalname,
          file.path,
          fileInfo.size,
          file.mimetype,
          fileInfo.hash,
          thumbnailPath,
          value.bore_id || null,
          value.survey_date || null,
          value.water_level || null,
          value.water_level_unit || 'feet',
          value.latitude || null,
          value.longitude || null,
          value.location_accuracy || null,
          value.location_source || null,
          value.elevation || null,
          JSON.stringify(value.tags || []),
          value.notes || null,
          value.surveyor || null,
          value.weather_conditions || null,
          value.measurement_method || null
        ]);

        // Update project file count
        await runQuery(
          'UPDATE projects SET file_count = file_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [value.project_id]
        );

        uploadedFiles.push({
          id: fileId,
          filename: file.filename,
          originalName: file.originalname,
          size: fileInfo.size,
          mimeType: file.mimetype,
          hash: fileInfo.hash,
          hasThumbnail: !!thumbnailPath
        });

        logger.info('File uploaded successfully:', {
          fileId,
          filename: file.filename,
          size: fileInfo.size,
          userId: req.user.id,
          projectId: value.project_id
        });

      } catch (fileError) {
        logger.error('File processing failed:', {
          filename: file.filename,
          error: fileError.message,
          userId: req.user.id
        });
        
        errors.push({
          filename: file.originalname,
          error: fileError.message
        });

        // Clean up the file
        try {
          await deleteFile(file.path);
        } catch (cleanupError) {
          logger.error('File cleanup failed:', { path: file.path, error: cleanupError.message });
        }
      }
    }

    // Return response
    const response = {
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles
    };

    if (errors.length > 0) {
      response.errors = errors;
      response.message += `, ${errors.length} file(s) failed`;
    }

    res.status(201).json(response);
  })
);

// Get files with filtering and pagination
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const querySchema = Joi.object({
    project_id: Joi.string().uuid().optional(),
    search: Joi.string().max(100).optional(),
    bore_id: Joi.string().max(50).optional(),
    date_from: Joi.date().optional(),
    date_to: Joi.date().optional(),
    lat_min: Joi.number().min(-90).max(90).optional(),
    lat_max: Joi.number().min(-90).max(90).optional(),
    lng_min: Joi.number().min(-180).max(180).optional(),
    lng_max: Joi.number().min(-180).max(180).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort_by: Joi.string().valid('created_at', 'survey_date', 'filename', 'file_size').default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  });

  const { error, value } = querySchema.validate(req.query);
  if (error) {
    throw new ValidationError('Invalid query parameters', error.details);
  }

  // Build WHERE clause
  const conditions = ['user_id = ?'];
  const params = [req.user.id];

  if (value.project_id) {
    conditions.push('project_id = ?');
    params.push(value.project_id);
  }

  if (value.search) {
    conditions.push('(filename LIKE ? OR bore_id LIKE ? OR notes LIKE ?)');
    const searchTerm = `%${value.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (value.bore_id) {
    conditions.push('bore_id = ?');
    params.push(value.bore_id);
  }

  if (value.date_from) {
    conditions.push('survey_date >= ?');
    params.push(value.date_from);
  }

  if (value.date_to) {
    conditions.push('survey_date <= ?');
    params.push(value.date_to);
  }

  if (value.lat_min && value.lat_max) {
    conditions.push('latitude BETWEEN ? AND ?');
    params.push(value.lat_min, value.lat_max);
  }

  if (value.lng_min && value.lng_max) {
    conditions.push('longitude BETWEEN ? AND ?');
    params.push(value.lng_min, value.lng_max);
  }

  const whereClause = conditions.join(' AND ');
  const offset = (value.page - 1) * value.limit;

  // Get total count
  const countResult = await getRow(
    `SELECT COUNT(*) as total FROM files WHERE ${whereClause}`,
    params
  );

  // Get files
  const files = await getAllRows(`
    SELECT 
      id, filename, original_filename, file_size, mime_type,
      bore_id, survey_date, water_level, water_level_unit,
      latitude, longitude, elevation, tags, notes, surveyor,
      weather_conditions, measurement_method, thumbnail_path,
      created_at, updated_at
    FROM files 
    WHERE ${whereClause}
    ORDER BY ${value.sort_by} ${value.sort_order}
    LIMIT ? OFFSET ?
  `, [...params, value.limit, offset]);

  // Parse JSON fields
  const processedFiles = files.map(file => ({
    ...file,
    tags: JSON.parse(file.tags || '[]'),
    hasThumbnail: !!file.thumbnail_path,
    url: `/api/files/${file.id}/download`,
    thumbnailUrl: file.thumbnail_path ? `/api/files/${file.id}/thumbnail` : null
  }));

  res.json({
    files: processedFiles,
    pagination: {
      page: value.page,
      limit: value.limit,
      total: countResult.total,
      pages: Math.ceil(countResult.total / value.limit)
    }
  });
}));

// Get single file details
router.get('/:id', 
  authenticateToken,
  requireOwnership(getFileOwner),
  asyncHandler(async (req, res) => {
    const file = await getRow(`
      SELECT 
        f.*, p.name as project_name
      FROM files f
      LEFT JOIN projects p ON f.project_id = p.id
      WHERE f.id = ?
    `, [req.params.id]);

    if (!file) {
      throw new NotFoundError('File not found');
    }

    // Parse JSON fields
    const processedFile = {
      ...file,
      tags: JSON.parse(file.tags || '[]'),
      hasThumbnail: !!file.thumbnail_path,
      url: `/api/files/${file.id}/download`,
      thumbnailUrl: file.thumbnail_path ? `/api/files/${file.id}/thumbnail` : null
    };

    res.json({ file: processedFile });
  })
);

// Download file
router.get('/:id/download',
  authenticateToken,
  requireOwnership(getFileOwner),
  asyncHandler(async (req, res) => {
    const file = await getRow(
      'SELECT filename, original_filename, file_path, mime_type FROM files WHERE id = ?',
      [req.params.id]
    );

    if (!file) {
      throw new NotFoundError('File not found');
    }

    // Check if file exists on disk
    try {
      await fs.access(file.file_path);
    } catch (error) {
      logger.error('File not found on disk:', { 
        fileId: req.params.id, 
        path: file.file_path 
      });
      throw new NotFoundError('File not found on disk');
    }

    // Set headers for download
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_filename}"`);

    // Stream file
    const fileStream = require('fs').createReadStream(file.file_path);
    fileStream.pipe(res);

    logger.info('File downloaded:', {
      fileId: req.params.id,
      filename: file.filename,
      userId: req.user.id
    });
  })
);

// Get thumbnail
router.get('/:id/thumbnail',
  authenticateToken,
  requireOwnership(getFileOwner),
  asyncHandler(async (req, res) => {
    const file = await getRow(
      'SELECT thumbnail_path FROM files WHERE id = ?',
      [req.params.id]
    );

    if (!file || !file.thumbnail_path) {
      throw new NotFoundError('Thumbnail not found');
    }

    // Check if thumbnail exists
    try {
      await fs.access(file.thumbnail_path);
    } catch (error) {
      throw new NotFoundError('Thumbnail not found on disk');
    }

    // Set headers
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

    // Stream thumbnail
    const thumbnailStream = require('fs').createReadStream(file.thumbnail_path);
    thumbnailStream.pipe(res);
  })
);

// Update file metadata
router.patch('/:id',
  authenticateToken,
  requireOwnership(getFileOwner),
  asyncHandler(async (req, res) => {
    const updateSchema = Joi.object({
      bore_id: Joi.string().max(50).optional(),
      survey_date: Joi.date().optional(),
      water_level: Joi.number().min(0).max(1000).optional(),
      water_level_unit: Joi.string().valid('feet', 'meters').optional(),
      latitude: Joi.number().min(-90).max(90).optional(),
      longitude: Joi.number().min(-180).max(180).optional(),
      location_accuracy: Joi.number().min(0).optional(),
      elevation: Joi.number().optional(),
      tags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
      notes: Joi.string().max(1000).optional(),
      surveyor: Joi.string().max(100).optional(),
      weather_conditions: Joi.string().max(200).optional(),
      measurement_method: Joi.string().max(100).optional()
    });

    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      throw new ValidationError('Invalid input', error.details);
    }

    const updates = [];
    const params = [];

    Object.entries(value).forEach(([key, val]) => {
      if (key === 'tags') {
        updates.push('tags = ?');
        params.push(JSON.stringify(val));
      } else {
        updates.push(`${key} = ?`);
        params.push(val);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No updates provided',
        message: 'Please provide fields to update'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    await runQuery(
      `UPDATE files SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    logger.info('File metadata updated:', {
      fileId: req.params.id,
      updates: Object.keys(value),
      userId: req.user.id
    });

    res.json({ message: 'File updated successfully' });
  })
);

// Delete file
router.delete('/:id',
  authenticateToken,
  requireOwnership(getFileOwner),
  asyncHandler(async (req, res) => {
    const file = await getRow(
      'SELECT file_path, thumbnail_path, project_id FROM files WHERE id = ?',
      [req.params.id]
    );

    if (!file) {
      throw new NotFoundError('File not found');
    }

    // Delete from database first
    await runQuery('DELETE FROM files WHERE id = ?', [req.params.id]);

    // Update project file count
    await runQuery(
      'UPDATE projects SET file_count = file_count - 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [file.project_id]
    );

    // Delete files from disk
    try {
      await deleteFile(file.file_path);
      if (file.thumbnail_path) {
        await deleteFile(file.thumbnail_path);
      }
    } catch (diskError) {
      logger.warn('Failed to delete file from disk:', {
        fileId: req.params.id,
        path: file.file_path,
        error: diskError.message
      });
    }

    logger.info('File deleted:', {
      fileId: req.params.id,
      userId: req.user.id
    });

    res.json({ message: 'File deleted successfully' });
  })
);

// Export project files as ZIP
router.get('/export/project/:projectId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    // Verify project ownership
    const project = await getRow(
      'SELECT id, name FROM projects WHERE id = ? AND user_id = ?',
      [req.params.projectId, req.user.id]
    );

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Get project files
    const files = await getAllRows(`
      SELECT filename, original_filename, file_path, bore_id, survey_date, 
             water_level, latitude, longitude, tags, notes
      FROM files 
      WHERE project_id = ? AND user_id = ?
      ORDER BY created_at
    `, [req.params.projectId, req.user.id]);

    if (files.length === 0) {
      return res.status(404).json({
        error: 'No files found',
        message: 'Project has no files to export'
      });
    }

    // Set response headers
    const zipFilename = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.on('error', (err) => {
      logger.error('Archive error:', err);
      res.status(500).json({ error: 'Archive creation failed' });
    });

    archive.pipe(res);

    // Add project metadata
    const metadata = {
      project: {
        id: project.id,
        name: project.name
      },
      exportDate: new Date().toISOString(),
      fileCount: files.length,
      exportedBy: req.user.username
    };
    
    archive.append(JSON.stringify(metadata, null, 2), { name: 'project-info.json' });

    // Add files to archive
    for (const file of files) {
      try {
        // Check if file exists
        await fs.access(file.file_path);
        
        // Add file to archive
        archive.file(file.file_path, { name: `files/${file.original_filename}` });
        
        // Add file metadata
        const fileMetadata = {
          filename: file.original_filename,
          bore_id: file.bore_id,
          survey_date: file.survey_date,
          water_level: file.water_level,
          location: {
            latitude: file.latitude,
            longitude: file.longitude
          },
          tags: JSON.parse(file.tags || '[]'),
          notes: file.notes
        };
        
        archive.append(
          JSON.stringify(fileMetadata, null, 2), 
          { name: `metadata/${file.original_filename}.json` }
        );
        
      } catch (fileError) {
        logger.warn('File not found during export:', {
          filename: file.filename,
          path: file.file_path,
          error: fileError.message
        });
      }
    }

    // Finalize archive
    archive.finalize();

    logger.info('Project exported:', {
      projectId: req.params.projectId,
      fileCount: files.length,
      userId: req.user.id
    });
  })
);

module.exports = router;