const { MedicalHistory } = require('../models/medicalHistory.model')

async function getMedicalHistoryByPatientId(req, res) {
  try {
    const history = await MedicalHistory.findOne({ patientId: req.params.id })
    if (!history) {
      return res.status(404).json({ message: 'Medical history not found' })
    }
    res.json(history)
  } catch (error) {
    console.error('Error fetching medical history:', error)
    res.status(500).json({ message: 'Something went wrong' })
  }
}

async function createMedicalHistory(req, res) {
  try {
    const history = new MedicalHistory(req.body)
    await history.save()
    res.status(201).json({ message: 'Medical history created successfully', history })
  } catch (error) {
    console.error('Error creating medical history:', error)
    res.status(500).json({ message: 'Something went wrong' })
  }
}

async function updateMedicalHistory(req, res) {
  try {
    const history = await MedicalHistory.findOneAndUpdate(
      { patientId: req.params.id },
      req.body,
      { new: true }
    )
    if (!history) {
      return res.status(404).json({ message: 'Medical history not found' })
    }
    res.json({ message: 'Medical history updated successfully', history })
  } catch (error) {
    console.error('Error updating medical history:', error)
    res.status(500).json({ message: 'Something went wrong' })
  }
}

module.exports = {
  getMedicalHistoryByPatientId,
  createMedicalHistory,
  updateMedicalHistory
}
