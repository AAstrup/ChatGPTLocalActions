console.log('Content script loaded');

// Variable to keep track of the toggle state
let autoRunEnabled = false;

// Function to create the toggle button
const createToggleButton = () => {
  console.log('Creating toggle button');
  // Create the toggle container
  const toggleContainer = document.createElement('div');
  toggleContainer.style.position = 'fixed';
  toggleContainer.style.top = '10px';
  toggleContainer.style.right = '10px';
  toggleContainer.style.zIndex = '9999';
  toggleContainer.style.padding = '5px';
  toggleContainer.style.backgroundColor = '#fff';
  toggleContainer.style.border = '1px solid #ccc';
  toggleContainer.style.borderRadius = '5px';
  toggleContainer.style.display = 'flex';
  toggleContainer.style.alignItems = 'center';

  // Create the checkbox
  const toggleCheckbox = document.createElement('input');
  toggleCheckbox.type = 'checkbox';
  toggleCheckbox.id = 'autoRunToggle';

  // Create the label
  const toggleLabel = document.createElement('label');
  toggleLabel.htmlFor = 'autoRunToggle';
  toggleLabel.innerText = 'Auto Run Actions';
  toggleLabel.style.marginLeft = '5px';

  // Append the checkbox and label to the container
  toggleContainer.appendChild(toggleCheckbox);
  toggleContainer.appendChild(toggleLabel);

  // Append the container to the body
  document.body.appendChild(toggleContainer);

  // Event listener for the toggle
  toggleCheckbox.addEventListener('change', (event) => {
    autoRunEnabled = event.target.checked;
    console.log('Auto Run Actions:', autoRunEnabled);
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
  console.log('Handling API request with:', jsonResponse);
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

// Function to insert a message into the contenteditable div and send it
const insertMessage = (message) => {
  console.log('Inserting message into input:', message);
  const contentEditableDiv = document.querySelector('div[contenteditable="true"]');
  
  if (contentEditableDiv) {
    // Insert the message into the contenteditable div
    contentEditableDiv.innerHTML = `<p>${message}</p>`;
    const inputEvent = new Event('input', { bubbles: true });
    contentEditableDiv.dispatchEvent(inputEvent);

    // Wait a moment to ensure UI updates before looking for the send button
    setTimeout(() => {
      const sendButton = document.querySelector('button[data-testid="send-button"]');
      if (sendButton) {
        console.log('Clicking send button');
        sendButton.click();
      } else {
        console.error('Send button not found');
      }
    }, 100); // Wait 100ms for UI reload
  } else {
    console.error('Contenteditable div not found');
  }
};

// Function to run the action on a code block
const runAction = (codeBlock) => {
  const codeText = codeBlock.innerText.trim();
  console.log('Code block content:', codeText);

  const jsonResponse = extractJSON(codeText);
  if (jsonResponse && jsonResponse.url) {
    console.log('Valid JSON response found:', jsonResponse);
    handleAPIRequest(jsonResponse);
  } else {
    console.log('No valid JSON response found');
  }
};

// Function to add 'Run Action' button to a code block
const addRunActionButton = (codeBlock) => {
  // Check if the button has already been added
  if (codeBlock.dataset.buttonAdded) {
    console.log('Button already added to this code block');
    return;
  }

  console.log('Adding "Run Action" button to code block');

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
    console.log('"Run Action" button clicked');
    runAction(codeBlock);
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

  // Mark the code block as having the button added
  codeBlock.dataset.buttonAdded = 'true';
};

// Function to process code blocks
const processCodeBlocks = () => {
  console.log('Processing code blocks');
  // Get all code blocks
  const codeBlocks = document.querySelectorAll('pre code');

  codeBlocks.forEach((codeBlock) => {
    // Check if the code block contains valid JSON
    const codeText = codeBlock.innerText.trim();
    if (!isValidJSON(codeText)) {
      console.log('Code block does not contain valid JSON');
      return;
    }

    if (autoRunEnabled) {
      // Automatically run action when code block is finished
      console.log('Auto-run is enabled');

      // Check if this code block has already been processed
      if (codeBlock.dataset.autoRunProcessed) {
        console.log('Code block already auto-run processed');
        return;
      }

      let attempts = 0;
      const maxAttempts = 20; // e.g., 20 attempts * 500ms = 10 seconds max

      const checkIfFinished = () => {
        // Check if the "Stop streaming" button is present
        const stopButton = document.querySelector('button[aria-label="Stop streaming"]');
        if (!stopButton) {
          // "Stop streaming" button is gone, response is finished
          console.log('"Stop streaming" button is gone, code block is finished');
          // Mark as processed to prevent duplicate processing
          codeBlock.dataset.autoRunProcessed = 'true';
          // Perform the action
          runAction(codeBlock);
        } else if (attempts < maxAttempts) {
          // Wait and check again
          attempts++;
          console.log('Waiting for response to finish... Attempt', attempts);
          setTimeout(checkIfFinished, 500);
        } else {
          console.log('Max attempts reached, response may not be finished.');
        }
      };

      // Start checking if the response is finished
      setTimeout(checkIfFinished, 500);
    } else {
      // Create and insert the 'Run Action' button
      console.log('Auto-run is disabled');
      addRunActionButton(codeBlock);
    }
  });
};

// Function to check for new messages and process them
let lastProcessedMessageId = null;
const checkForNewMessages = () => {
  console.log('Checking for new messages');
  // Get all assistant messages
  const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');

  if (assistantMessages.length === 0) {
    console.log('No assistant messages found');
    return;
  }

  // Get the last assistant message
  const lastMessage = assistantMessages[assistantMessages.length - 1];
  const messageId = lastMessage.getAttribute('data-message-id');

  // Check if we've already processed this message
  if (messageId === lastProcessedMessageId) {
    console.log('Last message already processed');
    return;
  }

  console.log('Processing new message with ID:', messageId);

  // Process code blocks in the last message
  const codeBlocks = lastMessage.querySelectorAll('pre code');
  if(codeBlocks.length === 0) {
    console.log('No code blocks found in last message');
    return;
  }

  codeBlocks.forEach((codeBlock) => {
    // Check if the code block contains valid JSON
    const codeText = codeBlock.innerText.trim();
    if (!isValidJSON(codeText)) {
      console.log('Code block does not contain valid JSON');
      return;
    }

    if (autoRunEnabled) {
      // Automatically run action when code block is finished
      console.log('Auto-run is enabled for new message code block');

      // Check if this code block has already been processed
      if (codeBlock.dataset.autoRunProcessed) {
        console.log('Code block already auto-run processed');
        return;
      }

      let attempts = 0;
      const maxAttempts = 20; // e.g., 20 attempts * 500ms = 10 seconds max

      const checkIfFinished = () => {
        // Check if the "Stop streaming" button is present
        const stopButton = document.querySelector('button[aria-label="Stop streaming"]');
        if (!stopButton) {
          // Update the last processed message ID
          lastProcessedMessageId0 = messageId;

          // "Stop streaming" button is gone, response is finished
          console.log('"Stop streaming" button is gone, code block is finished');
          // Mark as processed to prevent duplicate processing
          codeBlock.dataset.autoRunProcessed = 'true';
          // Perform the action
          runAction(codeBlock);
        } else if (attempts < maxAttempts) {
          // Wait and check again
          attempts++;
          console.log('Waiting for response to finish... Attempt', attempts);
          setTimeout(checkIfFinished, 500);
        } else {
          console.log('Max attempts reached, response may not be finished.');
        }
      };

      // Start checking if the response is finished
      setTimeout(checkIfFinished, 1000);
    } else {
      // Create and insert the 'Run Action' button
      console.log('Auto-run is disabled for new message code block');
      addRunActionButton(codeBlock);
    }
  });
};

// Create the toggle button on the top of the screen
createToggleButton();

// Initial processing of existing code blocks
processCodeBlocks();

// Periodically check for new messages
setInterval(checkForNewMessages, 2000);
