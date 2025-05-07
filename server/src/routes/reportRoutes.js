/**
 * Report Routes
 * Handles all report-related API endpoints
 */

const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { 
  getAllBooks, 
  getAllMembers, 
  getAllLoans, 
  getOverdueLoans,
  getDashboardStats, 
  getMostPopularBooks,
  getPopularCategories
} = require('../database/db');

/**
 * @route GET /api/reports/dashboard/pdf
 * @desc Generate PDF for dashboard report
 * @access Private
 */
router.get('/dashboard/pdf', async (req, res) => {
  try {
    // Create a PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Dashboard_Report.pdf');
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Add content to the PDF
    doc.fontSize(25).text('Library Dashboard Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);
    
    // Get dashboard statistics
    const statsResult = await getDashboardStats();
    const stats = statsResult.success ? statsResult.data : {};
    
    // Add statistics to the PDF
    doc.fontSize(16).text('System Statistics', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Total Books: ${stats.totalBooks || 0}`);
    doc.text(`Active Members: ${stats.activeMembers || 0}`);
    doc.text(`Books Checked Out: ${stats.booksCheckedOut || 0}`);
    doc.text(`Pending Returns: ${stats.pendingReturns || 0}`);
    doc.moveDown(2);
    
    // Get popular books
    const popularBooksResult = await getMostPopularBooks(10);
    const popularBooks = popularBooksResult.success ? popularBooksResult.data : [];
    
    // Add popular books to the PDF
    doc.fontSize(16).text('Most Popular Books', { underline: true });
    doc.moveDown();
    
    if (popularBooks.length > 0) {
      popularBooks.forEach((book, index) => {
        doc.text(`${index + 1}. ${book.title} by ${book.author || 'Unknown'} - ${book.borrow_count || 0} checkouts`);
      });
    } else {
      doc.text('No checkout data available');
    }
    
    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Error generating dashboard PDF:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate dashboard PDF',
      error: error.message
    });
  }
});

/**
 * @route GET /api/reports/books/pdf
 * @desc Generate PDF for books inventory report
 * @access Private
 */
router.get('/books/pdf', async (req, res) => {
  try {
    // Create a PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Books_Inventory_Report.pdf');
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Add content to the PDF
    doc.fontSize(25).text('Books Inventory Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);
    
    // Get books data
    const booksResult = await getAllBooks();
    const books = Array.isArray(booksResult) ? booksResult : [];
    
    // Add books count statistics
    const availableBooks = books.filter(book => book.status === 'Available').length;
    const checkedOutBooks = books.filter(book => book.status === 'Checked Out').length;
    
    doc.fontSize(16).text('Book Statistics', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Total Books: ${books.length}`);
    doc.text(`Available Books: ${availableBooks}`);
    doc.text(`Checked Out Books: ${checkedOutBooks}`);
    doc.moveDown(2);
    
    // Add books list
    doc.fontSize(16).text('Books List', { underline: true });
    doc.moveDown();
    
    if (books.length > 0) {
      // Create a simple table-like layout
      const tableTop = doc.y;
      let tableRow = tableTop;
      
      // Table headers
      doc.fontSize(10).text('Title', 50, tableRow, { width: 200 });
      doc.text('Author', 250, tableRow, { width: 150 });
      doc.text('Category', 400, tableRow, { width: 100 });
      doc.text('Status', 500, tableRow);
      
      tableRow += 20;
      doc.moveTo(50, tableRow - 10).lineTo(550, tableRow - 10).stroke();
      
      // Table data
      const booksPerPage = 20;
      const firstPageBooks = Math.min(books.length, booksPerPage);
      
      for (let i = 0; i < firstPageBooks; i++) {
        const book = books[i];
        
        doc.fontSize(9).text(book.title || 'Unknown', 50, tableRow, { width: 200 });
        doc.text(book.author || 'Unknown', 250, tableRow, { width: 150 });
        doc.text(book.category || 'Uncategorized', 400, tableRow, { width: 100 });
        doc.text(book.status || 'Unknown', 500, tableRow);
        
        tableRow += 20;
        
        // Add a separator line
        doc.moveTo(50, tableRow - 10).lineTo(550, tableRow - 10).stroke('#CCCCCC');
        
        // Add a new page if we're getting close to the bottom
        if (tableRow > 700) {
          doc.addPage();
          tableRow = 50;
          
          // Add headers to the new page
          doc.fontSize(10).text('Title', 50, tableRow, { width: 200 });
          doc.text('Author', 250, tableRow, { width: 150 });
          doc.text('Category', 400, tableRow, { width: 100 });
          doc.text('Status', 500, tableRow);
          
          tableRow += 20;
          doc.moveTo(50, tableRow - 10).lineTo(550, tableRow - 10).stroke();
        }
      }
      
      // Continue with remaining books on new pages if needed
      if (books.length > booksPerPage) {
        doc.addPage();
        tableRow = 50;
        
        // Add headers to the new page
        doc.fontSize(10).text('Title', 50, tableRow, { width: 200 });
        doc.text('Author', 250, tableRow, { width: 150 });
        doc.text('Category', 400, tableRow, { width: 100 });
        doc.text('Status', 500, tableRow);
        
        tableRow += 20;
        doc.moveTo(50, tableRow - 10).lineTo(550, tableRow - 10).stroke();
        
        for (let i = booksPerPage; i < books.length; i++) {
          const book = books[i];
          
          doc.fontSize(9).text(book.title || 'Unknown', 50, tableRow, { width: 200 });
          doc.text(book.author || 'Unknown', 250, tableRow, { width: 150 });
          doc.text(book.category || 'Uncategorized', 400, tableRow, { width: 100 });
          doc.text(book.status || 'Unknown', 500, tableRow);
          
          tableRow += 20;
          
          // Add a separator line
          doc.moveTo(50, tableRow - 10).lineTo(550, tableRow - 10).stroke('#CCCCCC');
          
          // Add a new page if we're getting close to the bottom
          if (tableRow > 700 && i < books.length - 1) {
            doc.addPage();
            tableRow = 50;
            
            // Add headers to the new page
            doc.fontSize(10).text('Title', 50, tableRow, { width: 200 });
            doc.text('Author', 250, tableRow, { width: 150 });
            doc.text('Category', 400, tableRow, { width: 100 });
            doc.text('Status', 500, tableRow);
            
            tableRow += 20;
            doc.moveTo(50, tableRow - 10).lineTo(550, tableRow - 10).stroke();
          }
        }
      }
    } else {
      doc.text('No books available');
    }
    
    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Error generating books PDF:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate books PDF',
      error: error.message
    });
  }
});

/**
 * @route GET /api/reports/members/pdf
 * @desc Generate PDF for members report
 * @access Private
 */
router.get('/members/pdf', async (req, res) => {
  try {
    // Create a PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Members_Report.pdf');
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Add content to the PDF
    doc.fontSize(25).text('Members Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);
    
    // Get members data
    const membersResult = await getAllMembers();
    const members = Array.isArray(membersResult) ? membersResult : [];
    
    // Add members count statistics
    const activeMembers = members.filter(member => member.status === 'Active').length;
    const inactiveMembers = members.filter(member => member.status !== 'Active').length;
    
    doc.fontSize(16).text('Member Statistics', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Total Members: ${members.length}`);
    doc.text(`Active Members: ${activeMembers}`);
    doc.text(`Inactive Members: ${inactiveMembers}`);
    doc.moveDown(2);
    
    // Add members list
    doc.fontSize(16).text('Members List', { underline: true });
    doc.moveDown();
    
    if (members.length > 0) {
      // Create a simple table-like layout
      const tableTop = doc.y;
      let tableRow = tableTop;
      
      // Table headers
      doc.fontSize(10).text('Name', 50, tableRow, { width: 150 });
      doc.text('Email', 200, tableRow, { width: 200 });
      doc.text('Status', 400, tableRow, { width: 100 });
      
      tableRow += 20;
      doc.moveTo(50, tableRow - 10).lineTo(550, tableRow - 10).stroke();
      
      // Table data
      members.forEach((member, index) => {
        doc.fontSize(9).text(member.name || 'Unknown', 50, tableRow, { width: 150 });
        doc.text(member.email || 'N/A', 200, tableRow, { width: 200 });
        doc.text(member.status || 'Unknown', 400, tableRow, { width: 100 });
        
        tableRow += 20;
        
        // Add a separator line
        doc.moveTo(50, tableRow - 10).lineTo(550, tableRow - 10).stroke('#CCCCCC');
        
        // Add a new page if we're getting close to the bottom
        if (tableRow > 700 && index < members.length - 1) {
          doc.addPage();
          tableRow = 50;
          
          // Add headers to the new page
          doc.fontSize(10).text('Name', 50, tableRow, { width: 150 });
          doc.text('Email', 200, tableRow, { width: 200 });
          doc.text('Status', 400, tableRow, { width: 100 });
          
          tableRow += 20;
          doc.moveTo(50, tableRow - 10).lineTo(550, tableRow - 10).stroke();
        }
      });
    } else {
      doc.text('No members available');
    }
    
    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Error generating members PDF:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate members PDF',
      error: error.message
    });
  }
});

/**
 * @route GET /api/reports/loans/pdf
 * @desc Generate PDF for loans report
 * @access Private
 */
router.get('/loans/pdf', async (req, res) => {
  try {
    // Create a PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Loans_Report.pdf');
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Add content to the PDF
    doc.fontSize(25).text('Circulation Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);
    
    // Get loans data
    const loansResult = await getAllLoans();
    const loans = loansResult.success && Array.isArray(loansResult.data) ? loansResult.data : Array.isArray(loansResult) ? loansResult : [];
    
    const overdueLoansResult = await getOverdueLoans();
    const overdueLoans = overdueLoansResult.success && Array.isArray(overdueLoansResult.data) ? overdueLoansResult.data : Array.isArray(overdueLoansResult) ? overdueLoansResult : [];
    
    // Calculate statistics
    const activeLoans = loans.filter(loan => loan.status === 'Active' || loan.status === 'Borrowed').length;
    const returnedLoans = loans.filter(loan => loan.status === 'Returned').length;
    
    // Add statistics to the PDF
    doc.fontSize(16).text('Circulation Statistics', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Total Loans: ${loans.length}`);
    doc.text(`Active Loans: ${activeLoans}`);
    doc.text(`Returned Loans: ${returnedLoans}`);
    doc.text(`Overdue Items: ${overdueLoans.length}`);
    doc.moveDown(2);
    
    // Add loans list
    doc.fontSize(16).text('Recent Loans', { underline: true });
    doc.moveDown();
    
    if (loans.length > 0) {
      // Create a simple table-like layout
      const tableTop = doc.y;
      let tableRow = tableTop;
      
      // Table headers
      doc.fontSize(10).text('Book Title', 50, tableRow, { width: 180 });
      doc.text('Member', 230, tableRow, { width: 120 });
      doc.text('Checkout Date', 350, tableRow, { width: 100 });
      doc.text('Due Date', 450, tableRow, { width: 100 });
      
      tableRow += 20;
      doc.moveTo(50, tableRow - 10).lineTo(550, tableRow - 10).stroke();
      
      // Table data (show only first 15 for space)
      const loansToShow = loans.slice(0, 15);
      
      loansToShow.forEach((loan) => {
        doc.fontSize(9).text(loan.book_title || 'Unknown', 50, tableRow, { width: 180 });
        doc.text(loan.member_name || 'Unknown', 230, tableRow, { width: 120 });
        doc.text(new Date(loan.checkout_date).toLocaleDateString() || 'N/A', 350, tableRow, { width: 100 });
        doc.text(new Date(loan.due_date).toLocaleDateString() || 'N/A', 450, tableRow, { width: 100 });
        
        tableRow += 20;
        
        // Add a separator line
        doc.moveTo(50, tableRow - 10).lineTo(550, tableRow - 10).stroke('#CCCCCC');
      });
    } else {
      doc.text('No loans available');
    }
    
    doc.moveDown(2);
    
    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Error generating loans PDF:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate loans PDF',
      error: error.message
    });
  }
});

/**
 * @route GET /api/reports/overdue/pdf
 * @desc Generate PDF for overdue items report
 * @access Private
 */
router.get('/overdue/pdf', async (req, res) => {
  try {
    // Create a PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Overdue_Items_Report.pdf');
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Add content to the PDF
    doc.fontSize(25).text('Overdue Items Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);
    
    // Get overdue loans
    const overdueLoansResult = await getOverdueLoans();
    const overdueLoans = overdueLoansResult.success && Array.isArray(overdueLoansResult.data) ? overdueLoansResult.data : Array.isArray(overdueLoansResult) ? overdueLoansResult : [];
    
    // Add statistics to the PDF
    doc.fontSize(16).text('Overdue Items Statistics', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Total Overdue Items: ${overdueLoans.length}`);
    doc.moveDown(2);
    
    // Add overdue items list
    doc.fontSize(16).text('Overdue Items List', { underline: true });
    doc.moveDown();
    
    if (overdueLoans.length > 0) {
      // Create a simple table-like layout
      const tableTop = doc.y;
      let tableRow = tableTop;
      
      // Table headers
      doc.fontSize(10).text('Book Title', 50, tableRow, { width: 180 });
      doc.text('Member', 230, tableRow, { width: 120 });
      doc.text('Due Date', 350, tableRow, { width: 100 });
      doc.text('Days Overdue', 450, tableRow, { width: 100 });
      
      tableRow += 20;
      doc.moveTo(50, tableRow - 10).lineTo(550, tableRow - 10).stroke();
      
      // Table data
      overdueLoans.forEach((loan) => {
        // Calculate days overdue
        const dueDate = new Date(loan.due_date);
        const today = new Date();
        const diffTime = Math.abs(today - dueDate);
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        doc.fontSize(9).text(loan.book_title || 'Unknown', 50, tableRow, { width: 180 });
        doc.text(loan.member_name || 'Unknown', 230, tableRow, { width: 120 });
        doc.text(new Date(loan.due_date).toLocaleDateString() || 'N/A', 350, tableRow, { width: 100 });
        doc.text(daysOverdue.toString(), 450, tableRow, { width: 100 });
        
        tableRow += 20;
        
        // Add a separator line
        doc.moveTo(50, tableRow - 10).lineTo(550, tableRow - 10).stroke('#CCCCCC');
        
        // Add a new page if we're getting close to the bottom
        if (tableRow > 700 && overdueLoans.indexOf(loan) < overdueLoans.length - 1) {
          doc.addPage();
          tableRow = 50;
          
          // Add headers to the new page
          doc.fontSize(10).text('Book Title', 50, tableRow, { width: 180 });
          doc.text('Member', 230, tableRow, { width: 120 });
          doc.text('Due Date', 350, tableRow, { width: 100 });
          doc.text('Days Overdue', 450, tableRow, { width: 100 });
          
          tableRow += 20;
          doc.moveTo(50, tableRow - 10).lineTo(550, tableRow - 10).stroke();
        }
      });
    } else {
      doc.text('No overdue items available');
    }
    
    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Error generating overdue items PDF:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate overdue items PDF',
      error: error.message
    });
  }
});

module.exports = router; 