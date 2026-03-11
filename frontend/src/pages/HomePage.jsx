import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f9f9f9',
        color: '#333',
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ marginBottom: '40px' }}>
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: '#ff6b6b',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '0 auto',
          }}
        >
          <span style={{ fontSize: '48px', color: '#fff' }}>A</span>
        </div>
        <h1 style={{ fontSize: '36px', margin: '20px 0 10px' }}>AASHA</h1>
        <p style={{ fontSize: '18px', color: '#666' }}>AI-Powered Health Worker Assistant</p>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          width: '100%',
          maxWidth: '800px',
        }}
      >
        <div
          onClick={() => navigate('/asha')}
          style={{
            flex: 1,
            minWidth: '300px',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            backgroundColor: '#fff',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>AASHA</div>
          <h2 style={{ fontSize: '24px', margin: '10px 0' }}>AASHA Worker</h2>
          <p style={{ fontSize: '16px', color: '#666' }}>Add patients, record observations, work offline</p>
        </div>

        <div
          onClick={() => navigate('/anm')}
          style={{
            flex: 1,
            minWidth: '300px',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            backgroundColor: '#fff',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>PHC</div>
          <h2 style={{ fontSize: '24px', margin: '10px 0' }}>PHC / ANM Staff</h2>
          <p style={{ fontSize: '16px', color: '#666' }}>Monitor AASHA workers and view health records</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
