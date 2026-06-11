const { mockFacebookApi } = require('./facebookMocks');
const { mockGoogleAdsApi } = require('./googleMocks');
const { mockTikTokApi } = require('./tiktokMocks');
const { mockLinkedInApi } = require('./linkedinMocks');
const nock = require('nock');

const setupMockAdServers = () => {
  // Ensure nock is clean
  nock.cleanAll();
  
  // Enable nock if not already enabled
  if (!nock.isActive()) {
    nock.activate();
  }

  // Initialize mocks
  mockFacebookApi();
  mockGoogleAdsApi();
  mockTikTokApi();
  mockLinkedInApi();
};

const cleanMockAdServers = () => {
  nock.cleanAll();
  nock.restore();
};

module.exports = { setupMockAdServers, cleanMockAdServers };
