// Authentication module
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.isGuest = false;
    this.hashProvider = null;
  }

  // Initialize authentication
  async init() {
    // Determine which hash provider to use
    if (typeof window.bcryptjs !== 'undefined') {
      this.hashProvider = window.bcryptjs;
      console.log('Using bcryptjs for password hashing');
    } else {
      this.hashProvider = window.SimpleHash;
      console.log('Using SimpleHash fallback for password hashing');
    }

    // Check if user was previously logged in
    const savedUser = localStorage.getItem('strataUser');
    const isGuest = localStorage.getItem('strataGuest') === 'true';
    
    if (isGuest) {
      this.isGuest = true;
      this.currentUser = { username: 'guest', isGuest: true };
      return true;
    }
    
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
        return true;
      } catch (e) {
        localStorage.removeItem('strataUser');
      }
    }
    
    return false;
  }

  // Register new user
  async register(username, password) {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    if (username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Check if user already exists
    const existingUser = await db.get(CONFIG.STORES.USERS, username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Hash password
    const hashedPassword = await this.hashProvider.hash(password, 10);

    // Create user
    const user = {
      username,
      password: hashedPassword,
      createdAt: UTILS.nowISO(),
      lastLogin: UTILS.nowISO()
    };

    await db.put(CONFIG.STORES.USERS, user);

    // Set current user (without password)
    this.currentUser = {
      username: user.username,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };

    // Save to localStorage
    localStorage.setItem('strataUser', JSON.stringify(this.currentUser));
    localStorage.removeItem('strataGuest');
    this.isGuest = false;

    return this.currentUser;
  }

  // Login user
  async login(username, password) {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    // Get user from database
    const user = await db.get(CONFIG.STORES.USERS, username);
    if (!user) {
      throw new Error('Invalid username or password');
    }

    // Verify password
    const isValid = await this.hashProvider.compare(password, user.password);
    if (!isValid) {
      throw new Error('Invalid username or password');
    }

    // Update last login
    user.lastLogin = UTILS.nowISO();
    await db.put(CONFIG.STORES.USERS, user);

    // Set current user (without password)
    this.currentUser = {
      username: user.username,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };

    // Save to localStorage
    localStorage.setItem('strataUser', JSON.stringify(this.currentUser));
    localStorage.removeItem('strataGuest');
    this.isGuest = false;

    return this.currentUser;
  }

  // Continue as guest
  async loginAsGuest() {
    this.currentUser = {
      username: 'guest',
      isGuest: true,
      createdAt: UTILS.nowISO(),
      lastLogin: UTILS.nowISO()
    };

    localStorage.setItem('strataGuest', 'true');
    localStorage.removeItem('strataUser');
    this.isGuest = true;

    return this.currentUser;
  }

  // Logout
  logout() {
    this.currentUser = null;
    this.isGuest = false;
    localStorage.removeItem('strataUser');
    localStorage.removeItem('strataGuest');
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.currentUser !== null;
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if current session is guest
  isGuestSession() {
    return this.isGuest;
  }

  // Change password (only for registered users)
  async changePassword(currentPassword, newPassword) {
    if (this.isGuest) {
      throw new Error('Cannot change password for guest users');
    }

    if (!currentPassword || !newPassword) {
      throw new Error('Current and new passwords are required');
    }

    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters');
    }

    // Get current user from database
    const user = await db.get(CONFIG.STORES.USERS, this.currentUser.username);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValid = await this.hashProvider.compare(currentPassword, user.password);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await this.hashProvider.hash(newPassword, 10);

    // Update user
    user.password = hashedPassword;
    user.lastPasswordChange = UTILS.nowISO();
    await db.put(CONFIG.STORES.USERS, user);

    return true;
  }

  // Delete account (only for registered users)
  async deleteAccount(password) {
    if (this.isGuest) {
      throw new Error('Cannot delete guest account');
    }

    if (!password) {
      throw new Error('Password is required to delete account');
    }

    // Get current user from database
    const user = await db.get(CONFIG.STORES.USERS, this.currentUser.username);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify password
    const isValid = await this.hashProvider.compare(password, user.password);
    if (!isValid) {
      throw new Error('Password is incorrect');
    }

    // Delete user
    await db.delete(CONFIG.STORES.USERS, this.currentUser.username);

    // Logout
    this.logout();

    return true;
  }

  // Get user statistics
  async getUserStats() {
    if (!this.isAuthenticated()) {
      return null;
    }

    const files = await db.queryFiles();
    const projects = await db.getAll(CONFIG.STORES.PROJECTS);

    const userFiles = files.filter(f => f.createdBy === this.currentUser.username || this.isGuest);
    const userProjects = projects.filter(p => p.createdBy === this.currentUser.username || this.isGuest);

    const totalSize = userFiles.reduce((sum, file) => {
      return sum + (file.files?.reduce((fileSum, f) => fileSum + f.size, 0) || 0);
    }, 0);

    return {
      projects: userProjects.length,
      files: userFiles.length,
      totalSize,
      joinDate: this.currentUser.createdAt,
      lastLogin: this.currentUser.lastLogin
    };
  }
}

// Create global auth manager
window.auth = new AuthManager();