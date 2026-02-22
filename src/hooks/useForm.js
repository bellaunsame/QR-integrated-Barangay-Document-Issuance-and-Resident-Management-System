import { useState, useCallback } from 'react';

/**
 * useForm Hook
 * 
 * Simplifies form handling with validation, error management, and submission.
 * 
 * @param {Object} initialValues - Initial form values
 * @param {Function} onSubmit - Function to call on form submission
 * @param {Function} validate - Optional validation function
 * @returns {Object} - Form state and handlers
 * 
 * @example
 * const { values, errors, handleChange, handleSubmit, isSubmitting } = useForm(
 *   { email: '', password: '' },
 *   async (values) => {
 *     await login(values.email, values.password);
 *   },
 *   (values) => {
 *     const errors = {};
 *     if (!values.email) errors.email = 'Email is required';
 *     return errors;
 *   }
 * );
 */
export const useForm = (initialValues = {}, onSubmit, validate) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handle input change
   */
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setValues(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  }, [errors]);

  /**
   * Handle input blur (mark as touched)
   */
  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    // Validate this field on blur if validate function exists
    if (validate) {
      const validationErrors = validate(values);
      if (validationErrors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: validationErrors[name]
        }));
      }
    }
  }, [values, validate]);

  /**
   * Set a specific field value programmatically
   */
  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  /**
   * Set a specific field error
   */
  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
    }

    // Mark all fields as touched
    const touchedFields = {};
    Object.keys(values).forEach(key => {
      touchedFields[key] = true;
    });
    setTouched(touchedFields);

    // Validate all fields
    if (validate) {
      const validationErrors = validate(values);
      setErrors(validationErrors);

      // Don't submit if there are errors
      if (Object.keys(validationErrors).length > 0) {
        return;
      }
    }

    // Submit form
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
      // You can set a general error here if needed
      setErrors(prev => ({
        ...prev,
        submit: error.message || 'Submission failed'
      }));
    } finally {
      setIsSubmitting(false);
    }
  }, [values, onSubmit, validate]);

  /**
   * Reset form to initial values
   */
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  /**
   * Check if form is valid
   */
  const isValid = useCallback(() => {
    if (!validate) return true;
    const validationErrors = validate(values);
    return Object.keys(validationErrors).length === 0;
  }, [values, validate]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    resetForm,
    isValid
  };
};

export default useForm;