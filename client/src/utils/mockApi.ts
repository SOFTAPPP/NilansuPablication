import { books, CATEGORIES } from '../data/books';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApi = {
  getBooks: async ({ category, limit = 20, page = 1, searchQuery = '' }: any) => {
    await delay(600); // Simulate network latency
    
    let result = [...books];
    
    if (category) {
      result = result.filter(b => b.category === category);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.title.toLowerCase().includes(q) || 
        b.author.toLowerCase().includes(q)
      );
    }
    
    // Simple pagination
    const startIndex = (page - 1) * limit;
    const paginatedResult = result.slice(startIndex, startIndex + limit);
    
    return {
      data: paginatedResult,
      total: result.length,
      page,
      totalPages: Math.ceil(result.length / limit)
    };
  },
  
  getBookById: async (id) => {
    await delay(400);
    const book = books.find(b => b.id === id);
    if (!book) throw new Error("Book not found");
    return book;
  },
  
  getTrendingBooks: async () => {
    await delay(500);
    return books.filter(b => b.isTrending).slice(0, 10);
  },
  
  getCategories: async () => {
    await delay(200);
    // Count books per category
    const categoryCounts = CATEGORIES.map(cat => ({
      name: cat,
      count: books.filter(b => b.category === cat).length
    }));
    return categoryCounts;
  }
};
