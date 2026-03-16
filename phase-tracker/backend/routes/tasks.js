const express = require('express');
const router = express.Router();
const Phase = require('../models/Phase');

// PUT /api/tasks/:taskId - Update task text or completion status
router.put('/:taskId', async (req, res) => {
  try {
    const { text, done } = req.body;
    const { taskId } = req.params;

    // Find the phase that contains this task
    const phase = await Phase.findOne({ 'tasks._id': taskId });
    if (!phase) return res.status(404).json({ error: 'Task not found' });

    const task = phase.tasks.id(taskId);
    if (text !== undefined) task.text = text;
    if (done !== undefined) task.done = done;

    const savedPhase = await phase.save();
    res.json(savedPhase);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating task' });
  }
});

// DELETE /api/tasks/:taskId - Delete task
router.delete('/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    const phase = await Phase.findOne({ 'tasks._id': taskId });
    if (!phase) return res.status(404).json({ error: 'Task not found' });

    phase.tasks.pull(taskId); // Remove the task
    const savedPhase = await phase.save();
    
    res.json(savedPhase);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting task' });
  }
});

module.exports = router;
