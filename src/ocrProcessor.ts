import {
  GoogleGenerativeAI,
  GenerativeModel,
  Part,
} from "@google/generative-ai";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs/promises";
import sharp from "sharp";
import { fromPath } from "pdf2pic";

// --- Configuration ---
dotenv.config(); // Load environment variables from .env file
const API_KEY: string | undefined = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  console.error("Error: GOOGLE_API_KEY not found in .env file.");
  process.exit(1);
}

const genAI: GoogleGenerativeAI = new GoogleGenerativeAI(API_KEY);
const model: GenerativeModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

// --- Utility Functions ---

/**
 * Converts a PDF to high-resolution images using pdf2pic.
 * Requires GraphicsMagick to be installed on the system (brew install graphicsmagick on macOS).
 *
 * @param pdfPath The path to the PDF file.
 * @param outputFolder The folder to save images to.
 * @param dpi Dots per inch for image resolution.
 * @returns An array of paths to the generated image files.
 */
async function convertPdfToImages(
  pdfPath: string,
  outputFolder: string,
  dpi: number = 500
): Promise<string[]> {
  const fileExtension = path.extname(pdfPath).toLowerCase();

  if (fileExtension === ".pdf") {
    try {
      console.log(`Converting PDF to images: ${pdfPath}`);
      await fs.mkdir(outputFolder, { recursive: true });

      // Configure pdf2pic options
      const convert = fromPath(pdfPath, {
        density: dpi,
        saveFilename: path.parse(pdfPath).name,
        savePath: outputFolder,
        format: "png",
        width: 2000,
        height: 2000,
      });

      // Convert all pages
      const results = await convert.bulk(-1);

      // Get the file paths from the results and sort them numerically
      const imageFiles = results
        .map((result: any) => result.path)
        .sort((a, b) => {
          // Extract page numbers from filenames for proper numeric sorting
          const getPageNumber = (filename: string) => {
            const match = filename.match(/\.(\d+)\.png$/);
            return match ? parseInt(match[1], 10) : 0;
          };
          return getPageNumber(a) - getPageNumber(b);
        });

      console.log(`Successfully converted PDF to ${imageFiles.length} images`);
      return imageFiles;
    } catch (error) {
      console.error(`Error converting PDF to images: ${error}`);
      console.error(
        `Make sure GraphicsMagick is installed on your system. On macOS: brew install graphicsmagick`
      );
      return [];
    }
  } else if ([".jpg", ".jpeg", ".png", ".webp"].includes(fileExtension)) {
    // If it's already an image, just return its path as if it was converted.
    await fs.mkdir(outputFolder, { recursive: true });
    const baseName = path.basename(pdfPath);
    const outputPath = path.join(outputFolder, baseName);
    await fs.copyFile(pdfPath, outputPath);
    return [outputPath];
  } else {
    console.error(
      `Unsupported file type: ${fileExtension}. Please provide PDF or image files.`
    );
    return [];
  }
}

/**
 * Groups image paths into batches.
 * @param imagePaths Array of image file paths.
 * @param batchSize The maximum number of images per batch.
 * @returns An array of arrays, where each inner array is a batch of image paths.
 */
function batchImages<T>(imagePaths: T[], batchSize: number = 50): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < imagePaths.length; i += batchSize) {
    batches.push(imagePaths.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Converts an image file to a Base64 string for Gemini API.
 * @param imagePath Path to the image file.
 * @returns A Promise that resolves to an object with mimeType and base64 data.
 */
async function fileToGenerativePart(imagePath: string): Promise<Part> {
  const data = await fs.readFile(imagePath);
  const mimeType =
    (await sharp(data).metadata()).format === "jpeg"
      ? "image/jpeg"
      : "image/png"; // infer mime based on content
  return {
    inlineData: {
      data: Buffer.from(data).toString("base64"),
      mimeType: mimeType || "image/jpeg", // Fallback to jpeg if detection fails
    },
  };
}

/**
 * Processes images with Gemini 2.0 Flash for OCR.
 * @param imagePaths Array of paths to image files.
 * @param instruction The OCR instruction for Gemini.
 * @returns The extracted text content.
 */
async function ocrWithGemini(
  imagePaths: string[],
  instruction: string
): Promise<string> {
  if (imagePaths.length === 0) {
    return "";
  }
  const imageParts: Part[] = await Promise.all(
    imagePaths.map(fileToGenerativePart)
  );

  const prompt: string = `
    ${instruction}
    
    These are pages from a document. Extract all text content while preserving the structure.
    Pay special attention to tables, columns, headers, and any structured content.
    Maintain paragraph breaks and formatting.

    don't leave any text out.

    extract all the text in both arabic and english without changing the original text or translating any words.

    For tables:
    1. Maintain the table structure using markdown table format
    2. Preserve all column headers and row labels
    3. Ensure numerical data is accurately captured
    
    For multi-column layouts:
    1. Process columns from left to right
    2. Clearly separate content from different columns
    
    For charts and graphs:
    1. Describe the chart type
    2. Extract any visible axis labels, legends, and data points
    3. Extract any title or caption
    4. if there is some kind of visualization for a table that is next to it don't extract any text from the visualization.


    Output Rules:
    1. extract the text in a clean structured way that is understandable and readable.
    2. don't any word that is not in the image.
    3. don't extract the header or footer of the page.
    4. don't write anything that is not in the image.
    5. don't write any text to describe that the text from which page it is from, just write the text of the pages in order.
    6. separate the content between pages with double new empty lines. 

    don't output any explanation or introduction. just output the text.
    if there is no text in the image, output an empty string.
    `;

  try {
    console.log(`Sending ${imageParts.length} images to Gemini API...`);
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();
    console.log(`Gemini API returned ${text.length} characters`);
    return text;
  } catch (error) {
    console.error(
      `Error during Gemini OCR processing for images: ${imagePaths.join(", ")}`
    );
    console.error(`Error details:`, error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes("quota") || error.message.includes("rate")) {
        console.error(
          "Rate limit or quota exceeded. Consider adding delays between requests."
        );
      } else if (error.message.includes("timeout")) {
        console.error(
          "Request timed out. The image might be too large or complex."
        );
      } else if (error.message.includes("safety")) {
        console.error("Content safety filter triggered.");
      }
    }

    return `[ERROR: OCR failed for these images. ${error instanceof Error ? error.message : String(error)}]`;
  }
}

/**
 * Processes a large PDF by converting it to images, batching them, and OCRing each batch.
 * @param filePath The path to the PDF file (or image file for demo).
 * @param tempImagesFolder A temporary folder to store generated images.
 * @param outputFile The path to save the final extracted text.
 * @returns The full extracted text.
 */
async function processLargeDocument(
  filePath: string,
  tempImagesFolder: string,
  outputFile: string
): Promise<string> {
  console.log(`Processing document: ${filePath}`);
  // Ensure tempImagesFolder exists and is clean
  await fs.rm(tempImagesFolder, { recursive: true, force: true });
  await fs.mkdir(tempImagesFolder, { recursive: true });

  // Convert PDF to images (or copy images if already images)
  const imagePaths = await convertPdfToImages(filePath, tempImagesFolder);
  if (imagePaths.length === 0) {
    console.error(`No images generated or found for ${filePath}. Skipping.`);
    return "";
  }
  console.log(`Converted ${imagePaths.length} pages to images.`);

  // Create batches of images
  // Adjust batch size based on document complexity and Gemini's token limits (image data also counts towards context)
  const batches = batchImages(imagePaths, 5); // Smaller batch size for safety with image data

  let fullText = "";
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const imageFileName = path.basename(batch[0]); // Get the filename of the image being processed

    console.log(
      `Processing batch ${i + 1}/${batches.length} (${batch.length} images)...`
    );
    console.log(`Image file: ${imageFileName}`);

    try {
      const batchText = await ocrWithGemini(
        batch,
        "Extract all text, maintaining document structure"
      );

      console.log(
        `Batch ${i + 1} completed successfully. Text length: ${batchText.length} characters`
      );

      if (batchText.trim()) {
        fullText += `\n\n${batchText}`;
      } else {
        console.log(`Batch ${i + 1} returned empty text`);
        fullText += ``;
      }

      // Add a small delay to avoid rate limiting
      if (i < batches.length - 1) {
        console.log(`Waiting 1 second before next batch...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(
        `Error processing batch ${i + 1} (${imageFileName}):`,
        error
      );
      fullText += `\n\n----PAGE ${i + 1}-----\n\n[ERROR: Failed to process this page - ${error}]`;

      // Continue with next batch instead of stopping
      continue;
    }
  }

  // Save the full extracted text
  await fs.writeFile(outputFile, fullText, "utf-8");
  console.log(`Full extracted text saved to ${outputFile}`);
  console.log(`Total batches processed: ${batches.length}`);
  console.log(`Total text length: ${fullText.length} characters`);

  // Don't clean up temporary images for debugging
  console.log(`Temporary images kept in ${tempImagesFolder} for debugging`);

  return fullText;
}

/**
 * Main function to process all PDF files in an input folder.
 * @param inputFolder Path to the folder containing PDF files.
 * @param outputFolder Path to the folder where OCR results will be saved.
 */
export async function processPdfsInFolder(
  inputFolder: string,
  outputFolder: string
): Promise<void> {
  try {
    await fs.mkdir(outputFolder, { recursive: true });

    const files = await fs.readdir(inputFolder);
    const pdfFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return (
        ext === ".pdf" || ext === ".jpg" || ext === ".jpeg" || ext === ".png"
      );
    });

    if (pdfFiles.length === 0) {
      console.log(`No PDF or image files found in ${inputFolder}.`);
      return;
    }

    for (const file of pdfFiles) {
      const inputFilePath = path.join(inputFolder, file);
      const outputFileName = `${path.parse(file).name}.txt`;
      const outputFilePath = path.join(outputFolder, outputFileName);
      const tempImagesDir = path.join(
        outputFolder,
        `temp_images_${path.parse(file).name}`
      );

      console.log(`--- Starting OCR for ${file} ---`);
      let extractedText = await processLargeDocument(
        inputFilePath,
        tempImagesDir,
        outputFilePath
      );

      console.log(`--- Finished OCR for ${file} ---\n`);
    }
  } catch (error) {
    console.error("An error occurred during folder processing:", error);
  }
}
