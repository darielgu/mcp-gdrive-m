import { useState } from "react";

function App() {
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState(null);

  const handleSignup = async () => {
    try {
      // Step 1: Call backend login
      const loginRes = await fetch(`http://localhost:3001/login/${userId}`);
      const loginData = await loginRes.json();
      setStatus(`Signed up as ${loginData.userId}`);

      // Step 2: Redirect to Google OAuth
      window.location.href = `http://localhost:3001/auth/google?userId=${userId}`;
    } catch (err) {
      console.error(err);
      alert("Error signing up");
    }
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Test Signup + Google Drive Auth</h1>

      <label>
        Enter a username:
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="e.g. dariel"
          style={{ marginLeft: "1rem" }}
        />
      </label>

      <button
        onClick={handleSignup}
        style={{ marginLeft: "1rem", padding: "0.5rem 1rem" }}
      >
        Sign Up & Connect Google Drive
      </button>

      {status && <p>{status}</p>}
    </div>
  );
}

export default App;
