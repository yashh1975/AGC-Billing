import { IpcMain } from 'electron';
import { getDb } from '../database';
import { hashPassword, verifyPassword, generateSessionToken } from '../security';

let currentSession: { userId: number; token: string; username: string; displayName: string; role: string } | null = null;

export function registerAuthHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('auth:login', async (_event, username: string, password: string) => {
    try {
      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username) as any;
      
      if (!user) {
        return { success: false, error: 'Invalid username or password' };
      }

      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Update last login
      db.prepare('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?').run(user.id);

      // Create session
      const token = generateSessionToken();
      currentSession = {
        userId: user.id,
        token,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
      };

      // Log audit
      db.prepare('INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)')
        .run(user.id, 'login', 'user', user.id);

      return {
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            role: user.role,
          },
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:changePassword', async (_event, oldPassword: string, newPassword: string) => {
    try {
      if (!currentSession) {
        return { success: false, error: 'Not authenticated' };
      }

      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(currentSession.userId) as any;

      const valid = await verifyPassword(oldPassword, user.password_hash);
      if (!valid) {
        return { success: false, error: 'Current password is incorrect' };
      }

      const newHash = await hashPassword(newPassword);
      db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(newHash, currentSession.userId);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:checkSession', async () => {
    return {
      success: true,
      data: currentSession ? {
        user: {
          id: currentSession.userId,
          username: currentSession.username,
          displayName: currentSession.displayName,
          role: currentSession.role,
        },
      } : null,
    };
  });

  ipcMain.handle('auth:setupInitialUser', async (_event, data: { username: string; password: string; displayName: string }) => {
    try {
      const db = getDb();
      const existing = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      const hash = await hashPassword(data.password);

      if (existing.count > 0) {
        // If a user was already inserted in this setup wizard, update it with the current credentials
        const firstUser = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: number };
        db.prepare(
          'UPDATE users SET username = ?, password_hash = ?, display_name = ?, role = ? WHERE id = ?'
        ).run(data.username, hash, data.displayName, 'admin', firstUser.id);
        return { success: true, data: { id: firstUser.id } };
      }

      const result = db.prepare(
        'INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
      ).run(data.username, hash, data.displayName, 'admin');

      return { success: true, data: { id: result.lastInsertRowid } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:hasUsers', async () => {
    try {
      const db = getDb();
      const result = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      return { success: true, data: result.count > 0 };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}

export function getCurrentSession() {
  return currentSession;
}
