import React, { useState, useEffect } from 'react';
import api from '../api';
import '../styles/AdminSettings.css';

/**
 * ✅ FIXED: AdminSettings Component
 * - Uses PUT method instead of POST for updates
 * - Proper error handling and loading states
 * - Fetches and updates settings correctly
 */
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
      
      // ✅ Use GET to fetch settings
      const response = await api.get('/settings');
      console.log('✅ Settings fetched:', response.data);
      
      // Store original settings for comparison
      const settingsData = response.data.settings || response.data.data || response.data;
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
      
      // ✅ FIXED: Use PUT instead of POST for updates
      const response = await api.put('/settings', settings);
      
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
      emailNotificationsEnabled: {
        label: 'Email Notifications',
        type: 'checkbox',
        description: 'Send email notifications to users'
      },
      maintenanceMode: {
        label: 'Maintenance Mode',
        type: 'checkbox',
        description: 'Enable maintenance mode (disables all features except admin)'
      }
    },
    'M-Pesa Configuration': {
      mpesaConsumerKey: {
        label: 'M-Pesa Consumer Key',
        type: 'text',
        description: 'M-Pesa API consumer key'
      },
      mpesaConsumerSecret: {
        label: 'M-Pesa Consumer Secret',
        type: 'password',
        description: 'M-Pesa API consumer secret'
      },
      mpesaShortcode: {
        label: 'M-Pesa Shortcode',
        type: 'text',
        description: 'M-Pesa merchant shortcode'
      },
      mpesaPasskey: {
        label: 'M-Pesa Passkey',
        type: 'password',
        description: 'M-Pesa merchant passkey'
      }
    }
  };

  return (
    <div className="admin-settings-container">
      <div className="settings-header">
        <h1>⚙️ Admin Settings</h1>
        <p>Configure system-wide settings and feature flags</p>
      </div>

      {error && (
        <div className="error-banner">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {successMessage && (
        <div className="success-banner">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')}>✕</button>
        </div>
      )}

      <div className="settings-content">
        {Object.entries(settingCategories).map(([category, fields]) => (
          <div key={category} className="settings-section">
            <div className="section-header">
              <h2>{category}</h2>
            </div>

            <div className="settings-fields">
              {Object.entries(fields).map(([key, config]) => (
                <div key={key} className="field-group">
                  <label htmlFor={key} className="field-label">
                    {config.label}
                    {modifiedFields.has(key) && <span className="modified-indicator">*</span>}
                  </label>

                  {config.type === 'checkbox' ? (
                    <input
                      id={key}
                      type="checkbox"
                      checked={settings[key] || false}
                      onChange={(e) => handleSettingChange(key, e.target.checked)}
                      className="field-input"
                    />
                  ) : config.type === 'textarea' ? (
                    <textarea
                      id={key}
                      value={settings[key] || ''}
                      onChange={(e) => handleSettingChange(key, e.target.value)}
                      className="field-input"
                      rows="4"
                      placeholder={config.description}
                    />
                  ) : (
                    <input
                      id={key}
                      type={config.type}
                      value={settings[key] || ''}
                      onChange={(e) => handleSettingChange(key, e.target.value)}
                      className="field-input"
                      placeholder={config.description}
                    />
                  )}

                  <p className="field-description">{config.description}</p>

                  {lastSavedTimes[key] && (
                    <p className="field-saved-time">
                      Last saved: {lastSavedTimes[key].toLocaleTimeString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="settings-actions">
        <button
          onClick={handleSaveSettings}
          disabled={saving || !hasUnsavedChanges}
          className="btn btn-primary"
        >
          {saving ? '💾 Saving...' : '💾 Save Changes'}
        </button>

        <button
          onClick={handleDiscardChanges}
          disabled={!hasUnsavedChanges}
          className="btn btn-secondary"
        >
          ↩️ Discard Changes
        </button>

        <button
          onClick={fetchSettings}
          disabled={loading || saving}
          className="btn btn-outline"
        >
          🔄 Refresh
        </button>
      </div>

      {hasUnsavedChanges && (
        <div className="unsaved-changes-warning">
          ⚠️ You have unsaved changes. Click "Save Changes" to apply them.
        </div>
      )}
    </div>
  );
}

export default AdminSettings;
