// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises; // Use Promise-based fs functions
const path = require('path');
const { execFile } = require('child_process');
const yaml = require('js-yaml');

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies

const appsDir = path.join(__dirname, 'Apps');

// Function to dynamically set up endpoints based on swagger.yaml files
async function setupEndpoints() {
  try {
    const appFolders = await fs.readdir(appsDir);

    await Promise.all(
      appFolders.map(async (folder) => {
        const appPath = path.join(appsDir, folder);
        const swaggerPath = path.join(appPath, 'swagger.yaml');

        try {
          const data = await fs.readFile(swaggerPath, 'utf8');
          const swagger = yaml.load(data);
          const paths = swagger.paths;

          for (let endpoint in paths) {
            if (paths[endpoint].post) {
              // Dynamically create a POST endpoint
              app.post(endpoint, (req, res) => {
                handleRequest(req, res, appPath);
              });
              console.log(`Endpoint ${endpoint} set up for app ${folder}`);
            }
          }
        } catch (e) {
          console.error(`Error processing swagger.yaml in ${folder}:`, e);
        }
      })
    );
  } catch (err) {
    console.error('Error reading Apps directory:', err);
  }
}

// Function to handle incoming requests
function handleRequest(req, res, appPath) {
  const appExeDir = path.join(appPath, 'app');

  // Adjusted paths to reflect that requests, responses, and errors are inside the app directory
  const requestsDir = path.join(appExeDir, 'requests');
  const responsesDir = path.join(appExeDir, 'responses');
  const errorsDir = path.join(appExeDir, 'errors');

  // Ensure the directories exist
  [requestsDir, responsesDir, errorsDir].forEach((dir) => {
    if (!require('fs').existsSync(dir)) require('fs').mkdirSync(dir);
  });

  // Save the request body as a JSON file
  const requestFileName = `${Date.now()}.json`;
  const requestFilePath = path.join(requestsDir, requestFileName);

  fs.writeFile(requestFilePath, JSON.stringify(req.body))
    .then(() => {
      // Find and execute the .exe file
      return fs.readdir(appExeDir);
    })
    .then((files) => {
      const exeFile = files.find((file) => file.endsWith('.exe'));
      if (!exeFile) {
        console.error('No .exe file found in app directory');
        return res.status(500).send('Internal Server Error');
      }

      const exePath = path.join(appExeDir, exeFile);

      // Log that the .exe is about to be executed
      console.log(`Executing ${exePath}`);

      // Execute the .exe file
      execFile(exePath, [], (error) => {
        if (error) {
          console.error('Error executing .exe file:', error);
          return res.status(500).send('Internal Server Error');
        }

        // Log that the .exe execution has started
        console.log(`.exe execution started for ${exePath}`);

        // Wait for the request file to be removed
        const checkInterval = setInterval(() => {
          fs.access(requestFilePath)
            .then(() => {
              // File still exists
            })
            .catch(() => {
              // File has been removed
              clearInterval(checkInterval);

              // Read response and error files
              readResponseAndErrors(responsesDir, errorsDir, res);
            });
        }, 500); // Check every 500ms
      });
    })
    .catch((err) => {
      console.error('Error processing request:', err);
      return res.status(500).send('Internal Server Error');
    });
}

// Function to read response and error files and send them back to the client
function readResponseAndErrors(responsesDir, errorsDir, res) {
  let combinedData = '';

  // Read response files
  fs.readdir(responsesDir)
    .then((responseFiles) => {
      responseFiles = responseFiles.filter((file) => file.endsWith('.json'));
      let pendingResponses = responseFiles.length;

      if (pendingResponses === 0) {
        // No response files, proceed to read error files
        readErrorFiles(errorsDir, combinedData, res);
      } else {
        let responsePromises = responseFiles.map((file) => {
          const filePath = path.join(responsesDir, file);
          return fs.readFile(filePath, 'utf8').then((data) => {
            combinedData += data;
          });
        });

        Promise.all(responsePromises)
          .then(() => {
            // Proceed to read error files
            readErrorFiles(errorsDir, combinedData, res);
          })
          .catch((err) => {
            console.error('Error reading response files:', err);
            res.status(500).send('Internal Server Error');
          });
      }
    })
    .catch((err) => {
      console.error('Error reading responses directory:', err);
      res.status(500).send('Internal Server Error');
    });
}

// Function to read error files
function readErrorFiles(errorsDir, combinedData, res) {
  fs.readdir(errorsDir)
    .then((errorFiles) => {
      errorFiles = errorFiles.filter((file) => file.endsWith('.json'));

      if (errorFiles.length === 0) {
        // No error files, send the combined data
        res.send(combinedData);
      } else {
        let errorPromises = errorFiles.map((file) => {
          const filePath = path.join(errorsDir, file);
          return fs.readFile(filePath, 'utf8').then((data) => {
            combinedData += data;
          });
        });

        Promise.all(errorPromises)
          .then(() => {
            // Send the combined data
            res.send(combinedData);
          })
          .catch((err) => {
            console.error('Error reading error files:', err);
            res.status(500).send('Internal Server Error');
          });
      }
    })
    .catch((err) => {
      console.error('Error reading errors directory:', err);
      res.status(500).send('Internal Server Error');
    });
}

// Function to remove 'requestBody' and 'responses' from paths and adjust paths
function stripSwagger(swagger) {
  if (swagger.paths) {
    const newPaths = {};
    for (let pathKey in swagger.paths) {
      const newPathKey = `/swagger${pathKey}`;
      newPaths[newPathKey] = swagger.paths[pathKey];
      let pathItem = newPaths[newPathKey];
      for (let method in pathItem) {
        const newMethodd = "get";
        pathItem[newMethodd] = pathItem[method];
        delete pathItem[method];
        if (pathItem[newMethodd]) {
          delete pathItem[newMethodd]['requestBody'];
          delete pathItem[newMethodd]['responses'];
          pathItem[newMethodd]['description'] = "Call the swagger endpoint to see the expected payload and api";
        }
      }
    }
    swagger.paths = newPaths;
  }
  return swagger;
}

// Endpoint to serve the concatenated swagger.json without 'requestBody' and 'responses'
app.get('/swagger', async (req, res) => {
  try {
    const appFolders = await fs.readdir(appsDir);

    let swaggers = await Promise.all(
      appFolders.map(async (folder) => {
        const swaggerPath = path.join(appsDir, folder, 'swagger.yaml');

        try {
          const data = await fs.readFile(swaggerPath, 'utf8');
          const swaggerJson = yaml.load(data);

          const strippedSwagger = stripSwagger(swaggerJson);
          return strippedSwagger;
        } catch (e) {
          console.error(`Error processing swagger.yaml in ${folder}:`, e);
          return null;
        }
      })
    );

    // Filter out null values
    swaggers = swaggers.filter((swagger) => swagger !== null);

    // Concatenate all swagger files into one
    const combinedSwagger = {
      openapi: '3.0.3',
      paths: {},
      components: {},
    };

    swaggers.forEach((swagger) => {
      Object.assign(combinedSwagger.paths, swagger.paths);
      Object.assign(combinedSwagger.components, swagger.components);
    });

    res.json(combinedSwagger);
  } catch (err) {
    console.error('Error reading Apps directory:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Endpoint to serve the full swagger.json for a specific app
app.get('/swagger/:appName', async (req, res) => {
  const appName = req.params.appName;
  const swaggerPath = path.join(appsDir, appName, 'swagger.yaml');

  try {
    const data = await fs.readFile(swaggerPath, 'utf8');
    const swaggerJson = yaml.load(data);
    res.json(swaggerJson);
  } catch (err) {
    console.error(`Error reading swagger.yaml for app ${appName}:`, err);
    res.status(404).send('App not found');
  }
});

// Initialize the dynamic endpoints and start the server after setup is complete
(async () => {
  await setupEndpoints();

  app.listen(8000, () => {
    console.log('Server is running on http://localhost:8000');
  });
})();
