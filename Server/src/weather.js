
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';


export function validateWeatherRequest(req, res) {
  let { name, latitude, longitude, pastDays, forecastDays, date } = req.body;
  if (typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'Invalid location name.', ok: false, error_code: 400 });
    return null;
  }

  if (forecastDays === undefined) {
    forecastDays = 1;
  } else if (!Number.isInteger(forecastDays) || forecastDays <= 0 || forecastDays > 14) {
    res.status(400).json({ error: 'Invalid forecastDays value (min: 1, max: 13).', ok: false, error_code: 400 });
    return null;
  }

  if (pastDays === undefined) {
    pastDays = 0;
  } else if (!Number.isInteger(pastDays) || pastDays < 0 || pastDays > 60) {
    res.status(400).json({ error: 'Invalid pastDays value (min: 0, max: 59).', ok: false, error_code: 400 });
    return null;
  }

  if (date === undefined) {
    date = Date.now();
  } else if (!Number.isInteger(date) || date < 0) {
    res.status(400).json({ error: 'Invalid date value (expect an integer representing the number of milliseconds since the Epoch).', ok: false, error_code: 400 });
    return null;
  }

  const lat = latitude;
  const lon = longitude;
  if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
    res.status(400).json({ error: 'Invalid latitude value.', ok: false, error_code: 400 });
    return null;
  }
  if (typeof lon !== 'number' || isNaN(lon) || lon < -180 || lon > 180) {
    res.status(400).json({ error: 'Invalid longitude value.', ok: false, error_code: 400 });
    return null;
  }
  if (!Number.isInteger(date) || date < 0) {
    res.status(400).json({ error: 'Invalid date value.', ok: false, error_code: 400 });
    return null;
  }
  if (date < Date.now() - 60 * 24 * 60 * 60 * 1000) {
    res.status(400).json({ error: 'Date range is too old.', ok: false, error_code: 400 });
    return null;
  }
  if (date + (forecastDays - 1) * 24 * 60 * 60 * 1000 > Date.now() + 14 * 24 * 60 * 60 * 1000) {
    res.status(400).json({ error: 'Date range is too far in the future (max 14 days since the current day).', ok: false, error_code: 400 });
    return null;
  }
  return {
    name: name.trim(),
    latitude: lat,
    longitude: lon,
    forecastDays: forecastDays,
    date: date,
    pastDays: pastDays,
  };
}

export async function getWeather(latitude, longitude, pastDays = 0, forecastDays = 1) {
  const url = new URL(OPEN_METEO_BASE);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set(
    'current',
    [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'wind_speed_10m',
      'weather_code',
    ].join(','),
  );
  url.searchParams.set(
    'daily',
    ['weather_code', 'temperature_2m_max', 'temperature_2m_min'].join(','),
  );
  url.searchParams.set('past_days', pastDays.toString());
  url.searchParams.set('forecast_days', forecastDays.toString());

  return await fetch(url).then((res) => {
    if (!res.ok) {
        console.warn("Failed to fetch weather data:", url, res);
        return null;
    }
    return res.json();
  });
}

