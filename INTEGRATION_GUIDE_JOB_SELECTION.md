/**
 * INTEGRATION GUIDE: Adding Job Selection to Application Form
 * 
 * There are THREE ways to integrate job selection on the frontend:
 */

// ========================================================================
// OPTION 1: Using the Simple Dropdown (Recommended for Forms)
// ========================================================================
// In your application form component:

import JobDropdown from './frontend-job-dropdown';

function ApplicationForm() {
  const [selectedJob, setSelectedJob] = useState(null);
  const [formData, setFormData] = useState({
    phone: '',
    nationalId: '',
    coverLetter: ''
  });

  const handleJobSelect = (job) => {
    setSelectedJob(job);
    console.log('Selected job:', job);
    // Store job ID somewhere if needed
  };

  return (
    <form>
      {/* Job Selection Dropdown */}
      <div className="form-group">
        <label htmlFor="job-select">
          Job Position <span className="required">*</span>
        </label>
        <JobDropdown onSelect={handleJobSelect} />
      </div>

      {/* Show selected job info */}
      {selectedJob && (
        <div className="selected-job-info">
          <p>✓ Selected: <strong>{selectedJob.title}</strong></p>
          <p>Category: {selectedJob.category}</p>
        </div>
      )}

      {/* Rest of form fields */}
      <div className="form-group">
        <label htmlFor="phone">Phone Number *</label>
        <input id="phone" type="tel" required />
      </div>

      {/* ... other fields ... */}
    </form>
  );
}


// ========================================================================
// OPTION 2: Using the Grid Selector (Better UX for Discovery)
// ========================================================================
// In your page component:

import JobSelector from './frontend-job-selector';

function JobSelectionPage() {
  const [selectedJob, setSelectedJob] = useState(null);

  const handleJobSelect = (job) => {
    setSelectedJob(job);
    console.log('User selected:', job.title, 'from', job.category);
    // Navigate to application form or show form here
  };

  return (
    <div>
      <h1>Apply for a Position</h1>
      <JobSelector onSelect={handleJobSelect} />
      
      {selectedJob && (
        <div>
          <p>Selected: {selectedJob.title}</p>
          <button onClick={() => navigateToApplicationForm(selectedJob)}>
            Continue with Application
          </button>
        </div>
      )}
    </div>
  );
}


// ========================================================================
// OPTION 3: Direct API Usage (For Custom Implementations)
// ========================================================================
// If you want complete control:

import axios from 'axios';

async function fetchJobsForSelection() {
  try {
    const response = await axios.get('http://localhost:5000/api/applications/job-options');
    
    // Response structure:
    // {
    //   "jobs": {
    //     "Healthcare": [
    //       { "id": 1, "_id": "1", "title": "Caregiver" },
    //       { "id": 2, "_id": "2", "title": "Nurse" }
    //     ],
    //     "Construction": [...],
    //     ...
    //   },
    //   "total": 16
    // }
    
    const jobsByCategory = response.data.jobs;
    
    // Use this data however you want
    return jobsByCategory;
  } catch (error) {
    console.error('Failed to fetch jobs:', error);
  }
}


// ========================================================================
// DATABASE JOBS AVAILABLE FOR SELECTION
// ========================================================================
/*
✅ Total Jobs: 16

Healthcare (3 jobs)
  - Caregiver
  - Caregiving
  - Nurse

Construction (2 jobs)
  - Electrician
  - Mason

Food & Hospitality (3 jobs)
  - Chef
  - Hostess
  - Waiter / Waitress

Transport & Logistics (2 jobs)
  - Driver
  - Warehouse Staff

Domestic & Cleaning Services (2 jobs)
  - Cleaner
  - Housekeeping

Agriculture (1 job)
  - Farm Worker

Education (1 job)
  - Teacher

Retail & Supermarket (1 job)
  - Supermarket Attendant

Security (1 job)
  - Security Guard
*/


// ========================================================================
// API ENDPOINT
// ========================================================================
/*
GET /api/applications/job-options

Response:
{
  "jobs": {
    "Category Name": [
      { "id": 1, "_id": "1", "title": "Job Title" },
      ...
    ],
    ...
  },
  "total": 16
}
*/


// ========================================================================
// EXAMPLE: Restored Application Form with Job Selection
// ========================================================================

import React, { useState } from 'react';
import JobDropdown from './frontend-job-dropdown';

const SafeApplicationFormWithJobs = () => {
  const [selectedJob, setSelectedJob] = useState(null);
  const [formData, setFormData] = useState({
    phone: '',
    nationalId: '',
    coverLetter: ''
  });
  const [files, setFiles] = useState({
    cv: null,
    nationalId: null,
    passport: null
  });

  const handleJobSelect = (job) => {
    setSelectedJob(job);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files?.[0];
    setFiles(prev => ({ ...prev, [fieldName]: file }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedJob) {
      alert('Please select a job position');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('job_id', selectedJob.id);
    formDataToSend.append('phone', formData.phone);
    formDataToSend.append('nationalId', formData.nationalId);
    formDataToSend.append('cv', files.cv);
    formDataToSend.append('nationalId', files.nationalId);
    formDataToSend.append('passport', files.passport);

    try {
      const response = await fetch('/api/applications/apply', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataToSend
      });

      if (response.ok) {
        alert('✅ Application submitted successfully!');
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit application');
    }
  };

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data">
      {/* Job Selection */}
      <div className="form-group">
        <label>
          Job Position <span className="required">*</span>
        </label>
        <JobDropdown onSelect={handleJobSelect} />
        {selectedJob && (
          <small>✓ Selected: {selectedJob.title}</small>
        )}
      </div>

      {/* Phone */}
      <div className="form-group">
        <label>Phone Number *</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleInputChange}
          required
        />
      </div>

      {/* National ID */}
      <div className="form-group">
        <label>National ID *</label>
        <input
          type="text"
          name="nationalId"
          value={formData.nationalId}
          onChange={handleInputChange}
          required
        />
      </div>

      {/* CV */}
      <div className="form-group">
        <label>CV (PDF) *</label>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => handleFileChange(e, 'cv')}
          required
        />
      </div>

      {/* National ID File */}
      <div className="form-group">
        <label>National ID File (PDF) *</label>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => handleFileChange(e, 'nationalId')}
          required
        />
      </div>

      {/* Passport */}
      <div className="form-group">
        <label>Passport (PDF) *</label>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => handleFileChange(e, 'passport')}
          required
        />
      </div>

      {/* Cover Letter */}
      <div className="form-group">
        <label>Cover Letter (optional)</label>
        <textarea
          name="coverLetter"
          value={formData.coverLetter}
          onChange={handleInputChange}
          rows="5"
        />
      </div>

      <button type="submit" className="submit-btn">
        Submit Application
      </button>
    </form>
  );
};

export default SafeApplicationFormWithJobs;
