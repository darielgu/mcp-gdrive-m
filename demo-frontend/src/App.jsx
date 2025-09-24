import { useState } from "react";
import axios from "axios";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  const handleSignUp = async (e) => {
    e.preventDefault();
    setStatus("Signing up...");

    try {
      const res = await axios.post(
        "http://localhost:3001/signup",
        { email, password },
        { withCredentials: true } // important: keep session cookie
      );

      setStatus(`Signed up as ${res.data.userId}`);

      // Redirect user to Google OAuth
      if (res.data.authUrl) {
        window.location.href = res.data.authUrl;
      }
    } catch (err) {
      console.error(err);
      if (err.response) {
        setStatus(`Error: ${err.response.data.error}`);
      } else {
        setStatus("Unexpected error");
      }
    }
  };

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "2rem auto",
        fontFamily: "sans-serif",
      }}
    >
      <h2>Create Account</h2>
      <form onSubmit={handleSignUp}>
        <div style={{ marginBottom: "1rem" }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "8px", marginTop: "4px" }}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "8px", marginTop: "4px" }}
          />
        </div>
        <button type="submit" style={{ padding: "10px 20px" }}>
          Sign Up
        </button>
      </form>
      {status && <p style={{ marginTop: "1rem" }}>{status}</p>}
    </div>
  );
}

export default App;
