const { Order } = require('../models/order.model');
const { Test } = require('../models/test.model');

class OrderUpdateService {
  constructor() {
    this.validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    this.updatableStatuses = ['pending', 'confirmed'];
  }

  async validateOrderForUpdate(orderId) {
    try {
      const order = await Order.findOne({ orderId });
      
      if (!order) {
        return {
          valid: false,
          error: 'Order not found'
        };
      }

      // Check if order can be updated (not completed or cancelled)
      if (!this.updatableStatuses.includes(order.status)) {
        return {
          valid: false,
          error: `Order cannot be updated. Current status: ${order.status}`,
          currentStatus: order.status
        };
      }

      return {
        valid: true,
        order
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async validateTestExists(testName) {
    try {
      const test = await Test.findOne({ testName });
      
      if (!test) {
        return {
          valid: false,
          error: `Test "${testName}" not found in available tests`
        };
      }

      return {
        valid: true,
        test
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async checkTestInOrder(orderId, testName) {
    try {
      const order = await Order.findOne({ orderId });
      
      if (!order) {
        return {
          found: false,
          error: 'Order not found'
        };
      }

      const testExists = order.tests.includes(testName);
      
      return {
        found: true,
        exists: testExists,
        order
      };
    } catch (error) {
      return {
        found: false,
        error: error.message
      };
    }
  }

  async addTestToOrder(orderId, testName, confirmationSessionId = null) {
    try {
      // Validate order can be updated
      const orderValidation = await this.validateOrderForUpdate(orderId);
      if (!orderValidation.valid) {
        return {
          success: false,
          error: orderValidation.error
        };
      }

      // Validate test exists
      const testValidation = await this.validateTestExists(testName);
      if (!testValidation.valid) {
        return {
          success: false,
          error: testValidation.error
        };
      }

      // Check if test already in order
      const testCheck = await this.checkTestInOrder(orderId, testName);
      if (testCheck.exists) {
        return {
          success: false,
          error: `Test "${testName}" is already in the order`,
          currentTests: testCheck.order.tests
        };
      }

      // Add test to order
      const updatedOrder = await Order.findOneAndUpdate(
        { orderId },
        { 
          $push: { tests: testName },
          $set: { updatedAt: new Date() }
        },
        { new: true }
      );

      if (!updatedOrder) {
        return {
          success: false,
          error: 'Failed to update order'
        };
      }

      return {
        success: true,
        data: updatedOrder,
        message: `Test "${testName}" added to order successfully`,
        confirmationSessionId
      };
    } catch (error) {
      console.error('Error adding test to order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async removeTestFromOrder(orderId, testName, confirmationSessionId = null) {
    try {
      // Validate order can be updated
      const orderValidation = await this.validateOrderForUpdate(orderId);
      if (!orderValidation.valid) {
        return {
          success: false,
          error: orderValidation.error
        };
      }

      // Check if test exists in order
      const testCheck = await this.checkTestInOrder(orderId, testName);
      if (!testCheck.exists) {
        return {
          success: false,
          error: `Test "${testName}" is not in the order`,
          currentTests: testCheck.order.tests
        };
      }

      // Remove test from order
      const updatedOrder = await Order.findOneAndUpdate(
        { orderId },
        { 
          $pull: { tests: testName },
          $set: { updatedAt: new Date() }
        },
        { new: true }
      );

      if (!updatedOrder) {
        return {
          success: false,
          error: 'Failed to update order'
        };
      }

      return {
        success: true,
        data: updatedOrder,
        message: `Test "${testName}" removed from order successfully`,
        confirmationSessionId
      };
    } catch (error) {
      console.error('Error removing test from order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateOrderStatus(orderId, newStatus, confirmationSessionId = null) {
    try {
      // Validate new status
      if (!this.validStatuses.includes(newStatus)) {
        return {
          success: false,
          error: `Invalid status. Valid statuses: ${this.validStatuses.join(', ')}`
        };
      }

      // Get current order
      const order = await Order.findOne({ orderId });
      if (!order) {
        return {
          success: false,
          error: 'Order not found'
        };
      }

      // Validate status transition
      const transitionValid = this.validateStatusTransition(order.status, newStatus);
      if (!transitionValid.valid) {
        return {
          success: false,
          error: transitionValid.error
        };
      }

      // Update status
      const updatedOrder = await Order.findOneAndUpdate(
        { orderId },
        { 
          $set: { 
            status: newStatus,
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      return {
        success: true,
        data: updatedOrder,
        message: `Order status updated from "${order.status}" to "${newStatus}"`,
        confirmationSessionId
      };
    } catch (error) {
      console.error('Error updating order status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  validateStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['completed', 'cancelled'],
      'completed': [], // Terminal state
      'cancelled': []  // Terminal state
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
      return {
        valid: false,
        error: `Cannot transition from "${currentStatus}" to "${newStatus}". Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
      };
    }

    return { valid: true };
  }

  async bulkUpdateTests(orderId, testsToAdd, testsToRemove, confirmationSessionId = null) {
    try {
      // Validate order can be updated
      const orderValidation = await this.validateOrderForUpdate(orderId);
      if (!orderValidation.valid) {
        return {
          success: false,
          error: orderValidation.error
        };
      }

      const updates = {};
      
      if (testsToAdd && testsToAdd.length > 0) {
        // Validate all tests to add exist
        for (const testName of testsToAdd) {
          const testValidation = await this.validateTestExists(testName);
          if (!testValidation.valid) {
            return {
              success: false,
              error: `Test "${testName}" validation failed: ${testValidation.error}`
            };
          }
        }
        updates.$push = { tests: { $each: testsToAdd } };
      }

      if (testsToRemove && testsToRemove.length > 0) {
        updates.$pull = { tests: { $in: testsToRemove } };
      }

      updates.$set = { updatedAt: new Date() };

      const updatedOrder = await Order.findOneAndUpdate(
        { orderId },
        updates,
        { new: true }
      );

      if (!updatedOrder) {
        return {
          success: false,
          error: 'Failed to update order'
        };
      }

      return {
        success: true,
        data: updatedOrder,
        message: 'Order updated successfully',
        addedTests: testsToAdd || [],
        removedTests: testsToRemove || [],
        confirmationSessionId
      };
    } catch (error) {
      console.error('Error performing bulk update:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getOrderUpdateHistory(orderId) {
    try {
      const order = await Order.findOne({ orderId });
      
      if (!order) {
        return {
          success: false,
          error: 'Order not found'
        };
      }

      // This would typically query an audit log table
      // For now, return basic order information
      return {
        success: true,
        data: {
          orderId,
          currentTests: order.tests,
          status: order.status,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        },
        message: 'Order information retrieved'
      };
    } catch (error) {
      console.error('Error getting order history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new OrderUpdateService();
