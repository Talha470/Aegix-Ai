const { PythonShell } = require('python-shell');
const path = require('path');
const fs = require('fs');

// Analyze logs - single Python call
module.exports.analyzeLogs = async (req, res) => {
  try {
    const options = {
      mode: 'text',
      pythonPath: 'python3',
      scriptPath: path.join(__dirname, '../ML'),
      args: ['analyze'],
      pythonOptions: ['-u'],
      timeout: 30000
    };

    PythonShell.run('train_model.py', options, (err, results) => {
      if (err) {
        console.error('Analyze error:', err);
        return res.status(500).json({ msg: 'Analysis failed', error: err.message });
      }

      try {
        // Last line is JSON result
        const lastLine = results[results.length - 1];
        const data = JSON.parse(lastLine);
        res.json(data);
      } catch (e) {
        res.json({ total_analyzed: 0, anomalies_detected: 0, anomalies: [] });
      }
    });
  } catch (err) {
    res.status(500).json({ msg: 'ML analysis failed', error: err.message });
  }
};

// Retrain model - single Python call
module.exports.retrainModel = async (req, res) => {
  try {
    const options = {
      mode: 'text',
      pythonPath: 'python3',
      scriptPath: path.join(__dirname, '../ML'),
      args: ['train'],
      pythonOptions: ['-u'],
      timeout: 60000
    };

    PythonShell.run('train_model.py', options, (err, results) => {
      if (err) {
        console.error('Retrain error:', err);
        return res.status(500).json({ msg: 'Retraining failed', error: err.message });
      }
      res.json({ msg: 'Model retrained successfully', output: results });
    });
  } catch (err) {
    res.status(500).json({ msg: 'Retraining error', error: err.message });
  }
};
