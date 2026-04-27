import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import UserDashboardLayout from '../../components/UserDashboardLayout';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const JobSeekerSettings = () => {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    skills: [],
    experience: [],
    education: [],
    cv: null,
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'user') {
      router.push('/unauthorized');
      return;
    }
    fetchProfile();
  }, [user, authLoading, router]);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/profile');
      if (response.data.success) {
        setProfile(response.data.profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await api.put('/profile', profile);
      if (response.data.success) {
        toast.success('Profile updated successfully!');
        fetchProfile(); // Refresh data
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setSaving(true);

    try {
      const response = await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (response.data.success) {
        toast.success('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleCVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF or Word document');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('cv', file);

    setSaving(true);

    try {
      const response = await api.post('/profile/cv-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success('CV uploaded successfully!');
        fetchProfile(); // Refresh profile data
      }
    } catch (error) {
      console.error('Error uploading CV:', error);
      toast.error('Failed to upload CV');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = (skill) => {
    if (skill && !profile.skills.includes(skill)) {
      setProfile(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
    }
  };

  const removeSkill = (skillToRemove) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const calculateProfileCompletion = () => {
    const fields = ['name', 'phone', 'location', 'bio'];
    const completedFields = fields.filter(field => profile[field]?.trim()).length;
    const hasSkills = profile.skills.length > 0;
    const hasEducation = profile.education.length > 0;
    const hasCV = profile.cv;

    let completion = (completedFields / fields.length) * 40; // 40% for basic info
    if (hasSkills) completion += 20; // 20% for skills
    if (hasEducation) completion += 20; // 20% for education
    if (hasCV) completion += 20; // 20% for CV

    return Math.round(completion);
  };

  if (authLoading || loading) {
    return (
      <UserDashboardLayout>
        <div className="loading-spinner">Loading settings...</div>
      </UserDashboardLayout>
    );
  }

  const completionPercentage = calculateProfileCompletion();

  return (
    <UserDashboardLayout>
      <div className="job-seeker-settings">
        {/* Header */}
        <div className="settings-header">
          <h1>⚙️ Settings</h1>
          <p>Manage your profile and account settings</p>

          <div className="profile-completion-card">
            <div className="completion-header">
              <h3>Profile Completion</h3>
              <span className="completion-percentage">{completionPercentage}%</span>
            </div>
            <div className="completion-bar">
              <div
                className="completion-fill"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
            <p className="completion-tip">
              Complete your profile to increase your chances of getting hired!
            </p>
          </div>
        </div>

        {/* Settings Tabs */}
        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            👤 Personal Info
          </button>
          <button
            className={`tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
            onClick={() => setActiveTab('skills')}
          >
            🛠️ Skills & Experience
          </button>
          <button
            className={`tab-btn ${activeTab === 'cv' ? 'active' : ''}`}
            onClick={() => setActiveTab('cv')}
          >
            📄 CV & Documents
          </button>
          <button
            className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            🔒 Security
          </button>
        </div>

        {/* Tab Content */}
        <div className="settings-content">
          {activeTab === 'personal' && (
            <form onSubmit={handleProfileUpdate} className="settings-form">
              <h2>Personal Information</h2>

              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={profile.email}
                  disabled
                />
                <small>Email cannot be changed. Contact support if needed.</small>
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="location">Location</label>
                <input
                  type="text"
                  id="location"
                  value={profile.location}
                  onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="City, Country"
                />
              </div>

              <div className="form-group">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  placeholder="Tell us about yourself..."
                />
              </div>

              <button type="submit" className="save-btn" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}

          {activeTab === 'skills' && (
            <div className="skills-section">
              <h2>Skills & Experience</h2>

              <div className="skills-manager">
                <div className="add-skill">
                  <input
                    type="text"
                    placeholder="Add a skill..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addSkill(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      const input = e.target.previousElementSibling;
                      addSkill(input.value);
                      input.value = '';
                    }}
                  >
                    Add
                  </button>
                </div>

                <div className="skills-list">
                  {profile.skills.map((skill, index) => (
                    <span key={index} className="skill-tag">
                      {skill}
                      <button onClick={() => removeSkill(skill)}>×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="experience-section">
                <h3>Work Experience</h3>
                <p>Experience management coming soon...</p>
              </div>

              <div className="education-section">
                <h3>Education</h3>
                <p>Education management coming soon...</p>
              </div>
            </div>
          )}

          {activeTab === 'cv' && (
            <div className="cv-section">
              <h2>CV & Documents</h2>

              <div className="cv-upload">
                <div className="current-cv">
                  {profile.cv ? (
                    <div className="cv-info">
                      <span className="cv-name">📄 {profile.cv.name}</span>
                      <a href={profile.cv.url} target="_blank" rel="noopener noreferrer">
                        View CV
                      </a>
                    </div>
                  ) : (
                    <p>No CV uploaded yet</p>
                  )}
                </div>

                <div className="upload-controls">
                  <input
                    type="file"
                    id="cv-upload"
                    accept=".pdf,.doc,.docx"
                    onChange={handleCVUpload}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="cv-upload" className="upload-btn">
                    {saving ? 'Uploading...' : 'Upload New CV'}
                  </label>
                </div>

                <div className="upload-requirements">
                  <h4>Requirements:</h4>
                  <ul>
                    <li>PDF or Word document (.doc, .docx)</li>
                    <li>Maximum file size: 5MB</li>
                    <li>Include your contact information</li>
                    <li>Keep it updated with your latest experience</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handlePasswordChange} className="settings-form">
              <h2>Change Password</h2>

              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  minLength={6}
                />
              </div>

              <button type="submit" className="save-btn" disabled={saving}>
                {saving ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </UserDashboardLayout>
  );
};

export default JobSeekerSettings;