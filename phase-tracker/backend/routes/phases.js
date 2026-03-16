const express = require('express');
const router = express.Router();
const Phase = require('../models/Phase');

// GET /api/phases - Return all phases and tasks
router.get('/', async (req, res) => {
  try {
    const phases = await Phase.find().sort({ createdAt: 1 });
    res.json(phases);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching phases' });
  }
});

// POST /api/phases - Create a new phase
router.post('/', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    
    const newPhase = new Phase({ title, tasks: [] });
    const savedPhase = await newPhase.save();
    res.status(201).json(savedPhase);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error creating phase' });
  }
});

// PUT /api/phases/:id - Update phase title
router.put('/:id', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const updatedPhase = await Phase.findByIdAndUpdate(
      req.params.id, 
      { title }, 
      { new: true }
    );
    if (!updatedPhase) return res.status(404).json({ error: 'Phase not found' });
    
    res.json(updatedPhase);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating phase' });
  }
});

// DELETE /api/phases/:id - Delete a phase
router.delete('/:id', async (req, res) => {
  try {
    const deletedPhase = await Phase.findByIdAndDelete(req.params.id);
    if (!deletedPhase) return res.status(404).json({ error: 'Phase not found' });
    
    res.json({ message: 'Phase deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting phase' });
  }
});

// POST /api/phases/:phaseId/tasks - Add task to a phase
router.post('/:phaseId/tasks', async (req, res) => {
  try {
    const { text, done } = req.body;
    if (!text) return res.status(400).json({ error: 'Task text is required' });

    const phase = await Phase.findById(req.params.phaseId);
    if (!phase) return res.status(404).json({ error: 'Phase not found' });

    phase.tasks.push({ text, done: done || false });
    const savedPhase = await phase.save();
    res.status(201).json(savedPhase);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error adding task' });
  }
});

module.exports = router;
