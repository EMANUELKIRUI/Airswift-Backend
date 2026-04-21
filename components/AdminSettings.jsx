import React, { useState, useEffect } from 'react';
import api from '../api';
import '../styles/AdminSettings.css';

function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [originalSettings, setOriginalSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [modifiedFields, setModifiedFields] = useState(new Set());
  const [lastSavedTimes, setLastSavedTimes] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📥 Fetching admin settings...');
      
      const response = await api.get('/settings');
      console.log('✅ Settings fetched:', response.data);
      
      // Store original settings for comparison
      const settingsData = response.data.settings || response.data;
      setSettings(settingsData);
      setOriginalSettings(JSON.parse(JSON.stringify(settingsData)));
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('❌ Error fetching settings:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch settings';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));

    // Track modified field
    const newModified = new Set(modifiedFields);
    if (JSON.stringify(value) === JSON.stringify(originalSettings[key])) {
      newModified.delete(key);
    } else {
      newModified.add(key);
    }
    setModifiedFields(newModified);
    setHasUnsavedChanges(newModified.size > 0);

    // Clear success message when user makes changes
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      console.log('💾 Saving settings:', settings);
      
      const response = await api.post('/settings', settings);
      
      console.log('✅ Settings saved:', response.data);
      
      // Update original settings
      setOriginalSettings(JSON.parse(JSON.stringify(settings)));
      
      // Clear modified fields
      const now = new Date();
      const newLastSaved = { ...lastSavedTimes };
      
      // Track which fields were saved
      modifiedFields.forEach(field => {
        newLastSaved[field] = now;
      });
      
      setLastSavedTimes(newLastSaved);
      setModifiedFields(new Set());
      setHasUnsavedChanges(false);
      
      setSuccessMessage('✅ All settings saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('❌ Error saving settings:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to save settings';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    if (hasUnsavedChanges) {
      const confirmDiscard = window.confirm(
        'Are you sure you want to discard all unsaved changes?'
      );
      
      if (!confirmDiscard) return;
    }

    setSettings(JSON.parse(JSON.stringify(originalSettings)));
    setModifiedFields(new Set());
    setHasUnsavedChanges(false);
    setSuccessMessage('');
    setError('');
  };

  if (loading) {
    return (
      <div className="admin-settings-container loading">
        <div className="spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  const settingCategories = {
    'System': {
      siteName: {
        label: 'Site Name',
        type: 'text',
        description: 'The name of your application'
      },
      siteDescription: {
        label: 'Site Description',
        type: 'textarea',
        description: 'Brief description of your application'
      },
      siteLogo: {
        label: 'Site Logo URL',
        type: 'text',
        description: 'URL to your site logo'
      },
      businessEmail: {
        label: 'Business Email',
        type: 'email',
        description: 'Primary business email for contact'
      }
    },
    'Features': {
      enableNotifications: {
        label: 'Enable Notifications',
        type: 'checkbox',
        description: 'Allow system-wide notifications'
      },
      enableEmailAlerts: {
        label: 'Enable Email Alerts',
        type: 'checkbox',
        description: 'Send email notifications to admins'
      },
      enableApplications: {
        label: 'Enable Job Applications',
        type: 'checkbox',
        description: 'Allow users to apply for jobs'
      },
      autoApproveApplications: {
        label: 'Auto-Approve Applications',
        type: 'checkbox',
        description: 'Automatically approve new applications'
      }
    },
    'Security': {
      maxLoginAttempts: {
        label: 'Max Login Attempts',
        type: 'number',
        description: 'Maximum failed login attempts before lockout'
      },
      sessionTimeout: {
        label: 'Session Timeout (minutes)',
        type: 'number',
        description: 'How long before user sessions expire'
      },
      requireEmailVerification: {
        label: 'Require Email Verification',
        type: 'checkbox',
        description: 'Require users to verify email before access'
      },
      enableTwoFactor: {
        label: 'Enable Two-Factor Authentication',
        type: 'checkbox',
        description: 'Require 2FA for admin accounts'
      }
    },
    'Maintenance': {
      maintenanceMode: {
        label: 'Maintenance Mode',
        type: 'checkbox',
        description: 'Enable maintenance mode (disable user access)'
      },
      maintenanceMessage: {
        label: 'Maintenance Message',
        type: 'textarea',
        description: 'Message to show users during maintenance'
      },
      enableDebugMode: {
        label: 'Enable Debug Mode',
        type: 'checkbox',
        description: 'Enable detailed error logging'
      },
      backupFrequency: {
        label: 'Backup Frequency (hours)',
        type: 'number',
        description: 'How often to backup data'
      }
    }
  };

  const renderSettingField = (key, config) => {
    const value = settings[key] !== undefined ? settings[key] : '';
    const isModified = modifiedFields.has(key);
    const lastSaved = lastSavedTimes[key];

    return (
      <div key={key} className={`setting-field ${isModified ? 'modified' : ''}`}>
        <div className="field-header">
          <label htmlFor={key}>{config.label}</label>
          {isModified && <span className="modified-badge">●</span>}
          {lastSaved && (
            <span className="last-saved-badge">
              💾 {new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <p className="field-description">{config.description}</p>
        
        {config.type === 'textarea' && (
          <textarea
            id={key}
            value={value || ''}
            onChange={(e) => handleSettingChange(key, e.target.value)}
            rows={4}
            className="setting-input setting-textarea"
            placeholder={`Enter ${config.label.toLowerCase()}`}
          />
        )}
        
        {config.type === 'checkbox' && (
          <div className="checkbox-wrapper">
            <input
              id={key}
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => handleSettingChange(key, e.target.checked)}
              className="setting-input setting-checkbox"
            />
            <label htmlFor={key} className="checkbox-label">
              {value === true || value === 'true' ? '✅ Enabled' : '⭕ Disabled'}
            </label>
          </div>
        )}
        
        {config.type === 'number' && (
          <input
            id={key}
            type="number"
            value={value || 0}
            onChange={(e) => handleSettingChange(key, parseInt(e.target.value) || 0)}
            className="setting-input setting-number"
            placeholder={`Enter ${config.label.toLowerCase()}`}
          />
        )}
        
        {!['textarea', 'checkbox', 'number'].includes(config.type) && (
          <input
            id={key}
            type={config.type}
            value={value || ''}
            onChange={(e) => handleSettingChange(key, e.target.value)}
            className="setting-input"
            placeholder={`Enter ${config.label.toLowerCase()}`}
          />
        )}
      </div>
    );
  };

  return (
    <div className="admin-settings-container">
      <div className="settings-header">
        <h1>⚙️ Admin Settings</h1>
        <p className="settings-subtitle">Manage system configuration and preferences</p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="status-message error-message">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}
      {successMessage && (
        <div className="status-message success-message">
          <span>{successMessage}</span>
        </div>
      )}

      {/* Modified Fields Indicator */}
      {hasUnsavedChanges && (
        <div className="unsaved-indicator">
          <span>🔔 You have {modifiedFields.size} unsaved change{modifiedFields.size !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Settings Categories */}
      <div className="settings-content">
        {Object.entries(settingCategories).map(([categoryName, fields]) => (
          <div key={categoryName} className="settings-category">
            <div className="category-header">
              <h2>{categoryName}</h2>
              <span className="category-count">
                {Object.keys(fields).filter(f => modifiedFields.has(f)).length} modified
              </span>
            </div>
            
            <div className="settings-grid">
              {Object.entries(fields).map(([key, config]) =>
                renderSettingField(key, config)
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="settings-footer">
        <div className="footer-info">
          {hasUnsavedChanges ? (
            <span className="unsaved-text">⚠️ You have unsaved changes. Click Save to apply them.</span>
          ) : (
            <span className="saved-text">✅ All settings saved</span>
          )}
        </div>

        <div className="action-buttons">
          <button
            className="btn btn-discard"
            onClick={handleDiscardChanges}
            disabled={!hasUnsavedChanges || saving}
          >
            🔄 Discard Changes
          </button>
          <button
            className="btn btn-save"
            onClick={handleSaveSettings}
            disabled={!hasUnsavedChanges || saving}
          >
            {saving ? '💾 Saving...' : '💾 Save All Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminSettings;
