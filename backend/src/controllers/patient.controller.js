const { Patient } = require('../models/patient.model')

async function getPatientById(req, res) {
  try {
    const patient = await Patient.findOne({ patientId: req.params.id })
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' })
    }
    res.json(patient)
  } catch (error) {
    console.error('Error fetching patient:', error)
    res.status(500).json({ message: 'Something went wrong' })
  }
}

async function getAllPatients(req, res) {
  try {
    const patients = await Patient.find({})
    res.json(patients)
  } catch (error) {
    console.error('Error fetching patients:', error)
    res.status(500).json({ message: 'Something went wrong' })
  }
}

async function createPatient(req, res) {
  try {
    const patient = await Patient.findOneAndUpdate(
      { patientId: req.body.patientId },
      req.body,
      { new: true, upsert: true }
    )
    res.status(201).json({ message: 'Patient created/updated successfully', patient })
  } catch (error) {
    console.error('Error creating patient:', error)
    res.status(500).json({ message: 'Something went wrong' })
  }
}

module.exports = {
  getPatientById,
  getAllPatients,
  createPatient
}
