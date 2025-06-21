import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * API route handler for /api/clients/[id]
 * This acts as a proxy to the backend API for individual client operations
 */
export default async function handler(req, res) {
  // Get the client ID from the request
  const { id } = req.query;
  
  // Only allow GET, PUT, and DELETE methods for this endpoint
  if (!['GET', 'PUT', 'DELETE'].includes(req.method)) {
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

    console.log(`Proxying ${req.method} request to ${API_URL}/api/clients/${id}`);
    
    // Make the request to the backend API
    const response = await axios({
      method: req.method,
      url: `${API_URL}/api/clients/${id}`,
      headers,
      params: { ...req.query, id: undefined }, // Remove id from query params as it's in the URL
      data: req.body,
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