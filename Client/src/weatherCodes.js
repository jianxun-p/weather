import {
  WiCloud,
  WiCloudy,
  WiDaySunny,
  WiFog,
  WiRain,
  WiRaindrops,
  WiShowers,
  WiSnow,
  WiThunderstorm,
} from 'react-icons/wi';

const map = {
  0: { label: 'Clear sky', icon: WiDaySunny },
  1: { label: 'Mainly clear', icon: WiDaySunny },
  2: { label: 'Partly cloudy', icon: WiCloud },
  3: { label: 'Overcast', icon: WiCloudy },
  45: { label: 'Fog', icon: WiFog },
  48: { label: 'Depositing rime fog', icon: WiFog },
  51: { label: 'Light drizzle', icon: WiRaindrops },
  53: { label: 'Moderate drizzle', icon: WiRaindrops },
  55: { label: 'Dense drizzle', icon: WiRaindrops },
  56: { label: 'Light freezing drizzle', icon: WiRaindrops },
  57: { label: 'Dense freezing drizzle', icon: WiRaindrops },
  61: { label: 'Slight rain', icon: WiRain },
  63: { label: 'Moderate rain', icon: WiRain },
  65: { label: 'Heavy rain', icon: WiRain },
  66: { label: 'Light freezing rain', icon: WiShowers },
  67: { label: 'Heavy freezing rain', icon: WiShowers },
  71: { label: 'Slight snow fall', icon: WiSnow },
  73: { label: 'Moderate snow fall', icon: WiSnow },
  75: { label: 'Heavy snow fall', icon: WiSnow },
  77: { label: 'Snow grains', icon: WiSnow },
  80: { label: 'Slight rain showers', icon: WiShowers },
  81: { label: 'Moderate rain showers', icon: WiShowers },
  82: { label: 'Violent rain showers', icon: WiShowers },
  85: { label: 'Slight snow showers', icon: WiSnow },
  86: { label: 'Heavy snow showers', icon: WiSnow },
  95: { label: 'Thunderstorm', icon: WiThunderstorm },
  96: { label: 'Thunderstorm with hail', icon: WiThunderstorm },
  99: { label: 'Thunderstorm with heavy hail', icon: WiThunderstorm },
};

export function weatherInfoFromCode(code) {
  return map[code] || { label: 'Unknown weather', icon: WiCloudy };
}
