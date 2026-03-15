import React, { useState, useEffect } from 'react';
import './ScheduleTestModule.css';

const ScheduleTestModule: React.FC = () => {
  const [scheduleType, setScheduleType] = useState<'perDay' | 'testingWindows'>('testingWindows');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [testingWindows, setTestingWindows] = useState([
    { enabled: true, start: '06:00', end: '08:00' },
    { enabled: true, start: '17:00', end: '19:00' },
    { enabled: true, start: '22:00', end: '23:59' },
    { enabled: false, start: '', end: '' },
  ]);
  const [bufferMinutes, setBufferMinutes] = useState(15);

  useEffect(() => {
    const savedData = localStorage.getItem('scheduleData');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setScheduleType(parsedData.scheduleType);
      setSelectedDays(parsedData.selectedDays);
      setTestingWindows(parsedData.testingWindows);
      setBufferMinutes(parsedData.bufferMinutes);
    }
  }, []);

  const handleSave = () => {
    if (selectedDays.length === 0) {
      alert('Please select at least one day.');
      return;
    }

    const enabledWindows = testingWindows.filter((window) => window.enabled);
    if (enabledWindows.length === 0) {
      alert('Please enable at least one testing window.');
      return;
    }

    for (let i = 0; i < enabledWindows.length - 1; i++) {
      const currentEnd = enabledWindows[i].end;
      const nextStart = enabledWindows[i + 1].start;
      const gap = calculateTimeGap(currentEnd, nextStart);
      if (gap < bufferMinutes) {
        alert('Please ensure a minimum buffer gap between consecutive windows.');
        return;
      }
    }

    localStorage.setItem(
      'scheduleData',
      JSON.stringify({ scheduleType, selectedDays, testingWindows, bufferMinutes })
    );
    alert('Schedule saved successfully!');
  };

  const calculateTimeGap = (end: string, start: string): number => {
    const [endHours, endMinutes] = end.split(':').map(Number);
    const [startHours, startMinutes] = start.split(':').map(Number);
    return (startHours * 60 + startMinutes) - (endHours * 60 + endMinutes);
  };

  const handleReset = () => {
    setScheduleType('testingWindows');
    setSelectedDays([]);
    setTestingWindows([
      { enabled: true, start: '06:00', end: '08:00' },
      { enabled: true, start: '17:00', end: '19:00' },
      { enabled: true, start: '22:00', end: '23:59' },
      { enabled: false, start: '', end: '' },
    ]);
    setBufferMinutes(15);
  };

  return (
    <div className="schedule-test-module">
      <h2>Schedule Test Module</h2>
      <div className="schedule-type">
        <label>
          <input
            type="radio"
            value="perDay"
            checked={scheduleType === 'perDay'}
            onChange={() => setScheduleType('perDay')}
          />
          Per Day of Week
        </label>
        <label>
          <input
            type="radio"
            value="testingWindows"
            checked={scheduleType === 'testingWindows'}
            onChange={() => setScheduleType('testingWindows')}
          />
          Testing Windows
        </label>
      </div>

      <div className="day-selection">
        <h3>Select Days</h3>
        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
          <label key={day}>
            <input
              type="checkbox"
              checked={selectedDays.includes(day)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedDays([...selectedDays, day]);
                } else {
                  setSelectedDays(selectedDays.filter((d) => d !== day));
                }
              }}
            />
            {day}
          </label>
        ))}
      </div>

      <div className="testing-windows">
        <h3>Testing Windows</h3>
        {testingWindows.map((window, index) => (
          <div key={index} className="window">
            <label>
              <input
                type="checkbox"
                checked={window.enabled}
                onChange={(e) => {
                  const updatedWindows = [...testingWindows];
                  updatedWindows[index].enabled = e.target.checked;
                  setTestingWindows(updatedWindows);
                }}
              />
              Enable Window {index + 1}
            </label>
            <input
              type="time"
              value={window.start}
              onChange={(e) => {
                const updatedWindows = [...testingWindows];
                updatedWindows[index].start = e.target.value;
                setTestingWindows(updatedWindows);
              }}
            />
            <input
              type="time"
              value={window.end}
              onChange={(e) => {
                const updatedWindows = [...testingWindows];
                updatedWindows[index].end = e.target.value;
                setTestingWindows(updatedWindows);
              }}
            />
          </div>
        ))}
      </div>

      <div className="buffer-gap">
        <h3>Buffer Gap (minutes)</h3>
        <input
          type="number"
          value={bufferMinutes}
          onChange={(e) => setBufferMinutes(Number(e.target.value))}
        />
      </div>

      <div className="actions">
        <button onClick={handleReset}>Reset</button>
        <button onClick={handleSave}>Save Schedule</button>
      </div>
    </div>
  );
};

export default ScheduleTestModule;