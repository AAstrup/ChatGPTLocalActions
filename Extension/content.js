console.log('Content script loaded');

// Function to scan for JSON code blocks and add buttons
const addRunActionButtons = () => {
  // Get all code blocks
  const codeBlocks = document.querySelectorAll('pre code');

  codeBlocks.forEach((codeBlock) => {
    // Check if the button has already been added
    if (codeBlock.dataset.buttonAdded) return;

    // Check if the code block contains valid JSON
    const codeText = codeBlock.innerText.trim();
    if (!isValidJSON(codeText)) return;

    // Create the button
    const runButton = document.createElement('button');
    runButton.textContent = 'Run Action';
    runButton.style.marginLeft = '10px';
    runButton.style.padding = '5px 10px';
    runButton.style.backgroundColor = '#4CAF50';
    runButton.style.color = 'white';
    runButton.style.border = 'none';
    runButton.style.borderRadius = '3px';
    runButton.style.cursor = 'pointer';

    // Event listener for the button
    runButton.addEventListener('click', () => {
      const codeText = codeBlock.innerText.trim();
      console.log('Code block content:', codeText);

      const jsonResponse = extractJSON(codeText);
      if (jsonResponse && jsonResponse.url) {
        console.log('Valid JSON response found:', jsonResponse);
        handleAPIRequest(jsonResponse);
      } else {
        console.log('No valid JSON response found');
      }
    });

    // Insert the button after the code block
    const parentPre = codeBlock.parentElement;
    parentPre.style.position = 'relative';

    const buttonContainer = document.createElement('div');
    buttonContainer.style.position = 'absolute';
    buttonContainer.style.top = '5px';
    buttonContainer.style.right = '5px';

    buttonContainer.appendChild(runButton);
    parentPre.appendChild(buttonContainer);

    // Mark the code block as processed
    codeBlock.dataset.buttonAdded = 'true';
  });
};

// Function to check if a string is valid JSON
const isValidJSON = (text) => {
  try {
    JSON.parse(text);
    return true;
  } catch (e) {
    return false;
  }
};

// Function to extract JSON from text
const extractJSON = (text) => {
  try {
    // Replace smart quotes with regular quotes
    let jsonString = text.replace(/“|”/g, '"').replace(/‘|’/g, "'");
    // Parse the JSON string
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Invalid JSON:', e);
  }
  return null;
};

// Function to handle API requests
const handleAPIRequest = (jsonResponse) => {
  chrome.runtime.sendMessage(
    {
      action: 'fetchAPI',
      url: jsonResponse.url,
      method: jsonResponse.body ? 'POST' : 'GET',
      body: jsonResponse.body,
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
      } else {
        console.log('Received response from background:', response);
        if (response && response.success) {
          insertMessage(JSON.stringify(response.data, null, 2));
        } else {
          console.error('API call failed:', response.error);
        }
      }
    }
  );
};

// Function to insert a message into the chat input
const insertMessage = (message) => {
  const textarea = document.querySelector('textarea');
  if (textarea) {
    textarea.value = message;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    const sendButton = textarea.parentElement.querySelector('button');
    if (sendButton) {
      sendButton.click();
    } else {
      console.error('Send button not found');
    }
  } else {
    console.error('Textarea not found');
  }
};

// Initial scan and add buttons
addRunActionButtons();

// Observe mutations to detect new code blocks
const observer = new MutationObserver(() => {
  addRunActionButtons();
});

observer.observe(document.body, { childList: true, subtree: true });
