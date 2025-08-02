const FacebookAdsManager = require('./facebookAdsManager');
const GoogleAdsManager = require('./googleAdsManager');
const YouTubeAdsManager = require('./youTubeAdsManager');
const authService = require('./authService');

class AdsManagerFactory {
  static createManager(platform) {
    switch (platform.toLowerCase()) {
      case 'facebook':
      case 'meta':
        return new FacebookAdsManager(authService);
      case 'google':
      case 'googleads':
        return new GoogleAdsManager(authService);
      case 'youtube':
        return new YouTubeAdsManager(authService);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  static getSupportedPlatforms() {
    return ['facebook', 'google', 'youtube', 'meta'];
  }

  static validatePlatform(platform) {
    const supportedPlatforms = this.getSupportedPlatforms();
    if (!supportedPlatforms.includes(platform.toLowerCase())) {
      throw new Error(`Platform must be one of: ${supportedPlatforms.join(', ')}`);
    }
    return platform.toLowerCase();
  }
}

module.exports = AdsManagerFactory;