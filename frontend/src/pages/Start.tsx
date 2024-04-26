import '../styles/Start.css'
import Albin from "../components/Albin.tsx";
import { useState } from 'react';

const Start = () => {
  const [token, setToken] = useState<string | null>('');

  const handleClick = async () => {
    try {
      const response = await fetch('/api/auth/login/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({username: 'test', password: "7py'68K^<.a{"}),
      }
      );
      const data = await response.json();
      setToken(data.token);
      window.localStorage.setItem('token', data.token);
      window.location.href = '/categories';
    } catch (error) { console.error(error); }
  }

  console.log(token);

  return (
      <div className={"start-container"}>
          <Albin/>
          <button onClick={handleClick}>Skål!</button>
      </div>
  );
}

export default Start;