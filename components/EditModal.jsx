import React, { useState, useEffect } from 'react';
import '../styles/EditModal.css';

function EditModal({ isOpen, title, fields, onClose, onSave, loading = false, lastSaved = null }) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (fields) {
      const initialData = {};
      fields.forEach(field => {
        initialData[field.name] = field.value || '';
      });
      setFormData(initialData);
    }
  }, [fields, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    fields.forEach(field => {
      if (field.required && !formData[field.name] && formData[field.name] !== false) {
        newErrors[field.name] = `${field.label} is required`;
      }
      if (field.type === 'email' && formData[field.name]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.name])) {
          newErrors[field.name] = 'Please enter a valid email';
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (validateForm()) {
      await onSave(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {fields && fields.map(field => (
            <div key={field.name} className="form-group">
              <label htmlFor={field.name}>{field.label}</label>
              {field.type === 'select' && (
                <select
                  id={field.name}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={handleChange}
                  className={errors[field.name] ? 'error' : ''}
                >
                  <option value="">Select {field.label}</option>
                  {field.options && field.options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
              {field.type === 'checkbox' && (
                <input
                  id={field.name}
                  type="checkbox"
                  name={field.name}
                  checked={formData[field.name] || false}
                  onChange={handleChange}
                  className={errors[field.name] ? 'error' : ''}
                />
              )}
              {field.type === 'textarea' && (
                <textarea
                  id={field.name}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={handleChange}
                  rows={field.rows || 4}
                  placeholder={field.placeholder}
                  className={errors[field.name] ? 'error' : ''}
                />
              )}
              {!['select', 'checkbox', 'textarea'].includes(field.type) && (
                <input
                  id={field.name}
                  type={field.type || 'text'}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                  className={errors[field.name] ? 'error' : ''}
                />
              )}
              {errors[field.name] && (
                <span className="error-message">{errors[field.name]}</span>
              )}
            </div>
          ))}
        </div>

        <div className="modal-footer">
          {lastSaved && (
            <span className="last-saved">
              💾 Last saved: {new Date(lastSaved).toLocaleString()}
            </span>
          )}
          <div className="modal-buttons">
            <button
              className="btn btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="btn btn-save"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditModal;
