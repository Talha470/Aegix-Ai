const axios = require('axios');

// Get geolocation for an IP
async function getIPLocation(ip) {
  try {
    // Using free ipapi.co service (100 requests/day limit)
    const response = await axios.get(`https://ipapi.co/${ip}/json/`, {
      timeout: 3000
    });
    
    if (response.data && response.data.latitude && response.data.longitude) {
      return {
        ip: ip,
        country: response.data.country_name,
        city: response.data.city,
        lat: response.data.latitude,
        lng: response.data.longitude
      };
    }
    return null;
  } catch (err) {
    console.error(`Geolocation error for ${ip}:`, err.message);
    return null;
  }
}

// Get geolocations for multiple IPs
module.exports.getAttackLocations = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Load attack logs
    const datasetPath = path.join(__dirname, '../ML/all_logs_dataset.json');
    const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    
    // Combine and get unique IPs
    const allLogs = [
      ...dataset.honeypot || [],
      ...dataset.modsec || [],
      ...dataset.suricata || []
    ];
    
    const ipCounts = {};
    allLogs.forEach(log => {
      const ip = log?.ip;
      if (ip && ip !== 'Unknown' && !ip.startsWith('192.168') && !ip.startsWith('10.') && !ip.startsWith('172.')) {
        ipCounts[ip] = (ipCounts[ip] || 0) + 1;
      }
    });
    
    // Get top 20 IPs
    const topIPs = Object.entries(ipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([ip]) => ip);
    
    console.log(`🌍 Geolocating ${topIPs.length} IPs...`);
    
    // Get geolocation for each IP (with delay to avoid rate limit)
    const locations = [];
    for (const ip of topIPs) {
      const location = await getIPLocation(ip);
      if (location) {
        locations.push(location);
        console.log(`✅ ${ip} → ${location.city}, ${location.country}`);
      }
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    res.json({
      total_ips: topIPs.length,
      geolocated: locations.length,
      locations: locations
    });
    
  } catch (err) {
    console.error('Geolocation error:', err);
    res.status(500).json({ msg: 'Geolocation failed', error: err.message });
  }
};
