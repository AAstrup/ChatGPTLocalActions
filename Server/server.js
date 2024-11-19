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


async function handleRequest(req, res, appPath) {
  try {
    const appExeDir = path.join(appPath, 'app');
    const requestsDir = path.join(appExeDir, 'requests');
    const responsesDir = path.join(appExeDir, 'responses');
    const errorsDir = path.join(appExeDir, 'errors');

    // Ensure directories exist
    await Promise.all([requestsDir, responsesDir, errorsDir].map(async (dir) => {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }));

    // Write request file
    const requestFileName = `${Date.now()}.json`;
    const requestFilePath = path.join(requestsDir, requestFileName);
    await fs.writeFile(requestFilePath, JSON.stringify(req.body));

    // Find .exe file
    const files = await fs.readdir(appExeDir);
    const exeFile = files.find((file) => file.endsWith('.exe'));
    if (!exeFile) throw new Error('No .exe file found');

    const exePath = path.join(appExeDir, exeFile);

    console.log('Executing .exe at:', exePath);
    console.log('With working directory:', appExeDir);

    // Execute .exe with correct working directory
    const exeProcess = execFile(exePath, [], { cwd: appExeDir }, (error, stdout, stderr) => {
      if (error) {
        console.error('Error executing .exe:', error);
        console.error('stderr:', stderr);
        res.status(500).send('Internal Server Error executing .exe');
        return;
      }

      console.log('stdout:', stdout);
    });

    // Wait for request file to be deleted
    const startTime = Date.now();
    while (true) {
      try {
        await fs.access(requestFilePath);
      } catch {
        break; // File deleted
      }
      if (Date.now() - startTime > 10000) throw new Error('Timeout waiting for file deletion');
      await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms
    }

    // Handle response/error files
    await readResponseAndErrors(responsesDir, errorsDir, res);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Internal Server Error');
  }
}


// Function to clear files in a directory
async function clearFolder(directory) {
  try {
    const files = await fs.readdir(directory);
    const fileDeletionPromises = files.map((file) => fs.unlink(path.join(directory, file)));
    await Promise.all(fileDeletionPromises);
  } catch (err) {
    console.error(`Error clearing folder ${directory}:`, err);
  }
}

// Function to read response and error files and send them back to the client
async function readResponseAndErrors(responsesDir, errorsDir, res) {
  let combinedData = '';

  try {
    // Read response files
    const responseFiles = (await fs.readdir(responsesDir)).filter((file) => file.endsWith('.json'));

    if (responseFiles.length > 0) {
      await Promise.all(
        responseFiles.map(async (file) => {
          const filePath = path.join(responsesDir, file);
          const data = await fs.readFile(filePath, 'utf8');
          combinedData += data;
        })
      );
    }

    // Read error files
    const errorFiles = (await fs.readdir(errorsDir)).filter((file) => file.endsWith('.json'));

    if (errorFiles.length > 0) {
      await Promise.all(
        errorFiles.map(async (file) => {
          const filePath = path.join(errorsDir, file);
          const data = await fs.readFile(filePath, 'utf8');
          combinedData += data;
        })
      );
    }

    // Clear the folders after processing
    await clearFolder(responsesDir);
    await clearFolder(errorsDir);

    // Send the combined data
    res.send(combinedData);
  } catch (err) {
    console.error('Error reading response or error files:', err);
    res.status(500).send('Internal Server Error');
  }
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
