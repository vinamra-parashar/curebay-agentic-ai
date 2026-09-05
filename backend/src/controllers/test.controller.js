const { Test } = require('../models/test.model')

async function getAllTests(req, res) {
  try {
    const tests = await Test.find({})
    res.json(tests)
  } catch (error) {
    console.error('Error fetching tests:', error)
    res.status(500).json({ message: 'Something went wrong' })
  }
}

async function getTestById(req, res) {
  try {
    const test = await Test.findOne({ testId: req.params.id })
    if (!test) {
      return res.status(404).json({ message: 'Test not found' })
    }
    res.json(test)
  } catch (error) {
    console.error('Error fetching test:', error)
    res.status(500).json({ message: 'Something went wrong' })
  }
}

async function createTest(req, res) {
  try {
    const test = await Test.findOneAndUpdate(
      { testId: req.body.testId },
      req.body,
      { new: true, upsert: true }
    )
    res.status(201).json({ message: 'Test created/updated successfully', test })
  } catch (error) {
    console.error('Error creating test:', error)
    res.status(500).json({ message: 'Something went wrong' })
  }
}

module.exports = {
  getAllTests,
  getTestById,
  createTest
}
