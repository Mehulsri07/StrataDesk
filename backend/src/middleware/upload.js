const multer = require('multer');
const path = require('path');
const { generateUniqueFilename, isAllowedFileType, isValidFileSize } = require('../utils/fileUtils');
const { logger } = require('../utils/logger');

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    
    // Create subdirectory based on user and project
    const userDir = req.user?.id || 'anonymous';
    const projectDir = req.body.project_id || 'default';
    const fullPath = path.join(uploadDir, userDir, projectDir);
    
    // Store the path for later use
    req.uploadPath = fullPath;
    
    cb(null, fullPath);
  },
  
  filename: function (req, file, cb) {
    try {
      const uniqueName = generateUniqueFilename(
        file.originalname,
        req.user?.id || 'anonymous',
        req.body.project_id || 'default'
      );
      
      logger.info('File upload started:', {
        originalName: file.originalname,
        uniqueName,
        userId: req.user?.id,
        projectId: req.body.project_id
      });
      
      cb(null, uniqueName);
    } catch (error) {
      logger.error('Filename generation failed:', error);
      cb(error);
    }
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  try {
    // Check file type
    if (!isAllowedFileType(file.mimetype)) {
      const error = new Error(`File type not allowed: ${file.mimetype}`);
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }
    
    logger.debug('File type validated:', {
      filename: file.originalname,
      mimetype: file.mimetype
    });
    
    cb(null, true);
  } catch (error) {
    logger.error('File filter error:', error);
    cb(error, false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800, // 50MB default
    files: 10, // Maximum 10 files per request
    fields: 20 // Maximum 20 form fields
  }
});

// Middleware for single file upload
const uploadSingle = (fieldName = 'file') => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        logger.error('Single file upload error:', {
          error: err.message,
          code: err.code,
          field: fieldName,
          userId: req.user?.id
        });
        
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: 'File too large',
            message: `Maximum file size is ${Math.round((parseInt(process.env.MAX_FILE_SIZE) || 52428800) / 1024 / 1024)}MB`
          });
        }
        
        if (err.code === 'INVALID_FILE_TYPE') {
          return res.status(400).json({
            error: 'Invalid file type',
            message: err.message
          });
        }
        
        return res.status(400).json({
          error: 'File upload failed',
          message: err.message
        });
      }
      
      next();
    });
  };
};

// Middleware for multiple file upload
const uploadMultiple = (fieldName = 'files', maxCount = 10) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        logger.error('Multiple file upload error:', {
          error: err.message,
          code: err.code,
          field: fieldName,
          maxCount,
          userId: req.user?.id
        });
        
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: 'File too large',
            message: `Maximum file size is ${Math.round((parseInt(process.env.MAX_FILE_SIZE) || 52428800) / 1024 / 1024)}MB`
          });
        }
        
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            error: 'Too many files',
            message: `Maximum ${maxCount} files allowed`
          });
        }
        
        if (err.code === 'INVALID_FILE_TYPE') {
          return res.status(400).json({
            error: 'Invalid file type',
            message: err.message
          });
        }
        
        return res.status(400).json({
          error: 'File upload failed',
          message: err.message
        });
      }
      
      // Log successful uploads
      if (req.files && req.files.length > 0) {
        logger.info('Multiple files uploaded:', {
          count: req.files.length,
          files: req.files.map(f => ({
            originalName: f.originalname,
            filename: f.filename,
            size: f.size
          })),
          userId: req.user?.id
        });
      }
      
      next();
    });
  };
};

// Middleware for mixed form data (files + fields)
const uploadFields = (fields) => {
  return (req, res, next) => {
    upload.fields(fields)(req, res, (err) => {
      if (err) {
        logger.error('Field upload error:', {
          error: err.message,
          code: err.code,
          fields,
          userId: req.user?.id
        });
        
        return res.status(400).json({
          error: 'Upload failed',
          message: err.message
        });
      }
      
      next();
    });
  };
};

// Cleanup middleware (for failed uploads)
const cleanupOnError = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // If response is an error and we have uploaded files, clean them up
    if (res.statusCode >= 400 && req.files) {
      const filesToClean = Array.isArray(req.files) ? req.files : 
                          req.file ? [req.file] : [];
      
      filesToClean.forEach(file => {
        if (file.path) {
          const fs = require('fs');
          fs.unlink(file.path, (err) => {
            if (err) {
              logger.error('Failed to cleanup uploaded file:', {
                path: file.path,
                error: err.message
              });
            } else {
              logger.info('Cleaned up uploaded file:', { path: file.path });
            }
          });
        }
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  cleanupOnError
};