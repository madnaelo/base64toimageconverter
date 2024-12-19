const express = require("express");
const sharp = require("sharp");
const fetch = require("node-fetch");

const app = express();

// Helper function to determine MIME type from Base64
const getMimeType = (buffer) => {
  const signatures = {
    jpg: [0xff, 0xd8, 0xff],
    png: [0x89, 0x50, 0x4e, 0x47],
    gif: [0x47, 0x49, 0x46, 0x38],
  };

  for (const [type, signature] of Object.entries(signatures)) {
    if (buffer.slice(0, signature.length).equals(Buffer.from(signature))) {
      return `image/${type}`;
    }
  }
  return null; // Unknown type
};

app.get("/process-image", async (req, res) => {
  const { dhaUniqueId, makeSquare } = req.query;

  if (!dhaUniqueId) {
    return res.status(400).send("dhaUniqueId is required");
  }
  const imageUrl = `https://services.dha.gov.ae/sheryan/RestService/rest/retrieve/profileImage?key=SHARED_KEY&dhaUniqueId=${dhaUniqueId}`;
  try {
    // Fetch the Base64 string from the provided URL
    console.log(imageUrl);
    const response = await fetch(imageUrl);
    const base64Image = await response.text();
    
    // Decode Base64 string to a binary buffer
    const buffer = Buffer.from(base64Image, "base64");

    // Detect the MIME type
    const mimeType = getMimeType(buffer);
    if (!mimeType) {
      return res.status(400).send("Could not detect image type");
    }

    let imageBuffer = buffer;

    // If makeSquare is true, modify the image to make it square
    if (makeSquare === "true") {
      const metadata = await sharp(buffer).metadata();
      const maxDim = Math.max(metadata.width, metadata.height);

      imageBuffer = await sharp(buffer)
        .resize(maxDim, maxDim, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, a: 0.5 }, // Transparent padding
        })
        .toBuffer();
     const newMetaData = await sharp(imageBuffer).metadata();
     console.log("Original dimension" + metadata.width + " X " + metadata.height); 
     console.log("new dimension" + newMetaData.width + " X " + newMetaData.height); 
    }

    // Return the image
    res.set("Content-Type", mimeType);
    res.send(imageBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error processing the image");
  }
});

// Endpoint to display images side by side
app.get("/compare-images", async (req, res) => {
  const { dhaUniqueId, makeSquare } = req.query;

  if (!dhaUniqueId) {
    return res
      .status(400)
      .send(
        "Parameters 'dhaUniqueId' required."
      );
  }

  const imageUrl = `https://services.dha.gov.ae/sheryan/RestService/rest/retrieve/profileImage?key=SHARED_KEY&dhaUniqueId=${dhaUniqueId}`;
  try {
    // Fetch Base64 image from the given URL
    const base64Response = await fetch(imageUrl);
    const base64Image = await base64Response.text();

    // Construct the URL for the processed image
    const processedImageUrl = `https://base64toimageconverter.onrender.com/process-image?dhaUniqueId=${encodeURIComponent(
      dhaUniqueId
    )}${makeSquare === "true" ? "&makeSquare=true" : ""}`;

    // Generate the HTML
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Compare Images</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            margin: 20px;
          }
          .image-container {
            display: flex;
            justify-content: center;
            gap: 20px;
          }
          .image-container img {
            border: 1px solid #ccc;
            padding: 10px;
            max-width: 300px;
            max-height: 300px;
          }
        </style>
      </head>
      <body>
        <h1>Image Comparison</h1>
        <div class="image-container">
          <div>
            <h2>Original Image</h2>
            <img src="data:image/jpeg;base64,${base64Image}" alt="Original Image">
          </div>
          <div>
            <h2>Processed Image</h2>
            <img src="${processedImageUrl}" alt="Processed Image">
          </div>
        </div>
      </body>
      </html>
    `;

    // Send the HTML response
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (error) {
    console.error("Error fetching or processing images:", error);
    res.status(500).send("Error fetching or processing images.");
  }
});

// Start the server
const PORT = 32768;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
