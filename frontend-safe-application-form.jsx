import React, { useState, useEffect, useRef } from 'react';
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

const SafeApplicationForm = () => {
  const [formData, setFormData] = useState({
    phone: '',
    nationalId: '',
    coverLetter: '',
    name: '',
    jobId: ''
  });
  const [files, setFiles] = useState({
    cv: null,
    nationalId: null,
    passport: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRefs = {
    cv: useRef(null),
    nationalId: useRef(null),
    passport: useRef(null)
  };

  // Handle file selection
  const handleFileChange = (e, fieldName) => {
    try {
      const file = e.target.files?.[0];
      
      if (!file) {
        setFiles(prev => ({ ...prev, [fieldName]: null }));
        return;
      }

      // ✅ FIX 1: Validate file type
      if (file.type !== 'application/pdf') {
        setError(`❌ ${fieldName} must be a PDF file. You selected: ${file.type}`);
        e.target.value = ''; // Clear the input
        setFiles(prev => ({ ...prev, [fieldName]: null }));
        return;
      }

      // ✅ FIX 2: Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setError(
          `❌ ${fieldName} is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). ` +
          `Maximum size is 5MB.`
        );
        e.target.value = ''; // Clear the input
        setFiles(prev => ({ ...prev, [fieldName]: null }));
        return;
      }

      console.log(`✅ File selected: ${fieldName} - ${file.name} (${(file.size / 1024).toFixed(2)}KB)`);
      setFiles(prev => ({ ...prev, [fieldName]: file }));
      setError(null); // Clear any previous file errors
    } catch (err) {
      console.error(`Error selecting ${fieldName}:`, err);
      setError(`Error selecting ${fieldName}: ${err.message}`);
    }
  };

  // Handle text input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    try {
      setFormData(prev => ({ ...prev, [name]: value }));
      setError(null); // Clear error when user starts typing
    } catch (err) {
      console.error('Error updating form field:', err);
    }
  };

  // Validate form before submission
  const validateForm = () => {
    console.log('🔍 Validating form...');
    console.log('DEBUG - Current files state:', {
      cv: files.cv?.name || 'null',
      nationalId: files.nationalId?.name || 'null',
      passport: files.passport?.name || 'null'
    });

    // Check required fields
    if (!formData.name?.trim()) {
      setError('❌ Name is required');
      return false;
    }

    if (!formData.jobId?.trim()) {
      setError('❌ Job ID is required');
      return false;
    }

    if (!formData.phone?.trim()) {
      setError('❌ Phone number is required');
      return false;
    }

    if (!formData.nationalId?.trim()) {
      setError('❌ National ID is required');
      return false;
    }

    // Check files
    if (!files.cv) {
      console.log('❌ CV file is missing:', files.cv);
      setError('❌ CV file is required');
      return false;
    }

    if (!files.nationalId) {
      console.log('❌ National ID file is missing:', files.nationalId);
      setError('❌ National ID file is required');
      return false;
    }

    if (!files.passport) {
      console.log('❌ Passport file is missing:', files.passport);
      setError('❌ Passport file is required');
      return false;
    }

    console.log('✅ Form validation passed');
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError(null);
      setSuccess(false);

      // ✅ FIX 3: Validate before submission
      if (!validateForm()) {
        return;
      }

      setLoading(true);
      console.log('📤 Preparing form submission...');

      // ✅ FIX 4: Use FormData for file uploads
      const formDataToSend = new FormData();

      // Files
      formDataToSend.append("cv", files.cv);
      formDataToSend.append("nationalId", files.nationalId);
      formDataToSend.append("passport", files.passport);

      // Determine whether the selected job value is an ID or a title
      const jobValue = formData.jobId.trim();
      if (jobValue) {
        const jobIdParsed = Number(jobValue);
        if (Number.isInteger(jobIdParsed) && String(jobIdParsed) === jobValue) {
          formDataToSend.append('job_id', jobValue);
        } else {
          formDataToSend.append('job', jobValue);
        }
      }

      formDataToSend.append("name", formData.name);
      formDataToSend.append('nationalIdNumber', formData.nationalId); // text
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('coverLetter', formData.coverLetter);

      console.log('📋 Form data prepared:');
      console.log('   - Name:', formData.name);
      console.log('   - Job ID:', formData.jobId);
      console.log('   - CV:', files.cv?.name);
      console.log('   - National ID:', files.nationalId?.name);
      console.log('   - Passport:', files.passport?.name);
      console.log('   - Phone:', formData.phone);

      // ✅ FIX 5: Send with correct headers and error handling
      console.log('📤 Sending application...');
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL || ''}/api/applications/apply`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        const responseText = await response.text();
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (jsonErr) {
          console.error('Server returned non-JSON error response:', responseText);
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        const html = await response.text();
        console.error('Server returned HTML:', html);
        throw new Error('Server error');
      }
      console.log('✅ Application submitted successfully:', data);
      setSuccess(true);
      setUploadProgress(0);

      // Reset form
      setFormData({
        phone: '',
        nationalId: '',
        coverLetter: '',
        name: '',
        jobId: ''
      });
      setFiles({
        cv: null,
        nationalId: null,
        passport: null
      });

      // Clear file inputs
      Object.values(fileInputRefs).forEach(ref => {
        if (ref.current) ref.current.value = '';
      });

      // Show success message for 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (err) {
      console.error('❌ Application submission error:', err);

      const backendData = err.response?.data || {};
      const backendMessage = backendData.message || backendData.error;

      // ✅ FIX 6: Handle different error types
      let errorMessage = 'Failed to submit application. Please try again.';

      if (err.response?.status === 400) {
        errorMessage = `❌ ${backendMessage || 'Invalid form data'}`;
      } else if (err.response?.status === 401) {
        errorMessage = '❌ Your session has expired. Please log in again.';
        setTimeout(() => window.location.href = '/login', 2000);
      } else if (err.response?.status === 413) {
        errorMessage = '❌ Files are too large. Maximum 5MB per file.';
      } else if (err.response?.status === 500) {
        errorMessage = '❌ Server error. Please try again later.';
      } else if (err.message === 'Network Error') {
        errorMessage = '❌ Network error. Check your connection.';
      } else if (backendMessage) {
        errorMessage = `❌ ${backendMessage}`;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="application-form-container">
      <h2>📝 Job Application Form</h2>

      {/* Error Message */}
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="success-message" role="status">
          ✅ Application submitted successfully! Redirecting to dashboard...
        </div>
      )}

      <form onSubmit={handleSubmit} encType="multipart/form-data">
        {/* Name */}
        <div className="form-group">
          <label htmlFor="name">
            Full Name <span className="required">*</span>
          </label>
          <input
            id="name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Your full name"
            required
          />
        </div>

        {/* Job ID */}
        <div className="form-group">
          <label htmlFor="jobId">
            Job ID <span className="required">*</span>
          </label>
          <input
            id="jobId"
            type="text"
            name="jobId"
            value={formData.jobId}
            onChange={handleInputChange}
            placeholder="Job ID"
            required
          />
        </div>

        {/* Phone */}
        <div className="form-group">
          <label htmlFor="phone">
            Phone Number <span className="required">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="+1 (555) 000-0000"
            required
          />
        </div>

        {/* National ID */}
        <div className="form-group">
          <label htmlFor="national-id">
            National ID <span className="required">*</span>
          </label>
          <input
            id="national-id"
            type="text"
            name="nationalId"
            value={formData.nationalId}
            onChange={handleInputChange}
            placeholder="Your national ID number"
            required
          />
        </div>

        {/* File Uploads */}
        <div className="file-uploads-section">
          <h3>📄 Required Documents (PDF only, max 5MB each)</h3>

          {/* CV Upload */}
          <div className="form-group">
            <label htmlFor="cv-upload">
              CV / Resume <span className="required">*</span>
            </label>
            <input
              ref={fileInputRefs.cv}
              id="cv-upload"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => handleFileChange(e, 'cv')}
              aria-label="Upload CV"
              required
            />
            {files.cv && (
              <small className="file-selected">
                ✅ {files.cv.name} ({(files.cv.size / 1024).toFixed(2)}KB)
              </small>
            )}
          </div>

          {/* National ID Document Upload */}
          <div className="form-group">
            <label htmlFor="national-id-upload">
              National ID Document <span className="required">*</span>
            </label>
            <input
              ref={fileInputRefs.nationalId}
              id="national-id-upload"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => handleFileChange(e, 'nationalId')}
              aria-label="Upload National ID"
              required
            />
            {files.nationalId && (
              <small className="file-selected">
                ✅ {files.nationalId.name} ({(files.nationalId.size / 1024).toFixed(2)}KB)
              </small>
            )}
          </div>

          {/* Passport Upload */}
          <div className="form-group">
            <label htmlFor="passport-upload">
              Passport <span className="required">*</span>
            </label>
            <input
              ref={fileInputRefs.passport}
              id="passport-upload"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => handleFileChange(e, 'passport')}
              aria-label="Upload Passport"
              required
            />
            {files.passport && (
              <small className="file-selected">
                ✅ {files.passport.name} ({(files.passport.size / 1024).toFixed(2)}KB)
              </small>
            )}
          </div>
        </div>

        {/* Cover Letter */}
        <div className="form-group">
          <label htmlFor="cover-letter">
            Cover Letter (optional)
          </label>
          <textarea
            id="cover-letter"
            name="coverLetter"
            value={formData.coverLetter}
            onChange={handleInputChange}
            placeholder="Tell us why you're interested in this position..."
            rows={4}
          />
        </div>

        {/* Upload Progress */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p>Uploading: {uploadProgress}%</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="submit-btn"
        >
          {loading ? '⏳ Submitting...' : '📤 Submit Application'}
        </button>
      </form>

      {/* Debug Info */}
      <details className="debug-section">
        <summary>🔍 Debug Information (Click to expand)</summary>
        <pre>{JSON.stringify({
          name: formData.name,
          jobId: formData.jobId,
          phone: formData.phone,
          nationalId: formData.nationalId,
          files: {
            cv: files.cv?.name || 'Not selected',
            nationalId: files.nationalId?.name || 'Not selected',
            passport: files.passport?.name || 'Not selected'
          },
          loading,
          uploadProgress
        }, null, 2)}</pre>
      </details>

      {/* Styles */}
      <style>{`
        .application-form-container {
          max-width: 600px;
          margin: 20px auto;
          padding: 20px;
          background: #f9f9f9;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .error-message {
          background: #ffebee;
          color: #c62828;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
          border-left: 4px solid #c62828;
        }

        .success-message {
          background: #e8f5e9;
          color: #2e7d32;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
          border-left: 4px solid #2e7d32;
        }

        .form-group {
          margin-bottom: 16px;
        }

        label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: #333;
        }

        .required {
          color: red;
        }

        input[type="text"],
        input[type="tel"],
        select,
        textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: inherit;
          font-size: 14px;
          box-sizing: border-box;
        }

        input[type="file"] {
          display: block;
          margin-bottom: 8px;
        }

        .file-selected {
          display: block;
          color: #2e7d32;
          margin-top: 4px;
        }

        .file-uploads-section {
          background: #fff;
          padding: 16px;
          border-radius: 4px;
          margin: 20px 0;
          border: 1px solid #e0e0e0;
        }

        .progress-container {
          margin: 16px 0;
        }

        .progress-bar {
          width: 100%;
          height: 20px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4caf50, #66bb6a);
          transition: width 0.3s ease;
        }

        .submit-btn {
          width: 100%;
          padding: 12px;
          margin-top: 20px;
          background: #1976d2;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.3s;
        }

        .submit-btn:hover:not(:disabled) {
          background: #1565c0;
        }

        .submit-btn:disabled {
          background: #bdbdbd;
          cursor: not-allowed;
        }

        .debug-section {
          margin-top: 30px;
          padding: 12px;
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .debug-section pre {
          background: #fff;
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 12px;
        }

        small {
          display: block;
          color: #666;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
};

export default SafeApplicationForm;
