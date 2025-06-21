SELECT 
  c.code, 
  c.name, 
  c.type, 
  c.category,
  SUM(CASE WHEN t.type IN ('income', 'credit', 'REVENUE', 'WIP_DECREASE') THEN t.amount ELSE 0 END) as credit_total,
  SUM(CASE WHEN t.type IN ('expense', 'debit', 'WIP_INCREASE') THEN t.amount ELSE 0 END) as debit_total,
  CASE 
    WHEN c.type IN ('Aset', 'asset') THEN 
      SUM(CASE WHEN t.type IN ('expense', 'debit', 'WIP_INCREASE') THEN t.amount ELSE 0 END) - 
      SUM(CASE WHEN t.type IN ('income', 'credit', 'REVENUE', 'WIP_DECREASE') THEN t.amount ELSE 0 END)
    ELSE 
      SUM(CASE WHEN t.type IN ('income', 'credit', 'REVENUE', 'WIP_DECREASE') THEN t.amount ELSE 0 END) - 
      SUM(CASE WHEN t.type IN ('expense', 'debit', 'WIP_INCREASE') THEN t.amount ELSE 0 END)
  END as balance
FROM chartofaccount c
LEFT JOIN transaction t ON c.code = t.accountCode
GROUP BY c.code, c.name, c.type, c.category
ORDER BY c.code; 