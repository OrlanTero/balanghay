/**
 * Book Copy Controller
 * Handles API requests related to physical book copies
 */

const { 
  successResponse, 
  notFoundResponse, 
  errorResponse, 
  asyncHandler 
} = require('./baseController');
const { BookCopy, Book } = require('../models');

/**
 * Get all book copies
 * @route GET /api/book-copies
 */
const getAllBookCopies = asyncHandler(async (req, res) => {
  try {
    const db = await require('../database/db').getDb();
    const copies = await db('book_copies')
      .leftJoin('books', 'book_copies.book_id', 'books.id')
      .leftJoin('shelves', 'book_copies.shelf_id', 'shelves.id')
      .select(
        'book_copies.*',
        'books.title as book_title',
        'books.author as book_author',
        'books.isbn as book_isbn',
        'shelves.name as shelf_name',
        'shelves.location as shelf_location'
      );
    return successResponse(res, { copies });
  } catch (error) {
    console.error('Error fetching all book copies:', error);
    throw error;
  }
});

/**
 * Get book copy by ID
 * @route GET /api/book-copies/:id
 */
const getBookCopyById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const db = await require('../database/db').getDb();
    
    const copy = await db('book_copies')
      .leftJoin('books', 'book_copies.book_id', 'books.id')
      .leftJoin('shelves', 'book_copies.shelf_id', 'shelves.id')
      .where('book_copies.id', id)
      .select(
        'book_copies.*',
        'books.title as book_title',
        'books.author as book_author',
        'books.isbn as book_isbn',
        'shelves.name as shelf_name',
        'shelves.location as shelf_location'
      )
      .first();
      
    if (!copy) {
      return notFoundResponse(res, 'Book copy');
    }
    
    return successResponse(res, { copy });
  } catch (error) {
    console.error('Error fetching book copy:', error);
    throw error;
  }
});

/**
 * Get copies of a specific book
 * @route GET /api/book-copies/book/:bookId
 */
const getBookCopiesByBookId = asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  
  try {
    // Get the database connection
    const db = await require('../database/db').getDb();
    
    // First check if the book exists
    const book = await db('books')
      .where({ id: bookId })
      .first();
      
    if (!book) {
      return notFoundResponse(res, 'Book');
    }
    
    // Get all copies of the book with shelf information
    const copies = await db('book_copies')
      .leftJoin('shelves', 'book_copies.shelf_id', 'shelves.id')
      .where({ book_id: bookId })
      .select(
        'book_copies.*',
        'shelves.name as shelf_name',
        'shelves.location as shelf_location'
      );
      
    return successResponse(res, { copies });
  } catch (error) {
    console.error('Error fetching book copies:', error);
    throw error;
  }
});

/**
 * Add a new book copy
 * @route POST /api/book-copies
 */
const addBookCopy = asyncHandler(async (req, res) => {
  const copyData = req.body;
  
  // Basic validation
  if (!copyData.book_id) {
    return errorResponse(res, 'Book ID is required', 400);
  }
  
  try {
    const db = await require('../database/db').getDb();
    
    // Verify the book exists
    const book = await db('books')
      .where({ id: copyData.book_id })
      .first();
      
    if (!book) {
      return notFoundResponse(res, 'Book');
    }
    
    // Set default status if not provided
    if (!copyData.status) {
      copyData.status = 'Available';
    }
    
    // Set timestamps
    const now = new Date();
    copyData.created_at = now;
    copyData.updated_at = now;
    
    // Add the copy
    const [copy] = await db('book_copies')
      .insert(copyData)
      .returning('*');
    
    return successResponse(res, { 
      message: 'Book copy added successfully', 
      copy 
    }, 201);
  } catch (error) {
    console.error('Error adding book copy:', error);
    throw error;
  }
});

/**
 * Update a book copy
 * @route PUT /api/book-copies/:id
 */
const updateBookCopy = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const db = await require('../database/db').getDb();
    
    // Check if copy exists
    const existingCopy = await db('book_copies')
      .where({ id })
      .first();
      
    if (!existingCopy) {
      return notFoundResponse(res, 'Book copy');
    }
    
    // Update timestamp
    updates.updated_at = new Date();
    
    // Perform update
    const [updatedCopy] = await db('book_copies')
      .where({ id })
      .update(updates)
      .returning('*');
      
    return successResponse(res, { 
      message: 'Book copy updated successfully', 
      copy: updatedCopy 
    });
  } catch (error) {
    console.error('Error updating book copy:', error);
    throw error;
  }
});

/**
 * Delete a book copy
 * @route DELETE /api/book-copies/:id
 */
const deleteBookCopy = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const db = await require('../database/db').getDb();
    
    // Check if copy exists
    const copy = await db('book_copies')
      .where({ id })
      .first();
      
    if (!copy) {
      return notFoundResponse(res, 'Book copy');
    }
    
    // Check if the copy is currently checked out
    if (copy.status === 'Checked Out') {
      return errorResponse(res, 'Cannot delete: this copy is currently checked out', 400);
    }
    
    // Check for active loans
    const activeLoan = await db('loans')
      .where({ 
        book_copy_id: id,
        status: 'Borrowed'
      })
      .whereNull('return_date')
      .first();
      
    if (activeLoan) {
      return errorResponse(res, 'Cannot delete: this copy has an active loan', 400);
    }
    
    // Attempt to delete
    await db('book_copies')
      .where({ id })
      .del();
      
    return successResponse(res, { 
      message: 'Book copy deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting book copy:', error);
    throw error;
  }
});

/**
 * Move a book copy to a different shelf
 * @route PUT /api/book-copies/:id/move
 */
const moveBookCopy = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { shelfId } = req.body;
    const db = await require('../database/db').getDb();
    
    if (shelfId === undefined) {
      return errorResponse(res, 'Shelf ID is required', 400);
    }
    
    // Check if copy exists
    const copy = await db('book_copies')
      .where({ id })
      .first();
      
    if (!copy) {
      return notFoundResponse(res, 'Book copy');
    }
    
    // If shelfId is not null, verify the shelf exists
    if (shelfId !== null) {
      const shelf = await db('shelves')
        .where({ id: shelfId })
        .first();
        
      if (!shelf) {
        return notFoundResponse(res, 'Shelf');
      }
    }
    
    // Update the copy with new shelf and timestamp
    const [updatedCopy] = await db('book_copies')
      .where({ id })
      .update({ 
        shelf_id: shelfId,
        updated_at: new Date()
      })
      .returning('*');
      
    return successResponse(res, { 
      message: 'Book copy moved successfully', 
      copy: updatedCopy 
    });
  } catch (error) {
    console.error('Error moving book copy:', error);
    throw error;
  }
});

/**
 * Update the status of a book copy
 * @route PATCH /api/book-copies/:id/status
 */
const updateBookCopyStatus = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const db = await require('../database/db').getDb();
    
    if (!status) {
      return errorResponse(res, 'Status is required', 400);
    }
    
    // Check if copy exists
    const copy = await db('book_copies')
      .where({ id })
      .first();
      
    if (!copy) {
      return notFoundResponse(res, 'Book copy');
    }
    
    // Check for active loans when changing status
    if (copy.status === 'Checked Out' && status !== 'Checked Out') {
      const activeLoan = await db('loans')
        .where({ 
          book_copy_id: id,
          status: 'Borrowed'
        })
        .whereNull('return_date')
        .first();
        
      if (activeLoan) {
        return errorResponse(res, 'Cannot change status: this copy has an active loan', 400);
      }
    }
    
    // Update only the status field
    const [updatedCopy] = await db('book_copies')
      .where({ id })
      .update({ 
        status,
        updated_at: new Date()
      })
      .returning('*');
    
    return successResponse(res, { 
      message: `Book copy status updated to ${status}`, 
      copy: updatedCopy 
    });
  } catch (error) {
    console.error('Error updating book copy status:', error);
    throw error;
  }
});

/**
 * Get availability information for a specific book
 * @route GET /api/book-copies/book/:bookId/availability
 */
const getBookAvailability = asyncHandler(async (req, res) => {
  try {
    const { bookId } = req.params;
    
    // Get the database connection
    const db = await require('../database/db').getDb();
    
    // Verify the book exists
    const book = await db('books')
      .where({ id: bookId })
      .first();
      
    if (!book) {
      return notFoundResponse(res, 'Book');
    }
    
    // Count copies by status
    const copiesCount = await db('book_copies')
      .where({ book_id: bookId })
      .count('id as total')
      .first();
      
    const availableCopies = await db('book_copies')
      .where({ 
        book_id: bookId,
        status: 'Available'
      })
      .count('id as count')
      .first();
      
    const checkedOutCopies = await db('book_copies')
      .where({ 
        book_id: bookId,
        status: 'Checked Out'
      })
      .count('id as count')
      .first();
      
    const damagedCopies = await db('book_copies')
      .where({ 
        book_id: bookId,
        status: 'Damaged'
      })
      .count('id as count')
      .first();
      
    const lostCopies = await db('book_copies')
      .where({ 
        book_id: bookId,
        status: 'Lost'
      })
      .count('id as count')
      .first();
      
    // Get next available return date for checked out copies
    const nextAvailableCopy = await db('loans')
      .join('book_copies', 'loans.book_copy_id', 'book_copies.id')
      .where({ 
        'book_copies.book_id': bookId,
        'loans.status': 'Borrowed'
      })
      .whereNull('loans.return_date')
      .orderBy('loans.due_date', 'asc')
      .select('loans.due_date')
      .first();
      
    // Format availability information
    const availability = {
      bookId: parseInt(bookId),
      totalCopies: copiesCount.total || 0,
      availableCopies: availableCopies.count || 0,
      checkedOutCopies: checkedOutCopies.count || 0,
      damagedCopies: damagedCopies.count || 0,
      lostCopies: lostCopies.count || 0,
      nextAvailableDate: nextAvailableCopy ? nextAvailableCopy.due_date : null
    };
    
    return successResponse(res, { availability });
  } catch (error) {
    console.error('Error fetching book availability:', error);
    throw error;
  }
});

module.exports = {
  getAllBookCopies,
  getBookCopyById,
  getBookCopiesByBookId,
  addBookCopy,
  updateBookCopy,
  deleteBookCopy,
  moveBookCopy,
  getBookAvailability,
  updateBookCopyStatus
}; 