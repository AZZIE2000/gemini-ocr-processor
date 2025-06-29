// src/run.ts
import { processPdfsInFolder } from "./ocrProcessor";
import * as path from "path";

const INPUT_DIR = path.join(__dirname, "..", "input_files");
const OUTPUT_DIR = path.join(__dirname, "..", "output_files");

(async () => {
  console.log(`Starting OCR process for files in: ${INPUT_DIR}`);
  await processPdfsInFolder(INPUT_DIR, OUTPUT_DIR);
  console.log(`OCR process completed. Results saved to: ${OUTPUT_DIR}`);
})();
