/**
 * Shelf Controller
 * Handles API requests related to library shelves
 */

const { 
  successResponse, 
  notFoundResponse, 
  errorResponse, 
  asyncHandler 
} = require('./baseController');
const { Shelf, BookCopy } = require('../models');

/**
 * Get all shelves
 * @route GET /api/shelves
 */
const getAllShelves = asyncHandler(async (req, res) => {
  // Include book counts if requested
  if (req.query.includeCounts === 'true') {
    const shelves = await Shelf.getAllShelvesWithCounts();
    return successResponse(res, { shelves });
  }
  
  const shelves = await Shelf.getAllShelves();
  return successResponse(res, { shelves });
});

/**
 * Get shelf by ID
 * @route GET /api/shelves/:id
 */
const getShelfById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    // Include books if requested
    if (req.query.includeBooks === 'true') {
      const shelf = await Shelf.getShelfWithBooks(id);
      return successResponse(res, { shelf });
    }
    
    const shelf = await Shelf.getShelfById(id);
    return successResponse(res, { shelf });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Shelf');
    }
    throw error;
  }
});

/**
 * Get shelves by filter (location or category)
 * @route GET /api/shelves/filter
 */
const getShelvesByFilter = asyncHandler(async (req, res) => {
  const { filter, value } = req.query;
  
  if (!filter || !value) {
    return errorResponse(res, 'Filter type and value are required', 400);
  }
  
  if (filter !== 'location' && filter !== 'category') {
    return errorResponse(res, 'Invalid filter type. Use "location" or "category"', 400);
  }
  
  const shelves = await Shelf.getShelvesByFilter(filter, value);
  return successResponse(res, { 
    filter, 
    value, 
    shelves 
  });
});

/**
 * Get shelves by location
 * @route GET /api/shelves/location/:location
 */
const getShelvesByLocation = asyncHandler(async (req, res) => {
  const { location } = req.params;
  
  if (!location) {
    return errorResponse(res, 'Location is required', 400);
  }
  
  const shelves = await Shelf.getShelvesByFilter('location', location);
  return successResponse(res, { 
    location, 
    shelves 
  });
});

/**
 * Get books on a specific shelf
 * @route GET /api/shelves/:id/books
 */
const getShelfBooks = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if shelf exists
    await Shelf.getShelfById(id);
    
    // Get books on this shelf
    const books = await BookCopy.getBookCopiesByShelf(id);
    return successResponse(res, { books });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Shelf');
    }
    throw error;
  }
});

/**
 * Add a new shelf
 * @route POST /api/shelves
 */
const addShelf = asyncHandler(async (req, res) => {
  const shelfData = req.body;
  
  // Basic validation
  if (!shelfData.name) {
    return errorResponse(res, 'Shelf name is required', 400);
  }
  
  // Handle shelf_code to code mapping if needed
  if (shelfData.shelf_code !== undefined) {
    shelfData.code = shelfData.shelf_code;
    delete shelfData.shelf_code;
  } else {
    // Generate a default shelf code if not provided
    // Format: first 3 chars of location + first 3 chars of name + random 3-digit number
    const locationPrefix = (shelfData.location || '').substring(0, 3).toUpperCase();
    const namePrefix = (shelfData.name || '').substring(0, 3).toUpperCase();
    const randomNum = Math.floor(Math.random() * 900) + 100; // 100-999
    shelfData.code = `${locationPrefix}${namePrefix}${randomNum}`;
  }
  
  const shelf = await Shelf.addShelf(shelfData);
  return successResponse(res, { 
    message: 'Shelf added successfully', 
    shelf 
  }, 201);
});

/**
 * Update a shelf
 * @route PUT /api/shelves/:id
 */
const updateShelf = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    let updates = req.body;
    
    console.log(`Shelf update request for ID ${id}, data:`, typeof updates, JSON.stringify(updates));
    
    // Enhanced validation and handling of different input formats
    if (!updates) {
      return errorResponse(res, 'No update data provided', 400);
    }
    
    // Handle case where updates might be nested inside a 'shelf' property
    if (updates.shelf && typeof updates.shelf === 'object') {
      console.log('Detected nested shelf structure, extracting inner shelf data');
      updates = updates.shelf;
    }
    
    // Check if we have any data after extraction
    if (Object.keys(updates).length === 0) {
      return errorResponse(res, 'No valid fields provided for update', 400);
    }
    
    // Check if shelf exists
    await Shelf.getShelfById(id);
    
    // Handle shelf_code to code mapping if needed
    if (updates.shelf_code !== undefined) {
      updates.code = updates.shelf_code;
      delete updates.shelf_code;
    }
    
    // If code is being updated, verify it's not empty
    if (updates.code !== undefined && !updates.code) {
      return errorResponse(res, 'Shelf code cannot be empty', 400);
    }
    
    try {
      const updatedShelf = await Shelf.updateShelf(id, updates);
      return successResponse(res, { 
        message: 'Shelf updated successfully', 
        shelf: updatedShelf 
      });
    } catch (updateError) {
      console.error('Error updating shelf:', updateError);
      return errorResponse(res, `Failed to update shelf: ${updateError.message}`, 500);
    }
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Shelf');
    }
    throw error;
  }
});

/**
 * Delete a shelf
 * @route DELETE /api/shelves/:id
 */
const deleteShelf = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if shelf exists
    await Shelf.getShelfById(id);
    
    // Attempt to delete
    await Shelf.deleteShelf(id);
    return successResponse(res, { 
      message: 'Shelf deleted successfully' 
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Shelf');
    }
    if (error.message.includes('contains')) {
      return errorResponse(res, error.message, 400);
    }
    throw error;
  }
});

/**
 * Reassign books from one shelf to another
 * @route POST /api/shelves/reassign
 */
const reassignBooks = asyncHandler(async (req, res) => {
  try {
    const { sourceShelfId, targetShelfId } = req.body;
    
    if (!sourceShelfId || !targetShelfId) {
      return errorResponse(res, 'Source and target shelf IDs are required', 400);
    }
    
    // Verify the shelves exist
    await Shelf.getShelfById(sourceShelfId);
    await Shelf.getShelfById(targetShelfId);
    
    const bookCount = await Shelf.reassignBooks(sourceShelfId, targetShelfId);
    return successResponse(res, { 
      message: `${bookCount} books reassigned successfully`, 
      sourceShelfId, 
      targetShelfId, 
      bookCount 
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, error.message);
    }
    if (error.message.includes('no books')) {
      return errorResponse(res, error.message, 400);
    }
    throw error;
  }
});

/**
 * Relocate a shelf to a new location
 * @route POST /api/shelves/:id/relocate
 */
const relocateShelf = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { newLocation } = req.body;
    
    if (!newLocation) {
      return errorResponse(res, 'New location is required', 400);
    }
    
    // Check if shelf exists
    await Shelf.getShelfById(id);
    
    // Update the location
    const updatedShelf = await Shelf.updateShelf(id, { location: newLocation });
    return successResponse(res, { 
      message: 'Shelf relocated successfully', 
      shelf: updatedShelf 
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return notFoundResponse(res, 'Shelf');
    }
    throw error;
  }
});

/**
 * Get shelf capacity information
 * @route GET /api/shelves/capacity
 */
const getShelfCapacities = asyncHandler(async (req, res) => {
  const capacities = await Shelf.getShelfCapacities();
  return successResponse(res, { capacities });
});

module.exports = {
  getAllShelves,
  getShelfById,
  getShelvesByFilter,
  getShelvesByLocation,
  getShelfBooks,
  addShelf,
  updateShelf,
  deleteShelf,
  relocateShelf,
  reassignBooks,
  getShelfCapacities
}; 