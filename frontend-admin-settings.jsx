import React, { useState, useEffect } from 'react';
import api from './api'; // Your axios instance

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminSettings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [newSetting, setNewSetting] = useState({ key: '', value: '', description: '', category: 'general', isPublic: false });

  useEffect(() => {
    fetchSettings();
  }, [selectedCategory]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/settings/category/${selectedCategory}`);
      setSettings(response.data);
    } catch (err) {
      setError('Failed to load settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      await api.put(`/settings/${key}`, { value });
      fetchSettings();
    } catch (err) {
      console.error('Failed to update setting:', err);
      alert('Failed to update setting');
    }
  };

  const createSetting = async () => {
    try {
      await api.post('/api/settings', newSetting);
      setNewSetting({ key: '', value: '', description: '', category: selectedCategory, isPublic: false });
      fetchSettings();
    } catch (err) {
      console.error('Failed to create setting:', err);
      alert('Failed to create setting');
    }
  };

  const deleteSetting = async (key) => {
    if (!confirm('Are you sure you want to delete this setting?')) return;

    try {
      await api.delete(`/api/settings/${key}`);
      fetchSettings();
    } catch (err) {
      console.error('Failed to delete setting:', err);
      alert('Failed to delete setting');
    }
  };

  const categories = ['general', 'security', 'email', 'payment', 'maintenance', 'features'];

  if (loading) return <div>Loading settings...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin - Settings</h1>

      {/* Category Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize ${
                selectedCategory === category
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Add New Setting */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Add New Setting</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Setting Key"
            value={newSetting.key}
            onChange={(e) => setNewSetting({...newSetting, key: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Value"
            value={newSetting.value}
            onChange={(e) => setNewSetting({...newSetting, value: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Description"
            value={newSetting.description}
            onChange={(e) => setNewSetting({...newSetting, description: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={newSetting.category}
            onChange={(e) => setNewSetting({...newSetting, category: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
            ))}
          </select>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={newSetting.isPublic}
              onChange={(e) => setNewSetting({...newSetting, isPublic: e.target.checked})}
              className="mr-2"
            />
            Public
          </label>
          <button
            onClick={createSetting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Setting
          </button>
        </div>
      </div>

      {/* Settings List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Key
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Public
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {settings.map((setting) => (
              <tr key={setting._id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium">
                  {setting.key}
                </td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    value={setting.value}
                    onChange={(e) => {
                      const updatedSettings = settings.map(s =>
                        s._id === setting._id ? {...s, value: e.target.value} : s
                      );
                      setSettings(updatedSettings);
                    }}
                    onBlur={() => updateSetting(setting.key, setting.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4">
                  {setting.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {setting.isPublic ? '✅' : '❌'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => deleteSetting(setting.key)}
                    className="text-red-600 hover:text-red-900"
                  >
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminSettings;