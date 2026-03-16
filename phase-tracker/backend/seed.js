const fs = require('fs');
const mongoose = require('mongoose');
const Phase = require('./models/Phase');

mongoose.connect('mongodb://localhost:27017/phase-tracker')
  .then(() => populate())
  .catch(console.error);

async function populate() {
  await Phase.deleteMany({});
  
  const text = fs.readFileSync('/Users/pamula/Desktop/Sh_R_Mail/docs/phases/phase_wise_plan.md', 'utf8');
  const lines = text.split('\n');
  const phases = [];
  let currentPhase = null;
  
  for (let line of lines) {
    const phaseMatch = line.match(/([🏗✅])\s*(PHASE [0-9.]+)\s*[—\-]\s*(.*)/);
    if (phaseMatch) {
      if (currentPhase) phases.push(currentPhase);
      currentPhase = {
        title: `${phaseMatch[2]} - ${phaseMatch[3].split('⚠')[0].trim()}`,
        tasks: []
      };
    } else if (currentPhase) {
      const taskMatch = line.match(/^\s*-\s*\[([ xX])\]\s*(.+)/);
      if (taskMatch) {
        currentPhase.tasks.push({
          text: taskMatch[2].trim(),
          done: taskMatch[1].toLowerCase() === 'x'
        });
      }
    }
  }
  if (currentPhase) phases.push(currentPhase);

  for (let p of phases) {
    await new Phase(p).save();
  }
  console.log(`Seeded ${phases.length} phases.`);
  process.exit(0);
}
