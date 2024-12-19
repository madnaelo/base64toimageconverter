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
  const { imageUrl, makeSquare } = req.query;

  if (!imageUrl) {
    return res.status(400).send("Image URL is required");
  }

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
          background: { r: 255, g: 255, b: 255, alpha: 0 }, // Transparent padding
        })
        .toBuffer();
    }

    // Return the image
    res.set("Content-Type", mimeType);
    res.send(imageBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error processing the image");
  }
});

// Start the server
const PORT = 32768;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
