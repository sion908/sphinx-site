/**
 * Shopping Street Site - Map Application
 * Google Maps統合とリアルタイムデータ表示
 */

class ShoppingStreetMap {
  constructor() {
    this.map = null;
    this.markers = [];
    this.infoWindow = null;
    this.currentLocation = null;
    this.gasApiUrl = ''; // GAS WebアプリのURLを設定
    
    // デフォルト中心位置（長崎市中心部）
    this.defaultCenter = {
      lat: 32.7486,
      lng: 129.8735
    };
    
    this.markerIcons = {
      available: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 18,
        fillColor: '#27ae60',
        fillOpacity: 1.0,
        strokeColor: '#1a1a1a',
        strokeWeight: 2
      },
      crowded: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 18,
        fillColor: '#f39c12',
        fillOpacity: 1.0,
        strokeColor: '#1a1a1a',
        strokeWeight: 2
      },
      full: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 18,
        fillColor: '#e74c3c',
        fillOpacity: 1.0,
        strokeColor: '#1a1a1a',
        strokeWeight: 2
      },
      default: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 18,
        fillColor: '#d4af37',
        fillOpacity: 1.0,
        strokeColor: '#1a1a1a',
        strokeWeight: 2
      }
    };
  }
  
  /**
   * 地図を初期化
   */
  async init() {
    try {
      // 現在地を取得
      await this.getCurrentLocation();
      
      // 地図を作成
      this.createMap();
      
      // 店舗データを読み込み
      await this.loadShops();
      
      // リアルタイムデータを取得
      await this.loadRealtimeData();
      
      // 定期的にリアルタイムデータを更新（30秒ごと）
      setInterval(() => this.loadRealtimeData(), 30000);
      
      console.log('Map initialized successfully');
    } catch (error) {
      console.error('Failed to initialize map:', error);
      // エラーでもデフォルト位置で地図を表示
      this.createMap();
      await this.loadShops();
    }
  }
  
  /**
   * 現在地を取得
   */
  getCurrentLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('Geolocation is not supported');
        resolve();
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log('Current location:', this.currentLocation);
          resolve();
        },
        (error) => {
          console.warn('Failed to get current location:', error);
          resolve();
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  }
  
  /**
   * 地図を作成
   */
  createMap() {
    const center = this.currentLocation || this.defaultCenter;
    
    this.map = new google.maps.Map(document.getElementById('map'), {
      center: center,
      zoom: 15,
      styles: this.getMapStyles(),
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true
    });
    
    this.infoWindow = new google.maps.InfoWindow();
    
    // 現在地マーカーを追加
    if (this.currentLocation) {
      new google.maps.Marker({
        position: this.currentLocation,
        map: this.map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3498db',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        },
        title: '現在地'
      });
    }
  }
  
  /**
   * ダークテーマの地図スタイル
   */
  getMapStyles() {
    return [
      { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0a' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#cccccc' }] },
      {
        featureType: 'administrative.locality',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d4af37' }]
      },
      {
        featureType: 'poi',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#999999' }]
      },
      {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{ color: '#1e3a1e' }]
      },
      {
        featureType: 'poi.park',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#6b9a6b' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#2a2a2a' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#1a1a1a' }]
      },
      {
        featureType: 'road',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#999999' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: '#3a3a3a' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#1a1a1a' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#cccccc' }]
      },
      {
        featureType: 'transit',
        elementType: 'geometry',
        stylers: [{ color: '#2a2a2a' }]
      },
      {
        featureType: 'transit.station',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#999999' }]
      },
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#0d1f2d' }]
      },
      {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#4a7a8c' }]
      },
      {
        featureType: 'water',
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#0a0a0a' }]
      }
    ];
  }
  
  /**
   * 店舗データを読み込み
   */
  async loadShops() {
    try {
      const response = await fetch('/_static/data/bars.json');
      if (!response.ok) {
        throw new Error('Failed to load shops data');
      }
      
      const shops = await response.json();
      console.log('Loaded shops:', shops.length);
      
      // マーカーを作成
      shops.forEach(shop => {
        if (shop.lat && shop.lng && shop.published) {
          this.createMarker(shop);
        }
      });
      
      return shops;
    } catch (error) {
      console.error('Error loading shops:', error);
      return [];
    }
  }
  
  /**
   * リアルタイムデータを読み込み
   */
  async loadRealtimeData() {
    if (!this.gasApiUrl) {
      console.warn('GAS API URL not configured');
      return;
    }
    
    try {
      const response = await fetch(`${this.gasApiUrl}?mode=json`);
      if (!response.ok) {
        throw new Error('Failed to load realtime data');
      }
      
      const realtimeData = await response.json();
      console.log('Loaded realtime data:', realtimeData);
      
      // マーカーを更新
      this.updateMarkers(realtimeData);
    } catch (error) {
      console.error('Error loading realtime data:', error);
    }
  }
  
  /**
   * マーカーを作成
   */
  createMarker(shop) {
    const marker = new google.maps.Marker({
      position: { lat: shop.lat, lng: shop.lng },
      map: this.map,
      icon: this.markerIcons.default,
      title: shop.name,
      label: {
        text: '🍸',
        fontSize: '18px'
      },
      shopData: shop
    });
    
    marker.addListener('click', () => {
      this.showInfoWindow(marker);
    });
    
    this.markers.push(marker);
  }
  
  /**
   * マーカーを更新
   */
  updateMarkers(realtimeData) {
    this.markers.forEach(marker => {
      const shopData = marker.shopData;
      const realtime = realtimeData.find(rt => rt.shop_id === shopData.id);
      
      if (realtime) {
        // 空席状況に応じてアイコンを変更
        let iconKey = 'default';
        if (realtime.vacancy === '空席あり') {
          iconKey = 'available';
        } else if (realtime.vacancy === '混雑中') {
          iconKey = 'crowded';
        } else if (realtime.vacancy === '満席') {
          iconKey = 'full';
        }
        
        marker.setIcon(this.markerIcons[iconKey]);
        marker.realtimeData = realtime;
      }
    });
  }
  
  /**
   * 情報ウィンドウを表示
   */
  showInfoWindow(marker) {
    const shop = marker.shopData;
    const realtime = marker.realtimeData;
    
    let statusHtml = '';
    if (realtime) {
      const statusClass = this.getStatusClass(realtime.vacancy);
      statusHtml = `
        <div class="status-badge ${statusClass}" style="margin-top: 8px;">
          <span class="status-badge__dot"></span>
          ${realtime.vacancy}
        </div>
        <p style="font-size: 12px; color: #999; margin-top: 4px;">
          更新: ${this.formatTime(realtime.updated_at)}
        </p>
      `;
      
      if (realtime.event_active && realtime.event) {
        statusHtml += `
          <div class="event-badge" style="margin-top: 8px;">
            🎉 ${realtime.event}
          </div>
        `;
      }
    }
    
    const content = `
      <div style="padding: 12px; min-width: 250px; font-family: -apple-system, sans-serif;">
        <h3 style="margin: 0 0 8px 0; color: #d4af37; font-size: 18px;">
          ${shop.name}
        </h3>
        <p style="margin: 4px 0; color: #ccc; font-size: 14px;">
          📍 ${shop.area || ''}
        </p>
        <p style="margin: 4px 0; color: #ccc; font-size: 14px;">
          🕐 ${shop.hours || ''}
        </p>
        ${statusHtml}
        <a href="bars/${shop.slug}.html" 
           style="display: inline-block; margin-top: 12px; padding: 8px 16px; 
                  background: linear-gradient(135deg, #d4af37, #f4d03f); 
                  color: #0a0a0a; border-radius: 20px; text-decoration: none;
                  font-weight: 600; font-size: 14px;">
           詳細を見る
        </a>
      </div>
    `;
    
    this.infoWindow.setContent(content);
    this.infoWindow.open(this.map, marker);
  }
  
  /**
   * ステータスクラスを取得
   */
  getStatusClass(vacancy) {
    if (vacancy === '空席あり') return 'status-badge--available';
    if (vacancy === '混雑中') return 'status-badge--crowded';
    if (vacancy === '満席') return 'status-badge--full';
    return '';
  }
  
  /**
   * 時刻をフォーマット
   */
  formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60); // 分単位
    
    if (diff < 1) return 'たった今';
    if (diff < 60) return `${diff}分前`;
    if (diff < 1440) return `${Math.floor(diff / 60)}時間前`;
    return date.toLocaleDateString('ja-JP');
  }
}

// 地図を初期化
let mapApp;

function initMap() {
  mapApp = new ShoppingStreetMap();
  mapApp.init();
}

// エラーハンドリング
window.addEventListener('error', (event) => {
  if (event.message.includes('Google Maps')) {
    console.error('Google Maps API error:', event);
  }
});
