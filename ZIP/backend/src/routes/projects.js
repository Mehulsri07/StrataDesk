const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

const { runQuery, getRow, getAllRows } = require('../database/init');
const { authenticateToken, requireOwnership } = require('../middleware/auth');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// Validation schemas
const createProjectSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional()
});

const updateProjectSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  settings: Joi.object().optional()
});

// Helper function to get project owner
async function getProjectOwner(req) {
  const project = await getRow(
    'SELECT user_id FROM projects WHERE id = ?',
    [req.params.id]
  );
  return project?.user_id;
}

// Create new project
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const { error, value } = createProjectSchema.validate(req.body);
  if (error) {
    throw new ValidationError('Invalid input', error.details);
  }

  const { name, description } = value;

  // Check if project name already exists for this user
  const existingProject = await getRow(
    'SELECT id FROM projects WHERE name = ? AND user_id = ?',
    [name, req.user.id]
  );

  if (existingProject) {
    return res.status(409).json({
      error: 'Project already exists',
      message: 'A project with this name already exists'
    });
  }

  // Create project
  const projectId = uuidv4();
  await runQuery(
    'INSERT INTO projects (id, name, description, user_id) VALUES (?, ?, ?, ?)',
    [projectId, name, description || null, req.user.id]
  );

  logger.info('Project created:', {
    projectId,
    name,
    userId: req.user.id
  });

  res.status(201).json({
    message: 'Project created successfully',
    project: {
      id: projectId,
      name,
      description: description || null,
      fileCount: 0,
      createdAt: new Date().toISOString()
    }
  });
}));

// Get all projects for user
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const querySchema = Joi.object({
    search: Joi.string().max(100).optional(),
    sort_by: Joi.string().valid('name', 'created_at', 'updated_at', 'file_count').default('updated_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  });

  const { error, value } = querySchema.validate(req.query);
  if (error) {
    throw new ValidationError('Invalid query parameters', error.details);
  }

  let whereClause = 'user_id = ?';
  const params = [req.user.id];

  if (value.search) {
    whereClause += ' AND (name LIKE ? OR description LIKE ?)';
    const searchTerm = `%${value.search}%`;
    params.push(searchTerm, searchTerm);
  }

  const projects = await getAllRows(`
    SELECT 
      id, name, description, file_count, settings,
      created_at, updated_at
    FROM projects 
    WHERE ${whereClause}
    ORDER BY ${value.sort_by} ${value.sort_order}
  `, params);

  // Parse settings JSON
  const processedProjects = projects.map(project => ({
    ...project,
    settings: JSON.parse(project.settings || '{}')
  }));

  res.json({
    projects: processedProjects,
    total: projects.length
  });
}));

// Get single project
router.get('/:id', 
  authenticateToken,
  requireOwnership(getProjectOwner),
  asyncHandler(async (req, res) => {
    const project = await getRow(`
      SELECT 
        id, name, description, file_count, settings,
        created_at, updated_at
      FROM projects 
      WHERE id = ?
    `, [req.params.id]);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Get recent files
    const recentFiles = await getAllRows(`
      SELECT 
        id, filename, original_filename, file_size, mime_type,
        bore_id, survey_date, water_level, latitude, longitude,
        created_at
      FROM files 
      WHERE project_id = ? 
      ORDER BY created_at DESC 
      LIMIT 10
    `, [req.params.id]);

    // Get project statistics
    const stats = await getRow(`
      SELECT 
        COUNT(*) as total_files,
        SUM(file_size) as total_size,
        COUNT(DISTINCT bore_id) as unique_bores,
        COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as files_with_location,
        MIN(survey_date) as earliest_date,
        MAX(survey_date) as latest_date
      FROM files 
      WHERE project_id = ?
    `, [req.params.id]);

    const processedProject = {
      ...project,
      settings: JSON.parse(project.settings || '{}'),
      recentFiles: recentFiles.map(file => ({
        ...file,
        url: `/api/files/${file.id}/download`
      })),
      statistics: {
        totalFiles: stats.total_files || 0,
        totalSize: stats.total_size || 0,
        uniqueBores: stats.unique_bores || 0,
        filesWithLocation: stats.files_with_location || 0,
        dateRange: {
          earliest: stats.earliest_date,
          latest: stats.latest_date
        }
      }
    };

    res.json({ project: processedProject });
  })
);

// Update project
router.patch('/:id',
  authenticateToken,
  requireOwnership(getProjectOwner),
  asyncHandler(async (req, res) => {
    const { error, value } = updateProjectSchema.validate(req.body);
    if (error) {
      throw new ValidationError('Invalid input', error.details);
    }

    // Check if new name conflicts with existing projects
    if (value.name) {
      const existingProject = await getRow(
        'SELECT id FROM projects WHERE name = ? AND user_id = ? AND id != ?',
        [value.name, req.user.id, req.params.id]
      );

      if (existingProject) {
        return res.status(409).json({
          error: 'Project name already exists',
          message: 'A project with this name already exists'
        });
      }
    }

    const updates = [];
    const params = [];

    if (value.name) {
      updates.push('name = ?');
      params.push(value.name);
    }

    if (value.description !== undefined) {
      updates.push('description = ?');
      params.push(value.description);
    }

    if (value.settings) {
      updates.push('settings = ?');
      params.push(JSON.stringify(value.settings));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No updates provided',
        message: 'Please provide fields to update'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    await runQuery(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    logger.info('Project updated:', {
      projectId: req.params.id,
      updates: Object.keys(value),
      userId: req.user.id
    });

    res.json({ message: 'Project updated successfully' });
  })
);

// Delete project
router.delete('/:id',
  authenticateToken,
  requireOwnership(getProjectOwner),
  asyncHandler(async (req, res) => {
    // Get project info and file count
    const project = await getRow(
      'SELECT name, file_count FROM projects WHERE id = ?',
      [req.params.id]
    );

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Check if project has files
    if (project.file_count > 0) {
      const forceDelete = req.query.force === 'true';
      
      if (!forceDelete) {
        return res.status(409).json({
          error: 'Project has files',
          message: `Project "${project.name}" contains ${project.file_count} file(s). Add ?force=true to delete anyway.`,
          fileCount: project.file_count
        });
      }

      // Get all files for cleanup
      const files = await getAllRows(
        'SELECT file_path, thumbnail_path FROM files WHERE project_id = ?',
        [req.params.id]
      );

      // Delete files from disk
      const { deleteFile } = require('../utils/fileUtils');
      for (const file of files) {
        try {
          await deleteFile(file.file_path);
          if (file.thumbnail_path) {
            await deleteFile(file.thumbnail_path);
          }
        } catch (fileError) {
          logger.warn('Failed to delete file during project deletion:', {
            path: file.file_path,
            error: fileError.message
          });
        }
      }
    }

    // Delete project (CASCADE will delete files from database)
    await runQuery('DELETE FROM projects WHERE id = ?', [req.params.id]);

    logger.info('Project deleted:', {
      projectId: req.params.id,
      name: project.name,
      fileCount: project.file_count,
      userId: req.user.id
    });

    res.json({ 
      message: 'Project deleted successfully',
      deletedFiles: project.file_count
    });
  })
);

// Get project statistics
router.get('/:id/stats',
  authenticateToken,
  requireOwnership(getProjectOwner),
  asyncHandler(async (req, res) => {
    const stats = await getRow(`
      SELECT 
        COUNT(*) as total_files,
        SUM(file_size) as total_size,
        COUNT(DISTINCT bore_id) as unique_bores,
        COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as files_with_location,
        COUNT(CASE WHEN water_level IS NOT NULL THEN 1 END) as files_with_water_level,
        AVG(water_level) as avg_water_level,
        MIN(water_level) as min_water_level,
        MAX(water_level) as max_water_level,
        MIN(survey_date) as earliest_date,
        MAX(survey_date) as latest_date,
        COUNT(DISTINCT DATE(created_at)) as active_days
      FROM files 
      WHERE project_id = ?
    `, [req.params.id]);

    // Get file type distribution
    const fileTypes = await getAllRows(`
      SELECT 
        mime_type,
        COUNT(*) as count,
        SUM(file_size) as total_size
      FROM files 
      WHERE project_id = ? 
      GROUP BY mime_type
      ORDER BY count DESC
    `, [req.params.id]);

    // Get monthly activity
    const monthlyActivity = await getAllRows(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as files_uploaded,
        SUM(file_size) as bytes_uploaded
      FROM files 
      WHERE project_id = ? 
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month DESC
      LIMIT 12
    `, [req.params.id]);

    res.json({
      statistics: {
        overview: {
          totalFiles: stats.total_files || 0,
          totalSize: stats.total_size || 0,
          uniqueBores: stats.unique_bores || 0,
          filesWithLocation: stats.files_with_location || 0,
          filesWithWaterLevel: stats.files_with_water_level || 0,
          activeDays: stats.active_days || 0
        },
        waterLevels: {
          average: stats.avg_water_level ? parseFloat(stats.avg_water_level.toFixed(2)) : null,
          minimum: stats.min_water_level,
          maximum: stats.max_water_level,
          count: stats.files_with_water_level || 0
        },
        dateRange: {
          earliest: stats.earliest_date,
          latest: stats.latest_date
        },
        fileTypes: fileTypes.map(type => ({
          mimeType: type.mime_type,
          count: type.count,
          totalSize: type.total_size
        })),
        monthlyActivity: monthlyActivity.map(month => ({
          month: month.month,
          filesUploaded: month.files_uploaded,
          bytesUploaded: month.bytes_uploaded
        }))
      }
    });
  })
);

module.exports = router;