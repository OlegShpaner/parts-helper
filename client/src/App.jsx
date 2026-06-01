import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export default function App() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vin, setVin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!image) {
      setError("Please upload an image.");
      return;
    }

    const form = new FormData();
    form.append("image", image);
    form.append("make", make);
    form.append("model", model);
    form.append("year", year);
    if (vin) form.append("vin", vin);

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/analyze`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Request failed");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1>Parts Helper</h1>
      <form onSubmit={handleSubmit}>
        <label className="file-label">
          <span>{image ? image.name : "Choose a car photo"}</span>
          <input type="file" accept="image/*" onChange={handleFile} />
        </label>

        {preview && <img className="preview" src={preview} alt="preview" />}

        <div className="row">
          <input
            placeholder="Make"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            required
          />
          <input
            placeholder="Model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            required
          />
          <input
            placeholder="Year"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            required
          />
        </div>

        <input
          placeholder="VIN (optional)"
          value={vin}
          onChange={(e) => setVin(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="result">
          <h2>Result</h2>
          {Array.isArray(result) ? (
            <table>
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Location</th>
                  <th>Condition</th>
                  <th>Urgency</th>
                  <th>Est. Price</th>
                </tr>
              </thead>
              <tbody>
                {result.map((item, i) => (
                  <tr key={i}>
                    <td>{item.part}</td>
                    <td>{item.location}</td>
                    <td>{item.condition}</td>
                    <td>{item.urgency}</td>
                    <td>{item.estimated_price_range}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <pre>{JSON.stringify(result, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}
