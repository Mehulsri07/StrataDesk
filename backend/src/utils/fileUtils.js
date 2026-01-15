const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { logger } = require('./logger');

// Allowed file types
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'text/plain',
  'text/csv'
]);

// Image types for thumbnail generation
const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif'
]);

// Generate unique filename
function generateUniqueFilename(originalName, userId, projectId) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, '_');
  
  return `${userId}_${projectId}_${timestamp}_${random}_${baseName}${ext}`;
}

// Calculate file hash
async function calculateFileHash(filePath) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  } catch (error) {
    logger.error('Failed to calculate file hash:', { filePath, error: error.message });
    throw error;
  }
}

// Validate file type
function isAllowedFileType(mimeType) {
  return ALLOWED_MIME_TYPES.has(mimeType);
}

// Validate file size
function isValidFileSize(size, maxSize = null) {
  const limit = maxSize || parseInt(process.env.MAX_FILE_SIZE) || 52428800; // 50MB default
  return size <= limit;
}

// Create thumbnail for images
async function createThumbnail(inputPath, outputPath, maxWidth = 300, maxHeight = 300) {
  try {
    await sharp(inputPath)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
    
    logger.info('Thumbnail created:', { inputPath, outputPath });
    return outputPath;
  } catch (error) {
    logger.error('Failed to create thumbnail:', { inputPath, error: error.message });
    throw error;
  }
}

// Get file info
async function getFileInfo(filePath) {
  try {
    const stats = await fs.stat(filePath);
    const hash = await calculateFileHash(filePath);
    
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      hash
    };
  } catch (error) {
    logger.error('Failed to get file info:', { filePath, error: error.message });
    throw error;
  }
}

// Ensure directory exists
async function ensureDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return true;
  } catch (error) {
    logger.error('Failed to create directory:', { dirPath, error: error.message });
    throw error;
  }
}

// Delete file safely
async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
    logger.info('File deleted:', { filePath });
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.warn('File not found for deletion:', { filePath });
      return true; // File already doesn't exist
    }
    logger.error('Failed to delete file:', { filePath, error: error.message });
    throw error;
  }
}

// Move file
async function moveFile(sourcePath, destinationPath) {
  try {
    await ensureDirectory(path.dirname(destinationPath));
    await fs.rename(sourcePath, destinationPath);
    logger.info('File moved:', { sourcePath, destinationPath });
    return destinationPath;
  } catch (error) {
    logger.error('Failed to move file:', { sourcePath, destinationPath, error: error.message });
    throw error;
  }
}

// Copy file
async function copyFile(sourcePath, destinationPath) {
  try {
    await ensureDirectory(path.dirname(destinationPath));
    await fs.copyFile(sourcePath, destinationPath);
    logger.info('File copied:', { sourcePath, destinationPath });
    return destinationPath;
  } catch (error) {
    logger.error('Failed to copy file:', { sourcePath, destinationPath, error: error.message });
    throw error;
  }
}

// Get file extension from mime type
function getExtensionFromMimeType(mimeType) {
  const extensions = {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-excel': '.xls',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'text/plain': '.txt',
    'text/csv': '.csv'
  };
  
  return extensions[mimeType] || '';
}

// Sanitize filename
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Clean up old files (for maintenance)
async function cleanupOldFiles(directory, maxAgeMs = 30 * 24 * 60 * 60 * 1000) { // 30 days default
  try {
    const files = await fs.readdir(directory);
    const now = Date.now();
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtime.getTime() > maxAgeMs) {
        await deleteFile(filePath);
        deletedCount++;
      }
    }
    
    logger.info('Cleanup completed:', { directory, deletedCount });
    return deletedCount;
  } catch (error) {
    logger.error('Cleanup failed:', { directory, error: error.message });
    throw error;
  }
}

module.exports = {
  generateUniqueFilename,
  calculateFileHash,
  isAllowedFileType,
  isValidFileSize,
  createThumbnail,
  getFileInfo,
  ensureDirectory,
  deleteFile,
  moveFile,
  copyFile,
  getExtensionFromMimeType,
  sanitizeFilename,
  formatFileSize,
  cleanupOldFiles,
  IMAGE_TYPES,
  ALLOWED_MIME_TYPES
};