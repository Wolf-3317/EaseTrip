const API_BASE = 'https://api.data.gov.my/weather/forecast';

const FORECAST_MAP = {
    'Tiada hujan':                                          { condition: 'Clear',        description: 'No Rain',                          icon: '01d' },
    'Berjerebu':                                            { condition: 'Mist',         description: 'Hazy',                             icon: '50d' },
    'Hujan':                                                { condition: 'Rain',         description: 'Rain',                             icon: '10d' },
    'Hujan di beberapa tempat':                             { condition: 'Rain',         description: 'Scattered Rain',                   icon: '10d' },
    'Hujan di satu dua tempat':                             { condition: 'Rain',         description: 'Isolated Rain',                    icon: '09d' },
    'Hujan di satu dua tempat di kawasan pantai':           { condition: 'Rain',         description: 'Isolated Rain (Coastal)',           icon: '09d' },
    'Hujan di satu dua tempat di kawasan pedalaman':        { condition: 'Rain',         description: 'Isolated Rain (Inland)',            icon: '09d' },
    'Hujan di kebanyakan tempat':                           { condition: 'Rain',         description: 'Rain in Most Areas',               icon: '10d' },
    'Ribut petir':                                          { condition: 'Thunderstorm', description: 'Thunderstorm',                     icon: '11d' },
    'Ribut petir di beberapa tempat':                       { condition: 'Thunderstorm', description: 'Scattered Thunderstorms',          icon: '11d' },
    'Ribut petir di beberapa tempat di kawasan pedalaman':  { condition: 'Thunderstorm', description: 'Scattered Thunderstorms (Inland)', icon: '11d' },
    'Ribut petir di satu dua tempat':                       { condition: 'Thunderstorm', description: 'Isolated Thunderstorm',            icon: '11d' },
    'Ribut petir di satu dua tempat di kawasan pantai':     { condition: 'Thunderstorm', description: 'Isolated Thunderstorm (Coastal)',  icon: '11d' },
    'Ribut petir di satu dua tempat di kawasan pedalaman':  { condition: 'Thunderstorm', description: 'Isolated Thunderstorm (Inland)',   icon: '11d' },
    'Ribut petir di kebanyakan tempat':                     { condition: 'Thunderstorm', description: 'Thunderstorms in Most Areas',      icon: '11d' },
    'Ribut petir menyeluruh':                               { condition: 'Thunderstorm', description: 'Widespread Thunderstorms',         icon: '11d' },
};

const CITY_TO_API_NAME = {
    'Kuala Lumpur':      'Kuala Lumpur',
    'George Town':       'Pulau Pinang',
    'Penang':            'Pulau Pinang',
    'Ipoh':              'Ipoh',
    'Johor Bahru':       'Johor Bahru',
    'Melaka':            'Melaka',
    'Kota Kinabalu':     'Kota Kinabalu',
    'Kuching':           'Kuching',
    'Shah Alam':         'Shah Alam',
    'Petaling Jaya':     'Petaling Jaya',
    'Langkawi':          'Langkawi',
    'Cameron Highlands': 'Tanah Tinggi Cameron',
    'Genting Highlands': 'Genting Highlands',
    'Tioman':            'Pulau Tioman',
    'Redang':            'Pulau Redang',
};

const CITY_ALIASES = {
    'penang':            'George Town',
    'george town':       'George Town',
    'georgetown':        'George Town',
    'kl':                'Kuala Lumpur',
    'kuala lumpur':      'Kuala Lumpur',
    'melaka':            'Melaka',
    'jb':                'Johor Bahru',
    'johor bahru':       'Johor Bahru',
    'kota kinabalu':     'Kota Kinabalu',
    'cameron highlands': 'Cameron Highlands',
    'genting highlands': 'Genting Highlands',
    'langkawi':          'Langkawi',
};


const forecastCache = {};
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function translateForecast(malay) {
    if (!malay) return null;
    const entry = FORECAST_MAP[malay];
    return entry ? entry.description : malay;
}

function mapApiRecord(record) {
    const summaryMalay = record.summary_forecast || record.afternoon_forecast || record.morning_forecast || '';
    const mapped = FORECAST_MAP[summaryMalay] || { condition: 'Clouds', description: summaryMalay || 'Partly Cloudy', icon: '03d' };

    return {
        city:                  record.location?.location_name || '',
        date:                  record.date,
        condition_main:        mapped.condition,
        condition_description: mapped.description,
        icon:                  mapped.icon,
        temp_high:             record.max_temp ?? null,
        temp_low:              record.min_temp ?? null,
        humidity:              null,
        wind_speed:            null,
        morning_forecast:      translateForecast(record.morning_forecast),
        afternoon_forecast:    translateForecast(record.afternoon_forecast),
        night_forecast:        translateForecast(record.night_forecast),
        summary_forecast:      summaryMalay,
        is_admin_set:          false,
    };
}

// Fetch and cache all records for a given API city name.
// Returns the raw (unmapped) records array.
async function fetchAndCache(apiName) {
    const cached = forecastCache[apiName];
    if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL_MS) {
        return cached.records;
    }

    const url = `${API_BASE}?contains=${encodeURIComponent(apiName)}@location__location_name&limit=300&sort=date`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Weather API responded ${response.status}`);

    const json = await response.json();
    const allRecords = Array.isArray(json) ? json : (json.data || []);

    // Exact-match filter on location name
    const apiNameLower = apiName.toLowerCase();
    const cityRecords = allRecords.filter(
        r => (r.location?.location_name || '').toLowerCase() === apiNameLower
    );

    const records = cityRecords.length ? cityRecords : allRecords;

    forecastCache[apiName] = { records, fetchedAt: Date.now() };
    return records;
}

async function fetchForecast(apiLocationName) {
    const records = await fetchAndCache(apiLocationName);
    return records.slice(0, 7).map(mapApiRecord);
}

class Weather {
    static normalizeCity(city) {
        const lower = city.toLowerCase().trim();
        return CITY_ALIASES[lower] || city;
    }

    static async getWeather(city, date) {
        const normalizedCity = this.normalizeCity(city);
        const apiName = CITY_TO_API_NAME[normalizedCity] || normalizedCity;

        try {
            const records = await fetchAndCache(apiName);
            // Strict date match — never return data for a different date
            const match = records.find(r => r.date === date);
            if (!match) return null;
            return mapApiRecord(match);
        } catch (err) {
            console.error('Weather API getWeather error:', err);
            return null;
        }
    }

    static async getWeatherByCity(city) {
        const normalizedCity = this.normalizeCity(city);
        const apiName = CITY_TO_API_NAME[normalizedCity] || normalizedCity;
        try {
            return await fetchForecast(apiName);
        } catch (err) {
            console.error('Weather API getWeatherByCity error:', err);
            return [];
        }
    }

    static async getAllWeather() {
        const cities = this.getMalaysianCities();
        const today = new Date().toISOString().split('T')[0];
        const results = [];

        await Promise.all(cities.map(async (city) => {
            try {
                const record = await this.getWeather(city, today);
                if (record) {
                    record.city = city;
                    results.push(record);
                }
            } catch (_) {}
        }));

        results.sort((a, b) => a.city.localeCompare(b.city));
        return results;
    }

    /** @deprecated */
    static async setAdminWeather(_data) {
        console.warn('setAdminWeather: weather data is now sourced from the live API. This call is ignored.');
        return true;
    }

    /** @deprecated */
    static async deleteWeather(_id) {
        console.warn('deleteWeather: weather data is now sourced from the live API. This call is ignored.');
        return true;
    }

    static getMalaysianCities() {
        return [
            'Kuala Lumpur', 'George Town', 'Ipoh', 'Johor Bahru', 'Melaka',
            'Kota Kinabalu', 'Kuching', 'Shah Alam', 'Petaling Jaya', 'Langkawi',
            'Penang', 'Cameron Highlands', 'Genting Highlands', 'Tioman', 'Redang',
        ];
    }

    static getWeatherConditions() {
        return [
            { value: 'Clear',        label: 'Clear / Sunny', icon: '01d' },
            { value: 'Clouds',       label: 'Cloudy',        icon: '03d' },
            { value: 'Rain',         label: 'Rainy',         icon: '10d' },
            { value: 'Drizzle',      label: 'Drizzle',       icon: '09d' },
            { value: 'Thunderstorm', label: 'Thunderstorm',  icon: '11d' },
            { value: 'Mist',         label: 'Mist / Haze',  icon: '50d' },
        ];
    }
}

module.exports = Weather;