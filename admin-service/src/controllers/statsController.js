// src/controllers/statsController.js
const Order = require('../models/orderModel');
const User = require('../models/userModel');

// @desc    Get dashboard statistics
// @route   GET /api/stats/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    // Get order statistics
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const processingOrders = await Order.countDocuments({ status: 'processing' });
    const shippedOrders = await Order.countDocuments({ status: 'shipped' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });
    
    // Get payment statistics
    const totalRevenue = await Order.aggregate([
      { $match: { isPaid: true } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    
    const revenueThisMonth = await Order.aggregate([
      { 
        $match: { 
          isPaid: true,
          paidAt: { 
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
          }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const newUsersThisMonth = await User.countDocuments({
      registeredDate: { 
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
      }
    });
    
    // Get discount statistics
    const ordersWithDiscount = await Order.countDocuments({
      discountApplied: { $gt: 0 }
    });
    
    const totalDiscountAmount = await Order.aggregate([
      { $match: { discountApplied: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$discountApplied' } } }
    ]);
    
    res.json({
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders
      },
      revenue: {
        total: totalRevenue.length > 0 ? totalRevenue[0].totalRevenue : 0,
        thisMonth: revenueThisMonth.length > 0 ? revenueThisMonth[0].total : 0
      },
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth
      },
      discounts: {
        ordersWithDiscount,
        totalDiscountAmount: totalDiscountAmount.length > 0 ? totalDiscountAmount[0].total : 0
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get sales report
// @route   GET /api/stats/sales
// @access  Private/Admin
const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = { isPaid: true };
    
    if (startDate && endDate) {
      dateFilter.paidAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Get daily sales
    const dailySales = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { 
            $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } 
          },
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get product sales
    const productSales = await Order.aggregate([
      { $match: dateFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);
    
    res.json({
      dailySales,
      productSales
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get user statistics
// @route   GET /api/stats/users
// @access  Private/Admin
const getUserStats = async (req, res) => {
  try {
    // Get user registration stats by month
    const userRegistrationsByMonth = await User.aggregate([
      {
        $group: {
          _id: { 
            month: { $month: '$registeredDate' },
            year: { $year: '$registeredDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // Get active vs inactive users
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });
    
    res.json({
      registrationsByMonth: userRegistrationsByMonth,
      activeUsers,
      inactiveUsers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getDashboardStats,
  getSalesReport,
  getUserStats
};