import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * API route handler for /api/accounts/type/[type]
 * This acts as a proxy to the backend API for getting accounts by type
 */
export default async function handler(req, res) {
  // Get the account type from the request
  const { type } = req.query;
  
  // Only allow GET method for this endpoint
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the authorization token from the request headers
    const token = req.headers.authorization;
    
    // Prepare headers for the backend request
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Add authorization header if token exists
    if (token) {
      headers.Authorization = token;
    }

    console.log(`Proxying ${req.method} request to ${API_URL}/api/accounts/type/${type}`);
    
    // Make the request to the backend API
    const response = await axios({
      method: req.method,
      url: `${API_URL}/api/accounts/type/${type}`,
      headers,
      params: { ...req.query, type: undefined }, // Remove type from query params as it's in the URL
    });

    // Return the response from the backend
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('API proxy error:', error);
    
    // Return appropriate error response
    if (error.response) {
      // The backend responded with an error status
      return res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      return res.status(503).json({ message: 'Backend service unavailable' });
    } else {
      // Something happened in setting up the request
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }
} 