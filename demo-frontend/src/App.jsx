import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [doc, setDoc] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState("");

  async function searchFiles(e) {
    e?.preventDefault();
    setError("");
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(
        `http://localhost:8000/api/search?q=${encodeURIComponent(query)}`
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setResults(Array.isArray(data.files) ? data.files : []);
    } catch (err) {
      setError("Failed to search. Is the backend running on :8000?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>Google Drive Search (MCP)</h1>
      <form onSubmit={searchFiles} style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="Search your Drive..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, padding: 10, fontSize: 16 }}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <div style={{ marginTop: 12, color: "crimson" }}>{error}</div>}

      <div style={{ marginTop: 16 }}>
        {results.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {results.map((file) => {
              return (
                <li
                  key={file.id}
                  onClick={async () => {
                    setSelected(file);
                    setDoc("");
                    setDocError("");
                    setDocLoading(true);
                    try {
                      const resp = await fetch(
                        `http://localhost:8000/api/read?fileId=${encodeURIComponent(
                          file.id
                        )}`
                      );
                      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                      const data = await resp.json();
                      setDoc(data.content || "");
                    } catch (err) {
                      setDocError("Failed to load document content.");
                    } finally {
                      setDocLoading(false);
                    }
                  }}
                  style={{
                    padding: "10px 0",
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{file.id}</div>
                </li>
              );
            })}
          </ul>
        ) : (
          !loading && <div style={{ color: "#666" }}>No results</div>
        )}
      </div>

      {selected && (
        <div
          onClick={() => {
            setSelected(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 8,
              width: "min(900px, 95vw)",
              maxHeight: "85vh",
              overflow: "auto",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", padding: 16 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 18,
                  flex: 1,
                  color: "black",
                }}
              >
                {selected.name}
              </div>
              <button onClick={() => setSelected(null)}>Close</button>
            </div>
            <div style={{ padding: 16, borderTop: "1px solid #eee" }}>
              {docLoading && <div>Loading...</div>}
              {docError && (
                <div style={{ color: "crimson", marginBottom: 8 }}>
                  {docError}
                </div>
              )}
              {!docLoading && !docError && (
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color: "black",
                  }}
                >
                  {doc || "No content"}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
