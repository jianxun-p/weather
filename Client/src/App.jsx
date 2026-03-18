import { useEffect, useMemo, useState } from 'react';
import { FaMapMarkerAlt, FaSearchLocation } from 'react-icons/fa';
import { MdGpsFixed } from 'react-icons/md';
import { geocodeLocation, getWeather, reverseGeocode } from './api';
import { weatherInfoFromCode } from './weatherCodes';


function formatDay(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function WeatherCard({ location, weather }) {
  const current = weather.current;
  const info = weatherInfoFromCode(current.weather_code);
  const WeatherIcon = info.icon;

  return (
    <section className="weather-card" aria-live="polite">
      <header>
        <h2>
          <FaMapMarkerAlt /><a href={`https://www.google.com/maps/search/?api=1&query=${weather.latitude}%2C${weather.longitude}`}>{location}</a>
        </h2>
        <p>{info.label}</p>
      </header>

      <div className="current-block">
        <WeatherIcon className="hero-icon" aria-hidden="true" />
        <div>
          <p className="temperature">{Math.round(current.temperature_2m)}°C</p>
          <p>Feels like {Math.round(current.apparent_temperature)}°C</p>
        </div>
      </div>

      <div className="metrics-grid">
        <article>
          <h3>Humidity</h3>
          <p>{current.relative_humidity_2m}%</p>
        </article>
        <article>
          <h3>Wind</h3>
          <p>{Math.round(current.wind_speed_10m)} km/h</p>
        </article>
      </div>
    </section>
  );
}

function Forecast({ weather }) {
  const days = useMemo(() => {
    const { time, weather_code, temperature_2m_max, temperature_2m_min } = weather.daily;

    return time.map((dateText, index) => ({
      dateText,
      code: weather_code[index],
      max: temperature_2m_max[index],
      min: temperature_2m_min[index],
    }));
  }, [weather]);

  return (
    <section className="forecast">
      <h2>{days.length}-Day Forecast</h2>
      <div className="forecast-grid">
        {days.map((day) => {
          const info = weatherInfoFromCode(day.code);
          const Icon = info.icon;

          return (
            <article key={day.dateText} className="forecast-day">
              <h3>{formatDay(day.dateText)}</h3>
              <Icon className="forecast-icon" aria-hidden="true" />
              <p>{info.label}</p>
              <p>
                <strong>{Math.round(day.max)}°C</strong> / {Math.round(day.min)}°C
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [query, setQuery] = useState('Waterloo, Ontario, Canada');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationName, setLocationName] = useState('');
  const [weather, setWeather] = useState(null);
  const [savedResults, setSavedResults] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    created_at: 0,
    name: '',
    latitude: '',
    longitude: '',
    notes: '',
  });

  useEffect(async () => {
    const uinfo = await fetch('/userinfo', {method: "GET"}).then(res => res.json());
    if (uinfo.ok)
      return setAuthUser({uid: uinfo.uid, username: uinfo.username, registered_at: uinfo.registered_at});
    setError(uinfo.error ?? "Error occured when fetching user data");
  }, []);

  useEffect(async () => {
    try {
      const parsed = await fetch('/history', { method: 'GET' }).then((res) => res.json());
      setAuthReady(parsed?.error_code !== 401);
      if (parsed?.error_code === 401) {
        return setError("Please sign in to access your history");
      } else if (parsed?.ok) {
        setSavedResults(parsed?.history);
        return setError('');
      }
      setError(parsed?.message || 'Unable to load saved query results right now.');
    } catch (e) {
      console.error("Error occured when loading history:\n", e);
      setError(e.toString());
    }
  }, []);

  async function handleSearch(event) {
    event.preventDefault();

    if (!query.trim()) {
      setError('Please enter a location before searching.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const location = await geocodeLocation(query.trim());
      setLocationName(location.name);
      setWeather(await getWeather(location.name, location.latitude, location.longitude));
    } catch (requestError) {
      setError(requestError.message || 'Unable to get weather. Please try again.');
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setError('');
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setQuery(`${latitude}, ${longitude}`);
        const name = await reverseGeocode(latitude, longitude);
        setLocationName(name);
        setWeather(await getWeather(name, latitude, longitude));
        setLoading(false);
      },
      () => {
        setLoading(false);
        setError('Could not access your location. Please allow location access and try again.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleLogInOut() {
    if (authReady) {
      const res = await fetch('/logout', {method: 'POST'}).then(res => res.json());
      if (!res.ok) {
        alert("Failed to log out");
        console.error("failed to log out:", res.error);
        return;
      }
      alert("Logged out");
    }
    setAuthReady(false);
    setAuthUser(null);
    setWeather(null);
    setLocationName('');
    setError('');
    window.location.replace('/login.html');
  }

  async function handleShowSaved(entry) {
    setLoading(true);
    setError('');

    try {
      setLocationName(entry.name);
      setWeather(entry.weather);
    } catch (requestError) {
      setWeather(null);
      setError(requestError.message || 'Unable to load weather for this saved entry.');
    } finally {
      setLoading(false);
    }
  }

  function startEditing(entry) {
    setEditingId(entry.id);
    setEditForm({
      created_at: entry.created_at,
      name: entry.name,
      latitude: String(entry.latitude),
      longitude: String(entry.longitude),
      notes: entry.notes ?? '',
    });
    setError('');
  }

  function cancelEditing() {
    setEditingId(null);
    setEditForm({
      created_at: 0,
      name: '',
      latitude: '',
      longitude: '',
      notes: '',
    });
  }

  async function deleteEditing() {
    const id = editingId;
    const res = await fetch(`/history/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    }).then(res => res.json());
    if (res.ok) {
      setSavedResults(arr => arr.filter(entry => entry.id !== id));
      setEditingId(null);
      setEditForm({
        created_at: 0,
        name: '',
        latitude: '',
        longitude: '',
        notes: '',
      });
      return;
    }
    console.error("error occured while deleting:", res.error);
    alert("An error occured while deleting...");
  }

  async function deleteHistory() {
    const res = await fetch(`/history`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', }
    }).then(res => res.json());
    if (res.ok) {
      setSavedResults([]);
      setEditingId(null);
      setEditForm({
        created_at: 0,
        name: '',
        latitude: '',
        longitude: '',
        notes: '',
      });
      return;
    }
    console.error("error occured while deleting:", res.error);
    alert("An error occured while deleting...");
  }

  async function exportHistory() {
    const res = await fetch(`/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', }
    }).then(res => res.json());
    if (res.ok) {
      const newTab = window.open(res.export.url, '_blank');
      newTab.focus();
      return;
    }
    console.error("error occured while exporting data:", res.error);
    alert("An error occured while exporting...");
  }

  function handleEditFieldChange(event) {
    const { name, value } = event.target;
    setEditForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function saveEditedEntry(id) {
    const trimmedName = editForm.name.trim();
    const latitude = Number(editForm.latitude);
    const longitude = Number(editForm.longitude);

    if (!trimmedName) {
      setError('Name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/history/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          notes: editForm.notes.trim(),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        const apiError = payload?.errors?.[0] || payload?.error || 'Unable to update saved entry.';
        setError(apiError);
        return;
      }

      setSavedResults((current) =>
        current.map((entry) => (entry.id === id ? payload : entry)),
      );

      if (locationName && weather && locationName === trimmedName) {
        setLocationName(trimmedName);
      }

      cancelEditing();
    } catch (requestError) {
      setError(requestError.message || 'Unable to update saved entry.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="search-panel">
        <div className="search-header">
          <div>
            <h1>Live Weather Explorer</h1>
            <p className="welcome-text">Author: Steven P &lt;<a href="mailto:s4pan@uwaterloo.ca">s4pan@uwaterloo.ca</a>&gt;</p>
            <p className="welcome-text">{authReady ? "Signed in as " + authUser.username : "Not signed in"}</p>
          </div>
          <button type="button" className={!authReady ? "login-btn" : "logout-btn"} onClick={handleLogInOut}>{!authReady ? "Log In" : "Log Out"}</button>
        </div>
        <p>
          Search by city, postal code, landmark, or coordinates (e.g. 40.7128, -74.0060)
        </p>

        <form onSubmit={handleSearch} className="search-form">
          <label htmlFor="locationInput" className="sr-only">
            Enter location
          </label>
          <input
            id="locationInput"
            type="text"
            value={query}
            placeholder="Enter location"
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" disabled={loading}>
            <FaSearchLocation /> Search
          </button>
        </form>

        <button className="gps-btn" type="button" onClick={handleUseCurrentLocation} disabled={loading}>
          <MdGpsFixed /> Use my current location
        </button>

        {loading && <p className="status">Fetching real-time weather...</p>}
        {error && <p className="error">{error}</p>}
        {/* {historyError && <p className="error">{historyError}</p>} */}
      </section>

      {weather && !error && (
        <>
          <WeatherCard location={locationName} weather={weather} />
          <Forecast weather={weather} />
        </>
      )}

      {savedResults.length > 0 && (
        <section className="saved-results">
          <div className="saved-results-header">
            <h2>Saved Query Results</h2>
            <button type="button" className="clear-saved-btn" onClick={deleteHistory}>
              Clear all
            </button>
            <button type="button" className="export-btn" onClick={exportHistory}>
              Export
            </button>
          </div>

          <div className="saved-results-grid">
            {savedResults.map((entry) => (
              <article key={entry.id} className="saved-result-item">
                {editingId === entry.id ? (
                  <div className="saved-edit-form">
                    <label>
                      Date
                      <input
                        type="text"
                        name="date"
                        readOnly={true}
                        value={(new Date(editForm.created_at)).toString()}
                      />
                    </label>
                    <label>
                      Name
                      <input
                        type="text"
                        name="name"
                        readOnly={true}
                        value={editForm.name}
                      />
                    </label>
                    <label>
                      Latitude
                      <input
                        type="number"
                        step="any"
                        name="latitude"
                        value={editForm.latitude}
                        readOnly={true}
                      />
                    </label>
                    <label>
                      Longitude
                      <input
                        type="number"
                        step="any"
                        name="longitude"
                        value={editForm.longitude}
                        onChange={handleEditFieldChange}
                      />
                    </label>
                    <label>
                      Notes
                      <input
                        type="text"
                        name="notes"
                        value={editForm.notes}
                        onChange={handleEditFieldChange}
                      />
                    </label>
                    <div className="saved-action-row">
                      <button type="button" onClick={() => saveEditedEntry(entry.id)} disabled={loading}>
                        Save
                      </button>
                      <button type="button" className="secondary-btn" onClick={cancelEditing} disabled={loading}>
                        Cancel
                      </button>
                      <button type="button" className="delete-btn" onClick={deleteEditing} disabled={loading}>
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3>{entry.name}</h3>
                    <p>
                      {Number(entry.latitude).toFixed(4)}, {Number(entry.longitude).toFixed(4)}
                    </p>
                    <p>{entry.notes || 'No notes saved.'}</p>
                    <p>Saved: {new Date(entry.created_at).toLocaleString()}</p>
                    <div className="saved-action-row">
                      <button type="button" onClick={() => handleShowSaved(entry)} disabled={loading}>
                        Show
                      </button>
                      <button type="button" className="secondary-btn" onClick={() => startEditing(entry)} disabled={loading}>
                        Edit
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
