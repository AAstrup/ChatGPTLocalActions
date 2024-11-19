// background.js

console.log('Background script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message in background script:', request);

  if (request.action === 'fetchAPI') {
    fetch("http://localhost:8000"+request.url, {
      method: request.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      body: request.method === 'POST' ? JSON.stringify(request.body) : null,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('Fetched data:', data);
        sendResponse({ success: true, data: data });
      })
      .catch((error) => {
        console.error('Fetch error:', error);
        sendResponse({ success: false, error: error.toString() });
      });
    return true; // Keep the message channel open for async response
  }
});
