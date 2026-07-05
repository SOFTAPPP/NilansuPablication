const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const defaultOptions = { credentials: 'include' as RequestCredentials };

export const getOptimizedImage = (url: string | null | undefined, width: number = 400) => {
  if (!url) return '';
  if (url.includes('uploaded_books')) {
    return `${url}${url.includes('?') ? '&' : '?'}w=${width}`;
  }
  return url;
};

// Performance/Network Resilience: Exponential backoff retry logic for fetch
const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 3, backoff = 300): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    if (!response.ok && response.status >= 500 && retries > 0) {
      throw new Error('Server Error, retrying...');
    }
    return response;
  } catch (error: any) {
    if (retries > 0 && error.name !== 'AbortError') {
      const jitter = Math.random() * 100;
      await new Promise(resolve => setTimeout(resolve, backoff + jitter));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
};

export const api = {
  getBooks: async ({ category, publication, limit = 30, page = 1, cursor, searchQuery = '', sort, inStockOnly, formats }: any) => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(cursor !== undefined ? { cursor: cursor.toString() } : { page: page.toString() }),
      ...(category && { category }),
      ...(publication && { publication }),
      ...(searchQuery && { search: searchQuery }),
      ...(sort && { sort }),
      ...(inStockOnly && { inStockOnly: 'true' }),
      ...(formats && formats.length > 0 && { formats: formats.join(',') }),
      t: Date.now().toString() // Aggressively bust SW cache
    });
    
    const response = await fetchWithRetry(`${API_URL}/books?${params}`, defaultOptions);
    if (!response.ok) throw new Error('Failed to fetch books');
    return response.json();
  },

  searchBooks: async (query: string) => {
    const response = await fetchWithRetry(`${API_URL}/search?q=${encodeURIComponent(query)}`, defaultOptions);
    if (!response.ok) throw new Error('Failed to search books');
    return response.json();
  },
  
  getBookBySlug: async (slug: string) => {
    const params = new URLSearchParams({ t: Date.now().toString() });
    const response = await fetchWithRetry(`${API_URL}/books/${slug}?${params}`, defaultOptions);
    if (!response.ok) throw new Error("Book not found");
    return response.json();
  },
  
  getTrendingBooks: async () => {
    const params = new URLSearchParams({ t: Date.now().toString() });
    const response = await fetchWithRetry(`${API_URL}/books/trending?${params}`, defaultOptions);
    if (!response.ok) throw new Error('Failed to fetch trending books');
    return response.json();
  },
  
  getBookReviews: async (bookId: string) => {
    const params = new URLSearchParams({ t: Date.now().toString() });
    const response = await fetchWithRetry(`${API_URL}/books/${bookId}/reviews?${params}`, defaultOptions);
    if (!response.ok) throw new Error('Failed to fetch reviews');
    return response.json();
  },

  submitBookReview: async (bookId: string, reviewData: any) => {
    const response = await fetch(`${API_URL}/books/${bookId}/reviews`, {
      ...defaultOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit review');
    }
    return response.json();
  },
  
  getCategories: async ({ cursor, limit = 16 }: any = {}) => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(cursor !== undefined && { cursor: cursor.toString() }),
      t: Date.now().toString() // Aggressively bust SW cache
    });
    const response = await fetchWithRetry(`${API_URL}/categories?${params}`, defaultOptions);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
  },

  getPublications: async () => {
    const params = new URLSearchParams({ t: Date.now().toString() });
    const response = await fetchWithRetry(`${API_URL}/publications?${params}`, defaultOptions);
    if (!response.ok) throw new Error('Failed to fetch publications');
    return response.json();
  },

  reorderCategories: async (orderedIds: string[]) => {
    const response = await fetch(`${API_URL}/admin/categories/reorder`, {
      ...defaultOptions,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds })
    });
    if (!response.ok) throw new Error('Failed to reorder categories');
    return response.json();
  },

  createOrder: async (orderData: any) => {
    const response = await fetch(`${API_URL}/orders`, {
      ...defaultOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create order');
    }
    return response.json();
  },

  createRazorpayOrder: async (orderData: any) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    try {
      const response = await fetch(`${API_URL}/payment/create-order`, {
        ...defaultOptions,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create Razorpay order');
      }
      return await response.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Payment server took too long to respond. Please try again.');
      }
      throw err;
    }
  },

  createCodOrder: async (orderData: any) => {
    const response = await fetch(`${API_URL}/orders/create-cod`, {
      ...defaultOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create COD order');
    }
    return response.json();
  },

  verifyRazorpayPayment: async (verificationData: any) => {
    const response = await fetch(`${API_URL}/payment/verify`, {
      ...defaultOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verificationData)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Payment verification failed');
    }
    return response.json();
  },

  login: async (credentials: any) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      ...defaultOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    return response.json();
  },

  register: async (data: any) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      ...defaultOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Registration failed');
    }
    return response.json();
  },
  
  logout: async () => {
    const response = await fetch(`${API_URL}/auth/logout`, {
      ...defaultOptions,
      method: 'POST'
    });
    if (!response.ok) throw new Error('Logout failed');
    return response.json();
  },

  getMe: async () => {
    const response = await fetchWithRetry(`${API_URL}/auth/me`, defaultOptions);
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  },

  getMyOrders: async () => {
    const response = await fetchWithRetry(`${API_URL}/users/orders`, defaultOptions);
    if (!response.ok) throw new Error('Failed to fetch orders');
    return response.json();
  },

  getAdminUsers: async () => {
    const response = await fetchWithRetry(`${API_URL}/admin/users`, defaultOptions);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },
  
  getAdminOrders: async () => {
    const response = await fetchWithRetry(`${API_URL}/admin/orders`, defaultOptions);
    if (!response.ok) throw new Error('Failed to fetch orders');
    return response.json();
  },
  
  deleteAdminOrder: async (id: string) => {
    const response = await fetch(`${API_URL}/admin/orders/${id}`, {
      ...defaultOptions,
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete order');
    return response.json();
  },
  
  syncShiprocketOrder: async (id: string) => {
    const response = await fetch(`${API_URL}/admin/orders/${id}/sync-shiprocket`, {
      ...defaultOptions,
      method: 'POST'
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to sync with Shiprocket');
    }
    return response.json();
  },
  
  createAdminUser: async (data: any) => {
    const response = await fetch(`${API_URL}/admin/users`, {
      ...defaultOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create user');
    return response.json();
  },
  
  updateAdminUser: async (id: string, data: any) => {
    const response = await fetch(`${API_URL}/admin/users/${id}`, {
      ...defaultOptions,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
  },
  
  deleteAdminUser: async (id: string) => {
    const response = await fetch(`${API_URL}/admin/users/${id}`, {
      ...defaultOptions,
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete user');
    return response.json();
  }
};
