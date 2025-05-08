/**
 * Member Controller
 * Handles API requests related to library members
 */

const { 
  successResponse, 
  notFoundResponse, 
  errorResponse, 
  asyncHandler 
} = require('./baseController');
const { Member, Loan } = require('../models');

/**
 * Get all members
 * @route GET /api/members
 */
const getAllMembers = asyncHandler(async (req, res) => {
  try {
    const db = await require('../database/db').getDb();
    const members = await db('members').select('*');
    return successResponse(res, { members });
  } catch (error) {
    console.error('Error fetching all members:', error);
    throw error;
  }
});

/**
 * Get member by ID
 * @route GET /api/members/:id
 */
const getMemberById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const db = await require('../database/db').getDb();
    
    const member = await db('members')
      .where({ id })
      .first();
    
    if (!member) {
      return notFoundResponse(res, 'Member');
    }
    
    // Include member statistics if requested
    if (req.query.includeStats === 'true') {
      // Get statistics data
      // Get active loans count
      const activeLoansCount = await db('loans')
        .where({ 
          member_id: id,
          status: 'Borrowed'
        })
        .whereNull('return_date')
        .count('id as count')
        .first()
        .then(result => result.count);
      
      // Get total loans count
      const totalLoansCount = await db('loans')
        .where({ member_id: id })
        .count('id as count')
        .first()
        .then(result => result.count);
      
      // Get overdue loans count
      const overdueLoansCount = await db('loans')
        .where({ 
          member_id: id,
          status: 'Borrowed'
        })
        .whereNull('return_date')
        .where('due_date', '<', new Date())
        .count('id as count')
        .first()
        .then(result => result.count);
      
      // Return with statistics
      return successResponse(res, {
        member,
        statistics: {
          activeLoans: activeLoansCount,
          totalLoans: totalLoansCount,
          overdueLoans: overdueLoansCount
        }
      });
    }
    
    return successResponse(res, { member });
  } catch (error) {
    console.error('Error fetching member:', error);
    throw error;
  }
});

/**
 * Get member by email
 * @route GET /api/members/email/:email
 */
const getMemberByEmail = asyncHandler(async (req, res) => {
  try {
    const { email } = req.params;
    const db = await require('../database/db').getDb();
    
    const member = await db('members')
      .where({ email })
      .first();
    
    if (!member) {
      return notFoundResponse(res, 'Member');
    }
    
    return successResponse(res, { member });
  } catch (error) {
    console.error('Error fetching member by email:', error);
    throw error;
  }
});

/**
 * Get member by PIN or QR code
 * @route POST /api/members/lookup
 */
const getMemberByCredential = asyncHandler(async (req, res) => {
  try {
    const { credential } = req.body;
    const db = await require('../database/db').getDb();
    
    if (!credential) {
      return errorResponse(res, 'PIN or QR code is required', 400);
    }
    
    const member = await db('members')
      .where({ pin: credential })
      .orWhere({ qr_code: credential })
      .first();
    
    if (!member) {
      return notFoundResponse(res, 'Member');
    }
    
    return successResponse(res, { member });
  } catch (error) {
    console.error('Error looking up member by credential:', error);
    throw error;
  }
});

/**
 * Search for members
 * @route GET /api/members/search
 */
const searchMembers = asyncHandler(async (req, res) => {
  try {
    const { query } = req.query;
    const db = await require('../database/db').getDb();
    
    if (!query || query.trim() === '') {
      return errorResponse(res, 'Search query is required', 400);
    }
    
    const members = await db('members')
      .where('name', 'like', `%${query}%`)
      .orWhere('email', 'like', `%${query}%`)
      .select('*');
    
    return successResponse(res, { 
      query, 
      members 
    });
  } catch (error) {
    console.error('Error searching members:', error);
    throw error;
  }
});

/**
 * Add a new member
 * @route POST /api/members
 */
const addMember = asyncHandler(async (req, res) => {
  try {
    const memberData = req.body;
    const db = await require('../database/db').getDb();
    
    // Basic validation
    if (!memberData.name) {
      return errorResponse(res, 'Member name is required', 400);
    }
    
    // Check if email already exists
    if (memberData.email) {
      const existingMember = await db('members')
        .where({ email: memberData.email })
        .first();
        
      if (existingMember) {
        return errorResponse(res, 'Email already in use', 400);
      }
    }
    
    // Set timestamps
    const now = new Date();
    memberData.created_at = now;
    memberData.updated_at = now;
    
    // Generate QR code if not provided
    if (!memberData.qr_code) {
      memberData.qr_code = `MEM-${Date.now()}-${Math.floor(Math.random() * 100)}`;
    }
    
    // Add the member
    const [member] = await db('members')
      .insert(memberData)
      .returning('*');
      
    return successResponse(res, { 
      message: 'Member added successfully', 
      member 
    }, 201);
  } catch (error) {
    console.error('Error adding member:', error);
    throw error;
  }
});

/**
 * Update a member
 * @route PUT /api/members/:id
 */
const updateMember = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const db = await require('../database/db').getDb();
    
    // Check if member exists
    const existingMember = await db('members')
      .where({ id })
      .first();
      
    if (!existingMember) {
      return notFoundResponse(res, 'Member');
    }
    
    // If updating email, check if it's already in use
    if (updates.email) {
      const emailCheck = await db('members')
        .where({ email: updates.email })
        .whereNot({ id })
        .first();
        
      if (emailCheck) {
        return errorResponse(res, 'Email already in use by another member', 400);
      }
    }
    
    // Set updated timestamp
    updates.updated_at = new Date();
    
    // Perform update
    const [updatedMember] = await db('members')
      .where({ id })
      .update(updates)
      .returning('*');
      
    return successResponse(res, { 
      message: 'Member updated successfully', 
      member: updatedMember 
    });
  } catch (error) {
    console.error('Error updating member:', error);
    throw error;
  }
});

/**
 * Delete a member
 * @route DELETE /api/members/:id
 */
const deleteMember = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const db = await require('../database/db').getDb();
    
    // Check if member exists
    const member = await db('members')
      .where({ id })
      .first();
      
    if (!member) {
      return notFoundResponse(res, 'Member');
    }
    
    // Check for active loans
    const activeLoans = await db('loans')
      .where({ 
        member_id: id,
        status: 'Borrowed'
      })
      .whereNull('return_date')
      .first();
      
    if (activeLoans) {
      return errorResponse(res, 'Cannot delete member: they have active loans', 400);
    }
    
    // Attempt to delete
    await db('members')
      .where({ id })
      .del();
      
    return successResponse(res, { 
      message: 'Member deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    throw error;
  }
});

/**
 * Get member's loans
 * @route GET /api/members/:id/loans
 */
const getMemberLoans = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get database connection
    const db = await require('../database/db').getDb();
    
    // Check if member exists
    const memberExists = await db('members')
      .where({ id })
      .first();
      
    if (!memberExists) {
      return notFoundResponse(res, 'Member');
    }
    
    // Get loans with optional filters
    const filters = {
      memberId: id
    };
    
    // Add status filter if provided
    if (req.query.status) {
      filters.status = req.query.status;
    }
    
    // Add overdue filter if requested
    if (req.query.overdueOnly === 'true') {
      filters.overdueOnly = true;
    }
    
    // Build query
    const query = db('loans')
      .join('book_copies', 'loans.book_copy_id', 'book_copies.id')
      .join('books', 'book_copies.book_id', 'books.id')
      .join('members', 'loans.member_id', 'members.id')
      .where('loans.member_id', id)
      .select(
        'loans.*',
        'books.title as book_title',
        'books.author as book_author',
        'books.isbn as book_isbn',
        'book_copies.copy_number',
        'book_copies.status as copy_status',
        'members.name as member_name',
        'members.email as member_email'
      )
      .orderBy('loans.checkout_date', 'desc');
    
    // Apply filters if provided
    if (filters.status) {
      query.where('loans.status', filters.status);
    }
    
    if (filters.overdueOnly) {
      query.whereNull('loans.return_date')
        .where('loans.due_date', '<', new Date())
        .where('loans.status', 'Borrowed');
    }

    const loans = await query;
    
    return successResponse(res, { loans });
  } catch (error) {
    console.error('Error fetching member loans:', error);
    throw error;
  }
});

/**
 * Get member statistics - test version with debugging info
 * @route GET /api/members/:id/stats-debug
 */
const getMemberStatsDebug = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Request received for member stats debug for ID: ${id}`);
    
    // Get database connection
    const db = await require('../database/db').getDb();
    console.log(`Database connection established`);
    
    // Check if member exists
    const memberExists = await db('members')
      .where({ id })
      .first();
    console.log(`Member check completed: ${memberExists ? 'Found' : 'Not found'}`);
      
    if (!memberExists) {
      console.log(`Member not found with ID: ${id}`);
      return notFoundResponse(res, 'Member');
    }
    
    // Get active loans count
    const activeLoansQuery = db('loans')
      .where({ 
        member_id: id,
        status: 'Borrowed'
      })
      .whereNull('return_date')
      .count('id as count');
    console.log(`Active loans query: ${activeLoansQuery.toString()}`);
    
    const activeLoansResult = await activeLoansQuery.first();
    const activeLoansCount = activeLoansResult ? activeLoansResult.count : 0;
    console.log(`Active loans count: ${activeLoansCount}`);
    
    // Get total loans count
    const totalLoansQuery = db('loans')
      .where({ member_id: id })
      .count('id as count');
    console.log(`Total loans query: ${totalLoansQuery.toString()}`);
    
    const totalLoansResult = await totalLoansQuery.first();
    const totalLoansCount = totalLoansResult ? totalLoansResult.count : 0;
    console.log(`Total loans count: ${totalLoansCount}`);
    
    // Get overdue loans count
    const overdueLoansQuery = db('loans')
      .where({ 
        member_id: id,
        status: 'Borrowed'
      })
      .whereNull('return_date')
      .where('due_date', '<', new Date());
    console.log(`Overdue loans query: ${overdueLoansQuery.toString()}`);
    
    const overdueLoansResult = await overdueLoansQuery.count('id as count').first();
    const overdueLoansCount = overdueLoansResult ? overdueLoansResult.count : 0;
    console.log(`Overdue loans count: ${overdueLoansCount}`);
    
    // Get total fine amount
    const totalFinesQuery = db('loans')
      .where({ member_id: id })
      .whereNotNull('fine_amount')
      .sum('fine_amount as total');
    console.log(`Total fines query: ${totalFinesQuery.toString()}`);
    
    const totalFinesResult = await totalFinesQuery.first();
    const totalFines = totalFinesResult && totalFinesResult.total ? totalFinesResult.total : 0;
    console.log(`Total fines: ${totalFines}`);
    
    // Get unpaid fine amount
    const unpaidFinesQuery = db('loans')
      .where({ 
        member_id: id,
        fine_paid: false
      })
      .whereNotNull('fine_amount')
      .sum('fine_amount as total');
    console.log(`Unpaid fines query: ${unpaidFinesQuery.toString()}`);
    
    const unpaidFinesResult = await unpaidFinesQuery.first();
    const unpaidFines = unpaidFinesResult && unpaidFinesResult.total ? unpaidFinesResult.total : 0;
    console.log(`Unpaid fines: ${unpaidFines}`);
    
    // Get member since date
    const memberSince = memberExists.created_at;
    console.log(`Member since: ${memberSince}`);
    
    // Create statistics object
    const stats = {
      activeLoans: activeLoansCount,
      totalLoans: totalLoansCount,
      overdueLoans: overdueLoansCount,
      totalFines,
      unpaidFines,
      memberSince,
      debug: {
        memberFound: !!memberExists,
        queries: {
          activeLoans: activeLoansQuery.toString(),
          totalLoans: totalLoansQuery.toString(),
          overdueLoans: overdueLoansQuery.toString(),
          totalFines: totalFinesQuery.toString(),
          unpaidFines: unpaidFinesQuery.toString()
        }
      }
    };
    console.log(`Statistics compiled successfully`);
    
    // Return statistics
    return successResponse(res, stats);
  } catch (error) {
    console.error('Error fetching member statistics (debug):', error);
    return errorResponse(res, `Statistics error: ${error.message}`, 500);
  }
});

/**
 * Get member statistics
 * @route GET /api/members/:id/statistics
 */
const getMemberStatistics = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get database connection
    const db = await require('../database/db').getDb();
    
    // Check if member exists
    const memberExists = await db('members')
      .where({ id })
      .first();
      
    if (!memberExists) {
      return notFoundResponse(res, 'Member');
    }
    
    // Use more defensive coding with null checks
    // Get active loans count
    const activeLoansResult = await db('loans')
      .where({ 
        member_id: id,
        status: 'Borrowed'
      })
      .whereNull('return_date')
      .count('id as count')
      .first();
    const activeLoansCount = activeLoansResult ? parseInt(activeLoansResult.count, 10) : 0;
    
    // Get total loans count
    const totalLoansResult = await db('loans')
      .where({ member_id: id })
      .count('id as count')
      .first();
    const totalLoansCount = totalLoansResult ? parseInt(totalLoansResult.count, 10) : 0;
    
    // Get overdue loans count
    const overdueLoansResult = await db('loans')
      .where({ 
        member_id: id,
        status: 'Borrowed'
      })
      .whereNull('return_date')
      .where('due_date', '<', new Date())
      .count('id as count')
      .first();
    const overdueLoansCount = overdueLoansResult ? parseInt(overdueLoansResult.count, 10) : 0;
    
    // Get returned loans count
    const returnedLoansResult = await db('loans')
      .where({ 
        member_id: id,
        status: 'Returned'
      })
      .orWhere(function() {
        this.where({ member_id: id })
            .whereNotNull('return_date');
      })
      .count('id as count')
      .first();
    const returnedLoansCount = returnedLoansResult ? parseInt(returnedLoansResult.count, 10) : 0;
    
    // Get total fine amount
    const totalFinesResult = await db('loans')
      .where({ member_id: id })
      .whereNotNull('fine_amount')
      .sum('fine_amount as total')
      .first();
    const totalFines = totalFinesResult && totalFinesResult.total ? parseFloat(totalFinesResult.total) : 0;
    
    // Get unpaid fine amount
    const unpaidFinesResult = await db('loans')
      .where({ 
        member_id: id,
        fine_paid: false
      })
      .whereNotNull('fine_amount')
      .sum('fine_amount as total')
      .first();
    const unpaidFines = unpaidFinesResult && unpaidFinesResult.total ? parseFloat(unpaidFinesResult.total) : 0;
    
    // Get member since date from the memberExists object we already retrieved
    const memberSince = memberExists.created_at;
    
    // Return statistics
    return successResponse(res, {
      activeLoans: activeLoansCount,
      totalLoans: totalLoansCount,
      overdueLoans: overdueLoansCount,
      returnedLoans: returnedLoansCount,
      totalFines,
      unpaidFines,
      memberSince
    });
  } catch (error) {
    console.error('Error fetching member statistics:', error);
    // Return a user-friendly error
    return errorResponse(res, 'Failed to retrieve member statistics', 500);
  }
});

/**
 * Authenticate a member with email and PIN
 * @route POST /api/members/member-login
 */
const authenticateMember = asyncHandler(async (req, res) => {
  try {
    const { email, pin } = req.body;
    
    if (!email || !pin) {
      return errorResponse(res, 'Email and PIN are required', 400);
    }
    
    // Get database connection
    const db = await require('../database/db').getDb();
    
    // Get member by email
    try {
      const member = await db('members')
        .where({ email })
        .first();
      
      if (!member) {
        return errorResponse(res, 'Invalid email or PIN', 401);
      }
      
      console.log(member);
      // Verify PIN matches
      if (member.pin === pin) {
        // Generate JWT token for the member
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        
        const token = jwt.sign(
          { 
            id: member.id, 
            email: member.email,
            role: 'member' // Members have a 'member' role
          }, 
          JWT_SECRET, 
          { expiresIn: '8h' }
        );
        
        return successResponse(res, { member, token });
      } else {
        return errorResponse(res, 'Invalid PIN', 401);
      }
    } catch (error) {
      console.error('Error during authentication:', error);
      return errorResponse(res, 'Invalid email or PIN', 401);
    }
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
});

/**
 * Authenticate a member with QR code
 * @route POST /api/members/qr-login
 */
const authenticateByQRCode = asyncHandler(async (req, res) => {
  try {
    const { qr_code } = req.body;
    
    if (!qr_code) {
      return errorResponse(res, 'QR code is required', 400);
    }
    
    // Get database connection
    const db = await require('../database/db').getDb();
    
    // Get member by QR code
    try {
      const member = await db('members')
        .where({ qr_code })
        .first();
      
      if (!member) {
        return errorResponse(res, 'Invalid QR code', 401);
      }
      
      // Generate JWT token for the member
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      
      const token = jwt.sign(
        { 
          id: member.id, 
          email: member.email,
          role: 'member' // Members have a 'member' role
        }, 
        JWT_SECRET, 
        { expiresIn: '8h' }
      );
      
      console.log(`Member authenticated successfully via QR code: ${member.name}`);
      return successResponse(res, { member, token });
    } catch (error) {
      console.error('Error during QR authentication:', error);
      return errorResponse(res, 'Invalid QR code', 401);
    }
  } catch (error) {
    console.error('QR authentication error:', error);
    throw error;
  }
});

module.exports = {
  getAllMembers,
  getMemberById,
  getMemberByEmail,
  getMemberByCredential,
  searchMembers,
  addMember,
  updateMember,
  deleteMember,
  getMemberLoans,
  getMemberStatistics,
  getMemberStatsDebug,
  getMemberStats: getMemberStatistics,
  authenticateMember,
  authenticateByQRCode
}; 