import React from 'react';
import { Text } from '@chakra-ui/react';
import { useSettings } from '../../context/SettingsContext';

/**
 * Component untuk memformat mata uang berdasarkan pengaturan aplikasi
 * 
 * @param {Object} props - Props for the component
 * @param {number|string} props.amount - Jumlah uang yang akan diformat
 * @param {boolean} props.showSymbol - Apakah menampilkan simbol mata uang (default: true)
 * @param {Object} props.textProps - Props tambahan untuk komponen Text
 */
const CurrencyFormatter = ({ amount, showSymbol = true, ...textProps }) => {
  const { getSetting } = useSettings();
  
  // Ambil pengaturan mata uang dari context
  const currencySymbol = getSetting('currencySymbol', 'Rp');
  
  // Format number dengan separator ribuan
  const formatAmount = (value) => {
    if (value === undefined || value === null) return '0';
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    // Format angka dengan pemisah ribuan
    return new Intl.NumberFormat('id-ID').format(numValue);
  };
  
  // Format akhir dengan simbol mata uang
  const formatted = showSymbol 
    ? `${currencySymbol} ${formatAmount(amount)}` 
    : formatAmount(amount);
  
  return <Text as="span" {...textProps}>{formatted}</Text>;
};

export default CurrencyFormatter; 