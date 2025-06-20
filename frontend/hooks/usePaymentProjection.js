import { useState, useCallback, useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';

/**
 * Hook untuk mengelola fitur proyeksi pembayaran berdasarkan pengaturan aplikasi
 * 
 * @param {Date|string} startDate - Tanggal mulai atau tanggal invoice
 * @param {Object} options - Opsi tambahan
 * @param {number} options.customTerms - Kustom jatuh tempo dalam hari (opsional, mengabaikan default)
 * @returns {Object} Objek yang berisi fungsi dan data proyeksi pembayaran
 */
const usePaymentProjection = (startDate, { customTerms } = {}) => {
  const { getSetting } = useSettings();
  
  // Ambil pengaturan default dari context
  const defaultPaymentTerms = getSetting('defaultPaymentTerms', 30); // 30 hari default
  const reminderDays = getSetting('reminderDays', 7); // 7 hari sebelum jatuh tempo
  
  // Gunakan customTerms jika disediakan, jika tidak gunakan default
  const paymentTerms = customTerms || defaultPaymentTerms;
  
  // Konversi startDate ke objek Date jika string
  const invoiceDate = useMemo(() => {
    if (!startDate) return new Date();
    return typeof startDate === 'string' ? new Date(startDate) : startDate;
  }, [startDate]);
  
  // Hitung tanggal jatuh tempo
  const dueDate = useMemo(() => {
    const date = new Date(invoiceDate);
    date.setDate(date.getDate() + paymentTerms);
    return date;
  }, [invoiceDate, paymentTerms]);
  
  // Hitung tanggal pengingat
  const reminderDate = useMemo(() => {
    const date = new Date(dueDate);
    date.setDate(date.getDate() - reminderDays);
    return date;
  }, [dueDate, reminderDays]);
  
  // Format tanggal ke string DD/MM/YYYY
  const formatDate = useCallback((date) => {
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, []);
  
  // Hitung sisa hari hingga jatuh tempo
  const daysUntilDue = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }, [dueDate]);
  
  // Apakah sudah melewati tanggal jatuh tempo
  const isOverdue = daysUntilDue < 0;
  
  // Apakah sudah mendekati tanggal jatuh tempo
  const isNearDueDate = daysUntilDue >= 0 && daysUntilDue <= reminderDays;
  
  return {
    invoiceDate,
    dueDate,
    reminderDate,
    daysUntilDue,
    isOverdue,
    isNearDueDate,
    paymentTerms,
    formatDate,
    formatted: {
      invoiceDate: formatDate(invoiceDate),
      dueDate: formatDate(dueDate),
      reminderDate: formatDate(reminderDate),
    }
  };
};

export default usePaymentProjection; 