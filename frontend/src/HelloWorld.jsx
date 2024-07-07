import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.INTERNAL_API_BASE ?? process.env.API_BASE;

function HelloWorld() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios({
      method: 'GET',
      url: 'http://localhost:8000/api/user',
    })
      .then(response => {
        setMessage(response.data.message);
      })
      .catch(error => {
        console.log(error);
      });
  }, []);

  return (
    <div>
      <h1>Hello, World!</h1>
      <p>{message}</p>
    </div>
  );
}

export default HelloWorld;
