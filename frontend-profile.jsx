import React, { useState, useEffect } from 'react';
import api from './api'; // Your axios instance

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const calculateProfileCompletion = (user) => {
  const fields = [
    user.name,
    user.email,
    user.phone,
    user.location,
    user.skills,
    user.experience,
  ];

  const filled = fields.filter(
    (field) => field && field.toString().trim() !== ""
  ).length;

  return Math.round((filled / fields.length) * 100);
};

const ProfilePage = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    skills: [],
    experience: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loadingCV, setLoadingCV] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/profile');
      setForm(response.data);
    } catch (err) {
      setError('Failed to load profile');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.put('/api/profile', form);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoadingCV(true);
    const formData = new FormData();
    formData.append('cv', file);

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_URL}/api/users/parse-cv`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      // 🔥 AUTO-FILL FORM
      setForm((prev) => ({
        ...prev,
        name: data.name || prev.name,
        email: data.email || prev.email,
        phone: data.phone || prev.phone,
        skills: data.skills?.join(', ') || prev.skills,
        experience: data.experience || prev.experience,
      }));
    } catch (err) {
      setError('Failed to parse CV');
    } finally {
      setLoadingCV(false);
    }
  };

  const completion = calculateProfileCompletion(form);

  const missingFields = [];
  if (!form.phone) missingFields.push("Phone");
  if (!form.location) missingFields.push("Location");
  if (!form.skills || form.skills.length === 0) missingFields.push("Skills");

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Profile Completion</span>
          <span className="text-sm text-gray-600">{completion}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{ width: `${completion}%` }}
          ></div>
        </div>
        {missingFields.length > 0 && (
          <p className="text-xs text-red-500 mt-2">
            Missing: {missingFields.join(", ")}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input
            type="text"
            name="location"
            value={form.location}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Skills</label>
          <input
            type="text"
            name="skills"
            value={form.skills.join(', ')}
            onChange={(e) => setForm(prev => ({ ...prev, skills: e.target.value.split(', ') }))}
            className="w-full p-2 border rounded"
            placeholder="JavaScript, React, Node.js"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Experience</label>
          <textarea
            name="experience"
            value={form.experience}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            rows="4"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Upload CV (Auto-fill)</label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleCVUpload}
            className="w-full p-2 border rounded"
          />
          {loadingCV && <p className="text-blue-500 mt-1">🔍 Extracting CV data...</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Update Profile'}
        </button>

        {error && <p className="text-red-500 mt-2">{error}</p>}
        {success && <p className="text-green-500 mt-2">Profile updated successfully!</p>}
      </form>
    </div>
  );
};

export default ProfilePage;