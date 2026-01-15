// Project management module
class ProjectManager {
  constructor() {
    this.currentProject = null;
    this.projects = [];
  }

  // Initialize projects
  async init() {
    await this.loadProjects();
  }

  // Load all projects
  async loadProjects() {
    this.projects = await db.getAll(CONFIG.STORES.PROJECTS);
    this.projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return this.projects;
  }

  // Create new project
  async createProject(name) {
    if (!name || !name.trim()) {
      throw new Error('Project name is required');
    }

    const trimmedName = name.trim();
    if (trimmedName.length > CONFIG.DEFAULTS.PROJECT_NAME_MAX_LENGTH) {
      throw new Error(`Project name must be less than ${CONFIG.DEFAULTS.PROJECT_NAME_MAX_LENGTH} characters`);
    }

    // Check for duplicate names
    const existing = this.projects.find(p => p.name.toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
      throw new Error('A project with this name already exists');
    }

    const project = {
      id: UTILS.uid('p'),
      name: trimmedName,
      description: '',
      createdAt: UTILS.nowISO(),
      updatedAt: UTILS.nowISO(),
      createdBy: auth.getCurrentUser()?.username || 'guest',
      fileCount: 0,
      lastActivity: UTILS.nowISO()
    };

    await db.put(CONFIG.STORES.PROJECTS, project);
    await this.loadProjects();

    UTILS.showToast(`Project "${trimmedName}" created successfully`, 'success');
    return project;
  }

  // Update project
  async updateProject(id, updates) {
    const project = await db.get(CONFIG.STORES.PROJECTS, id);
    if (!project) {
      throw new Error('Project not found');
    }

    const updatedProject = {
      ...project,
      ...updates,
      updatedAt: UTILS.nowISO()
    };

    // Validate name if it's being updated
    if (updates.name) {
      const trimmedName = updates.name.trim();
      if (trimmedName.length > CONFIG.DEFAULTS.PROJECT_NAME_MAX_LENGTH) {
        throw new Error(`Project name must be less than ${CONFIG.DEFAULTS.PROJECT_NAME_MAX_LENGTH} characters`);
      }

      // Check for duplicate names (excluding current project)
      const existing = this.projects.find(p => 
        p.id !== id && p.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (existing) {
        throw new Error('A project with this name already exists');
      }

      updatedProject.name = trimmedName;
    }

    await db.put(CONFIG.STORES.PROJECTS, updatedProject);
    await this.loadProjects();

    UTILS.showToast('Project updated successfully', 'success');
    return updatedProject;
  }

  // Delete project
  async deleteProject(id) {
    const project = await db.get(CONFIG.STORES.PROJECTS, id);
    if (!project) {
      throw new Error('Project not found');
    }

    // Check if project has files
    const files = await db.getFilesByProject(id);
    if (files.length > 0) {
      const confirmed = confirm(
        `This project contains ${files.length} file(s). Deleting the project will also delete all associated files. Are you sure?`
      );
      if (!confirmed) {
        return false;
      }

      // Delete all files in the project
      const fileIds = files.map(f => f.id);
      await db.deleteMultiple(CONFIG.STORES.FILES, fileIds);
    }

    // Delete project
    await db.delete(CONFIG.STORES.PROJECTS, id);
    await this.loadProjects();

    // Clear current project if it was deleted
    if (this.currentProject?.id === id) {
      this.currentProject = null;
    }

    UTILS.showToast(`Project "${project.name}" deleted successfully`, 'success');
    return true;
  }

  // Get project by ID
  async getProject(id) {
    return await db.get(CONFIG.STORES.PROJECTS, id);
  }

  // Get all projects
  getProjects() {
    return this.projects;
  }

  // Set current project
  setCurrentProject(project) {
    this.currentProject = project;
    if (project) {
      localStorage.setItem('strataCurrentProject', project.id);
    } else {
      localStorage.removeItem('strataCurrentProject');
    }
  }

  // Get current project
  getCurrentProject() {
    return this.currentProject;
  }

  // Load current project from localStorage
  async loadCurrentProject() {
    const savedProjectId = localStorage.getItem('strataCurrentProject');
    if (savedProjectId) {
      const project = await this.getProject(savedProjectId);
      if (project) {
        this.currentProject = project;
        return project;
      } else {
        localStorage.removeItem('strataCurrentProject');
      }
    }
    return null;
  }

  // Update project file count
  async updateProjectFileCount(projectId) {
    const project = await db.get(CONFIG.STORES.PROJECTS, projectId);
    if (!project) return;

    const files = await db.getFilesByProject(projectId);
    project.fileCount = files.length;
    project.lastActivity = UTILS.nowISO();

    await db.put(CONFIG.STORES.PROJECTS, project);
    await this.loadProjects();
  }

  // Get project statistics
  async getProjectStats(projectId) {
    const files = await db.getFilesByProject(projectId);
    
    const totalSize = files.reduce((sum, file) => {
      return sum + (file.files?.reduce((fileSum, f) => fileSum + f.size, 0) || 0);
    }, 0);

    const locations = new Set();
    const borings = new Set();
    const dateRange = { earliest: null, latest: null };

    files.forEach(file => {
      // Count unique locations
      if (file.metadata?.coordinates) {
        const coord = `${file.metadata.coordinates.lat},${file.metadata.coordinates.lng}`;
        locations.add(coord);
      }

      // Count unique borings
      if (file.metadata?.boreId) {
        borings.add(file.metadata.boreId);
      }

      // Track date range
      if (file.metadata?.date) {
        const date = new Date(file.metadata.date);
        if (!dateRange.earliest || date < dateRange.earliest) {
          dateRange.earliest = date;
        }
        if (!dateRange.latest || date > dateRange.latest) {
          dateRange.latest = date;
        }
      }
    });

    return {
      fileCount: files.length,
      totalSize,
      uniqueLocations: locations.size,
      uniqueBorings: borings.size,
      dateRange: {
        earliest: dateRange.earliest?.toISOString(),
        latest: dateRange.latest?.toISOString()
      }
    };
  }

  // Export project data
  async exportProject(projectId) {
    const project = await db.get(CONFIG.STORES.PROJECTS, projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const files = await db.getFilesByProject(projectId);
    const stats = await this.getProjectStats(projectId);

    return {
      project,
      files,
      stats,
      exportDate: UTILS.nowISO()
    };
  }

  // Search projects
  searchProjects(query) {
    if (!query) return this.projects;
    
    const searchTerm = query.toLowerCase();
    return this.projects.filter(project => 
      project.name.toLowerCase().includes(searchTerm) ||
      (project.description && project.description.toLowerCase().includes(searchTerm))
    );
  }

  // Get recent projects
  getRecentProjects(limit = 5) {
    return this.projects
      .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
      .slice(0, limit);
  }
}

// Create global project manager
window.projectManager = new ProjectManager();