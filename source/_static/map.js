/**
 * Shopping Street Site - Map and Real-time Data Display
 * 
 * This script handles:
 * - Loading shop data from bars.json
 * - Fetching real-time information from GAS
 * - Displaying shops on Google Map
 * - Showing shop details and real-time status
 */

class ShoppingStreetMap {
  constructor(config) {
    this.config = config || {};
    this.gasUrl = this.config.gasUrl || '';
    this.map = null;
    this.markers = {};
    this.shops = [];
    this.realtimeData = {};
    this.userLocation = null;
    this.infoWindows = {};
  }

  /**
   * Initialize the map
   */
  async init() {
    console.log('🗺️ Initializing Shopping Street Map...');
    
    try {
      // Load shop data
      await this.loadShopData();
      
      // Get user location
      await this.getUserLocation();
      
      // Initialize map
      this.initializeMap();
      
      // Fetch real-time data
      await this.fetchRealtimeData();
      
      // Display shops on map
      this.displayShops();
      
      // Set up auto-refresh
      this.setupAutoRefresh();
      
      console.log('✅ Map initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize map:', error);
    }
  }

  /**
   * Load shop data from bars.json
   */
  async loadShopData() {
    try {
      const response = await fetch(this.config.barsJsonUrl || '/data/bars.json');
      if (!response.ok) {
        throw new Error('Failed to load bars.json: ' + response.statusText);
      }
      this.shops = await response.json();
      console.log('✅ Loaded ' + this.shops.length + ' shops');
    } catch (error) {
      console.error('❌ Failed to load shop data:', error);
      throw error;
    }
  }

  /**
   * Get user's current location
   */
  async getUserLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('⚠️ Geolocation not supported');
        // Default to Nagasaki city center
        this.userLocation = { lat: 32.7486, lng: 129.8735 };
        resolve();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log('✅ Got user location:', this.userLocation);
          resolve();
        },
        (error) => {
          console.warn('⚠️ Failed to get user location:', error);
          // Default to Nagasaki city center
          this.userLocation = { lat: 32.7486, lng: 129.8735 };
          resolve();
        }
      );
    });
  }

  /**
   * Initialize Google Map
   */
  initializeMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('❌ Map element not found');
      return;
    }

    const mapOptions = {
      zoom: 15,
      center: this.userLocation || { lat: 32.7486, lng: 129.8735 },
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: this.getMapStyles()
    };

    this.map = new google.maps.Map(mapElement, mapOptions);
    console.log('✅ Google Map initialized');
  }

  /**
   * Get custom map styles
   */
  getMapStyles() {
    return [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ];
  }

  /**
   * Fetch real-time data from GAS
   */
  async fetchRealtimeData() {
    try {
      if (!this.gasUrl) {
        console.warn('⚠️ GAS URL not configured');
        return;
      }

      const response = await fetch(this.gasUrl + '?mode=json');
      if (!response.ok) {
        throw new Error('Failed to fetch real-time data: ' + response.statusText);
      }
      
      const data = await response.json();
      
      // Convert array to object keyed by shop_id
      if (Array.isArray(data)) {
        data.forEach((item) => {
          this.realtimeData[item.shop_id] = item;
        });
      }
      
      console.log('✅ Fetched real-time data for ' + Object.keys(this.realtimeData).length + ' shops');
    } catch (error) {
      console.error('❌ Failed to fetch real-time data:', error);
      // Continue without real-time data
    }
  }

  /**
   * Display shops on map
   */
  displayShops() {
    this.shops.forEach((shop) => {
      this.addShopMarker(shop);
    });
    console.log('✅ Displayed ' + this.shops.length + ' shops on map');
  }

  /**
   * Add a shop marker to the map
   */
  addShopMarker(shop) {
    if (!shop.lat || !shop.lng) {
      console.warn('⚠️ Shop missing coordinates:', shop.name);
      return;
    }

    const marker = new google.maps.Marker({
      position: { lat: parseFloat(shop.lat), lng: parseFloat(shop.lng) },
      map: this.map,
      title: shop.name,
      icon: this.getMarkerIcon(shop)
    });

    this.markers[shop.id] = marker;

    // Add click listener
    marker.addListener('click', () => {
      this.showShopInfo(shop);
    });
  }

  /**
   * Get marker icon based on shop status
   */
  getMarkerIcon(shop) {
    const realtimeData = this.realtimeData[shop.id];
    let color = '#667eea'; // Default blue

    if (realtimeData) {
      if (realtimeData.vacancy === '満席') {
        color = '#e74c3c'; // Red
      } else if (realtimeData.vacancy === '混雑中') {
        color = '#f39c12'; // Orange
      } else if (realtimeData.vacancy === '空席あり') {
        color = '#27ae60'; // Green
      }
    }

    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: color,
      fillOpacity: 0.8,
      strokeColor: '#fff',
      strokeWeight: 2
    };
  }

  /**
   * Show shop information in info window
   */
  showShopInfo(shop) {
    // Close previous info windows
    Object.values(this.infoWindows).forEach((infoWindow) => {
      infoWindow.close();
    });

    const realtimeData = this.realtimeData[shop.id];
    const content = this.buildInfoWindowContent(shop, realtimeData);

    const infoWindow = new google.maps.InfoWindow({
      content: content,
      maxWidth: 300
    });

    infoWindow.open(this.map, this.markers[shop.id]);
    this.infoWindows[shop.id] = infoWindow;
  }

  /**
   * Build info window HTML content
   */
  buildInfoWindowContent(shop, realtimeData) {
    let html = '<div class="shop-info-window">';
    html += '<h3>' + this.escapeHtml(shop.name) + '</h3>';
    
    if (shop.image_url) {
      html += '<img src="' + this.escapeHtml(shop.image_url) + '" alt="' + this.escapeHtml(shop.name) + '" style="width:100%;max-height:150px;border-radius:4px;margin:8px 0;">';
    }

    html += '<p style="margin:8px 0;font-size:12px;color:#666;">';
    html += '<strong>エリア:</strong> ' + this.escapeHtml(shop.area) + '<br>';
    html += '<strong>営業時間:</strong> ' + this.escapeHtml(shop.hours) + '<br>';
    html += '<strong>住所:</strong> ' + this.escapeHtml(shop.address) + '<br>';
    html += '<strong>電話:</strong> ' + this.escapeHtml(shop.contact) + '<br>';
    html += '</p>';

    if (realtimeData) {
      html += '<div style="background:#f9f9f9;padding:8px;border-radius:4px;margin:8px 0;">';
      html += '<strong style="color:' + this.getVacancyColor(realtimeData.vacancy) + ';">' + this.escapeHtml(realtimeData.vacancy) + '</strong><br>';
      
      if (realtimeData.event_active && realtimeData.event) {
        html += '<span style="background:#ffd700;padding:2px 6px;border-radius:3px;font-size:11px;margin-top:4px;display:inline-block;">🎉 ' + this.escapeHtml(realtimeData.event) + '</span><br>';
      }

      if (realtimeData.updated_at) {
        const updateTime = new Date(realtimeData.updated_at).toLocaleString('ja-JP');
        html += '<span style="font-size:11px;color:#999;">更新: ' + updateTime + '</span>';
      }
      html += '</div>';
    }

    if (shop.promotion) {
      html += '<p style="margin:8px 0;font-size:12px;color:#667eea;font-weight:bold;">' + this.escapeHtml(shop.promotion) + '</p>';
    }

    if (shop.detail_url) {
      html += '<a href="' + this.escapeHtml(shop.detail_url) + '" target="_blank" style="color:#667eea;text-decoration:none;font-size:12px;">詳細を見る →</a>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Get color for vacancy status
   */
  getVacancyColor(vacancy) {
    switch (vacancy) {
      case '満席':
        return '#e74c3c';
      case '混雑中':
        return '#f39c12';
      case '空席あり':
        return '#27ae60';
      default:
        return '#333';
    }
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Set up auto-refresh of real-time data
   */
  setupAutoRefresh() {
    // Refresh every 30 seconds
    setInterval(() => {
      this.fetchRealtimeData().then(() => {
        this.updateMarkers();
      });
    }, 30000);
  }

  /**
   * Update marker icons based on new real-time data
   */
  updateMarkers() {
    this.shops.forEach((shop) => {
      const marker = this.markers[shop.id];
      if (marker) {
        marker.setIcon(this.getMarkerIcon(shop));
      }
    });
  }

  /**
   * Filter shops by area
   */
  filterByArea(area) {
    this.shops.forEach((shop) => {
      const marker = this.markers[shop.id];
      if (marker) {
        marker.setVisible(shop.area === area);
      }
    });
  }

  /**
   * Get all unique areas
   */
  getAreas() {
    const areas = new Set();
    this.shops.forEach((shop) => {
      if (shop.area) {
        areas.add(shop.area);
      }
    });
    return Array.from(areas).sort();
  }
}

// Initialize map when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Get GAS URL from data attribute or config
  const mapElement = document.getElementById('map');
  const gasUrl = mapElement ? mapElement.getAttribute('data-gas-url') : '';

  const map = new ShoppingStreetMap({
    gasUrl: gasUrl,
    barsJsonUrl: '/data/bars.json'
  });

  map.init();

  // Expose map instance globally for debugging
  window.shoppingStreetMap = map;
});
