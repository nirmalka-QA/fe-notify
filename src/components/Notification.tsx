import React, { useEffect, useState } from 'react';

interface NotificationProps {
  testingWindowEnd: Date;
  onTestResult: (result: number) => void;
  bracLimit: number;
}

const Notification: React.FC<NotificationProps> = ({ testingWindowEnd, onTestResult, bracLimit }) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = testingWindowEnd.getTime() - now.getTime();

      if (diff <= 0) {
        clearInterval(interval);
        setTimeRemaining('Testing window closed');
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [testingWindowEnd]);

  const handleTestResult = (result: number) => {
    if (result < bracLimit) {
      alert('Test passed. Testing window closed.');
    } else {
      alert('Test failed. Retest cycle triggered.');
    }
    onTestResult(result);
  };

  return (
    <div className="notification">
      <h2>Active Testing Window</h2>
      <p>Time remaining: {timeRemaining}</p>
      <button onClick={() => handleTestResult(Math.random() * 0.2)}>Submit Test Result</button>
    </div>
  );
};

export default Notification;