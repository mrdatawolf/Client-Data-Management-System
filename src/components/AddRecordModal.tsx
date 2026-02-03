"use client";

import { useState, useEffect } from "react";

interface FieldConfig {
  key: string;
  label: string;
  type?: 'text' | 'password' | 'number' | 'date' | 'ip' | 'email' | 'url' | 'textarea';
  required?: boolean;
  defaultValue?: any;
  placeholder?: string;
  hidden?: boolean; // Don't show in form (for auto-filled fields like Client)
}

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => Promise<boolean>;
  title: string;
  fields: FieldConfig[];
  autoFilledFields?: Record<string, any>; // Fields automatically set (e.g., Client)
}

export function AddRecordModal({
  isOpen,
  onClose,
  onSave,
  title,
  fields,
  autoFilledFields = {},
}: AddRecordModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize form with default values when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialData: Record<string, any> = { ...autoFilledFields };
      fields.forEach(field => {
        if (field.defaultValue !== undefined) {
          initialData[field.key] = field.defaultValue;
        } else if (!(field.key in initialData)) {
          initialData[field.key] = field.type === 'number' ? '' : '';
        }
      });
      setFormData(initialData);
      setErrors({});
      setSaveError(null);
    }
  }, [isOpen, fields, autoFilledFields]);

  // Handle field change
  const handleFieldChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // Clear error when field is edited
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      if (field.required && !field.hidden) {
        const value = formData[field.key];
        if (value === undefined || value === null || value === '') {
          newErrors[field.key] = `${field.label} is required`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Combine auto-filled fields with form data
      const dataToSave = { ...autoFilledFields, ...formData };

      // Convert empty strings to appropriate types
      fields.forEach(field => {
        if (field.type === 'number' && dataToSave[field.key] === '') {
          dataToSave[field.key] = null;
        }
      });

      const success = await onSave(dataToSave);
      if (success) {
        onClose();
      } else {
        setSaveError('Failed to save record');
      }
    } catch (error: any) {
      setSaveError(error.message || 'Failed to save record');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  // Filter visible fields
  const visibleFields = fields.filter(f => !f.hidden);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !isSaving && onClose()}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {saveError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300 text-sm">
              {saveError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleFields.map(field => (
              <div
                key={field.key}
                className={field.type === 'textarea' ? 'md:col-span-2' : ''}
              >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors[field.key]
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={formData[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className={`w-full px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors[field.key]
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    } ${field.type === 'ip' || field.type === 'number' || field.type === 'password' ? 'font-mono' : ''}`}
                  />
                )}

                {errors[field.key] && (
                  <p className="mt-1 text-xs text-red-500">{errors[field.key]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
