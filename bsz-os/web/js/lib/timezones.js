import { S, save, CITIES } from '../core/state.js';

// Curated list of major world cities across all continents with country & region metadata
export const MAJOR_CITIES = [
  // Europe
  { city: 'London', country: 'United Kingdom', tz: 'Europe/London', region: 'Europe' },
  { city: 'Paris', country: 'France', tz: 'Europe/Paris', region: 'Europe' },
  { city: 'Berlin', country: 'Germany', tz: 'Europe/Berlin', region: 'Europe' },
  { city: 'Cologne', country: 'Germany', tz: 'Europe/Berlin', region: 'Europe' },
  { city: 'Rome', country: 'Italy', tz: 'Europe/Rome', region: 'Europe' },
  { city: 'Madrid', country: 'Spain', tz: 'Europe/Madrid', region: 'Europe' },
  { city: 'Amsterdam', country: 'Netherlands', tz: 'Europe/Amsterdam', region: 'Europe' },
  { city: 'Brussels', country: 'Belgium', tz: 'Europe/Brussels', region: 'Europe' },
  { city: 'Vienna', country: 'Austria', tz: 'Europe/Vienna', region: 'Europe' },
  { city: 'Zurich', country: 'Switzerland', tz: 'Europe/Zurich', region: 'Europe' },
  { city: 'Stockholm', country: 'Sweden', tz: 'Europe/Stockholm', region: 'Europe' },
  { city: 'Oslo', country: 'Norway', tz: 'Europe/Oslo', region: 'Europe' },
  { city: 'Athens', country: 'Greece', tz: 'Europe/Athens', region: 'Europe' },
  { city: 'Dublin', country: 'Ireland', tz: 'Europe/Dublin', region: 'Europe' },
  { city: 'Helsinki', country: 'Finland', tz: 'Europe/Helsinki', region: 'Europe' },
  { city: 'Warsaw', country: 'Poland', tz: 'Europe/Warsaw', region: 'Europe' },
  { city: 'Prague', country: 'Czechia', tz: 'Europe/Prague', region: 'Europe' },
  { city: 'Moscow', country: 'Russia', tz: 'Europe/Moscow', region: 'Europe' },
  { city: 'Kyiv', country: 'Ukraine', tz: 'Europe/Kyiv', region: 'Europe' },
  { city: 'Istanbul', country: 'Turkey', tz: 'Europe/Istanbul', region: 'Europe' },
  { city: 'Reykjavik', country: 'Iceland', tz: 'Atlantic/Reykjavik', region: 'Europe' },

  // Africa
  { city: 'Tunis', country: 'Tunisia', tz: 'Africa/Tunis', region: 'Africa' },
  { city: 'Cairo', country: 'Egypt', tz: 'Africa/Cairo', region: 'Africa' },
  { city: 'Algiers', country: 'Algeria', tz: 'Africa/Algiers', region: 'Africa' },
  { city: 'Casablanca', country: 'Morocco', tz: 'Africa/Casablanca', region: 'Africa' },
  { city: 'Johannesburg', country: 'South Africa', tz: 'Africa/Johannesburg', region: 'Africa' },
  { city: 'Cape Town', country: 'South Africa', tz: 'Africa/Johannesburg', region: 'Africa' },
  { city: 'Nairobi', country: 'Kenya', tz: 'Africa/Nairobi', region: 'Africa' },
  { city: 'Lagos', country: 'Nigeria', tz: 'Africa/Lagos', region: 'Africa' },
  { city: 'Accra', country: 'Ghana', tz: 'Africa/Accra', region: 'Africa' },
  { city: 'Dakar', country: 'Senegal', tz: 'Africa/Dakar', region: 'Africa' },
  { city: 'Addis Ababa', country: 'Ethiopia', tz: 'Africa/Addis_Ababa', region: 'Africa' },

  // Americas
  { city: 'Houston', country: 'United States', tz: 'America/Chicago', region: 'Americas', note: 'Mission Control' },
  { city: 'Cape Canaveral', country: 'United States', tz: 'America/New_York', region: 'Americas', note: 'Launch Site' },
  { city: 'New York', country: 'United States', tz: 'America/New_York', region: 'Americas' },
  { city: 'Washington D.C.', country: 'United States', tz: 'America/New_York', region: 'Americas' },
  { city: 'Chicago', country: 'United States', tz: 'America/Chicago', region: 'Americas' },
  { city: 'Los Angeles', country: 'United States', tz: 'America/Los_Angeles', region: 'Americas' },
  { city: 'San Francisco', country: 'United States', tz: 'America/Los_Angeles', region: 'Americas' },
  { city: 'Seattle', country: 'United States', tz: 'America/Los_Angeles', region: 'Americas' },
  { city: 'Denver', country: 'United States', tz: 'America/Denver', region: 'Americas' },
  { city: 'Anchorage', country: 'United States', tz: 'America/Anchorage', region: 'Americas' },
  { city: 'Honolulu', country: 'United States', tz: 'Pacific/Honolulu', region: 'Americas' },
  { city: 'Toronto', country: 'Canada', tz: 'America/Toronto', region: 'Americas' },
  { city: 'Vancouver', country: 'Canada', tz: 'America/Vancouver', region: 'Americas' },
  { city: 'Montreal', country: 'Canada', tz: 'America/Toronto', region: 'Americas' },
  { city: 'Mexico City', country: 'Mexico', tz: 'America/Mexico_City', region: 'Americas' },
  { city: 'Bogota', country: 'Colombia', tz: 'America/Bogota', region: 'Americas' },
  { city: 'Lima', country: 'Peru', tz: 'America/Lima', region: 'Americas' },
  { city: 'Santiago', country: 'Chile', tz: 'America/Santiago', region: 'Americas' },
  { city: 'Buenos Aires', country: 'Argentina', tz: 'America/Argentina/Buenos_Aires', region: 'Americas' },
  { city: 'Sao Paulo', country: 'Brazil', tz: 'America/Sao_Paulo', region: 'Americas' },
  { city: 'Rio de Janeiro', country: 'Brazil', tz: 'America/Sao_Paulo', region: 'Americas' },
  { city: 'Kourou', country: 'French Guiana', tz: 'America/Cayenne', region: 'Americas', note: 'CSG Spaceport' },

  // Asia
  { city: 'Tokyo', country: 'Japan', tz: 'Asia/Tokyo', region: 'Asia', note: 'JAXA Control' },
  { city: 'Beijing', country: 'China', tz: 'Asia/Shanghai', region: 'Asia' },
  { city: 'Shanghai', country: 'China', tz: 'Asia/Shanghai', region: 'Asia' },
  { city: 'Hong Kong', country: 'Hong Kong', tz: 'Asia/Hong_Kong', region: 'Asia' },
  { city: 'Seoul', country: 'South Korea', tz: 'Asia/Seoul', region: 'Asia' },
  { city: 'Singapore', country: 'Singapore', tz: 'Asia/Singapore', region: 'Asia' },
  { city: 'Bangalore', country: 'India', tz: 'Asia/Kolkata', region: 'Asia', note: 'ISRO Telemetry' },
  { city: 'Mumbai', country: 'India', tz: 'Asia/Kolkata', region: 'Asia' },
  { city: 'New Delhi', country: 'India', tz: 'Asia/Kolkata', region: 'Asia' },
  { city: 'Dubai', country: 'United Arab Emirates', tz: 'Asia/Dubai', region: 'Asia' },
  { city: 'Doha', country: 'Qatar', tz: 'Asia/Qatar', region: 'Asia' },
  { city: 'Riyadh', country: 'Saudi Arabia', tz: 'Asia/Riyadh', region: 'Asia' },
  { city: 'Bangkok', country: 'Thailand', tz: 'Asia/Bangkok', region: 'Asia' },
  { city: 'Jakarta', country: 'Indonesia', tz: 'Asia/Jakarta', region: 'Asia' },
  { city: 'Manila', country: 'Philippines', tz: 'Asia/Manila', region: 'Asia' },
  { city: 'Taipei', country: 'Taiwan', tz: 'Asia/Taipei', region: 'Asia' },
  { city: 'Baikonur', country: 'Kazakhstan', tz: 'Asia/Almaty', region: 'Asia', note: 'Cosmodrome' },
  { city: 'Tashkent', country: 'Uzbekistan', tz: 'Asia/Tashkent', region: 'Asia' },

  // Oceania
  { city: 'Sydney', country: 'Australia', tz: 'Australia/Sydney', region: 'Oceania' },
  { city: 'Melbourne', country: 'Australia', tz: 'Australia/Melbourne', region: 'Oceania' },
  { city: 'Brisbane', country: 'Australia', tz: 'Australia/Brisbane', region: 'Oceania' },
  { city: 'Perth', country: 'Australia', tz: 'Australia/Perth', region: 'Oceania' },
  { city: 'Canberra', country: 'Australia', tz: 'Australia/Sydney', region: 'Oceania', note: 'Deep Space Station' },
  { city: 'Auckland', country: 'New Zealand', tz: 'Pacific/Auckland', region: 'Oceania' },
  { city: 'Wellington', country: 'New Zealand', tz: 'Pacific/Auckland', region: 'Oceania' },
  { city: 'Fiji', country: 'Fiji', tz: 'Pacific/Fiji', region: 'Oceania' },

  // Space & Universal
  { city: 'UTC Space Standard', country: 'Orbital / Universal', tz: 'UTC', region: 'Universal', note: 'Spacecraft reference' },
];

// Build index of all supported IANA timezones
let allTimezonesCache = null;

export function getAllTimezones() {
  if (allTimezonesCache) return allTimezonesCache;
  const map = new Map();

  // Add curated first
  MAJOR_CITIES.forEach(c => {
    map.set(c.tz + ':' + c.city, c);
  });

  // Add remaining IANA timezones supported by browser
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
      const ianaList = Intl.supportedValuesOf('timeZone');
      ianaList.forEach(tz => {
        const parts = tz.split('/');
        const cityName = (parts[parts.length - 1] || tz).replace(/_/g, ' ');
        const region = parts[0] || 'World';
        const key = tz + ':' + cityName;
        if (!map.has(key)) {
          map.set(key, { city: cityName, country: region, tz, region });
        }
      });
    }
  } catch (e) {
    console.warn('Could not enumerate Intl.supportedValuesOf:', e);
  }

  allTimezonesCache = Array.from(map.values());
  return allTimezonesCache;
}

// Get user's local timezone
export function getLocalTimezone() {
  if (S.data?.settings?.timezone) {
    return S.data.settings.timezone;
  }
  const city = S.data?.settings?.city;
  if (city && CITIES[city]?.[0]) {
    return CITIES[city][0];
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (e) {
    return 'UTC';
  }
}

// Get user's local city name
export function getLocalCityName() {
  if (S.data?.settings?.city) {
    return S.data.settings.city;
  }
  const tz = getLocalTimezone();
  const match = MAJOR_CITIES.find(c => c.tz === tz);
  if (match) return match.city;
  const parts = tz.split('/');
  return (parts[parts.length - 1] || tz).replace(/_/g, ' ');
}

// Set user's local timezone (propagates across app and landing page)
export function setLocalTimezone(tz, cityName = null) {
  if (!tz) return;
  if (!cityName) {
    const match = MAJOR_CITIES.find(c => c.tz === tz);
    cityName = match ? match.city : (tz.split('/').pop() || tz).replace(/_/g, ' ');
  }

  S.data.settings ||= {};
  S.data.settings.timezone = tz;
  S.data.settings.city = cityName;
  save();

  window.dispatchEvent(new CustomEvent('bsz:tz-changed', {
    detail: { tz, city: cityName }
  }));
}

// Get exact timezone offset in minutes from UTC
export function getTimezoneOffsetMinutes(tz, date = new Date()) {
  try {
    const str = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'longOffset',
      year: 'numeric'
    }).format(date);
    const match = str.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!match) return 0;
    const sign = match[1] === '-' ? -1 : 1;
    const hours = parseInt(match[2], 10);
    const minutes = match[3] ? parseInt(match[3], 10) : 0;
    return sign * (hours * 60 + minutes);
  } catch (e) {
    return 0;
  }
}

// Compute full display information for a timezone
export function getTimezoneInfo(tz, localTz = null, now = new Date()) {
  localTz ||= getLocalTimezone();
  const h24 = S.data?.settings?.h24 ?? true;

  try {
    const dtfTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: h24 ? 'h23' : 'h12'
    });
    const parts = Object.fromEntries(dtfTime.formatToParts(now).map(p => [p.type, p.value]));

    const dtfDate = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const dateFormatted = dtfDate.format(now);

    const dtfHour24 = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' });
    const hr24 = parseInt(dtfHour24.format(now), 10);
    const isDay = hr24 >= 6 && hr24 < 18;

    // Offset in minutes
    const offsetMin = getTimezoneOffsetMinutes(tz, now);
    const localOffsetMin = getTimezoneOffsetMinutes(localTz, now);
    const diffMin = offsetMin - localOffsetMin;

    // Day difference
    const localDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: localTz }).format(now); // YYYY-MM-DD
    const targetDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now); // YYYY-MM-DD
    let dayDiff = 'Today';
    if (targetDateStr > localDateStr) dayDiff = 'Tomorrow';
    else if (targetDateStr < localDateStr) dayDiff = 'Yesterday';

    // Difference string
    let diffStr = 'Same time';
    if (diffMin !== 0) {
      const diffHr = Math.floor(Math.abs(diffMin) / 60);
      const remainMin = Math.abs(diffMin) % 60;
      const sign = diffMin > 0 ? '+' : '-';
      const minPart = remainMin ? `:${String(remainMin).padStart(2, '0')}` : '';
      diffStr = `${sign}${diffHr}${minPart} HRS`;
    }

    // Formatted UTC offset string e.g. UTC+1 or UTC-5:30
    const offSign = offsetMin >= 0 ? '+' : '-';
    const offHr = Math.floor(Math.abs(offsetMin) / 60);
    const offRemMin = Math.abs(offsetMin) % 60;
    const utcOffsetStr = `UTC${offSign}${offHr}${offRemMin ? ':' + String(offRemMin).padStart(2, '0') : ''}`;

    return {
      tz,
      time: `${parts.hour}:${parts.minute}`,
      seconds: parts.second,
      dayPeriod: parts.dayPeriod ? parts.dayPeriod.toUpperCase() : '',
      date: dateFormatted,
      isDay,
      dayDiff,
      diffStr,
      utcOffsetStr,
      hr24
    };
  } catch (err) {
    console.warn('Error formatting timezone:', tz, err);
    return {
      tz,
      time: '--:--',
      seconds: '00',
      dayPeriod: '',
      date: '',
      isDay: true,
      dayDiff: 'Today',
      diffStr: 'Offset --',
      utcOffsetStr: 'UTC',
      hr24: 12
    };
  }
}
