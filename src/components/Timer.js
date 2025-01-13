import React, { useEffect, useState } from 'react';

const Timer = ({ ip, onStop }) => {
  const [time, setTime] = useState(10);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => prev - 1);
    }, 1000);

    if (time === 0) {
      clearInterval(interval);
      onStop(ip);
    }

    return () => clearInterval(interval);
  }, [time, ip, onStop]);

  return (
    <div>
      <h3>Timer for {ip}</h3>
      <p>Time Remaining: {time}s</p>
    </div>
  );
};

export default Timer;
