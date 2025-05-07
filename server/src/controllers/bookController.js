/**
 * Book Controller
 * Handles API requests related to books
 */

const { 
  successResponse, 
  notFoundResponse, 
  errorResponse, 
  asyncHandler 
} = require('./baseController');
const { Book, BookCopy } = require('../models');

/**
 * Get all books
 * @route GET /api/books
 */
const getAllBooks = asyncHandler(async (req, res) => {
  try {
    const db = await require('../database/db').getDb();
    const books = await db('books').select('*');
    return successResponse(res, { books });
  } catch (error) {
    console.error('Error fetching books:', error);
    throw error;
  }
});

/**
 * Get book by ID
 * @route GET /api/books/:id
 */
const getBookById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const db = await require('../database/db').getDb();
    
    // Get book details
    const book = await db('books')
      .where({ id })
      .first()
      .then(book => {
        if (!book) {
          throw new Error(`Book with ID ${id} not found`);
        }
        return book;
      });
    
    // Get book copies if requested
    if (req.query.includeCopies === 'true') {
      const copies = await db('book_copies')
        .where({ book_id: id })
        .select('*');
      
      return successResponse(res, { 
        book, 
        copies 
      });
    }
    
    return successResponse(res, { book });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Book');
    }
    throw error;
  }
});

/**
 * Get books by category
 * @route GET /api/books/category/:category
 */
const getBooksByCategory = asyncHandler(async (req, res) => {
  try {
    const { category } = req.params;
    const db = await require('../database/db').getDb();
    
    const books = await db('books')
      .where({ category })
      .select('*');
      
    return successResponse(res, { 
      category, 
      books 
    });
  } catch (error) {
    console.error('Error fetching books by category:', error);
    throw error;
  }
});

/**
 * Search for books
 * @route GET /api/books/search
 */
const searchBooks = asyncHandler(async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim() === '') {
      return errorResponse(res, 'Search query is required', 400);
    }
    
    const db = await require('../database/db').getDb();
    
    const books = await db('books')
      .where('title', 'like', `%${query}%`)
      .orWhere('author', 'like', `%${query}%`)
      .orWhere('isbn', 'like', `%${query}%`)
      .select('*');
      
    return successResponse(res, { 
      query, 
      books 
    });
  } catch (error) {
    console.error('Error searching books:', error);
    throw error;
  }
});

/**
 * Add a new book
 * @route POST /api/books
 */
const addBook = asyncHandler(async (req, res) => {
  try {
    const bookData = req.body;
    
    // Basic validation
    if (!bookData.title) {
      return errorResponse(res, 'Book title is required', 400);
    }
    
    const db = await require('../database/db').getDb();
    
    // Set timestamps
    const now = new Date();
    bookData.created_at = now;
    bookData.updated_at = now;
    
    const [book] = await db('books')
      .insert(bookData)
      .returning('*');
      
    return successResponse(res, { 
      message: 'Book added successfully', 
      book 
    }, 201);
  } catch (error) {
    console.error('Error adding book:', error);
    throw error;
  }
});

/**
 * Update a book
 * @route PUT /api/books/:id
 */
const updateBook = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const db = await require('../database/db').getDb();
    
    // Check if book exists
    const book = await db('books')
      .where({ id })
      .first();
      
    if (!book) {
      return notFoundResponse(res, 'Book');
    }
    
    // Update timestamp
    updates.updated_at = new Date();
    
    const [updatedBook] = await db('books')
      .where({ id })
      .update(updates)
      .returning('*');
      
    return successResponse(res, { 
      message: 'Book updated successfully', 
      book: updatedBook 
    });
  } catch (error) {
    console.error('Error updating book:', error);
    throw error;
  }
});

/**
 * Delete a book
 * @route DELETE /api/books/:id
 */
const deleteBook = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const db = await require('../database/db').getDb();
    
    // Check if book exists
    const book = await db('books')
      .where({ id })
      .first();
      
    if (!book) {
      return notFoundResponse(res, 'Book');
    }
    
    // Check if book has copies
    const copies = await db('book_copies')
      .where({ book_id: id })
      .select('*');
    
    if (copies.length > 0) {
      // Check if any copies are currently loaned out
      const activeCopies = await db('book_copies')
        .join('loans', 'book_copies.id', 'loans.book_copy_id')
        .where({
          'book_copies.book_id': id,
          'loans.status': 'Borrowed'
        })
        .whereNull('loans.return_date')
        .select('book_copies.id');
      
      if (activeCopies.length > 0) {
        return errorResponse(res, 'Cannot delete book: some copies are currently checked out', 400);
      }
      
      // Delete all copies first
      await db('book_copies')
        .where({ book_id: id })
        .del();
    }
    
    // Delete the book
    await db('books')
      .where({ id })
      .del();
      
    return successResponse(res, { 
      message: 'Book deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting book:', error);
    throw error;
  }
});

/**
 * Get most popular books
 * @route GET /api/books/popular
 */
const getPopularBooks = asyncHandler(async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 5;
    const db = await require('../database/db').getDb();
    
    const books = await db('loans')
      .join('book_copies', 'loans.book_copy_id', 'book_copies.id')
      .join('books', 'book_copies.book_id', 'books.id')
      .select(
        'books.id',
        'books.title',
        'books.author',
        db.raw('COUNT(loans.id) as borrow_count')
      )
      .groupBy('books.id', 'books.title', 'books.author')
      .orderBy('borrow_count', 'desc')
      .limit(limit);
      
    return successResponse(res, { books });
  } catch (error) {
    console.error('Error fetching popular books:', error);
    throw error;
  }
});

/**
 * Get popular categories
 * @route GET /api/books/popular-categories
 */
const getPopularCategories = asyncHandler(async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 5;
    const db = await require('../database/db').getDb();
    
    const categories = await db('books')
      .select('category')
      .count('id as book_count')
      .whereNotNull('category')
      .groupBy('category')
      .orderBy('book_count', 'desc')
      .limit(limit);
      
    return successResponse(res, { categories });
  } catch (error) {
    console.error('Error fetching popular categories:', error);
    throw error;
  }
});

module.exports = {
  getAllBooks,
  getBookById,
  getBooksByCategory,
  searchBooks,
  addBook,
  updateBook,
  deleteBook,
  getPopularBooks,
  getPopularCategories
}; 