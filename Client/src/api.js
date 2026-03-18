const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

async function parseJsonResponse(response, genericMessage) {
  if (!response.ok) {
	throw new Error(genericMessage);
  }
  return response.json();
}

export async function geocodeLocation(query) {
  const url = new URL('/search', NOMINATIM_BASE);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '1');

  const response = await fetch(url, {
	headers: {
	  Accept: 'application/json',
	},
  });

  const results = await parseJsonResponse(
	response,
	'Location lookup failed. Please try again.',
  );

  if (!Array.isArray(results) || results.length === 0) {
	throw new Error(
	  'Location not found. Try a different city or GPS coordinates.',
	);
  }

  const first = results[0];
  return {
	name: first.display_name,
	latitude: Number(first.lat),
	longitude: Number(first.lon),
  };
}

export async function reverseGeocode(latitude, longitude) {
  const url = new URL('/reverse', NOMINATIM_BASE);
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('format', 'jsonv2');

  const response = await fetch(url, { headers: { Accept: 'application/json' }});

  const result = await parseJsonResponse(
	  response,
	  'Unable to resolve your current location name.',
  );

  return result.display_name || `Unknown Location (${latitude}, ${longitude})`;
}


export async function getWeather(name, lat, long, forecastDays = 1) {
  return await fetch('/weather', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: name, latitude: lat, longitude: long, forecastDays }),
  }).then(res => res.json());
}

export async function loginUser(username, password) {
  const response = await fetch(`/login`, {
	method: 'POST',
	headers: {
	  Accept: 'application/json',
	  'Content-Type': 'application/json',
	},
	body: JSON.stringify({ username, password }),
  });

  let payload = null;
  try {
	payload = await response.json();
  } catch {
	payload = null;
  }

  if (!response.ok) {
	throw new Error(payload?.error || 'Unable to sign in.');
  }

  return payload;
}
